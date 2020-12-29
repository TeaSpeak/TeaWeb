import {SubscribedPlaylist} from "tc-shared/music/PlaylistManager";
import {Registry} from "tc-shared/events";
import {MusicPlaylistStatus, MusicPlaylistUiEvents} from "tc-shared/ui/frames/side/MusicPlaylistDefinitions";
import {CommandResult} from "tc-shared/connection/ServerConnectionDeclaration";
import {LogCategory, logError} from "tc-shared/log";
import {createErrorModal} from "tc-shared/ui/elements/Modal";

export class MusicPlaylistController {
    readonly uiEvents: Registry<MusicPlaylistUiEvents>;

    private currentPlaylist: SubscribedPlaylist | "loading";
    private listenerPlaylist: (() => void)[];

    private currentSongId: number;

    constructor() {
        this.uiEvents = new Registry<MusicPlaylistUiEvents>();

        this.uiEvents.on("query_playlist_status", () => this.reportPlaylistStatus());
        this.uiEvents.on("query_entry_status", event => this.reportPlaylistEntry(event.entryId));

        this.uiEvents.on("action_load_playlist", event => {
            if(typeof this.currentPlaylist === "object") {
                this.currentPlaylist.querySongs(event.forced).then(undefined);
            }
        });

        this.uiEvents.on("action_entry_delete", async event => {
            try {
                if(typeof this.currentPlaylist === "object") {
                    await this.currentPlaylist.deleteEntry(event.entryId);
                } else {
                    throw tr("No playlist selected");
                }
            } catch (error) {
                if(error instanceof CommandResult) {
                    error = error.formattedMessage();
                } else if(typeof error !== "string") {
                    logError(LogCategory.NETWORKING, tr("Failed to delete playlist song entry: %o"), error);
                    error = tr("Lookup the console for details");
                }

                createErrorModal(tr("Failed to delete song"), tra("Failed to delete song:\n", error)).open();
            }
        });

        this.uiEvents.on("action_reorder_song", async event => {
            try {
                if(typeof this.currentPlaylist === "object") {
                    await this.currentPlaylist.reorderEntry(event.entryId, event.targetEntryId, event.mode);
                } else {
                    throw tr("No playlist selected");
                }
            } catch (error) {
                if(error instanceof CommandResult) {
                    error = error.formattedMessage();
                } else if(typeof error !== "string") {
                    logError(LogCategory.NETWORKING, tr("Failed to reorder playlist song entry: %o"), error);
                    error = tr("Lookup the console for details");
                }

                createErrorModal(tr("Failed to reorder song"), tra("Failed to reorder song:\n", error)).open();
            }
        });

        this.uiEvents.on("action_add_song", async event => {
            try {
                if(typeof this.currentPlaylist === "object") {
                    await this.currentPlaylist.addSong(event.url, "any",  event.targetEntryId, event.mode);
                } else {
                    throw tr("No playlist selected");
                }
            } catch (error) {
                if(error instanceof CommandResult) {
                    error = error.formattedMessage();
                } else if(typeof error !== "string") {
                    logError(LogCategory.NETWORKING, tr("Failed to add song to playlist entry: %o"), error);
                    error = tr("Lookup the console for details");
                }

                createErrorModal(tr("Failed to add song song"), tra("Failed to add song:\n", error)).open();
            }
        });
    }

    destroy() {
        this.uiEvents.destroy();
    }

    setCurrentPlaylist(playlist: SubscribedPlaylist | "loading") {
        if(this.currentPlaylist === playlist) {
            return;
        }

        this.listenerPlaylist?.forEach(callback => callback());
        this.listenerPlaylist = [];

        if(typeof this.currentPlaylist === "object") {
            this.currentPlaylist.unref();
        }
        this.currentPlaylist = playlist;
        if(typeof this.currentPlaylist === "object") {
            this.currentPlaylist.ref();
            this.initializePlaylistListener(this.currentPlaylist);
        }

        this.reportPlaylistStatus();
    }

    getCurrentPlaylist() : SubscribedPlaylist | "loading" | undefined {
        return this.currentPlaylist;
    }

    getCurrentSongId() : number {
        return this.currentSongId;
    }

    setCurrentSongId(id: number | 0) {
        if(this.currentSongId === id) {
            return;
        }

        this.currentSongId = id;
        this.reportPlaylistStatus();
    }

    private initializePlaylistListener(playlist: SubscribedPlaylist) {
        this.listenerPlaylist.push(playlist.events.on("notify_status_changed", () => this.reportPlaylistStatus()));

        this.listenerPlaylist.push(playlist.events.on("notify_entry_added", () => this.reportPlaylistStatus()));
        this.listenerPlaylist.push(playlist.events.on("notify_entry_reordered", () => this.reportPlaylistStatus()));
        this.listenerPlaylist.push(playlist.events.on("notify_entry_deleted", () => this.reportPlaylistStatus()));

        this.listenerPlaylist.push(playlist.events.on("notify_entry_updated", event => this.reportPlaylistEntry(event.entry.id)));
    }

    private reportPlaylistStatus() {
        let status: MusicPlaylistStatus = { status: "unselected" };

        if(typeof this.currentPlaylist === "object") {
            const playlistStatus = this.currentPlaylist.getStatus();
            switch (playlistStatus.status) {
                case "unloaded":
                    /* just query the playlist status instead of letting the user manually do this */
                    this.currentPlaylist.querySongs(false).then(undefined);
                    return;

                case "loading":
                    status = { status: "loading" };
                    break;

                case "loaded":
                    status = {
                        status: "loaded",
                        /* Drag and drop only supports lowercase characters! */
                        serverUniqueId: this.currentPlaylist.serverUniqueId.toLowerCase(),
                        playlistId: this.currentPlaylist.playlistId,
                        songs: playlistStatus.songs.map(song => song.id),
                        activeSong: this.currentSongId
                    };
                    break;

                case "no-permissions":
                    status = {
                        status: "no-permissions",
                        failedPermission: playlistStatus.failedPermission
                    };
                    break;

                case "error":
                    status = {
                        status: "error",
                        reason: playlistStatus.error
                    };
                    break;
            }
        } else if(this.currentPlaylist === "loading") {
            status = { status: "loading" };
        }

        this.uiEvents.fire_react("notify_playlist_status", { status: status });
    }

    private reportPlaylistEntry(entryId: number) {
        if(typeof this.currentPlaylist === "object") {
            const playlistStatus = this.currentPlaylist.getStatus();
            if(playlistStatus.status === "loaded") {
                const song = playlistStatus.songs.find(song => song.id === entryId);
                if(song) {
                    if(song.metadata.status === "loaded") {
                        this.uiEvents.fire_react("notify_entry_status", {
                            entryId: entryId,
                            status: {
                                type: "song",
                                url: song.url,
                                thumbnailImage: song.metadata.thumbnailUrl,
                                title: song.metadata.title,
                                description: song.metadata.description,
                                length: song.metadata.length
                            }
                        });
                    } else if(song.metadata.status === "unparsed") {
                        this.uiEvents.fire_react("notify_entry_status", {
                            entryId: entryId,
                            status: {
                                type: "song",

                                url: song.url,
                                thumbnailImage: undefined,
                                title: song.url,
                                description: "",
                                length: 0
                            }
                        });
                    } else {
                        this.uiEvents.fire_react("notify_entry_status", {
                            entryId: entryId,
                            status: { type: "loading", url: song.url }
                        });
                    }
                    return;
                }
            }
        }

        /* TODO: May fire an error? */
    }
}