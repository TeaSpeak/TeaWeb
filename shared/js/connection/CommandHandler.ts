import {LogCategory, logError, logInfo, logWarn} from "../log";
import {AbstractServerConnection, CommandOptions, ServerCommand} from "../connection/ConnectionBase";
import {Sound} from "../audio/Sounds";
import {CommandResult} from "../connection/ServerConnectionDeclaration";
import {createErrorModal, createInfoModal, createInputModal, createModal} from "../ui/elements/Modal";
import {
    ClientConnectionInfo,
    ClientEntry,
    ClientType,
    LocalClientEntry,
    MusicClientEntry,
    SongInfo
} from "../tree/Client";
import {ConnectionHandler, ConnectionState, DisconnectReason, ViewReasonId} from "../ConnectionHandler";
import {formatMessage} from "../ui/frames/chat";
import {AbstractCommandHandler, AbstractCommandHandlerBoss} from "../connection/AbstractCommandHandler";
import {batch_updates, BatchUpdateType, flush_batched_updates} from "../ui/react-elements/ReactComponentBase";
import {OutOfViewClient} from "../ui/frames/side/PrivateConversationController";
import {renderBBCodeAsJQuery} from "../text/bbcode";
import {tr} from "../i18n/localize";
import {ErrorCode} from "../connection/ErrorCode";
import {server_connections} from "tc-shared/ConnectionManager";
import {ChannelEntry} from "tc-shared/tree/Channel";
import {EventClient} from "tc-shared/connectionlog/Definitions";
import {spawnPokeModal} from "tc-shared/ui/modal/poke/Controller";

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
        this["notifychanneldescriptionchanged"] = this.handleNotifyChannelDescriptionChanged;
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

        this["notifymusicstatusupdate"] = this.handleNotifyMusicStatusUpdate;
        this["notifymusicplayersongchange"] = this.handleMusicPlayerSongChange;
    }

    private loggable_invoker(uniqueId, clientId, clientName) : EventClient | undefined {
        const id = typeof clientId === "string" ? parseInt(clientId) : clientId;
        if(typeof(clientId) === "undefined" || Number.isNaN(id)) {
            return undefined;
        }

        if(id == 0) {
            return {
                client_id: 0,
                client_unique_id: this.connection_handler.channelTree.server.properties.virtualserver_unique_identifier,
                client_name: this.connection_handler.channelTree.server.properties.virtualserver_name,
            };
        }

        return {
            client_unique_id: uniqueId,
            client_name: clientName,
            client_id: clientId
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
                        if(res.id == ErrorCode.SERVER_INSUFFICIENT_PERMISSIONS) { //Permission error
                            const permission = this.connection_handler.permissions.resolveInfo(res.json["failed_permid"] as number);
                            res.message = tr("Insufficient client permissions. Failed on permission ") + (permission ? permission.name : "unknown");
                            this.connection_handler.log.log("error.permission", {
                                permission: this.connection_handler.permissions.resolveInfo(res.json["failed_permid"] as number)
                            });
                            this.connection_handler.sound.play(Sound.ERROR_INSUFFICIENT_PERMISSIONS);
                        } else if(res.id != ErrorCode.DATABASE_EMPTY_RESULT) {
                            this.connection_handler.log.log("error.custom", {
                                message: res.extra_message.length == 0 ? res.message : res.extra_message
                            });
                        }
                    }
                } else if(typeof(ex) === "string") {
                    this.connection_handler.log.log("connection.command.error", {error: ex});
                } else {
                    logError(LogCategory.NETWORKING, tr("Invalid promise result type: %s. Result: %o"), typeof (ex), ex);
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
            logWarn(LogCategory.NETWORKING, tr("Invalid return code! (%o)"), json);
            return;
        }
        let retListeners = this.connection["_retListener"] || this.connection["returnListeners"];

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
                    this.connection_handler.log.log("server.host.message", {
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
                        this.connection_handler.log.log("server.host.message.disconnect", {
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
            this.connection_handler.log.log("server.welcome.message", {
                message: properties.virtualserver_welcomemessage
            });
        }

        /* priviledge key */
        if(properties.virtualserver_ask_for_privilegekey) {
            createInputModal(tr("Use a privilege key"), tr("This is a newly created server for which administrator privileges have not yet been claimed.<br>Please enter the \"privilege key\" that was automatically generated when this server was created to gain administrator permissions."), message => message.length > 0, result => {
                if(!result) return;
                const scon = server_connections.getActiveConnectionHandler();

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
            logWarn(LogCategory.NETWORKING, tr("Received client connection info for unknown client (%o)"), json["clid"]);
            return;
        }

        client.set_connection_info(object);
    }

    private createChannelFromJson(json, ignoreMissingPreviousChannel: boolean = false) : ChannelEntry {
        let tree = this.connection.client.channelTree;

        let channelId = parseInt(json["cid"]);
        let channelName = json["channel_name"];

        let previousChannelId = parseInt(json["channel_order"]);
        let parentChannelId = parseInt(json["cpid"]);

        if(Number.isNaN(channelId) || Number.isNaN(previousChannelId) || Number.isNaN(parentChannelId)) {
            logError(LogCategory.NETWORKING, tr("Tried to create a channel with invalid ids (%o - %o - %o)"), channelId, previousChannelId, parentChannelId);
            return;
        }

        let parentChannel: ChannelEntry;
        let previousChannel: ChannelEntry;

        if(previousChannelId !== 0) {
            previousChannel = tree.findChannel(previousChannelId);

            if(!previousChannel && !ignoreMissingPreviousChannel) {
                logError(LogCategory.NETWORKING, tr("Received a channel with an invalid order id (%d)"), previousChannelId);
                /* maybe disconnect? */
            }
        }

        if(parentChannelId !== 0) {
            parentChannel = tree.findChannel(parentChannelId);
            if(!parentChannel) {
                logError(LogCategory.NETWORKING, tr("Received a channel with an invalid parent channel (%d)"), parentChannelId);
                /* maybe disconnect? */
            }
        }

        const channel = tree.handleChannelCreated(previousChannel, parentChannel, channelId, channelName);

        let updates: {
            key: string,
            value: string
        }[] = [];
        for(let key of Object.keys(json)) {
            if(key === "cid") continue;
            if(key === "cpid") continue;
            if(key === "invokerid") continue;
            if(key === "invokername") continue;
            if(key === "invokeruid") continue;
            if(key === "reasonid") continue;

            updates.push({key: key, value: json[key]});
        }
        channel.updateVariables(...updates);
        if(tree.channelsInitialized) {
            channel.updateSubscribeMode().then(undefined);
        }

        return channel;
    }

    private batchTreeUpdateFinishedTimeout;
    handleCommandChannelList(json) {
        if(this.batchTreeUpdateFinishedTimeout) {
            clearTimeout(this.batchTreeUpdateFinishedTimeout);
            this.batchTreeUpdateFinishedTimeout = 0;
            /* batch update is still active */
        } else {
            batch_updates(BatchUpdateType.CHANNEL_TREE);
        }

        for(let index = 0; index < json.length; index++) {
            this.createChannelFromJson(json[index], true);
        }

        this.batchTreeUpdateFinishedTimeout = setTimeout(() => {
            flush_batched_updates(BatchUpdateType.CHANNEL_TREE);
            this.batchTreeUpdateFinishedTimeout = 0;
        }, 500);
    }


    handleCommandChannelListFinished() {
        this.connection.client.channelTree.channelsInitialized = true;
        this.connection.client.channelTree.events.fire("notify_channel_list_received");

        if(this.batchTreeUpdateFinishedTimeout) {
            clearTimeout(this.batchTreeUpdateFinishedTimeout);
            this.batchTreeUpdateFinishedTimeout = 0;
            flush_batched_updates(BatchUpdateType.CHANNEL_TREE);
        }
    }

    handleCommandChannelCreate(json) {
        json = json[0];

        const channel = this.createChannelFromJson(json);
        if(!channel) { return; }

        const ownAction = parseInt(json["invokerid"]) === this.connection.client.getClientId();
        if(ownAction) {
            this.connection.client.sound.play(Sound.CHANNEL_CREATED);
        }

        const log = this.connection.client.log;
        log.log("channel.create", {
            channel: channel.log_data(),
            creator: this.loggable_invoker(json["invokeruid"], json["invokerid"], json["invokername"]),
            ownAction: ownAction
        });
    }

    handleCommandChannelShow(json) {
        json = json[0];
        const channel = this.createChannelFromJson(json);

        const log = this.connection.client.log;
        log.log("channel.show", {
            channel: channel.log_data(),
        });
    }

    handleCommandChannelDelete(json) {
        let tree = this.connection.client.channelTree;
        const conversations = this.connection.client.getChannelConversations();

        let playSound = false;

        logInfo(LogCategory.NETWORKING, tr("Got %d channel deletions"), json.length);
        for(let index = 0; index < json.length; index++) {
            conversations.destroyConversation(parseInt(json[index]["cid"]));
            let channel = tree.findChannel(json[index]["cid"]);
            if(!channel) {
                logError(LogCategory.NETWORKING, tr("Invalid channel onDelete (Unknown channel)"));
                continue;
            }
            tree.deleteChannel(channel);

            const ownAction = parseInt(json[index]["invokerid"]) === this.connection.client.getClientId();

            const log = this.connection.client.log;
            log.log("channel.delete", {
                channel: channel.log_data(),
                deleter: this.loggable_invoker(json[index]["invokeruid"], json[index]["invokerid"], json[index]["invokername"]),
                ownAction: ownAction
            });

            if(ownAction) {
                playSound = true;
            }
        }

        if(playSound) {
            this.connection.client.sound.play(Sound.CHANNEL_DELETED);
        }
    }

    handleCommandChannelHide(json) {
        let tree = this.connection.client.channelTree;

        logInfo(LogCategory.NETWORKING, tr("Got %d channel hides"), json.length);
        for(let index = 0; index < json.length; index++) {
            let channel = tree.findChannel(json[index]["cid"]);
            if(!channel) {
                logError(LogCategory.NETWORKING, tr("Invalid channel on hide (Unknown channel)"));
                continue;
            }
            tree.deleteChannel(channel);

            const log = this.connection.client.log;
            log.log("channel.hide", {
                channel: channel.log_data(),
            });
        }
    }

    handleCommandClientEnterView(json) {
        let tree = this.connection.client.channelTree;

        let client: ClientEntry;
        let channel = undefined;
        let old_channel = undefined;
        let reasonId, reasonMsg;

        let invokerId, invokerName, invokerUniqueId;

        for(const entry of json) {
            /* attempt to update properties if given */
            channel =  typeof(entry["ctid"]) !== "undefined" ? tree.findChannel(parseInt(entry["ctid"])) : channel;
            if(!channel) {
                /* TODO: Close the connection */
                logError(LogCategory.NETWORKING, tr("Received client enter view for invalid target channel: %o"), entry["ctid"]);
                continue;
            }

            old_channel = typeof(entry["cfid"]) !== "undefined" ? tree.findChannel(parseInt(entry["cfid"])) : old_channel;
            reasonId = typeof(entry["reasonid"]) !== "undefined" ? entry["reasonid"] : reasonId;
            reasonMsg = typeof(entry["reason_msg"]) !== "undefined" ? entry["reason_msg"] : reasonMsg;

            invokerId = typeof(entry["invokerid"]) !== "undefined" ? parseInt(entry["invokerid"]) : invokerId;
            invokerName = typeof(entry["invokername"]) !== "undefined" ? entry["invokername"] : invokerName;
            invokerUniqueId = typeof(entry["invokeruid"]) !== "undefined" ? entry["invokeruid"] : invokerUniqueId;

            client = tree.findClient(parseInt(entry["clid"]));

            if(!client) {
                if(parseInt(entry["client_type_exact"]) == ClientType.CLIENT_MUSIC) {
                    client = new MusicClientEntry(parseInt(entry["clid"]), entry["client_nickname"]) as any;
                } else {
                    client = new ClientEntry(parseInt(entry["clid"]), entry["client_nickname"]);
                }

                /* TODO: Apply all other properties here as well and than register him */
                client.properties.client_unique_identifier = entry["client_unique_identifier"];
                client.properties.client_type = parseInt(entry["client_type"]);
                client = tree.insertClient(client, channel, { reason: reasonId, isServerJoin: parseInt(entry["cfid"]) === 0 });
            } else {
                tree.moveClient(client, channel);
            }

            if(this.connection_handler.areQueriesShown() || client.properties.client_type != ClientType.CLIENT_QUERY) {
                const own_channel = this.connection.client.getClient().currentChannel();
                this.connection_handler.log.log(channel == own_channel ? "client.view.enter.own.channel" : "client.view.enter", {
                    channel_from: old_channel ? old_channel.log_data() : undefined,
                    channel_to: channel ? channel.log_data() : undefined,
                    client: client.log_data(),
                    invoker: this.loggable_invoker(invokerUniqueId, invokerId, invokerName),
                    message:reasonMsg,
                    reason: parseInt(reasonId),
                });

                if(reasonId == ViewReasonId.VREASON_USER_ACTION) {
                    if(own_channel == channel)
                        if(old_channel)
                            this.connection_handler.sound.play(Sound.USER_ENTERED);
                        else
                            this.connection_handler.sound.play(Sound.USER_ENTERED_CONNECT);
                } else if(reasonId == ViewReasonId.VREASON_MOVED) {
                    if(own_channel == channel)
                        this.connection_handler.sound.play(Sound.USER_ENTERED_MOVED);
                } else if(reasonId == ViewReasonId.VREASON_CHANNEL_KICK) {
                    if(own_channel == channel)
                        this.connection_handler.sound.play(Sound.USER_ENTERED_KICKED);
                } else if(reasonId == ViewReasonId.VREASON_SYSTEM) {

                } else {
                    logWarn(LogCategory.NETWORKING, tr("Unknown reasonid for %o"), reasonId);
                }
            }

            let updates: {
                key: string,
                value: string
            }[] = [];

            for(let key of Object.keys(entry)) {
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
                this.connection_handler.update_voice_status();
                const conversations = this.connection.client.getChannelConversations();
                conversations.setSelectedConversation(conversations.findOrCreateConversation(client.currentChannel().channelId));
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
                logError(LogCategory.NETWORKING, tr("Unknown client left!"));
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
                return;
            }

            const targetChannelId = parseInt(entry["ctid"]);
            if(this.connection_handler.areQueriesShown() || client.properties.client_type != ClientType.CLIENT_QUERY) {
                const own_channel = this.connection.client.getClient().currentChannel();
                let channel_from = tree.findChannel(entry["cfid"]);
                let channel_to = tree.findChannel(targetChannelId);

                const is_own_channel = channel_from == own_channel;
                this.connection_handler.log.log(is_own_channel ? "client.view.leave.own.channel" : "client.view.leave", {
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
                        logError(LogCategory.NETWORKING, tr("Unknown client left reason %d!"), reason_id);
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
        let channelFrom = tree.findChannel(parseInt(json["cfid"]));

        if(!client) {
            logError(LogCategory.NETWORKING, tr("Unknown client move (Client)!"));
            return 0;
        }

        if(!channel_to) {
            logError(LogCategory.NETWORKING, tr("Unknown client move (Channel to)!"));
            return 0;
        }

        if(!self) {
            if(!channelFrom) {
                logError(LogCategory.NETWORKING, tr("Unknown client move (Channel from)!"));
                channelFrom = client.currentChannel();
            } else if(channelFrom != client.currentChannel()) {
                logError(LogCategory.NETWORKING,
                    tr("Client move from invalid source channel! Local client registered in channel %d but server send %d."),
                    client.currentChannel().channelId, channelFrom.channelId
                );
            }
        } else {
            channelFrom = client.currentChannel();
        }

        tree.moveClient(client, channel_to);

        if(self) {
            this.connection_handler.update_voice_status();

            for(const entry of client.channelTree.clientsByChannel(channelFrom)) {
                entry.getVoiceClient()?.abortReplay();
            }
        } else {
            client.getVoiceClient()?.abortReplay();
        }

        const own_channel = this.connection.client.getClient().currentChannel();
        const event = self ? "client.view.move.own" : (channelFrom == own_channel || channel_to == own_channel ? "client.view.move.own.channel" : "client.view.move");
        this.connection_handler.log.log(event, {
            channel_from: channelFrom ? {
                channel_id: channelFrom.channelId,
                channel_name: channelFrom.channelName()
            } : undefined,
            channel_from_own: channelFrom == own_channel,

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
            else if(own_channel == channelFrom)
                this.connection_handler.sound.play(Sound.USER_LEFT_MOVED);
        } else if(json["reasonid"] == ViewReasonId.VREASON_USER_ACTION) {
            if(self) {} //If we do an action we wait for the error response
            else if(own_channel == channel_to)
                this.connection_handler.sound.play(Sound.USER_ENTERED);
            else if(own_channel == channelFrom)
                this.connection_handler.sound.play(Sound.USER_LEFT);
        } else if(json["reasonid"] == ViewReasonId.VREASON_CHANNEL_KICK) {
            if(self) {
                this.connection_handler.sound.play(Sound.CHANNEL_KICKED);
            } else if(own_channel == channel_to)
                this.connection_handler.sound.play(Sound.USER_ENTERED_KICKED);
            else if(own_channel == channelFrom)
                this.connection_handler.sound.play(Sound.USER_LEFT_KICKED_CHANNEL);
        } else {
            logWarn(LogCategory.NETWORKING, tr("Unknown reason id %o"), json["reasonid"]);
        }
    }

    handleNotifyChannelMoved(json) {
        json = json[0]; //Only one bulk

        let tree = this.connection.client.channelTree;
        let channel = tree.findChannel(json["cid"]);
        if(!channel) {
            logError(LogCategory.NETWORKING, tr("Unknown channel move (Channel)!"));
            return 0;
        }

        let prev = tree.findChannel(json["order"]);
        if(!prev && json["order"] != 0) {
            logError(LogCategory.NETWORKING, tr("Unknown channel move (prev)!"));
            return 0;
        }

        let parent = tree.findChannel(json["cpid"]);
        if(!parent && json["cpid"] != 0) {
            logError(LogCategory.NETWORKING, tr("Unknown channel move (parent)!"));
            return 0;
        }

        tree.moveChannel(channel, prev, parent, false);
    }

    handleNotifyChannelEdited(json) {
        json = json[0]; //Only one bulk

        let tree = this.connection.client.channelTree;
        let channel = tree.findChannel(json["cid"]);
        if(!channel) {
            logError(LogCategory.NETWORKING, tr("Unknown channel edit (Channel)!"));
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

    handleNotifyChannelDescriptionChanged(json) {
        json = json[0];

        let tree = this.connection.client.channelTree;
        let channel = tree.findChannel(parseInt(json["cid"]));
        if(!channel) {
            logWarn(LogCategory.NETWORKING, tr("Received channel description changed notify for invalid channel: %o"), json["cid"]);
            return;
        }

        channel.handleDescriptionChanged();
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
                logError(LogCategory.NETWORKING, tr("Received conversation message from our self. This should be impossible."), json);
                return;
            }

            const partnerClientEntry = targetIsOwn ? this.connection.client.channelTree.findClient(invokerClientId) : targetClientEntry;
            const chatPartner = partnerClientEntry ? partnerClientEntry : {
                clientId: targetIsOwn ? invokerClientId : targetClientId,
                nickname: targetIsOwn ? json["invokername"] : undefined,
                uniqueId: targetIsOwn ? json["invokeruid"] : undefined
            } as OutOfViewClient;

            const conversationManager = this.connection_handler.getPrivateConversations();
            const conversation = conversationManager.findOrCreateConversation(chatPartner);

            conversation.handleIncomingMessage(chatPartner, !targetIsOwn, {
                sender_database_id: targetClientEntry ? targetClientEntry.properties.client_database_id : 0,
                sender_name: json["invokername"],
                sender_unique_id: json["invokeruid"],

                timestamp: Date.now(),
                message: json["msg"]
            });
            if(targetIsOwn) {
                this.connection_handler.sound.play(Sound.MESSAGE_RECEIVED, {default_volume: .5});
                this.connection_handler.log.log("private.message.received", {
                    message: json["msg"],
                    sender: {
                        client_unique_id: json["invokeruid"],
                        client_name: json["invokername"],
                        client_id: parseInt(json["invokerid"])
                    }
                });
            } else {
                this.connection_handler.sound.play(Sound.MESSAGE_SEND, {default_volume: .5});
                this.connection_handler.log.log("private.message.send", {
                    message: json["msg"],
                    target: {
                        client_unique_id: json["invokeruid"],
                        client_name: json["invokername"],
                        client_id: parseInt(json["invokerid"])
                    }
                });
            }
        } else if(mode == 2) {
            const invoker = this.connection_handler.channelTree.findClient(parseInt(json["invokerid"]));
            const own_channel_id = this.connection.client.getClient().currentChannel().channelId;
            const channel_id = typeof(json["cid"]) !== "undefined" ? parseInt(json["cid"]) : own_channel_id;

            if(json["invokerid"] == this.connection.client.getClientId())
                this.connection_handler.sound.play(Sound.MESSAGE_SEND, {default_volume: .5});
            else if(channel_id == own_channel_id) {
                this.connection_handler.sound.play(Sound.MESSAGE_RECEIVED, {default_volume: .5});
            }

            const conversations = this.connection_handler.getChannelConversations();
            conversations.findOrCreateConversation(channel_id).handleIncomingMessage({
                sender_database_id: invoker ? invoker.properties.client_database_id : 0,
                sender_name: json["invokername"],
                sender_unique_id: json["invokeruid"],

                timestamp: typeof(json["timestamp"]) === "undefined" ? Date.now() : parseInt(json["timestamp"]),
                message: json["msg"]
            }, invoker instanceof LocalClientEntry);
        } else if(mode == 3) {
            const invoker = this.connection_handler.channelTree.findClient(parseInt(json["invokerid"]));
            const conversations = this.connection_handler.getChannelConversations();

            this.connection_handler.log.log("global.message", {
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

        const conversation_manager = this.connection_handler.getPrivateConversations();
        const conversation = conversation_manager.findConversation(json["cluid"]);
        conversation?.handleRemoteComposing(parseInt(json["clid"]));
    }

    handleNotifyClientChatClosed(json) {
        json = json[0]; //Only one bulk

        const conversationManager = this.connection_handler.getPrivateConversations();
        const conversation = conversationManager.findConversation(json["cluid"]);
        if(!conversation) {
            logWarn(LogCategory.GENERAL, tr("Received chat close for client, but we haven't a chat open."));
            return;
        }

        conversation.handleChatRemotelyClosed(parseInt(json["clid"]));
    }

    handleNotifyClientUpdated(json) {
        json = json[0]; //Only one bulk

        let client = this.connection.client.channelTree.findClient(json["clid"]);
        if(!client) {
            logError(LogCategory.NETWORKING, tr("Tried to update an non existing client"));
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
            logWarn(LogCategory.CLIENT, tr("Got music player info for unknown or invalid bot! (ID: %i, Entry: %o)"), json["bot_id"], bot);
            return;
        }

        bot.handlePlayerInfo(json);
    }

    handleNotifyClientPoke(json) {
        json = json[0];

        spawnPokeModal(this.connection_handler, {
            clientId: parseInt(json["invokerid"]),
            clientName: json["invokername"],
            clientUniqueId: json["invokeruid"]
        }, json["msg"]);

        this.connection_handler.log.log("client.poke.received", {
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
                    logWarn(LogCategory.NETWORKING, tr("Received channel subscribed for not visible channel (cid: %o)"), entry["cid"]);
                    continue;
                }

                channel.setSubscribed(true);
            }
        } finally {
            flush_batched_updates(BatchUpdateType.CHANNEL_TREE);
        }
    }

    handleNotifyChannelUnsubscribed(json) {
        for(const entry of json) {
            const channel = this.connection.client.channelTree.findChannel(entry["cid"]);
            if(!channel) {
                logWarn(LogCategory.NETWORKING, tr("Received channel unsubscribed for not visible channel (cid: %o)"), entry["cid"]);
                continue;
            }

            channel.setSubscribed(false);
            for(const client of channel.clients(false)) {
                this.connection.client.channelTree.deleteClient(client, { reason: ViewReasonId.VREASON_SYSTEM, serverLeave: false });
            }
        }
    }

    handleNotifyMusicStatusUpdate(json: any[]) {
        json = json[0];

        const bot_id = parseInt(json["bot_id"]);
        const client = this.connection.client.channelTree.find_client_by_dbid(bot_id);
        if(!client || !(client instanceof MusicClientEntry)) {
            logWarn(LogCategory.CLIENT, tr("Received music bot status update for unknown bot (%d)"), bot_id);
            return;
        }

        client.events.fire("notify_music_player_timestamp", {
            replayIndex: parseInt(json["player_replay_index"]),
            bufferedIndex: parseInt(json["player_buffered_index"])
        });
    }

    handleMusicPlayerSongChange(json: any[]) {
        json = json[0];

        const bot_id = parseInt(json["bot_id"]);
        const client = this.connection.client.channelTree.find_client_by_dbid(bot_id);
        if(!client || !(client instanceof MusicClientEntry)) {
            logWarn(LogCategory.CLIENT, tr("Received music bot status update for unknown bot (%d)"), bot_id);
            return;
        }

        const song_id = parseInt(json["song_id"]);
        let song: SongInfo;
        if(song_id) {
            song = new SongInfo();
            JSON.map_to(song, json);
        }

        client.events.fire("notify_music_player_song_change", {
            newSong: song
        });
    }
}