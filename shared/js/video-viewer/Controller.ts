import * as log from "../log";
import {LogCategory, logError} from "../log";
import {spawnExternalModal} from "../ui/react-elements/external-modal";
import {EventHandler, Registry} from "../events";
import {VideoViewerEvents} from "./Definitions";
import {ConnectionHandler} from "../ConnectionHandler";
import {W2GPluginCmdHandler, W2GWatcher, W2GWatcherFollower} from "../video-viewer/W2GPlugin";
import {settings, Settings} from "../settings";
import {global_client_actions} from "../events/GlobalEvents";
import {createErrorModal} from "../ui/elements/Modal";
import {ModalController} from "../ui/react-elements/ModalDefinitions";
import {server_connections} from "tc-shared/ConnectionManager";
import { tr, tra } from "tc-shared/i18n/localize";

const parseWatcherId = (id: string): { clientId: number, clientUniqueId: string} => {
    const [ clientIdString, clientUniqueId ] = id.split(" - ");
    return { clientId: parseInt(clientIdString), clientUniqueId: clientUniqueId };
};

const followerWatcherId = (follower: W2GWatcherFollower) => follower.clientId + " - " + follower.clientUniqueId;

class VideoViewer {
    public readonly connection: ConnectionHandler;
    public readonly events: Registry<VideoViewerEvents>;
    public readonly modal: ModalController;

    private readonly plugin: W2GPluginCmdHandler;
    private currentVideoUrl: string;

    private unregisterCallbacks = [];
    private destroyCalled = false;

    constructor(connection: ConnectionHandler) {
        this.connection = connection;

        this.events = new Registry<VideoViewerEvents>();
        this.events.register_handler(this);

        this.plugin = connection.getPluginCmdRegistry().getPluginHandler<W2GPluginCmdHandler>(W2GPluginCmdHandler.kPluginChannel);
        if(!this.plugin) {
            throw tr("Missing video viewer plugin");
        }

        this.modal = spawnExternalModal("video-viewer", { default: this.events }, { handlerId: connection.handlerId });

        this.registerPluginListeners();
        this.plugin.getCurrentWatchers().forEach(watcher => this.registerWatcherEvents(watcher));

        this.modal.getEvents().on("destroy", () => this.destroy());
    }

    destroy() {
        if(this.destroyCalled)
            return;

        this.destroyCalled = true;
        this.plugin.setLocalPlayerClosed();

        this.events.fire("notify_destroy");
        this.events.unregister_handler(this);

        this.modal.destroy();
        this.events.destroy();
    }

    setWatchingVideo(url: string) {
        if(this.currentVideoUrl === url)
            return;

        this.plugin.setLocalWatcherStatus(url, { status: "paused" });
        this.events.fire_react("notify_video", { url: url }); /* notify the new url */
    }

    setFollowing(target: W2GWatcher) {
        if(this.plugin.getLocalFollowingWatcher() === target)
            return;

        this.plugin.setLocalFollowing(target, { status: "paused" });
        this.events.fire_react("notify_video", { url: target.getCurrentVideo() }); /* notify the new url */
    }

    async open() {
        await this.modal.show();
    }

    private notifyWatcherList() {
        const watchers = this.plugin.getCurrentWatchers().filter(e => e.getCurrentVideo() === this.currentVideoUrl);
        this.events.fire_react("notify_watcher_list", {
            followingWatcher: this.plugin.getLocalFollowingWatcher() ? this.plugin.getLocalFollowingWatcher().clientId + " - " + this.plugin.getLocalFollowingWatcher().clientUniqueId : undefined,
            watcherIds: watchers.map(e => e.clientId + " - " + e.clientUniqueId)
        })
    };

    private registerPluginListeners() {
        this.events.on("notify_destroy", this.plugin.events.on("notify_watcher_add", event => {
            this.registerWatcherEvents(event.watcher);
            this.notifyWatcherList();
        }));

        this.events.on("notify_destroy", this.plugin.events.on("notify_watcher_remove", event => {
            if(event.watcher.getCurrentVideo() !== this.currentVideoUrl)
                return;

            this.notifyWatcherList();
        }));

        this.events.on("notify_destroy", this.plugin.events.on("notify_following_changed", event => {
            this.events.fire("notify_following", { watcherId: event.newWatcher ? event.newWatcher.clientId + " - " + event.newWatcher.clientUniqueId : undefined });
        }));

        this.events.on("notify_destroy", this.plugin.events.on("notify_following_url", event => {
            this.events.fire_react("notify_video", { url: event.newUrl });
        }));

        this.events.on("notify_destroy", this.plugin.events.on("notify_following_watcher_status", event => {
            this.events.fire("notify_following_status", {
                status: event.newStatus
            });
        }));
    }

    private registerWatcherEvents(watcher: W2GWatcher) {
        let watcherUnregisterCallbacks = [];

        const watcherId = watcher.clientId + " - " + watcher.clientUniqueId;
        watcherUnregisterCallbacks.push(watcher.events.on("notify_destroyed", () => {
            watcherUnregisterCallbacks.forEach(e => {
                this.unregisterCallbacks.remove(e);
                e();
            });
        }));

        watcherUnregisterCallbacks.push(watcher.events.on("notify_watcher_url_changed", event => {
            if(event.oldVideo !== this.currentVideoUrl && event.newVideo !== this.currentVideoUrl)
                return;

            /* remove own watcher from the list */
            this.notifyWatcherList();
        }));

        watcherUnregisterCallbacks.push(watcher.events.on("notify_watcher_nickname_changed", () => {
            this.events.fire_react("notify_watcher_info", {
                watcherId: watcherId,

                clientId: watcher.clientId,
                clientUniqueId: watcher.clientUniqueId,

                clientName: watcher.getWatcherName(),
                isOwnClient: this.connection.getClientId() === watcher.clientId
            });
        }));

        watcherUnregisterCallbacks.push(watcher.events.on("notify_watcher_status_changed", event => {
            this.events.fire_react("notify_watcher_status", {
                watcherId: watcherId,
                status: event.newStatus
            });
        }));

        watcherUnregisterCallbacks.push(watcher.events.on("notify_follower_added", event => {
            this.events.fire_react("notify_follower_added", {
                watcherId: watcherId,
                followerId: followerWatcherId(event.follower)
            });
        }));

        watcherUnregisterCallbacks.push(watcher.events.on("notify_follower_nickname_changed", event => {
            this.events.fire_react("notify_watcher_info", {
                watcherId: followerWatcherId(event.follower),

                clientId: event.follower.clientId,
                clientUniqueId: event.follower.clientUniqueId,

                clientName: event.follower.clientNickname,
                isOwnClient: event.follower.clientId === this.connection.getClientId()
            });
        }));

        watcherUnregisterCallbacks.push(watcher.events.on("notify_follower_status_changed", event => {
            this.events.fire_react("notify_watcher_status", {
                watcherId: followerWatcherId(event.follower),
                status: event.newStatus
            });
        }));

        watcherUnregisterCallbacks.push(watcher.events.on("notify_follower_removed", event => {
            this.events.fire_react("notify_follower_removed", {
                watcherId: watcherId,
                followerId: followerWatcherId(event.follower)
            });
        }));
    }

    @EventHandler<VideoViewerEvents>("query_watchers")
    private handleQueryWatchers() {
        this.notifyWatcherList();
    }

    @EventHandler<VideoViewerEvents>("query_watcher_status")
    private handleQueryWatcherStatus(event: VideoViewerEvents["query_watcher_status"]) {
        const info = parseWatcherId(event.watcherId);
        for(const watcher of this.plugin.getCurrentWatchers()) {
            if(watcher.clientId === info.clientId && watcher.clientUniqueId === info.clientUniqueId) {
                this.events.fire_react("notify_watcher_status", { watcherId: event.watcherId, status: watcher.getWatcherStatus() });
                return;
            }

            for(const follower of watcher.getFollowers()) {
                if(follower.clientUniqueId === info.clientUniqueId && follower.clientId === info.clientId) {
                    this.events.fire_react("notify_watcher_status", { watcherId: event.watcherId, status: follower.status });
                    return;
                }
            }
        }

        log.warn(LogCategory.GENERAL, tr("Video viewer queried the watcher status of an unknown client: %s (%o)"), event.watcherId, info);
    }

    @EventHandler<VideoViewerEvents>("query_watcher_info")
    private handleQueryWatcherInfo(event: VideoViewerEvents["query_watcher_info"]) {
        const info = parseWatcherId(event.watcherId);
        for(const watcher of this.plugin.getCurrentWatchers()) {
            if(watcher.clientId === info.clientId && watcher.clientUniqueId === info.clientUniqueId) {
                this.events.fire_react("notify_watcher_info", {
                    watcherId: event.watcherId,
                    clientName: watcher.getWatcherName(),
                    clientUniqueId: watcher.clientUniqueId,
                    clientId: watcher.clientId,
                    isOwnClient: watcher.clientId === this.connection.getClientId()
                });
                return;
            }

            for(const follower of watcher.getFollowers()) {
                if(follower.clientUniqueId === info.clientUniqueId && follower.clientId === info.clientId) {
                    this.events.fire_react("notify_watcher_info", {
                        watcherId: event.watcherId,
                        clientName: follower.clientNickname,
                        clientUniqueId: follower.clientUniqueId,
                        clientId: follower.clientId,
                        isOwnClient: follower.clientId === this.connection.getClientId()
                    });
                    return;
                }
            }
        }

        log.warn(LogCategory.GENERAL, tr("Video viewer queried the watcher info of an unknown client: %s (%o)"), event.watcherId, info);
    }

    @EventHandler<VideoViewerEvents>("query_followers")
    private handleQueryFollowers(event: VideoViewerEvents["query_followers"]) {
        const info = parseWatcherId(event.watcherId);
        for(const watcher of this.plugin.getCurrentWatchers()) {
            if(watcher.clientId !== info.clientId || watcher.clientUniqueId !== info.clientUniqueId)
                continue;

            this.events.fire_react("notify_follower_list", {
                followerIds: watcher.getFollowers().map(e => followerWatcherId(e)),
                watcherId: event.watcherId
            });
            return;
        }

        log.warn(LogCategory.GENERAL, tr("Video viewer queried the watcher followers of an unknown client: %s (%o)"), event.watcherId, info);
    }

    @EventHandler<VideoViewerEvents>("query_video")
    private handleQueryVideo() {
        this.events.fire_react("notify_video", { url: this.currentVideoUrl });
    }

    @EventHandler<VideoViewerEvents>("notify_local_status")
    private handleLocalStatus(event: VideoViewerEvents["notify_local_status"]) {
        const following = this.plugin.getLocalFollowingWatcher();
        if(following)
            this.plugin.setLocalFollowing(following, event.status);
        else
            this.plugin.setLocalWatcherStatus(this.currentVideoUrl, event.status);
    }

    @EventHandler<VideoViewerEvents>("action_follow")
    private handleActionFollow(event: VideoViewerEvents["action_follow"]) {
        if(event.watcherId) {
            const info = parseWatcherId(event.watcherId);
            for(const watcher of this.plugin.getCurrentWatchers()) {
                if(watcher.clientId !== info.clientId || watcher.clientUniqueId !== info.clientUniqueId)
                    continue;

                this.plugin.setLocalFollowing(watcher, { status: "paused" });
                return;
            }

            log.warn(LogCategory.GENERAL, tr("Video viewer tried to follow an unknown client: %s (%o)"), event.watcherId, info);
        } else {
            this.plugin.setLocalWatcherStatus(this.currentVideoUrl, { status: "paused" });
        }
    }

    @EventHandler<VideoViewerEvents>("action_toggle_side_bar")
    private handleActionToggleSidebar(event: VideoViewerEvents["action_toggle_side_bar"]) {
        settings.changeGlobal(Settings.KEY_W2G_SIDEBAR_COLLAPSED, !event.shown);
    }

    @EventHandler<VideoViewerEvents>("notify_video")
    private handleVideo(event: VideoViewerEvents["notify_video"]) {
        if(this.currentVideoUrl === event.url)
            return;

        this.currentVideoUrl = event.url;
        this.notifyWatcherList();
    }
}

let currentVideoViewer: VideoViewer;

global_client_actions.on("action_w2g", event => {
    const connection = server_connections.findConnection(event.handlerId);
    if(connection === undefined) return;

    const plugin = connection.getPluginCmdRegistry().getPluginHandler<W2GPluginCmdHandler>(W2GPluginCmdHandler.kPluginChannel);

    let watcher: W2GWatcher;
    if('following' in event) {
        watcher = plugin.getCurrentWatchers().find(e => e.clientId === event.following);
        if(!watcher) {
            createErrorModal(tr("Target client isn't watching anything"), tr("The target client isn't watching anything.")).open();
            return;
        }
    }

    if(currentVideoViewer && currentVideoViewer.connection !== connection) {
        currentVideoViewer.destroy();
        currentVideoViewer = undefined;
    }

    if(!currentVideoViewer) {
        currentVideoViewer = new VideoViewer(connection);
        currentVideoViewer.events.on("notify_destroy", () => {
            currentVideoViewer = undefined;
        });
    }

    if('following' in event) {
        currentVideoViewer.setFollowing(watcher);
    } else {
        currentVideoViewer.setWatchingVideo(event.videoUrl);
    }

    currentVideoViewer.open().catch(error => {
        let errorMessage = typeof error === "string" ? error : tr("Lookup the console for details");
        createErrorModal(tr("Failed to open video viewer."), tra("Failed to open the video viewer: {}", errorMessage)).open();
        logError(LogCategory.GENERAL, tr("Failed to open video viewer: %o"), error);
        currentVideoViewer.destroy();
        currentVideoViewer = undefined;
    });
});

window.onbeforeunload = () => {
    currentVideoViewer?.destroy();
};