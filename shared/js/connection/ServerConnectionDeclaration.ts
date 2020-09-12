import {LaterPromise} from "../utils/LaterPromise";

export class CommandResult {
    success: boolean;
    id: number;
    message: string;
    extra_message: string;

    json: any;

    bulks: any[];

    constructor(bulks) {
        this.bulks = bulks;

        this.json = bulks[0];
        this.id = parseInt(this.json["id"]);
        this.message = this.json["msg"];

        this.extra_message = this.json["extra_msg"] || "";
        this.success = this.id == 0;
    }

    getBulks() : CommandResult[] {
        return this.bulks.map(e => new CommandResult([e]));
    }

    formattedMessage() {
        return this.extra_message ? this.message + " (" + this.extra_message + ")" : this.message;
    }
}

export interface ClientNameInfo {
    clientUniqueId: string;
    clientNickname: string;
    clientDatabaseId: number;
}

export interface ClientNameFromUid {
    promise: LaterPromise<ClientNameInfo[]>,
    keys: string[],
    response: ClientNameInfo[]
}

export interface ServerGroupClient {
    client_nickname: string;
    client_unique_identifier: string;
    client_database_id: number;
}

export interface QueryListEntry {
    username: string;
    unique_id: string;
    bounded_server: number;
}

export interface QueryList {
    flag_own: boolean;
    flag_all: boolean;

    queries: QueryListEntry[];
}

export interface Playlist {
    playlist_id: number;
    playlist_bot_id: number;
    playlist_title: string;
    playlist_type: number;
    playlist_owner_dbid: number;
    playlist_owner_name: string;

    needed_power_modify: number;
    needed_power_permission_modify: number;
    needed_power_delete: number;
    needed_power_song_add: number;
    needed_power_song_move: number;
    needed_power_song_remove: number;
}

export interface PlaylistInfo {
    playlist_id: number,
    playlist_title: string,
    playlist_description: string,
    playlist_type: number,

    playlist_owner_dbid: number,
    playlist_owner_name: string,

    playlist_flag_delete_played: boolean,
    playlist_flag_finished: boolean,
    playlist_replay_mode: number,
    playlist_current_song_id: number,

    playlist_max_songs: number
}

export interface PlaylistSong {
    song_id: number;
    song_previous_song_id: number;
    song_invoker: string;
    song_url: string;
    song_url_loader: string;
    song_loaded: boolean;
    song_metadata: string;
}