import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import * as React from "react";
import * as ReactDOM from "react-dom";
import {ChannelVideoRenderer} from "tc-shared/ui/frames/video/Renderer";
import {Registry} from "tc-shared/events";
import {ChannelVideoEvents, kLocalVideoId} from "tc-shared/ui/frames/video/Definitions";
import {VideoBroadcastState, VideoBroadcastType, VideoConnection} from "tc-shared/connection/VideoConnection";
import {ClientEntry, ClientType, LocalClientEntry, MusicClientEntry} from "tc-shared/tree/Client";
import {LogCategory, logWarn} from "tc-shared/log";

const cssStyle = require("./Renderer.scss");

let videoIdIndex = 0;
interface ClientVideoController {
    destroy();
    notifyVideoInfo();
    notifyVideo();
}

class RemoteClientVideoController implements ClientVideoController {
    readonly videoId: string;
    readonly client: ClientEntry;
    callbackBroadcastStateChanged: (broadcasting: boolean) => void;

    protected readonly events: Registry<ChannelVideoEvents>;
    protected eventListener: (() => void)[];
    protected eventListenerVideoClient: (() => void)[];

    private currentBroadcastState: boolean;

    constructor(client: ClientEntry, eventRegistry: Registry<ChannelVideoEvents>, videoId?: string) {
        this.client = client;
        this.events = eventRegistry;
        this.videoId = videoId || ("client-video-" + (++videoIdIndex));
        this.currentBroadcastState = false;

        const events = this.eventListener = [];
        events.push(client.events.on("notify_properties_updated", event => {
            if("client_nickname" in event.updated_properties) {
                this.notifyVideoInfo();
            }
        }));

        events.push(client.events.on("notify_status_icon_changed", event => {
            this.events.fire_react("notify_video_info_status", { videoId: this.videoId, statusIcon: event.newIcon });
        }));

        events.push(client.events.on("notify_video_handle_changed", () => this.updateVideoClient()));

        this.updateVideoClient();
    }

    private updateVideoClient() {
        this.eventListenerVideoClient?.forEach(callback => callback());
        const events = this.eventListenerVideoClient = [];

        const videoClient = this.client.getVideoClient();
        if(videoClient) {
            events.push(videoClient.getEvents().on("notify_broadcast_state_changed", () => this.notifyVideo()));
        }
    }

    destroy() {
        this.eventListenerVideoClient?.forEach(callback => callback());
        this.eventListenerVideoClient = undefined;

        this.eventListener?.forEach(callback => callback());
        this.eventListener = undefined;
    }

    isBroadcasting() {
        const videoClient = this.client.getVideoClient();
        return videoClient && (videoClient.getVideoState("camera") !== VideoBroadcastState.Stopped || videoClient.getVideoState("screen") !== VideoBroadcastState.Stopped);
    }

    notifyVideoInfo() {
        this.events.fire_react("notify_video_info", {
            videoId: this.videoId,
            info: {
                clientId: this.client.clientId(),
                clientUniqueId: this.client.properties.client_unique_identifier,
                clientName: this.client.clientNickName(),
                statusIcon: this.client.getStatusIcon()
            }
        });
    }

    notifyVideo() {
        let broadcasting = false;
        if(this.isVideoActive()) {
            let streams = [];
            let initializing = false;

            const stateCamera = this.getBroadcastState("camera");
            if(stateCamera === VideoBroadcastState.Running) {
                streams.push(this.getBroadcastStream("camera"));
            } else if(stateCamera === VideoBroadcastState.Initializing) {
                initializing = true;
            }

            const stateScreen = this.getBroadcastState("screen");
            if(stateScreen === VideoBroadcastState.Running) {
                streams.push(this.getBroadcastStream("screen"));
            } else if(stateScreen === VideoBroadcastState.Initializing) {
                initializing = true;
            }

            if(streams.length > 0) {
                broadcasting = true;
                this.events.fire_react("notify_video", {
                    videoId: this.videoId,
                    status: {
                        status: "connected",
                        desktopStream: streams[1],
                        cameraStream: streams[0]
                    }
                });
            } else if(initializing) {
                broadcasting = true;
                this.events.fire_react("notify_video", {
                    videoId: this.videoId,
                    status: { status: "initializing" }
                });
            } else {
                this.events.fire_react("notify_video", {
                    videoId: this.videoId,
                    status: {
                        status: "connected",
                        cameraStream: undefined,
                        desktopStream: undefined
                    }
                });
            }
        } else {
            this.events.fire_react("notify_video", {
                videoId: this.videoId,
                status: { status: "no-video" }
            });
        }

        if(broadcasting !== this.currentBroadcastState) {
            this.currentBroadcastState = broadcasting;
            if(this.callbackBroadcastStateChanged) {
                this.callbackBroadcastStateChanged(broadcasting);
            }
        }
    }

    protected isVideoActive() : boolean {
        return typeof this.client.getVideoClient() !== "undefined";
    }

    protected getBroadcastState(target: VideoBroadcastType) : VideoBroadcastState {
        const videoClient = this.client.getVideoClient();
        return videoClient ? videoClient.getVideoState(target) : VideoBroadcastState.Stopped;
    }

    protected getBroadcastStream(target: VideoBroadcastType) : MediaStream | undefined {
        const videoClient = this.client.getVideoClient();
        return videoClient ? videoClient.getVideoStream(target) : undefined;
    }
}

class LocalVideoController extends RemoteClientVideoController {
    constructor(client: ClientEntry, eventRegistry: Registry<ChannelVideoEvents>) {
        super(client, eventRegistry, kLocalVideoId);

        const videoConnection = client.channelTree.client.serverConnection.getVideoConnection();
        this.eventListener.push(videoConnection.getEvents().on("notify_local_broadcast_state_changed", () => this.notifyVideo()));
    }

    isBroadcasting() {
        const videoConnection = this.client.channelTree.client.serverConnection.getVideoConnection();
        return videoConnection.isBroadcasting("camera") || videoConnection.isBroadcasting("screen");
    }

    protected isVideoActive(): boolean {
        return true;
    }

    protected getBroadcastState(target: VideoBroadcastType): VideoBroadcastState {
        const videoConnection = this.client.channelTree.client.serverConnection.getVideoConnection();
        return videoConnection.getBroadcastingState(target);
    }

    protected getBroadcastStream(target: VideoBroadcastType) : MediaStream | undefined {
        const videoConnection = this.client.channelTree.client.serverConnection.getVideoConnection();
        return videoConnection.getBroadcastingSource(target)?.getStream();
    }
}

class ChannelVideoController {
    callbackVisibilityChanged: (visible: boolean) => void;

    private readonly connection: ConnectionHandler;
    private readonly videoConnection: VideoConnection;
    private readonly events: Registry<ChannelVideoEvents>;
    private eventListener: (() => void)[];

    private expended: boolean;
    private currentlyVisible: boolean;

    private currentChannelId: number;
    private localVideoController: LocalVideoController;
    private clientVideos: {[key: number]: RemoteClientVideoController} = {};

    constructor(events: Registry<ChannelVideoEvents>, connection: ConnectionHandler) {
        this.events = events;
        this.connection = connection;
        this.videoConnection = this.connection.serverConnection.getVideoConnection();
        this.connection.events().one("notify_handler_initialized", () => {
            this.localVideoController = new LocalVideoController(connection.getClient(), this.events);
            this.localVideoController.callbackBroadcastStateChanged = () => this.notifyVideoList();
        });
        this.currentlyVisible = false;
        this.expended = false;
    }

    isExpended() : boolean { return this.expended; }

    destroy() {
        this.eventListener?.forEach(callback => callback());
        this.eventListener = undefined;

        if(this.localVideoController) {
            this.localVideoController.callbackBroadcastStateChanged = undefined;
            this.localVideoController.destroy();
            this.localVideoController = undefined;
        }

        this.resetClientVideos();
    }

    initialize() {
        const events = this.eventListener = [];
        this.events.on("action_toggle_expended", event => {
            if(event.expended === this.expended) { return; }
            this.expended = event.expended;
            this.events.fire_react("notify_expended", { expended: this.expended });
        });

        this.events.on("query_expended", () => this.events.fire_react("notify_expended", { expended: this.expended }));
        this.events.on("query_videos", () => this.notifyVideoList());

        this.events.on("query_video_info", event => {
            const controller = this.findVideoById(event.videoId);
            if(!controller) {
                logWarn(LogCategory.VIDEO, tr("Tried to query video info for a non existing video id (%s)."), event.videoId);
                return;
            }

            controller.notifyVideoInfo();
        });

        this.events.on("query_video", event => {
            const controller = this.findVideoById(event.videoId);
            if(!controller) {
                logWarn(LogCategory.VIDEO, tr("Tried to query video for a non existing video id (%s)."), event.videoId);
                return;
            }

            controller.notifyVideo();
        });

        const channelTree = this.connection.channelTree;
        events.push(channelTree.events.on("notify_tree_reset", () => {
            this.resetClientVideos();
            this.currentChannelId = undefined;
            this.notifyVideoList();
        }));

        events.push(channelTree.events.on("notify_client_moved", event => {
            if(ChannelVideoController.shouldIgnoreClient(event.client)) {
                return;
            }

            if(event.client instanceof LocalClientEntry) {
                this.updateLocalChannel(event.client);
            } else {
                if(event.oldChannel.channelId === this.currentChannelId) {
                    if(this.destroyClientVideo(event.client.clientId())) {
                        this.notifyVideoList();
                    }
                }
                if(event.newChannel.channelId === this.currentChannelId) {
                    this.createClientVideo(event.client);
                    this.notifyVideoList();
                }
            }
        }));

        events.push(channelTree.events.on("notify_client_leave_view", event => {
            if(ChannelVideoController.shouldIgnoreClient(event.client)) {
                return;
            }

            if(this.destroyClientVideo(event.client.clientId())) {
                this.notifyVideoList();
            }
            if(event.client instanceof LocalClientEntry) {
                this.resetClientVideos();
            }
        }));

        events.push(channelTree.events.on("notify_client_enter_view", event => {
            if(ChannelVideoController.shouldIgnoreClient(event.client)) {
                return;
            }

            if(event.targetChannel.channelId === this.currentChannelId) {
                this.createClientVideo(event.client);
                this.notifyVideoList();
            }
            if(event.client instanceof LocalClientEntry) {
                this.updateLocalChannel(event.client);
            }
        }));

        events.push(channelTree.events.on("notify_channel_client_order_changed", event => {
            if(event.channel.channelId == this.currentChannelId) {
                this.notifyVideoList();
            }
        }));
    }

    private static shouldIgnoreClient(client: ClientEntry) {
        return (client instanceof MusicClientEntry || client.properties.client_type_exact === ClientType.CLIENT_QUERY);
    }

    private updateLocalChannel(localClient: ClientEntry) {
        this.resetClientVideos();
        if(localClient.currentChannel()) {
            this.currentChannelId = localClient.currentChannel().channelId;
            localClient.currentChannel().channelClientsOrdered().forEach(client => {
                if(client instanceof LocalClientEntry || ChannelVideoController.shouldIgnoreClient(client)) {
                    return;
                }

                this.createClientVideo(client);
            });
            this.notifyVideoList();
        } else {
            this.currentChannelId = undefined;
        }
    }

    private findVideoById(videoId: string) : ClientVideoController | undefined {
        if(this.localVideoController?.videoId === videoId) {
            return this.localVideoController;
        }
        return Object.values(this.clientVideos).find(e => e.videoId === videoId);
    }

    private resetClientVideos() {
        for(const clientId of Object.keys(this.clientVideos)) {
            this.destroyClientVideo(parseInt(clientId));
        }

        this.notifyVideoList();
    }

    private destroyClientVideo(clientId: number) : boolean {
        if(this.clientVideos[clientId]) {
            const video = this.clientVideos[clientId];
            video.callbackBroadcastStateChanged = undefined;
            video.destroy();
            delete this.clientVideos[clientId];
            return true;
        } else {
            return false;
        }
    }

    private createClientVideo(client: ClientEntry) {
        this.destroyClientVideo(client.clientId());

        const controller = new RemoteClientVideoController(client, this.events);
        /* update our video list and the visibility */
        controller.callbackBroadcastStateChanged = () => this.notifyVideoList();
        this.clientVideos[client.clientId()] = controller;
    }

    private notifyVideoList() {
        const videoIds = [];

        let videoCount = 0;
        if(this.localVideoController) {
            videoIds.push(this.localVideoController.videoId);
            if(this.localVideoController.isBroadcasting()) { videoCount++; }
        }

        const channel = this.connection.channelTree.findChannel(this.currentChannelId);
        if(channel) {
            const clients = channel.channelClientsOrdered();
            for(const client of clients) {
                if(!this.clientVideos[client.clientId()]) {
                    /* should not be possible (Is only possible for the local client) */
                    continue;
                }

                const controller = this.clientVideos[client.clientId()];
                if(controller.isBroadcasting()) {
                    videoCount++;
                } else {
                    /* TODO: Filter if video is active */
                }
                videoIds.push(controller.videoId);
            }
        }

        this.updateVisibility(videoCount !== 0);

        this.events.fire_react("notify_videos", {
            videoIds: videoIds
        });
    }

    private updateVisibility(target: boolean) {
        if(this.currentlyVisible === target) { return; }

        this.currentlyVisible = target;
        if(this.callbackVisibilityChanged) {
            this.callbackVisibilityChanged(target);
        }
    }
}

export class ChannelVideoFrame {
    private readonly handle: ConnectionHandler;
    private readonly events: Registry<ChannelVideoEvents>;
    private container: HTMLDivElement;
    private controller: ChannelVideoController;

    constructor(handle: ConnectionHandler) {
        this.handle = handle;
        this.events = new Registry<ChannelVideoEvents>();
        this.controller = new ChannelVideoController(this.events, handle);
        this.controller.initialize();

        this.container = document.createElement("div");
        this.container.classList.add(cssStyle.container, cssStyle.hidden);

        ReactDOM.render(React.createElement(ChannelVideoRenderer, { handlerId: handle.handlerId, events: this.events }), this.container);

        this.events.on("notify_expended", event => this.container.classList.toggle(cssStyle.expended, event.expended));
        this.controller.callbackVisibilityChanged = flag => {
            this.container.classList.toggle(cssStyle.hidden, !flag);
            if(!flag) {
                this.events.fire("action_toggle_expended", { expended: false })
            }
        };
    }

    destroy() {
        this.controller?.destroy();
        this.controller = undefined;

        if(this.container) {
            this.container.remove();
            ReactDOM.unmountComponentAtNode(this.container);

            this.container = undefined;
        }

        this.events.destroy();
    }

    getContainer() : HTMLDivElement {
        return this.container;
    }
}