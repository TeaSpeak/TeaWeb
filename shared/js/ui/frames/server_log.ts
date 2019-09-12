namespace log {
    export namespace server {
        export enum Type {
            CONNECTION_BEGIN = "connection_begin",
            CONNECTION_HOSTNAME_RESOLVE = "connection_hostname_resolve",
            CONNECTION_HOSTNAME_RESOLVE_ERROR = "connection_hostname_resolve_error",
            CONNECTION_HOSTNAME_RESOLVED = "connection_hostname_resolved",
            CONNECTION_LOGIN = "connection_login",
            CONNECTION_CONNECTED = "connection_connected",
            CONNECTION_FAILED = "connection_failed",

            DISCONNECTED = "disconnected",

            CONNECTION_VOICE_SETUP_FAILED = "connection_voice_setup_failed",
            CONNECTION_COMMAND_ERROR = "connection_command_error",

            GLOBAL_MESSAGE = "global_message",

            SERVER_WELCOME_MESSAGE = "server_welcome_message",
            SERVER_HOST_MESSAGE = "server_host_message",
            SERVER_HOST_MESSAGE_DISCONNECT = "server_host_message_disconnect",

            SERVER_CLOSED = "server_closed",
            SERVER_BANNED = "server_banned",
            SERVER_REQUIRES_PASSWORD = "server_requires_password",

            CLIENT_VIEW_ENTER = "client_view_enter",
            CLIENT_VIEW_LEAVE = "client_view_leave",
            CLIENT_VIEW_MOVE = "client_view_move",

            CLIENT_NICKNAME_CHANGED = "client_nickname_changed",
            CLIENT_NICKNAME_CHANGE_FAILED = "client_nickname_change_failed",

            CLIENT_SERVER_GROUP_ADD = "client_server_group_add",
            CLIENT_SERVER_GROUP_REMOVE = "client_server_group_remove",
            CLIENT_CHANNEL_GROUP_CHANGE = "client_channel_group_change",

            CHANNEL_CREATE = "channel_create",
            CHANNEL_DELETE = "channel_delete",

            ERROR_CUSTOM = "error_custom",
            ERROR_PERMISSION = "error_permission",

            RECONNECT_SCHEDULED = "reconnect_scheduled",
            RECONNECT_EXECUTE = "reconnect_execute",
            RECONNECT_CANCELED = "reconnect_canceled"
        }

        export namespace base {
            export type Client = {
                client_unique_id: string;
                client_name: string;
                client_id: number;
            }
            export type Channel = {
                channel_id: number;
                channel_name: string;
            }
            export type Server = {
                server_name: string;
                server_unique_id: string;
            }
            export type ServerAddress = {
                server_hostname: string;
                server_port: number;
            }
        }

        export namespace event {
            export type GlobalMessage = {
                sender: base.Client;
                message: string;
            }
            export type ConnectBegin = {
                address: base.ServerAddress;
                client_nickname: string;
            }
            export type ErrorCustom = {
                message: string;
            }

            export type ReconnectScheduled = {
                timeout: number;
            }

            export type ReconnectCanceled = { }
            export type ReconnectExecute = { }

            export type ErrorPermission = {
                permission: PermissionInfo;
            }

            export type WelcomeMessage = {
                message: string;
            }

            export type HostMessageDisconnect = {
                message: string;
            }

            //tr("You was moved by {3} from channel {1} to {2}") : tr("{0} was moved from channel {1} to {2} by {3}")
            //tr("You switched from channel {1} to {2}") : tr("{0} switched from channel {1} to {2}")
            //tr("You got kicked out of the channel {1} to channel {2} by {3}{4}") : tr("{0} got kicked from channel {1} to {2} by {3}{4}")
            export type ClientMove = {
                channel_from?: base.Channel;
                channel_from_own: boolean;

                channel_to?: base.Channel;
                channel_to_own: boolean;

                client: base.Client;
                client_own: boolean;

                invoker?: base.Client;

                message?: string;
                reason: ViewReasonId;
            }

            export type ClientEnter = {
                channel_from?: base.Channel;
                channel_to?: base.Channel;

                client: base.Client;
                invoker?: base.Client;

                message?: string;
                own_channel: boolean;

                reason: ViewReasonId;
                ban_time?: number;
            }

            export type ClientLeave = {
                channel_from?: base.Channel;
                channel_to?: base.Channel;

                client: base.Client;
                invoker?: base.Client;

                message?: string;
                own_channel: boolean;

                reason: ViewReasonId;
                ban_time?: number;
            }

            export type ChannelCreate = {
                creator: base.Client;
                channel: base.Channel;

                own_action: boolean;
            }

            export type ChannelDelete = {
                deleter: base.Client;
                channel: base.Channel;

                own_action: boolean;
            }

            export type ConnectionConnected = {
                own_client: base.Client;
            }
            export type ConnectionFailed = {};
            export type ConnectionLogin = {}
            export type ConnectionHostnameResolve = {};
            export type ConnectionHostnameResolved = {
                address: base.ServerAddress;
            }
            export type ConnectionHostnameResolveError = {
                message: string;
            }

            export type ConnectionVoiceSetupFailed = {
                reason: string;
                reconnect_delay: number; /* if less or equal to 0 reconnect is prohibited */
            }

            export type ConnectionCommandError = {
                error: any;
            }

            export type ClientNicknameChanged = {
                own_client: boolean;

                client: base.Client;

                old_name: string;
                new_name: string;
            }

            export type ClientNicknameChangeFailed = {
                reason: string;
            }

            export type ServerClosed = {
                message: string;
            }

            export type ServerRequiresPassword = {}

            export type ServerBanned = {
                message: string;
                time: number;

                invoker: base.Client;
            }
        }

        export type LogMessage = {
            type: Type;
            timestamp: number;
            data: any;
        }

        export interface TypeInfo {
            "connection_begin" : event.ConnectBegin;
            "global_message": event.GlobalMessage;

            "error_custom": event.ErrorCustom;
            "error_permission": event.ErrorPermission;

            "connection_hostname_resolved": event.ConnectionHostnameResolved;
            "connection_hostname_resolve": event.ConnectionHostnameResolve;
            "connection_hostname_resolve_error": event.ConnectionHostnameResolveError;
            "connection_failed": event.ConnectionFailed;
            "connection_login": event.ConnectionLogin;
            "connection_connected": event.ConnectionConnected;
            "connection_voice_setup_failed": event.ConnectionVoiceSetupFailed;
            "connection_command_error": event.ConnectionCommandError;

            "reconnect_scheduled": event.ReconnectScheduled;
            "reconnect_canceled": event.ReconnectCanceled;
            "reconnect_execute": event.ReconnectExecute;

            "server_welcome_message": event.WelcomeMessage;
            "server_host_message": event.WelcomeMessage;
            "server_host_message_disconnect": event.HostMessageDisconnect;

            "server_closed": event.ServerClosed;
            "server_requires_password": event.ServerRequiresPassword;
            "server_banned": event.ServerBanned;

            "client_view_enter": event.ClientEnter;
            "client_view_move": event.ClientMove;
            "client_view_leave": event.ClientLeave;

            "client_nickname_change_failed": event.ClientNicknameChangeFailed,
            "client_nickname_changed": event.ClientNicknameChanged,

            "channel_create": event.ChannelCreate;
            "channel_delete": event.ChannelDelete;

            "disconnected": any;
        }

        export type MessageBuilderOptions = {};
        export type MessageBuilder<T extends keyof server.TypeInfo> = (data: TypeInfo[T], options: MessageBuilderOptions) => JQuery[] | undefined;

        export const MessageBuilders: {[key: string]: MessageBuilder<any>} = {
            "error_custom": (data: event.ErrorCustom, options) => {
                return [$.spawn("div").addClass("log-error").text(data.message)]
            }
        };
    }

    export class ServerLog {
        private readonly handle: ConnectionHandler;
        private history_length: number = 100;

        private _log: server.LogMessage[] = [];
        private _html_tag: JQuery;
        private _log_container: JQuery;
        private auto_follow: boolean; /* automatic scroll to bottom */
        private _ignore_event: number; /* after auto scroll we've triggered the scroll event. We want to prevent this so we capture the next event */

        constructor(handle: ConnectionHandler) {
            this.handle = handle;
            this.auto_follow = true;

            this._html_tag = $.spawn("div").addClass("container-log");
            this._log_container = $.spawn("div").addClass("container-messages");
            this._log_container.appendTo(this._html_tag);

            this._html_tag.on('scroll', event => {
                if(Date.now() - this._ignore_event < 100) {
                    this._ignore_event = 0;
                    return;
                }

                this.auto_follow = (this._html_tag[0].scrollTop + this._html_tag[0].clientHeight + this._html_tag[0].clientHeight * .125) > this._html_tag[0].scrollHeight;
            });
        }

        log<T extends keyof server.TypeInfo>(type: T, data: server.TypeInfo[T]) {
            const event = {
                data: data,
                timestamp: Date.now(),
                type: type as any
            };

            this._log.push(event);
            while(this._log.length > this.history_length)
                this._log.pop_front();

            this.append_log(event);
        }

        html_tag() : JQuery {
            return this._html_tag;
        }

        destroy() {
            this._html_tag && this._html_tag.remove();
            this._html_tag = undefined;
            this._log_container = undefined;

            this._log = undefined;
        }

        private _scroll_task: number;

        private append_log(message: server.LogMessage) {
            let container = $.spawn("div").addClass("log-message");

            /* build timestamp */
            {
                const num = number => ('00' + number).substr(-2);
                const date = new Date(message.timestamp);
                $.spawn("div")
                    .addClass("timestamp")
                    .text("<" + num(date.getHours()) + ":" + num(date.getMinutes()) + ":" + num(date.getSeconds()) + ">")
                    .appendTo(container);
            }

            /* build message data */
            {
                const builder = server.MessageBuilders[message.type];
                if(!builder) {
                    MessageHelper.formatMessage(tr("missing log message builder {0}!"), message.type).forEach(e => e.addClass("log-error").appendTo(container));
                } else {
                    const elements = builder(message.data, {});
                    if(!elements || elements.length == 0)
                        return; /* discard message */
                    container.append(...elements);
                }
            }
            this._ignore_event = Date.now();
            this._log_container.append(container);

            /* max history messages! */
            const messages = this._log_container.children();
            let index = 0;
            while(messages.length - index > this.history_length)
                index++;
            const hide_elements = messages.filter(idx => idx < index);
            hide_elements.hide(250, () => hide_elements.remove());

            if(this.auto_follow) {
                clearTimeout(this._scroll_task);

                /* do not enforce a recalculate style here */
                this._scroll_task = setTimeout(() => {
                    this._html_tag.scrollTop(this._html_tag[0].scrollHeight);
                    this._scroll_task = 0;
                }, 5) as any;
            }
        }
    }
}

/* impl of the parsers */
namespace log {
    export namespace server {
        namespace impl {
            const client_tag = (client: base.Client, braces?: boolean) => htmltags.generate_client_object({
                client_unique_id: client.client_unique_id,
                client_id: client.client_id,
                client_name: client.client_name,
                add_braces: braces
            });
            const channel_tag = (channel: base.Channel, braces?: boolean) => htmltags.generate_channel_object({
                channel_display_name: channel.channel_name,
                channel_name: channel.channel_name,
                channel_id: channel.channel_id,
                add_braces: braces
            });

            MessageBuilders["connection_begin"] = (data: event.ConnectBegin, options) => {
                return MessageHelper.formatMessage(tr("Connecting to {0}{1}"), data.address.server_hostname, data.address.server_port == 9987 ? "" : (":" + data.address.server_port));
            };

            MessageBuilders["connection_hostname_resolve"] = (data: event.ConnectionHostnameResolve, options) => MessageHelper.formatMessage(tr("Resolving hostname"));
            MessageBuilders["connection_hostname_resolved"] = (data: event.ConnectionHostnameResolved, options) => MessageHelper.formatMessage(tr("Hostname resolved successfully to {0}:{1}"), data.address.server_hostname, data.address.server_port);
            MessageBuilders["connection_hostname_resolve_error"] = (data: event.ConnectionHostnameResolveError, options) => MessageHelper.formatMessage(tr("Failed to resolve hostname. Connecting to given hostname. Error: {0}"), data.message);

            MessageBuilders["connection_login"] = (data: event.ConnectionLogin, options) => MessageHelper.formatMessage(tr("Logging in..."));
            MessageBuilders["connection_failed"] = (data: event.ConnectionFailed, options) => MessageHelper.formatMessage(tr("Connect failed."));
            MessageBuilders["connection_connected"] = (data: event.ConnectionConnected, options) => MessageHelper.formatMessage(tr("Connected as {0}"), client_tag(data.own_client, true));

            MessageBuilders["connection_voice_setup_failed"] = (data: event.ConnectionVoiceSetupFailed, options) => {
                return MessageHelper.formatMessage(tr("Failed to setup voice bridge: {0}. Allow reconnect: {1}"), data.reason, data.reconnect_delay > 0 ? tr("yes") : tr("no"));
            };

            MessageBuilders["error_permission"] = (data: event.ErrorPermission, options) => {
                return MessageHelper.formatMessage(tr("Insufficient client permissions. Failed on permission {0}"), data.permission ? data.permission.name : "unknown").map(e => e.addClass("log-error"));
            };

            MessageBuilders["client_view_enter"] = (data: event.ClientEnter, options) => {
                if(data.reason == ViewReasonId.VREASON_SYSTEM) {
                    return undefined;
                } if(data.reason == ViewReasonId.VREASON_USER_ACTION) {
                    /* client appeared */
                    if(data.channel_from) {
                        return MessageHelper.formatMessage(data.own_channel ? tr("{0} appeared from {1} to your {2}") : tr("{0} appeared from {1} to {2}"), client_tag(data.client), channel_tag(data.channel_from), channel_tag(data.channel_to));
                    } else {
                        return MessageHelper.formatMessage(data.own_channel ? tr("{0} connected to your channel {1}") : tr("{0} connected to channel {1}"), client_tag(data.client), channel_tag(data.channel_to));
                    }
                } else if(data.reason == ViewReasonId.VREASON_MOVED) {
                    if(data.channel_from) {
                        return MessageHelper.formatMessage(data.own_channel ? tr("{0} appeared from {1} to your channel {2}, moved by {3}") : tr("{0} appeared from {1} to {2}, moved by {3}"),
                            client_tag(data.client),
                            channel_tag(data.channel_from),
                            channel_tag(data.channel_to),
                            client_tag(data.invoker)
                        );
                    } else {
                        return MessageHelper.formatMessage(data.own_channel ? tr("{0} appeared to your channel {1}, moved by {2}") : tr("{0} appeared to {1}, moved by {2}"),
                            client_tag(data.client),
                            channel_tag(data.channel_to),
                            client_tag(data.invoker)
                        );
                    }
                } else if(data.reason == ViewReasonId.VREASON_CHANNEL_KICK) {
                    if(data.channel_from) {
                        return MessageHelper.formatMessage(data.own_channel ? tr("{0} appeared from {1} to your channel {2}, kicked by {3}{4}") : tr("{0} appeared from {1} to {2}, kicked by {3}{4}"),
                            client_tag(data.client),
                            channel_tag(data.channel_from),
                            channel_tag(data.channel_to),
                            client_tag(data.invoker),
                            data.message ? (" (" + data.message + ")") : ""
                        );
                    } else {
                        return MessageHelper.formatMessage(data.own_channel ? tr("{0} appeared to your channel {1}, kicked by {2}{3}") : tr("{0} appeared to {1}, kicked by {2}{3}"),
                            client_tag(data.client),
                            channel_tag(data.channel_to),
                            client_tag(data.invoker),
                            data.message ? (" (" + data.message + ")") : ""
                        );
                    }
                }
                return [$.spawn("div").addClass("log-error").text("Invalid view enter reason id (" + data.message + ")")];
            };

            MessageBuilders["client_view_move"] = (data: event.ClientMove, options) => {
                if(data.reason == ViewReasonId.VREASON_MOVED) {
                    return MessageHelper.formatMessage(data.client_own ? tr("You was moved by {3} from channel {1} to {2}") : tr("{0} was moved from channel {1} to {2} by {3}"),
                        client_tag(data.client),
                        channel_tag(data.channel_from),
                        channel_tag(data.channel_to),
                        client_tag(data.invoker)
                    );
                } else if(data.reason == ViewReasonId.VREASON_USER_ACTION) {
                    return MessageHelper.formatMessage(data.client_own ? tr("You switched from channel {1} to {2}") : tr("{0} switched from channel {1} to {2}"),
                        client_tag(data.client),
                        channel_tag(data.channel_from),
                        channel_tag(data.channel_to)
                    );
                } else if(data.reason == ViewReasonId.VREASON_CHANNEL_KICK) {
                    return MessageHelper.formatMessage(data.client_own ? tr("You got kicked out of the channel {1} to channel {2} by {3}{4}") : tr("{0} got kicked from channel {1} to {2} by {3}{4}"),
                        client_tag(data.client),
                        channel_tag(data.channel_from),
                        channel_tag(data.channel_to),
                        client_tag(data.invoker),
                        data.message ? (" (" + data.message + ")") : ""
                    );
                }
                return [$.spawn("div").addClass("log-error").text("Invalid view move reason id (" + data.reason + ")")];
            };

            MessageBuilders["client_view_leave"] = (data: event.ClientLeave, options) => {
                if(data.reason == ViewReasonId.VREASON_USER_ACTION) {
                    return MessageHelper.formatMessage(data.own_channel ? tr("{0} disappeared from your channel {1} to {2}") : tr("{0} disappeared from {1} to {2}"), client_tag(data.client), channel_tag(data.channel_from), channel_tag(data.channel_to));
                } else if(data.reason == ViewReasonId.VREASON_SERVER_LEFT) {
                    return MessageHelper.formatMessage(tr("{0} left the server{1}"), client_tag(data.client), data.message ? (" (" + data.message + ")") : "");
                } else if(data.reason == ViewReasonId.VREASON_SERVER_KICK) {
                    return MessageHelper.formatMessage(tr("{0} was kicked from the server by {1}.{2}"), client_tag(data.client), client_tag(data.invoker), data.message ? (" (" + data.message + ")") : "");
                } else if(data.reason == ViewReasonId.VREASON_CHANNEL_KICK) {
                    return MessageHelper.formatMessage(data.own_channel ? tr("{0} was kicked from your channel by {2}.{3}") : tr("{0} was kicked from channel {1} by {2}.{3}"),
                        client_tag(data.client),
                        channel_tag(data.channel_from),
                        client_tag(data.invoker),
                        data.message ? (" (" + data.message + ")") : ""
                    );
                } else if(data.reason == ViewReasonId.VREASON_BAN) {
                    let duration = "permanently";
                    if(data.ban_time)
                        duration = "for " + formatDate(data.ban_time);
                    return MessageHelper.formatMessage(tr("{0} was banned {1} by {2}.{3}"),
                        client_tag(data.client),
                        duration,
                        client_tag(data.invoker),
                        data.message ? (" (" + data.message + ")") : ""
                    );
                } else if(data.reason == ViewReasonId.VREASON_TIMEOUT) {
                    return MessageHelper.formatMessage(tr("{0} timed out{1}"), client_tag(data.client), data.message ? (" (" + data.message + ")") : "");
                }
                return [$.spawn("div").addClass("log-error").text("Invalid view leave reason id (" + data.message + ")")];
            };

            MessageBuilders["server_welcome_message"] = (data: event.WelcomeMessage, options) => {
                return MessageHelper.bbcode_chat("[color=green]" + data.message + "[/color]");
            };

            MessageBuilders["server_host_message"] = (data: event.WelcomeMessage, options) => {
                return MessageHelper.bbcode_chat("[color=green]" + data.message + "[/color]");
            };

            MessageBuilders["client_nickname_changed"] = (data: event.ClientNicknameChanged, options) => {
                if(data.own_client) {
                    return MessageHelper.formatMessage(tr("Nickname successfully changed."));
                } else {
                    return MessageHelper.formatMessage(tr("{0} changed his nickname from \"{1}\" to \"{2}\""), client_tag(data.client), data.old_name, data.new_name);
                }
            };

            MessageBuilders["global_message"] = (data: event.GlobalMessage, options) => {
                return []; /* we do not show global messages within log */
            };

            MessageBuilders["disconnected"] = () => MessageHelper.formatMessage(tr("Disconnected from server"));
        }
    }
}