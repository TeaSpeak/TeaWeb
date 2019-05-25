/// <reference path="ConnectionBase.ts" />

namespace connection {
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

            this["notifycliententerview"] = this.handleCommandClientEnterView;
            this["notifyclientleftview"] = this.handleCommandClientLeftView;
            this["notifyclientmoved"] = this.handleNotifyClientMoved;
            this["initserver"] = this.handleCommandServerInit;
            this["notifychannelmoved"] = this.handleNotifyChannelMoved;
            this["notifychanneledited"] = this.handleNotifyChannelEdited;
            this["notifytextmessage"] = this.handleNotifyTextMessage;
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
        }

        proxy_command_promise(promise: Promise<CommandResult>, options: connection.CommandOptions) {
            if(!options.process_result)
                return promise;

            return promise.catch(ex => {
                if(options.process_result) {
                    if(ex instanceof CommandResult) {
                        let res = ex;
                        if(!res.success) {
                            if(res.id == 2568) { //Permission error
                                res.message = tr("Insufficient client permissions. Failed on permission ") + this.connection_handler.permissions.resolveInfo(res.json["failed_permid"] as number).name;
                                this.connection_handler.chat.serverChat().appendError(tr("Insufficient client permissions. Failed on permission {}"), this.connection_handler.permissions.resolveInfo(res.json["failed_permid"] as number).name);
                                this.connection_handler.sound.play(Sound.ERROR_INSUFFICIENT_PERMISSIONS);
                            } else {
                                this.connection_handler.chat.serverChat().appendError(res.extra_message.length == 0 ? res.message : res.extra_message);
                            }
                        }
                    } else if(typeof(ex) === "string") {
                        this.connection_handler.chat.serverChat().appendError(tr("Command execution results in ") + ex);
                    } else {
                        console.error(tr("Invalid promise result type: %o. Result:"), typeof (ex));
                        console.error(ex);
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
                console.log(tr("Invalid return code! (%o)"), json);
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
                console.log(tr("Setting up voice"));
            } else {
                console.log(tr("Skipping voice setup (No voice bridge available)"));
            }


            json = json[0]; //Only one bulk

            this.connection.client.clientId = parseInt(json["aclid"]);
            this.connection.client.getClient().updateVariables({key: "client_nickname", value: json["acn"]});

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


            this.connection_handler.chat.serverChat().name = this.connection.client.channelTree.server.properties["virtualserver_name"];
            this.connection_handler.chat.serverChat().appendMessage(tr("Connected as {0}"), true, this.connection.client.getClient().createChatTag(true));
            this.connection_handler.sound.play(Sound.CONNECTION_CONNECTED);
            this.connection.client.onConnected();
        }

        private createChannelFromJson(json, ignoreOrder: boolean = false) {
            let tree = this.connection.client.channelTree;

            let channel = new ChannelEntry(parseInt(json["cid"]), json["channel_name"], tree.findChannel(json["cpid"]));
            tree.insertChannel(channel);
            if(json["channel_order"] !== "0") {
                let prev = tree.findChannel(json["channel_order"]);
                if(!prev && json["channel_order"] != 0) {
                    if(!ignoreOrder) {
                        console.error(tr("Invalid channel order id!"));
                        return;
                    }
                }

                let parent = tree.findChannel(json["cpid"]);
                if(!parent && json["cpid"] != 0) {
                    console.error(tr("Invalid channel parent"));
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
            console.log(tr("Got %d new channels"), json.length);
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

            console.log(tr("Got %d channel deletions"), json.length);
            for(let index = 0; index < json.length; index++) {
                let channel = tree.findChannel(json[index]["cid"]);
                if(!channel) {
                    console.error(tr("Invalid channel onDelete (Unknown channel)"));
                    continue;
                }
                tree.deleteChannel(channel);
            }
        }

        handleCommandChannelHide(json) {
            let tree = this.connection.client.channelTree;

            console.log(tr("Got %d channel hides"), json.length);
            for(let index = 0; index < json.length; index++) {
                let channel = tree.findChannel(json[index]["cid"]);
                if(!channel) {
                    console.error(tr("Invalid channel on hide (Unknown channel)"));
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
                    if(client == this.connection.client.getClient())
                        this.connection_handler.chat.channelChat().name = channel.channelName();
                    tree.moveClient(client, channel);
                }

                if(this.connection_handler.client_status.queries_visible || client.properties.client_type != ClientType.CLIENT_QUERY) {
                    const own_channel = this.connection.client.getClient().currentChannel();
                    if(reason_id == ViewReasonId.VREASON_USER_ACTION) {
                        if(own_channel == channel)
                            if(old_channel)
                                this.connection_handler.sound.play(Sound.USER_ENTERED);
                            else
                                this.connection_handler.sound.play(Sound.USER_ENTERED_CONNECT);
                        if(old_channel) {
                            this.connection_handler.chat.serverChat().appendMessage(tr("{0} appeared from {1} to {2}"), true, client.createChatTag(true), old_channel.generate_tag(true), channel.generate_tag(true));
                        } else {
                            this.connection_handler.chat.serverChat().appendMessage(tr("{0} connected to channel {1}"), true, client.createChatTag(true), channel.generate_tag(true));
                        }
                    } else if(reason_id == ViewReasonId.VREASON_MOVED) {
                        if(own_channel == channel)
                            this.connection_handler.sound.play(Sound.USER_ENTERED_MOVED);

                        this.connection_handler.chat.serverChat().appendMessage(tr("{0} appeared from {1} to {2}, moved by {3}"), true,
                            client.createChatTag(true),
                            old_channel ? old_channel.generate_tag(true) : undefined,
                            channel.generate_tag(true),
                            ClientEntry.chatTag(invokerid, invokername, invokeruid),
                        );
                    } else if(reason_id == ViewReasonId.VREASON_CHANNEL_KICK) {
                        if(own_channel == channel)
                            this.connection_handler.sound.play(Sound.USER_ENTERED_KICKED);

                        this.connection_handler.chat.serverChat().appendMessage(tr("{0} appeared from {1} to {2}, kicked by {3}{4}"), true,
                            client.createChatTag(true),
                            old_channel ? old_channel.generate_tag(true) : undefined,
                            channel.generate_tag(true),
                            ClientEntry.chatTag(invokerid, invokername, invokeruid),
                            reason_msg.length > 0 ? " (" + entry["msg"] + ")" : ""
                        );
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

                {
                    let client_chat = client.chat(false);
                    if(!client_chat) {
                        for(const c of this.connection_handler.chat.open_chats()) {
                            if(c.owner_unique_id == client.properties.client_unique_identifier && c.flag_offline) {
                                client_chat = c;
                                break;
                            }
                        }
                    }
                    if(client_chat) {
                        client_chat.appendMessage(
                            "{0}", true,
                            $.spawn("div")
                                .addClass("event-message event-partner-connect")
                                .text(tr("Your chat partner has reconnected"))
                        );
                        client_chat.flag_offline = false;
                    }
                }

                if(client instanceof LocalClientEntry) {
                    this.connection_handler.update_voice_status();
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
                    console.error(tr("Unknown client left!"));
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
                    return;
                }


                if(this.connection_handler.client_status.queries_visible || client.properties.client_type != ClientType.CLIENT_QUERY) {
                    const own_channel = this.connection.client.getClient().currentChannel();
                    let channel_from = tree.findChannel(entry["cfid"]);
                    let channel_to = tree.findChannel(entry["ctid"]);

                    if(reason_id == ViewReasonId.VREASON_USER_ACTION) {
                        this.connection_handler.chat.serverChat().appendMessage(tr("{0} disappeared from {1} to {2}"), true, client.createChatTag(true), channel_from.generate_tag(true), channel_to.generate_tag(true));

                        if(channel_from == own_channel)
                            this.connection_handler.sound.play(Sound.USER_LEFT);
                    } else if(reason_id == ViewReasonId.VREASON_SERVER_LEFT) {
                        this.connection_handler.chat.serverChat().appendMessage(tr("{0} left the server{1}"), true,
                            client.createChatTag(true),
                            entry["reasonmsg"] ? " (" + entry["reasonmsg"] + ")" : ""
                        );

                        if(channel_from == own_channel)
                            this.connection_handler.sound.play(Sound.USER_LEFT_DISCONNECT);
                    } else if(json["reasonid"] == ViewReasonId.VREASON_SERVER_KICK) {
                        this.connection_handler.chat.serverChat().appendError(tr("{0} was kicked from the server by {1}.{2}"),
                            client.createChatTag(true),
                            ClientEntry.chatTag(entry["invokerid"], entry["invokername"], entry["invokeruid"]),
                            entry["reasonmsg"] ? " (" + entry["reasonmsg"] + ")" : ""
                        );
                        if(channel_from == own_channel)
                            this.connection_handler.sound.play(Sound.USER_LEFT_KICKED_SERVER);
                    } else if(reason_id == ViewReasonId.VREASON_CHANNEL_KICK) {
                        this.connection_handler.chat.serverChat().appendError(tr("{0} was kicked from your channel by {1}.{2}"),
                            client.createChatTag(true),
                            ClientEntry.chatTag(entry["invokerid"], entry["invokername"], entry["invokeruid"]),
                            entry["reasonmsg"] ? " (" + entry["reasonmsg"] + ")" : ""
                        );

                        if(channel_from == own_channel)
                            this.connection_handler.sound.play(Sound.USER_LEFT_KICKED_CHANNEL);
                    } else if(reason_id == ViewReasonId.VREASON_BAN) {
                        //"Mulus" was banned for 1 second from the server by "WolverinDEV" (Sry brauchte kurz ein opfer :P <3 (Nohomo))
                        let duration = "permanently";
                        if(entry["bantime"])
                            duration = "for " + formatDate(Number.parseInt(entry["bantime"]));

                        this.connection_handler.chat.serverChat().appendError(tr("{0} was banned {1} by {2}.{3}"),
                            client.createChatTag(true),
                            duration,
                            ClientEntry.chatTag(entry["invokerid"], entry["invokername"], entry["invokeruid"]),
                            entry["reasonmsg"] ? " (" + entry["reasonmsg"] + ")" : ""
                        );

                        if(channel_from == own_channel)
                            this.connection_handler.sound.play(Sound.USER_LEFT_BANNED);
                    } else {
                        console.error(tr("Unknown client left reason!"));
                    }

                    {
                        const chat = client.chat(false);
                        if(chat) {
                            chat.flag_offline = true;
                            chat.appendMessage(
                                "{0}", true,
                                $.spawn("div")
                                    .addClass("event-message event-partner-disconnect")
                                    .text(tr("Your chat partner has disconnected"))
                            );
                        }
                    }
                }

                tree.deleteClient(client);
            }
        }

        handleNotifyClientMoved(json) {
            json = json[0]; //Only one bulk
            let tree = this.connection.client.channelTree;
            let client = tree.findClient(json["clid"]);
            let channel_to = tree.findChannel(json["ctid"]);
            let channel_from = tree.findChannel(json["cfid"]);

            if(!client) {
                console.error(tr("Unknown client move (Client)!"));
                return 0;
            }

            if(!channel_to) {
                console.error(tr("Unknown client move (Channel to)!"));
                return 0;
            }
            if(!channel_from) //Not critical
                console.error(tr("Unknown client move (Channel from)!"));

            let self = client instanceof LocalClientEntry;
            let current_clients: ClientEntry[];
            if(self) {
                this.connection_handler.chat.channelChat().name = channel_to.channelName();
                current_clients = client.channelTree.clientsByChannel(client.currentChannel());
                this.connection_handler.update_voice_status(channel_to);
            }

            tree.moveClient(client, channel_to);
            for(const entry of current_clients || [])
                if(entry !== client && entry.get_audio_handle())
                    entry.get_audio_handle().abort_replay();

            const own_channel = this.connection.client.getClient().currentChannel();
            if(json["reasonid"] == ViewReasonId.VREASON_MOVED) {
                this.connection_handler.chat.serverChat().appendMessage(self ? tr("You was moved by {3} from channel {1} to {2}") : tr("{0} was moved from channel {1} to {2} by {3}"), true,
                    client.createChatTag(true),
                    channel_from ? channel_from.generate_tag(true) : undefined,
                    channel_to.generate_tag(true),
                    ClientEntry.chatTag(json["invokerid"], json["invokername"], json["invokeruid"])
                );
                if(self)
                    this.connection_handler.sound.play(Sound.USER_MOVED_SELF);
                else if(own_channel == channel_to)
                    this.connection_handler.sound.play(Sound.USER_ENTERED_MOVED);
                else if(own_channel == channel_from)
                    this.connection_handler.sound.play(Sound.USER_LEFT_MOVED);
            } else if(json["reasonid"] == ViewReasonId.VREASON_USER_ACTION) {
                this.connection_handler.chat.serverChat().appendMessage(self ? tr("You switched from channel {1} to {2}") : tr("{0} switched from channel {1} to {2}"), true,
                    client.createChatTag(true),
                    channel_from ? channel_from.generate_tag(true) : undefined,
                    channel_to.generate_tag(true)
                );
                if(self) {} //If we do an action we wait for the error response
                else if(own_channel == channel_to)
                    this.connection_handler.sound.play(Sound.USER_ENTERED);
                else if(own_channel == channel_from)
                    this.connection_handler.sound.play(Sound.USER_LEFT);
            } else if(json["reasonid"] == ViewReasonId.VREASON_CHANNEL_KICK) {
                this.connection_handler.chat.serverChat().appendMessage(self ? tr("You got kicked out of the channel {1} to channel {2} by {3}{4}") : tr("{0} got kicked from channel {1} to {2} by {3}{4}"), true,
                    client.createChatTag(true),
                    channel_from ? channel_from.generate_tag(true) : undefined,
                    channel_to.generate_tag(true),
                    ClientEntry.chatTag(json["invokerid"], json["invokername"], json["invokeruid"]),
                    json["reasonmsg"] ? " (" + json["reasonmsg"] + ")" : ""
                );
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
            for(let key in json)
                console.log("Key: " + key + " Value: " + json[key]);

            let tree = this.connection.client.channelTree;
            let channel = tree.findChannel(json["cid"]);
            if(!channel) {
                console.error(tr("Unknown channel move (Channel)!"));
                return 0;
            }

            let prev = tree.findChannel(json["order"]);
            if(!prev && json["order"] != 0) {
                console.error(tr("Unknown channel move (prev)!"));
                return 0;
            }

            let parent = tree.findChannel(json["cpid"]);
            if(!parent && json["cpid"] != 0) {
                console.error(tr("Unknown channel move (parent)!"));
                return 0;
            }

            tree.moveChannel(channel, prev, parent);
        }

        handleNotifyChannelEdited(json) {
            json = json[0]; //Only one bulk

            let tree = this.connection.client.channelTree;
            let channel = tree.findChannel(json["cid"]);
            if(!channel) {
                console.error(tr("Unknown channel edit (Channel)!"));
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
        }

        handleNotifyTextMessage(json) {
            json = json[0]; //Only one bulk

            let mode = json["targetmode"];
            if(mode == 1){
                let invoker = this.connection.client.channelTree.findClient(json["invokerid"]);
                let target = this.connection.client.channelTree.findClient(json["target"]);
                if(!invoker) { //TODO spawn chat (Client is may invisible)
                    console.error(tr("Got private message from invalid client!"));
                    return;
                }
                if(!target) { //TODO spawn chat (Client is may invisible)
                    console.error(tr("Got private message from invalid client!"));
                    return;
                }
                if(invoker == this.connection.client.getClient()) {
                    this.connection_handler.sound.play(Sound.MESSAGE_SEND, {default_volume: .5});
                    target.chat(true).appendMessage("{0}: {1}", true, this.connection.client.getClient().createChatTag(true), MessageHelper.bbcode_chat(json["msg"]));
                } else {
                    this.connection_handler.sound.play(Sound.MESSAGE_RECEIVED, {default_volume: .5});
                    invoker.chat(true).appendMessage("{0}: {1}", true, ClientEntry.chatTag(json["invokerid"], json["invokername"], json["invokeruid"], true), MessageHelper.bbcode_chat(json["msg"]));
                }
            } else if(mode == 2) {
                if(json["invokerid"] == this.connection.client.clientId)
                    this.connection_handler.sound.play(Sound.MESSAGE_SEND, {default_volume: .5});
                else
                    this.connection_handler.sound.play(Sound.MESSAGE_RECEIVED, {default_volume: .5});
                this.connection_handler.chat.channelChat().appendMessage("{0}: {1}", true, ClientEntry.chatTag(json["invokerid"], json["invokername"], json["invokeruid"], true), MessageHelper.bbcode_chat(json["msg"]))
            } else if(mode == 3) {
                this.connection_handler.chat.serverChat().appendMessage("{0}: {1}", true, ClientEntry.chatTag(json["invokerid"], json["invokername"], json["invokeruid"], true), MessageHelper.bbcode_chat(json["msg"]));
            }
        }

        handleNotifyClientChatClosed(json) {
            json = json[0]; //Only one bulk

            //Chat partner has closed the conversation

            //clid: "6"
            //cluid: "YoWmG+dRGKD+Rxb7SPLAM5+B9tY="

            const client = this.connection.client.channelTree.findClient(json["clid"]);
            if(!client) {
                log.warn(LogCategory.GENERAL, tr("Received chat close for unknown client"));
                return;
            }
            if(client.properties.client_unique_identifier !== json["cluid"]) {
                log.warn(LogCategory.GENERAL, tr("Received chat close for client, but unique ids dosn't match. (expected %o, received %o)"), client.properties.client_unique_identifier, json["cluid"]);
                return;
            }

            const chat = client.chat(false);
            if(!chat) {
                log.warn(LogCategory.GENERAL, tr("Received chat close for client, but we haven't a chat open."));
                return;
            }
            chat.flag_offline = true;
            chat.appendMessage(
                "{0}", true,
                $.spawn("div")
                    .addClass("event-message event-partner-closed")
                    .text(tr("Your chat partner has close the conversation"))
            );
        }

        handleNotifyClientUpdated(json) {
            json = json[0]; //Only one bulk

            let client = this.connection.client.channelTree.findClient(json["clid"]);
            if(!client) {
                console.error(tr("Tried to update an non existing client"));
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
            if(this.connection.client.select_info.currentSelected == client)
                this.connection.client.select_info.update();
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
            if(this.connection.client.select_info.currentSelected == this.connection.client.channelTree.server)
                this.connection.client.select_info.update();
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
            let info = this.connection.client.select_info;
            if(info.currentSelected instanceof ServerEntry)
                info.update();
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
    }
}