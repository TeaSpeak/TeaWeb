import {Frame, FrameContent} from "../../../ui/frames/chat_frame";
import {LogCategory} from "../../../log";
import {CommandResult, PlaylistSong} from "../../../connection/ServerConnectionDeclaration";
import {createErrorModal, createInputModal} from "../../../ui/elements/Modal";
import * as log from "../../../log";
import * as image_preview from "../image_preview";
import {Registry} from "../../../events";
import {ErrorCode} from "../../../connection/ErrorCode";
import {ClientEvents, MusicClientEntry, SongInfo} from "../../../tree/Client";

export interface MusicSidebarEvents {
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

    "player_time_update": ClientEvents["music_status_update"],
    "player_song_change": ClientEvents["music_song_change"],

    "playlist_song_add": ClientEvents["playlist_song_add"] & { insert_effect?: boolean },
    "playlist_song_remove": ClientEvents["playlist_song_remove"],
    "playlist_song_reorder": ClientEvents["playlist_song_reorder"],
    "playlist_song_loaded": ClientEvents["playlist_song_loaded"] & { html_entry?: JQuery },
}

interface LoadedSongData {
    description: string;
    title: string;
    url: string;

    length: number;
    thumbnail?: string;

    metadata: {[key: string]: string};
}

export class MusicInfo {
    readonly events: Registry<MusicSidebarEvents>;
    readonly handle: Frame;

    private _html_tag: JQuery;
    private _container_playlist: JQuery;

    private currentMusicBot: MusicClientEntry | undefined;
    private update_song_info: number = 0; /* timestamp when we force update the info */
    private time_select: {
        active: boolean,
        max_time: number,
        current_select_time: number,
        current_player_time: number
    } = { active: false, current_select_time: 0, max_time: 0, current_player_time: 0};
    private song_reorder: {
        active: boolean,
        song_id: number,
        previous_entry: number,
        html: JQuery,
        mouse?: {x: number, y: number},
        indicator: JQuery
    } = { active: false, song_id: 0, previous_entry: 0, html: undefined, indicator: $.spawn("div").addClass("reorder-indicator") };

    previous_frame_content: FrameContent;

    constructor(handle: Frame) {
        this.events = new Registry<MusicSidebarEvents>();
        this.handle = handle;

        this.events.enableDebug("music-info");
        this.initialize_listener();
        this._build_html_tag();

        this.set_current_bot(undefined, true);
    }

    html_tag() : JQuery {
        return this._html_tag;
    }

    destroy() {
        this.set_current_bot(undefined);
        this.events.destroy();

        this._html_tag && this._html_tag.remove();
        this._html_tag = undefined;

        this.currentMusicBot = undefined;
        this.previous_frame_content = undefined;
    }

    private format_time(value: number) {
        if(value == 0) return "--:--:--";

        value /= 1000;

        let hours = 0, minutes = 0;
        while(value >= 60 * 60) {
            hours++;
            value -= 60 * 60;
        }

        while(value >= 60) {
            minutes++;
            value -= 60;
        }

        return ("0" + hours).substr(-2) + ":" + ("0" + minutes).substr(-2) + ":" + ("0" + value.toFixed(0)).substr(-2);
    };

    private _build_html_tag() {
        this._html_tag = $("#tmpl_frame_chat_music_info").renderTag();
        this._container_playlist = this._html_tag.find(".container-playlist");

        this._html_tag.find(".button-close").on('click', () => {
            if(this.previous_frame_content === FrameContent.CLIENT_INFO)
                this.previous_frame_content = FrameContent.NONE;

            this.handle.set_content(this.previous_frame_content);
        });

        this._html_tag.find(".button-reload-playlist").on('click', () => this.events.fire("action_playlist_reload"));
        this._html_tag.find(".button-song-add").on('click', () => this.events.fire("action_song_add"));
        this._html_tag.find(".thumbnail").on('click', event => {
            const image = this._html_tag.find(".thumbnail img");
            const url = image.attr("x-thumbnail-url");
            if(!url) return;

            image_preview.preview_image(decodeURIComponent(url), decodeURIComponent(url));
        });

        {
            const button_play = this._html_tag.find(".control-buttons .button-play");
            const button_pause = this._html_tag.find(".control-buttons .button-pause");

            button_play.on('click', () => this.events.fire("action_play"));
            button_pause.on('click', () => this.events.fire("action_pause"));

            this.events.on(["bot_change", "bot_property_update"], event => {
                if(event.type === "bot_property_update" && event.as<"bot_property_update">().properties.indexOf("player_state") == -1) return;

                button_play.toggleClass("hidden", this.currentMusicBot === undefined || this.currentMusicBot.isCurrentlyPlaying());
            });

            this.events.on(["bot_change", "bot_property_update"], event => {
                if(event.type === "bot_property_update" && event.as<"bot_property_update">().properties.indexOf("player_state") == -1) return;

                button_pause.toggleClass("hidden", this.currentMusicBot !== undefined && !this.currentMusicBot.isCurrentlyPlaying());
            });

            this._html_tag.find(".control-buttons .button-rewind").on('click', () => this.events.fire("action_rewind"));
            this._html_tag.find(".control-buttons .button-forward").on('click', () => this.events.fire("action_forward"));
        }

        /* timeline updaters */
        {
            const container = this._html_tag.find(".container-timeline");

            const timeline = container.find(".timeline");
            const indicator_playtime = container.find(".indicator-playtime");
            const indicator_buffered = container.find(".indicator-buffered");
            const thumb = container.find(".thumb");

            const timestamp_current = container.find(".timestamps .current");
            const timestamp_max = container.find(".timestamps .max");

            thumb.on('mousedown', event => event.button === 0 && this.events.fire("playtime_move_begin"));

            this.events.on(["bot_change", "player_song_change", "player_time_update", "playtime_move_end"], event => {
                if(!this.currentMusicBot) {
                    this.time_select.max_time = 0;
                    indicator_buffered.each((_, e) => { e.style.width = "0%"; });
                    indicator_playtime.each((_, e) => { e.style.width = "0%"; });
                    thumb.each((_, e) => { e.style.marginLeft = "0%"; });

                    timestamp_current.text("--:--:--");
                    timestamp_max.text("--:--:--");
                    return;
                }
                if(event.type === "playtime_move_end" && !event.as<"playtime_move_end">().canceled) return;

                const update_info = Date.now() > this.update_song_info;
                this.currentMusicBot.requestPlayerInfo(update_info ? 1000 : 60 * 1000).then(data => {
                    if(update_info)
                        this.display_song_info(data);

                    let played, buffered;
                    if(event.type !== "player_time_update") {
                        played = data.player_replay_index;
                        buffered = data.player_buffered_index;
                    } else {
                        played = event.as<"player_time_update">().player_replay_index;
                        buffered = event.as<"player_time_update">().player_buffered_index;
                    }

                    this.time_select.current_player_time = played;
                    this.time_select.max_time = data.player_max_index;
                    timestamp_max.text(data.player_max_index ? this.format_time(data.player_max_index) : "--:--:--");

                    if(this.time_select.active)
                        return;

                    let wplayed, wbuffered;
                    if(data.player_max_index) {
                        wplayed = (played * 100 / data.player_max_index).toFixed(2) + "%";
                        wbuffered = (buffered * 100 / data.player_max_index).toFixed(2) + "%";

                        timestamp_current.text(this.format_time(played));
                    } else {
                        wplayed = "100%";
                        wbuffered = "100%";

                        timestamp_current.text(this.format_time(played));
                    }

                    indicator_buffered.each((_, e) => { e.style.width = wbuffered; });
                    indicator_playtime.each((_, e) => { e.style.width = wplayed; });
                    thumb.each((_, e) => { e.style.marginLeft = wplayed; });
                });
            });

            const move_callback = (event: MouseEvent) => {
                const x_min = timeline.offset().left;
                const x_max = x_min + timeline.width();

                let current = event.pageX;
                if(current < x_min)
                    current = x_min;
                else if(current > x_max)
                    current = x_max;

                const percent = (current - x_min) / (x_max - x_min);
                this.time_select.current_select_time = percent * this.time_select.max_time;
                timestamp_current.text(this.format_time(this.time_select.current_select_time));

                const w = (percent * 100).toFixed(2) + "%";
                indicator_playtime.each((_, e) => { e.style.width = w; });
                thumb.each((_, e) => { e.style.marginLeft = w; });
            };

            const up_callback = (event: MouseEvent | FocusEvent) => {
                if(event.type === "mouseup")
                    if((event as MouseEvent).button !== 0) return;

                this.events.fire("playtime_move_end", {
                    canceled: event.type !== "mouseup",
                    target_time: this.time_select.current_select_time
                });
            };

            this.events.on("playtime_move_begin", event => {
                if(this.time_select.max_time <= 0) return;

                this.time_select.active = true;
                indicator_buffered.each((_, e) => { e.style.width = "0"; });
                document.addEventListener("mousemove", move_callback);
                document.addEventListener("mouseleave", up_callback);
                document.addEventListener("blur", up_callback);
                document.addEventListener("mouseup", up_callback);
                document.body.style.userSelect = "none";
            });

            this.events.on(["bot_change", "player_song_change", "playtime_move_end"], event => {
                document.removeEventListener("mousemove", move_callback);
                document.removeEventListener("mouseleave", up_callback);
                document.removeEventListener("blur", up_callback);
                document.removeEventListener("mouseup", up_callback);
                document.body.style.userSelect = undefined;
                this.time_select.active = false;

                if(event.type === "playtime_move_end") {
                    const data = event.as<"playtime_move_end">();
                    if(data.canceled) return;

                    const offset = data.target_time - this.time_select.current_player_time;
                    this.events.fire(offset > 0 ? "action_forward_ms" : "action_rewind_ms", {units: Math.abs(offset) });
                }
            });
        }

        /* song info handlers */
        this.events.on(["bot_change", "player_song_change"], event => {
            let song: SongInfo;

            /* update the player info so we dont get old data */
            if(this.currentMusicBot) {
                this.update_song_info = 0;
                this.currentMusicBot.requestPlayerInfo(1000).then(data => {
                    this.display_song_info(data);
                }).catch(error => {
                    log.warn(LogCategory.CLIENT, tr("Failed to update current song for side bar: %o"), error);
                });
            }

            if(event.type === "bot_change") {
                song = undefined;
            } else {
                song = event.as<"player_song_change">().song;
            }
            this.display_song_info(song);
        });
    }

    private display_song_info(song: SongInfo) {
        if(song) {
            if(!song.song_loaded) {
                console.log("Awaiting a loaded song info.");
                this.update_song_info = 0;
            } else {
                console.log("Song info loaded.");
                this.update_song_info = Date.now() + 60 * 1000;
            }
        }

        if(!song) song = new SongInfo();

        const container_thumbnail = this._html_tag.find(".player .container-thumbnail");
        const container_info = this._html_tag.find(".player .container-song-info");

        container_thumbnail.find("img")
            .attr("src", song.song_thumbnail || "img/music/no-thumbnail.png")
            .attr("x-thumbnail-url", encodeURIComponent(song.song_thumbnail))
            .css("cursor", song.song_thumbnail ? "pointer" : null);

        if(song.song_id)
            container_info.find(".song-name").text(song.song_title || song.song_url).attr("title", song.song_title || song.song_url);
        else
            container_info.find(".song-name").text(tr("No song selected"));
        if(song.song_description) {
            container_info.find(".song-description").removeClass("hidden").text(song.song_description).attr("title", song.song_description);
        } else {
            container_info.find(".song-description").addClass("hidden").text(tr("Song has no description")).attr("title", tr("Song has no description"));
        }
    }

    private initialize_listener() {
        //Must come at first!
        this.events.on("player_song_change", event => {
            if(!this.currentMusicBot) return;

            this.currentMusicBot.requestPlayerInfo(0); /* enforce an info refresh */
        });

        /* bot property listener */
        const callback_property = (event: ClientEvents["notify_properties_updated"]) => this.events.fire("bot_property_update", { properties: Object.keys(event.updated_properties) });
        const callback_time_update = (event: ClientEvents["music_status_update"]) => this.events.fire("player_time_update", event, true);
        const callback_song_change = (event: ClientEvents["music_song_change"]) => this.events.fire("player_song_change", event, true);
        this.events.on("bot_change", event => {
            if(event.old) {
                event.old.events.off(callback_property);
                event.old.events.off(callback_time_update);
                event.old.events.off(callback_song_change);
                event.old.events.disconnectAll(this.events);
            }
            if(event.new) {
                event.new.events.on("notify_properties_updated", callback_property);

                event.new.events.on("music_status_update", callback_time_update);
                event.new.events.on("music_song_change", callback_song_change);

                // @ts-ignore
                event.new.events.connect("playlist_song_add", this.events);

                // @ts-ignore
                event.new.events.connect("playlist_song_remove", this.events);

                // @ts-ignore
                event.new.events.connect("playlist_song_reorder", this.events);

                // @ts-ignore
                event.new.events.connect("playlist_song_loaded", this.events);
            }
        });

        /* basic player actions */
        {
            const action_map = {
                "action_play": 1,
                "action_pause": 2,
                "action_forward": 3,
                "action_rewind": 4,
                "action_forward_ms": 5,
                "action_rewind_ms": 6
            };

            this.events.on(Object.keys(action_map) as any, event => {
                if(!this.currentMusicBot) return;

                const action_id = action_map[event.type];
                if(typeof action_id === "undefined") {
                    log.warn(LogCategory.GENERAL, tr("Invalid music bot action event detected: %s. This should not happen!"), event.type);
                    return;
                }
                const data = {
                    bot_id: this.currentMusicBot.properties.client_database_id,
                    action: action_id,
                    units: event.units
                };
                this.handle.handle.serverConnection.send_command("musicbotplayeraction", data).catch(error => {
                    if(error instanceof CommandResult && error.id === ErrorCode.SERVER_INSUFFICIENT_PERMISSIONS) return;

                    log.error(LogCategory.CLIENT, tr("Failed to perform action %s on bot: %o"), event.type, error);
                    //TODO: Better error dialog
                    createErrorModal(tr("Failed to perform action."), tr("Failed to perform action for music bot.")).open();
                });
            });
        }

        this.events.on("action_song_set", event => {
            if(!this.currentMusicBot) return;

            const connection = this.handle.handle.serverConnection;
            if(!connection || !connection.connected()) return;

            connection.send_command("playlistsongsetcurrent", {
                playlist_id: this.currentMusicBot.properties.client_playlist_id,
                song_id: event.song_id
            }).catch(error => {
                if(error instanceof CommandResult && error.id === ErrorCode.SERVER_INSUFFICIENT_PERMISSIONS) return;

                log.error(LogCategory.CLIENT, tr("Failed to set current song on bot: %o"), event.type, error);
                //TODO: Better error dialog
                createErrorModal(tr("Failed to set song."), tr("Failed to set current replaying song.")).open();
            })
        });

        this.events.on("action_song_add", () => {
            if(!this.currentMusicBot) return;

            createInputModal(tr("Enter song URL"), tr("Please enter the target song URL"), text => {
                try {
                    new URL(text);
                    return true;
                } catch(error) {
                    return false;
                }
            }, result => {
                if(!result || !this.currentMusicBot) return;

                const connection = this.handle.handle.serverConnection;
                connection.send_command("playlistsongadd", {
                    playlist_id: this.currentMusicBot.properties.client_playlist_id,
                    url: result
                }).catch(error => {
                    if(error instanceof CommandResult && error.id === ErrorCode.SERVER_INSUFFICIENT_PERMISSIONS) return;

                    log.error(LogCategory.CLIENT, tr("Failed to add song to bot playlist: %o"), error);

                    //TODO: Better error description
                    createErrorModal(tr("Failed to insert song"), tr("Failed to append song to the playlist.")).open();
                });
            }).open();
        });

        this.events.on("action_song_delete", event => {
            if(!this.currentMusicBot) return;

            const connection = this.handle.handle.serverConnection;
            if(!connection || !connection.connected()) return;

            connection.send_command("playlistsongremove", {
                playlist_id: this.currentMusicBot.properties.client_playlist_id,
                song_id: event.song_id
            }).catch(error => {
                if(error instanceof CommandResult && error.id === ErrorCode.SERVER_INSUFFICIENT_PERMISSIONS) return;

                log.error(LogCategory.CLIENT, tr("Failed to delete song from bot playlist: %o"), error);

                //TODO: Better error description
                createErrorModal(tr("Failed to delete song"), tr("Failed to remove song from the playlist.")).open();
            });
        });

        /* bot subscription */
        this.events.on("bot_change", () => {
            const connection = this.handle.handle.serverConnection;
            if(!connection || !connection.connected()) return;

            const bot_id = this.currentMusicBot ? this.currentMusicBot.properties.client_database_id : 0;
            this.handle.handle.serverConnection.send_command("musicbotsetsubscription", { bot_id: bot_id }).catch(error => {
                log.warn(LogCategory.CLIENT, tr("Failed to subscribe to displayed bot within the side bar: %o"), error);
            });
        });

        /* playlist stuff */
        this.events.on(["bot_change", "action_playlist_reload"], event => {
            this.playlist_subscribe(true);
            this.update_playlist();
        });

        this.events.on("playlist_song_add", event => {
            const animation = typeof event.insert_effect === "boolean" ? event.insert_effect : true;
            const html_entry = this.build_playlist_entry(event.song, animation);
            const playlist = this._container_playlist.find(".playlist");
            const previous = playlist.find(".entry[song-id=" + event.song.song_previous_song_id + "]");

            if(previous.length)
                html_entry.insertAfter(previous);
            else
                html_entry.appendTo(playlist);
            if(event.song.song_loaded)
                this.events.fire("playlist_song_loaded", {
                    html_entry: html_entry,
                    metadata: event.song.song_metadata,
                    success: true,
                    song_id: event.song.song_id
                });
            if(animation)
                setTimeout(() => html_entry.addClass("shown"), 50);
        });

        this.events.on("playlist_song_remove", event => {
            const playlist = this._container_playlist.find(".playlist");
            const song = playlist.find(".entry[song-id=" + event.song_id + "]");
            song.addClass("deleted");
            setTimeout(() => song.remove(), 5000); /* to play some animations */
        });

        this.events.on("playlist_song_reorder", event => {
            const playlist = this._container_playlist.find(".playlist");
            const entry = playlist.find(".entry[song-id=" + event.song_id + "]");
            if(!entry) return;

            console.log(event);
            const previous = playlist.find(".entry[song-id=" + event.previous_song_id + "]");
            if(previous.length) {
                entry.insertAfter(previous);
            } else {
                entry.insertBefore(playlist.find(".entry")[0]);
            }
        });

        this.events.on("playlist_song_loaded", event => {
            const entry = event.html_entry || this._container_playlist.find(".playlist .entry[song-id=" + event.song_id + "]");

            const thumbnail = entry.find(".container-thumbnail img");
            const name = entry.find(".name");
            const description = entry.find(".description");
            const length = entry.find(".length");

            if(event.success) {
                let meta: LoadedSongData;
                try {
                    meta = JSON.parse(event.metadata);
                } catch(error) {
                    log.warn(LogCategory.CLIENT, tr("Failed to decode song metadata"));
                    meta = {
                        description: "",
                        title: "",
                        metadata: {},
                        length: 0,
                        url: entry.attr("song-url")
                    }
                }

                if(!meta.title && meta.description) {
                    meta.title = meta.description.split("\n")[0];
                    meta.description = meta.description.split("\n").slice(1).join("\n");
                }
                meta.title = meta.title || meta.url;

                name.text(meta.title);
                description.text(meta.description);
                length.text(this.format_time(meta.length || 0));
                if(meta.thumbnail) {
                    thumbnail.attr("src", meta.thumbnail)
                        .attr("x-thumbnail-url", encodeURIComponent(meta.thumbnail));
                }
            } else {
                name.text(tr("failed to load ") + entry.attr("song-url")).attr("title", tr("failed to load ") + entry.attr("song-url"));
                description.text(event.error_msg || tr("unknown error")).attr("title", event.error_msg || tr("unknown error"));
            }
        });

        /* song reorder */
        {
            const move_callback = (event: MouseEvent) => {
                if(!this.song_reorder.html) return;

                this.song_reorder.html.each((_, e) => {
                    e.style.left = (event.pageX - this.song_reorder.mouse.x) + "px";
                    e.style.top = (event.pageY - this.song_reorder.mouse.y) + "px";
                });

                const entries = this._container_playlist.find(".playlist .entry");
                let before: HTMLElement;
                for(const entry of entries) {
                    const off = $(entry).offset().top;
                    if(off > event.pageY) {
                        this.song_reorder.indicator.insertBefore(entry);
                        this.song_reorder.previous_entry = before ? parseInt(before.attributes.getNamedItem("song-id").value) : 0;
                        return;
                    }

                    before = entry;
                }
                this.song_reorder.indicator.insertAfter(entries.last());
                this.song_reorder.previous_entry = before ? parseInt(before.attributes.getNamedItem("song-id").value) : 0;
            };

            const up_callback = (event: MouseEvent | FocusEvent) => {
                if(event.type === "mouseup")
                    if((event as MouseEvent).button !== 0) return;

                this.events.fire("reorder_end", {
                    canceled: event.type !== "mouseup",
                    song_id: this.song_reorder.song_id,
                    entry: this.song_reorder.html,
                    previous_entry: this.song_reorder.previous_entry
                });
            };

            this.events.on("reorder_begin", event => {
                this.song_reorder.song_id = event.song_id;
                this.song_reorder.html = event.entry;

                const width = this.song_reorder.html.width() + "px";
                this.song_reorder.html.each((_, e) => { e.style.width = width; });
                this.song_reorder.active = true;
                this.song_reorder.html.addClass("reordering");

                document.addEventListener("mousemove", move_callback);
                document.addEventListener("mouseleave", up_callback);
                document.addEventListener("blur", up_callback);
                document.addEventListener("mouseup", up_callback);
                document.body.style.userSelect = "none";
            });

            this.events.on(["bot_change", "playlist_song_remove", "reorder_end"], event => {
                if(event.type === "playlist_song_remove" && event.as<"playlist_song_remove">().song_id !== this.song_reorder.song_id) return;

                document.removeEventListener("mousemove", move_callback);
                document.removeEventListener("mouseleave", up_callback);
                document.removeEventListener("blur", up_callback);
                document.removeEventListener("mouseup", up_callback);
                document.body.style.userSelect = undefined;

                this.song_reorder.active = false;
                this.song_reorder.indicator.remove();
                if(this.song_reorder.html) {
                    this.song_reorder.html.each((_, e) => {
                        e.style.width = null;
                        e.style.left = null;
                        e.style.top = null;
                    });
                    this.song_reorder.html.removeClass("reordering");
                }

                if(event.type === "reorder_end") {
                    const data = event.as<"reorder_end">();
                    if(data.canceled) return;

                    const connection = this.handle.handle.serverConnection;
                    if(!connection || !connection.connected()) return;
                    if(!this.currentMusicBot) return;

                    connection.send_command("playlistsongreorder", {
                        playlist_id: this.currentMusicBot.properties.client_playlist_id,
                        song_id: data.song_id,
                        song_previous_song_id: data.previous_entry
                    }).catch(error => {
                        if(error instanceof CommandResult && error.id === ErrorCode.SERVER_INSUFFICIENT_PERMISSIONS) return;

                        log.error(LogCategory.CLIENT, tr("Failed to add song to bot playlist: %o"), error);

                        //TODO: Better error description
                        createErrorModal(tr("Failed to reorder song"), tr("Failed to reorder song within the playlist.")).open();
                    });
                    console.log("Reorder to %d", data.previous_entry);
                }
            });

            this.events.on(["bot_change", "player_song_change"], event => {
                if(!this.currentMusicBot) {
                    this._html_tag.find(".playlist .current-song").removeClass("current-song");
                    return;
                }

                this.currentMusicBot.requestPlayerInfo(1000).then(data => {
                     const song_id = data ? data.song_id : 0;
                    this._html_tag.find(".playlist .current-song").removeClass("current-song");
                    this._html_tag.find(".playlist .entry[song-id=" + song_id + "]").addClass("current-song");
                });
            });
        }
    }

    set_current_bot(client: MusicClientEntry | undefined, enforce?: boolean) {
        if(client) client.updateClientVariables(); /* just to ensure */
        if(client === this.currentMusicBot && (typeof(enforce) === "undefined" || !enforce))
            return;

        const old = this.currentMusicBot;
        this.currentMusicBot = client;
        this.events.fire("bot_change", {
            new: client,
            old: old
        });
    }

    current_bot() : MusicClientEntry | undefined {
        return this.currentMusicBot;
    }

    private sort_songs(data: PlaylistSong[]) {
        const result = [];

        let appendable: PlaylistSong[] = [];
        for(const song of data) {
            if(song.song_id == 0 || data.findIndex(e => e.song_id === song.song_previous_song_id) == -1)
                result.push(song);
            else
                appendable.push(song);
        }

        let iters;
        while (appendable.length) {
            do {
                iters = 0;
                const left: PlaylistSong[] = [];
                for(const song of appendable) {
                    const index = data.findIndex(e => e.song_id === song.song_previous_song_id);
                    if(index == -1) {
                        left.push(song);
                        continue;
                    }

                    result.splice(index + 1, 0, song);
                    iters++;
                }
                appendable = left;
            } while(iters > 0);

            if(appendable.length)
                result.push(appendable.pop_front());
        }

        return result;
    }

    /* playlist stuff */
    update_playlist() {
        this.playlist_subscribe(true);

        this._container_playlist.find(".overlay").toggleClass("hidden", true);
        const playlist = this._container_playlist.find(".playlist");
        playlist.empty();

        if(!this.handle.handle.serverConnection || !this.handle.handle.serverConnection.connected() || !this.currentMusicBot) {
            this._container_playlist.find(".overlay-empty").removeClass("hidden");
            return;
        }

        const overlay_loading = this._container_playlist.find(".overlay-loading");
        overlay_loading.removeClass("hidden");

        this.currentMusicBot.updateClientVariables(true).catch(error => {
            log.warn(LogCategory.CLIENT, tr("Failed to update music bot variables: %o"), error);
        }).then(() => {
            this.handle.handle.serverConnection.command_helper.requestPlaylistSongs(this.currentMusicBot.properties.client_playlist_id, false).then(songs => {
                this.playlist_subscribe(false); /* we're allowed to see the playlist */
                if(!songs) {
                    this._container_playlist.find(".overlay-empty").removeClass("hidden");
                    return;
                }

                for(const song of this.sort_songs(songs))
                    this.events.fire("playlist_song_add", { song: song, insert_effect: false });
            }).catch(error => {
                if(error instanceof CommandResult && error.id === ErrorCode.SERVER_INSUFFICIENT_PERMISSIONS) {
                    this._container_playlist.find(".overlay-no-permissions").removeClass("hidden");
                    return;
                }
                log.error(LogCategory.CLIENT, tr("Failed to load bot playlist: %o"), error);
                this._container_playlist.find(".overlay.overlay-error").removeClass("hidden");
            }).then(() => {
                overlay_loading.addClass("hidden");
            });
        });
    }

    private _playlist_subscribed = false;
    private playlist_subscribe(unsubscribe: boolean) {
        if(!this.handle.handle.serverConnection) return;

        if(unsubscribe || !this.currentMusicBot) {
            if(!this._playlist_subscribed) return;
            this._playlist_subscribed = false;

            this.handle.handle.serverConnection.send_command("playlistsetsubscription", {playlist_id: 0}).catch(error => {
                log.warn(LogCategory.CLIENT, tr("Failed to unsubscribe from last playlist: %o"), error);
            });
        } else {
            this.handle.handle.serverConnection.send_command("playlistsetsubscription", {
                playlist_id: this.currentMusicBot.properties.client_playlist_id
            }).then(() => this._playlist_subscribed = true).catch(error => {
                log.warn(LogCategory.CLIENT, tr("Failed to subscribe to bots playlist: %o"), error);
            });
        }
    }

    private build_playlist_entry(data: PlaylistSong, insert_effect: boolean) : JQuery {
        const tag = $("#tmpl_frame_music_playlist_entry").renderTag();
        tag.attr({
            "song-id": data.song_id,
            "song-url": data.song_url
        });

        const thumbnail = tag.find(".container-thumbnail img");
        const name = tag.find(".name");
        const description = tag.find(".description");
        const length = tag.find(".length");

        tag.find(".button-delete").on('click', () => this.events.fire("action_song_delete", { song_id: data.song_id }));
        tag.find(".container-thumbnail").on('click', event => {
            const target = tag.find(".container-thumbnail img");
            const url = target.attr("x-thumbnail-url");
            if(!url) return;

            image_preview.preview_image(decodeURIComponent(url), decodeURIComponent(url));
        });
        tag.on('dblclick', event => this.events.fire("action_song_set", { song_id: data.song_id }));
        name.text(tr("loading..."));
        description.text(data.song_url);

        tag.on('mousedown', event => {
            if(event.button !== 0) return;

            this.song_reorder.mouse = {
                x: event.pageX,
                y: event.pageY
            };

            const baseOff = tag.offset();
            const off = { x: event.pageX - baseOff.left, y: event.pageY - baseOff.top };
            const move_listener = (event: MouseEvent) => {
                const distance = Math.pow(event.pageX - this.song_reorder.mouse.x, 2) + Math.pow(event.pageY - this.song_reorder.mouse.y, 2);
                if(distance < 50) return;

                document.removeEventListener("blur", up_listener);
                document.removeEventListener("mouseup", up_listener);
                document.removeEventListener("mousemove", move_listener);

                this.song_reorder.mouse = off;
                this.events.fire("reorder_begin", {
                    entry: tag,
                    song_id: data.song_id
                });
            };

            const up_listener = event => {
                if(event.type === "mouseup" && event.button !== 0) return;

                document.removeEventListener("blur", up_listener);
                document.removeEventListener("mouseup", up_listener);
                document.removeEventListener("mousemove", move_listener);
            };

            document.addEventListener("blur", up_listener);
            document.addEventListener("mouseup", up_listener);
            document.addEventListener("mousemove", move_listener);
        });

        if(this.currentMusicBot) {
            this.currentMusicBot.requestPlayerInfo(60 * 1000).then(pdata => {
                if(pdata.song_id === data.song_id)
                    tag.addClass("current-song");
            });
        }

        if(insert_effect) {
            tag.removeClass("shown");
            tag.addClass("animation");
        }
        return tag;
    }
}