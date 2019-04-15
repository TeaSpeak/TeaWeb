
/* File: shared/js/bookmarks.ts */
declare namespace bookmarks {
    export interface ServerProperties {
        server_address: string;
        server_port: number;
        server_password_hash?: string;
        server_password?: string;
    }
    export enum BookmarkType {
        ENTRY,
        DIRECTORY
    }
    export interface Bookmark {
        type: BookmarkType;
        server_properties: ServerProperties;
        display_name: string;
        unique_id: string;
        nickname: string;
        default_channel?: number | string;
        default_channel_password_hash?: string;
        default_channel_password?: string;
        connect_profile: string;
    }
    export interface DirectoryBookmark {
        type: BookmarkType;
        readonly content: (Bookmark | DirectoryBookmark)[];
        unique_id: string;
        display_name: string;
    }
    export function bookmarks(): DirectoryBookmark;
    export function find_bookmark(uuid: string): Bookmark | DirectoryBookmark | undefined;
    export function parent_bookmark(bookmark: Bookmark): DirectoryBookmark;
    export function create_bookmark(display_name: string, directory: DirectoryBookmark, server_properties: ServerProperties, nickname: string): Bookmark;
    export function create_bookmark_directory(parent: DirectoryBookmark, name: string): DirectoryBookmark;
    export function change_directory(parent: DirectoryBookmark, bookmark: Bookmark | DirectoryBookmark);
    export function save_bookmark(bookmark?: Bookmark | DirectoryBookmark);
    export function delete_bookmark(bookmark: Bookmark | DirectoryBookmark);
}

/* File: shared/js/BrowserIPC.ts */
declare interface Window {
    BroadcastChannel: BroadcastChannel;
}
declare namespace bipc {
    export interface BroadcastMessage {
        timestamp: number;
        receiver: string;
        sender: string;
        type: string;
        data: any;
    }
    export interface ProcessQueryResponse {
        request_timestamp: number;
        request_query_id: string;
        device_id: string;
        protocol: number;
    }
    export interface CertificateAcceptCallback {
        request_id: string;
    }
    export interface CertificateAcceptSucceeded {
    }
    export abstract class BasicIPCHandler {
        protected static readonly BROADCAST_UNIQUE_ID;
        protected static readonly PROTOCOL_VERSION;
        protected unique_id;
        protected constructor();
        setup();
        abstract send_message(type: string, data: any, target?: string);
        protected handle_message(message: BroadcastMessage);
        private _query_results: {
            [key: string]: ProcessQueryResponse[];
        };
        query_processes(timeout?: number): Promise<ProcessQueryResponse[]>;
        private _cert_accept_callbacks: {
            [key: string]: (() => any);
        };
        register_certificate_accept_callback(callback: () => any): string;
        private _cert_accept_succeeded: {
            [sender: string]: (() => any);
        };
        post_certificate_accpected(id: string, timeout?: number): Promise<void>;
    }
    export class BroadcastChannelIPC extends BasicIPCHandler {
        private static readonly CHANNEL_NAME;
        private channel: BroadcastChannel;
        constructor();
        setup();
        private on_message(event: MessageEvent);
        private on_error(event: MessageEvent);
        send_message(type: string, data: any, target?: string);
    }
    export function setup();
    export function get_handler();
    export function supported();
}

/* File: shared/js/codec/BasicCodec.ts */
declare class AVGCalculator {
    history_size: number;
    history: number[];
    push(entry: number);
    avg(): number;
}
declare abstract class BasicCodec implements Codec {
    protected _audioContext: OfflineAudioContext;
    protected _decodeResampler: AudioResampler;
    protected _encodeResampler: AudioResampler;
    protected _codecSampleRate: number;
    protected _latenz: AVGCalculator;
    on_encoded_data: (Uint8Array) => void;
    channelCount: number;
    samplesPerUnit: number;
    protected constructor(codecSampleRate: number);
    abstract name(): string;
    abstract initialise(): Promise<Boolean>;
    abstract initialized(): boolean;
    abstract deinitialise();
    abstract reset(): boolean;
    protected abstract decode(data: Uint8Array): Promise<AudioBuffer>;
    protected abstract encode(data: AudioBuffer): Promise<Uint8Array | string>;
    encodeSamples(cache: CodecClientCache, pcm: AudioBuffer);
    private encodeSamples0(cache: CodecClientCache, buffer: AudioBuffer);
    decodeSamples(cache: CodecClientCache, data: Uint8Array): Promise<AudioBuffer>;
}

/* File: shared/js/codec/Codec.ts */
declare interface CodecCostructor {
    new (codecSampleRate: number): Codec;
}
declare enum CodecType {
    OPUS_VOICE,
    OPUS_MUSIC,
    SPEEX_NARROWBAND,
    SPEEX_WIDEBAND,
    SPEEX_ULTRA_WIDEBAND,
    CELT_MONO
}
declare class BufferChunk {
    buffer: AudioBuffer;
    index: number;
    constructor(buffer: AudioBuffer);
    copyRangeTo(target: AudioBuffer, maxLength: number, offset: number);
}
declare class CodecClientCache {
    _last_access: number;
    _chunks: BufferChunk[];
    bufferedSamples(max?: number): number;
}
declare interface Codec {
    on_encoded_data: (Uint8Array) => void;
    channelCount: number;
    samplesPerUnit: number;
    name(): string;
    initialise();
    deinitialise();
    decodeSamples(cache: CodecClientCache, data: Uint8Array): Promise<AudioBuffer>;
    encodeSamples(cache: CodecClientCache, pcm: AudioBuffer);
    reset(): boolean;
}

/* File: shared/js/codec/CodecWrapperRaw.ts */
declare class CodecWrapperRaw extends BasicCodec {
    converterRaw: any;
    converter: Uint8Array;
    bufferSize: number;
    constructor(codecSampleRate: number);
    name(): string;
    initialise(): Promise<Boolean>;
    initialized(): boolean;
    deinitialise();
    protected decode(data: Uint8Array): Promise<AudioBuffer>;
    protected encode(data: AudioBuffer): Promise<Uint8Array>;
    reset(): boolean;
    processLatency(): number;
}

/* File: shared/js/codec/CodecWrapperWorker.ts */
declare class CodecWrapperWorker extends BasicCodec {
    private _worker: Worker;
    private _workerListener: {
        token: string;
        resolve: (data: any) => void;
    }[];
    private _workerCallbackToken;
    private _workerTokeIndex: number;
    type: CodecType;
    private _initialized: boolean;
    private _workerCallbackResolve: () => any;
    private _workerCallbackReject: ($: any) => any;
    private _initializePromise: Promise<Boolean>;
    name(): string;
    initialise(): Promise<Boolean>;
    initialized(): boolean;
    deinitialise();
    decode(data: Uint8Array): Promise<AudioBuffer>;
    encode(data: AudioBuffer): Promise<Uint8Array>;
    reset(): boolean;
    constructor(type: CodecType);
    private generateToken();
    private sendWorkerMessage(message: any, transfare?: any[]);
    private onWorkerMessage(message: any);
    private spawnWorker(): Promise<Boolean>;
}

/* File: shared/js/connection/CommandHandler.ts */
declare namespace connection {
    export class ServerConnectionCommandBoss extends AbstractCommandHandlerBoss {
        constructor(connection: AbstractServerConnection);
    }
    export class ConnectionCommandHandler extends AbstractCommandHandler {
        readonly connection: AbstractServerConnection;
        readonly connection_handler: ConnectionHandler;
        constructor(connection: AbstractServerConnection);
        handle_command(command: ServerCommand): boolean;
        set_handler(command: string, handler: any);
        unset_handler(command: string, handler?: any);
        handleCommandResult(json);
        handleCommandServerInit(json);
        private createChannelFromJson(json, ignoreOrder?: boolean);
        handleCommandChannelList(json);
        handleCommandChannelListFinished(json);
        handleCommandChannelCreate(json);
        handleCommandChannelShow(json);
        handleCommandChannelDelete(json);
        handleCommandChannelHide(json);
        handleCommandClientEnterView(json);
        handleCommandClientLeftView(json);
        handleNotifyClientMoved(json);
        handleNotifyChannelMoved(json);
        handleNotifyChannelEdited(json);
        handleNotifyTextMessage(json);
        handleNotifyClientChatClosed(json);
        handleNotifyClientUpdated(json);
        handleNotifyServerEdited(json);
        handleNotifyServerUpdated(json);
        handleNotifyMusicPlayerInfo(json);
        handleNotifyClientPoke(json);
        handleNotifyServerGroupClientAdd(json);
        handleNotifyServerGroupClientRemove(json);
        handleNotifyClientChannelGroupChanged(json);
        handleNotifyChannelSubscribed(json);
        handleNotifyChannelUnsubscribed(json);
    }
}

/* File: shared/js/connection/CommandHelper.ts */
declare namespace connection {
    export class CommandHelper extends AbstractCommandHandler {
        private _who_am_i: any;
        private _awaiters_unique_ids: {
            [unique_id: string]: ((resolved: ClientNameInfo) => any)[];
        };
        constructor(connection);
        initialize();
        handle_command(command: connection.ServerCommand): boolean;
        joinChannel(channel: ChannelEntry, password?: string): Promise<CommandResult>;
        sendMessage(message: string, type: ChatType, target?: ChannelEntry | ClientEntry): Promise<CommandResult>;
        updateClient(key: string, value: string): Promise<CommandResult>;
        info_from_uid(..._unique_ids: string[]): Promise<ClientNameInfo[]>;
        private handle_notifyclientnamefromuid(json: any[]);
        request_query_list(server_id?: number): Promise<QueryList>;
        request_playlist_list(): Promise<Playlist[]>;
        request_playlist_songs(playlist_id: number): Promise<PlaylistSong[]>;
        request_playlist_info(playlist_id: number): Promise<PlaylistInfo>;
        current_virtual_server_id(): Promise<number>;
    }
}

/* File: shared/js/connection/ConnectionBase.ts */
declare namespace connection {
    export interface CommandOptions {
        flagset?: string[];
        process_result?: boolean;
        timeout?: number;
    }
    export const CommandOptionDefaults: CommandOptions;
    export type ConnectionStateListener = (old_state: ConnectionState, new_state: ConnectionState) => any;
    export abstract class AbstractServerConnection {
        readonly client: ConnectionHandler;
        readonly command_helper: CommandHelper;
        protected constructor(client: ConnectionHandler);
        abstract connect(address: ServerAddress, handshake: HandshakeHandler, timeout?: number): Promise<void>;
        abstract connected(): boolean;
        abstract disconnect(reason?: string): Promise<void>;
        abstract support_voice(): boolean;
        abstract voice_connection(): voice.AbstractVoiceConnection | undefined;
        abstract command_handler_boss(): AbstractCommandHandlerBoss;
        abstract send_command(command: string, data?: any | any[], options?: CommandOptions): Promise<CommandResult>;
        // @ts-ignore
        abstract get onconnectionstatechanged(): ConnectionStateListener;
        // @ts-ignore
        abstract set onconnectionstatechanged(listener: ConnectionStateListener);
        abstract remote_address(): ServerAddress;
        abstract handshake_handler(): HandshakeHandler;
    }
    export namespace voice {
        export enum PlayerState {
            PREBUFFERING,
            PLAYING,
            BUFFERING,
            STOPPING,
            STOPPED
        }
        export interface VoiceClient {
            client_id: number;
            callback_playback: () => any;
            callback_stopped: () => any;
            callback_state_changed: (new_state: PlayerState) => any;
            get_state(): PlayerState;
            get_volume(): number;
            set_volume(volume: number): void;
            abort_replay();
        }
        export abstract class AbstractVoiceConnection {
            readonly connection: AbstractServerConnection;
            protected constructor(connection: AbstractServerConnection);
            abstract connected(): boolean;
            abstract encoding_supported(codec: number): boolean;
            abstract decoding_supported(codec: number): boolean;
            abstract register_client(client_id: number): VoiceClient;
            abstract available_clients(): VoiceClient[];
            abstract unregister_client(client: VoiceClient): Promise<void>;
            abstract voice_recorder(): VoiceRecorder;
            abstract acquire_voice_recorder(recorder: VoiceRecorder | undefined);
        }
    }
    export class ServerCommand {
        command: string;
        arguments: any[];
    }
    export abstract class AbstractCommandHandler {
        readonly connection: AbstractServerConnection;
        handler_boss: AbstractCommandHandlerBoss | undefined;
        volatile_handler_boss: boolean;
        ignore_consumed: boolean;
        protected constructor(connection: AbstractServerConnection);
        abstract handle_command(command: ServerCommand): boolean;
    }
    export interface SingleCommandHandler {
        name?: string;
        command?: string;
        timeout?: number;
        function: (command: ServerCommand) => boolean;
    }
    export abstract class AbstractCommandHandlerBoss {
        readonly connection: AbstractServerConnection;
        protected command_handlers: AbstractCommandHandler[];
        protected single_command_handler: SingleCommandHandler[];
        protected constructor(connection: AbstractServerConnection);
        register_handler(handler: AbstractCommandHandler);
        unregister_handler(handler: AbstractCommandHandler);
        register_single_handler(handler: SingleCommandHandler);
        remove_single_handler(handler: SingleCommandHandler);
        handlers(): AbstractCommandHandler[];
        invoke_handle(command: ServerCommand): boolean;
    }
}

/* File: shared/js/connection/HandshakeHandler.ts */
declare const native: any;
declare namespace connection {
    export interface HandshakeIdentityHandler {
        connection: AbstractServerConnection;
        start_handshake();
        register_callback(callback: (success: boolean, message?: string) => any);
    }
    export class HandshakeHandler {
        private connection: AbstractServerConnection;
        private handshake_handler: HandshakeIdentityHandler;
        private failed;
        readonly profile: profiles.ConnectionProfile;
        readonly name: string;
        readonly server_password: string;
        constructor(profile: profiles.ConnectionProfile, name: string, password: string);
        setConnection(con: AbstractServerConnection);
        initialize();
        get_identity_handler(): HandshakeIdentityHandler;
        startHandshake();
        private handshake_failed(message: string);
        private handshake_finished(version?: string);
    }
}

/* File: shared/js/connection/ServerConnection.ts */
declare enum ErrorID {
    PERMISSION_ERROR,
    EMPTY_RESULT,
    PLAYLIST_IS_IN_USE
}
declare class CommandResult {
    success: boolean;
    id: number;
    message: string;
    extra_message: string;
    json: any;
    constructor(json);
}
declare class ReturnListener<T> {
    resolve: (value?: T | PromiseLike<T>) => void;
    reject: (reason?: any) => void;
    code: string;
    timeout: NodeJS.Timer;
}
declare namespace connection {
    export class ServerConnection extends AbstractServerConnection {
        _socket: WebSocket;
        _connectionState: ConnectionState;
        private _remote_address: ServerAddress;
        private _handshakeHandler: HandshakeHandler;
        private _command_boss: ServerConnectionCommandBoss;
        private _command_handler_default: ConnectionCommandHandler;
        private _command_handler_handshake: AbstractCommandHandler;
        private _connect_timeout_timer: NodeJS.Timer;
        private _connected: boolean;
        private _retCodeIdx: number;
        private _retListener: ReturnListener<CommandResult>[];
        private _connection_state_listener: connection.ConnectionStateListener;
        private _voice_connection: audio.js.VoiceConnection;
        constructor(client: ConnectionHandler);
        on_connect: () => void;
        private generateReturnCode(): string;
        connect(address: ServerAddress, handshake: HandshakeHandler, timeout?: number): Promise<void>;
        updateConnectionState(state: ConnectionState);
        disconnect(reason?: string): Promise<void>;
        private handle_socket_message(data);
        sendData(data: any);
        private commandiefy(input: any): string;
        send_command(command: string, data?: any | any[], _options?: CommandOptions): Promise<CommandResult>;
        connected(): boolean;
        support_voice(): boolean;
        voice_connection(): connection.voice.AbstractVoiceConnection | undefined;
        command_handler_boss(): connection.AbstractCommandHandlerBoss;
        // @ts-ignore
        get onconnectionstatechanged(): connection.ConnectionStateListener;
        // @ts-ignore
        set onconnectionstatechanged(listener: connection.ConnectionStateListener);
        handshake_handler(): connection.HandshakeHandler;
        remote_address(): ServerAddress;
    }
    export function spawn_server_connection(handle: ConnectionHandler): AbstractServerConnection;
}
declare interface ClientNameInfo {
    client_unique_id: string;
    client_nickname: string;
    client_database_id: number;
}
declare interface ClientNameFromUid {
    promise: LaterPromise<ClientNameInfo[]>;
    keys: string[];
    response: ClientNameInfo[];
}
declare interface QueryListEntry {
    username: string;
    unique_id: string;
    bounded_server: number;
}
declare interface QueryList {
    flag_own: boolean;
    flag_all: boolean;
    queries: QueryListEntry[];
}
declare interface Playlist {
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
declare interface PlaylistInfo {
    playlist_id: number;
    playlist_title: string;
    playlist_description: string;
    playlist_type: number;
    playlist_owner_dbid: number;
    playlist_owner_name: string;
    playlist_flag_delete_played: boolean;
    playlist_flag_finished: boolean;
    playlist_replay_mode: number;
    playlist_current_song_id: number;
}
declare interface PlaylistSong {
    song_id: number;
    song_previous_song_id: number;
    song_invoker: string;
    song_url: string;
    song_url_loader: string;
    song_loaded: boolean;
    song_metadata: string;
}

/* File: shared/js/ConnectionHandler.ts */
declare enum DisconnectReason {
    HANDLER_DESTROYED,
    REQUESTED,
    DNS_FAILED,
    CONNECT_FAILURE,
    CONNECTION_CLOSED,
    CONNECTION_FATAL_ERROR,
    CONNECTION_PING_TIMEOUT,
    CLIENT_KICKED,
    CLIENT_BANNED,
    HANDSHAKE_FAILED,
    SERVER_CLOSED,
    SERVER_REQUIRES_PASSWORD,
    IDENTITY_TOO_LOW,
    UNKNOWN
}
declare enum ConnectionState {
    UNCONNECTED,
    CONNECTING,
    INITIALISING,
    CONNECTED,
    DISCONNECTING
}
declare enum ViewReasonId {
    VREASON_USER_ACTION,
    VREASON_MOVED,
    VREASON_SYSTEM,
    VREASON_TIMEOUT,
    VREASON_CHANNEL_KICK,
    VREASON_SERVER_KICK,
    VREASON_BAN,
    VREASON_SERVER_STOPPED,
    VREASON_SERVER_LEFT,
    VREASON_CHANNEL_UPDATED,
    VREASON_EDITED,
    VREASON_SERVER_SHUTDOWN
}
declare interface VoiceStatus {
    input_hardware: boolean;
    input_muted: boolean;
    output_muted: boolean;
    channel_codec_encoding_supported: boolean;
    channel_codec_decoding_supported: boolean;
    sound_playback_supported: boolean;
    sound_record_supported;
    away: boolean | string;
    channel_subscribe_all: boolean;
    queries_visible: boolean;
}
declare class ConnectionHandler {
    channelTree: ChannelTree;
    serverConnection: connection.AbstractServerConnection;
    fileManager: FileManager;
    permissions: PermissionManager;
    groups: GroupManager;
    select_info: InfoBar;
    chat: ChatBox;
    settings: ServerSettings;
    sound: sound.SoundManager;
    readonly tag_connection_handler: JQuery;
    private _clientId: number;
    private _local_client: LocalClientEntry;
    private _reconnect_timer: NodeJS.Timer;
    private _reconnect_attempt: boolean;
    private _connect_initialize_id: number;
    client_status: VoiceStatus;
    invoke_resized_on_activate: boolean;
    constructor();
    setup();
    startConnection(addr: string, profile: profiles.ConnectionProfile, name?: string, password?: {
        password: string;
        hashed: boolean;
    });
    getClient(): LocalClientEntry;
    getClientId();
    // @ts-ignore
    set clientId(id: number);
    // @ts-ignore
    get clientId();
    getServerConnection(): connection.AbstractServerConnection;
    onConnected();
    private initialize_server_settings();
    // @ts-ignore
    get connected(): boolean;
    private generate_ssl_certificate_accept(): JQuery;
    private _certificate_modal: Modal;
    handleDisconnect(type: DisconnectReason, data?: any);
    cancel_reconnect();
    private on_connection_state_changed();
    update_voice_status(targetChannel?: ChannelEntry);
    sync_status_with_server();
    set_away_status(state: boolean | string);
    resize_elements();
    acquire_recorder(voice_recoder: VoiceRecorder, update_control_bar: boolean);
}

/* File: shared/js/crypto/asn1.ts */
declare namespace asn1 {
    export class Int10 {
        constructor(value?: any);
        sub(sub: number);
        mulAdd(mul: number, add: number);
        simplify();
    }
    export class Stream {
        private static HEX_DIGITS;
        private static reTimeS;
        private static reTimeL;
        position: number;
        data: string | ArrayBuffer;
        constructor(data: string | Stream | ArrayBuffer, position: number);
        length(): number;
        get(position?: number);
        hexByte(byte: number);
        parseStringISO(start, end);
        parseStringUTF(start, end);
        parseStringBMP(start, end);
        parseTime(start, end, shortYear);
        parseInteger(start, end);
        isASCII(start: number, end: number);
        parseBitString(start, end, maxLength);
        parseOctetString(start, end, maxLength);
        parseOID(start, end, maxLength);
    }
    export enum TagClass {
        UNIVERSAL,
        APPLICATION,
        CONTEXT,
        PRIVATE
    }
    export enum TagType {
        EOC,
        BOOLEAN,
        INTEGER,
        BIT_STRING,
        OCTET_STRING,
        NULL,
        OBJECT_IDENTIFIER,
        ObjectDescriptor,
        EXTERNAL,
        REAL,
        ENUMERATED,
        EMBEDDED_PDV,
        UTF8String,
        SEQUENCE,
        SET,
        NumericString,
        PrintableString,
        TeletextString,
        VideotexString,
        IA5String,
        UTCTime,
        GeneralizedTime,
        GraphicString,
        VisibleString,
        GeneralString,
        UniversalString,
        BMPString
    }
    export class ASN1Tag {
        tagClass: TagClass;
        type: TagType;
        tagConstructed: boolean;
        tagNumber: number;
        constructor(stream: Stream);
        isUniversal();
        isEOC();
    }
    export class ASN1 {
        stream: Stream;
        header: number;
        length: number;
        tag: ASN1Tag;
        children: ASN1[];
        constructor(stream: Stream, header: number, length: number, tag: ASN1Tag, children: ASN1[]);
        content(max_length?: number, type?: TagType);
        typeName(): string;
        toString();
        toPrettyString(indent);
        posStart();
        posContent();
        posEnd();
        static decodeLength(stream: Stream);
        static encodeLength(buffer: Uint8Array, offset: number, length: number);
    }
    export function decode(stream: string | ArrayBuffer);
}

/* File: shared/js/crypto/hex.ts */
declare namespace hex {
    export function encode(buffer);
}

/* File: shared/js/crypto/sha.ts */
declare function define($);
declare function unescape(string: string): string;
declare class _sha1 {
    static arrayBuffer($: ArrayBuffer): ArrayBuffer;
}
declare interface Window {
    TextEncoder: any;
}
declare namespace sha {
    export function encode_text(buffer: string): ArrayBuffer;
    export function sha1(message: string | ArrayBuffer): PromiseLike<ArrayBuffer>;
}

/* File: shared/js/crypto/src32.ts */
declare class Crc32 {
    private static readonly lookup;
    private crc: number;
    constructor();
    update(data: ArrayBufferLike);
    digest(radix: number);
}

/* File: shared/js/dns.ts */
declare namespace dns {
    export interface AddressTarget {
        target_ip: string;
        target_port?: number;
    }
    export interface ResolveOptions {
        timeout?: number;
        allow_cache?: boolean;
        max_depth?: number;
        allow_srv?: boolean;
        allow_cname?: boolean;
        allow_any?: boolean;
        allow_a?: boolean;
        allow_aaaa?: boolean;
    }
    export const default_options: ResolveOptions;
    export function supported();
    export function resolve_address(address: string, options?: ResolveOptions): Promise<AddressTarget>;
}

/* File: shared/js/FileManager.ts */
declare class FileEntry {
    name: string;
    datetime: number;
    type: number;
    size: number;
}
declare class FileListRequest {
    path: string;
    entries: FileEntry[];
    callback: (entries: FileEntry[]) => void;
}
declare namespace transfer {
    export interface TransferKey {
        client_transfer_id: number;
        server_transfer_id: number;
        key: string;
        file_path: string;
        file_name: string;
        peer: {
            hosts: string[];
            port: number;
        };
        total_size: number;
    }
    export interface UploadOptions {
        name: string;
        path: string;
        channel?: ChannelEntry;
        channel_password?: string;
        size: number;
        overwrite: boolean;
    }
    export interface DownloadTransfer {
        get_key(): DownloadKey;
        request_file(): Promise<Response>;
    }
    export type DownloadKey = TransferKey;
    export type UploadKey = TransferKey;
    export function spawn_download_transfer(key: DownloadKey): DownloadTransfer;
    export function spawn_upload_transfer(key: DownloadKey): DownloadTransfer;
}
declare class RequestFileDownload implements transfer.DownloadTransfer {
    readonly transfer_key: transfer.DownloadKey;
    constructor(key: transfer.DownloadKey);
    request_file(): Promise<Response>;
    private try_fetch(url: string): Promise<Response>;
    get_key(): transfer.DownloadKey;
}
declare class RequestFileUpload {
    readonly transfer_key: transfer.UploadKey;
    constructor(key: transfer.DownloadKey);
    put_data(data: BufferSource | File);
    try_put(data: FormData, url: string): Promise<void>;
}
declare class FileManager extends connection.AbstractCommandHandler {
    handle: ConnectionHandler;
    icons: IconManager;
    avatars: AvatarManager;
    private listRequests: FileListRequest[];
    private pending_download_requests: transfer.DownloadKey[];
    private pending_upload_requests: transfer.UploadKey[];
    private transfer_counter: number;
    constructor(client: ConnectionHandler);
    handle_command(command: connection.ServerCommand): boolean;
    requestFileList(path: string, channel?: ChannelEntry, password?: string): Promise<FileEntry[]>;
    private notifyFileList(json);
    private notifyFileListFinished(json);
    download_file(path: string, file: string, channel?: ChannelEntry, password?: string): Promise<transfer.DownloadKey>;
    upload_file(options: transfer.UploadOptions): Promise<transfer.UploadKey>;
    private notifyStartDownload(json);
    private notifyStartUpload(json);
}
declare class Icon {
    id: number;
    url: string;
}
declare enum ImageType {
    UNKNOWN,
    BITMAP,
    PNG,
    GIF,
    SVG,
    JPEG
}
declare function media_image_type(type: ImageType, file?: boolean);
declare function image_type(base64: string);
declare class CacheManager {
    readonly cache_name: string;
    private _cache_category: Cache;
    constructor(name: string);
    setupped(): boolean;
    setup();
    cleanup(max_age: number);
    resolve_cached(key: string, max_age?: number): Promise<Response | undefined>;
    put_cache(key: string, value: Response, type?: string, headers?: {
        [key: string]: string;
    });
}
declare class IconManager {
    private static cache: CacheManager;
    handle: FileManager;
    private _id_urls: {
        [id: number]: string;
    };
    private _loading_promises: {
        [id: number]: Promise<Icon>;
    };
    constructor(handle: FileManager);
    iconList(): Promise<FileEntry[]>;
    create_icon_download(id: number): Promise<transfer.DownloadKey>;
    private _response_url(response: Response);
    resolved_cached?(id: number): Promise<Icon>;
    private _load_icon(id: number): Promise<Icon>;
    loadIcon(id: number): Promise<Icon>;
    generateTag(id: number, options?: {
        animate?: boolean;
    }): JQuery<HTMLDivElement>;
}
declare class Avatar {
    client_avatar_id: string;
    avatar_id: string;
    url: string;
    type: ImageType;
}
declare class AvatarManager {
    handle: FileManager;
    private static cache: CacheManager;
    private _cached_avatars: {
        [response_avatar_id: number]: Avatar;
    };
    private _loading_promises: {
        [response_avatar_id: number]: Promise<Icon>;
    };
    constructor(handle: FileManager);
    private _response_url(response: Response, type: ImageType): Promise<string>;
    resolved_cached?(client_avatar_id: string, avatar_id?: string): Promise<Avatar>;
    create_avatar_download(client_avatar_id: string): Promise<transfer.DownloadKey>;
    private _load_avatar(client_avatar_id: string, avatar_id: string);
    loadAvatar(client_avatar_id: string, avatar_id: string): Promise<Avatar>;
    generate_client_tag(client: ClientEntry): JQuery;
    generate_tag(client_avatar_id: string, avatar_id?: string, options?: {
        callback_image?: (tag: JQuery<HTMLImageElement>) => any;
        callback_avatar?: (avatar: Avatar) => any;
    }): JQuery;
}

/* File: shared/js/i18n/country.ts */
declare namespace i18n {
    export function country_name(alpha_code: string, fallback?: string);
}

/* File: shared/js/i18n/localize.ts */
declare function guid();
declare namespace i18n {
    export interface TranslationKey {
        message: string;
        line?: number;
        character?: number;
        filename?: string;
    }
    export interface Translation {
        key: TranslationKey;
        translated: string;
        flags?: string[];
    }
    export interface Contributor {
        name: string;
        email: string;
    }
    export interface TranslationFile {
        path: string;
        full_url: string;
        translations: Translation[];
    }
    export interface RepositoryTranslation {
        key: string;
        path: string;
        country_code: string;
        name: string;
        contributors: Contributor[];
    }
    export interface TranslationRepository {
        unique_id: string;
        url: string;
        name?: string;
        contact?: string;
        translations?: RepositoryTranslation[];
        load_timestamp?: number;
    }
    export function tr(message: string, key?: string);
    export function load_file(url: string, path: string): Promise<void>;
    export function load_repository(url: string): Promise<TranslationRepository>;
    export namespace config {
        export interface TranslationConfig {
            current_repository_url?: string;
            current_language?: string;
            current_translation_url: string;
            current_translation_path: string;
        }
        export interface RepositoryConfig {
            repositories?: {
                url?: string;
                repository?: TranslationRepository;
            }[];
        }
        export function repository_config();
        export function save_repository_config();
        export function translation_config(): TranslationConfig;
        export function save_translation_config();
    }
    export function register_repository(repository: TranslationRepository);
    export function registered_repositories(): TranslationRepository[];
    export function delete_repository(repository: TranslationRepository);
    export function iterate_repositories(callback_entry: (repository: TranslationRepository) => any): Promise<any>;
    export function select_translation(repository: TranslationRepository, entry: RepositoryTranslation);
    export function initialize(): Promise<any>;
}
declare const tr: typeof i18n.tr;

/* File: shared/js/load.ts */
declare namespace app {
    export enum Type {
        UNKNOWN,
        CLIENT_RELEASE,
        CLIENT_DEBUG,
        WEB_DEBUG,
        WEB_RELEASE
    }
    export let type: Type;
    export function is_web();
}
declare namespace loader {
    export type Task = {
        name: string;
        priority: number;
        function: () => Promise<void>;
    };
    export enum Stage {
        INITIALIZING,
        SETUP,
        STYLE,
        JAVASCRIPT,
        TEMPLATES,
        JAVASCRIPT_INITIALIZING,
        FINALIZING,
        LOADED,
        DONE
    }
    export let cache_tag: string | undefined;
    export function finished();
    export function register_task(stage: Stage, task: Task);
    export function execute(): Promise<any>;
    type SourcePath = string | string[];
    export class SyntaxError {
        source: any;
        constructor(source: any);
    }
    export function load_script(path: SourcePath): Promise<void>;
    export function load_scripts(paths: SourcePath[]): Promise<void>;
    export function load_style(path: SourcePath): Promise<void>;
    export function load_styles(paths: SourcePath[]): Promise<void>;
}
declare let _critical_triggered;
declare const display_critical_load;
declare const loader_impl_display_critical_error;
declare interface Window {
    impl_display_critical_error: (_: string) => any;
}
declare function displayCriticalError(message: string);
declare const loader_javascript;
declare const loader_webassembly;
declare const loader_style;
declare function load_templates(): Promise<any>;
declare function check_updates(): Promise<any>;
declare interface Window {
    $: JQuery;
}
declare let _fadeout_warned;
declare function fadeoutLoader(duration?, minAge?, ignoreAge?);

/* File: shared/js/log.ts */
declare enum LogCategory {
    CHANNEL,
    CHANNEL_PROPERTIES,
    CLIENT,
    SERVER,
    PERMISSIONS,
    GENERAL,
    NETWORKING,
    VOICE,
    I18N,
    IPC,
    IDENTITIES
}
declare namespace log {
    export enum LogType {
        TRACE,
        DEBUG,
        INFO,
        WARNING,
        ERROR
    }
    export let enabled_mapping;
    export enum GroupMode {
        NATIVE,
        PREFIX
    }
    export function initialize();
    export function log(type: LogType, category: LogCategory, message: string, ...optionalParams: any[]);
    export function trace(category: LogCategory, message: string, ...optionalParams: any[]);
    export function debug(category: LogCategory, message: string, ...optionalParams: any[]);
    export function info(category: LogCategory, message: string, ...optionalParams: any[]);
    export function warn(category: LogCategory, message: string, ...optionalParams: any[]);
    export function error(category: LogCategory, message: string, ...optionalParams: any[]);
    export function group(level: LogType, category: LogCategory, name: string, ...optionalParams: any[]): Group;
    export function table(title: string, arguments: any);
    export class Group {
        readonly mode: GroupMode;
        readonly level: LogType;
        readonly category: LogCategory;
        readonly enabled: boolean;
        owner: Group;
        private readonly name: string;
        private readonly optionalParams: any[][];
        private _collapsed: boolean;
        private initialized;
        private _log_prefix: string;
        constructor(mode: GroupMode, level: LogType, category: LogCategory, name: string, optionalParams: any[][], owner?: Group);
        group(level: LogType, name: string, ...optionalParams: any[]): Group;
        collapsed(flag?: boolean): this;
        log(message: string, ...optionalParams: any[]): this;
        end();
        // @ts-ignore
        get prefix(): string;
        // @ts-ignore
        set prefix(prefix: string);
    }
}

/* File: shared/js/main.ts */
declare let settings: Settings;
declare const js_render;
declare const native_client;
declare function getUserMediaFunction();
declare interface Window {
    open_connected_question: () => Promise<boolean>;
}
declare function setup_close();
declare function moment(...arguments): any;
declare function setup_jsrender(): boolean;
declare function initialize(): Promise<any>;
declare function initialize_app(): Promise<any>;
declare function ab2str(buf);
declare function str2ab8(str);
declare function arrayBufferBase64(base64: string);
declare function base64ArrayBuffer(arrayBuffer);
declare function Base64EncodeUrl(str);
declare function Base64DecodeUrl(str: string, pad?: boolean);
declare function main();
declare const task_teaweb_starter: loader.Task;
declare const task_certificate_callback: loader.Task;

/* File: shared/js/permission/GroupManager.ts */
declare enum GroupType {
    QUERY,
    TEMPLATE,
    NORMAL
}
declare enum GroupTarget {
    SERVER,
    CHANNEL
}
declare class GroupProperties {
    iconid: number;
    sortid: number;
    savedb: boolean;
    namemode: number;
}
declare class GroupPermissionRequest {
    group_id: number;
    promise: LaterPromise<PermissionValue[]>;
}
declare class Group {
    properties: GroupProperties;
    readonly handle: GroupManager;
    readonly id: number;
    readonly target: GroupTarget;
    readonly type: GroupType;
    name: string;
    requiredModifyPower: number;
    requiredMemberAddPower: number;
    requiredMemberRemovePower: number;
    constructor(handle: GroupManager, id: number, target: GroupTarget, type: GroupType, name: string);
    updateProperty(key, value);
}
declare class GroupManager extends connection.AbstractCommandHandler {
    readonly handle: ConnectionHandler;
    serverGroups: Group[];
    channelGroups: Group[];
    private requests_group_permissions: GroupPermissionRequest[];
    constructor(client: ConnectionHandler);
    handle_command(command: connection.ServerCommand): boolean;
    requestGroups();
    static sorter(): (a: Group, b: Group) => number;
    serverGroup?(id: number): Group;
    channelGroup?(id: number): Group;
    private handle_grouplist(json);
    request_permissions(group: Group): Promise<PermissionValue[]>;
    private handle_group_permission_list(json: any[]);
}

/* File: shared/js/permission/PermissionManager.ts */
declare enum PermissionType {
    B_SERVERINSTANCE_HELP_VIEW,
    B_SERVERINSTANCE_VERSION_VIEW,
    B_SERVERINSTANCE_INFO_VIEW,
    B_SERVERINSTANCE_VIRTUALSERVER_LIST,
    B_SERVERINSTANCE_BINDING_LIST,
    B_SERVERINSTANCE_PERMISSION_LIST,
    B_SERVERINSTANCE_PERMISSION_FIND,
    B_VIRTUALSERVER_CREATE,
    B_VIRTUALSERVER_DELETE,
    B_VIRTUALSERVER_START_ANY,
    B_VIRTUALSERVER_STOP_ANY,
    B_VIRTUALSERVER_CHANGE_MACHINE_ID,
    B_VIRTUALSERVER_CHANGE_TEMPLATE,
    B_SERVERQUERY_LOGIN,
    B_SERVERINSTANCE_TEXTMESSAGE_SEND,
    B_SERVERINSTANCE_LOG_VIEW,
    B_SERVERINSTANCE_LOG_ADD,
    B_SERVERINSTANCE_STOP,
    B_SERVERINSTANCE_MODIFY_SETTINGS,
    B_SERVERINSTANCE_MODIFY_QUERYGROUP,
    B_SERVERINSTANCE_MODIFY_TEMPLATES,
    B_VIRTUALSERVER_SELECT,
    B_VIRTUALSERVER_SELECT_GODMODE,
    B_VIRTUALSERVER_INFO_VIEW,
    B_VIRTUALSERVER_CONNECTIONINFO_VIEW,
    B_VIRTUALSERVER_CHANNEL_LIST,
    B_VIRTUALSERVER_CHANNEL_SEARCH,
    B_VIRTUALSERVER_CLIENT_LIST,
    B_VIRTUALSERVER_CLIENT_SEARCH,
    B_VIRTUALSERVER_CLIENT_DBLIST,
    B_VIRTUALSERVER_CLIENT_DBSEARCH,
    B_VIRTUALSERVER_CLIENT_DBINFO,
    B_VIRTUALSERVER_PERMISSION_FIND,
    B_VIRTUALSERVER_CUSTOM_SEARCH,
    B_VIRTUALSERVER_START,
    B_VIRTUALSERVER_STOP,
    B_VIRTUALSERVER_TOKEN_LIST,
    B_VIRTUALSERVER_TOKEN_ADD,
    B_VIRTUALSERVER_TOKEN_USE,
    B_VIRTUALSERVER_TOKEN_DELETE,
    B_VIRTUALSERVER_LOG_VIEW,
    B_VIRTUALSERVER_LOG_ADD,
    B_VIRTUALSERVER_JOIN_IGNORE_PASSWORD,
    B_VIRTUALSERVER_NOTIFY_REGISTER,
    B_VIRTUALSERVER_NOTIFY_UNREGISTER,
    B_VIRTUALSERVER_SNAPSHOT_CREATE,
    B_VIRTUALSERVER_SNAPSHOT_DEPLOY,
    B_VIRTUALSERVER_PERMISSION_RESET,
    B_VIRTUALSERVER_MODIFY_NAME,
    B_VIRTUALSERVER_MODIFY_WELCOMEMESSAGE,
    B_VIRTUALSERVER_MODIFY_MAXCLIENTS,
    B_VIRTUALSERVER_MODIFY_RESERVED_SLOTS,
    B_VIRTUALSERVER_MODIFY_PASSWORD,
    B_VIRTUALSERVER_MODIFY_DEFAULT_SERVERGROUP,
    B_VIRTUALSERVER_MODIFY_DEFAULT_MUSICGROUP,
    B_VIRTUALSERVER_MODIFY_DEFAULT_CHANNELGROUP,
    B_VIRTUALSERVER_MODIFY_DEFAULT_CHANNELADMINGROUP,
    B_VIRTUALSERVER_MODIFY_CHANNEL_FORCED_SILENCE,
    B_VIRTUALSERVER_MODIFY_COMPLAIN,
    B_VIRTUALSERVER_MODIFY_ANTIFLOOD,
    B_VIRTUALSERVER_MODIFY_FT_SETTINGS,
    B_VIRTUALSERVER_MODIFY_FT_QUOTAS,
    B_VIRTUALSERVER_MODIFY_HOSTMESSAGE,
    B_VIRTUALSERVER_MODIFY_HOSTBANNER,
    B_VIRTUALSERVER_MODIFY_HOSTBUTTON,
    B_VIRTUALSERVER_MODIFY_PORT,
    B_VIRTUALSERVER_MODIFY_HOST,
    B_VIRTUALSERVER_MODIFY_DEFAULT_MESSAGES,
    B_VIRTUALSERVER_MODIFY_AUTOSTART,
    B_VIRTUALSERVER_MODIFY_NEEDED_IDENTITY_SECURITY_LEVEL,
    B_VIRTUALSERVER_MODIFY_PRIORITY_SPEAKER_DIMM_MODIFICATOR,
    B_VIRTUALSERVER_MODIFY_LOG_SETTINGS,
    B_VIRTUALSERVER_MODIFY_MIN_CLIENT_VERSION,
    B_VIRTUALSERVER_MODIFY_ICON_ID,
    B_VIRTUALSERVER_MODIFY_WEBLIST,
    B_VIRTUALSERVER_MODIFY_CODEC_ENCRYPTION_MODE,
    B_VIRTUALSERVER_MODIFY_TEMPORARY_PASSWORDS,
    B_VIRTUALSERVER_MODIFY_TEMPORARY_PASSWORDS_OWN,
    B_VIRTUALSERVER_MODIFY_CHANNEL_TEMP_DELETE_DELAY_DEFAULT,
    B_VIRTUALSERVER_MODIFY_MUSIC_BOT_LIMIT,
    I_CHANNEL_MIN_DEPTH,
    I_CHANNEL_MAX_DEPTH,
    B_CHANNEL_GROUP_INHERITANCE_END,
    I_CHANNEL_PERMISSION_MODIFY_POWER,
    I_CHANNEL_NEEDED_PERMISSION_MODIFY_POWER,
    B_CHANNEL_INFO_VIEW,
    B_CHANNEL_CREATE_CHILD,
    B_CHANNEL_CREATE_PERMANENT,
    B_CHANNEL_CREATE_SEMI_PERMANENT,
    B_CHANNEL_CREATE_TEMPORARY,
    B_CHANNEL_CREATE_PRIVATE,
    B_CHANNEL_CREATE_WITH_TOPIC,
    B_CHANNEL_CREATE_WITH_DESCRIPTION,
    B_CHANNEL_CREATE_WITH_PASSWORD,
    B_CHANNEL_CREATE_MODIFY_WITH_CODEC_SPEEX8,
    B_CHANNEL_CREATE_MODIFY_WITH_CODEC_SPEEX16,
    B_CHANNEL_CREATE_MODIFY_WITH_CODEC_SPEEX32,
    B_CHANNEL_CREATE_MODIFY_WITH_CODEC_CELTMONO48,
    B_CHANNEL_CREATE_MODIFY_WITH_CODEC_OPUSVOICE,
    B_CHANNEL_CREATE_MODIFY_WITH_CODEC_OPUSMUSIC,
    I_CHANNEL_CREATE_MODIFY_WITH_CODEC_MAXQUALITY,
    I_CHANNEL_CREATE_MODIFY_WITH_CODEC_LATENCY_FACTOR_MIN,
    B_CHANNEL_CREATE_WITH_MAXCLIENTS,
    B_CHANNEL_CREATE_WITH_MAXFAMILYCLIENTS,
    B_CHANNEL_CREATE_WITH_SORTORDER,
    B_CHANNEL_CREATE_WITH_DEFAULT,
    B_CHANNEL_CREATE_WITH_NEEDED_TALK_POWER,
    B_CHANNEL_CREATE_MODIFY_WITH_FORCE_PASSWORD,
    I_CHANNEL_CREATE_MODIFY_WITH_TEMP_DELETE_DELAY,
    B_CHANNEL_MODIFY_PARENT,
    B_CHANNEL_MODIFY_MAKE_DEFAULT,
    B_CHANNEL_MODIFY_MAKE_PERMANENT,
    B_CHANNEL_MODIFY_MAKE_SEMI_PERMANENT,
    B_CHANNEL_MODIFY_MAKE_TEMPORARY,
    B_CHANNEL_MODIFY_NAME,
    B_CHANNEL_MODIFY_TOPIC,
    B_CHANNEL_MODIFY_DESCRIPTION,
    B_CHANNEL_MODIFY_PASSWORD,
    B_CHANNEL_MODIFY_CODEC,
    B_CHANNEL_MODIFY_CODEC_QUALITY,
    B_CHANNEL_MODIFY_CODEC_LATENCY_FACTOR,
    B_CHANNEL_MODIFY_MAXCLIENTS,
    B_CHANNEL_MODIFY_MAXFAMILYCLIENTS,
    B_CHANNEL_MODIFY_SORTORDER,
    B_CHANNEL_MODIFY_NEEDED_TALK_POWER,
    I_CHANNEL_MODIFY_POWER,
    I_CHANNEL_NEEDED_MODIFY_POWER,
    B_CHANNEL_MODIFY_MAKE_CODEC_ENCRYPTED,
    B_CHANNEL_MODIFY_TEMP_DELETE_DELAY,
    B_CHANNEL_DELETE_PERMANENT,
    B_CHANNEL_DELETE_SEMI_PERMANENT,
    B_CHANNEL_DELETE_TEMPORARY,
    B_CHANNEL_DELETE_FLAG_FORCE,
    I_CHANNEL_DELETE_POWER,
    I_CHANNEL_NEEDED_DELETE_POWER,
    B_CHANNEL_JOIN_PERMANENT,
    B_CHANNEL_JOIN_SEMI_PERMANENT,
    B_CHANNEL_JOIN_TEMPORARY,
    B_CHANNEL_JOIN_IGNORE_PASSWORD,
    B_CHANNEL_JOIN_IGNORE_MAXCLIENTS,
    B_CHANNEL_IGNORE_VIEW_POWER,
    I_CHANNEL_JOIN_POWER,
    I_CHANNEL_NEEDED_JOIN_POWER,
    B_CHANNEL_IGNORE_JOIN_POWER,
    I_CHANNEL_VIEW_POWER,
    I_CHANNEL_NEEDED_VIEW_POWER,
    I_CHANNEL_SUBSCRIBE_POWER,
    I_CHANNEL_NEEDED_SUBSCRIBE_POWER,
    I_CHANNEL_DESCRIPTION_VIEW_POWER,
    I_CHANNEL_NEEDED_DESCRIPTION_VIEW_POWER,
    I_ICON_ID,
    I_MAX_ICON_FILESIZE,
    B_ICON_MANAGE,
    B_GROUP_IS_PERMANENT,
    I_GROUP_AUTO_UPDATE_TYPE,
    I_GROUP_AUTO_UPDATE_MAX_VALUE,
    I_GROUP_SORT_ID,
    I_GROUP_SHOW_NAME_IN_TREE,
    B_VIRTUALSERVER_SERVERGROUP_CREATE,
    B_VIRTUALSERVER_SERVERGROUP_LIST,
    B_VIRTUALSERVER_SERVERGROUP_PERMISSION_LIST,
    B_VIRTUALSERVER_SERVERGROUP_CLIENT_LIST,
    B_VIRTUALSERVER_CHANNELGROUP_CREATE,
    B_VIRTUALSERVER_CHANNELGROUP_LIST,
    B_VIRTUALSERVER_CHANNELGROUP_PERMISSION_LIST,
    B_VIRTUALSERVER_CHANNELGROUP_CLIENT_LIST,
    B_VIRTUALSERVER_CLIENT_PERMISSION_LIST,
    B_VIRTUALSERVER_CHANNEL_PERMISSION_LIST,
    B_VIRTUALSERVER_CHANNELCLIENT_PERMISSION_LIST,
    B_VIRTUALSERVER_PLAYLIST_PERMISSION_LIST,
    I_SERVER_GROUP_MODIFY_POWER,
    I_SERVER_GROUP_NEEDED_MODIFY_POWER,
    I_SERVER_GROUP_MEMBER_ADD_POWER,
    I_SERVER_GROUP_SELF_ADD_POWER,
    I_SERVER_GROUP_NEEDED_MEMBER_ADD_POWER,
    I_SERVER_GROUP_MEMBER_REMOVE_POWER,
    I_SERVER_GROUP_SELF_REMOVE_POWER,
    I_SERVER_GROUP_NEEDED_MEMBER_REMOVE_POWER,
    I_CHANNEL_GROUP_MODIFY_POWER,
    I_CHANNEL_GROUP_NEEDED_MODIFY_POWER,
    I_CHANNEL_GROUP_MEMBER_ADD_POWER,
    I_CHANNEL_GROUP_SELF_ADD_POWER,
    I_CHANNEL_GROUP_NEEDED_MEMBER_ADD_POWER,
    I_CHANNEL_GROUP_MEMBER_REMOVE_POWER,
    I_CHANNEL_GROUP_SELF_REMOVE_POWER,
    I_CHANNEL_GROUP_NEEDED_MEMBER_REMOVE_POWER,
    I_GROUP_MEMBER_ADD_POWER,
    I_GROUP_NEEDED_MEMBER_ADD_POWER,
    I_GROUP_MEMBER_REMOVE_POWER,
    I_GROUP_NEEDED_MEMBER_REMOVE_POWER,
    I_GROUP_MODIFY_POWER,
    I_GROUP_NEEDED_MODIFY_POWER,
    I_PERMISSION_MODIFY_POWER,
    B_PERMISSION_MODIFY_POWER_IGNORE,
    B_VIRTUALSERVER_SERVERGROUP_DELETE,
    B_VIRTUALSERVER_CHANNELGROUP_DELETE,
    I_CLIENT_PERMISSION_MODIFY_POWER,
    I_CLIENT_NEEDED_PERMISSION_MODIFY_POWER,
    I_CLIENT_MAX_CLONES_UID,
    I_CLIENT_MAX_CLONES_IP,
    I_CLIENT_MAX_CLONES_HWID,
    I_CLIENT_MAX_IDLETIME,
    I_CLIENT_MAX_AVATAR_FILESIZE,
    I_CLIENT_MAX_CHANNEL_SUBSCRIPTIONS,
    I_CLIENT_MAX_CHANNELS,
    I_CLIENT_MAX_TEMPORARY_CHANNELS,
    I_CLIENT_MAX_SEMI_CHANNELS,
    I_CLIENT_MAX_PERMANENT_CHANNELS,
    B_CLIENT_USE_PRIORITY_SPEAKER,
    B_CLIENT_SKIP_CHANNELGROUP_PERMISSIONS,
    B_CLIENT_FORCE_PUSH_TO_TALK,
    B_CLIENT_IGNORE_BANS,
    B_CLIENT_IGNORE_VPN,
    B_CLIENT_IGNORE_ANTIFLOOD,
    B_CLIENT_ENFORCE_VALID_HWID,
    B_CLIENT_ALLOW_INVALID_PACKET,
    B_CLIENT_ALLOW_INVALID_BADGES,
    B_CLIENT_ISSUE_CLIENT_QUERY_COMMAND,
    B_CLIENT_USE_RESERVED_SLOT,
    B_CLIENT_USE_CHANNEL_COMMANDER,
    B_CLIENT_REQUEST_TALKER,
    B_CLIENT_AVATAR_DELETE_OTHER,
    B_CLIENT_IS_STICKY,
    B_CLIENT_IGNORE_STICKY,
    B_CLIENT_MUSIC_CREATE_PERMANENT,
    B_CLIENT_MUSIC_CREATE_SEMI_PERMANENT,
    B_CLIENT_MUSIC_CREATE_TEMPORARY,
    B_CLIENT_MUSIC_MODIFY_PERMANENT,
    B_CLIENT_MUSIC_MODIFY_SEMI_PERMANENT,
    B_CLIENT_MUSIC_MODIFY_TEMPORARY,
    I_CLIENT_MUSIC_CREATE_MODIFY_MAX_VOLUME,
    I_CLIENT_MUSIC_LIMIT,
    I_CLIENT_MUSIC_NEEDED_DELETE_POWER,
    I_CLIENT_MUSIC_DELETE_POWER,
    I_CLIENT_MUSIC_PLAY_POWER,
    I_CLIENT_MUSIC_NEEDED_PLAY_POWER,
    I_CLIENT_MUSIC_MODIFY_POWER,
    I_CLIENT_MUSIC_NEEDED_MODIFY_POWER,
    I_CLIENT_MUSIC_RENAME_POWER,
    I_CLIENT_MUSIC_NEEDED_RENAME_POWER,
    B_PLAYLIST_CREATE,
    I_PLAYLIST_VIEW_POWER,
    I_PLAYLIST_NEEDED_VIEW_POWER,
    I_PLAYLIST_MODIFY_POWER,
    I_PLAYLIST_NEEDED_MODIFY_POWER,
    I_PLAYLIST_PERMISSION_MODIFY_POWER,
    I_PLAYLIST_NEEDED_PERMISSION_MODIFY_POWER,
    I_PLAYLIST_DELETE_POWER,
    I_PLAYLIST_NEEDED_DELETE_POWER,
    I_PLAYLIST_SONG_ADD_POWER,
    I_PLAYLIST_SONG_NEEDED_ADD_POWER,
    I_PLAYLIST_SONG_REMOVE_POWER,
    I_PLAYLIST_SONG_NEEDED_REMOVE_POWER,
    B_CLIENT_INFO_VIEW,
    B_CLIENT_PERMISSIONOVERVIEW_VIEW,
    B_CLIENT_PERMISSIONOVERVIEW_OWN,
    B_CLIENT_REMOTEADDRESS_VIEW,
    I_CLIENT_SERVERQUERY_VIEW_POWER,
    I_CLIENT_NEEDED_SERVERQUERY_VIEW_POWER,
    B_CLIENT_CUSTOM_INFO_VIEW,
    B_CLIENT_MUSIC_CHANNEL_LIST,
    B_CLIENT_MUSIC_SERVER_LIST,
    I_CLIENT_MUSIC_INFO,
    I_CLIENT_MUSIC_NEEDED_INFO,
    I_CLIENT_KICK_FROM_SERVER_POWER,
    I_CLIENT_NEEDED_KICK_FROM_SERVER_POWER,
    I_CLIENT_KICK_FROM_CHANNEL_POWER,
    I_CLIENT_NEEDED_KICK_FROM_CHANNEL_POWER,
    I_CLIENT_BAN_POWER,
    I_CLIENT_NEEDED_BAN_POWER,
    I_CLIENT_MOVE_POWER,
    I_CLIENT_NEEDED_MOVE_POWER,
    I_CLIENT_COMPLAIN_POWER,
    I_CLIENT_NEEDED_COMPLAIN_POWER,
    B_CLIENT_COMPLAIN_LIST,
    B_CLIENT_COMPLAIN_DELETE_OWN,
    B_CLIENT_COMPLAIN_DELETE,
    B_CLIENT_BAN_LIST,
    B_CLIENT_BAN_LIST_GLOBAL,
    B_CLIENT_BAN_TRIGGER_LIST,
    B_CLIENT_BAN_CREATE,
    B_CLIENT_BAN_CREATE_GLOBAL,
    B_CLIENT_BAN_NAME,
    B_CLIENT_BAN_IP,
    B_CLIENT_BAN_HWID,
    B_CLIENT_BAN_EDIT,
    B_CLIENT_BAN_EDIT_GLOBAL,
    B_CLIENT_BAN_DELETE_OWN,
    B_CLIENT_BAN_DELETE,
    B_CLIENT_BAN_DELETE_OWN_GLOBAL,
    B_CLIENT_BAN_DELETE_GLOBAL,
    I_CLIENT_BAN_MAX_BANTIME,
    I_CLIENT_PRIVATE_TEXTMESSAGE_POWER,
    I_CLIENT_NEEDED_PRIVATE_TEXTMESSAGE_POWER,
    B_CLIENT_EVEN_TEXTMESSAGE_SEND,
    B_CLIENT_SERVER_TEXTMESSAGE_SEND,
    B_CLIENT_CHANNEL_TEXTMESSAGE_SEND,
    B_CLIENT_OFFLINE_TEXTMESSAGE_SEND,
    I_CLIENT_TALK_POWER,
    I_CLIENT_NEEDED_TALK_POWER,
    I_CLIENT_POKE_POWER,
    I_CLIENT_NEEDED_POKE_POWER,
    B_CLIENT_SET_FLAG_TALKER,
    I_CLIENT_WHISPER_POWER,
    I_CLIENT_NEEDED_WHISPER_POWER,
    B_CLIENT_MODIFY_DESCRIPTION,
    B_CLIENT_MODIFY_OWN_DESCRIPTION,
    B_CLIENT_USE_BBCODE_ANY,
    B_CLIENT_USE_BBCODE_URL,
    B_CLIENT_USE_BBCODE_IMAGE,
    B_CLIENT_MODIFY_DBPROPERTIES,
    B_CLIENT_DELETE_DBPROPERTIES,
    B_CLIENT_CREATE_MODIFY_SERVERQUERY_LOGIN,
    B_CLIENT_QUERY_CREATE,
    B_CLIENT_QUERY_LIST,
    B_CLIENT_QUERY_LIST_OWN,
    B_CLIENT_QUERY_RENAME,
    B_CLIENT_QUERY_RENAME_OWN,
    B_CLIENT_QUERY_CHANGE_PASSWORD,
    B_CLIENT_QUERY_CHANGE_OWN_PASSWORD,
    B_CLIENT_QUERY_CHANGE_PASSWORD_GLOBAL,
    B_CLIENT_QUERY_DELETE,
    B_CLIENT_QUERY_DELETE_OWN,
    B_FT_IGNORE_PASSWORD,
    B_FT_TRANSFER_LIST,
    I_FT_FILE_UPLOAD_POWER,
    I_FT_NEEDED_FILE_UPLOAD_POWER,
    I_FT_FILE_DOWNLOAD_POWER,
    I_FT_NEEDED_FILE_DOWNLOAD_POWER,
    I_FT_FILE_DELETE_POWER,
    I_FT_NEEDED_FILE_DELETE_POWER,
    I_FT_FILE_RENAME_POWER,
    I_FT_NEEDED_FILE_RENAME_POWER,
    I_FT_FILE_BROWSE_POWER,
    I_FT_NEEDED_FILE_BROWSE_POWER,
    I_FT_DIRECTORY_CREATE_POWER,
    I_FT_NEEDED_DIRECTORY_CREATE_POWER,
    I_FT_QUOTA_MB_DOWNLOAD_PER_CLIENT,
    I_FT_QUOTA_MB_UPLOAD_PER_CLIENT
}
declare class PermissionInfo {
    name: string;
    id: number;
    description: string;
    is_boolean();
    id_grant(): number;
}
declare class PermissionGroup {
    begin: number;
    end: number;
    deep: number;
    name: string;
}
declare class GroupedPermissions {
    group: PermissionGroup;
    permissions: PermissionInfo[];
    children: GroupedPermissions[];
    parent: GroupedPermissions;
}
declare class PermissionValue {
    readonly type: PermissionInfo;
    value: number;
    flag_skip: boolean;
    flag_negate: boolean;
    granted_value: number;
    constructor(type, value?);
    granted(requiredValue: number, required?: boolean): boolean;
    hasValue(): boolean;
    hasGrant(): boolean;
}
declare class NeededPermissionValue extends PermissionValue {
    changeListener: ((newValue: number) => void)[];
    constructor(type, value);
}
declare class ChannelPermissionRequest {
    requested: number;
    channel_id: number;
    callback_success: ((_: PermissionValue[]) => any)[];
    callback_error: ((_: any) => any)[];
}
declare class TeaPermissionRequest {
    client_id?: number;
    channel_id?: number;
    playlist_id?: number;
    promise: LaterPromise<PermissionValue[]>;
}
declare class PermissionManager extends connection.AbstractCommandHandler {
    readonly handle: ConnectionHandler;
    permissionList: PermissionInfo[];
    permissionGroups: PermissionGroup[];
    neededPermissions: NeededPermissionValue[];
    requests_channel_permissions: ChannelPermissionRequest[];
    requests_client_permissions: TeaPermissionRequest[];
    requests_client_channel_permissions: TeaPermissionRequest[];
    requests_playlist_permissions: TeaPermissionRequest[];
    initializedListener: ((initialized: boolean) => void)[];
    private _cacheNeededPermissions: any;
    static readonly group_mapping: {
        name: string;
        deep: number;
    }[];
    private _group_mapping;
    public static parse_permission_bulk(json: any[], manager: PermissionManager): PermissionValue[];
    constructor(client: ConnectionHandler);
    handle_command(command: connection.ServerCommand): boolean;
    initialized(): boolean;
    public requestPermissionList();
    private onPermissionList(json);
    private onNeededPermissions(json);
    private onChannelPermList(json);
    resolveInfo?(key: number | string | PermissionType): PermissionInfo;
    requestChannelPermissions(channelId: number): Promise<PermissionValue[]>;
    private onClientPermList(json: any[]);
    requestClientPermissions(client_id: number): Promise<PermissionValue[]>;
    requestClientChannelPermissions(client_id: number, channel_id: number): Promise<PermissionValue[]>;
    private onPlaylistPermList(json: any[]);
    requestPlaylistPermissions(playlist_id: number): Promise<PermissionValue[]>;
    neededPermission(key: number | string | PermissionType | PermissionInfo): PermissionValue;
    groupedPermissions(): GroupedPermissions[];
    export_permission_types();
}

/* File: shared/js/PPTListener.ts */
declare namespace ppt {
    export enum EventType {
        KEY_PRESS,
        KEY_RELEASE,
        KEY_TYPED
    }
    export enum SpecialKey {
        CTRL,
        WINDOWS,
        SHIFT,
        ALT
    }
    export interface KeyDescriptor {
        key_code: string;
        key_ctrl: boolean;
        key_windows: boolean;
        key_shift: boolean;
        key_alt: boolean;
    }
    export interface KeyEvent extends KeyDescriptor {
        readonly type: EventType;
        readonly key: string;
    }
    export interface KeyHook extends KeyDescriptor {
        cancel: boolean;
        callback_press: () => any;
        callback_release: () => any;
    }
    export function key_description(key: KeyDescriptor);
}

/* File: shared/js/profiles/ConnectionProfile.ts */
declare namespace profiles {
    export class ConnectionProfile {
        id: string;
        profile_name: string;
        default_username: string;
        default_password: string;
        selected_identity_type: string;
        identities: {
            [key: string]: identities.Identity;
        };
        constructor(id: string);
        selected_identity(current_type?: identities.IdentitifyType): identities.Identity;
        selected_type?(): identities.IdentitifyType;
        set_identity(type: identities.IdentitifyType, identity: identities.Identity);
        spawn_identity_handshake_handler?(connection: connection.AbstractServerConnection): connection.HandshakeIdentityHandler;
        encode?(): string;
        valid(): boolean;
    }
    export function load(): Promise<any>;
    export function create_new_profile(name: string, id?: string): ConnectionProfile;
    export function save();
    export function mark_need_save();
    export function requires_save(): boolean;
    export function profiles(): ConnectionProfile[];
    export function find_profile(id: string): ConnectionProfile | undefined;
    export function find_profile_by_name(name: string): ConnectionProfile | undefined;
    export function default_profile(): ConnectionProfile;
    export function set_default_profile(profile: ConnectionProfile);
    export function delete_profile(profile: ConnectionProfile);
}

/* File: shared/js/profiles/identities/NameIdentity.ts */
declare namespace profiles.identities {
    export class NameHandshakeHandler extends AbstractHandshakeIdentityHandler {
        readonly identity: NameIdentity;
        handler: HandshakeCommandHandler<NameHandshakeHandler>;
        constructor(connection: connection.AbstractServerConnection, identity: profiles.identities.NameIdentity);
        start_handshake();
        protected trigger_fail(message: string);
        protected trigger_success();
    }
    export class NameIdentity implements Identity {
        private _name: string;
        constructor(name?: string);
        set_name(name: string);
        name(): string;
        uid(): string;
        type(): IdentitifyType;
        valid(): boolean;
        decode(data): Promise<void>;
        encode?(): string;
        spawn_identity_handshake_handler(connection: connection.AbstractServerConnection): connection.HandshakeIdentityHandler;
    }
}

/* File: shared/js/profiles/identities/TeaForumIdentity.ts */
declare namespace profiles.identities {
    export class TeaForumHandshakeHandler extends AbstractHandshakeIdentityHandler {
        readonly identity: TeaForumIdentity;
        handler: HandshakeCommandHandler<TeaForumHandshakeHandler>;
        constructor(connection: connection.AbstractServerConnection, identity: profiles.identities.TeaForumIdentity);
        start_handshake();
        private handle_proof(json);
        protected trigger_fail(message: string);
        protected trigger_success();
    }
    export class TeaForumIdentity implements Identity {
        private identity_data: string;
        private identity_data_raw: string;
        private identity_data_sign: string;
        valid(): boolean;
        constructor(data: string, sign: string);
        data_json(): string;
        data_sign(): string;
        name(): string;
        uid(): string;
        type(): IdentitifyType;
        forum_user_id();
        forum_user_group();
        is_stuff(): boolean;
        is_premium(): boolean;
        data_age(): Date;
        decode(data): Promise<void>;
        encode?(): string;
        spawn_identity_handshake_handler(connection: connection.AbstractServerConnection): connection.HandshakeIdentityHandler;
    }
    export function set_static_identity(identity: TeaForumIdentity);
    export function setup_forum();
    export function valid_static_forum_identity(): boolean;
    export function static_forum_identity(): TeaForumIdentity | undefined;
}

/* File: shared/js/profiles/identities/TeamSpeakIdentity.ts */
declare namespace profiles.identities {
    export namespace CryptoHelper {
        export function export_ecc_key(crypto_key: CryptoKey, public_key: boolean): Promise<any>;
        export function decrypt_ts_identity(buffer: Uint8Array): Promise<string>;
        export function encrypt_ts_identity(buffer: Uint8Array): Promise<string>;
        export function decode_tomcrypt_key(buffer: string);
    }
    export class TeaSpeakHandshakeHandler extends AbstractHandshakeIdentityHandler {
        identity: TeaSpeakIdentity;
        handler: HandshakeCommandHandler<TeaSpeakHandshakeHandler>;
        constructor(connection: connection.AbstractServerConnection, identity: TeaSpeakIdentity);
        start_handshake();
        skip_and_initialize();
        private handle_proof(json);
        protected trigger_fail(message: string);
        protected trigger_success();
    }
    export class IdentityPOWWorker {
        private _worker: Worker;
        private _current_hash: string;
        private _best_level: number;
        initialize(key: string);
        mine(hash: string, iterations: number, target: number, timeout?: number): Promise<Boolean>;
        current_hash(): string;
        current_level(): number;
        finalize(timeout?: number);
        private handle_message(message: any);
    }
    export class TeaSpeakIdentity implements Identity {
        static generate_new(): Promise<TeaSpeakIdentity>;
        static import_ts(ts_string: string, ini?: boolean): Promise<TeaSpeakIdentity>;
        hash_number: string;
        private_key: string;
        _name: string;
        public_key: string;
        private _initialized: boolean;
        private _crypto_key: CryptoKey;
        private _crypto_key_sign: CryptoKey;
        private _unique_id: string;
        constructor(private_key?: string, hash?: string, name?: string, initialize?: boolean);
        name(): string;
        uid(): string;
        type(): IdentitifyType;
        valid(): boolean;
        decode(data: string): Promise<void>;
        encode?(): string;
        level(): Promise<number>;
        private string_add(a: string, b: string);
        improve_level_for(time: number, threads: number): Promise<Boolean>;
        improve_level(target: number, threads: number, active_callback: () => boolean, callback_level?: (current: number) => any, callback_status?: (hash_rate: number) => any): Promise<Boolean>;
        private initialize();
        export_ts(ini?: boolean): Promise<string>;
        sign_message(message: string, hash?: string): Promise<string>;
        spawn_identity_handshake_handler(connection: connection.AbstractServerConnection): connection.HandshakeIdentityHandler;
    }
}

/* File: shared/js/profiles/Identity.ts */
declare namespace profiles.identities {
    export enum IdentitifyType {
        TEAFORO,
        TEAMSPEAK,
        NICKNAME
    }
    export interface Identity {
        name(): string;
        uid(): string;
        type(): IdentitifyType;
        valid(): boolean;
        encode?(): string;
        decode(data: string): Promise<void>;
        spawn_identity_handshake_handler(connection: connection.AbstractServerConnection): connection.HandshakeIdentityHandler;
    }
    export function decode_identity(type: IdentitifyType, data: string): Promise<Identity>;
    export function create_identity(type: IdentitifyType);
    export class HandshakeCommandHandler<T extends AbstractHandshakeIdentityHandler> extends connection.AbstractCommandHandler {
        readonly handle: T;
        constructor(connection: connection.AbstractServerConnection, handle: T);
        handle_command(command: connection.ServerCommand): boolean;
    }
    export abstract class AbstractHandshakeIdentityHandler implements connection.HandshakeIdentityHandler {
        connection: connection.AbstractServerConnection;
        protected callbacks: ((success: boolean, message?: string) => any)[];
        protected constructor(connection: connection.AbstractServerConnection);
        register_callback(callback: (success: boolean, message?: string) => any);
        abstract start_handshake();
        protected trigger_success();
        protected trigger_fail(message: string);
    }
}

/* File: shared/js/proto.ts */
declare interface Array<T> {
    remove(elem?: T): boolean;
    last?(): T;
    pop_front(): T | undefined;
}
declare interface JSON {
    map_to<T>(object: T, json: any, variables?: string | string[], validator?: (map_field: string, map_value: string) => boolean, variable_direction?: number): T;
    map_field_to<T>(object: T, value: any, field: string): T;
}
type JQueryScrollType = "height" | "width";
declare interface JQuery<TElement = HTMLElement> {
    render(values?: any): string;
    renderTag(values?: any): JQuery<TElement>;
    hasScrollBar(direction?: JQueryScrollType): boolean;
    visible_height(): number;
    visible_width(): number;
    alert(): JQuery<TElement>;
    modal(properties: any): this;
    bootstrapMaterialDesign(): this;
}
declare interface JQueryStatic<TElement extends Node = HTMLElement> {
    spawn<K extends keyof HTMLElementTagNameMap>(tagName: K): JQuery<HTMLElementTagNameMap[K]>;
    views: any;
}
declare interface String {
    format(...fmt): string;
    format(arguments: string[]): string;
}
declare function concatenate(resultConstructor, ...arrays);
declare function formatDate(secs: number): string;
declare function calculate_width(text: string): number;
declare class webkitAudioContext extends AudioContext {
}
declare class webkitOfflineAudioContext extends OfflineAudioContext {
}
declare interface Window {
    readonly webkitAudioContext: typeof webkitAudioContext;
    readonly AudioContext: typeof webkitAudioContext;
    readonly OfflineAudioContext: typeof OfflineAudioContext;
    readonly webkitOfflineAudioContext: typeof webkitOfflineAudioContext;
    readonly RTCPeerConnection: typeof RTCPeerConnection;
    readonly Pointer_stringify: any;
    readonly jsrender: any;
    require(id: string): any;
}
declare interface Navigator {
    browserSpecs: {
        name: string;
        version: string;
    };
}

/* File: shared/js/settings.ts */
declare interface SettingsKey<T> {
    key: string;
    fallback_keys?: string | string[];
    fallback_imports?: {
        [key: string]: (value: string) => T;
    };
    description?: string;
    default_value?: T;
}
declare class SettingsBase {
    protected static readonly UPDATE_DIRECT: boolean;
    protected static transformStO?<T>(input?: string, _default?: T, default_type?: string): T;
    protected static transformOtS?<T>(input: T): string;
    protected static resolveKey<T>(key: SettingsKey<T>, _default: T, resolver: (key: string) => string | boolean, default_type?: string): T;
    protected static keyify<T>(key: string | SettingsKey<T>): SettingsKey<T>;
}
declare class StaticSettings extends SettingsBase {
    private static _instance: StaticSettings;
    // @ts-ignore
    static get instance(): StaticSettings;
    protected _handle: StaticSettings;
    protected _staticPropsTag: JQuery;
    protected constructor(_reserved?);
    private initializeStatic();
    static?<T>(key: string | SettingsKey<T>, _default?: T, default_type?: string): T;
    deleteStatic<T>(key: string | SettingsKey<T>);
}
declare class Settings extends StaticSettings {
    static readonly KEY_DISABLE_CONTEXT_MENU: SettingsKey<boolean>;
    static readonly KEY_DISABLE_UNLOAD_DIALOG: SettingsKey<boolean>;
    static readonly KEY_DISABLE_VOICE: SettingsKey<boolean>;
    static readonly KEY_DISABLE_MULTI_SESSION: SettingsKey<boolean>;
    static readonly KEY_LOAD_DUMMY_ERROR: SettingsKey<boolean>;
    static readonly KEY_CONTROL_MUTE_INPUT: SettingsKey<boolean>;
    static readonly KEY_CONTROL_MUTE_OUTPUT: SettingsKey<boolean>;
    static readonly KEY_CONTROL_SHOW_QUERIES: SettingsKey<boolean>;
    static readonly KEY_CONTROL_CHANNEL_SUBSCRIBE_ALL: SettingsKey<boolean>;
    static readonly KEY_FLAG_CONNECT_DEFAULT: SettingsKey<boolean>;
    static readonly KEY_CONNECT_ADDRESS: SettingsKey<string>;
    static readonly KEY_CONNECT_PROFILE: SettingsKey<string>;
    static readonly KEY_CONNECT_USERNAME: SettingsKey<string>;
    static readonly KEY_CONNECT_PASSWORD: SettingsKey<string>;
    static readonly KEY_FLAG_CONNECT_PASSWORD: SettingsKey<boolean>;
    static readonly KEY_CERTIFICATE_CALLBACK: SettingsKey<string>;
    static readonly FN_SERVER_CHANNEL_SUBSCRIBE_MODE: (channel: ChannelEntry) => SettingsKey<ChannelSubscribeMode>;
    static readonly KEYS;
    private cacheGlobal;
    private saveWorker: NodeJS.Timer;
    private updated: boolean;
    constructor();
    static_global?<T>(key: string | SettingsKey<T>, _default?: T): T;
    global?<T>(key: string | SettingsKey<T>, _default?: T): T;
    changeGlobal<T>(key: string | SettingsKey<T>, value?: T);
    save();
}
declare class ServerSettings extends SettingsBase {
    private cacheServer;
    private currentServer: ServerEntry;
    private _server_save_worker: NodeJS.Timer;
    private _server_settings_updated: boolean;
    constructor();
    server?<T>(key: string | SettingsKey<T>, _default?: T): T;
    changeServer<T>(key: string | SettingsKey<T>, value?: T);
    setServer(server: ServerEntry);
    save();
}

/* File: shared/js/sound/Sounds.ts */
declare enum Sound {
    SOUND_TEST,
    SOUND_EGG,
    AWAY_ACTIVATED,
    AWAY_DEACTIVATED,
    CONNECTION_CONNECTED,
    CONNECTION_DISCONNECTED,
    CONNECTION_BANNED,
    CONNECTION_DISCONNECTED_TIMEOUT,
    CONNECTION_REFUSED,
    SERVER_EDITED,
    SERVER_EDITED_SELF,
    SERVER_KICKED,
    CHANNEL_CREATED,
    CHANNEL_MOVED,
    CHANNEL_EDITED,
    CHANNEL_EDITED_SELF,
    CHANNEL_DELETED,
    CHANNEL_JOINED,
    CHANNEL_KICKED,
    USER_MOVED,
    USER_MOVED_SELF,
    USER_POKED_SELF,
    USER_BANNED,
    USER_ENTERED,
    USER_ENTERED_MOVED,
    USER_ENTERED_KICKED,
    USER_ENTERED_CONNECT,
    USER_LEFT,
    USER_LEFT_MOVED,
    USER_LEFT_KICKED_CHANNEL,
    USER_LEFT_KICKED_SERVER,
    USER_LEFT_DISCONNECT,
    USER_LEFT_BANNED,
    ERROR_INSUFFICIENT_PERMISSIONS,
    MESSAGE_SEND,
    MESSAGE_RECEIVED,
    GROUP_SERVER_ASSIGNED,
    GROUP_SERVER_REVOKED,
    GROUP_CHANNEL_CHANGED,
    GROUP_SERVER_ASSIGNED_SELF,
    GROUP_SERVER_REVOKED_SELF,
    GROUP_CHANNEL_CHANGED_SELF
}
declare namespace sound {
    export interface SoundHandle {
        key: string;
        filename: string;
        not_supported?: boolean;
        not_supported_timeout?: number;
        cached?: AudioBuffer;
        node?: HTMLAudioElement;
        replaying: boolean;
    }
    export function get_sound_volume(sound: Sound, default_volume?: number): number;
    export function set_sound_volume(sound: Sound, volume: number);
    export function get_master_volume(): number;
    export function set_master_volume(volume: number);
    export function overlap_activated(): boolean;
    export function set_overlap_activated(flag: boolean);
    export function ignore_output_muted(): boolean;
    export function set_ignore_output_muted(flag: boolean);
    export function reinitialisize_audio();
    export function save();
    export function initialize(): Promise<void>;
    export interface PlaybackOptions {
        ignore_muted?: boolean;
        ignore_overlap?: boolean;
        default_volume?: number;
    }
    export function resolve_sound(sound: Sound): Promise<SoundHandle>;
    export let manager: SoundManager;
    export class SoundManager {
        private _handle: ConnectionHandler;
        private _playing_sounds: {
            [key: string]: number;
        };
        constructor(handle: ConnectionHandler);
        play(_sound: Sound, options?: PlaybackOptions);
    }
}

/* File: shared/js/stats.ts */
declare namespace stats {
    export enum CloseCodes {
        UNSET,
        RECONNECT,
        INTERNAL_ERROR,
        BANNED
    }
    export enum ConnectionState {
        CONNECTING,
        INITIALIZING,
        CONNECTED,
        UNSET
    }
    export class SessionConfig {
        volatile_collection_only?: boolean;
        anonymize_ip_addresses?: boolean;
    }
    export class Config extends SessionConfig {
        verbose?: boolean;
        reconnect_interval?: number;
    }
    export interface UserCountData {
        online_users: number;
        unique_online_users: number;
    }
    export type UserCountListener = (data: UserCountData) => any;
    export function initialize(config: Config);
    export function register_user_count_listener(listener: UserCountListener);
    export function all_user_count_listener(): UserCountListener[];
    export function deregister_user_count_listener(listener: UserCountListener);
    namespace connection {
        export let connection_state: ConnectionState;
        export function start_connection();
        export function close_connection();
        export function cancel_reconnect();
        namespace handler { }
    }
}

/* File: shared/js/ui/channel.ts */
declare enum ChannelType {
    PERMANENT,
    SEMI_PERMANENT,
    TEMPORARY
}
declare namespace ChannelType {
    export function normalize(mode: ChannelType);
}
declare enum ChannelSubscribeMode {
    SUBSCRIBED,
    UNSUBSCRIBED,
    INHERITED
}
declare class ChannelProperties {
    channel_order: number;
    channel_name: string;
    channel_name_phonetic: string;
    channel_topic: string;
    channel_password: string;
    channel_codec: number;
    channel_codec_quality: number;
    channel_codec_is_unencrypted: boolean;
    channel_maxclients: number;
    channel_maxfamilyclients: number;
    channel_needed_talk_power: number;
    channel_flag_permanent: boolean;
    channel_flag_semi_permanent: boolean;
    channel_flag_default: boolean;
    channel_flag_password: boolean;
    channel_flag_maxclients_unlimited: boolean;
    channel_flag_maxfamilyclients_inherited: boolean;
    channel_flag_maxfamilyclients_unlimited: boolean;
    channel_icon_id: number;
    channel_delete_delay: number;
    channel_description: string;
}
declare class ChannelEntry {
    channelTree: ChannelTree;
    channelId: number;
    parent?: ChannelEntry;
    properties: ChannelProperties;
    channel_previous?: ChannelEntry;
    channel_next?: ChannelEntry;
    private _channel_name_alignment: string;
    private _channel_name_formatted: string;
    private _family_index: number;
    private _tag_root: JQuery<HTMLElement>;
    private _tag_siblings: JQuery<HTMLElement>;
    private _tag_clients: JQuery<HTMLElement>;
    private _tag_channel: JQuery<HTMLElement>;
    private _cachedPassword: string;
    private _cached_channel_description: string;
    private _cached_channel_description_promise: Promise<string>;
    private _cached_channel_description_promise_resolve: any;
    private _cached_channel_description_promise_reject: any;
    private _flag_subscribed: boolean;
    private _subscribe_mode: ChannelSubscribeMode;
    constructor(channelId, channelName, parent?);
    channelName();
    formattedChannelName();
    getChannelDescription(): Promise<string>;
    parent_channel();
    hasParent();
    getChannelId();
    children(deep?): ChannelEntry[];
    clients(deep?): ClientEntry[];
    clients_ordered(): ClientEntry[];
    update_family_index(enforce?: boolean);
    calculate_family_index(enforce_recalculate?: boolean): number;
    private initializeTag();
    rootTag(): JQuery<HTMLElement>;
    channelTag(): JQuery<HTMLElement>;
    siblingTag(): JQuery<HTMLElement>;
    clientTag(): JQuery<HTMLElement>;
    reorderClients();
    initializeListener();
    showContextMenu(x: number, y: number, on_close?: () => void);
    handle_frame_resized();
    private static NAME_ALIGNMENTS: string[];
    private __updateChannelName();
    recalculate_repetitive_name();
    updateVariables(...variables: {
        key: string;
        value: string;
    }[]);
    updateChannelTypeIcon();
    generate_bbcode();
    generate_tag(braces?: boolean): JQuery;
    channelType(): ChannelType;
    joinChannel();
    subscribe(): Promise<void>;
    unsubscribe(inherited_subscription_mode?: boolean): Promise<void>;
    // @ts-ignore
    get flag_subscribed(): boolean;
    // @ts-ignore
    set flag_subscribed(flag: boolean);
    // @ts-ignore
    get subscribe_mode(): ChannelSubscribeMode;
    // @ts-ignore
    set subscribe_mode(mode: ChannelSubscribeMode);
}

/* File: shared/js/ui/client_move.ts */
declare class ClientMover {
    static readonly listener_root;
    static readonly move_element;
    readonly channel_tree: ChannelTree;
    selected_client: ClientEntry | ClientEntry[];
    hovered_channel: HTMLDivElement;
    callback: (channel?: ChannelEntry) => any;
    private _bound_finish;
    private _bound_move;
    private _active: boolean;
    private origin_point: {
        x: number;
        y: number;
    };
    constructor(tree: ChannelTree);
    is_active();
    private hover_text();
    private bbcode_text();
    activate(client: ClientEntry | ClientEntry[], callback: (channel?: ChannelEntry) => any, event: any);
    private move_listener(event);
    private finish_listener(event);
    deactivate();
}

/* File: shared/js/ui/client.ts */
declare enum ClientType {
    CLIENT_VOICE,
    CLIENT_QUERY,
    CLIENT_INTERNAL,
    CLIENT_WEB,
    CLIENT_MUSIC,
    CLIENT_UNDEFINED
}
declare class ClientProperties {
    client_type: ClientType;
    client_type_exact: ClientType;
    client_database_id: number;
    client_version: string;
    client_platform: string;
    client_nickname: string;
    client_unique_identifier: string;
    client_description: string;
    client_servergroups: string;
    client_channel_group_id: number;
    client_lastconnected: number;
    client_flag_avatar: string;
    client_icon_id: number;
    client_away_message: string;
    client_away: boolean;
    client_input_hardware: boolean;
    client_output_hardware: boolean;
    client_input_muted: boolean;
    client_output_muted: boolean;
    client_is_channel_commander: boolean;
    client_teaforum_id: number;
    client_teaforum_name: string;
    client_talk_power: number;
}
declare class ClientEntry {
    protected _clientId: number;
    protected _channel: ChannelEntry;
    protected _tag: JQuery<HTMLElement>;
    protected _properties: ClientProperties;
    protected lastVariableUpdate: number;
    protected _speaking: boolean;
    protected _listener_initialized: boolean;
    protected _audio_handle: connection.voice.VoiceClient;
    channelTree: ChannelTree;
    constructor(clientId: number, clientName, properties?: ClientProperties);
    set_audio_handle(handle: connection.voice.VoiceClient);
    get_audio_handle(): connection.voice.VoiceClient;
    // @ts-ignore
    get properties(): ClientProperties;
    currentChannel(): ChannelEntry;
    clientNickName();
    clientUid();
    clientId();
    protected initializeListener();
    protected assignment_context(): ContextMenuEntry[];
    showContextMenu(x: number, y: number, on_close?: () => void);
    // @ts-ignore
    get tag(): JQuery<HTMLElement>;
    static bbcodeTag(id: number, name: string, uid: string): string;
    static chatTag(id: number, name: string, uid: string, braces?: boolean): JQuery;
    create_bbcode(): string;
    createChatTag(braces?: boolean): JQuery;
    // @ts-ignore
    set speaking(flag);
    updateClientStatusIcons();
    updateClientSpeakIcon();
    updateAwayMessage();
    updateVariables(...variables: {
        key: string;
        value: string;
    }[]);
    update_displayed_client_groups();
    updateClientVariables();
    chat(create?: boolean): ChatEntry;
    updateClientIcon();
    updateGroupIcon(group: Group);
    assignedServerGroupIds(): number[];
    assignedChannelGroup(): number;
    groupAssigned(group: Group): boolean;
    onDelete();
    calculateOnlineTime(): number;
    avatarId?(): string;
    update_family_index();
}
declare class LocalClientEntry extends ClientEntry {
    handle: ConnectionHandler;
    private renaming: boolean;
    constructor(handle: ConnectionHandler);
    showContextMenu(x: number, y: number, on_close?: () => void): void;
    initializeListener(): void;
    openRename(): void;
}
declare class MusicClientProperties extends ClientProperties {
    player_state: number;
    player_volume: number;
    client_playlist_id: number;
    client_disabled: boolean;
}
declare class MusicClientPlayerInfo {
    bot_id: number;
    player_state: number;
    player_buffered_index: number;
    player_replay_index: number;
    player_max_index: number;
    player_seekable: boolean;
    player_title: string;
    player_description: string;
    song_id: number;
    song_url: string;
    song_invoker: number;
    song_loaded: boolean;
    song_title: string;
    song_thumbnail: string;
    song_length: number;
}
declare class MusicClientEntry extends ClientEntry {
    private _info_promise: Promise<MusicClientPlayerInfo>;
    private _info_promise_age: number;
    private _info_promise_resolve: any;
    private _info_promise_reject: any;
    constructor(clientId, clientName);
    // @ts-ignore
    get properties(): MusicClientProperties;
    showContextMenu(x: number, y: number, on_close?: () => void): void;
    initializeListener(): void;
    handlePlayerInfo(json);
    requestPlayerInfo(max_age?: number): Promise<MusicClientPlayerInfo>;
}

/* File: shared/js/ui/elements/context_divider.ts */
declare interface JQuery<TElement = HTMLElement> {
    dividerfy(): this;
}

/* File: shared/js/ui/elements/context_menu.ts */
declare let context_menu: JQuery;
declare let contextMenuCloseFn;
declare function despawn_context_menu();
declare enum MenuEntryType {
    CLOSE,
    ENTRY,
    HR,
    SUB_MENU
}
declare class MenuEntry {
    static HR();
    static CLOSE(callback: () => void);
}
declare interface ContextMenuEntry {
    callback?: () => void;
    type: MenuEntryType;
    name: (() => string) | string;
    icon?: (() => string) | string | JQuery;
    disabled?: boolean;
    visible?: boolean;
    invalidPermission?: boolean;
    sub_menu?: ContextMenuEntry[];
}
declare function generate_tag(entry: ContextMenuEntry): JQuery;
declare function spawn_context_menu(x, y, ...entries: ContextMenuEntry[]);

/* File: shared/js/ui/elements/modal.ts */
declare enum ElementType {
    HEADER,
    BODY,
    FOOTER
}
type BodyCreator = (() => JQuery | JQuery[] | string) | string | JQuery | JQuery[];
declare const ModalFunctions;
declare class ModalProperties {
    template?: string;
    header: BodyCreator;
    body: BodyCreator;
    footer: BodyCreator;
    closeListener: (() => void) | (() => void)[];
    registerCloseListener(listener: () => void): this;
    width: number | string;
    height: number | string;
    closeable: boolean;
    triggerClose();
    template_properties?: any;
    trigger_tab: boolean;
    full_size?: boolean;
}
declare class Modal {
    private _htmlTag: JQuery;
    properties: ModalProperties;
    shown: boolean;
    close_listener: (() => any)[];
    constructor(props: ModalProperties);
    // @ts-ignore
    get htmlTag(): JQuery;
    private _create();
    open();
    close();
}
declare function createModal(data: ModalProperties | any): Modal;
declare class InputModalProperties extends ModalProperties {
    maxLength?: number;
    field_title?: string;
    field_label?: string;
    field_placeholder?: string;
    error_message?: string;
}
declare function createInputModal(headMessage: BodyCreator, question: BodyCreator, validator: (input: string) => boolean, callback: (flag: boolean | string) => void, props?: InputModalProperties | any): Modal;
declare function createErrorModal(header: BodyCreator, message: BodyCreator, props?: ModalProperties | any);
declare function createInfoModal(header: BodyCreator, message: BodyCreator, props?: ModalProperties | any);
declare interface ModalElements {
    header?: BodyCreator;
    body?: BodyCreator;
    footer?: BodyCreator;
}
declare interface JQuery<TElement = HTMLElement> {
    modalize(entry_callback?: (header: JQuery, body: JQuery, footer: JQuery) => ModalElements | void, properties?: ModalProperties | any): Modal;
}

/* File: shared/js/ui/elements/tab.ts */
declare interface JQuery<TElement = HTMLElement> {
    asTabWidget(copy?: boolean): JQuery<TElement>;
    tabify(copy?: boolean): this;
    changeElementType(type: string): JQuery<TElement>;
}
declare var TabFunctions;

/* File: shared/js/ui/frames/chat.ts */
declare enum ChatType {
    GENERAL,
    SERVER,
    CHANNEL,
    CLIENT
}
declare namespace MessageHelper {
    export function htmlEscape(message: string): string[];
    export function formatElement(object: any, escape_html?: boolean): JQuery[];
    export function formatMessage(pattern: string, ...objects: any[]): JQuery[];
    export function bbcode_chat(message: string): JQuery[];
}
declare class ChatMessage {
    date: Date;
    message: JQuery[];
    private _html_tag: JQuery<HTMLElement>;
    constructor(message: JQuery[]);
    private num(num: number): string;
    // @ts-ignore
    get html_tag();
}
declare class ChatEntry {
    readonly handle: ChatBox;
    type: ChatType;
    key: string;
    history: ChatMessage[];
    owner_unique_id?: string;
    private _name: string;
    private _html_tag: any;
    private _flag_closeable: boolean;
    private _flag_unread: boolean;
    private _flag_offline: boolean;
    onMessageSend: (text: string) => void;
    onClose: () => boolean;
    constructor(handle, type: ChatType, key);
    appendError(message: string, ...args);
    appendMessage(message: string, fmt?: boolean, ...args);
    private pushChatMessage(entry: ChatMessage);
    displayHistory();
    // @ts-ignore
    get html_tag();
    focus();
    // @ts-ignore
    set name(newName: string);
    // @ts-ignore
    set flag_closeable(flag: boolean);
    // @ts-ignore
    set flag_unread(flag: boolean);
    // @ts-ignore
    get flag_offline();
    // @ts-ignore
    set flag_offline(flag: boolean);
    private chat_icon(): string;
}
declare class ChatBox {
    static readonly URL_REGEX;
    readonly connection_handler: ConnectionHandler;
    htmlTag: JQuery;
    chats: ChatEntry[];
    private _activeChat: ChatEntry;
    private _button_send: JQuery;
    private _input_message: JQuery;
    constructor(connection_handler: ConnectionHandler);
    initialize();
    createChat(key, type?: ChatType): ChatEntry;
    open_chats(): ChatEntry[];
    findChat(key: string): ChatEntry;
    deleteChat(chat: ChatEntry);
    onSend();
    // @ts-ignore
    set activeChat(chat: ChatEntry);
    private activeChat0(chat: ChatEntry);
    // @ts-ignore
    get activeChat();
    channelChat(): ChatEntry;
    serverChat();
    focus();
    private testMessage(message: string): boolean;
}

/* File: shared/js/ui/frames/connection_handlers.ts */
declare let server_connections: ServerConnectionManager;
declare class ServerConnectionManager {
    private connection_handlers: ConnectionHandler[];
    private active_handler: ConnectionHandler | undefined;
    private _container_channel_tree: JQuery;
    private _container_select_info: JQuery;
    private _container_chat_box: JQuery;
    private _tag: JQuery;
    private _tag_connection_entries: JQuery;
    private _tag_buttons_scoll: JQuery;
    private _tag_button_scoll_right: JQuery;
    private _tag_button_scoll_left: JQuery;
    constructor(tag: JQuery);
    spawn_server_connection_handler(): ConnectionHandler;
    destroy_server_connection_handler(handler: ConnectionHandler);
    set_active_connection_handler(handler: ConnectionHandler);
    active_connection_handler(): ConnectionHandler | undefined;
    server_connection_handlers(): ConnectionHandler[];
    update_ui();
    private _update_scroll();
    private _button_scroll_right_clicked();
    private _button_scroll_left_clicked();
    private _update_scroll_buttons();
}

/* File: shared/js/ui/frames/ControlBar.ts */
declare let control_bar: ControlBar;
type MicrophoneState = "disabled" | "muted" | "enabled";
type HeadphoneState = "muted" | "enabled";
type AwayState = "away-global" | "away" | "online";
declare class ControlBar {
    private _button_away_active: AwayState;
    private _button_microphone: MicrophoneState;
    private _button_speakers: HeadphoneState;
    private _button_subscribe_all: boolean;
    private _button_query_visible: boolean;
    private connection_handler: ConnectionHandler | undefined;
    htmlTag: JQuery;
    constructor(htmlTag: JQuery);
    initialize_connection_handler_state(handler?: ConnectionHandler);
    set_connection_handler(handler?: ConnectionHandler);
    apply_server_state();
    apply_server_voice_state();
    current_connection_handler();
    initialise();
    // @ts-ignore
    set button_away_active(flag: AwayState);
    update_button_away();
    // @ts-ignore
    set button_microphone(state: MicrophoneState);
    // @ts-ignore
    set button_speaker(state: HeadphoneState);
    // @ts-ignore
    set button_subscribe_all(state: boolean);
    // @ts-ignore
    set button_query_visible(state: boolean);
    private on_away_toggle();
    private on_away_enable();
    private on_away_disable();
    private on_away_set_message();
    private on_away_enable_global();
    private on_away_disable_global();
    private on_away_set_message_global();
    private on_toggle_microphone();
    private on_toggle_sound();
    private on_toggle_channel_subscribe();
    private on_toggle_query_view();
    private on_open_settings();
    private on_open_connect();
    update_connection_state();
    private on_execute_disconnect();
    private on_token_use();
    private on_token_list();
    private on_open_permissions();
    private on_open_banslist();
    private on_bookmark_server_add();
    update_bookmark_status();
    update_bookmarks();
    private on_bookmark_manage();
    private on_open_query_create();
    private on_open_query_manage();
    private on_open_playlist_manage();
}

/* File: shared/js/ui/frames/SelectedItemInfo.ts */
declare abstract class InfoManagerBase {
    private timers: NodeJS.Timer[];
    private intervals: number[];
    protected resetTimers();
    protected resetIntervals();
    protected registerTimer(timer: NodeJS.Timer);
    protected registerInterval<T extends number | NodeJS.Timer>(interval: T);
    abstract available<V>(object: V): boolean;
}
declare abstract class InfoManager<T> extends InfoManagerBase {
    protected handle?: InfoBar<undefined>;
    createFrame<_>(handle: InfoBar<_>, object: T, html_tag: JQuery<HTMLElement>);
    abstract updateFrame(object: T, html_tag: JQuery<HTMLElement>);
    finalizeFrame(object: T, frame: JQuery<HTMLElement>);
    protected triggerUpdate();
}
declare class InfoBar<AvailableTypes = ServerEntry | ChannelEntry | ClientEntry | undefined> {
    readonly handle: ConnectionHandler;
    private current_selected?: AvailableTypes;
    private _tag: JQuery<HTMLElement>;
    private readonly _tag_info: JQuery<HTMLElement>;
    private readonly _tag_banner: JQuery<HTMLElement>;
    private _current_manager: InfoManagerBase;
    private managers: InfoManagerBase[];
    private banner_manager: Hostbanner;
    constructor(client: ConnectionHandler);
    get_tag(): JQuery;
    handle_resize();
    setCurrentSelected(entry: AvailableTypes);
    // @ts-ignore
    get currentSelected();
    update();
    update_banner();
    current_manager();
    is_popover(): boolean;
    open_popover();
    close_popover();
    rendered_tag();
}
declare interface Window {
    Image: typeof HTMLImageElement;
    HTMLImageElement: typeof HTMLImageElement;
}
declare class Hostbanner {
    readonly html_tag: JQuery<HTMLElement>;
    readonly client: ConnectionHandler;
    private updater: NodeJS.Timer;
    private _hostbanner_url: string;
    constructor(client: ConnectionHandler, htmlTag: JQuery<HTMLElement>);
    update();
    handle_resize();
    private generate_tag?(): Promise<JQuery<HTMLElement>>;
}
declare class ClientInfoManager extends InfoManager<ClientEntry> {
    available<V>(object: V): boolean;
    createFrame<_>(handle: InfoBar<_>, client: ClientEntry, html_tag: JQuery<HTMLElement>);
    updateFrame(client: ClientEntry, html_tag: JQuery<HTMLElement>);
    buildProperties(client: ClientEntry): any;
}
declare class ServerInfoManager extends InfoManager<ServerEntry> {
    createFrame<_>(handle: InfoBar<_>, server: ServerEntry, html_tag: JQuery<HTMLElement>);
    updateFrame(server: ServerEntry, html_tag: JQuery<HTMLElement>);
    available<V>(object: V): boolean;
}
declare class ChannelInfoManager extends InfoManager<ChannelEntry> {
    createFrame<_>(handle: InfoBar<_>, channel: ChannelEntry, html_tag: JQuery<HTMLElement>);
    updateFrame(channel: ChannelEntry, html_tag: JQuery<HTMLElement>);
    available<V>(object: V): boolean;
}
declare function format_time(time: number);
declare enum MusicPlayerState {
    SLEEPING,
    LOADING,
    PLAYING,
    PAUSED,
    STOPPED
}
declare class MusicInfoManager extends ClientInfoManager {
    single_handler: connection.SingleCommandHandler;
    createFrame<_>(handle: InfoBar<_>, channel: MusicClientEntry, html_tag: JQuery<HTMLElement>);
    updateFrame(bot: MusicClientEntry, html_tag: JQuery<HTMLElement>);
    update_local_volume(volume: number);
    update_remote_volume(volume: number);
    available<V>(object: V): boolean;
    finalizeFrame(object: ClientEntry, frame: JQuery<HTMLElement>);
}

/* File: shared/js/ui/htmltags.ts */
declare namespace htmltags {
    export interface ClientProperties {
        client_id: number;
        client_unique_id: string;
        client_name: string;
        add_braces?: boolean;
    }
    export interface ChannelProperties {
        channel_id: number;
        channel_name: string;
        channel_display_name?: string;
        add_braces?: boolean;
    }
    export function generate_client(properties: ClientProperties): string;
    export function generate_channel(properties: ChannelProperties): string;
    export namespace callbacks {
        export function callback_context_client(element: JQuery);
        export function callback_context_channel(element: JQuery);
    }
    namespace bbcodes { }
}

/* File: shared/js/ui/modal/ModalAvatarList.ts */
declare namespace Modals {
    export const human_file_size;
    export function spawnAvatarList(client: ConnectionHandler);
}

/* File: shared/js/ui/modal/ModalBanClient.ts */
declare namespace Modals {
    export function spawnBanClient(name: string | string[], callback: (data: {
        length: number;
        reason: string;
        no_name: boolean;
        no_ip: boolean;
        no_hwid: boolean;
    }) => void);
}

/* File: shared/js/ui/modal/ModalBanCreate.ts */
declare namespace Modals {
    export function spawnBanCreate(connection: ConnectionHandler, base?: BanEntry, callback?: (entry?: BanEntry) => any);
}

/* File: shared/js/ui/modal/ModalBanList.ts */
declare namespace Modals {
    export interface BanEntry {
        server_id: number;
        banid: number;
        name?: string;
        name_type?: number;
        unique_id?: string;
        ip?: string;
        hardware_id?: string;
        reason: string;
        invoker_name: string;
        invoker_unique_id?: string;
        invoker_database_id?: number;
        timestamp_created: Date;
        timestamp_expire: Date;
        enforcements: number;
        flag_own?: boolean;
    }
    export interface BanListManager {
        addbans: (ban: BanEntry[]) => void;
        clear: (ban?: any) => void;
        modal: Modal;
    }
    export function openBanList(client: ConnectionHandler);
    export function spawnBanListModal(callback_update: () => any, callback_add: () => any, callback_edit: (entry: BanEntry) => any, callback_delete: (entry: BanEntry) => any): BanListManager;
}

/* File: shared/js/ui/modal/ModalBookmarks.ts */
declare namespace Modals {
    export function spawnBookmarkModal();
}

/* File: shared/js/ui/modal/ModalBotMenue.ts */

/* File: shared/js/ui/modal/ModalChangeVolume.ts */
declare namespace Modals {
    export function spawnChangeVolume(current: number, callback: (number) => void);
    export function spawnChangeRemoteVolume(current: number, max_value: number, callback: (value: number) => void);
}

/* File: shared/js/ui/modal/ModalConnect.ts */
declare namespace Modals {
    export function spawnConnectModal(defaultHost?: {
        url: string;
        enforce: boolean;
    }, connect_profile?: {
        profile: profiles.ConnectionProfile;
        enforce: boolean;
    });
    export const Regex;
}

/* File: shared/js/ui/modal/ModalCreateChannel.ts */
declare namespace Modals {
    export function createChannelModal(connection: ConnectionHandler, channel: ChannelEntry | undefined, parent: ChannelEntry | undefined, permissions: PermissionManager, callback: (properties?: ChannelProperties, permissions?: PermissionValue[]) => any);
}

/* File: shared/js/ui/modal/ModalIconSelect.ts */
declare namespace Modals {
    export function spawnIconSelect(client: ConnectionHandler, callback_icon?: (id: number) => any, selected_icon?: number);
}

/* File: shared/js/ui/modal/ModalPermissionEdit.ts */
declare interface JQuery<TElement = HTMLElement> {
    dropdown: any;
}
declare namespace Modals {
    namespace PermissionEditor {
        export interface PermissionEntry {
            tag: JQuery;
            tag_value: JQuery;
            tag_grant: JQuery;
            tag_flag_negate: JQuery;
            tag_flag_skip: JQuery;
            id: number;
            filter: string;
            is_bool: boolean;
        }
        export interface PermissionValue {
            remove: boolean;
            granted?: number;
            value?: number;
            flag_skip?: boolean;
            flag_negate?: boolean;
        }
        export type change_listener_t = (permission: PermissionInfo, value?: PermissionEditor.PermissionValue) => Promise<any>;
    }
    export enum PermissionEditorMode {
        VISIBLE,
        NO_PERMISSION,
        UNSET
    }
    export class PermissionEditor {
        readonly permissions: GroupedPermissions[];
        container: JQuery;
        private mode_container_permissions: JQuery;
        private mode_container_error_permission: JQuery;
        private mode_container_unset: JQuery;
        private permission_value_map: {
            [key: number]: PermissionValue;
        };
        private permission_map: {
            [key: number]: PermissionEditor.PermissionEntry;
        };
        private listener_change: PermissionEditor.change_listener_t;
        private listener_update: () => any;
        constructor(permissions: GroupedPermissions[]);
        build_tag();
        set_permissions(permissions?: PermissionValue[]);
        set_listener(listener?: PermissionEditor.change_listener_t);
        set_listener_update(listener?: () => any);
        trigger_update();
        set_mode(mode: PermissionEditorMode);
    }
    export function spawnPermissionEdit(connection: ConnectionHandler): Modal;
}

/* File: shared/js/ui/modal/ModalPlaylistEdit.ts */
declare namespace Modals {
    export function spawnPlaylistSongInfo(song: PlaylistSong);
    export function spawnSongAdd(playlist: Playlist, callback_add: (url: string, loader: string) => any);
    export function spawnPlaylistEdit(client: ConnectionHandler, playlist: Playlist);
}

/* File: shared/js/ui/modal/ModalPlaylistList.ts */
declare namespace Modals {
    export function spawnPlaylistManage(client: ConnectionHandler);
}

/* File: shared/js/ui/modal/ModalPoke.ts */
declare namespace Modals {
    export function spawnPoke(invoker: {
        name: string;
        id: number;
        unique_id: string;
    }, message);
}

/* File: shared/js/ui/modal/ModalQuery.ts */
declare namespace Modals {
    export function spawnQueryCreate(connection: ConnectionHandler, callback_created?: (user, pass) => any);
    export function spawnQueryCreated(credentials: {
        username: string;
        password: string;
    }, just_created: boolean);
}

/* File: shared/js/ui/modal/ModalQueryManage.ts */
declare namespace Modals {
    export function spawnQueryManage(client: ConnectionHandler);
}

/* File: shared/js/ui/modal/ModalServerEdit.ts */
declare namespace Modals {
    export function createServerModal(server: ServerEntry, callback: (properties?: ServerProperties) => any);
}

/* File: shared/js/ui/modal/ModalServerGroupDialog.ts */
declare namespace Modals {
    export function createServerGroupAssignmentModal(client: ClientEntry, callback: (group: Group, flag: boolean) => Promise<boolean>);
}

/* File: shared/js/ui/modal/ModalSettings.ts */
declare namespace Modals {
    export function spawnSettingsModal(): Modal;
}

/* File: shared/js/ui/modal/ModalYesNo.ts */
declare namespace Modals {
    export function spawnYesNo(header: BodyCreator, body: BodyCreator, callback: (_: boolean) => any, properties?: {
        text_yes?: string;
        text_no?: string;
    });
}

/* File: shared/js/ui/server.ts */
declare class ServerProperties {
    virtualserver_host: string;
    virtualserver_port: number;
    virtualserver_name: string;
    virtualserver_name_phonetic: string;
    virtualserver_icon_id: number;
    virtualserver_version: string;
    virtualserver_platform: string;
    virtualserver_unique_identifier: string;
    virtualserver_clientsonline: number;
    virtualserver_queryclientsonline: number;
    virtualserver_channelsonline: number;
    virtualserver_uptime: number;
    virtualserver_maxclients: number;
    virtualserver_reserved_slots: number;
    virtualserver_password: string;
    virtualserver_flag_password: boolean;
    virtualserver_welcomemessage: string;
    virtualserver_hostmessage: string;
    virtualserver_hostmessage_mode: number;
    virtualserver_hostbanner_url: string;
    virtualserver_hostbanner_gfx_url: string;
    virtualserver_hostbanner_gfx_interval: number;
    virtualserver_hostbanner_mode: number;
    virtualserver_hostbutton_tooltip: string;
    virtualserver_hostbutton_url: string;
    virtualserver_hostbutton_gfx_url: string;
    virtualserver_codec_encryption_mode: number;
    virtualserver_default_music_group: number;
    virtualserver_default_server_group: number;
    virtualserver_default_channel_group: number;
    virtualserver_default_channel_admin_group: number;
    virtualserver_default_client_description: string;
    virtualserver_default_channel_description: string;
    virtualserver_default_channel_topic: string;
    virtualserver_antiflood_points_tick_reduce: number;
    virtualserver_antiflood_points_needed_command_block: number;
    virtualserver_antiflood_points_needed_ip_block: number;
    virtualserver_complain_autoban_count: number;
    virtualserver_complain_autoban_time: number;
    virtualserver_complain_remove_time: number;
    virtualserver_needed_identity_security_level: number;
    virtualserver_weblist_enabled: boolean;
    virtualserver_min_clients_in_channel_before_forced_silence: number;
    virtualserver_max_upload_total_bandwidth: number;
    virtualserver_upload_quota: number;
    virtualserver_max_download_total_bandwidth: number;
    virtualserver_download_quota: number;
}
declare interface ServerAddress {
    host: string;
    port: number;
}
declare class ServerEntry {
    remote_address: ServerAddress;
    channelTree: ChannelTree;
    properties: ServerProperties;
    private info_request_promise: Promise<void>;
    private info_request_promise_resolve: any;
    private info_request_promise_reject: any;
    lastInfoRequest: number;
    nextInfoRequest: number;
    private _htmlTag: JQuery<HTMLElement>;
    constructor(tree, name, address: ServerAddress);
    // @ts-ignore
    get htmlTag();
    initializeListener();
    spawnContextMenu(x: number, y: number, on_close?: () => void);
    updateVariables(is_self_notify: boolean, ...variables: {
        key: string;
        value: string;
    }[]);
    updateProperties(): Promise<void>;
    shouldUpdateProperties(): boolean;
    calculateUptime(): number;
}

/* File: shared/js/ui/view.ts */
declare class ChannelTree {
    client: ConnectionHandler;
    server: ServerEntry;
    channels: ChannelEntry[];
    clients: ClientEntry[];
    currently_selected: ClientEntry | ServerEntry | ChannelEntry | (ClientEntry | ServerEntry)[];
    currently_selected_context_callback: (event) => any;
    readonly client_mover: ClientMover;
    private _tag_container: JQuery;
    private _tag_entries: JQuery;
    private _tree_detached: boolean;
    private _show_queries: boolean;
    private channel_last?: ChannelEntry;
    private channel_first?: ChannelEntry;
    private selected_event?: Event;
    constructor(client);
    tag_tree(): JQuery;
    hide_channel_tree();
    show_channel_tree();
    showContextMenu(x: number, y: number, on_close?: () => void);
    initialiseHead(serverName: string, address: ServerAddress);
    private __deleteAnimation(element: ChannelEntry | ClientEntry);
    rootChannel(): ChannelEntry[];
    deleteChannel(channel: ChannelEntry);
    insertChannel(channel: ChannelEntry);
    findChannel(channelId: number): ChannelEntry | undefined;
    find_channel_by_name(name: string, parent?: ChannelEntry, force_parent?: boolean): ChannelEntry | undefined;
    moveChannel(channel: ChannelEntry, channel_previous: ChannelEntry, parent: ChannelEntry);
    deleteClient(client: ClientEntry, animate_tag?: boolean);
    registerClient(client: ClientEntry);
    insertClient(client: ClientEntry, channel: ChannelEntry): ClientEntry;
    moveClient(client: ClientEntry, channel: ChannelEntry);
    findClient?(clientId: number): ClientEntry;
    find_client_by_dbid?(client_dbid: number): ClientEntry;
    find_client_by_unique_id?(unique_id: string): ClientEntry;
    private static same_selected_type(a, b);
    onSelect(entry?: ChannelEntry | ClientEntry | ServerEntry, enforce_single?: boolean, flag_shift?: boolean);
    private callback_multiselect_channel(event);
    private callback_multiselect_client(event);
    clientsByGroup(group: Group): ClientEntry[];
    clientsByChannel(channel: ChannelEntry): ClientEntry[];
    reset();
    spawnCreateChannel(parent?: ChannelEntry);
    handle_resized();
    private select_next_channel(channel: ChannelEntry, select_client: boolean);
    handle_key_press(event: KeyboardEvent);
    toggle_server_queries(flag: boolean);
    get_first_channel?(): ChannelEntry;
    unsubscribe_all_channels(subscribe_specified?: boolean);
    subscribe_all_channels();
}

/* File: shared/js/utils/helpers.ts */
declare namespace helpers {
    export function hashPassword(password: string): Promise<string>;
}
declare class LaterPromise<T> extends Promise<T> {
    private _handle: Promise<T>;
    private _resolve: ($: T) => any;
    private _reject: ($: any) => any;
    private _time: number;
    constructor();
    resolved(object: T);
    rejected(reason);
    function_rejected();
    time();
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): Promise<TResult1 | TResult2>;
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): Promise<T | TResult>;
}
declare const copy_to_clipboard;

/* File: shared/js/voice/AudioResampler.ts */
declare class AudioResampler {
    targetSampleRate: number;
    private _use_promise: boolean;
    constructor(targetSampleRate: number);
    resample(buffer: AudioBuffer): Promise<AudioBuffer>;
}

/* File: shared/js/voice/VoiceClient.ts */
declare namespace audio {
    export namespace js {
        export class VoiceClientController implements connection.voice.VoiceClient {
            callback_playback: () => any;
            callback_state_changed: (new_state: connection.voice.PlayerState) => any;
            callback_stopped: () => any;
            client_id: number;
            speakerContext: AudioContext;
            private _player_state: connection.voice.PlayerState;
            private _codecCache: CodecClientCache[];
            private _time_index: number;
            private _latency_buffer_length: number;
            private _buffer_timeout: NodeJS.Timer;
            private _buffered_samples: AudioBuffer[];
            private _playing_nodes: AudioBufferSourceNode[];
            private _volume: number;
            allowBuffering: boolean;
            constructor(client_id: number);
            public initialize();
            public close();
            playback_buffer(buffer: AudioBuffer);
            private replay_queue();
            private on_buffer_replay_finished(node: AudioBufferSourceNode);
            stopAudio(now?: boolean);
            private test_buffer_queue();
            private reset_buffer_timeout(restart: boolean);
            private apply_volume_to_buffer(buffer: AudioBuffer);
            private set_state(state: connection.voice.PlayerState);
            get_codec_cache(codec: number): CodecClientCache;
            get_state(): connection.voice.PlayerState;
            get_volume(): number;
            set_volume(volume: number): void;
            abort_replay();
        }
    }
}

/* File: shared/js/voice/VoiceHandler.ts */
declare namespace audio {
    export namespace js {
        export namespace codec {
            export class CacheEntry {
                instance: BasicCodec;
                owner: number;
                last_access: number;
            }
            export class CodecPool {
                codecIndex: number;
                name: string;
                type: CodecType;
                entries: CacheEntry[];
                maxInstances: number;
                private _supported: boolean;
                initialize(cached: number);
                supported();
                ownCodec?(clientId: number, callback_encoded: (buffer: Uint8Array) => any, create?: boolean): Promise<BasicCodec | undefined>;
                releaseCodec(clientId: number);
                constructor(index: number, name: string, type: CodecType);
            }
        }
        export enum VoiceEncodeType {
            JS_ENCODE,
            NATIVE_ENCODE
        }
        export class VoiceConnection extends connection.voice.AbstractVoiceConnection {
            readonly connection: connection.ServerConnection;
            rtcPeerConnection: RTCPeerConnection;
            dataChannel: RTCDataChannel;
            private _type: VoiceEncodeType;
            local_audio_stream: MediaStreamAudioDestinationNode;
            static codec_pool: codec.CodecPool[];
            static codecSupported(type: number): boolean;
            private voice_packet_id: number;
            private chunkVPacketId: number;
            private send_task: NodeJS.Timer;
            private _audio_source: VoiceRecorder;
            private _audio_clients: audio.js.VoiceClientController[];
            constructor(connection: connection.ServerConnection);
            native_encoding_supported(): boolean;
            javascript_encoding_supported(): boolean;
            current_encoding_supported(): boolean;
            private setup_native();
            private setup_js();
            acquire_voice_recorder(recorder: VoiceRecorder | undefined, enforce?: boolean);
            get_encoder_type(): VoiceEncodeType;
            set_encoder_type(target: VoiceEncodeType);
            voice_playback_support(): boolean;
            voice_send_support(): boolean;
            private voice_send_queue: {
                data: Uint8Array;
                codec: number;
            }[];
            handleEncodedVoicePacket(data: Uint8Array, codec: number);
            private send_next_voice_packet();
            send_voice_packet(encoded_data: Uint8Array, codec: number);
            createSession();
            dropSession();
            private _ice_use_cache: boolean;
            private _ice_cache: any[];
            handleControlPacket(json);
            private on_local_ice_candidate(event: RTCPeerConnectionIceEvent);
            private on_local_offer_created(localSession);
            private on_data_channel(channel);
            private on_data_channel_message(message: MessageEvent);
            private current_channel_codec(): number;
            private handleVoiceData(data: AudioBuffer, head: boolean);
            private handleVoiceEnded();
            private handleVoiceStarted();
            private on_recoder_yield();
            connected(): boolean;
            voice_recorder(): VoiceRecorder;
            available_clients(): connection.voice.VoiceClient[];
            find_client(client_id: number): audio.js.VoiceClientController | undefined;
            unregister_client(client: connection.voice.VoiceClient): Promise<void>;
            register_client(client_id: number): connection.voice.VoiceClient;
            decoding_supported(codec: number): boolean;
            encoding_supported(codec: number): boolean;
        }
    }
}
declare interface RTCPeerConnection {
    addStream(stream: MediaStream): void;
    getLocalStreams(): MediaStream[];
    getStreamById(streamId: string): MediaStream | null;
    removeStream(stream: MediaStream): void;
    createOffer(successCallback?: RTCSessionDescriptionCallback, failureCallback?: RTCPeerConnectionErrorCallback, options?: RTCOfferOptions): Promise<RTCSessionDescription>;
}

/* File: shared/js/voice/VoiceRecorder.ts */
declare abstract class VoiceActivityDetector {
    protected handle: VoiceRecorder;
    abstract shouldRecord(buffer: AudioBuffer): boolean;
    initialise();
    finalize();
    initialiseNewStream(old: MediaStreamAudioSourceNode, _new: MediaStreamAudioSourceNode): void;
    changeHandle(handle: VoiceRecorder, triggerNewStream: boolean);
}
declare interface MediaStreamConstraints {
    deviceId?: string;
    groupId?: string;
}
declare let voice_recoder: VoiceRecorder;
declare class VoiceRecorder {
    private static readonly CHANNEL;
    private static readonly CHANNELS;
    private static readonly BUFFER_SIZE;
    on_support_state_change: () => any;
    on_data: (data: AudioBuffer, head: boolean) => void;
    on_end: () => any;
    on_start: () => any;
    on_yield: () => any;
    owner: connection.voice.AbstractVoiceConnection | undefined;
    private on_ready_callbacks: (() => any)[];
    private _recording: boolean;
    private _recording_supported: boolean;
    private _tag_favicon: JQuery;
    private microphoneStream: MediaStreamAudioSourceNode;
    private mediaStream: MediaStream;
    private audioContext: AudioContext;
    private processor: ScriptProcessorNode;
    get_output_stream(): ScriptProcessorNode;
    private vadHandler: VoiceActivityDetector;
    private _chunkCount: number;
    private _deviceId: string;
    private _deviceGroup: string;
    private current_handler: ConnectionHandler;
    constructor();
    own_recoder(connection: connection.voice.AbstractVoiceConnection | undefined);
    input_available(): boolean;
    getMediaStream(): MediaStream;
    getMicrophoneStream(): MediaStreamAudioSourceNode;
    reinitialiseVAD();
    setVADHandler(handler: VoiceActivityDetector);
    getVADHandler(): VoiceActivityDetector;
    set_recording(flag_enabled: boolean);
    clean_recording_supported();
    is_recording_supported();
    is_recording();
    device_group_id(): string;
    device_id(): string;
    change_device(device: string, group: string);
    start_recording(device: string, groupId: string);
    stop_recording(stop_media_stream?: boolean);
    on_initialized(callback: () => any);
    private on_microphone(stream: MediaStream);
    private on_voice_start();
    private on_voice_end();
}
declare class MuteVAD extends VoiceActivityDetector {
    shouldRecord(buffer: AudioBuffer): boolean;
}
declare class PassThroughVAD extends VoiceActivityDetector {
    shouldRecord(buffer: AudioBuffer): boolean;
}
declare class VoiceActivityDetectorVAD extends VoiceActivityDetector {
    analyzer: AnalyserNode;
    buffer: Uint8Array;
    continuesCount: number;
    maxContinuesCount: number;
    percentageThreshold: number;
    percentage_listener: (per: number) => void;
    initialise();
    initialiseNewStream(old: MediaStreamAudioSourceNode, _new: MediaStreamAudioSourceNode): void;
    shouldRecord(buffer: AudioBuffer): boolean;
    calculateUsage(): number;
}
declare interface PPTKeySettings extends ppt.KeyDescriptor {
    version?: number;
    delay: number;
}
declare class PushToTalkVAD extends VoiceActivityDetector {
    private _settings: PPTKeySettings;
    private _key_hook: ppt.KeyHook;
    private _timeout: NodeJS.Timer;
    private _pushed: boolean;
    constructor(settings: PPTKeySettings);
    private initialize_hook();
    initialise();
    finalize();
    // @ts-ignore
    set pushed(flag: boolean);
    // @ts-ignore
    set settings(settings: PPTKeySettings);
    shouldRecord(buffer: AudioBuffer): boolean;
}
