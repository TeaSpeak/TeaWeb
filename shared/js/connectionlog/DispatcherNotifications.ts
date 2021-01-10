import * as loader from "tc-loader";
import {Stage} from "tc-loader";
import {server_connections} from "tc-shared/ConnectionManager";
import {getIconManager} from "tc-shared/file/Icons";
import {tr, tra} from "tc-shared/i18n/localize";
import {EventClient, EventServerAddress, EventType, TypeInfo} from "tc-shared/connectionlog/Definitions";
import {Settings, settings} from "tc-shared/settings";
import {format_time} from "tc-shared/ui/frames/chat";
import {ViewReasonId} from "tc-shared/ConnectionHandler";
import {formatDate} from "tc-shared/MessageFormatter";
import {renderBBCodeAsText} from "tc-shared/text/bbcode";
import {LogCategory, logInfo, logTrace} from "tc-shared/log";

export type DispatcherLog<T extends keyof TypeInfo> = (data: TypeInfo[T], handlerId: string, eventType: T) => void;

const notificationDefaultStatus: {[T in keyof TypeInfo]?: boolean} = {};
notificationDefaultStatus["client.poke.received"] = true;
notificationDefaultStatus["server.banned"] = true;
notificationDefaultStatus["server.closed"] = true;
notificationDefaultStatus["server.host.message.disconnect"] = true;
notificationDefaultStatus["global.message"] = true;
notificationDefaultStatus["connection.failed"] = true;
notificationDefaultStatus["private.message.received"] = true;
notificationDefaultStatus["connection.voice.dropped"] = true;

let windowFocused = false;

document.addEventListener("focusin", () => windowFocused = true);
document.addEventListener("focusout", () => windowFocused = false);

const dispatchers: {[key: string]: DispatcherLog<any>} = { };
function registerDispatcher<T extends keyof TypeInfo>(key: T, builder: DispatcherLog<T>) {
    dispatchers[key] = builder;
}

export function findNotificationDispatcher<T extends keyof TypeInfo>(type: T) : DispatcherLog<T> {
    return dispatchers[type];
}

export function getRegisteredNotificationDispatchers() : TypeInfo[] {
    return Object.keys(dispatchers) as any;
}

export function isNotificationEnabled(type: EventType) {
    return settings.getValue(Settings.FN_EVENTS_NOTIFICATION_ENABLED(type), notificationDefaultStatus[type as any] || false);
}

const kDefaultIcon = "img/teaspeak_cup_animated.png";

async function resolveAvatarUrl(client: EventClient, handlerId: string) {
    const connection = server_connections.findConnection(handlerId);
    const avatar = connection.fileManager.avatars.resolveClientAvatar({ clientUniqueId: client.client_unique_id, id: client.client_id });
    await avatar.awaitLoaded();
    return avatar.getAvatarUrl();
}

async function resolveServerIconUrl(handlerId: string) {
    const connection = server_connections.findConnection(handlerId);

    if(connection.channelTree.server.properties.virtualserver_icon_id) {
        const icon = getIconManager().resolveIcon(connection.channelTree.server.properties.virtualserver_icon_id, connection.getCurrentServerUniqueId(), connection.handlerId);
        await icon.awaitLoaded();

        if(icon.getState() === "loaded" && icon.iconId > 1000) {
            return icon.getImageUrl();
        }
    }

    return kDefaultIcon;
}

function spawnNotification(title: string, options: NotificationOptions) {
    if(!options.icon)
        options.icon = kDefaultIcon;

    if('Notification' in window) {
        try {
            new Notification(title, options);
        } catch (error) {
            logTrace(LogCategory.GENERAL, tr("Failed to spawn notification: %o"), error);
        }
    }
}

function spawnServerNotification(handlerId: string, options: NotificationOptions) {
    resolveServerIconUrl(handlerId).then(iconUrl => {
        const connection = server_connections.findConnection(handlerId);
        if(!connection) return;

        options.icon = iconUrl;
        spawnNotification(connection.channelTree.server.properties.virtualserver_name, options);
    });
}

function spawnClientNotification(handlerId: string, client: EventClient, options: NotificationOptions) {
    resolveAvatarUrl(client, handlerId).then(avatarUrl => {
        const connection = server_connections.findConnection(handlerId);
        if(!connection) return;

        options.icon = avatarUrl;
        spawnNotification(connection.channelTree.server.properties.virtualserver_name, options);
    });
}

const formatServerAddress = (address: EventServerAddress) => address.server_hostname + (address.server_port === 9987 ? "" : ":" + address.server_port);

registerDispatcher(EventType.CONNECTION_BEGIN, data => {
    spawnNotification(tr("Connecting..."), {
        body: tra("Connecting to {}", formatServerAddress(data.address))
    });
});

/* Snipped CONNECTION_HOSTNAME_RESOLVE */

registerDispatcher(EventType.CONNECTION_HOSTNAME_RESOLVED, data => {
    spawnNotification(tr("Hostname resolved"), {
        body: tra("Hostname resolved successfully to {}", formatServerAddress(data.address))
    });
});

registerDispatcher(EventType.CONNECTION_HOSTNAME_RESOLVE_ERROR, data => {
    spawnNotification(tr("Connect failed"), {
        body: tra("Failed to resolve hostname.\nConnecting to given hostname.\nError: {0}", data.message)
    });
});

/* Snipped CONNECTION_LOGIN */

registerDispatcher(EventType.CONNECTION_CONNECTED, data => {
    spawnNotification(tra("Connected to {}", formatServerAddress(data.serverAddress)), {
        body: tra("You connected as {}", data.own_client.client_name)
    });
});

registerDispatcher(EventType.CONNECTION_FAILED, data => {
    spawnNotification(tra("Connection to {} failed", formatServerAddress(data.serverAddress)), {
        body: tra("Failed to connect to {}.", formatServerAddress(data.serverAddress))
    });
});

registerDispatcher(EventType.DISCONNECTED, () => {
    spawnNotification(tra("You disconnected from the server"), { });
});


/* snipped RECONNECT_SCHEDULED */
/* snipped RECONNECT_EXECUTE */
/* snipped RECONNECT_CANCELED */

registerDispatcher(EventType.CONNECTION_VOICE_CONNECT, (data, handlerId) => {
    spawnServerNotification(handlerId, {
        body: tr("Connecting voice bridge.")
    });
});

registerDispatcher(EventType.CONNECTION_VOICE_CONNECT_SUCCEEDED, (data, handlerId) => {
    spawnServerNotification(handlerId, {
        body: tr("Voice bridge successfully connected.")
    });
});

registerDispatcher(EventType.CONNECTION_VOICE_CONNECT_FAILED, (data, handlerId) => {
    spawnServerNotification(handlerId, {
        body: tra("Failed to setup voice bridge: {0}. Allow reconnect: {1}", data.reason, data.reconnect_delay > 0 ? tr("Yes") : tr("No"))
    });
});

registerDispatcher(EventType.CONNECTION_VOICE_DROPPED, (data, handlerId) => {
    spawnServerNotification(handlerId, {
        body: tr("Voice bridge has been dropped. Trying to reconnect.")
    });
});

registerDispatcher(EventType.CONNECTION_COMMAND_ERROR, (data, handlerId) => {
    spawnServerNotification(handlerId, {
        body: tra("Command execution resulted in an error.")
    });
});

registerDispatcher(EventType.SERVER_WELCOME_MESSAGE, (data, handlerId) => {
    spawnServerNotification(handlerId, {
        body: tra("Welcome message:\n{}", data.message)
    });
});

registerDispatcher(EventType.SERVER_HOST_MESSAGE, (data, handlerId) => {
    spawnServerNotification(handlerId, {
        body: tra("Host message:\n{}", data.message)
    });
});

registerDispatcher(EventType.SERVER_HOST_MESSAGE_DISCONNECT, (data) => {
    spawnNotification(tr("Connection to server denied"), {
        body: tra("Server message:\n{}", data.message)
    });
});


registerDispatcher(EventType.SERVER_CLOSED, (data, handlerId) => {
    spawnServerNotification(handlerId, {
        body: data.message ? tra("Server has been closed ({})", data.message) : tr("Server has been closed")
    });
});

registerDispatcher(EventType.SERVER_BANNED, (data, handlerId) => {
    const time = data.time === 0 ? "ever" : format_time(data.time * 1000, tr("one second"));
    const reason = data.message ? " Reason: " + data.message : "";

    spawnServerNotification(handlerId, {
        body: data.invoker.client_id > 0 ? tra("You've been banned from the server by {0} for {1}.{2}", data.invoker.client_name, time, reason) :
            tra("You've been banned from the server for {0}.{1}", time, reason)
    });
});

registerDispatcher(EventType.SERVER_REQUIRES_PASSWORD, () => {
    spawnNotification(tra("Failed to connect to the server"), {
        body: tr("Server requires a password to connect.")
    });
});


registerDispatcher(EventType.CLIENT_VIEW_ENTER, (data, handlerId) => {
    let message;

    switch (data.reason) {
        case ViewReasonId.VREASON_USER_ACTION:
            if(data.channel_from) {
                message = tra("{0} appeared from {1} to {2}", data.client.client_name, data.channel_from.channel_name, data.channel_to.channel_name);
            } else {
                message = tra("{0} appeared to channel {1}", data.client.client_name, data.channel_to.channel_name);
            }
            break;

        case ViewReasonId.VREASON_MOVED:
            if(data.channel_from) {
                message = tra("{0} appeared from {1} to {2}, moved by {3}", data.client.client_name, data.channel_from.channel_name, data.channel_to.channel_name, data.invoker.client_name);
            } else {
                message = tra("{0} appeared to {1}, moved by {2}", data.client.client_name, data.channel_to.channel_name, data.invoker.client_name);
            }
            break;

        case ViewReasonId.VREASON_CHANNEL_KICK:
            if(data.channel_from) {
                message = tra("{0} appeared from {1} to {2}, kicked by {3}{4}", data.client.client_name, data.channel_from.channel_name, data.channel_to.channel_name, data.invoker.client_name, data.message ? " (" + data.message + ")" : "");
            } else {
                message = tra("{0} appeared to {1}, kicked by {2}{3}", data.client.client_name, data.channel_to.channel_name, data.invoker.client_name, data.message ? " (" + data.message + ")" : "");
            }
            break;

        default:
            return;
    }

    spawnClientNotification(handlerId, data.client, {
        body: message
    });
});

registerDispatcher(EventType.CLIENT_VIEW_ENTER_OWN_CHANNEL, (data, handlerId) => {
    let message;

    switch (data.reason) {
        case ViewReasonId.VREASON_USER_ACTION:
            if(data.channel_from) {
                message = tra("{0} appeared from {1} to your channel {2}", data.client.client_name, data.channel_from.channel_name, data.channel_to.channel_name);
            } else {
                message = tra("{0} appeared to your channel {1}", data.client.client_name, data.channel_to.channel_name);
            }
            break;

        case ViewReasonId.VREASON_MOVED:
            if(data.channel_from) {
                message = tra("{0} appeared from {1} to your channel {2}, moved by {3}", data.client.client_name, data.channel_from.channel_name, data.channel_to.channel_name, data.invoker.client_name);
            } else {
                message = tra("{0} appeared to your channel {1}, moved by {2}", data.client.client_name, data.channel_to.channel_name, data.invoker.client_name);
            }
            break;

        case ViewReasonId.VREASON_CHANNEL_KICK:
            if(data.channel_from) {
                message = tra("{0} appeared from {1} to your channel {2}, kicked by {3}{4}", data.client.client_name, data.channel_from.channel_name, data.channel_to.channel_name, data.invoker.client_name, data.message ? " (" + data.message + ")" : "");
            } else {
                message = tra("{0} appeared to your channel {1}, kicked by {2}{3}", data.client.client_name, data.channel_to.channel_name, data.invoker.client_name, data.message ? " (" + data.message + ")" : "");
            }
            break;

        default:
            return;
    }

    spawnClientNotification(handlerId, data.client, {
        body: message
    });
});

registerDispatcher(EventType.CLIENT_VIEW_MOVE, (data, handlerId) => {
    let message;

    switch (data.reason) {
        case ViewReasonId.VREASON_MOVED:
            message = tra("{0} was moved from channel {1} to {2} by {3}", data.client.client_name, data.channel_from.channel_name, data.channel_to.channel_name, data.invoker.client_name);
            break;

        case ViewReasonId.VREASON_USER_ACTION:
            message = tra("{0} switched from channel {1} to {2}", data.client.client_name, data.channel_from.channel_name, data.channel_to.channel_name);
            break;

        case ViewReasonId.VREASON_CHANNEL_KICK:
            message = tra("{0} got kicked from channel {1} to {2} by {3}{4}", data.client.client_name, data.channel_from.channel_name, data.channel_to.channel_name, data.invoker.client_name, data.message ? " (" + data.message + ")" : "");
            break;

        default:
            return;
    }

    spawnClientNotification(handlerId, data.client, {
        body: message
    });
});

registerDispatcher(EventType.CLIENT_VIEW_MOVE_OWN_CHANNEL, findNotificationDispatcher(EventType.CLIENT_VIEW_MOVE));

registerDispatcher(EventType.CLIENT_VIEW_MOVE_OWN, (data, handlerId) => {
    let message;

    switch (data.reason) {
        case ViewReasonId.VREASON_MOVED:
            message = tra("You have been moved by {3} from channel {1} to {2}", data.client.client_name, data.channel_from.channel_name, data.channel_to.channel_name, data.invoker.client_name);
            break;

        case ViewReasonId.VREASON_USER_ACTION:
            /* no need to notify here */
            return;

        case ViewReasonId.VREASON_CHANNEL_KICK:
            message = tra("You got kicked out of the channel {1} to channel {2} by {3}{4}", data.client.client_name, data.channel_from.channel_name, data.channel_to.channel_name, data.invoker.client_name, data.message ? " (" + data.message + ")" : "");
            break;

        default:
            return;
    }

    spawnClientNotification(handlerId, data.client, {
        body: message
    });
});


registerDispatcher(EventType.CLIENT_VIEW_LEAVE, (data, handlerId) => {
    let message;

    switch (data.reason) {
        case ViewReasonId.VREASON_USER_ACTION:
            message = tra("{0} disappeared from {1} to {2}", data.client.client_name, data.channel_from.channel_name, data.channel_to.channel_name);
            break;

        case ViewReasonId.VREASON_SERVER_LEFT:
            message = tra("{0} left the server{1}", data.client.client_name, data.message ? " (" + data.message + ")" : "");
            break;

        case ViewReasonId.VREASON_SERVER_KICK:
            message = tra("{0} was kicked from the server by {1}.{2}", data.client, data.invoker.client_name, data.message ? " (" + data.message + ")" : "");
            break;

        case ViewReasonId.VREASON_CHANNEL_KICK:
            message = tra("{0} was kicked from channel {1} by {2}.{3}", data.client, data.channel_from.channel_name, data.invoker.client_name, data.message ? " (" + data.message + ")" : "");
            break;

        case ViewReasonId.VREASON_BAN:
            let duration = "permanently";
            if(data.ban_time)
                duration = tr("for") + " " + formatDate(data.ban_time);

            message = tra("{0} was banned {1} by {2}.{3}", data.client.client_name, duration, data.invoker.client_name, data.message ? " (" + data.message + ")" : "");
            break;

        case ViewReasonId.VREASON_TIMEOUT:
            message = tra("{0} timed out{1}", data.client.client_name, data.message ? " (" + data.message + ")" : "");
            break;

        case ViewReasonId.VREASON_MOVED:
            message = tra("{0} disappeared from {1} to {2}, moved by {3}", data.client.client_name, data.channel_from.channel_name, data.channel_to.channel_name, data.invoker.client_name);
            break;

        default:
            return;
    }

    spawnClientNotification(handlerId, data.client, {
        body: message
    });
});

registerDispatcher(EventType.CLIENT_VIEW_LEAVE_OWN_CHANNEL, (data, handlerId) => {
    let message;

    switch (data.reason) {
        case ViewReasonId.VREASON_USER_ACTION:
            message = tra("{0} disappeared from your channel {1} to {2}", data.client.client_name, data.channel_from.channel_name, data.channel_to.channel_name);
            break;

        case ViewReasonId.VREASON_MOVED:
            message = tra("{0} disappeared from your channel {1} to {2}, moved by {3}", data.client.client_name, data.channel_from.channel_name, data.channel_to.channel_name, data.invoker.client_name);
            break;

        default:
            return findNotificationDispatcher("client.view.leave")(data, handlerId, EventType.CLIENT_VIEW_LEAVE);
    }

    spawnClientNotification(handlerId, data.client, {
        body: message
    });
});


registerDispatcher(EventType.CLIENT_NICKNAME_CHANGED, (data, handlerId) => {
    spawnClientNotification(handlerId, data.client, {
        body: tra("{0} changed his nickname from \"{1}\" to \"{2}\"", data.client.client_name, data.old_name, data.new_name)
    });
});

/* snipped CLIENT_NICKNAME_CHANGED_OWN */
/* snipped CLIENT_NICKNAME_CHANGE_FAILED */

registerDispatcher(EventType.CHANNEL_CREATE, (data, handlerId) => {
    spawnServerNotification(handlerId, {
        body: tra("Channel {} has been created by {}.", data.channel.channel_name, data.creator.client_name)
    });
});

registerDispatcher(EventType.CHANNEL_DELETE, (data, handlerId) => {
    spawnServerNotification(handlerId, {
        body: tra("Channel {} has been deleted by {}.", data.channel.channel_name, data.deleter.client_name)
    });
});

/* snipped CHANNEL_CREATE_OWN */
/* snipped CHANNEL_DELETE_OWN */

/* snipped ERROR_CUSTOM */
/* snipped ERROR_PERMISSION */

/* TODO!
CLIENT_SERVER_GROUP_ADD = "client.server.group.add",
CLIENT_SERVER_GROUP_REMOVE = "client.server.group.remove",
CLIENT_CHANNEL_GROUP_CHANGE = "client.channel.group.change",
*/

registerDispatcher(EventType.CLIENT_POKE_RECEIVED, (data, handlerId) => {
    resolveAvatarUrl(data.sender, handlerId).then(avatarUrl => {
        const connection = server_connections.findConnection(handlerId);
        if(!connection) return;

        new Notification(connection.channelTree.server.properties.virtualserver_name, {
            body: tr("You've peen poked by") + " " + data.sender.client_name + (data.message ? ":\n" + renderBBCodeAsText(data.message) : ""),
            icon: avatarUrl
        });
    });
});

/* snipped CLIENT_POKE_SEND */

registerDispatcher(EventType.GLOBAL_MESSAGE, (data, handlerId) => {
    if(windowFocused)
        return;

    spawnServerNotification(handlerId, {
        body: tra("{} send a server message: {}", data.sender.client_name, renderBBCodeAsText(data.message)),
    });
});


registerDispatcher(EventType.PRIVATE_MESSAGE_RECEIVED, (data, handlerId) => {
    if(windowFocused)
        return;

    spawnClientNotification(handlerId, data.sender, {
        body: tra("Private message from {}: {}", data.sender.client_name, renderBBCodeAsText(data.message)),
    });
});

registerDispatcher(EventType.WEBRTC_FATAL_ERROR, (data, handlerId) => {
    if(data.retryTimeout) {
        let time = Math.ceil(data.retryTimeout / 1000);
        let minutes = Math.floor(time / 60);
        let seconds = time % 60;

        spawnServerNotification(handlerId, {
            body: tra("WebRTC connection closed due to a fatal error:\n{}\nRetry scheduled in {}.", data.message, (minutes > 0 ? minutes + "m" : "") + seconds + "s")
        });
    } else {
        spawnServerNotification(handlerId, {
            body: tra("WebRTC connection closed due to a fatal error:\n{}\nNo retry scheduled.", data.message)
        });
    }
});

/* snipped PRIVATE_MESSAGE_SEND */

loader.register_task(Stage.LOADED, {
    function: async () => {
        if(!('Notification' in window))
            return;

        if(Notification.permission === "granted")
            return;

        /* yeahr fuck safari */
        const promise = Notification.requestPermission(result => {
            logInfo(LogCategory.GENERAL, tr("Notification permission request (callback) resulted in %s"), result);
        })

        if(typeof promise !== "undefined" && 'then' in promise) {
            promise.then(result => {
                logInfo(LogCategory.GENERAL, tr("Notification permission request resulted in %s"), result);
            }).catch(error => {
                logInfo(LogCategory.GENERAL, tr("Failed to execute notification permission request: %O"), error);
            });
        }
    },
    name: "Request notifications",
    priority: 1
});