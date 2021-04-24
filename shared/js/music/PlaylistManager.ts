import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import {LogCategory, logError, logWarn} from "tc-shared/log";
import {Registry} from "tc-shared/events";
import {CommandResult} from "tc-shared/connection/ServerConnectionDeclaration";
import {ErrorCode} from "tc-shared/connection/ErrorCode";
import _ = require("lodash");
import {tra} from "tc-shared/i18n/localize";

export type PlaylistEntry = {
    type: "song",

    id: number,
    previousId: number,

    url: string,
    urlLoader: string,

    invokerDatabaseId: number,
    metadata: PlaylistSongMetadata
}

export type PlaylistSongMetadata = {
    status: "loading"
} | {
    status: "unparsed",
    metadata: string
} | {
    status: "loaded",
    metadata: string,

    title: string,
    description: string,

    thumbnailUrl?: string,

    length: number,
};

function parseUnparsedSongMetadata(metadata: string) : PlaylistSongMetadata {
    const meta = JSON.parse(metadata);

    return {
        status: "loaded",
        metadata: metadata,

        title: meta["title"],
        description: meta["description"],
        length: parseInt(meta["length"]),
        thumbnailUrl: !meta["thumbnail"] || meta["thumbnail"] === "none" ? undefined : meta["thumbnail"]
    };
}

function parsePlayListSongEntry(data: any) {
    const result: PlaylistEntry = {
        type: "song",

        id: parseInt(data["song_id"]),
        previousId: parseInt(data["song_previous_song_id"]),

        url: data["song_url"],
        urlLoader: data["song_url_loader"],

        invokerDatabaseId: parseInt(data["song_invoker"]),
        metadata: { status: "loading" }
    };

    if(isNaN(result.id)) {
        throw tra("failed to parse song_id as an integer ({})", data["song_id"]);
    }

    if(isNaN(result.previousId)) {
        throw tra("failed to parse song_previous_song_id as an integer ({})", data["song_previous_song_id"]);
    }

    if(isNaN(result.invokerDatabaseId)) {
        throw tra("failed to parse song_invoker as an integer ({})", data["song_invoker"]);
    }

    if(parseInt(data["song_loaded"]) === 1) {
        if(typeof data["song_metadata_title"] !== "undefined") {
            result.metadata = {
                status: "loaded",
                metadata: data["song_metadata"],

                title: data["song_metadata_title"],
                description: data["song_metadata_description"],
                length: parseInt(data["song_metadata_length"]),
                thumbnailUrl: !data["song_metadata_thumbnail_url"] || data["song_metadata_thumbnail_url"] === "none" ? undefined : data["song_metadata_thumbnail_url"]
            };

            if(isNaN(result.metadata.length)) {
                throw tra("failed to parse song_metadata_length as an integer ({})", data["song_metadata_length"]);
            }
        } else if(typeof data["song_metadata"] === "string") {
            try {
                result.metadata = parseUnparsedSongMetadata(data["song_metadata"]);
            } catch (_error) {
                result.metadata = {
                    status: "unparsed",
                    metadata: data["song_metadata"]
                };
            }
        } else {
            throw tr("Missing song metadata");
        }
    }

    return result;
}

export interface SubscribedPlaylistEvents {
    notify_status_changed: {},

    notify_entry_added: { entry: PlaylistEntry },
    notify_entry_deleted: { entry: PlaylistEntry },
    notify_entry_reordered: { entry: PlaylistEntry, oldPreviousId: number },
    notify_entry_updated: { entry: PlaylistEntry },
}

export type SubscribedPlaylistStatus = {
    status: "loaded",
    songs: PlaylistEntry[]
} | {
    status: "loading",
} | {
    status: "error",
    error: string
} | {
    status: "no-permissions",
    failedPermission: string
} | {
    status: "unloaded"
}

export abstract class SubscribedPlaylist {
    readonly events: Registry<SubscribedPlaylistEvents>;
    readonly playlistId: number;
    readonly serverUniqueId: string;

    protected status: SubscribedPlaylistStatus;
    protected refCount: number;

    protected constructor(serverUniqueId: string, playlistId: number) {
        this.refCount = 1;
        this.events = new Registry<SubscribedPlaylistEvents>();
        this.playlistId = playlistId;
        this.serverUniqueId = serverUniqueId;

        this.status = { status: "unloaded" };
    }

    ref() : SubscribedPlaylist {
        this.refCount++;
        return this;
    }

    unref() {
        if(--this.refCount === 0) {
            this.destroy();
        }
    }

    destroy() {
        this.events.destroy();
    }

    /**
     * Query the playlist songs from the remote server.
     * The playlist status will change on a successfully or failed query.
     *
     * @param forceQuery Forcibly query even we're subscribed and already aware of all songs.
     */
    abstract async querySongs(forceQuery: boolean) : Promise<void>;

    abstract async addSong(url: string, urlLoader: "any" | "youtube" | "ffmpeg" | "channel", targetSongId: number | 0, mode?: "before" | "after" | "last") : Promise<void>;
    abstract async deleteEntry(entryId: number) : Promise<void>;
    abstract async reorderEntry(entryId: number, targetEntryId: number, mode: "before" | "after") : Promise<void>;

    getStatus() : Readonly<SubscribedPlaylistStatus> {
        return this.status;
    }

    protected setStatus(status: SubscribedPlaylistStatus) {
        if(_.isEqual(this.status, status)) {
            return;
        }

        this.status = status;
        this.events.fire("notify_status_changed");
    }
}

class InternalSubscribedPlaylist extends SubscribedPlaylist {
    private readonly handle: PlaylistManager;
    private readonly listenerConnection: (() => void)[];
    private playlistSubscribed = false;

    constructor(handle: PlaylistManager, playlistId: number) {
        super(handle.connection.getCurrentServerUniqueId(), playlistId);
        this.handle = handle;
        this.listenerConnection = [];

        const serverConnection = this.handle.connection.serverConnection;
        this.listenerConnection.push(serverConnection.command_handler_boss().register_explicit_handler("notifyplaylistsongadd", command => {
            const playlistId = parseInt(command.arguments[0]["playlist_id"]);
            if(isNaN(playlistId)) {
                logWarn(LogCategory.NETWORKING, tr("Received a playlist song add notify with an invalid playlist id (%o)"), command.arguments[0]["playlist_id"]);
                return;
            }

            if(playlistId !== this.playlistId || this.status.status !== "loaded") {
                return;
            }

            const song = parsePlayListSongEntry(command.arguments[0]);
            InternalSubscribedPlaylist.insertEntry(this.status.songs, song);

            this.events.fire("notify_entry_added", {
                entry: song
            });
        }));

        this.listenerConnection.push(serverConnection.command_handler_boss().register_explicit_handler("notifyplaylistsongremove", command => {
            const playlistId = parseInt(command.arguments[0]["playlist_id"]);
            if(isNaN(playlistId)) {
                logWarn(LogCategory.NETWORKING, tr("Received a playlist song remove notify with an invalid playlist id (%o)"), command.arguments[0]["playlist_id"]);
                return;
            }

            if(playlistId !== this.playlistId || this.status.status !== "loaded") {
                return;
            }

            const songId = parseInt(command.arguments[0]["song_id"]);
            const song = this.removeEntry(this.status.songs, songId);

            if(!song) {
                return;
            }

            this.events.fire("notify_entry_deleted", {
                entry: song
            });
        }));

        this.listenerConnection.push(serverConnection.command_handler_boss().register_explicit_handler("notifyplaylistsongreorder", command => {
            const playlistId = parseInt(command.arguments[0]["playlist_id"]);
            if(isNaN(playlistId)) {
                logWarn(LogCategory.NETWORKING, tr("Received a playlist song reorder notify with an invalid playlist id (%o)"), command.arguments[0]["playlist_id"]);
                return;
            }

            if(playlistId !== this.playlistId || this.status.status !== "loaded") {
                return;
            }

            const entryId = parseInt(command.arguments[0]["song_id"]);
            const previousEntryId = parseInt(command.arguments[0]["song_previous_song_id"]);

            if(isNaN(entryId)) {
                logError(LogCategory.NETWORKING, tr("Failed to parse song_id of playlist song reorder notify: %o"), command.arguments[0]["song_id"]);
                return;
            }

            if(isNaN(entryId)) {
                logError(LogCategory.NETWORKING, tr("Failed to parse song_previous_song_id of playlist song reorder notify: %o"), command.arguments[0]["song_previous_song_id"]);
                return;
            }

            const entry = this.removeEntry(this.status.songs, entryId);
            if(!entry) {
                return;
            }

            const oldOrderId = entry.previousId;
            entry.previousId = previousEntryId;
            InternalSubscribedPlaylist.insertEntry(this.status.songs, entry);


            this.events.fire("notify_entry_reordered", {
                entry: entry,
                oldPreviousId: oldOrderId
            });
        }));

        this.listenerConnection.push(serverConnection.command_handler_boss().register_explicit_handler("notifyplaylistsongloaded", command => {
            const playlistId = parseInt(command.arguments[0]["playlist_id"]);
            if(isNaN(playlistId)) {
                logWarn(LogCategory.NETWORKING, tr("Received a playlist song loaded notify with an invalid playlist id (%o)"), command.arguments[0]["playlist_id"]);
                return;
            }

            if(playlistId !== this.playlistId || this.status.status !== "loaded") {
                return;
            }

            const entryId = parseInt(command.arguments[0]["song_id"]);
            const entry = this.status.songs.find(entry => entry.id === entryId);

            const success = parseInt(command.arguments[0]["success"]) === 1;
            if(!success) {
                /* TODO: Change the entry type to failed and respect: load_error_msg */
                this.removeEntry(this.status.songs, entryId);
                this.events.fire("notify_entry_deleted", {
                    entry: entry,
                });
            } else if(entry.metadata.status !== "loaded") {
                try {
                    entry.metadata = parseUnparsedSongMetadata(command.arguments[0]["song_metadata"]);
                } catch (error) {
                    entry.metadata = {
                        status: "unparsed",
                        metadata: command.arguments[0]["song_metadata"]
                    };
                }

                this.events.fire("notify_entry_updated", {
                    entry: entry
                });
            }
        }));
    }

    destroy() {
        super.destroy();

        this.listenerConnection.forEach(callback => callback());
        this.listenerConnection.splice(0, this.listenerConnection.length);

        if(this.handle["subscribedPlaylist"] === this) {
            this.handle["subscribedPlaylist"] = undefined;
        }
    }

    handleUnsubscribed() {
        this.playlistSubscribed = false;
        this.setStatus({ status: "unloaded" });

        if(this.handle["subscribedPlaylist"] === this) {
            this.handle["subscribedPlaylist"] = undefined;
        }
    }

    async querySongs(forceQuery: boolean) : Promise<void> {
        if(this.status.status === "loading") {
            return;
        } else if(this.status.status === "loaded" && !forceQuery) {
            return;
        }

        this.setStatus({ status: "loading" });
        try {
            /* firstly subscribe to the playlist */
            if(!this.playlistSubscribed) {
                await this.handle.connection.serverConnection.send_command("playlistsetsubscription", { playlist_id: this.playlistId });
                if(this.handle["subscribedPlaylist"] !== this) {
                    this.handle["subscribedPlaylist"]?.handleUnsubscribed();
                }
                this.handle["subscribedPlaylist"] = this;
                this.playlistSubscribed = true;
            }

            /* now we can query the entries */
            const entries = await this.handle.queryPlaylistEntries(this.playlistId);
            /* TODO: Sort these entries! */
            this.setStatus({ status: "loaded", songs: entries });
        } catch (error) {
            if(error instanceof CommandResult) {
                if(error.id === ErrorCode.SERVER_INSUFFICIENT_PERMISSIONS) {
                    this.setStatus({ status: "no-permissions", failedPermission: this.handle.connection.permissions.getFailedPermission(error) });
                    return;
                } else if(error.id === ErrorCode.DATABASE_EMPTY_RESULT) {
                    this.setStatus({ status: "loaded", songs: [] });
                    return;
                }

                error = error.formattedMessage();
            } else if(typeof error !== "string") {
                logError(LogCategory.GENERAL, tr("Failed to query subscribed playlist entries: %o"), error);
                error = tr("Lookup the console for details");
            }

            this.setStatus({ status: "error", error: error });
        }
    }

    async deleteEntry(entryId: number): Promise<void> {
        await this.handle.removeSong(this.playlistId, entryId);
    }

    private calculatePreviousSong(targetEntryId: number | undefined, mode: "before" | "after" | "last") : number {
        if(targetEntryId === 0) {
            return 0;
        } else if(mode === "before") {
            if(this.status.status !== "loaded") {
                throw tr("Invalid playlist state");
            }

            const songIndex = this.status.songs.findIndex(song => song.id === targetEntryId);
            if(songIndex === -1) {
                throw tr("Invalid target id");
            }

            return songIndex === 0 ? 0 : this.status.songs[songIndex - 1].id;
        } else if(mode === "last") {
            if(this.status.status !== "loaded") {
                throw tr("Invalid playlist state");
            }

            return this.status.songs.last()?.id || 0;
        } else {
            return targetEntryId;
        }
    }

    async reorderEntry(entryId: number, targetEntryId: number, mode: "before" | "after"): Promise<void> {
        await this.handle.reorderSong(this.playlistId, entryId, this.calculatePreviousSong(targetEntryId, mode));
    }

    async addSong(url: string, urlLoader: "any" | "youtube" | "ffmpeg" | "channel", targetSongId: number | 0, mode?: "before" | "after" | "last"): Promise<void> {
        await this.handle.addSong(this.playlistId, url, urlLoader, this.calculatePreviousSong(targetSongId, mode || "after"));
    }

    private static insertEntry(playlist: PlaylistEntry[], entry: PlaylistEntry) {
        const index = playlist.findIndex(e => e.id === entry.previousId);

        const previousEntry = playlist[index];
        const nextEntry = playlist[index + 1];

        playlist.splice(index + 1, 0, entry);
        entry.previousId = previousEntry ? previousEntry.id : 0;
        if(nextEntry) {
            nextEntry.previousId = entry.id;
        }
    }

    private removeEntry(playlist: PlaylistEntry[], entryId: number) : PlaylistEntry | undefined {
        const index = playlist.findIndex(entry => entry.id === entryId);
        if(index === -1) {
            return undefined;
        }

        const [ song ] = playlist.splice(index, 1);
        const previousEntry = playlist[index - 1];
        const nextEntry = playlist[index];

        if(nextEntry) {
            nextEntry.previousId = previousEntry ? previousEntry.id : 0;
        }

        return song;
    }
}

export class PlaylistManager {
    readonly connection: ConnectionHandler;
    private listenerConnection: (() => void)[];

    private playlistEntryListCache: {
        [key: number]: {
            result: PlaylistEntry[],
            promise: Promise<void>
        }
    } = {};

    /* Use internally by InternalSubscribedPlaylist. Do not remove! */
    private subscribedPlaylist: InternalSubscribedPlaylist;

    constructor(connection: ConnectionHandler) {
        this.connection = connection;
        this.listenerConnection = [];

        this.listenerConnection.push(connection.serverConnection.command_handler_boss().register_explicit_handler("notifyplaylistsonglist", command => {
            const playlistId = parseInt(command.arguments[0]["playlist_id"]);
            if(isNaN(playlistId)) {
                logWarn(LogCategory.NETWORKING, tr("Received playlist song list notify with an invalid playlist id (%o)"), command.arguments[0]["playlist_id"]);
                return;
            }

            const cache = this.playlistEntryListCache[playlistId];
            if(cache) {
                for(const entry of command.arguments) {
                    if(!("song_id" in entry)) {
                        /* Some TeaSpeak versions are sending empty bulks... */
                        continue;
                    }

                    try {
                        cache.result.push(parsePlayListSongEntry(entry));
                    } catch (error) {
                        logWarn(LogCategory.NETWORKING, tr("Failed to parse playlist entry: %o"), error);
                    }
                }
            }
        }));
    }

    destroy() {
        this.listenerConnection.forEach(callback => callback());
        this.listenerConnection.splice(0, this.listenerConnection.length);

        this.playlistEntryListCache = {};
    }

    async queryPlaylistEntries(playlistId: number) : Promise<PlaylistEntry[]> {
        let cache = this.playlistEntryListCache[playlistId];
        if(!cache) {
            cache = this.playlistEntryListCache[playlistId] = {
                result: [],
                promise: (async () => {
                    try {
                        await this.connection.serverConnection.send_command("playlistsonglist", { "playlist_id": playlistId });
                    } finally {
                        delete this.playlistEntryListCache[playlistId];
                    }
                })()
            };
        }

        await cache.promise;
        return cache.result;
    }

    async reorderSong(playlistId: number, songId: number, previousSongId: number) {
        await this.connection.serverConnection.send_command("playlistsongreorder", {
            "playlist_id": playlistId,
            "song_id": songId,
            "song_previous_song_id": previousSongId
        });
    }

    async addSong(playlistId: number, url: string, urlLoader: "any" | "youtube" | "ffmpeg" | "channel", previousSongId: number | 0) {
        await this.connection.serverConnection.send_command("playlistsongadd", {
            "playlist_id": playlistId,
            "previous": previousSongId,
            "url": url,
            "type": urlLoader
        });
    }

    async removeSong(playlistId: number, entryId: number) {
        await this.connection.serverConnection.send_command("playlistsongremove", {
            "playlist_id": playlistId,
            "song_id": entryId,
        });
    }

    /**
     * @param playlistId
     * @return Returns a subscribed playlist.
     * Attention: You have to manually destroy the object!
     */
    createSubscribedPlaylist(playlistId: number) : SubscribedPlaylist {
        return new InternalSubscribedPlaylist(this, playlistId);
    }
}