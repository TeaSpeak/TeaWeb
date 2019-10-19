enum ErrorID {
    NOT_IMPLEMENTED = 0x2,
    COMMAND_NOT_FOUND = 0x100,

    PERMISSION_ERROR = 2568,
    EMPTY_RESULT = 0x0501,
    PLAYLIST_IS_IN_USE = 0x2103,

    FILE_ALREADY_EXISTS = 2050,

    CLIENT_INVALID_ID = 0x0200,

    CONVERSATION_INVALID_ID = 0x2200,
    CONVERSATION_MORE_DATA = 0x2201,
    CONVERSATION_IS_PRIVATE = 0x2202
}

class CommandResult {
    success: boolean;
    id: number;
    message: string;
    extra_message: string;

    json: any;

    constructor(json) {
        this.json = json;
        this.id = parseInt(json["id"]);
        this.message = json["msg"];

        this.extra_message = "";
        if(json["extra_msg"]) this.extra_message = json["extra_msg"];

        this.success = this.id == 0;
    }
}

interface ClientNameInfo {
    //cluid=tYzKUryn\/\/Y8VBMf8PHUT6B1eiE= name=Exp clname=Exp cldbid=9
    client_unique_id: string;
    client_nickname: string;
    client_database_id: number;
}

interface ClientNameFromUid {
    promise: LaterPromise<ClientNameInfo[]>,
    keys: string[],
    response: ClientNameInfo[]
}

interface ServerGroupClient {
    client_nickname: string;
    client_unique_identifier: string;
    client_database_id: number;
}

interface QueryListEntry {
    username: string;
    unique_id: string;
    bounded_server: number;
}

interface QueryList {
    flag_own: boolean;
    flag_all: boolean;

    queries: QueryListEntry[];
}

interface Playlist {
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

interface PlaylistInfo {
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
}

interface PlaylistSong {
    song_id: number;
    song_previous_song_id: number;
    song_invoker: string;
    song_url: string;
    song_url_loader: string;
    song_loaded: boolean;
    song_metadata: string;
}