import {PermissionInfo} from "../../../permission/PermissionManager";
import {ViewReasonId} from "../../../ConnectionHandler";
import * as React from "react";
import {ServerEventLog} from "../../../ui/frames/log/ServerEventLog";

export enum EventType {
    CONNECTION_BEGIN = "connection.begin",
    CONNECTION_HOSTNAME_RESOLVE = "connection.hostname.resolve",
    CONNECTION_HOSTNAME_RESOLVE_ERROR = "connection.hostname.resolve.error",
    CONNECTION_HOSTNAME_RESOLVED = "connection.hostname.resolved",
    CONNECTION_LOGIN = "connection.login",
    CONNECTION_CONNECTED = "connection.connected",
    CONNECTION_FAILED = "connection.failed",

    DISCONNECTED = "disconnected",

    CONNECTION_VOICE_CONNECT = "connection.voice.connect",
    CONNECTION_VOICE_CONNECT_FAILED = "connection.voice.connect.failed",
    CONNECTION_VOICE_CONNECT_SUCCEEDED = "connection.voice.connect.succeeded",
    CONNECTION_VOICE_DROPPED = "connection.voice.dropped",

    CONNECTION_COMMAND_ERROR = "connection.command.error",

    GLOBAL_MESSAGE = "global.message",

    SERVER_WELCOME_MESSAGE = "server.welcome.message",
    SERVER_HOST_MESSAGE = "server.host.message",
    SERVER_HOST_MESSAGE_DISCONNECT = "server.host.message.disconnect",

    SERVER_CLOSED = "server.closed",
    SERVER_BANNED = "server.banned",
    SERVER_REQUIRES_PASSWORD = "server.requires.password",

    CLIENT_VIEW_ENTER = "client.view.enter",
    CLIENT_VIEW_LEAVE = "client.view.leave",
    CLIENT_VIEW_MOVE = "client.view.move",

    CLIENT_VIEW_ENTER_OWN_CHANNEL = "client.view.enter.own.channel",
    CLIENT_VIEW_LEAVE_OWN_CHANNEL = "client.view.leave.own.channel",
    CLIENT_VIEW_MOVE_OWN_CHANNEL = "client.view.move.own.channel",

    CLIENT_VIEW_MOVE_OWN = "client.view.move.own",

    CLIENT_NICKNAME_CHANGED = "client.nickname.changed",
    CLIENT_NICKNAME_CHANGED_OWN = "client.nickname.changed.own",
    CLIENT_NICKNAME_CHANGE_FAILED = "client.nickname.change.failed",

    CLIENT_SERVER_GROUP_ADD = "client.server.group.add",
    CLIENT_SERVER_GROUP_REMOVE = "client.server.group.remove",
    CLIENT_CHANNEL_GROUP_CHANGE = "client.channel.group.change",

    PRIVATE_MESSAGE_RECEIVED = "private.message.received",
    PRIVATE_MESSAGE_SEND = "private.message.send",

    CHANNEL_CREATE = "channel.create",
    CHANNEL_DELETE = "channel.delete",

    CHANNEL_CREATE_OWN = "channel.create.own",
    CHANNEL_DELETE_OWN = "channel.delete.own",

    ERROR_CUSTOM = "error.custom",
    ERROR_PERMISSION = "error.permission",

    CLIENT_POKE_RECEIVED = "client.poke.received",
    CLIENT_POKE_SEND = "client.poke.send",

    RECONNECT_SCHEDULED = "reconnect.scheduled",
    RECONNECT_EXECUTE = "reconnect.execute",
    RECONNECT_CANCELED = "reconnect.canceled"
}

export type EventClient = {
    client_unique_id: string;
    client_name: string;
    client_id: number;
}
export type EventChannelData = {
    channel_id: number;
    channel_name: string;
}
export type EventServerData = {
    server_name: string;
    server_unique_id: string;
}
export type EventServerAddress = {
    server_hostname: string;
    server_port: number;
}

export namespace event {
    export type EventGlobalMessage = {
        isOwnMessage: boolean;
        sender: EventClient;
        message: string;
    }
    export type EventConnectBegin = {
        address: EventServerAddress;
        client_nickname: string;
    }
    export type EventErrorCustom = {
        message: string;
    }

    export type EventReconnectScheduled = {
        timeout: number;
    }

    export type EventReconnectCanceled = { }
    export type EventReconnectExecute = { }

    export type EventErrorPermission = {
        permission: PermissionInfo;
    }

    export type EventWelcomeMessage = {
        message: string;
    }

    export type EventHostMessageDisconnect = {
        message: string;
    }

    export type EventClientMove = {
        channel_from?: EventChannelData;
        channel_from_own: boolean;

        channel_to?: EventChannelData;
        channel_to_own: boolean;

        client: EventClient;
        client_own: boolean;

        invoker?: EventClient;

        message?: string;
        reason: ViewReasonId;
    }

    export type EventClientEnter = {
        channel_from?: EventChannelData;
        channel_to?: EventChannelData;

        client: EventClient;
        invoker?: EventClient;

        message?: string;

        reason: ViewReasonId;
        ban_time?: number;
    }

    export type EventClientLeave = {
        channel_from?: EventChannelData;
        channel_to?: EventChannelData;

        client: EventClient;
        invoker?: EventClient;

        message?: string;

        reason: ViewReasonId;
        ban_time?: number;
    }

    export type EventChannelCreate = {
        creator: EventClient;
        channel: EventChannelData;
    }

    export type EventChannelDelete = {
        deleter: EventClient;
        channel: EventChannelData;
    }

    export type EventConnectionConnected = {
        serverName: string,
        serverAddress: EventServerAddress,
        own_client: EventClient;
    }
    export type EventConnectionFailed = {
        serverAddress: EventServerAddress
    }
    export type EventConnectionLogin = {}
    export type EventConnectionHostnameResolve = {};
    export type EventConnectionHostnameResolved = {
        address: EventServerAddress;
    }
    export type EventConnectionHostnameResolveError = {
        message: string;
    }

    export type EventConnectionVoiceConnectFailed = {
        reason: string;
        reconnect_delay: number; /* if less or equal to 0 reconnect is prohibited */
    }

    export type EventConnectionVoiceConnectSucceeded = {}

    export type EventConnectionVoiceConnect = {
        attemptCount: number
    }

    export type EventConnectionVoiceDropped = {}

    export type EventConnectionCommandError = {
        error: any;
    }

    export type EventClientNicknameChanged = {
        client: EventClient;

        old_name: string;
        new_name: string;
    }

    export type EventClientNicknameChangeFailed = {
        reason: string;
    }

    export type EventServerClosed = {
        message: string;
    }

    export type EventServerRequiresPassword = {}

    export type EventServerBanned = {
        message: string;
        time: number;

        invoker: EventClient;
    }

    export type EventClientPokeReceived = {
        sender: EventClient,
        message: string
    }

    export type EventClientPokeSend = {
        target: EventClient,
        message: string
    }

    export type EventPrivateMessageSend = {
        target: EventClient,
        message: string
    }

    export type EventPrivateMessageReceived = {
        sender: EventClient,
        message: string
    }
}

export type LogMessage = {
    type: EventType;
    uniqueId: string;
    timestamp: number;
    data: any;
}

export interface TypeInfo {
    "connection.begin" : event.EventConnectBegin;
    "global.message": event.EventGlobalMessage;

    "error.custom": event.EventErrorCustom;
    "error.permission": event.EventErrorPermission;

    "connection.hostname.resolved": event.EventConnectionHostnameResolved;
    "connection.hostname.resolve": event.EventConnectionHostnameResolve;
    "connection.hostname.resolve.error": event.EventConnectionHostnameResolveError;
    "connection.failed": event.EventConnectionFailed;
    "connection.login": event.EventConnectionLogin;
    "connection.connected": event.EventConnectionConnected;
    "connection.voice.dropped": event.EventConnectionVoiceDropped;
    "connection.voice.connect": event.EventConnectionVoiceConnect;
    "connection.voice.connect.failed": event.EventConnectionVoiceConnectFailed;
    "connection.voice.connect.succeeded": event.EventConnectionVoiceConnectSucceeded;
    "connection.command.error": event.EventConnectionCommandError;

    "reconnect.scheduled": event.EventReconnectScheduled;
    "reconnect.canceled": event.EventReconnectCanceled;
    "reconnect.execute": event.EventReconnectExecute;

    "server.welcome.message": event.EventWelcomeMessage;
    "server.host.message": event.EventWelcomeMessage;
    "server.host.message.disconnect": event.EventHostMessageDisconnect;

    "server.closed": event.EventServerClosed;
    "server.requires.password": event.EventServerRequiresPassword;
    "server.banned": event.EventServerBanned;

    "client.view.enter": event.EventClientEnter;
    "client.view.move": event.EventClientMove;
    "client.view.leave": event.EventClientLeave;

    "client.view.enter.own.channel": event.EventClientEnter;
    "client.view.move.own.channel": event.EventClientMove;
    "client.view.leave.own.channel": event.EventClientLeave;

    "client.view.move.own": event.EventClientMove;

    "client.nickname.change.failed": event.EventClientNicknameChangeFailed,
    "client.nickname.changed": event.EventClientNicknameChanged,
    "client.nickname.changed.own": event.EventClientNicknameChanged

    "channel.create": event.EventChannelCreate;
    "channel.delete": event.EventChannelDelete;

    "channel.create.own": event.EventChannelCreate;
    "channel.delete.own": event.EventChannelDelete;

    "client.poke.received": event.EventClientPokeReceived,
    "client.poke.send": event.EventClientPokeSend,


    "private.message.received": event.EventPrivateMessageReceived,
    "private.message.send": event.EventPrivateMessageSend,

    "disconnected": any;
}

export interface EventDispatcher<EventType extends keyof TypeInfo> {
    log(data: TypeInfo[EventType], logger: ServerEventLog) : React.ReactNode;
    notify(data: TypeInfo[EventType], logger: ServerEventLog);
    sound(data: TypeInfo[EventType], logger: ServerEventLog);
}

export interface ServerLogUIEvents {
    "query_log": {},
    "notify_log": {
        log: LogMessage[]
    },
    "notify_log_add": {
        event: LogMessage
    }
}