namespace events {
    export interface EventConvert<All> {
        as<T extends keyof All>() : All[T];
    }

    export interface Event<T> {
        readonly type: T;
    }

    export class SingletonEvent implements Event<"singletone-instance"> {
        static readonly instance = new SingletonEvent();

        readonly type = "singletone-instance";
        private constructor() { }
    }

    export class Registry<Events> {
        private readonly registry_uuid;

        private handler: {[key: string]: ((event) => void)[]} = {};
        private connections: {[key: string]:Registry<string>[]} = {};
        private debug_prefix = undefined;

        constructor() {
            this.registry_uuid = "evreg_data_" + guid();
        }


        enable_debug(prefix: string) { this.debug_prefix = prefix || "---"; }
        disable_debug() { this.debug_prefix = undefined; }

        on<T extends keyof Events>(event: T, handler: (event?: Events[T] & Event<T> & EventConvert<Events>) => void);
        on(events: (keyof Events)[], handler: (event?: Event<keyof Events> & EventConvert<Events>) => void);
        on(events, handler) {
            if(!Array.isArray(events))
                events = [events];

            handler[this.registry_uuid] = {
                singleshot: false
            };
            for(const event of events) {
                const handlers = this.handler[event] || (this.handler[event] = []);
                handlers.push(handler);
            }
        }

        /* one */
        one<T extends keyof Events>(event: T, handler: (event?: Events[T] & Event<T> & EventConvert<Events>) => void);
        one(events: (keyof Events)[], handler: (event?: Event<keyof Events> & EventConvert<Events>) => void);
        one(events, handler) {
            if(!Array.isArray(events))
                events = [events];

            for(const event of events) {
                const handlers = this.handler[event] || (this.handler[event] = []);

                handler[this.registry_uuid] = { singleshot: true };
                handlers.push(handler);
            }
        }

        off<T extends keyof Events>(handler: (event?: Event<T>) => void);
        off<T extends keyof Events>(event: T, handler: (event?: Event<T> & EventConvert<Events>) => void);
        off(event: (keyof Events)[], handler: (event?: Event<keyof Events> & EventConvert<Events>) => void);
        off(handler_or_events, handler?) {
            if(typeof handler_or_events === "function") {
                for(const key of Object.keys(this.handler))
                    this.handler[key].remove(handler_or_events);
            } else {
                if(!Array.isArray(handler_or_events))
                    handler_or_events = [handler_or_events];

                for(const event of handler_or_events) {
                    const handlers = this.handler[event];
                    if(handlers) handlers.remove(handler);
                }
            }
        }

        connect<EOther, T extends keyof Events & keyof EOther>(event: T, target: Registry<EOther>) {
            (this.connections[event as string] || (this.connections[event as string] = [])).push(target as any);
        }

        disconnect<EOther, T extends keyof Events & keyof EOther>(event: T, target: Registry<EOther>) {
            (this.connections[event as string] || []).remove(target as any);
        }

        disconnect_all<EOther>(target: Registry<EOther>) {
            for(const event of Object.keys(this.connections))
                this.connections[event].remove(target as any);
        }

        fire<T extends keyof Events>(event_type: T, data?: Events[T]) {
            if(this.debug_prefix) console.log("[%s] Trigger event: %s", this.debug_prefix, event_type);

            const event = Object.assign(typeof data === "undefined" ? SingletonEvent.instance : data, {
                type: event_type,
                as: function () { return this; }
            });

            for(const handler of (this.handler[event_type as string] || [])) {
                handler(event);

                const reg_data = handler[this.registry_uuid];
                if(typeof reg_data === "object" && reg_data.singleshot)
                    this.handler[event_type as string].remove(handler);
            }

            for(const evhandler of (this.connections[event_type as string] || []))
                evhandler.fire(event_type as any, event as any);
        }

        fire_async<T extends keyof Events>(event_type: T, data?: Events[T]) {
            setTimeout(() => this.fire(event_type, data));
        }

        destory() {
            this.handler = {};
        }
    }

    namespace global {

    }

    export namespace channel_tree {
        export interface client {
            "enter_view": {},
            "left_view": {},

            "property_update": {
                properties: string[]
            },

            "music_status_update": {
                player_buffered_index: number,
                player_replay_index: number
            },
            "music_song_change": {
                "song": SongInfo
            },

            /* TODO: Move this out of the music bots interface? */
            "playlist_song_add": { song: PlaylistSong },
            "playlist_song_remove": { song_id: number },
            "playlist_song_reorder": { song_id: number, previous_song_id: number },
            "playlist_song_loaded": { song_id: number, success: boolean, error_msg?: string, metadata?: string },
        }
    }

    export namespace sidebar {
        export interface music {
            "open": {}, /* triggers when frame should be shown */
            "close": {}, /* triggers when frame will be closed */

            "bot_change": {
                old: MusicClientEntry | undefined,
                new: MusicClientEntry | undefined
            },
            "bot_property_update": {
                properties: string[]
            },

            "action_play": {},
            "action_pause": {},
            "action_song_set": { song_id: number },
            "action_forward": {},
            "action_rewind": {},
            "action_forward_ms": {
                units: number;
            },
            "action_rewind_ms": {
                units: number;
            },
            "action_song_add": {},
            "action_song_delete": { song_id: number },
            "action_playlist_reload": {},

            "playtime_move_begin": {},
            "playtime_move_end": {
                canceled: boolean,
                target_time?: number
            },

            "reorder_begin": { song_id: number; entry: JQuery },
            "reorder_end": { song_id: number; canceled: boolean; entry: JQuery; previous_entry?: number },

            "player_time_update": channel_tree.client["music_status_update"],
            "player_song_change": channel_tree.client["music_song_change"],

            "playlist_song_add": channel_tree.client["playlist_song_add"] & { insert_effect?: boolean },
            "playlist_song_remove": channel_tree.client["playlist_song_remove"],
            "playlist_song_reorder": channel_tree.client["playlist_song_reorder"],
            "playlist_song_loaded": channel_tree.client["playlist_song_loaded"] & { html_entry?: JQuery },
        }
    }

    export namespace modal {
        export type BotStatusType = "name" | "description" | "volume" | "country_code" | "channel_commander" | "priority_speaker";
        export type PlaylistStatusType = "replay_mode" | "finished" | "delete_played" | "max_size" | "notify_song_change";
        export interface music_manage {
            show_container: { container: "settings" | "permissions"; };

            /* setting relevant */
            query_bot_status: {},
            bot_status: {
                status: "success" | "error";
                error_msg?: string;
                data?: {
                    name: string,
                    description: string,
                    volume: number,

                    country_code: string,
                    default_country_code: string,

                    channel_commander: boolean,
                    priority_speaker: boolean,

                    client_version: string,
                    client_platform: string,

                    uptime_mode: number,
                    bot_type: number
                }
            },
            set_bot_status: {
                key: BotStatusType,
                value: any
            },
            set_bot_status_result: {
                key: BotStatusType,
                status: "success" | "error" | "timeout",
                error_msg?: string,
                value?: any
            }

            query_playlist_status: {},
            playlist_status: {
                status: "success" | "error",
                error_msg?: string,
                data?: {
                    replay_mode: number,
                    finished: boolean,
                    delete_played: boolean,
                    max_size: number,
                    notify_song_change: boolean
                }
            },
            set_playlist_status: {
                key: PlaylistStatusType,
                value: any
            },
            set_playlist_status_result: {
                key: PlaylistStatusType,
                status: "success" | "error" | "timeout",
                error_msg?: string,
                value?: any
            }

            /* permission relevant */
            show_client_list: {},
            hide_client_list: {},

            filter_client_list: { filter: string | undefined },

            "refresh_permissions": {},

            query_special_clients: {},
            special_client_list: {
                status: "success" | "error" | "error-permission",
                error_msg?: string,
                clients?: {
                    name: string,
                    unique_id: string,
                    database_id: number
                }[]
            },

            search_client: { text: string },
            search_client_result: {
                status: "error" | "timeout" | "empty" | "success",
                error_msg?: string,
                client?: {
                    name: string,
                    unique_id: string,
                    database_id: number
                }
            },

            /* sets a client to set the permission for */
            special_client_set: {
                client?: {
                    name: string,
                    unique_id: string,
                    database_id: number
                }
            },

            "query_general_permissions": {},
            "general_permissions": {
                status: "error" | "timeout" | "success",
                error_msg?: string,
                permissions?: {[key: string]:number}
            },
            "set_general_permission_result": {
                status: "error" | "success",
                key: string,
                value?: number,
                error_msg?: string
            },
            "set_general_permission": { /* try to change a permission for the server */
                key: string,
                value: number
            },


            "query_client_permissions": { client_database_id: number },
            "client_permissions": {
                status: "error" | "timeout" | "success",
                client_database_id: number,
                error_msg?: string,
                permissions?: {[key: string]:number}
            },
            "set_client_permission_result": {
                status: "error" | "success",
                client_database_id: number,
                key: string,
                value?: number,
                error_msg?: string
            },
            "set_client_permission": { /* try to change a permission for the server */
                client_database_id: number,
                key: string,
                value: number
            },

            "query_group_permissions": { permission_name: string },
            "group_permissions": {
                permission_name: string;
                status: "error" | "timeout" | "success"
                groups?: {
                    name: string,
                    value: number,
                    id: number
                }[],
                error_msg?: string
            }
        }

        export interface newcomer {
            "show_step": {
                "step": "welcome" | "microphone" | "identity" | "finish"
            },
            "exit_guide": {
                ask_yesno: boolean
            },

            "modal-shown": {},


            "step-status": {
                next_button: boolean,
                previous_button: boolean
            }
        }

        export namespace settings {
            export type ProfileInfo = {
                id: string,
                name: string,
                nickname: string,
                identity_type: "teaforo" | "teamspeak" | "nickname",

                identity_forum?: {
                    valid: boolean,
                    fallback_name: string
                },
                identity_nickname?: {
                    name: string,
                    fallback_name: string
                },
                identity_teamspeak?: {
                    unique_id: string,
                    fallback_name: string
                }
            }

            export interface profiles {
                "reload-profile": { profile_id?: string },
                "select-profile": { profile_id: string },

                "query-profile-list": { },
                "query-profile-list-result": {
                    status: "error" | "success" | "timeout",

                    error?: string;
                    profiles?: ProfileInfo[]
                }

                "query-profile": { profile_id: string },
                "query-profile-result": {
                    status: "error" | "success" | "timeout",
                    profile_id: string,

                    error?: string;
                    info?: ProfileInfo
                },

                "select-identity-type": {
                    profile_id: string,
                    identity_type: "teamspeak" | "teaforo" | "nickname" | "unset"
                },

                "query-profile-validity": { profile_id: string },
                "query-profile-validity-result": {
                    profile_id: string,
                    status: "error" | "success" | "timeout",

                    error?: string,
                    valid?: boolean
                }

                "create-profile": { name: string },
                "create-profile-result": {
                    status: "error" | "success" | "timeout",
                    name: string;

                    profile_id?: string;
                    error?: string;
                },

                "delete-profile": { profile_id: string },
                "delete-profile-result": {
                    status: "error" | "success" | "timeout",
                    profile_id: string,
                    error?: string
                }

                "set-default-profile": { profile_id: string },
                "set-default-profile-result": {
                    status: "error" | "success" | "timeout",

                    /* the profile which now has the id "default" */
                    old_profile_id: string,

                    /* the "default" profile which now has a new id */
                    new_profile_id?: string

                    error?: string;
                }

                /* profile name events */
                "set-profile-name": {
                    profile_id: string,
                    name: string
                },
                "set-profile-name-result": {
                    status: "error" | "success" | "timeout",
                    profile_id: string,
                    name?: string
                },

                /* profile nickname events */
                "set-default-name": {
                    profile_id: string,
                    name: string | null
                },
                "set-default-name-result": {
                    status: "error" | "success" | "timeout",
                    profile_id: string,
                    name?: string | null
                },

                "query-identity-teamspeak": { profile_id: string },
                "query-identity-teamspeak-result": {
                    status: "error" | "success" | "timeout",
                    profile_id: string,

                    error?: string,
                    level?: number
                }

                "set-identity-name-name": { profile_id: string, name: string },
                "set-identity-name-name-result": {
                    status: "error" | "success" | "timeout",
                    profile_id: string,

                    error?: string,
                    name?: string
                },

                "generate-identity-teamspeak": { profile_id: string },
                "generate-identity-teamspeak-result": {
                    profile_id: string,
                    status: "error" | "success" | "timeout",

                    error?: string,

                    level?: number
                    unique_id?: string
                },

                "improve-identity-teamspeak-level": { profile_id: string },
                "improve-identity-teamspeak-level-update": {
                    profile_id: string,
                    new_level: number
                },

                "import-identity-teamspeak": { profile_id: string },
                "import-identity-teamspeak-result": {
                    profile_id: string,

                    level?: number
                    unique_id?: string
                }

                "export-identity-teamspeak": {
                    profile_id: string,
                    filename: string
                },


                "setup-forum-connection": {}
            }

            export type MicrophoneSettings = "volume" | "vad-type" | "ppt-key" | "ppt-release-delay" | "ppt-release-delay-active" | "threshold-threshold";
            export interface microphone {
                "query-devices": { refresh_list: boolean },
                "query-device-result": {
                    status: "success" | "error" | "timeout",

                    error?: string,
                    devices?: {
                        id: string,
                        name: string,
                        driver: string
                    }[]
                    active_device?: string;
                },

                "query-settings": {},
                "query-settings-result": {
                    status: "success" | "error" | "timeout",

                    error?: string,
                    info?: {
                        volume: number,
                        vad_type: string,

                        vad_ppt: {
                            key: ppt.KeyDescriptor,
                            release_delay: number,
                            release_delay_active: boolean
                        },
                        vad_threshold: {
                            threshold: number
                        }
                    }
                },

                "set-device": { device_id: string },
                "set-device-result": {
                    device_id: string,
                    status: "success" | "error" | "timeout",

                    error?: string
                },

                "set-setting": {
                    setting: MicrophoneSettings;
                    value: any;
                },
                "set-setting-result": {
                    setting: MicrophoneSettings,
                    status: "success" | "error" | "timeout",

                    error?: string,
                    value?: any
                },

                "update-device-level": {
                    devices: {
                        device_id: string,
                        status: "success" | "error",

                        level?: number,
                        error?: string
                    }[]
                },

                "audio-initialized": {},
                "deinitialize": {}
            }
        }
    }

}

const eclient = new events.Registry<events.channel_tree.client>();
const emusic = new events.Registry<events.sidebar.music>();

eclient.connect("playlist_song_loaded", emusic);
eclient.connect("playlist_song_loaded", emusic);
