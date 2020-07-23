import * as log from "tc-shared/log";
import {LogCategory} from "tc-shared/log";
import {AbstractServerConnection, CommandOptions, ServerCommand} from "tc-shared/connection/ConnectionBase";
import {Sound} from "tc-shared/sound/Sounds";
import {CommandResult, ErrorID} from "tc-shared/connection/ServerConnectionDeclaration";
import {createErrorModal, createInfoModal, createInputModal, createModal} from "tc-shared/ui/elements/Modal";
import {
    ClientConnectionInfo,
    ClientEntry,
    ClientType,
    LocalClientEntry,
    MusicClientEntry,
    SongInfo
} from "tc-shared/ui/client";
import {ChannelEntry} from "tc-shared/ui/channel";
import {ConnectionHandler, ConnectionState, DisconnectReason, ViewReasonId} from "tc-shared/ConnectionHandler";
import {formatMessage} from "tc-shared/ui/frames/chat";
import {server_connections} from "tc-shared/ui/frames/connection_handlers";
import {spawnPoke} from "tc-shared/ui/modal/ModalPoke";
import {AbstractCommandHandler, AbstractCommandHandlerBoss} from "tc-shared/connection/AbstractCommandHandler";
import {batch_updates, BatchUpdateType, flush_batched_updates} from "tc-shared/ui/react-elements/ReactComponentBase";
import {OutOfViewClient} from "tc-shared/ui/frames/side/PrivateConversationManager";
import {renderBBCodeAsJQuery} from "tc-shared/text/bbcode";
import {tr} from "tc-shared/i18n/localize";
import {EventClient, EventType} from "tc-shared/ui/frames/log/Definitions";

export class ServerConnectionCommandBoss extends AbstractCommandHandlerBoss {
    constructor(connection: AbstractServerConnection) {
        super(connection);
    }
}

export class ConnectionCommandHandler extends AbstractCommandHandler {
    readonly connection: AbstractServerConnection;
    readonly connection_handler: ConnectionHandler;

    constructor(connection: AbstractServerConnection) {
        super(connection);
        this.connection_handler = connection.client;

        this["error"] = this.handleCommandResult;
        this["channellist"] = this.handleCommandChannelList;
        this["channellistfinished"] = this.handleCommandChannelListFinished;
        this["notifychannelcreated"] = this.handleCommandChannelCreate;
        this["notifychanneldeleted"] = this.handleCommandChannelDelete;
        this["notifychannelhide"] = this.handleCommandChannelHide;
        this["notifychannelshow"] = this.handleCommandChannelShow;

        this["notifyserverconnectioninfo"] = this.handleNotifyServerConnectionInfo;
        this["notifyconnectioninfo"] = this.handleNotifyConnectionInfo;

        this["notifycliententerview"] = this.handleCommandClientEnterView;
        this["notifyclientleftview"] = this.handleCommandClientLeftView;
        this["notifyclientmoved"] = this.handleNotifyClientMoved;
        this["initserver"] = this.handleCommandServerInit;
        this["notifychannelmoved"] = this.handleNotifyChannelMoved;
        this["notifychanneledited"] = this.handleNotifyChannelEdited;
        this["notifytextmessage"] = this.handleNotifyTextMessage;
        this["notifyclientchatcomposing"] = this.notifyClientChatComposing;
        this["notifyclientchatclosed"] = this.handleNotifyClientChatClosed;
        this["notifyclientupdated"] = this.handleNotifyClientUpdated;
        this["notifyserveredited"] = this.handleNotifyServerEdited;
        this["notifyserverupdated"] = this.handleNotifyServerUpdated;

        this["notifyclientpoke"] = this.handleNotifyClientPoke;

        this["notifymusicplayerinfo"] = this.handleNotifyMusicPlayerInfo;

        this["notifyservergroupclientadded"] = this.handleNotifyServerGroupClientAdd;
        this["notifyservergroupclientdeleted"] = this.handleNotifyServerGroupClientRemove;
        this["notifyclientchannelgroupchanged"] = this.handleNotifyClientChannelGroupChanged;

        this["notifychannelsubscribed"] = this.handleNotifyChannelSubscribed;
        this["notifychannelunsubscribed"] = this.handleNotifyChannelUnsubscribed;

        //this["notifyconversationhistory"] = this.handleNotifyConversationHistory;
        //this["notifyconversationmessagedelete"] = this.handleNotifyConversationMessageDelete;

        this["notifymusicstatusupdate"] = this.handleNotifyMusicStatusUpdate;
        this["notifymusicplayersongchange"] = this.handleMusicPlayerSongChange;

        this["notifyplaylistsongadd"] = this.handleNotifyPlaylistSongAdd;
        this["notifyplaylistsongremove"] = this.handleNotifyPlaylistSongRemove;
        this["notifyplaylistsongreorder"] = this.handleNotifyPlaylistSongReorder;
        this["notifyplaylistsongloaded"] = this.handleNotifyPlaylistSongLoaded;
    }

    private loggable_invoker(unique_id, client_id, name) : EventClient | undefined {
        const id = parseInt(client_id);
        if(typeof(client_id) === "undefined" || Number.isNaN(id))
            return undefined;

        if(id == 0)
            return {
                client_id: 0,
                client_unique_id: this.connection_handler.channelTree.server.properties.virtualserver_unique_identifier,
                client_name: this.connection_handler.channelTree.server.properties.virtualserver_name,
            };

        return {
            client_unique_id: unique_id,
            client_name: name,
            client_id: client_id
        };
    }

    proxy_command_promise(promise: Promise<CommandResult>, options: CommandOptions) {
        if(!options.process_result)
            return promise;

        return promise.catch(ex => {
            if(options.process_result) {
                if(ex instanceof CommandResult) {
                    let res = ex;
                    if(!res.success) {
                        if(res.id == ErrorID.PERMISSION_ERROR) { //Permission error
                            const permission = this.connection_handler.permissions.resolveInfo(res.json["failed_permid"] as number);
                            res.message = tr("Insufficient client permissions. Failed on permission ") + (permission ? permission.name : "unknown");
                            this.connection_handler.log.log(EventType.ERROR_PERMISSION, {
                                permission: this.connection_handler.permissions.resolveInfo(res.json["failed_permid"] as number)
                            });
                            this.connection_handler.sound.play(Sound.ERROR_INSUFFICIENT_PERMISSIONS);
                        } else if(res.id != ErrorID.EMPTY_RESULT) {
                            this.connection_handler.log.log(EventType.ERROR_CUSTOM, {
                                message: res.extra_message.length == 0 ? res.message : res.extra_message
                            });
                        }
                    }
                } else if(typeof(ex) === "string") {
                    this.connection_handler.log.log(EventType.CONNECTION_COMMAND_ERROR, {error: ex});
                } else {
                    log.error(LogCategory.NETWORKING, tr("Invalid promise result type: %s. Result: %o"), typeof (ex), ex);
                }
            }

            return Promise.reject(ex);
        });
    }

    handle_command(command: ServerCommand) : boolean {
        if(this[command.command]) {
            /* batch all updates the command applies to the channel tree */
            batch_updates(BatchUpdateType.CHANNEL_TREE);
            try {
                this[command.command](command.arguments);
            } finally {
                flush_batched_updates(BatchUpdateType.CHANNEL_TREE);
            }
            return true;
        }

        return false;
    }

    set_handler(command: string, handler: any) {
        this[command] = handler;
    }

    unset_handler(command: string, handler?: any) {
        if(handler && this[command] != handler) return;
        this[command] = undefined;
    }

    handleCommandResult(json) {
        let code : string = json[0]["return_code"];
        if(!code || code.length == 0) {
            log.warn(LogCategory.NETWORKING, tr("Invalid return code! (%o)"), json);
            return;
        }
        let retListeners = this.connection["_retListener"];

        for(let e of retListeners) {
            if(e.code != code) continue;
            retListeners.remove(e);
            let result = new CommandResult(json);
            if(result.success)
                e.resolve(result);
            else
                e.reject(result);
            break;
        }
    }

    handleCommandServerInit(json){
        //We could setup the voice channel
        if(this.connection.support_voice()) {
            log.debug(LogCategory.NETWORKING, tr("Setting up voice"));
        } else {
            log.debug(LogCategory.NETWORKING, tr("Skipping voice setup (No voice bridge available)"));
        }


        json = json[0]; //Only one bulk

        this.connection.client.initializeLocalClient(parseInt(json["aclid"]), json["acn"]);

        let updates: {
            key: string,
            value: string
        }[] = [];
        for(let key in json) {
            if(key === "aclid") continue;
            if(key === "acn") continue;

            updates.push({key: key, value: json[key]});
        }
        this.connection.client.channelTree.server.updateVariables(false, ...updates);

        const properties = this.connection.client.channelTree.server.properties;
        /* host message */
        if(properties.virtualserver_hostmessage_mode > 0) {
            if(properties.virtualserver_hostmessage_mode == 1) {
                /* show in log */
                if(properties.virtualserver_hostmessage)
                    this.connection_handler.log.log(EventType.SERVER_HOST_MESSAGE, {
                        message: properties.virtualserver_hostmessage
                    });
            } else {
                /* create modal/create modal and quit */
                if(properties.virtualserver_hostmessage || properties.virtualserver_hostmessage_mode == 3)
                    createModal({
                        header: tr("Host message"),
                        body: renderBBCodeAsJQuery(properties.virtualserver_hostmessage, { convertSingleUrls: false }),
                        footer: undefined
                    }).open();

                if(properties.virtualserver_hostmessage_mode == 3) {
                    /* first let the client initialize his stuff */
                    setTimeout(() => {
                        this.connection_handler.log.log(EventType.SERVER_HOST_MESSAGE_DISCONNECT, {
                            message: properties.virtualserver_welcomemessage
                        });

                        this.connection.disconnect("host message disconnect");
                        this.connection_handler.handleDisconnect(DisconnectReason.SERVER_HOSTMESSAGE);
                        this.connection_handler.sound.play(Sound.CONNECTION_DISCONNECTED);
                    }, 100);
                }
            }
        }

        /* welcome message */
        if(properties.virtualserver_welcomemessage) {
            this.connection_handler.log.log(EventType.SERVER_WELCOME_MESSAGE, {
                message: properties.virtualserver_welcomemessage
            });
        }

        /* priviledge key */
        if(properties.virtualserver_ask_for_privilegekey) {
            createInputModal(tr("Use a privilege key"), tr("This is a newly created server for which administrator privileges have not yet been claimed.<br>Please enter the \"privilege key\" that was automatically generated when this server was created to gain administrator permissions."), message => message.length > 0, result => {
                if(!result) return;
                const scon = server_connections.active_connection();

                if(scon.serverConnection.connected)
                    scon.serverConnection.send_command("tokenuse", {
                        token: result
                    }).then(() => {
                        createInfoModal(tr("Use privilege key"), tr("Privilege key successfully used!")).open();
                    }).catch(error => {
                        createErrorModal(tr("Use privilege key"), formatMessage(tr("Failed to use privilege key: {}"), error instanceof CommandResult ? error.message : error)).open();
                    });
            }, { field_placeholder: tr("Enter Privilege Key") }).open();
        }

        this.connection.updateConnectionState(ConnectionState.CONNECTED);
    }

    handleNotifyServerConnectionInfo(json) {
        json = json[0];

        /* everything is a number, so lets parse it */
        for(const key of Object.keys(json))
            json[key] = parseFloat(json[key]);

        this.connection_handler.channelTree.server.set_connection_info(json);
    }

    handleNotifyConnectionInfo(json) {
        json = json[0];

        const object = new ClientConnectionInfo();
        /* everything is a number (except ip), so lets parse it */
        for(const key of Object.keys(json)) {
            if(key === "connection_client_ip")
                object[key] = json[key];
            else
                object[key] = parseFloat(json[key]);
        }

        const client = this.connection_handler.channelTree.findClient(parseInt(json["clid"]));
        if(!client) {
            log.warn(LogCategory.NETWORKING, tr("Received client connection info for unknown client (%o)"), json["clid"]);
            return;
        }

        client.set_connection_info(object);
    }

    private createChannelFromJson(json, ignoreOrder: boolean = false) {
        let tree = this.connection.client.channelTree;

        let channel = new ChannelEntry(parseInt(json["cid"]), json["channel_name"]);
        let parent, previous;
        if(json["channel_order"] !== "0") {
            previous = tree.findChannel(json["channel_order"]);
            if(!previous && json["channel_order"] != 0) {
                if(!ignoreOrder) {
                    log.error(LogCategory.NETWORKING, tr("Invalid channel order id!"));
                    return;
                }
            }
        }

        parent = tree.findChannel(json["cpid"]);
        if(!parent && json["cpid"] != 0) {
            log.error(LogCategory.NETWORKING, tr("Invalid channel parent"));
            return;
        }

        tree.insertChannel(channel, previous, parent);
        if(ignoreOrder) {
            for(let ch of tree.channels) {
                if(ch.properties.channel_order == channel.channelId) {
                    tree.moveChannel(ch, channel, channel.parent); //Corrent the order :)
                }
            }
        }

        let updates: {
            key: string,
            value: string
        }[] = [];
        for(let key in json) {
            if(key === "cid") continue;
            if(key === "cpid") continue;
            if(key === "invokerid") continue;
            if(key === "invokername") continue;
            if(key === "invokeruid") continue;
            if(key === "reasonid") continue;

            updates.push({key: key, value: json[key]});
        }
        channel.updateVariables(...updates);
    }

    private batch_update_finished_timeout;
    handleCommandChannelList(json) {
        if(this.batch_update_finished_timeout) {
            clearTimeout(this.batch_update_finished_timeout);
            this.batch_update_finished_timeout = 0;
            /* batch update is still active */
        } else {
            batch_updates(BatchUpdateType.CHANNEL_TREE);
        }

        for(let index = 0; index < json.length; index++)
            this.createChannelFromJson(json[index], true);

        this.batch_update_finished_timeout = setTimeout(() => {
        }, 500);
    }


    handleCommandChannelListFinished() {
        this.connection.client.channelTree.events.fire_async("notify_channel_list_received");

        if(this.batch_update_finished_timeout) {
            clearTimeout(this.batch_update_finished_timeout);
            this.batch_update_finished_timeout = 0;
            flush_batched_updates(BatchUpdateType.CHANNEL_TREE);
        }
    }

    handleCommandChannelCreate(json) {
        this.createChannelFromJson(json[0]);
    }

    handleCommandChannelShow(json) {
        this.createChannelFromJson(json[0]); //TODO may chat?
    }

    handleCommandChannelDelete(json) {
        let tree = this.connection.client.channelTree;
        const conversations = this.connection.client.side_bar.channel_conversations();

        log.info(LogCategory.NETWORKING, tr("Got %d channel deletions"), json.length);
        for(let index = 0; index < json.length; index++) {
            conversations.destroyConversation(parseInt(json[index]["cid"]));
            let channel = tree.findChannel(json[index]["cid"]);
            if(!channel) {
                log.error(LogCategory.NETWORKING, tr("Invalid channel onDelete (Unknown channel)"));
                continue;
            }
            tree.deleteChannel(channel);
        }
    }

    handleCommandChannelHide(json) {
        let tree = this.connection.client.channelTree;
        const conversations = this.connection.client.side_bar.channel_conversations();

        log.info(LogCategory.NETWORKING, tr("Got %d channel hides"), json.length);
        for(let index = 0; index < json.length; index++) {
            conversations.destroyConversation(parseInt(json[index]["cid"]));
            let channel = tree.findChannel(json[index]["cid"]);
            if(!channel) {
                log.error(LogCategory.NETWORKING, tr("Invalid channel on hide (Unknown channel)"));
                continue;
            }
            tree.deleteChannel(channel);
        }
    }

    handleCommandClientEnterView(json) {
        let tree = this.connection.client.channelTree;

        let client: ClientEntry;
        let channel = undefined;
        let old_channel = undefined;
        let reason_id, reason_msg;

        let invokerid, invokername, invokeruid;

        for(const entry of json) {
            /* attempt to update properties if given */
            channel =  typeof(entry["ctid"]) !== "undefined" ? tree.findChannel(parseInt(entry["ctid"])) : channel;
            old_channel = typeof(entry["cfid"]) !== "undefined" ? tree.findChannel(parseInt(entry["cfid"])) : old_channel;
            reason_id = typeof(entry["reasonid"]) !== "undefined" ? entry["reasonid"] : reason_id;
            reason_msg = typeof(entry["reason_msg"]) !== "undefined" ? entry["reason_msg"] : reason_msg;

            invokerid = typeof(entry["invokerid"]) !== "undefined" ? parseInt(entry["invokerid"]) : invokerid;
            invokername = typeof(entry["invokername"]) !== "undefined" ? entry["invokername"] : invokername;
            invokeruid = typeof(entry["invokeruid"]) !== "undefined" ? entry["invokeruid"] : invokeruid;

            client = tree.findClient(parseInt(entry["clid"]));

            if(!client) {
                if(parseInt(entry["client_type_exact"]) == ClientType.CLIENT_MUSIC) {
                    client = new MusicClientEntry(parseInt(entry["clid"]), entry["client_nickname"]);
                } else {
                    client = new ClientEntry(parseInt(entry["clid"]), entry["client_nickname"]);
                }

                /* TODO: Apply all other properties here as well and than register him */
                client.properties.client_unique_identifier = entry["client_unique_identifier"];
                client.properties.client_type = parseInt(entry["client_type"]);
                client = tree.insertClient(client, channel, { reason: reason_id, isServerJoin: parseInt(entry["cfid"]) === 0 });
            } else {
                tree.moveClient(client, channel);
            }

            if(this.connection_handler.areQueriesShown() || client.properties.client_type != ClientType.CLIENT_QUERY) {
                const own_channel = this.connection.client.getClient().currentChannel();
                this.connection_handler.log.log(channel == own_channel ? EventType.CLIENT_VIEW_ENTER_OWN_CHANNEL : EventType.CLIENT_VIEW_ENTER, {
                    channel_from: old_channel ? old_channel.log_data() : undefined,
                    channel_to: channel ? channel.log_data() : undefined,
                    client: client.log_data(),
                    invoker: this.loggable_invoker(invokeruid, invokerid, invokername),
                    message:reason_msg,
                    reason: parseInt(reason_id),
                });

                if(reason_id == ViewReasonId.VREASON_USER_ACTION) {
                    if(own_channel == channel)
                        if(old_channel)
                            this.connection_handler.sound.play(Sound.USER_ENTERED);
                        else
                            this.connection_handler.sound.play(Sound.USER_ENTERED_CONNECT);
                } else if(reason_id == ViewReasonId.VREASON_MOVED) {
                    if(own_channel == channel)
                        this.connection_handler.sound.play(Sound.USER_ENTERED_MOVED);
                } else if(reason_id == ViewReasonId.VREASON_CHANNEL_KICK) {
                    if(own_channel == channel)
                        this.connection_handler.sound.play(Sound.USER_ENTERED_KICKED);
                } else if(reason_id == ViewReasonId.VREASON_SYSTEM) {

                } else {
                    console.warn(tr("Unknown reasonid for %o"), reason_id);
                }
            }

            let updates: {
                key: string,
                value: string
            }[] = [];

            for(let key in entry) {
                if(key == "cfid") continue;
                if(key == "ctid") continue;
                if(key === "invokerid") continue;
                if(key === "invokername") continue;
                if(key === "invokeruid") continue;
                if(key === "reasonid") continue;

                updates.push({key: key, value: entry[key]});
            }

            client.updateVariables(...updates);

            if(client instanceof LocalClientEntry) {
                client.initializeListener();
                this.connection_handler.update_voice_status();
                this.connection_handler.side_bar.info_frame().update_channel_talk();
                const conversations = this.connection.client.side_bar.channel_conversations();
                conversations.setSelectedConversation(client.currentChannel().channelId);
            }
        }
    }

    handleCommandClientLeftView(json) {
        let reason_id = -1;

        for(const entry of json) {
            reason_id = entry["reasonid"] || reason_id;
            let tree = this.connection.client.channelTree;
            let client = tree.findClient(entry["clid"]);
            if(!client) {
                log.error(LogCategory.NETWORKING, tr("Unknown client left!"));
                return 0;
            }
            if(client == this.connection.client.getClient()) {
                if(reason_id == ViewReasonId.VREASON_BAN) {
                    this.connection.client.handleDisconnect(DisconnectReason.CLIENT_BANNED, entry);
                } else if(reason_id == ViewReasonId.VREASON_SERVER_KICK) {
                    this.connection.client.handleDisconnect(DisconnectReason.CLIENT_KICKED, entry);
                } else if(reason_id == ViewReasonId.VREASON_SERVER_SHUTDOWN) {
                    this.connection.client.handleDisconnect(DisconnectReason.SERVER_CLOSED, entry);
                } else if(reason_id == ViewReasonId.VREASON_SERVER_STOPPED) {
                    this.connection.client.handleDisconnect(DisconnectReason.SERVER_CLOSED, entry);
                } else {
                    this.connection.client.handleDisconnect(DisconnectReason.UNKNOWN, entry);
                }
                this.connection_handler.side_bar.info_frame().update_channel_talk();
                return;
            }

            const targetChannelId = parseInt(entry["ctid"]);
            if(this.connection_handler.areQueriesShown() || client.properties.client_type != ClientType.CLIENT_QUERY) {
                const own_channel = this.connection.client.getClient().currentChannel();
                let channel_from = tree.findChannel(entry["cfid"]);
                let channel_to = tree.findChannel(targetChannelId);

                const is_own_channel = channel_from == own_channel;
                this.connection_handler.log.log(is_own_channel ? EventType.CLIENT_VIEW_LEAVE_OWN_CHANNEL : EventType.CLIENT_VIEW_LEAVE, {
                    channel_from: channel_from ? channel_from.log_data() : undefined,
                    channel_to: channel_to ? channel_to.log_data() : undefined,
                    client: client.log_data(),
                    invoker: this.loggable_invoker(entry["invokeruid"], entry["invokerid"], entry["invokername"]),
                    message: entry["reasonmsg"],
                    reason: parseInt(entry["reasonid"]),
                    ban_time: parseInt(entry["bantime"]),
                });

                if(is_own_channel) {
                    if(reason_id == ViewReasonId.VREASON_USER_ACTION) {
                        this.connection_handler.sound.play(Sound.USER_LEFT);
                    } else if(reason_id == ViewReasonId.VREASON_SERVER_LEFT) {
                        this.connection_handler.sound.play(Sound.USER_LEFT_DISCONNECT);
                    } else if(reason_id == ViewReasonId.VREASON_SERVER_KICK) {
                        this.connection_handler.sound.play(Sound.USER_LEFT_KICKED_SERVER);
                    } else if(reason_id == ViewReasonId.VREASON_CHANNEL_KICK) {
                        this.connection_handler.sound.play(Sound.USER_LEFT_KICKED_CHANNEL);
                    } else if(reason_id == ViewReasonId.VREASON_BAN) {
                        this.connection_handler.sound.play(Sound.USER_LEFT_BANNED);
                    } else if(reason_id == ViewReasonId.VREASON_TIMEOUT) {
                        this.connection_handler.sound.play(Sound.USER_LEFT_TIMEOUT);
                    } else if(reason_id == ViewReasonId.VREASON_MOVED) {
                        this.connection_handler.sound.play(Sound.USER_LEFT_MOVED);
                    } else {
                        log.error(LogCategory.NETWORKING, tr("Unknown client left reason %d!"), reason_id);
                    }
                }
            }

            tree.deleteClient(client, { reason: reason_id, message: entry["reasonmsg"], serverLeave: targetChannelId === 0 });
        }
    }

    handleNotifyClientMoved(json) {
        json = json[0]; //Only one bulk
        let tree = this.connection.client.channelTree;
        let client = tree.findClient(json["clid"]);
        let self = client instanceof LocalClientEntry;

        let channel_to = tree.findChannel(parseInt(json["ctid"]));
        let channel_from = tree.findChannel(parseInt(json["cfid"]));

        if(!client) {
            log.error(LogCategory.NETWORKING, tr("Unknown client move (Client)!"));
            return 0;
        }

        if(!channel_to) {
            log.error(LogCategory.NETWORKING, tr("Unknown client move (Channel to)!"));
            return 0;
        }

        if(!self) {
            if(!channel_from) {
                log.error(LogCategory.NETWORKING, tr("Unknown client move (Channel from)!"));
                channel_from = client.currentChannel();
            } else if(channel_from != client.currentChannel()) {
                log.error(LogCategory.NETWORKING,
                    tr("Client move from invalid source channel! Local client registered in channel %d but server send %d."),
                    client.currentChannel().channelId, channel_from.channelId
                );
            }
        } else {
            channel_from = client.currentChannel();
        }

        tree.moveClient(client, channel_to);

        if(self) {
            this.connection_handler.update_voice_status(channel_to);

            for(const entry of client.channelTree.clientsByChannel(channel_from)) {
                if(entry !== client && entry.get_audio_handle()) {
                    entry.get_audio_handle().abort_replay();
                    entry.speaking = false;
                }
            }

            const side_bar = this.connection_handler.side_bar;
            side_bar.info_frame().update_channel_talk();
        }

        const own_channel = this.connection.client.getClient().currentChannel();
        const event = self ? EventType.CLIENT_VIEW_MOVE_OWN : (channel_from == own_channel || channel_to == own_channel ? EventType.CLIENT_VIEW_MOVE_OWN_CHANNEL : EventType.CLIENT_VIEW_MOVE);
        this.connection_handler.log.log(event, {
            channel_from: channel_from ? {
                channel_id: channel_from.channelId,
                channel_name: channel_from.channelName()
            } : undefined,
            channel_from_own: channel_from == own_channel,

            channel_to: channel_to ? {
                channel_id: channel_to.channelId,
                channel_name: channel_to.channelName()
            } : undefined,
            channel_to_own: channel_to == own_channel,

            client: {
                client_id: client.clientId(),
                client_name: client.clientNickName(),
                client_unique_id: client.properties.client_unique_identifier
            },
            client_own: self,

            invoker: this.loggable_invoker(json["invokeruid"], json["invokerid"], json["invokername"]),

            message: json["reasonmsg"],
            reason: parseInt(json["reasonid"]),
        });
        if(json["reasonid"] == ViewReasonId.VREASON_MOVED) {
            if(self)
                this.connection_handler.sound.play(Sound.USER_MOVED_SELF);
            else if(own_channel == channel_to)
                this.connection_handler.sound.play(Sound.USER_ENTERED_MOVED);
            else if(own_channel == channel_from)
                this.connection_handler.sound.play(Sound.USER_LEFT_MOVED);
        } else if(json["reasonid"] == ViewReasonId.VREASON_USER_ACTION) {
            if(self) {} //If we do an action we wait for the error response
            else if(own_channel == channel_to)
                this.connection_handler.sound.play(Sound.USER_ENTERED);
            else if(own_channel == channel_from)
                this.connection_handler.sound.play(Sound.USER_LEFT);
        } else if(json["reasonid"] == ViewReasonId.VREASON_CHANNEL_KICK) {
            if(self) {
                this.connection_handler.sound.play(Sound.CHANNEL_KICKED);
            } else if(own_channel == channel_to)
                this.connection_handler.sound.play(Sound.USER_ENTERED_KICKED);
            else if(own_channel == channel_from)
                this.connection_handler.sound.play(Sound.USER_LEFT_KICKED_CHANNEL);
        } else {
            console.warn(tr("Unknown reason id %o"), json["reasonid"]);
        }
    }

    handleNotifyChannelMoved(json) {
        json = json[0]; //Only one bulk

        let tree = this.connection.client.channelTree;
        let channel = tree.findChannel(json["cid"]);
        if(!channel) {
            log.error(LogCategory.NETWORKING, tr("Unknown channel move (Channel)!"));
            return 0;
        }

        let prev = tree.findChannel(json["order"]);
        if(!prev && json["order"] != 0) {
            log.error(LogCategory.NETWORKING, tr("Unknown channel move (prev)!"));
            return 0;
        }

        let parent = tree.findChannel(json["cpid"]);
        if(!parent && json["cpid"] != 0) {
            log.error(LogCategory.NETWORKING, tr("Unknown channel move (parent)!"));
            return 0;
        }

        tree.moveChannel(channel, prev, parent);
    }

    handleNotifyChannelEdited(json) {
        json = json[0]; //Only one bulk

        let tree = this.connection.client.channelTree;
        let channel = tree.findChannel(json["cid"]);
        if(!channel) {
            log.error(LogCategory.NETWORKING, tr("Unknown channel edit (Channel)!"));
            return 0;
        }

        let updates: {
            key: string,
            value: string
        }[] = [];
        for(let key in json) {
            if(key === "cid") continue;
            if(key === "invokerid") continue;
            if(key === "invokername") continue;
            if(key === "invokeruid") continue;
            if(key === "reasonid") continue;
            updates.push({key: key, value: json[key]});
        }
        channel.updateVariables(...updates);

        if(this.connection_handler.getClient().currentChannel() === channel) {
            //TODO: Playback sound that your channel has been edited
            this.connection_handler.update_voice_status();
        }
    }

    handleNotifyTextMessage(json) {
        json = json[0]; //Only one bulk

        let mode = json["targetmode"];
        if(mode == 1){
            const targetClientId = parseInt(json["target"]);
            const invokerClientId = parseInt(json["invokerid"]);

            const targetClientEntry = this.connection_handler.channelTree.findClient(targetClientId);
            const targetIsOwn = targetClientEntry instanceof LocalClientEntry;

            if(targetIsOwn && targetClientId === invokerClientId) {
                log.error(LogCategory.NETWORKING, tr("Received conversation message from our self. This should be impossible."), json);
                return;
            }

            const partnerClientEntry = targetIsOwn ? this.connection.client.channelTree.findClient(invokerClientId) : targetClientEntry;
            const chatPartner = partnerClientEntry ? partnerClientEntry : {
                clientId: targetIsOwn ? invokerClientId : targetClientId,
                nickname: targetIsOwn ? json["invokername"] : undefined,
                uniqueId: targetIsOwn ? json["invokeruid"] : undefined
            } as OutOfViewClient;

            const conversation_manager = this.connection_handler.side_bar.private_conversations();
            const conversation = conversation_manager.findOrCreateConversation(chatPartner);

            conversation.handleIncomingMessage(chatPartner, !targetIsOwn, {
                sender_database_id: targetClientEntry ? targetClientEntry.properties.client_database_id : 0,
                sender_name: json["invokername"],
                sender_unique_id: json["invokeruid"],

                timestamp: Date.now(),
                message: json["msg"]
            });
            if(targetIsOwn) {
                this.connection_handler.sound.play(Sound.MESSAGE_RECEIVED, {default_volume: .5});
                this.connection_handler.log.log(EventType.PRIVATE_MESSAGE_RECEIVED, {
                    message: json["msg"],
                    sender: {
                        client_unique_id: json["invokeruid"],
                        client_name: json["invokername"],
                        client_id: parseInt(json["invokerid"])
                    }
                });
            } else {
                this.connection_handler.sound.play(Sound.MESSAGE_SEND, {default_volume: .5});
                this.connection_handler.log.log(EventType.PRIVATE_MESSAGE_SEND, {
                    message: json["msg"],
                    target: {
                        client_unique_id: json["invokeruid"],
                        client_name: json["invokername"],
                        client_id: parseInt(json["invokerid"])
                    }
                });
            }
            this.connection_handler.side_bar.info_frame().update_chat_counter();
        } else if(mode == 2) {
            const invoker = this.connection_handler.channelTree.findClient(parseInt(json["invokerid"]));
            const own_channel_id = this.connection.client.getClient().currentChannel().channelId;
            const channel_id = typeof(json["cid"]) !== "undefined" ? parseInt(json["cid"]) : own_channel_id;

            if(json["invokerid"] == this.connection.client.getClientId())
                this.connection_handler.sound.play(Sound.MESSAGE_SEND, {default_volume: .5});
            else if(channel_id == own_channel_id) {
                this.connection_handler.sound.play(Sound.MESSAGE_RECEIVED, {default_volume: .5});
            }

            const conversations = this.connection_handler.side_bar.channel_conversations();
            conversations.findOrCreateConversation(channel_id).handleIncomingMessage({
                sender_database_id: invoker ? invoker.properties.client_database_id : 0,
                sender_name: json["invokername"],
                sender_unique_id: json["invokeruid"],

                timestamp: typeof(json["timestamp"]) === "undefined" ? Date.now() : parseInt(json["timestamp"]),
                message: json["msg"]
            }, invoker instanceof LocalClientEntry);
        } else if(mode == 3) {
            const invoker = this.connection_handler.channelTree.findClient(parseInt(json["invokerid"]));
            const conversations = this.connection_handler.side_bar.channel_conversations();

            this.connection_handler.log.log(EventType.GLOBAL_MESSAGE, {
                isOwnMessage: invoker instanceof LocalClientEntry,
                message: json["msg"],
                sender: {
                    client_unique_id: json["invokeruid"],
                    client_name: json["invokername"],
                    client_id: parseInt(json["invokerid"])
                }
            });

            conversations.findOrCreateConversation(0).handleIncomingMessage({
                sender_database_id: invoker ? invoker.properties.client_database_id : 0,
                sender_name: json["invokername"],
                sender_unique_id: json["invokeruid"],

                timestamp: typeof(json["timestamp"]) === "undefined" ? Date.now() : parseInt(json["timestamp"]),
                message: json["msg"]
            }, invoker instanceof LocalClientEntry);
        }
    }

    notifyClientChatComposing(json) {
        json = json[0];

        const conversation_manager = this.connection_handler.side_bar.private_conversations();
        const conversation = conversation_manager.findConversation(json["cluid"]);
        conversation?.handleRemoteComposing(parseInt(json["clid"]));
    }

    handleNotifyClientChatClosed(json) {
        json = json[0]; //Only one bulk

        const conversation_manager = this.connection_handler.side_bar.private_conversations();
        const conversation = conversation_manager.findConversation(json["cluid"]);
        if(!conversation) {
            log.warn(LogCategory.GENERAL, tr("Received chat close for client, but we haven't a chat open."));
            return;
        }

        conversation.handleChatRemotelyClosed(parseInt(json["clid"]));
    }

    handleNotifyClientUpdated(json) {
        json = json[0]; //Only one bulk

        let client = this.connection.client.channelTree.findClient(json["clid"]);
        if(!client) {
            log.error(LogCategory.NETWORKING, tr("Tried to update an non existing client"));
            return;
        }

        let updates: {
            key: string,
            value: string
        }[] = [];
        for(let key in json) {
            if(key == "clid") continue;
            updates.push({key: key, value: json[key]});
        }
        client.updateVariables(...updates);
    }

    handleNotifyServerEdited(json) {
        json = json[0];

        let updates: {
            key: string,
            value: string
        }[] = [];
        for(let key in json) {
            if(key === "invokerid") continue;
            if(key === "invokername") continue;
            if(key === "invokeruid") continue;
            if(key === "reasonid") continue;

            updates.push({key: key, value: json[key]});
        }
        this.connection.client.channelTree.server.updateVariables(false, ...updates);
    }

    handleNotifyServerUpdated(json) {
        json = json[0];

        let updates: {
            key: string,
            value: string
        }[] = [];
        for(let key in json) {
            if(key === "invokerid") continue;
            if(key === "invokername") continue;
            if(key === "invokeruid") continue;
            if(key === "reasonid") continue;

            updates.push({key: key, value: json[key]});
        }
        this.connection.client.channelTree.server.updateVariables(true, ...updates);
    }

    handleNotifyMusicPlayerInfo(json) {
        json = json[0];

        let bot = this.connection.client.channelTree.find_client_by_dbid(json["bot_id"]);
        if(!bot || !(bot instanceof MusicClientEntry)) {
            log.warn(LogCategory.CLIENT, tr("Got music player info for unknown or invalid bot! (ID: %i, Entry: %o)"), json["bot_id"], bot);
            return;
        }

        bot.handlePlayerInfo(json);
    }

    handleNotifyClientPoke(json) {
        json = json[0];
        spawnPoke(this.connection_handler, {
            id: parseInt(json["invokerid"]),
            name: json["invokername"],
            unique_id: json["invokeruid"]
        }, json["msg"]);

        this.connection_handler.log.log(EventType.CLIENT_POKE_RECEIVED, {
            sender: this.loggable_invoker(json["invokeruid"], json["invokerid"], json["invokername"]),
            message: json["msg"]
        });
        this.connection_handler.sound.play(Sound.USER_POKED_SELF);
    }

    //TODO server chat message
    handleNotifyServerGroupClientAdd(json) {
        json = json[0];

        const self = this.connection.client.getClient();
        if(json["clid"] == self.clientId())
            this.connection_handler.sound.play(Sound.GROUP_SERVER_ASSIGNED_SELF);
    }

    //TODO server chat message
    handleNotifyServerGroupClientRemove(json) {
        json = json[0];

        const self = this.connection.client.getClient();
        if(json["clid"] == self.clientId()) {
            this.connection_handler.sound.play(Sound.GROUP_SERVER_REVOKED_SELF);
        } else {
        }
    }

    //TODO server chat message
    handleNotifyClientChannelGroupChanged(json) {
        json = json[0];

        const self = this.connection.client.getClient();
        if(json["clid"] == self.clientId()) {
            this.connection_handler.sound.play(Sound.GROUP_CHANNEL_CHANGED_SELF);
        }
    }

    handleNotifyChannelSubscribed(json) {
        batch_updates(BatchUpdateType.CHANNEL_TREE);
        try {
            for(const entry of json) {
                const channel = this.connection.client.channelTree.findChannel(parseInt(entry["cid"]));
                if(!channel) {
                    console.warn(tr("Received channel subscribed for not visible channel (cid: %d)"), entry['cid']);
                    continue;
                }

                channel.flag_subscribed = true;
            }
        } finally {
            flush_batched_updates(BatchUpdateType.CHANNEL_TREE);
        }
    }

    handleNotifyChannelUnsubscribed(json) {
        for(const entry of json) {
            const channel = this.connection.client.channelTree.findChannel(entry["cid"]);
            if(!channel) {
                console.warn(tr("Received channel unsubscribed for not visible channel (cid: %d)"), entry['cid']);
                continue;
            }

            channel.flag_subscribed = false;
            for(const client of channel.clients(false))
                this.connection.client.channelTree.deleteClient(client, { reason: ViewReasonId.VREASON_SYSTEM, serverLeave: false });
        }
    }

    /*
    handleNotifyConversationMessageDelete(json: any[]) {
        let conversation: Conversation;
        const conversations = this.connection.client.side_bar.channel_conversations();
        for(const entry of json) {
            if(typeof(entry["cid"]) !== "undefined")
                conversation = conversations.conversation(parseInt(entry["cid"]), false);

            if(!conversation)
                continue;

            conversation.delete_messages(parseInt(entry["timestamp_begin"]), parseInt(entry["timestamp_end"]), parseInt(entry["cldbid"]), parseInt(entry["limit"]));
        }
    }
    */

    handleNotifyMusicStatusUpdate(json: any[]) {
        json = json[0];

        const bot_id = parseInt(json["bot_id"]);
        const client = this.connection.client.channelTree.find_client_by_dbid(bot_id);
        if(!client) {
            log.warn(LogCategory.CLIENT, tr("Received music bot status update for unknown bot (%d)"), bot_id);
            return;
        }

        client.events.fire("music_status_update", {
            player_replay_index: parseInt(json["player_replay_index"]),
            player_buffered_index: parseInt(json["player_buffered_index"])
        });
    }

    handleMusicPlayerSongChange(json: any[]) {
        json = json[0];

        const bot_id = parseInt(json["bot_id"]);
        const client = this.connection.client.channelTree.find_client_by_dbid(bot_id);
        if(!client) {
            log.warn(LogCategory.CLIENT, tr("Received music bot status update for unknown bot (%d)"), bot_id);
            return;
        }

        const song_id = parseInt(json["song_id"]);
        let song: SongInfo;
        if(song_id) {
            song = new SongInfo();
            JSON.map_to(song, json);
        }

        client.events.fire("music_song_change", {
            song: song
        });
    }

    handleNotifyPlaylistSongAdd(json: any[]) {
        json = json[0];

        const playlist_id = parseInt(json["playlist_id"]);
        const client = this.connection.client.channelTree.clients.find(e => e instanceof MusicClientEntry && e.properties.client_playlist_id === playlist_id);
        if(!client) {
            log.warn(LogCategory.CLIENT, tr("Received playlist song add event, but we've no music bot for the playlist (%d)"), playlist_id);
            return;
        }

        client.events.fire("playlist_song_add", {
            song: {
                song_id: parseInt(json["song_id"]),
                song_invoker: json["song_invoker"],
                song_previous_song_id: parseInt(json["song_previous_song_id"]),
                song_url: json["song_url"],
                song_url_loader: json["song_url_loader"],

                song_loaded: json["song_loaded"] == true || json["song_loaded"] == "1",
                song_metadata: json["song_metadata"]
            }
        });
    }

    handleNotifyPlaylistSongRemove(json: any[]) {
        json = json[0];

        const playlist_id = parseInt(json["playlist_id"]);
        const client = this.connection.client.channelTree.clients.find(e => e instanceof MusicClientEntry && e.properties.client_playlist_id === playlist_id);
        if(!client) {
            log.warn(LogCategory.CLIENT, tr("Received playlist song remove event, but we've no music bot for the playlist (%d)"), playlist_id);
            return;
        }

        const song_id = parseInt(json["song_id"]);
        client.events.fire("playlist_song_remove", { song_id: song_id });
    }

    handleNotifyPlaylistSongReorder(json: any[]) {
        json = json[0];

        const playlist_id = parseInt(json["playlist_id"]);
        const client = this.connection.client.channelTree.clients.find(e => e instanceof MusicClientEntry && e.properties.client_playlist_id === playlist_id);
        if(!client) {
            log.warn(LogCategory.CLIENT, tr("Received playlist song reorder event, but we've no music bot for the playlist (%d)"), playlist_id);
            return;
        }

        const song_id = parseInt(json["song_id"]);
        const previous_song_id = parseInt(json["song_previous_song_id"]);
        client.events.fire("playlist_song_reorder", { song_id: song_id, previous_song_id: previous_song_id });
    }

    handleNotifyPlaylistSongLoaded(json: any[]) {
        json = json[0];

        const playlist_id = parseInt(json["playlist_id"]);
        const client = this.connection.client.channelTree.clients.find(e => e instanceof MusicClientEntry && e.properties.client_playlist_id === playlist_id);
        if(!client) {
            log.warn(LogCategory.CLIENT, tr("Received playlist song loaded event, but we've no music bot for the playlist (%d)"), playlist_id);
            return;
        }

        const song_id = parseInt(json["song_id"]);
        client.events.fire("playlist_song_loaded", {
            song_id: song_id,
            success: json["success"] == 1,
            error_msg: json["load_error_msg"],
            metadata: json["song_metadata"]
        });
    }
}