import {Registry} from "tc-shared/events";
import {
    MusicBotPlayerState,
    MusicBotPlayerTimestamp,
    MusicBotUiEvents
} from "tc-shared/ui/frames/side/MusicBotDefinitions";
import {MusicPlaylistController} from "tc-shared/ui/frames/side/MusicPlaylistController";
import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import {MusicClientEntry, MusicClientPlayerState, SongInfo} from "tc-shared/tree/Client";
import {SubscribedPlaylist} from "tc-shared/music/PlaylistManager";
import {MusicPlaylistUiEvents} from "tc-shared/ui/frames/side/MusicPlaylistDefinitions";
import {LogCategory, logError} from "tc-shared/log";
import {CommandResult} from "tc-shared/connection/ServerConnectionDeclaration";
import {createErrorModal} from "tc-shared/ui/elements/Modal";
import {ErrorCode} from "tc-shared/connection/ErrorCode";

export class MusicBotController {
    private readonly uiEvents: Registry<MusicBotUiEvents>;
    private readonly playlistController: MusicPlaylistController;

    private listenerConnection: (() => void)[];
    private listenerBot: (() => void)[];

    private currentConnection: ConnectionHandler;
    private currentBot: MusicClientEntry;

    private playerTimestamp: MusicBotPlayerTimestamp;
    private currentSongInfo: SongInfo;

    constructor() {
        this.uiEvents = new Registry<MusicBotUiEvents>();
        this.playlistController = new MusicPlaylistController();

        this.uiEvents.on("query_player_state", () => this.reportPlayerState());
        this.uiEvents.on("query_song_info", () => this.reportSongInfo());
        this.uiEvents.on("query_volume", event => this.reportVolume(event.mode));

        this.uiEvents.on("action_player_action", event => {
            if(!this.currentConnection) { return; }

            let playerAction: number;
            switch (event.action) {
                case "play":
                    playerAction = 1;
                    break;

                case "pause":
                    playerAction = 2;
                    break;

                case "forward":
                    playerAction = 3;
                    break;

                case "rewind":
                    playerAction = 4;
                    break;

                default:
                    return;
            }

            this.currentConnection.serverConnection.send_command("musicbotplayeraction", {
                bot_id: this.currentBot.properties.client_database_id,
                action: playerAction
            }).catch(error => {
                if(error instanceof CommandResult && error.id === ErrorCode.SERVER_INSUFFICIENT_PERMISSIONS) {
                    return;
                }

                logError(LogCategory.CLIENT, tr("Failed to perform action %s on bot: %o"), event.type, error);
                //TODO: Better error dialog
                createErrorModal(tr("Failed to perform action."), tr("Failed to perform action for music bot.")).open();
            });
        });

        this.uiEvents.on("action_seek_to", event => {
            if(!this.playerTimestamp || !this.playerTimestamp.base || !this.playerTimestamp.seekable) {
                return;
            }

            const timePassed = Date.now() - this.playerTimestamp.base;
            const offset = event.target - timePassed - this.playerTimestamp.playOffset;
            this.currentConnection.serverConnection.send_command("musicbotplayeraction", {
                bot_id: this.currentBot.properties.client_database_id,
                action: offset > 0 ? 5 : 6,
                units: Math.floor(Math.abs(offset))
            }).catch(error => {
                this.reportPlayerTimestamp();
                if(error instanceof CommandResult && error.id === ErrorCode.SERVER_INSUFFICIENT_PERMISSIONS) {
                    return;
                }

                logError(LogCategory.CLIENT, tr("Failed to perform action %s on bot: %o"), event.type, error);
                createErrorModal(tr("Failed to change replay offset."), tr("Failed to change replay offset for music bot.")).open();
            });
        });

        this.uiEvents.on("action_change_volume", event => {
            if(!this.currentBot) {
                return;
            }

            if(event.mode === "local") {
                this.currentBot.setAudioVolume(event.volume);
            } else {
                this.currentConnection.serverConnection.send_command("clientedit", {
                    clid: this.currentBot.clientId(),
                    player_volume: event.volume
                }).catch(() => {
                    this.reportVolume("remote");
                });
            }
        })

        this.playlistController.uiEvents.on("action_select_entry", event => {
            if(event.entryId === (this.currentSongInfo?.song_id || 0)) {
                return;
            }

            if(!this.currentConnection || !this.currentBot) {
                return;
            }

            this.currentConnection.serverConnection.send_command("playlistsongsetcurrent", {
                playlist_id: this.currentBot.properties.client_playlist_id,
                song_id: event.entryId
            }).catch(error => {
                if(error instanceof CommandResult && error.id === ErrorCode.SERVER_INSUFFICIENT_PERMISSIONS) return;

                logError(LogCategory.CLIENT, tr("Failed to set current song on bot: %o"), event.type, error);
                //TODO: Better error dialog
                createErrorModal(tr("Failed to set song."), tr("Failed to set current replaying song.")).open();
            })
        });
    }

    destroy() {
        this.playlistController.destroy();

        this.uiEvents.destroy();

        this.listenerBot?.forEach(callback => callback());
        this.listenerBot = [];
        this.currentBot = undefined;

        this.listenerConnection?.forEach(callback => callback());
        this.listenerConnection = [];
        this.currentConnection = undefined;

        this.currentSongInfo = undefined;
        this.playerTimestamp = undefined;
    }

    getBotUiEvents() : Registry<MusicBotUiEvents> {
        return this.uiEvents;
    }

    getPlaylistUiEvents() : Registry<MusicPlaylistUiEvents> {
        return this.playlistController.uiEvents;
    }

    setConnection(connection: ConnectionHandler) {
        if(this.currentConnection === connection) {
            return;
        }

        this.listenerConnection?.forEach(callback => callback());
        this.listenerConnection = [];

        this.currentConnection = connection;
        if(this.currentConnection) {
            this.initializeConnectionListener(connection);
            const entry = connection.channelTree.getSelectedEntry();
            if(entry instanceof MusicClientEntry) {
                this.setBot(entry);
            } else {
                this.setBot(undefined);
            }
        } else {
            this.setBot(undefined);
        }
    }

    setBot(bot: MusicClientEntry) {
        if(this.currentBot === bot) {
            return;
        }

        this.listenerBot?.forEach(callback => callback());
        this.listenerBot = [];

        this.currentBot = bot;
        if(this.currentBot) {
            this.initializeBotListener(bot);
            /* client_playlist_id is a non in view variable */
            bot.updateClientVariables().then(undefined);
            bot.subscribe().then(undefined); /* TODO: Error handling */
        }

        this.uiEvents.fire_react("notify_bot_changed");

        this.currentSongInfo = undefined;
        this.reportSongInfo();

        this.playerTimestamp = undefined;
        this.reportPlayerTimestamp();

        this.reportVolume("local");
        this.reportVolume("remote");

        this.updatePlaylist();
        this.updatePlayerInfo().then(undefined);
    }

    private initializeConnectionListener(connection: ConnectionHandler) {
        this.listenerConnection.push(connection.channelTree.events.on("notify_selected_entry_changed", event => {
            if(event.newEntry instanceof MusicClientEntry) {
                this.setBot(event.newEntry);
            } else {
                this.setBot(undefined);
            }
        }));
    }

    private initializeBotListener(bot: MusicClientEntry) {
        this.listenerBot.push(bot.events.on("notify_properties_updated", event => {
            if("client_playlist_id" in event.updated_properties) {
                this.updatePlaylist();
            }

            if("player_state" in event.updated_properties) {
                this.reportPlayerState();

                if(bot.properties.player_state === MusicClientPlayerState.PLAYING && !this.currentSongInfo?.song_loaded) {
                    /* We don't receive song loaded updates... */
                    this.updatePlayerInfo().then(undefined);
                }
            }

            if("player_volume" in event.updated_properties) {
                this.reportVolume("remote");
            }
        }));

        this.listenerBot.push(bot.events.on("notify_music_player_song_change", event => {
            this.playerTimestamp = undefined;
            this.reportPlayerTimestamp();

            this.currentSongInfo = event.newSong;
            this.reportSongInfo();

            this.playlistController.setCurrentSongId(this.currentSongInfo?.song_id || 0);
        }));

        this.listenerBot.push(bot.events.on("notify_music_player_timestamp", event => {
            if(!this.playerTimestamp) {
                return;
            }

            this.playerTimestamp = Object.assign({}, this.playerTimestamp);
            this.playerTimestamp.base = Date.now();
            this.playerTimestamp.playOffset = event.replayIndex;
            this.playerTimestamp.bufferOffset = event.bufferedIndex;
            this.reportPlayerTimestamp();
        }));

        this.listenerBot.push(bot.events.on("notify_audio_level_changed", () => {
            this.reportVolume("local");
        }));

        /* TODO: Handle bot unsubscribed event */
    }

    private updatePlaylist() {
        let playlistId: number = 0;
        if(this.currentConnection && this.currentBot) {
            playlistId = this.currentBot.properties.client_playlist_id;
        }

        let playlist: SubscribedPlaylist;
        if(playlistId > 0) {
            const currentPlaylist = this.playlistController.getCurrentPlaylist();
            if(typeof currentPlaylist === "object" && currentPlaylist.playlistId === playlistId) {
                return;
            }

            playlist = this.currentConnection.getPlaylistManager().createSubscribedPlaylist(playlistId);
        }

        this.playlistController.setCurrentPlaylist(playlistId === -1 ? "loading" : playlist);
        playlist?.unref();
    }

    private async updatePlayerInfo() {
        if(this.currentBot) {
            try {
                const playerInfo = await this.currentBot.requestPlayerInfo();

                if(playerInfo.song_id > 0) {
                    this.currentSongInfo = playerInfo;
                    if(playerInfo.song_loaded) {
                        this.playerTimestamp = {
                            base: Date.now(),
                            total: playerInfo.player_max_index,
                            playOffset: playerInfo.player_replay_index,
                            bufferOffset: playerInfo.player_buffered_index,
                            seekable: playerInfo.player_seekable
                        }
                    } else {
                        this.playerTimestamp = undefined;
                    }
                } else {
                    this.currentSongInfo = undefined;
                    this.playerTimestamp = undefined;
                }

                this.playlistController.setCurrentSongId(this.currentSongInfo?.song_id || 0);
            } catch (error) {
                logError(LogCategory.NETWORKING, tr("Failed to request music bot player info: %o"), error);
                this.currentSongInfo = undefined;
            }
        } else {
            this.currentSongInfo = undefined;
        }

        this.reportSongInfo();
        this.reportPlayerTimestamp();
        /* TODO: Report timestamp etc */
    }

    private reportPlayerState() {
        let state: MusicBotPlayerState = "paused";

        if(this.currentBot) {
            state = this.currentBot.isCurrentlyPlaying() ? "playing" : "paused";
        }

        this.uiEvents.fire_react("notify_player_state", { state: state });
    }

    private reportSongInfo() {
        if(this.currentSongInfo && this.currentBot) {
            const playerState = this.currentBot.properties.player_state;
            if(playerState === MusicClientPlayerState.SLEEPING || playerState === MusicClientPlayerState.STOPPED) {
                this.uiEvents.fire_react("notify_song_info", { info: { type: "none" }});
            } else {
                if(this.currentSongInfo.song_loaded) {
                    this.uiEvents.fire_react("notify_song_info", {
                        info: {
                            type: "song",
                            url: this.currentSongInfo.song_url,
                            description: this.currentSongInfo.song_description,
                            title: this.currentSongInfo.song_title,
                            thumbnail: this.currentSongInfo.song_thumbnail
                        }
                    });
                } else {
                    this.uiEvents.fire_react("notify_song_info", { info: { type: "loading", url: this.currentSongInfo.song_url }});
                }
            }
        } else {
            this.uiEvents.fire_react("notify_song_info", { info: { type: "none" }});
        }
    }

    private reportPlayerTimestamp() {
        this.uiEvents.fire_react("notify_player_timestamp", {
            timestamp: this.playerTimestamp || {
                base: 0,
                bufferOffset: 0,
                playOffset: 0,
                total: 0,
                seekable: false
            }
        });
    }

    private reportVolume(mode: "local" | "remote") {
        this.uiEvents.fire_react("notify_volume", {
            mode: mode,
            volume: this.currentBot ? mode === "local" ? this.currentBot.getAudioVolume() : this.currentBot.properties.player_volume : 0
        });
    }
}