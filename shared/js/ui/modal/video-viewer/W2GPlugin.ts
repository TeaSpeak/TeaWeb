import {PlayerStatus} from "../video-viewer/Definitions";
import { tr } from "tc-shared/i18n/localize";
import {Registry, Event} from "tc-events";
import {PluginCmdHandler, PluginCommandInvoker,} from "tc-shared/connection/PluginCmdHandler";

export interface W2GEvents {
    notify_watcher_add: { watcher: W2GWatcher },
    notify_watcher_remove: { watcher: W2GWatcher },

    notify_following_changed: { oldWatcher: W2GWatcher | undefined, newWatcher: W2GWatcher | undefined }
    notify_following_watcher_status: { newStatus: PlayerStatus },
    notify_following_url: { newUrl: string }
}

export interface W2GWatcherEvents {
    notify_follower_added: { follower: W2GWatcherFollower },
    notify_follower_removed: { follower: W2GWatcherFollower },
    notify_follower_status_changed: { follower: W2GWatcherFollower, newStatus: PlayerStatus },
    notify_follower_nickname_changed: { follower: W2GWatcherFollower, newName: string },

    notify_watcher_status_changed: { newStatus: PlayerStatus },
    notify_watcher_nickname_changed: { newName: string },
    notify_watcher_url_changed: { oldVideo: string, newVideo: string },

    notify_destroyed: {}
}

export interface W2GWatcherFollower {
    clientId: number;
    clientUniqueId: string;

    clientNickname: string;
    status: PlayerStatus;
}

export abstract class W2GWatcher {
    public readonly events: Registry<W2GWatcherEvents>;
    public readonly clientId: number;
    public readonly clientUniqueId: string;

    protected constructor(clientId, clientUniqueId) {
        this.clientId = clientId;
        this.clientUniqueId = clientUniqueId;

        this.events = new Registry<W2GWatcherEvents>();
    }

    public abstract getWatcherName() : string;
    public abstract getWatcherStatus() : PlayerStatus;

    public abstract getCurrentVideo() : string;
    public abstract getFollowers() : W2GWatcherFollower[];
}

interface InternalW2GWatcherFollower extends W2GWatcherFollower {
    jsonStatus: string;

    statusTimeoutId: number;
}

class InternalW2GWatcher extends W2GWatcher {
    public watcherName: string;

    public watcherStatus: PlayerStatus;
    public watcherJsonStatus: string;

    public currentVideo: string;
    public watcherStatusReceived = false;

    public statusTimeoutId: number;
    public followers: InternalW2GWatcherFollower[] = [];

    constructor(clientId, clientUniqueId) {
        super(clientId, clientUniqueId);
    }

    getCurrentVideo(): string {
        return this.currentVideo;
    }

    getFollowers(): W2GWatcherFollower[] {
        return this.followers;
    }

    getWatcherName(): string {
        return this.watcherName;
    }

    getWatcherStatus(): PlayerStatus {
        return this.watcherStatus;
    }

    destroy() {
        this.events.fire("notify_destroyed");
    }

    updateWatcher(client: PluginCommandInvoker, url: string, status: PlayerStatus) {
        this.watcherStatusReceived = true;

        if(this.watcherName !== client.clientName) {
            this.watcherName = client.clientName;
            this.events.fire("notify_watcher_nickname_changed", { newName: client.clientName });
        }

        if(this.currentVideo !== url) {
            const oldVideo = this.currentVideo;
            this.currentVideo = url;
            this.events.fire("notify_watcher_url_changed", { oldVideo: oldVideo, newVideo: url });
        }

        const jsonStatus = JSON.stringify(status);
        if(this.watcherJsonStatus !== jsonStatus) {
            this.watcherJsonStatus = jsonStatus;
            this.watcherStatus = status;
            this.events.fire("notify_watcher_status_changed", { newStatus: status })
        }
    }

    findFollower(client: PluginCommandInvoker) : InternalW2GWatcherFollower {
        return this.followers.find(e => e.clientId === client.clientId && e.clientUniqueId == client.clientUniqueId);
    }

    removeFollower(client: PluginCommandInvoker) {
        const follower = this.findFollower(client);
        if(!follower) return;

        this.doRemoveFollower(follower);
    }

    updateFollower(client: PluginCommandInvoker, status: PlayerStatus) {
        let follower = this.findFollower(client);
        if(!follower) {
            /* yeah a new follower */
            follower = {
                status: status,
                jsonStatus: JSON.stringify(status),

                clientNickname: client.clientName,
                clientUniqueId: client.clientUniqueId,
                clientId: client.clientId,

                statusTimeoutId: 0
            };
            this.followers.push(follower);
            this.events.fire("notify_follower_added", { follower: follower });
        } else {
            if(follower.clientNickname !== client.clientName) {
                follower.clientNickname = client.clientName;
                this.events.fire("notify_follower_nickname_changed", { follower: follower, newName: client.clientName });
            }

            let jsonStatus = JSON.stringify(status);
            if(follower.jsonStatus !== jsonStatus) {
                follower.jsonStatus = jsonStatus;
                follower.status = status;
                this.events.fire("notify_follower_status_changed", { follower: follower, newStatus: status });
            }
        }

        clearTimeout(follower.statusTimeoutId);
        follower.statusTimeoutId = setTimeout(() => this.doRemoveFollower(follower), W2GPluginCmdHandler.kStatusUpdateTimeout);
    }

    private doRemoveFollower(follower: InternalW2GWatcherFollower) {
        const index = this.followers.indexOf(follower);
        if(index === -1) return;

        this.followers.splice(index, 1);
        clearTimeout(follower.statusTimeoutId);

        this.events.fire("notify_follower_removed", { follower: follower });
    }
}

interface W2GCommand {
    type: keyof W2GCommandPayload;
    payload: W2GCommandPayload[keyof W2GCommandPayload];
}

interface W2GCommandPayload {
    "update-status": {
        videoUrl: string;

        followingId: number;
        followingUniqueId: string;

        status: PlayerStatus;
    },

    "player-closed": {}
}

export class W2GPluginCmdHandler extends PluginCmdHandler {
    static readonly kPluginChannel = "teaspeak-w2g";
    static readonly kStatusUpdateInterval = 5000;
    static readonly kStatusUpdateTimeout = 10000;

    readonly events: Registry<W2GEvents>;
    private readonly callbackWatcherEvents;

    private currentWatchers: InternalW2GWatcher[] = [];

    private localPlayerStatus: PlayerStatus;
    private localVideoUrl: string;
    private localFollowing: InternalW2GWatcher | undefined;
    private localStatusUpdateTimer: number;

    constructor() {
        super(W2GPluginCmdHandler.kPluginChannel);
        this.events = new Registry<W2GEvents>();

        this.callbackWatcherEvents = this.handleLocalWatcherEvent.bind(this);
    }

    handleHandlerRegistered() {
        this.localStatusUpdateTimer = setInterval(() => this.notifyLocalStatus(), W2GPluginCmdHandler.kStatusUpdateInterval);
    }

    handleHandlerUnregistered() {
        clearInterval(this.localStatusUpdateTimer);
        this.localStatusUpdateTimer = undefined;
    }

    handlePluginCommand(data: string, invoker: PluginCommandInvoker) {
        if(invoker.clientId === this.currentServerConnection.client.getClientId())
            return;

        let command: W2GCommand;
        try {
            command = JSON.parse(data);
        } catch (e) {
            return;
        }

        if(command.type === "update-status") {
            this.handleStatusUpdate(command.payload as any, invoker);
        } else if(command.type === "player-closed") {
            this.handlePlayerClosed(invoker);
        }
    }

    private sendCommand<T extends keyof W2GCommandPayload>(command: T, payload: W2GCommandPayload[T]) {
        this.sendPluginCommand(JSON.stringify({
            type: command,
            payload: payload
        } as W2GCommand), "server");
    }

    getCurrentWatchers() : W2GWatcher[] {
        return this.currentWatchers.filter(e => e.watcherStatusReceived);
    }

    private findWatcher(client: PluginCommandInvoker) : InternalW2GWatcher {
        return this.currentWatchers.find(e => e.clientUniqueId === client.clientUniqueId && e.clientId == client.clientId);
    }

    private destroyWatcher(watcher: InternalW2GWatcher) {
        this.currentWatchers.remove(watcher);
        this.events.fire("notify_watcher_remove", { watcher: watcher });
        watcher.destroy();
    }

    private removeClientFromWatchers(client: PluginCommandInvoker) {
        const watcher = this.findWatcher(client);
        if(!watcher) return;

        this.destroyWatcher(watcher);
    }

    private removeClientFromFollowers(client: PluginCommandInvoker) {
        this.currentWatchers.forEach(watcher => watcher.removeFollower(client));
    }

    private handlePlayerClosed(client: PluginCommandInvoker) {
        this.removeClientFromWatchers(client);
        this.removeClientFromFollowers(client);
    }

    private handleStatusUpdate(command: W2GCommandPayload["update-status"], client: PluginCommandInvoker) {
        if(command.followingId !== 0) {
            this.removeClientFromWatchers(client);

            let watcher = this.currentWatchers.find(e => e.clientId === command.followingId && e.clientUniqueId === command.followingUniqueId);
            if(!watcher) {
                /* Seems like a following client was faster with notifying than the watcher itself. So lets create him. */
                this.currentWatchers.push(watcher = new InternalW2GWatcher(command.followingId, command.followingUniqueId));
            }

            watcher.updateFollower(client, command.status);
        } else {
            this.removeClientFromFollowers(client);

            let watcher = this.findWatcher(client);
            let isNewWatcher;
            if(!watcher) {
                isNewWatcher = true;
                this.currentWatchers.push(watcher = new InternalW2GWatcher(client.clientId, client.clientUniqueId));
            } else {
                isNewWatcher = !watcher.watcherStatusReceived;
            }

            watcher.updateWatcher(client, command.videoUrl, command.status);
            if(isNewWatcher)
                this.events.fire("notify_watcher_add", { watcher: watcher });

            clearTimeout(watcher.statusTimeoutId);
            watcher.statusTimeoutId = setTimeout(() => this.watcherStatusTimeout(watcher), W2GPluginCmdHandler.kStatusUpdateTimeout);
        }
    }

    private watcherStatusTimeout(watcher: InternalW2GWatcher) {
        const index = this.currentWatchers.indexOf(watcher);
        if(index === -1) return;

        this.destroyWatcher(watcher);
    }

    private notifyLocalStatus() {
        let statusUpdate: W2GCommandPayload["update-status"];
        if(this.localFollowing) {
            statusUpdate = {
                status: this.localPlayerStatus,
                videoUrl: this.localVideoUrl,
                followingUniqueId: this.localFollowing.clientUniqueId,
                followingId: this.localFollowing.clientId
            };
        } else if(this.localVideoUrl) {
            statusUpdate = {
                status: this.localPlayerStatus,
                videoUrl: this.localVideoUrl,

                followingId: 0,
                followingUniqueId: ""
            };
        }

        if(statusUpdate) {
            if(this.currentServerConnection.connected())
                this.sendCommand("update-status", statusUpdate);

            const ownClient = this.currentServerConnection.client.getClient();
            this.handleStatusUpdate(statusUpdate, {
                clientId: ownClient.clientId(),
                clientUniqueId: ownClient.clientUid(),
                clientName: ownClient.clientNickName()
            });
        }
    }

    setLocalPlayerClosed() {
        if(this.localVideoUrl === undefined && this.localFollowing === undefined)
            return;

        this.localVideoUrl = undefined;
        this.localFollowing = undefined;

        this.sendCommand("player-closed", {});

        const ownClient = this.currentServerConnection.client.getClient();
        this.handlePlayerClosed({
            clientId: ownClient.clientId(),
            clientUniqueId: ownClient.clientUid(),
            clientName: ownClient.clientNickName()
        });
    }

    setLocalWatcherStatus(videoUrl: string, status: PlayerStatus) {
        let forceUpdate = false;

        if(this.localFollowing) {
            this.localFollowing.events.off(this.callbackWatcherEvents);
            this.localFollowing = undefined;
            forceUpdate = true;
        }

        if(this.localVideoUrl !== videoUrl) {
            this.localVideoUrl = videoUrl;
            forceUpdate = true;
        }

        forceUpdate = forceUpdate || this.localPlayerStatus?.status !== status.status;
        this.localPlayerStatus = status;
        if(forceUpdate)
            this.notifyLocalStatus();
    }

    setLocalFollowing(target: W2GWatcher | undefined, status?: PlayerStatus) {
        let forceUpdate = false;

        if(!(target instanceof InternalW2GWatcher))
            throw tr("invalid target watcher");

        if(this.localFollowing !== target) {
            if(target && target.clientId === this.currentServerConnection.client.getClientId())
                throw tr("You can't follow your self");

            const oldWatcher = this.localFollowing;
            oldWatcher?.events.off(this.callbackWatcherEvents);

            this.localFollowing = target;
            this.localFollowing?.events.on("notify_watcher_status_changed", this.callbackWatcherEvents);
            this.localFollowing?.events.on("notify_watcher_url_changed", this.callbackWatcherEvents);
            this.localFollowing?.events.on("notify_destroyed", this.callbackWatcherEvents);

            this.events.fire("notify_following_changed", { oldWatcher: oldWatcher, newWatcher: target });
            forceUpdate = true;
        }

        if(target) {
            if(typeof status !== "object")
                throw tr("missing w2g status");

            forceUpdate = forceUpdate || this.localPlayerStatus?.status !== status.status;
            this.localPlayerStatus = status;
        }

        if(forceUpdate)
            this.notifyLocalStatus();
    }

    getLocalFollowingWatcher() : W2GWatcher | undefined { return this.localFollowing; }

    private handleLocalWatcherEvent(event: Event<W2GWatcherEvents, "notify_watcher_url_changed" | "notify_watcher_status_changed" | "notify_destroyed">) {
        switch (event.type) {
            case "notify_watcher_url_changed":
                this.events.fire("notify_following_url", { newUrl: event.asUnchecked("notify_watcher_url_changed").newVideo });
                break;

            case "notify_watcher_status_changed":
                this.events.fire("notify_following_watcher_status", { newStatus: event.asUnchecked("notify_watcher_status_changed").newStatus });
                break;

            case "notify_destroyed":
                const oldWatcher = this.localFollowing;
                this.localFollowing = undefined;
                this.events.fire_react("notify_following_changed", { newWatcher: undefined, oldWatcher: oldWatcher });
                this.notifyLocalStatus();
                break;
        }
    }
}