import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import * as React from "react";
import * as ReactDOM from "react-dom";
import {ChannelVideoRenderer} from "tc-shared/ui/frames/video/Renderer";
import {Registry} from "tc-shared/events";
import {
    ChannelVideoEvents,
    ChannelVideoStreamState,
    kLocalVideoId,
    VideoStreamState
} from "tc-shared/ui/frames/video/Definitions";
import {
    LocalVideoBroadcastState,
    VideoBroadcastState,
    VideoBroadcastType,
    VideoClient,
    VideoConnection
} from "tc-shared/connection/VideoConnection";
import {ClientEntry, ClientType, LocalClientEntry, MusicClientEntry} from "tc-shared/tree/Client";
import {LogCategory, logError, logWarn} from "tc-shared/log";
import {tr} from "tc-shared/i18n/localize";
import {Settings, settings} from "tc-shared/settings";
import * as _ from "lodash";
import PermissionType from "tc-shared/permission/PermissionType";

const cssStyle = require("./Renderer.scss");

let videoIdIndex = 0;
interface ClientVideoController {
    destroy();
    isSubscribed(type: VideoBroadcastType);
    toggleMuteState(type: VideoBroadcastType, state: boolean);
    dismissVideo(type: VideoBroadcastType);

    notifyVideoInfo();
    notifyVideo(forceSend: boolean);
    notifyVideoStream(type: VideoBroadcastType);
}

class RemoteClientVideoController implements ClientVideoController {
    readonly videoId: string;
    readonly client: ClientEntry;
    callbackBroadcastStateChanged: (broadcasting: boolean) => void;
    callbackSubscriptionStateChanged: () => void;

    protected readonly events: Registry<ChannelVideoEvents>;
    protected eventListener: (() => void)[];
    protected eventListenerVideoClient: (() => void)[];

    private currentBroadcastState: boolean;
    private currentSubscriptionState: {[T in VideoBroadcastType]: boolean} = {
        screen: false,
        camera: false
    };

    private dismissed: {[T in VideoBroadcastType]: boolean} = {
        screen: false,
        camera: false
    };

    private cachedCameraState: ChannelVideoStreamState;
    private cachedScreenState: ChannelVideoStreamState;

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

        events.push(client.events.on("notify_video_handle_changed", () => {
            Object.keys(this.dismissed).forEach(key => this.dismissed[key] = false);
            this.updateVideoClient();
        }));

        this.updateVideoClient();
    }

    private updateVideoClient() {
        this.eventListenerVideoClient?.forEach(callback => callback());
        this.eventListenerVideoClient = [];

        const videoClient = this.client.getVideoClient();
        if(videoClient) {
            this.initializeVideoClient(videoClient);
        }
    }

    protected initializeVideoClient(videoClient: VideoClient) {
        this.eventListenerVideoClient.push(videoClient.getEvents().on("notify_broadcast_state_changed", event => {
            console.error("Broadcast state changed: %o - %o - %o", event.broadcastType, VideoBroadcastState[event.oldState], VideoBroadcastState[event.newState]);
            if(event.newState === VideoBroadcastState.Stopped || event.oldState === VideoBroadcastState.Stopped) {
                /* we've a new broadcast which hasn't been dismissed yet */
                this.dismissed[event.broadcastType] = false;
            }
            this.notifyVideo(false);
            this.notifyVideoStream(event.broadcastType);
        }));
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

    isSubscribed(type: VideoBroadcastType) {
        const videoClient = this.client.getVideoClient();
        const videoState = videoClient?.getVideoState(type);
        return typeof videoState !== "undefined" && videoState !== VideoBroadcastState.Stopped && videoState !== VideoBroadcastState.Available;
    }

    toggleMuteState(type: VideoBroadcastType, muted: boolean) {
        const videoClient = this.client.getVideoClient();
        if(!videoClient) {
            return;
        }

        const videoState = videoClient.getVideoState(type);

        if(muted) {
            if(videoState ===VideoBroadcastState.Stopped || videoState === VideoBroadcastState.Available) {
                return;
            }

            this.client.getVideoClient().leaveBroadcast(type);
        } else {
            /* we explicitly specified that we don't want to have that */
            this.dismissed[type] = true;

            if(videoState !== VideoBroadcastState.Available) {
                return;
            }

            this.client.getVideoClient().joinBroadcast(type).catch(error => {
                logError(LogCategory.VIDEO, tr("Failed to join video broadcast: %o"), error);
                /* TODO: Propagate error? */
            });
        }

        this.notifyVideo(false);
    }

    dismissVideo(type: VideoBroadcastType) {
        if(this.dismissed[type] === true) {
            return;
        }

        this.dismissed[type] = true;
        this.notifyVideo(false);
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

    notifyVideo(forceSend: boolean) {
        let cameraState: ChannelVideoStreamState = "none";
        let screenState: ChannelVideoStreamState = "none";

        let broadcasting = false;

        let cameraSubscribed = false, screenSubscribed = false;

        if(this.hasVideoSupport()) {
            const stateCamera = this.getBroadcastState("camera");
            if(stateCamera === VideoBroadcastState.Available) {
                cameraState = this.dismissed["camera"] ? "ignored" : "available";
            } else if(stateCamera === VideoBroadcastState.Running || stateCamera === VideoBroadcastState.Initializing) {
                cameraState = "streaming";
                cameraSubscribed = true;
            }

            const stateScreen = this.getBroadcastState("screen");
            if(stateScreen === VideoBroadcastState.Available) {
                screenState = this.dismissed["screen"] ? "ignored" : "available";
            } else if(stateScreen === VideoBroadcastState.Running || stateScreen === VideoBroadcastState.Initializing) {
                screenState = "streaming";
                screenSubscribed = true;
            }

            broadcasting = cameraState !== "none" || screenState !== "none";
        }

        if(forceSend || !_.isEqual(this.cachedCameraState, cameraState) || !_.isEqual(this.cachedScreenState, screenState)) {
            this.cachedCameraState = cameraState;
            this.cachedScreenState = screenState;
            this.events.fire_react("notify_video", {
                videoId: this.videoId,
                cameraStream: cameraState,
                screenStream: screenState
            });
        }

        if(broadcasting !== this.currentBroadcastState) {
            this.currentBroadcastState = broadcasting;
            if(this.callbackBroadcastStateChanged) {
                this.callbackBroadcastStateChanged(broadcasting);
            }
        }

        if(this.currentSubscriptionState.camera !== cameraSubscribed || this.currentSubscriptionState.screen !== screenSubscribed) {
            this.currentSubscriptionState = {
                screen: screenSubscribed,
                camera: cameraSubscribed
            };

            if(this.callbackSubscriptionStateChanged) {
                this.callbackSubscriptionStateChanged();
            }
        }
    }

    notifyVideoStream(type: VideoBroadcastType) {
        let state: VideoStreamState;

        const streamState = this.getBroadcastState(type);
        if(streamState === VideoBroadcastState.Stopped) {
            state = { state: "disconnected" };
        } else if(streamState === VideoBroadcastState.Initializing) {
            state = { state: "connecting" };
        } else if(streamState === VideoBroadcastState.Available) {
            state = { state: "available" };
        } else if(streamState === VideoBroadcastState.Buffering || streamState === VideoBroadcastState.Running) {
            const stream = this.getBroadcastStream(type);
            if(!stream) {
                state = { state: "failed", reason: tr("Missing video stream") };
            } else {
                state = { state: "connected", stream: stream };
            }
        }

        this.events.fire_react("notify_video_stream", {
            videoId: this.videoId,
            broadcastType: type,
            state: state
        });
    }

    protected hasVideoSupport() : boolean {
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

const kLocalBroadcastChannels: VideoBroadcastType[] = ["screen", "camera"];
class LocalVideoController extends RemoteClientVideoController {
    constructor(client: ClientEntry, eventRegistry: Registry<ChannelVideoEvents>) {
        super(client, eventRegistry, kLocalVideoId);

        const videoConnection = client.channelTree.client.serverConnection.getVideoConnection();

        for(const broadcastType of kLocalBroadcastChannels) {
            const broadcast = videoConnection.getLocalBroadcast(broadcastType);
            this.eventListener.push(broadcast.getEvents().on("notify_state_changed", () => {
                this.notifyVideo(false);
            }));
        }
    }

    protected initializeVideoClient(videoClient: VideoClient) {
        super.initializeVideoClient(videoClient);

        this.eventListenerVideoClient.push(videoClient.getEvents().on("notify_broadcast_state_changed", event => {
            if(event.newState === VideoBroadcastState.Available) {
                /* we want to watch our own broadcast */
                videoClient.joinBroadcast(event.broadcastType).then(undefined);
            }
        }))
    }

    isBroadcasting() {
        const videoConnection = this.client.channelTree.client.serverConnection.getVideoConnection();
        const isBroadcasting = (state: LocalVideoBroadcastState) => state.state === "initializing" || state.state === "broadcasting";

        for(const broadcastType of kLocalBroadcastChannels) {
            const broadcast = videoConnection.getLocalBroadcast(broadcastType);
            if(isBroadcasting(broadcast.getState())) {
                return true;
            }
        }

        /* the super should return false as well but just in case something went wrong we want to give the user the visual feedback */
        return super.isBroadcasting();
    }

    protected hasVideoSupport(): boolean {
        return true;
    }

    protected getBroadcastState(target: VideoBroadcastType): VideoBroadcastState {
        const videoConnection = this.client.channelTree.client.serverConnection.getVideoConnection();
        const broadcast = videoConnection.getLocalBroadcast(target);

        const receivingState = super.getBroadcastState(target);
        switch (broadcast.getState().state) {
            case "stopped":
            case "failed":
                if(receivingState !== VideoBroadcastState.Stopped) {
                    /* this should never happen but just in case give the client a visual feedback */
                    return receivingState;
                }
                return VideoBroadcastState.Stopped;

            case "initializing":
                return VideoBroadcastState.Initializing;

            case "broadcasting":
                const state = super.getBroadcastState(target);
                if(state === VideoBroadcastState.Stopped) {
                    /* we should receive a stream in a few seconds */
                    return VideoBroadcastState.Initializing;
                } else {
                    return state;
                }
        }
    }

    /*
    protected getBroadcastStream(target: VideoBroadcastType) : MediaStream | undefined {
        const videoConnection = this.client.channelTree.client.serverConnection.getVideoConnection();
        return videoConnection.getBroadcastingSource(target)?.getStream();
    }
    */
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

    private currentSpotlight: string;

    constructor(events: Registry<ChannelVideoEvents>, connection: ConnectionHandler) {
        this.events = events;
        this.events.enableDebug("vc-panel");

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
            this.notifyVideoList();
            this.events.fire_react("notify_expended", { expended: this.expended });
        });

        this.events.on("action_set_spotlight", event => {
            this.setSpotlight(event.videoId);
            if(!this.isExpended()) {
                this.events.fire("action_toggle_expended", { expended: true });
            }
        });

        this.events.on("action_toggle_mute", event => {
            const controller = this.findVideoById(event.videoId);
            if(!controller) {
                logWarn(LogCategory.VIDEO, tr("Tried to toggle video mute state for a non existing video id (%s)."), event.videoId);
                return;
            }

            if(event.broadcastType === undefined) {
                controller.toggleMuteState("camera", event.muted);
                controller.toggleMuteState("screen", event.muted);
            } else {
                controller.toggleMuteState(event.broadcastType, event.muted);
            }
        });

        this.events.on("action_dismiss", event => {
            const controller = this.findVideoById(event.videoId);
            if(!controller) {
                logWarn(LogCategory.VIDEO, tr("Tried to dismiss video for a non existing video id (%s)."), event.videoId);
                return;
            }

            controller.dismissVideo(event.broadcastType);
        });

        this.events.on("query_expended", () => this.events.fire_react("notify_expended", { expended: this.expended }));
        this.events.on("query_videos", () => this.notifyVideoList());
        this.events.on("query_spotlight", () => this.notifySpotlight());
        this.events.on("query_subscribe_info", () => this.notifySubscribeInfo());

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

            controller.notifyVideo(true);
        });

        this.events.on("query_video_stream", event => {
            const controller = this.findVideoById(event.videoId);
            if(!controller) {
                logWarn(LogCategory.VIDEO, tr("Tried to query video stream for a non existing video id (%s)."), event.videoId);
                return;
            }

            controller.notifyVideoStream(event.broadcastType);
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

        /* TODO: Unify update if all three changed? */
        events.push(this.connection.permissions.register_needed_permission(PermissionType.I_VIDEO_MAX_STREAMS, () => this.notifySubscribeInfo()));
        events.push(this.connection.permissions.register_needed_permission(PermissionType.I_VIDEO_MAX_CAMERA_STREAMS, () => this.notifySubscribeInfo()));
        events.push(this.connection.permissions.register_needed_permission(PermissionType.I_VIDEO_MAX_SCREEN_STREAMS, () => this.notifySubscribeInfo()));

        events.push(settings.globalChangeListener(Settings.KEY_VIDEO_SHOW_ALL_CLIENTS, () => this.notifyVideoList()));
        events.push(settings.globalChangeListener(Settings.KEY_VIDEO_FORCE_SHOW_OWN_VIDEO, () => this.notifyVideoList()));
    }

    setSpotlight(videoId: string | undefined) {
        if(this.currentSpotlight === videoId) { return; }

        /* TODO: test if the video event exists? */

        this.currentSpotlight = videoId;
        this.notifySpotlight()
        this.notifyVideoList();
    }

    private static shouldIgnoreClient(client: ClientEntry) {
        return (client instanceof MusicClientEntry || client.properties.client_type_exact === ClientType.CLIENT_QUERY);
    }

    private updateLocalChannel(localClient: ClientEntry) {
        this.resetClientVideos();
        if(localClient.currentChannel()) {
            this.currentChannelId = localClient.currentChannel().channelId;
            localClient.currentChannel().channelClientsOrdered().forEach(client => {
                /* in some instances the server might return our own stream for debug purposes */
                if(client instanceof LocalClientEntry && __build.mode !== "debug") {
                    return;
                }

                if(ChannelVideoController.shouldIgnoreClient(client)) {
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
        this.currentSpotlight = undefined;
        for(const clientId of Object.keys(this.clientVideos)) {
            this.destroyClientVideo(parseInt(clientId));
        }

        this.notifyVideoList();
        this.notifySpotlight();
    }

    private destroyClientVideo(clientId: number) : boolean {
        if(this.clientVideos[clientId]) {
            const video = this.clientVideos[clientId];
            video.callbackBroadcastStateChanged = undefined;
            video.callbackSubscriptionStateChanged = undefined;
            video.destroy();
            delete this.clientVideos[clientId];

            if(video.videoId === this.currentSpotlight) {
                this.currentSpotlight = undefined;
                this.notifySpotlight();
            }
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
        controller.callbackSubscriptionStateChanged = () => this.notifySubscribeInfo();
        this.clientVideos[client.clientId()] = controller;
    }

    private notifySpotlight() {
        this.events.fire_react("notify_spotlight", { videoId: this.currentSpotlight });
    }

    private notifyVideoList() {
        const videoIds = [];

        let videoStreamingCount = 0;
        if(this.localVideoController) {
            const localBroadcasting = this.localVideoController.isBroadcasting();
            if(localBroadcasting || settings.static_global(Settings.KEY_VIDEO_FORCE_SHOW_OWN_VIDEO)) {
                videoIds.push(this.localVideoController.videoId);
                if(localBroadcasting) {
                    videoStreamingCount++;
                }
            }
        }

        const channel = this.connection.channelTree.findChannel(this.currentChannelId);
        if(channel) {
            const clients = channel.channelClientsOrdered();
            for(const client of clients) {
                if(client instanceof LocalClientEntry) {
                    continue;
                }

                if(!this.clientVideos[client.clientId()]) {
                    /* should not be possible (Is only possible for the local client) */
                    continue;
                }

                const controller = this.clientVideos[client.clientId()];
                if(controller.isBroadcasting()) {
                    videoStreamingCount++;
                } else if(!settings.static_global(Settings.KEY_VIDEO_SHOW_ALL_CLIENTS)) {
                    continue;
                }
                videoIds.push(controller.videoId);
            }
        }

        this.updateVisibility(videoStreamingCount !== 0);
        if(this.expended) {
            videoIds.remove(this.currentSpotlight);
        }

        this.events.fire_react("notify_videos", {
            videoIds: videoIds
        });
    }

    private notifySubscribeInfo() {
        const permissionMaxStreams = this.connection.permissions.neededPermission(PermissionType.I_VIDEO_MAX_STREAMS);
        const permissionMaxScreenStreams = this.connection.permissions.neededPermission(PermissionType.I_VIDEO_MAX_SCREEN_STREAMS);
        const permissionMaxCameraStreams = this.connection.permissions.neededPermission(PermissionType.I_VIDEO_MAX_CAMERA_STREAMS);

        let subscriptionsCamera = 0, subscriptionsScreen = 0;
        for(const client of Object.values(this.clientVideos)) {
            if(client.isSubscribed("screen")) {
                subscriptionsScreen++;
            }
            if(client.isSubscribed("camera")) {
                subscriptionsCamera++;
            }
        }

        this.events.fire_react("notify_subscribe_info", {
            info: {
                totalSubscriptions: subscriptionsCamera + subscriptionsScreen,
                maxSubscriptions: permissionMaxStreams.valueOr(undefined),
                subscribeLimits: {
                    screen: permissionMaxScreenStreams.valueOr(undefined),
                    camera: permissionMaxCameraStreams.valueOr(undefined)
                },
                subscribedStreams: {
                    camera: subscriptionsCamera,
                    screen: subscriptionsScreen,
                }
            }
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