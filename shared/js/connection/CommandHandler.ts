namespace connection {
    export class ServerConnectionCommandBoss extends AbstractCommandHandlerBoss {
        constructor(connection: AbstractServerConnection) {
            super(connection);
        }
    }

    export class ConnectionCommandHandler extends AbstractCommandHandler {
        readonly connection: ServerConnection;

        constructor(connection: ServerConnection) {
            super(connection);

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
            this["notifyclientupdated"] = this.handleNotifyClientUpdated;
            this["notifyserveredited"] = this.handleNotifyServerEdited;
            this["notifyserverupdated"] = this.handleNotifyServerUpdated;

            this["notifyclientpoke"] = this.handleNotifyClientPoke;

            this["notifymusicplayerinfo"] = this.handleNotifyMusicPlayerInfo;

            this["notifyservergroupclientadded"] = this.handleNotifyServerGroupClientAdd;
            this["notifyservergroupclientdeleted"] = this.handleNotifyServerGroupClientRemove;
            this["notifyclientchannelgroupchanged"] = this.handleNotifyClientChannelGroupChanged;
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
            if(code.length == 0) {
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
            if( this.connection.client.voiceConnection) {
                console.log(tr("Setting up voice"));
                this.connection.client.voiceConnection.createSession();
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


            chat.serverChat().name = this.connection.client.channelTree.server.properties["virtualserver_name"];
            chat.serverChat().appendMessage(tr("Connected as {0}"), true, this.connection.client.getClient().createChatTag(true));
            sound.play(Sound.CONNECTION_CONNECTED);
            globalClient.onConnected();
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
            json = json[0]; //Only one bulk
            let tree = this.connection.client.channelTree;

            let client: ClientEntry;
            let channel = tree.findChannel(json["ctid"]);
            let old_channel = tree.findChannel(json["cfid"]);

            client = tree.findClient(json["clid"]);

            if(!client) {
                if(parseInt(json["client_type_exact"]) == ClientType.CLIENT_MUSIC) {
                    client = new MusicClientEntry(parseInt(json["clid"]), json["client_nickname"]);
                } else {
                    client = new ClientEntry(parseInt(json["clid"]), json["client_nickname"]);
                }

                client.properties.client_type = parseInt(json["client_type"]);
                client = tree.insertClient(client, channel);
            } else {
                if(client == this.connection.client.getClient())
                    chat.channelChat().name = channel.channelName();
                tree.moveClient(client, channel);
            }

            if(this.connection.client.controlBar.query_visible || client.properties.client_type != ClientType.CLIENT_QUERY) {
                const own_channel = this.connection.client.getClient().currentChannel();
                if(json["reasonid"] == ViewReasonId.VREASON_USER_ACTION) {
                    if(own_channel == channel)
                        if(old_channel)
                            sound.play(Sound.USER_ENTERED);
                        else
                            sound.play(Sound.USER_ENTERED_CONNECT);
                    if(old_channel) {
                        chat.serverChat().appendMessage(tr("{0} appeared from {1} to {2}"), true, client.createChatTag(true), old_channel.generate_tag(true), channel.generate_tag(true));
                    } else {
                        chat.serverChat().appendMessage(tr("{0} connected to channel {1}"), true, client.createChatTag(true), channel.generate_tag(true));
                    }
                } else if(json["reasonid"] == ViewReasonId.VREASON_MOVED) {
                    if(own_channel == channel)
                        sound.play(Sound.USER_ENTERED_MOVED);

                    chat.serverChat().appendMessage(tr("{0} appeared from {1} to {2}, moved by {3}"), true,
                        client.createChatTag(true),
                        old_channel ? old_channel.generate_tag(true) : undefined,
                        channel.generate_tag(true),
                        ClientEntry.chatTag(json["invokerid"], json["invokername"], json["invokeruid"]),
                    );
                } else if(json["reasonid"] == ViewReasonId.VREASON_CHANNEL_KICK) {
                    if(own_channel == channel)
                        sound.play(Sound.USER_ENTERED_KICKED);

                    chat.serverChat().appendMessage(tr("{0} appeared from {1} to {2}, kicked by {3}{4}"), true,
                        client.createChatTag(true),
                        old_channel ? old_channel.generate_tag(true) : undefined,
                        channel.generate_tag(true),
                        ClientEntry.chatTag(json["invokerid"], json["invokername"], json["invokeruid"]),
                        json["reasonmsg"] > 0 ? " (" + json["msg"] + ")" : ""
                    );
                } else {
                    console.warn(tr("Unknown reasonid for %o"), json["reasonid"]);
                }
            }

            let updates: {
                key: string,
                value: string
            }[] = [];

            for(let key in json) {
                if(key == "cfid") continue;
                if(key == "ctid") continue;
                if(key === "invokerid") continue;
                if(key === "invokername") continue;
                if(key === "invokeruid") continue;
                if(key === "reasonid") continue;

                updates.push({key: key, value: json[key]});
            }

            client.updateVariables(...updates);

            if(client instanceof LocalClientEntry)
                this.connection.client.controlBar.updateVoice();
        }

        handleCommandClientLeftView(json) {
            json = json[0]; //Only one bulk
            let tree = this.connection.client.channelTree;
            let client = tree.findClient(json["clid"]);
            if(!client) {
                console.error(tr("Unknown client left!"));
                return 0;
            }
            if(client == this.connection.client.getClient()) {
                if(json["reasonid"] == ViewReasonId.VREASON_BAN) {
                    this.connection.client.handleDisconnect(DisconnectReason.CLIENT_BANNED, json);
                } else if(json["reasonid"] == ViewReasonId.VREASON_SERVER_KICK) {
                    this.connection.client.handleDisconnect(DisconnectReason.CLIENT_KICKED, json);
                } else if(json["reasonid"] == ViewReasonId.VREASON_SERVER_SHUTDOWN) {
                    this.connection.client.handleDisconnect(DisconnectReason.SERVER_CLOSED, json);
                } else if(json["reasonid"] == ViewReasonId.VREASON_SERVER_STOPPED) {
                    this.connection.client.handleDisconnect(DisconnectReason.SERVER_CLOSED, json);
                } else
                    this.connection.client.handleDisconnect(DisconnectReason.UNKNOWN, json);
                return;
            }

            if(this.connection.client.controlBar.query_visible || client.properties.client_type != ClientType.CLIENT_QUERY) {
                const own_channel = this.connection.client.getClient().currentChannel();
                let channel_from = tree.findChannel(json["cfid"]);
                let channel_to = tree.findChannel(json["ctid"]);

                if(json["reasonid"] == ViewReasonId.VREASON_USER_ACTION) {
                    chat.serverChat().appendMessage(tr("{0} disappeared from {1} to {2}"), true, client.createChatTag(true), channel_from.generate_tag(true), channel_to.generate_tag(true));

                    if(channel_from == own_channel)
                        sound.play(Sound.USER_LEFT);
                } else if(json["reasonid"] == ViewReasonId.VREASON_SERVER_LEFT) {
                    chat.serverChat().appendMessage(tr("{0} left the server{1}"), true,
                        client.createChatTag(true),
                        json["reasonmsg"] ? " (" + json["reasonmsg"] + ")" : ""
                    );

                    if(channel_from == own_channel)
                        sound.play(Sound.USER_LEFT_DISCONNECT);
                } else if(json["reasonid"] == ViewReasonId.VREASON_SERVER_KICK) {
                    chat.serverChat().appendError(tr("{0} was kicked from the server by {1}.{2}"),
                        client.createChatTag(true),
                        ClientEntry.chatTag(json["invokerid"], json["invokername"], json["invokeruid"]),
                        json["reasonmsg"] ? " (" + json["reasonmsg"] + ")" : ""
                    );
                    if(channel_from == own_channel)
                        sound.play(Sound.USER_LEFT_KICKED_SERVER);
                } else if(json["reasonid"] == ViewReasonId.VREASON_CHANNEL_KICK) {
                    chat.serverChat().appendError(tr("{0} was kicked from your channel by {1}.{2}"),
                        client.createChatTag(true),
                        ClientEntry.chatTag(json["invokerid"], json["invokername"], json["invokeruid"]),
                        json["reasonmsg"] ? " (" + json["reasonmsg"] + ")" : ""
                    );

                    if(channel_from == own_channel)
                        sound.play(Sound.USER_LEFT_KICKED_CHANNEL);
                } else if(json["reasonid"] == ViewReasonId.VREASON_BAN) {
                    //"Mulus" was banned for 1 second from the server by "WolverinDEV" (Sry brauchte kurz ein opfer :P <3 (Nohomo))
                    let duration = "permanently";
                    if(json["bantime"])
                        duration = "for " + formatDate(Number.parseInt(json["bantime"]));

                    chat.serverChat().appendError(tr("{0} was banned {1} by {2}.{3}"),
                        client.createChatTag(true),
                        duration,
                        ClientEntry.chatTag(json["invokerid"], json["invokername"], json["invokeruid"]),
                        json["reasonmsg"] ? " (" + json["reasonmsg"] + ")" : ""
                    );

                    if(channel_from == own_channel)
                        sound.play(Sound.USER_LEFT_BANNED);
                } else {
                    console.error(tr("Unknown client left reason!"));
                }
            }

            tree.deleteClient(client);
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
            let current_clients;
            if(self) {
                chat.channelChat().name = channel_to.channelName();
                current_clients = client.channelTree.clientsByChannel(client.currentChannel())
                this.connection.client.controlBar.updateVoice(channel_to);
            }

            tree.moveClient(client, channel_to);
            for(const entry of current_clients || [])
                if(entry !== client) entry.getAudioController().stopAudio(true);

            const own_channel = this.connection.client.getClient().currentChannel();
            if(json["reasonid"] == ViewReasonId.VREASON_MOVED) {
                chat.serverChat().appendMessage(self ? tr("You was moved by {3} from channel {1} to {2}") : tr("{0} was moved from channel {1} to {2} by {3}"), true,
                    client.createChatTag(true),
                    channel_from ? channel_from.generate_tag(true) : undefined,
                    channel_to.generate_tag(true),
                    ClientEntry.chatTag(json["invokerid"], json["invokername"], json["invokeruid"])
                );
                if(self)
                    sound.play(Sound.USER_MOVED_SELF);
                else if(own_channel == channel_to)
                    sound.play(Sound.USER_ENTERED_MOVED);
                else if(own_channel == channel_from)
                    sound.play(Sound.USER_LEFT_MOVED);
            } else if(json["reasonid"] == ViewReasonId.VREASON_USER_ACTION) {
                chat.serverChat().appendMessage(self ? tr("You switched from channel {1} to {2}") : tr("{0} switched from channel {1} to {2}"), true,
                    client.createChatTag(true),
                    channel_from ? channel_from.generate_tag(true) : undefined,
                    channel_to.generate_tag(true)
                );
                if(self) {} //If we do an action we wait for the error response
                else if(own_channel == channel_to)
                    sound.play(Sound.USER_ENTERED);
                else if(own_channel == channel_from)
                    sound.play(Sound.USER_LEFT);
            } else if(json["reasonid"] == ViewReasonId.VREASON_CHANNEL_KICK) {
                chat.serverChat().appendMessage(self ? tr("You got kicked out of the channel {1} to channel {2} by {3}{4}") : tr("{0} got kicked from channel {1} to {2} by {3}{4}"), true,
                    client.createChatTag(true),
                    channel_from ? channel_from.generate_tag(true) : undefined,
                    channel_to.generate_tag(true),
                    ClientEntry.chatTag(json["invokerid"], json["invokername"], json["invokeruid"]),
                    json["reasonmsg"] ? " (" + json["reasonmsg"] + ")" : ""
                );
                if(self) {
                    sound.play(Sound.CHANNEL_KICKED);
                } else if(own_channel == channel_to)
                    sound.play(Sound.USER_ENTERED_KICKED);
                else if(own_channel == channel_from)
                    sound.play(Sound.USER_LEFT_KICKED_CHANNEL);
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

            //TODO chat format?
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
                    sound.play(Sound.MESSAGE_SEND, {default_volume: .5});
                    target.chat(true).appendMessage("{0}: {1}", true, this.connection.client.getClient().createChatTag(true), MessageHelper.bbcode_chat(json["msg"]));
                } else {
                    sound.play(Sound.MESSAGE_RECEIVED, {default_volume: .5});
                    invoker.chat(true).appendMessage("{0}: {1}", true, ClientEntry.chatTag(json["invokerid"], json["invokername"], json["invokeruid"], true), MessageHelper.bbcode_chat(json["msg"]));
                }
            } else if(mode == 2) {
                if(json["invokerid"] == this.connection.client.clientId)
                    sound.play(Sound.MESSAGE_SEND, {default_volume: .5});
                else
                    sound.play(Sound.MESSAGE_RECEIVED, {default_volume: .5});
                chat.channelChat().appendMessage("{0}: {1}", true, ClientEntry.chatTag(json["invokerid"], json["invokername"], json["invokeruid"], true), MessageHelper.bbcode_chat(json["msg"]))
            } else if(mode == 3) {
                chat.serverChat().appendMessage("{0}: {1}", true, ClientEntry.chatTag(json["invokerid"], json["invokername"], json["invokeruid"], true), MessageHelper.bbcode_chat(json["msg"]));
            }
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
            if(this.connection.client.selectInfo.currentSelected == client)
                this.connection.client.selectInfo.update();
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
            if(this.connection.client.selectInfo.currentSelected == this.connection.client.channelTree.server)
                this.connection.client.selectInfo.update();
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
            let info = this.connection.client.selectInfo;
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
            Modals.spawnPoke({
                id: parseInt(json["invokerid"]),
                name: json["invokername"],
                unique_id: json["invokeruid"]
            }, json["msg"]);

            sound.play(Sound.USER_POKED_SELF);
        }

        //TODO server chat message
        handleNotifyServerGroupClientAdd(json) {
            json = json[0];

            const self = this.connection.client.getClient();
            if(json["clid"] == self.clientId())
                sound.play(Sound.GROUP_SERVER_ASSIGNED_SELF);
        }

        //TODO server chat message
        handleNotifyServerGroupClientRemove(json) {
            json = json[0];

            const self = this.connection.client.getClient();
            if(json["clid"] == self.clientId()) {
                sound.play(Sound.GROUP_SERVER_REVOKED_SELF);
            } else {
            }
        }

        //TODO server chat message
        handleNotifyClientChannelGroupChanged(json) {
            json = json[0];

            const self = this.connection.client.getClient();
            if(json["clid"] == self.clientId()) {
                sound.play(Sound.GROUP_CHANNEL_CHANGED_SELF);
            }
        }
    }
}