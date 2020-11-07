import {Registry} from "tc-shared/events";
import {ChannelTreeUIEvents} from "tc-shared/ui/tree/Definitions";
import {spawnExternalModal} from "tc-shared/ui/react-elements/external-modal";
import {initializeChannelTreeController} from "tc-shared/ui/tree/Controller";
import {ControlBarEvents} from "tc-shared/ui/frames/control-bar/Definitions";
import {
    initializePopoutControlBarController
} from "tc-shared/ui/frames/control-bar/Controller";
import {ChannelTree} from "tc-shared/tree/ChannelTree";
import {ModalController} from "tc-shared/ui/react-elements/ModalDefinitions";
import {ChannelTreePopoutEvents} from "tc-shared/ui/tree/popout/Definitions";
import {ConnectionState} from "tc-shared/ConnectionHandler";

export class ChannelTreePopoutController {
    readonly channelTree: ChannelTree;

    private popoutInstance: ModalController;
    private uiEvents: Registry<ChannelTreePopoutEvents>;
    private treeEvents: Registry<ChannelTreeUIEvents>;
    private controlBarEvents: Registry<ControlBarEvents>;

    private generalEvents: (() => void)[];

    constructor(channelTree: ChannelTree) {
        this.channelTree = channelTree;

        this.generalEvents = [];
        this.generalEvents.push(this.channelTree.server.events.on("notify_properties_updated", event => {
            if("virtualserver_name" in event.updated_properties) {
                this.sendTitle();
            }
        }));

        this.generalEvents.push(this.channelTree.client.events().on("notify_connection_state_changed", () => this.sendTitle()));
    }

    destroy() {
        this.popin();
        this.generalEvents?.forEach(callback => callback());
        this.generalEvents = undefined;
    }

    hasBeenPopedOut() {
        return !!this.popoutInstance;
    }

    popout() {
        if(this.popoutInstance) {
            /* TODO: Request focus on that window? */
            return;
        }

        this.uiEvents = new Registry<ChannelTreePopoutEvents>();
        this.uiEvents.on("query_title", () => this.sendTitle());

        this.treeEvents = new Registry<ChannelTreeUIEvents>();
        initializeChannelTreeController(this.treeEvents, this.channelTree, { popoutButton: false });

        this.controlBarEvents = new Registry<ControlBarEvents>();
        initializePopoutControlBarController(this.controlBarEvents, this.channelTree.client);

        this.popoutInstance = spawnExternalModal("channel-tree", {
            tree: this.treeEvents,
            controlBar: this.controlBarEvents,
            base: this.uiEvents
        }, { handlerId: this.channelTree.client.handlerId }, "channel-tree-" + this.channelTree.client.handlerId);

        this.popoutInstance.getEvents().one("destroy", () => {
            this.treeEvents.fire("notify_destroy");
            this.treeEvents.destroy();
            this.treeEvents = undefined;

            this.controlBarEvents.fire("notify_destroy");
            this.controlBarEvents.destroy();
            this.controlBarEvents = undefined;

            this.uiEvents.destroy();
            this.uiEvents = undefined;

            this.popoutInstance = undefined;
            this.channelTree.events.fire("notify_popout_state_changed", { popoutShown: false });
        });
        this.popoutInstance.show();

        this.channelTree.events.fire("notify_popout_state_changed", { popoutShown: true });
    }

    popin() {
        if(!this.popoutInstance) { return; }

        this.popoutInstance.destroy();
        this.popoutInstance = undefined; /* not needed, but just to ensure (will be set within the destroy callback already) */
    }

    private sendTitle() {
        if(!this.uiEvents) { return; }

        let title;
        switch (this.channelTree.client.connection_state) {
            case ConnectionState.INITIALISING:
            case ConnectionState.CONNECTING:
            case ConnectionState.AUTHENTICATING:
                const address = this.channelTree.server.remote_address;
                title = tra("Connecting to {}", address.host + (address.port === 9987 ? "" : `:${address.port}`));
                break;

            case ConnectionState.DISCONNECTING:
            case ConnectionState.UNCONNECTED:
                title = tr("Not connected");
                break;

            case ConnectionState.CONNECTED:
                title = this.channelTree.server.properties.virtualserver_name;
                break;
        }

        this.uiEvents.fire_react("notify_title", { title: title });
    }
}