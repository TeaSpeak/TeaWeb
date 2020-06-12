import {LaterPromise} from "tc-shared/utils/LaterPromise";

export enum ErrorID {
    NOT_IMPLEMENTED = 0x2,
    COMMAND_NOT_FOUND = 0x100,

    PERMISSION_ERROR = 2568,
    EMPTY_RESULT = 0x0501,
    PLAYLIST_IS_IN_USE = 0x2103,

    FILE_ALREADY_EXISTS = 2050,
    FILE_NOT_FOUND = 2051,

    CLIENT_INVALID_ID = 0x0200,

    CONVERSATION_INVALID_ID = 0x2200,
    CONVERSATION_MORE_DATA = 0x2201,
    CONVERSATION_IS_PRIVATE = 0x2202
}

export enum ErrorCode {
    FILE_INVALID_NAME = 0X800,
    FILE_INVALID_PERMISSIONS = 0X801,
    FILE_ALREADY_EXISTS = 0X802,
    FILE_NOT_FOUND = 0X803,
    FILE_IO_ERROR = 0X804,
    FILE_INVALID_TRANSFER_ID = 0X805,
    FILE_INVALID_PATH = 0X806,
    FILE_NO_FILES_AVAILABLE = 0X807,
    FILE_OVERWRITE_EXCLUDES_RESUME = 0X808,
    FILE_INVALID_SIZE = 0X809,
    FILE_ALREADY_IN_USE = 0X80A,
    FILE_COULD_NOT_OPEN_CONNECTION = 0X80B,
    FILE_NO_SPACE_LEFT_ON_DEVICE = 0X80C,
    FILE_EXCEEDS_FILE_SYSTEM_MAXIMUM_SIZE = 0X80D,
    FILE_TRANSFER_CONNECTION_TIMEOUT = 0X80E,
    FILE_CONNECTION_LOST = 0X80F,
    FILE_EXCEEDS_SUPPLIED_SIZE = 0X810,
    FILE_TRANSFER_COMPLETE = 0X811,
    FILE_TRANSFER_CANCELED = 0X812,
    FILE_TRANSFER_INTERRUPTED = 0X813,
    FILE_TRANSFER_SERVER_QUOTA_EXCEEDED = 0X814,
    FILE_TRANSFER_CLIENT_QUOTA_EXCEEDED = 0X815,
    FILE_TRANSFER_RESET = 0X816,
    FILE_TRANSFER_LIMIT_REACHED = 0X817,

    FILE_API_TIMEOUT = 0X820,
    FILE_VIRTUAL_SERVER_NOT_REGISTERED = 0X821,
    FILE_SERVER_TRANSFER_LIMIT_REACHED = 0X822,
    FILE_CLIENT_TRANSFER_LIMIT_REACHED = 0X823,
}

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
    //cluid=tYzKUryn\/\/Y8VBMf8PHUT6B1eiE= name=Exp clname=Exp cldbid=9
    client_unique_id: string;
    client_nickname: string;
    client_database_id: number;
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