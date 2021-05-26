import {Registry} from "tc-events";
import {
    ModalVideoViewersEvents,
    ModalVideoViewersVariables,
    VideoViewerInfo, VideoViewerList
} from "tc-shared/ui/modal/video-viewers/Definitions";
import {IpcUiVariableProvider} from "tc-shared/ui/utils/IpcVariable";
import {ClientEntry} from "tc-shared/tree/Client";
import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import {CallOnce, ignorePromise} from "tc-shared/proto";
import {VideoBroadcastType, VideoBroadcastViewer} from "tc-shared/connection/VideoConnection";
import {spawnModal} from "tc-shared/ui/react-elements/modal";

class Controller {
    readonly handler: ConnectionHandler;
    readonly events: Registry<ModalVideoViewersEvents>;
    readonly variables: IpcUiVariableProvider<ModalVideoViewersVariables>;

    private registeredEvents: (() => void)[];
    private registeredClientEvents: { [key: number]: (() => void)[] } = {};

    /* Active video viewers */
    private videoViewerInfo: { [key: number]: VideoViewerInfo & { talkPower: number } };
    private videoViewer: VideoViewerList;

    constructor(handler: ConnectionHandler) {
        this.handler = handler;

        this.events = new Registry<ModalVideoViewersEvents>();
        this.variables = new IpcUiVariableProvider<ModalVideoViewersVariables>();

        this.videoViewerInfo = {};
        this.videoViewer = { __internal_client_order: [] };
    }

    @CallOnce
    destroy() {
        this.videoViewerInfo = {};
        this.videoViewer = { __internal_client_order: [] };

        this.registeredEvents?.forEach(callback => callback());
        this.registeredEvents = undefined;

        Object.keys(this.registeredClientEvents).forEach(clientId => this.unregisterClientEvents(parseInt(clientId)));

        this.events.destroy();
        this.variables.destroy();
    }

    @CallOnce
    initialize() {
        this.variables.setVariableProvider("viewerInfo", clientId => this.videoViewerInfo[clientId]);
        this.variables.setVariableProvider("videoViewers", () => this.videoViewer);

        this.registeredEvents = [];
        this.registeredEvents.push(this.handler.channelTree.events.on("notify_client_leave_view", event => {
            this.unregisterClientEvents(event.client.clientId());
        }));
        this.registeredEvents.push(this.handler.channelTree.events.on("notify_client_enter_view", event => {
            if(this.videoViewerInfo[event.client.clientId()]) {
                this.registerClientEvents(event.client);
                this.updateViewerInfo(event.client);
            }
        }));

        this.registerBroadcastListener("camera");
        this.registerBroadcastListener("screen");
        this.updateViewerList();
    }

    private registerBroadcastListener(broadcastType: VideoBroadcastType) {
        const videoConnection = this.handler.getServerConnection().getVideoConnection();
        const broadcast = videoConnection.getLocalBroadcast(broadcastType);

        this.registeredEvents.push(broadcast.getEvents().on("notify_clients_joined", event => {
            const viewers = this.videoViewer[broadcastType] = this.videoViewer[broadcastType] || [];
            for(const viewer of event.clients) {
                viewers.push(viewer.clientId);
                this.registerNewViewer(viewer);
            }

            this.updateViewerList();
        }));

        this.registeredEvents.push(broadcast.getEvents().on("notify_clients_left", event => {
            /* We can't remove the client listeners here since the client might also be in other broadcasts */
            for(const clientId of event.clientIds) {
                this.videoViewer[broadcastType]?.remove(clientId);
            }

            this.updateViewerList();
        }));

        this.registeredEvents.push(broadcast.getEvents().on("notify_state_changed", event => {
            switch (event.newState.state) {
                case "broadcasting":
                case "initializing":
                    this.videoViewer[broadcastType] = this.videoViewer[broadcastType] || [];
                    break;

                case "failed":
                case "stopped":
                default:
                    delete this.videoViewer[broadcastType];
                    break;
            }

            this.updateViewerList();
        }));

        switch (broadcast.getState().state) {
            case "initializing":
            case "broadcasting":
                const viewers = this.videoViewer[broadcastType] = [];
                for(const viewer of broadcast.getViewer()) {
                    this.registerNewViewer(viewer);
                    viewers.push(viewer.clientId);
                }
                break;

            case "failed":
            case "stopped":
            default:
                delete this.videoViewer[broadcastType];
                break;
        }
    }

    private registerNewViewer(viewer: VideoBroadcastViewer) {
        if(typeof this.registeredClientEvents[viewer.clientId] !== "undefined") {
            /* We've up2date data for that viewer */
            return;
        }

        /* Store newest viewer data */
        this.videoViewerInfo[viewer.clientId] = {
            handlerId: this.handler.handlerId,
            clientName: viewer.clientName,
            clientUniqueId: viewer.clientUniqueId,
            clientStatus: undefined,
            talkPower: 0
        };

        const client = this.handler.channelTree.findClient(viewer.clientId);
        if(!client) {
            /* Target client isn't in our view */
            return;
        }

        this.registerClientEvents(client);
        this.updateViewerInfo(client);
    }

    private unregisterClientEvents(clientId: number) {
        this.registeredClientEvents[clientId]?.forEach(callback => callback());
        delete this.registeredClientEvents[clientId];
    }

    private registerClientEvents(client: ClientEntry) {
        const clientId = client.clientId();
        const events = this.registeredClientEvents[clientId] = [];

        events.push(client.events.on("notify_status_icon_changed", () => this.updateViewerInfo(client)));
        events.push(client.events.on("notify_properties_updated", event => {
            if("client_talk_power" in event.updated_properties || "client_nickname" in event.updated_properties) {
                /* Fill update incl. resort since the client order might has changed */
                this.updateViewerInfo(client);
                this.updateViewerList();
            }
        }));
    }

    /**
     * Update the viewer cache for the target client.
     * @param client
     * @private
     */
    private updateViewerInfo(client: ClientEntry) {
        this.videoViewerInfo[client.clientId()] = {
            handlerId: this.handler.handlerId,
            clientName: client.clientNickName(),
            clientStatus: client.getStatusIcon(),
            clientUniqueId: client.properties.client_unique_identifier,
            talkPower: client.properties.client_talk_power
        };

        /* The variables handler will only send an update if the variable really has changed. */
        this.variables.sendVariable("viewerInfo", client.clientId());
    }

    private updateViewerList() {
        const uniqueTotalViewers = new Set<number>();
        for(const key of Object.keys(this.videoViewer)) {
            if(key === "__internal_client_order") {
                continue;
            }

            for(const clientId of this.videoViewer[key]) {
                uniqueTotalViewers.add(clientId);
            }
        }

        Object.keys(this.registeredClientEvents).forEach(clientIdString => {
            const clientId = parseInt(clientIdString);
            if(uniqueTotalViewers.has(clientId)) {
                return;
            }

            /* We're not any more subscribed */
            this.unregisterClientEvents(clientId);
        });

        Object.keys(this.videoViewerInfo).forEach(clientIdString => {
            const clientId = parseInt(clientIdString);
            if(uniqueTotalViewers.has(clientId)) {
                return;
            }

            delete this.videoViewerInfo[clientIdString];
        });

        this.videoViewer["__internal_client_order"] = [...uniqueTotalViewers];
        this.videoViewer["__internal_client_order"].sort((clientAId, clientBId) => {
            const clientA = this.videoViewerInfo[clientAId];
            const clientB = this.videoViewerInfo[clientBId];
            if(!clientA) {
                return -1;
            } else if(!clientB) {
                return 1;
            }

            if(clientA.talkPower < clientB.talkPower) {
                return 1;
            }

            if(clientA.talkPower > clientB.talkPower) {
                return -1;
            }

            if(clientA.clientName > clientB.clientName) {
                return 1;
            }

            if(clientA.clientName < clientB.clientName) {
                return -1;
            }

            return 0;
        });

        this.variables.sendVariable("videoViewers");
    }
}

export function spawnVideoViewerInfo(handler: ConnectionHandler) {
    const controller = new Controller(handler);
    controller.initialize();

    const modal = spawnModal("modal-video-viewers", [
        controller.events.generateIpcDescription(),
        controller.variables.generateConsumerDescription()
    ], {
        popoutable: true
    });
    modal.getEvents().on("destroy", () => controller.destroy());

    ignorePromise(modal.show());
}