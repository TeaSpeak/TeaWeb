namespace connection {
    export class CommandHelper extends AbstractCommandHandler {
        private _callbacks_namefromuid: ClientNameFromUid[] = [];
        private _who_am_i: any;

        constructor(connection) {
            super(connection);

            this.volatile_handler_boss = false;
            this.ignore_consumed = true;
        }

        initialize() {
            this.connection.command_handler_boss().register_handler(this);
            /* notifyquerylist */
        }

        handle_command(command: connection.ServerCommand): boolean {
            if(command.command == "notifyclientnamefromuid")
                this.handle_notifyclientnamefromuid(command.arguments);
            else
                return false;
            return true;
        }

        joinChannel(channel: ChannelEntry, password?: string) : Promise<CommandResult> {
            return this.connection.send_command("clientmove", {
                "clid": this.connection.client.getClientId(),
                "cid": channel.getChannelId(),
                "cpw": password || ""
            });
        }

        sendMessage(message: string, type: ChatType, target?: ChannelEntry | ClientEntry) : Promise<CommandResult> {
            if(type == ChatType.SERVER)
                return this.connection.send_command("sendtextmessage", {"targetmode": 3, "target": 0, "msg": message});
            else if(type == ChatType.CHANNEL)
                return this.connection.send_command("sendtextmessage", {"targetmode": 2, "target": (target as ChannelEntry).getChannelId(), "msg": message});
            else if(type == ChatType.CLIENT)
                return this.connection.send_command("sendtextmessage", {"targetmode": 1, "target": (target as ClientEntry).clientId(), "msg": message});
        }

        updateClient(key: string, value: string) : Promise<CommandResult> {
            let data = {};
            data[key] = value;
            return this.connection.send_command("clientupdate", data);
        }

        info_from_uid(...uid: string[]) : Promise<ClientNameInfo[]> {
            let uids = [...uid];
            for(let p of this._callbacks_namefromuid)
                if(p.keys == uids) return p.promise;

            let req: ClientNameFromUid = {} as any;
            req.keys = uids;
            req.response = new Array(uids.length);
            req.promise = new LaterPromise<ClientNameInfo[]>();

            for(let uid of uids) {
                this.connection.send_command("clientgetnamefromuid", {
                    cluid: uid
                }).catch(req.promise.function_rejected());
            }

            this._callbacks_namefromuid.push(req);
            return req.promise;
        }

        request_query_list(server_id: number = undefined) : Promise<QueryList> {
            return new Promise<QueryList>((resolve, reject) => {
                const single_handler = {
                    command: "notifyquerylist",
                    function: command => {
                        const json = command.arguments;

                        const result = {} as QueryList;

                        result.flag_all = json[0]["flag_all"];
                        result.flag_own = json[0]["flag_own"];
                        result.queries = [];

                        for(const entry of json) {
                            const rentry = {} as QueryListEntry;
                            rentry.bounded_server = entry["client_bounded_server"];
                            rentry.username = entry["client_login_name"];
                            rentry.unique_id = entry["client_unique_identifier"];

                            result.queries.push(rentry);
                        }

                        resolve(result);
                        return true;
                    }
                };
                this.handler_boss.register_single_handler(single_handler);

                let data = {};
                if(server_id !== undefined)
                    data["server_id"] = server_id;

                this.connection.send_command("querylist", data).catch(error => {
                    this.handler_boss.remove_single_handler(single_handler);

                    if(error instanceof CommandResult) {
                        if(error.id == ErrorID.EMPTY_RESULT) {
                            resolve(undefined);
                            return;
                        }
                    }
                    reject(error);
                });
            });
        }

        request_playlist_list() : Promise<Playlist[]> {
            return new Promise((resolve, reject) => {
                const single_handler: SingleCommandHandler = {
                    command: "notifyplaylistlist",
                    function: command => {
                        const json = command.arguments;
                        const result: Playlist[] = [];

                        for(const entry of json) {
                            try {
                                result.push({
                                    playlist_id: parseInt(entry["playlist_id"]),
                                    playlist_bot_id: parseInt(entry["playlist_bot_id"]),
                                    playlist_title: entry["playlist_title"],
                                    playlist_type: parseInt(entry["playlist_type"]),
                                    playlist_owner_dbid: parseInt(entry["playlist_owner_dbid"]),
                                    playlist_owner_name: entry["playlist_owner_name"],

                                    needed_power_modify: parseInt(entry["needed_power_modify"]),
                                    needed_power_permission_modify: parseInt(entry["needed_power_permission_modify"]),
                                    needed_power_delete: parseInt(entry["needed_power_delete"]),
                                    needed_power_song_add: parseInt(entry["needed_power_song_add"]),
                                    needed_power_song_move: parseInt(entry["needed_power_song_move"]),
                                    needed_power_song_remove: parseInt(entry["needed_power_song_remove"])
                                });
                            } catch(error) {
                                log.error(LogCategory.NETWORKING, tr("Failed to parse playlist entry: %o"), error);
                            }
                        }

                        resolve(result);
                        return true;
                    }
                };
                this.handler_boss.register_single_handler(single_handler);

                this.connection.send_command("playlistlist").catch(error => {
                    this.handler_boss.remove_single_handler(single_handler);

                    if(error instanceof CommandResult) {
                        if(error.id == ErrorID.EMPTY_RESULT) {
                            resolve([]);
                            return;
                        }
                    }
                    reject(error);
                })
            });
        }

        request_playlist_songs(playlist_id: number) : Promise<PlaylistSong[]> {
            return new Promise((resolve, reject) => {
                const single_handler: SingleCommandHandler = {
                    command: "notifyplaylistsonglist",
                    function: command => {
                        const json = command.arguments;

                        if(json[0]["playlist_id"] != playlist_id) {
                            log.error(LogCategory.NETWORKING, tr("Received invalid notification for playlist songs"));
                            return false;
                        }

                        const result: PlaylistSong[] = [];

                        for(const entry of json) {
                            try {
                                result.push({
                                    song_id: parseInt(entry["song_id"]),
                                    song_invoker: entry["song_invoker"],
                                    song_previous_song_id: parseInt(entry["song_previous_song_id"]),
                                    song_url: entry["song_url"],
                                    song_url_loader: entry["song_url_loader"],

                                    song_loaded: entry["song_loaded"] == true || entry["song_loaded"] == "1",
                                    song_metadata: entry["song_metadata"]
                                });
                            } catch(error) {
                                log.error(LogCategory.NETWORKING, tr("Failed to parse playlist song entry: %o"), error);
                            }
                        }

                        resolve(result);
                        return true;
                    }
                };
                this.handler_boss.register_single_handler(single_handler);

                this.connection.send_command("playlistsonglist", {playlist_id: playlist_id}).catch(error => {
                    this.handler_boss.remove_single_handler(single_handler);
                    if(error instanceof CommandResult) {
                        if(error.id == ErrorID.EMPTY_RESULT) {
                            resolve([]);
                            return;
                        }
                    }
                    reject(error);
                })
            });
        }

        request_playlist_info(playlist_id: number) : Promise<PlaylistInfo> {
            return new Promise((resolve, reject) => {
                const single_handler: SingleCommandHandler = {
                    command: "notifyplaylistinfo",
                    function: command => {
                        const json = command.arguments[0];
                        if (json["playlist_id"] != playlist_id) {
                            log.error(LogCategory.NETWORKING, tr("Received invalid notification for playlist info"));
                            return;
                        }

                        try {
                            //resolve
                            resolve({
                                playlist_id: parseInt(json["playlist_id"]),
                                playlist_title: json["playlist_title"],
                                playlist_description: json["playlist_description"],
                                playlist_type: parseInt(json["playlist_type"]),

                                playlist_owner_dbid: parseInt(json["playlist_owner_dbid"]),
                                playlist_owner_name: json["playlist_owner_name"],

                                playlist_flag_delete_played: json["playlist_flag_delete_played"] == true || json["playlist_flag_delete_played"] == "1",
                                playlist_flag_finished: json["playlist_flag_finished"] == true || json["playlist_flag_finished"] == "1",
                                playlist_replay_mode: parseInt(json["playlist_replay_mode"]),
                                playlist_current_song_id: parseInt(json["playlist_current_song_id"]),
                            });
                        } catch (error) {
                            log.error(LogCategory.NETWORKING, tr("Failed to parse playlist info: %o"), error);
                            reject("failed to parse info");
                        }

                        return true;
                    }
                };
                this.handler_boss.register_single_handler(single_handler);

                this.connection.send_command("playlistinfo", {playlist_id: playlist_id}).catch(error => {
                    this.handler_boss.remove_single_handler(single_handler);
                    reject(error);
                })
            });
        }

        /**
         * @deprecated
         *  Its just a workaround for the query management.
         *  There is no garante that the whoami trick will work forever
         */
        current_virtual_server_id() : Promise<number> {
            if(this._who_am_i)
                return Promise.resolve(parseInt(this._who_am_i["virtualserver_id"]));

            return new Promise<number>((resolve, reject) => {
                const single_handler: SingleCommandHandler = {
                    function: command => {
                        if(command.command != "")
                            return false;

                        this._who_am_i = command.arguments[0];
                        resolve(parseInt(this._who_am_i["virtualserver_id"]));
                        return true;
                    }
                };
                this.handler_boss.register_single_handler(single_handler);

                this.connection.send_command("whoami").catch(error => {
                    this.handler_boss.remove_single_handler(single_handler);
                    reject(error);
                });
            });
        }

        private handle_notifyclientnamefromuid(json: any[]) {
            for(let entry of json) {
                let info: ClientNameInfo = {} as any;
                info.client_unique_id = entry["cluid"];
                info.client_nickname = entry["clname"];
                info.client_database_id = parseInt(entry["cldbid"]);

                for(let elm of this._callbacks_namefromuid.slice(0)) {
                    let unset = 0;
                    for(let index = 0; index < elm.keys.length; index++) {
                        if(elm.keys[index] == info.client_unique_id) {
                            elm.response[index] = info;
                        }
                        if(elm.response[index] == undefined) unset++;
                    }
                    if(unset == 0) {
                        this._callbacks_namefromuid.remove(elm);
                        elm.promise.resolved(elm.response);
                    }
                }
            }
        }
    }
}