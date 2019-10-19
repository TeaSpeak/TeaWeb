/// <reference path="ConnectionBase.ts" />

namespace connection {
    import Conversation = chat.channel.Conversation;

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

            this["notifyconversationhistory"] = this.handleNotifyConversationHistory;
            this["notifyconversationmessagedelete"] = this.handleNotifyConversationMessageDelete;
        }

        proxy_command_promise(promise: Promise<CommandResult>, options: connection.CommandOptions) {
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
                                this.connection_handler.log.log(log.server.Type.ERROR_PERMISSION, {
                                    permission: this.connection_handler.permissions.resolveInfo(res.json["failed_permid"] as number)
                                });
                                this.connection_handler.sound.play(Sound.ERROR_INSUFFICIENT_PERMISSIONS);
                            } else if(res.id != ErrorID.EMPTY_RESULT) {
                                this.connection_handler.log.log(log.server.Type.ERROR_CUSTOM, {
                                    message: res.extra_message.length == 0 ? res.message : res.extra_message
                                });
                            }
                        }
                    } else if(typeof(ex) === "string") {
                        this.connection_handler.log.log(log.server.Type.CONNECTION_COMMAND_ERROR, {error: ex});
                    } else {
                        log.error(LogCategory.NETWORKING, tr("Invalid promise result type: %s. Result: %o"), typeof (ex), ex);
                    }
                }

                return Promise.reject(ex);
            });
        }

        handle_command(command: ServerCommand) : boolean {
            if(this[command.command]) {
                this[command.command](command.arguments);
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
            json = json[0]; //Only one bulk

            let code : string = json["return_code"];
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

            this.connection_handler.channelTree.registerClient(this.connection_handler.getClient());
            this.connection.client.side_bar.channel_conversations().reset();
            this.connection.client.clientId = parseInt(json["aclid"]);
            this.connection.client.getClient().updateVariables( {key: "client_nickname", value: json["acn"]});

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
                    this.connection_handler.log.log(log.server.Type.SERVER_HOST_MESSAGE, {
                        message: properties.virtualserver_hostmessage
                    });
                } else {
                    /* create modal/create modal and quit */
                    createModal({
                        header: tr("Host message"),
                        body: MessageHelper.bbcode_chat(properties.virtualserver_hostmessage),
                        footer: undefined
                    }).open();

                    if(properties.virtualserver_hostmessage_mode == 3) {
                        /* first let the client initialize his stuff */
                        setTimeout(() => {
                            this.connection_handler.log.log(log.server.Type.SERVER_HOST_MESSAGE_DISCONNECT, {
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
                this.connection_handler.log.log(log.server.Type.SERVER_WELCOME_MESSAGE, {
                    message: properties.virtualserver_welcomemessage
                });
            }

            /* priviledge key */
            if(properties.virtualserver_ask_for_privilegekey) {
                createInputModal(tr("Use a privilege key"), tr("This is a newly created server for which administrator privileges have not yet been claimed.<br>Please enter the \"privilege key\" that was automatically generated when this server was created to gain administrator permissions."), message => message.length > 0, result => {
                    if(!result) return;
                    const scon = server_connections.active_connection_handler();

                    if(scon.serverConnection.connected)
                        scon.serverConnection.send_command("tokenuse", {
                            token: result
                        }).then(() => {
                            createInfoModal(tr("Use privilege key"), tr("Privilege key successfully used!")).open();
                        }).catch(error => {
                            createErrorModal(tr("Use privilege key"), MessageHelper.formatMessage(tr("Failed to use privilege key: {}"), error instanceof CommandResult ? error.message : error)).open();
                        });
                }, { field_placeholder: 'Enter Privilege Key' }).open();
            }

            this.connection_handler.log.log(log.server.Type.CONNECTION_CONNECTED, {
                own_client: this.connection_handler.getClient().log_data()
            });
            this.connection_handler.sound.play(Sound.CONNECTION_CONNECTED);
            this.connection.client.onConnected();
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

            let channel = new ChannelEntry(parseInt(json["cid"]), json["channel_name"], tree.findChannel(json["cpid"]));
            tree.insertChannel(channel);
            if(json["channel_order"] !== "0") {
                let prev = tree.findChannel(json["channel_order"]);
                if(!prev && json["channel_order"] != 0) {
                    if(!ignoreOrder) {
                        log.error(LogCategory.NETWORKING, tr("Invalid channel order id!"));
                        return;
                    }
                }

                let parent = tree.findChannel(json["cpid"]);
                if(!parent && json["cpid"] != 0) {
                    log.error(LogCategory.NETWORKING, tr("Invalid channel parent"));
                    return;
                }
                tree.moveChannel(channel, prev, parent); //TODO test if channel exists!
            }
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

        handleCommandChannelList(json) {
            this.connection.client.channelTree.hide_channel_tree(); /* dont perform channel inserts on the dom to prevent style recalculations */
            log.debug(LogCategory.NETWORKING, tr("Got %d new channels"), json.length);
            for(let index = 0; index < json.length; index++)
                this.createChannelFromJson(json[index], true);
        }


        handleCommandChannelListFinished(json) {
            this.connection.client.channelTree.show_channel_tree();
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
                conversations.delete_conversation(parseInt(json[index]["cid"]));
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
                conversations.delete_conversation(parseInt(json[index]["cid"]));
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

                    client.properties.client_type = parseInt(entry["client_type"]);
                    client = tree.insertClient(client, channel);
                } else {
                    tree.moveClient(client, channel);
                }

                if(this.connection_handler.client_status.queries_visible || client.properties.client_type != ClientType.CLIENT_QUERY) {
                    const own_channel = this.connection.client.getClient().currentChannel();
                    this.connection_handler.log.log(log.server.Type.CLIENT_VIEW_ENTER, {
                        channel_from: old_channel ? old_channel.log_data() : undefined,
                        channel_to: channel ? channel.log_data() : undefined,
                        client: client.log_data(),
                        invoker: invokeruid ? {
                            client_id: invokerid,
                            client_name: invokername,
                            client_unique_id: invokeruid
                        } : undefined,
                        message:reason_msg,
                        reason: parseInt(reason_id),
                        own_channel: channel == own_channel
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

                /* if its a new client join, or a system reason (like we joined) */
                if(!old_channel || reason_id == 2) {
                    /* client new join */
                    const conversation_manager = this.connection_handler.side_bar.private_conversations();
                    const conversation = conversation_manager.find_conversation({
                        unique_id: client.properties.client_unique_identifier,
                        client_id: client.clientId(),
                        name: client.clientNickName()
                    }, {
                        create: false,
                        attach: true
                    });
                    if(conversation)
                        client.flag_text_unread = conversation.is_unread();
                }

                if(client instanceof LocalClientEntry) {
                    client.initializeListener();
                    this.connection_handler.update_voice_status();
                    this.connection_handler.side_bar.info_frame().update_channel_talk();
                    const conversations = this.connection.client.side_bar.channel_conversations();
                    conversations.set_current_channel(client.currentChannel().channelId);
                }
            }
        }

        handleCommandClientLeftView(json) {
            let reason_id;

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
                    } else
                        this.connection.client.handleDisconnect(DisconnectReason.UNKNOWN, entry);
                    this.connection_handler.side_bar.info_frame().update_channel_talk();
                    return;
                }


                if(this.connection_handler.client_status.queries_visible || client.properties.client_type != ClientType.CLIENT_QUERY) {
                    const own_channel = this.connection.client.getClient().currentChannel();
                    let channel_from = tree.findChannel(entry["cfid"]);
                    let channel_to = tree.findChannel(entry["ctid"]);

                    this.connection_handler.log.log(log.server.Type.CLIENT_VIEW_LEAVE, {
                        channel_from: channel_from ? channel_from.log_data() : undefined,
                        channel_to: channel_to ? channel_to.log_data() : undefined,
                        client: client.log_data(),
                        invoker: entry["invokeruid"] ? {
                            client_id: entry["invokerid"],
                            client_name: entry["invokername"],
                            client_unique_id: entry["invokeruid"]
                        } : undefined,
                        message: entry["reasonmsg"],
                        reason: parseInt(entry["reasonid"]),
                        ban_time: parseInt(entry["bantime"]),
                        own_channel: channel_from == own_channel
                    });
                    if(reason_id == ViewReasonId.VREASON_USER_ACTION) {
                        if(channel_from == own_channel)
                            this.connection_handler.sound.play(Sound.USER_LEFT);
                    } else if(reason_id == ViewReasonId.VREASON_SERVER_LEFT) {
                        if(channel_from == own_channel)
                            this.connection_handler.sound.play(Sound.USER_LEFT_DISCONNECT);
                    } else if(json["reasonid"] == ViewReasonId.VREASON_SERVER_KICK) {
                        if(channel_from == own_channel)
                            this.connection_handler.sound.play(Sound.USER_LEFT_KICKED_SERVER);
                    } else if(reason_id == ViewReasonId.VREASON_CHANNEL_KICK) {
                        if(channel_from == own_channel)
                            this.connection_handler.sound.play(Sound.USER_LEFT_KICKED_CHANNEL);
                    } else if(reason_id == ViewReasonId.VREASON_BAN) {
                        if(channel_from == own_channel)
                            this.connection_handler.sound.play(Sound.USER_LEFT_BANNED);
                    } else if(reason_id == ViewReasonId.VREASON_TIMEOUT) {
                        if(channel_from == own_channel)
                            this.connection_handler.sound.play(Sound.USER_LEFT_TIMEOUT);
                    } else {
                        log.error(LogCategory.NETWORKING, tr("Unknown client left reason!"));
                    }

                    if(!channel_to) {
                        /* client left the server */
                        const conversation_manager = this.connection_handler.side_bar.private_conversations();
                        const conversation = conversation_manager.find_conversation({
                            unique_id: client.properties.client_unique_identifier,
                            client_id: client.clientId(),
                            name: client.clientNickName()
                        }, {
                            create: false,
                            attach: false
                        });
                        if(conversation)
                            conversation.set_state(chat.PrivateConversationState.DISCONNECTED);
                    }
                }

                tree.deleteClient(client);
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
                } else if(channel_to !== client.currentChannel()) {
                    log.error(LogCategory.NETWORKING,
                        tr("Client move from invalid source channel! Local client registered in channel %d but server send %d."),
                        client.currentChannel().channelId, channel_from.channelId
                    );
                }
            }

            let current_clients: ClientEntry[];
            if(self) {
                channel_from = client.currentChannel();
                current_clients = client.channelTree.clientsByChannel(client.currentChannel());
                this.connection_handler.update_voice_status(channel_to);
            }

            tree.moveClient(client, channel_to);
            for(const entry of current_clients || [])
                if(entry !== client && entry.get_audio_handle())
                    entry.get_audio_handle().abort_replay();

            if(self) {
                const side_bar = this.connection_handler.side_bar;
                side_bar.info_frame().update_channel_talk();

                const conversation_to = side_bar.channel_conversations().conversation(channel_to.channelId, false);
                if(conversation_to)
                    conversation_to.update_private_state();

                if(channel_from) {
                    const conversation_from = side_bar.channel_conversations().conversation(channel_from.channelId, false);
                    if(conversation_from)
                        conversation_from.update_private_state();
                }

                side_bar.channel_conversations().update_chat_box();
            }

            const own_channel = this.connection.client.getClient().currentChannel();
            this.connection_handler.log.log(log.server.Type.CLIENT_VIEW_MOVE, {
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

                invoker: json["invokeruid"] ? {
                    client_id: parseInt(json["invokerid"]),
                    client_name: json["invokername"],
                    client_unique_id: json["invokeruid"]
                } : undefined,

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
                //json["invokerid"], json["invokername"], json["invokeruid"]
                const target_client_id = parseInt(json["target"]);
                const target_own = target_client_id === this.connection.client.getClientId();

                if(target_own && target_client_id === json["invokerid"]) {
                    log.error(LogCategory.NETWORKING, tr("Received conversation message from invalid client id. Data: %o", json));
                    return;
                }

                const conversation_manager = this.connection_handler.side_bar.private_conversations();
                const conversation = conversation_manager.find_conversation({
                    client_id: target_own ? parseInt(json["invokerid"]) : target_client_id,
                    unique_id: target_own ? json["invokeruid"] : undefined,
                    name: target_own ? json["invokername"] : undefined
                }, {
                    create: target_own,
                    attach: target_own
                });
                if(!conversation) {
                    log.error(LogCategory.NETWORKING, tr("Received conversation message for unknown conversation! (%s)"), target_own ? tr("Remote message") : tr("Own message"));
                    return;
                }

                conversation.append_message(json["msg"], {
                    type: target_own ? "partner" : "self",
                    name: json["invokername"],
                    unique_id: json["invokeruid"],
                    client_id: parseInt(json["invokerid"])
                });

                if(target_own) {
                    this.connection_handler.sound.play(Sound.MESSAGE_RECEIVED, {default_volume: .5});
                    const client = this.connection_handler.channelTree.findClient(parseInt(json["invokerid"]));
                    if(client) /* the client itself might be invisible */
                        client.flag_text_unread = conversation.is_unread();
                } else {
                    this.connection_handler.sound.play(Sound.MESSAGE_SEND, {default_volume: .5});
                }
            } else if(mode == 2) {
                const invoker = this.connection_handler.channelTree.findClient(parseInt(json["invokerid"]));
                const own_channel_id = this.connection.client.getClient().currentChannel().channelId;
                const channel_id = typeof(json["cid"]) !== "undefined" ? parseInt(json["cid"]) : own_channel_id;
                const channel = this.connection_handler.channelTree.findChannel(channel_id);

                if(json["invokerid"] == this.connection.client.clientId)
                    this.connection_handler.sound.play(Sound.MESSAGE_SEND, {default_volume: .5});
                else if(channel_id == own_channel_id) {
                    this.connection_handler.sound.play(Sound.MESSAGE_RECEIVED, {default_volume: .5});
                }

                const conversations = this.connection_handler.side_bar.channel_conversations();
                const conversation = conversations.conversation(channel_id);
                conversation.register_new_message({
                    sender_database_id: invoker ? invoker.properties.client_database_id : 0,
                    sender_name: json["invokername"],
                    sender_unique_id: json["invokeruid"],

                    timestamp: typeof(json["timestamp"]) === "undefined" ? Date.now() : parseInt(json["timestamp"]),
                    message: json["msg"]
                });
                if(conversation.is_unread())
                    channel.flag_text_unread = true;
            } else if(mode == 3) {
                this.connection_handler.log.log(log.server.Type.GLOBAL_MESSAGE, {
                    message: json["msg"],
                    sender: {
                        client_unique_id: json["invokeruid"],
                        client_name: json["invokername"],
                        client_id: parseInt(json["invokerid"])
                    }
                });

                const invoker = this.connection_handler.channelTree.findClient(parseInt(json["invokerid"]));
                const conversations = this.connection_handler.side_bar.channel_conversations();
                const conversation = conversations.conversation(0);
                conversation.register_new_message({
                    sender_database_id: invoker ? invoker.properties.client_database_id : 0,
                    sender_name: json["invokername"],
                    sender_unique_id: json["invokeruid"],

                    timestamp: typeof(json["timestamp"]) === "undefined" ? Date.now() : parseInt(json["timestamp"]),
                    message: json["msg"]
                });
                this.connection_handler.channelTree.server.flag_text_unread = conversation.is_unread();
            }
        }

        notifyClientChatComposing(json) {
            json = json[0];

            const conversation_manager = this.connection_handler.side_bar.private_conversations();
            const conversation = conversation_manager.find_conversation({
                client_id: parseInt(json["clid"]),
                unique_id: json["cluid"],
                name: undefined
            }, {
                create: false,
                attach: false
            });
            if(!conversation)
                return;

            conversation.trigger_typing();
        }

        handleNotifyClientChatClosed(json) {
            json = json[0]; //Only one bulk

            //Chat partner has closed the conversation

            //clid: "6"
            //cluid: "YoWmG+dRGKD+Rxb7SPLAM5+B9tY="

            const conversation_manager = this.connection_handler.side_bar.private_conversations();
            const conversation = conversation_manager.find_conversation({
                client_id: parseInt(json["clid"]),
                unique_id: json["cluid"],
                name: undefined
            }, {
                create: false,
                attach: false
            });
            if(!conversation) {
                log.warn(LogCategory.GENERAL, tr("Received chat close for client, but we haven't a chat open."));
                return;
            }
            conversation.set_state(chat.PrivateConversationState.CLOSED);
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
            Modals.spawnPoke(this.connection_handler, {
                id: parseInt(json["invokerid"]),
                name: json["invokername"],
                unique_id: json["invokeruid"]
            }, json["msg"]);

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
            for(const entry of json) {
                const channel = this.connection.client.channelTree.findChannel(entry["cid"]);
                if(!channel) {
                    console.warn(tr("Received channel subscribed for not visible channel (cid: %d)"), entry['cid']);
                    continue;
                }

                channel.flag_subscribed = true;
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
                    this.connection.client.channelTree.deleteClient(client);
            }
        }

        handleNotifyConversationHistory(json: any[]) {
            const conversations = this.connection.client.side_bar.channel_conversations();
            const conversation = conversations.conversation(parseInt(json[0]["cid"]));
            if(!conversation) {
                log.warn(LogCategory.NETWORKING, tr("Received conversation history for invalid or unknown conversation (%o)"), json[0]["cid"]);
                return;
            }

            for(const entry of json) {
                conversation.register_new_message({
                    message: entry["msg"],
                    sender_unique_id: entry["sender_unique_id"],
                    sender_name: entry["sender_name"],
                    timestamp: parseInt(entry["timestamp"]),
                    sender_database_id: parseInt(entry["sender_database_id"])
                }, false);
            }

            /* now update the boxes */
            /* No update needed because the command which triggers this notify should update the chat box on success
            conversation.fix_scroll(true);
            conversation.handle.update_chat_box();
            */
        }

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
    }
}