export enum ErrorCode {
    OK = 0x0,
    UNDEFINED = 0x1,
    NOT_IMPLEMENTED = 0x2,
    LIB_TIME_LIMIT_REACHED = 0x5,

    COMMAND_NOT_FOUND = 0x100,
    UNABLE_TO_BIND_NETWORK_PORT = 0x101,
    NO_NETWORK_PORT_AVAILABLE = 0x102,

    /* mainly used by the teaclient */
    COMMAND_TIMED_OUT = 0x110,
    COMMAND_ABORTED_CONNECTION_CLOSED = 0x111,

    CLIENT_INVALID_ID = 0x200,
    CLIENT_NICKNAME_INUSE = 0x201,
    INVALID_ERROR_CODE = 0x202,

    CLIENT_PROTOCOL_LIMIT_REACHED = 0x203,
    CLIENT_INVALID_TYPE = 0x204,
    CLIENT_ALREADY_SUBSCRIBED = 0x205,
    CLIENT_NOT_LOGGED_IN = 0x206,
    CLIENT_COULD_NOT_VALIDATE_IDENTITY = 0x207,
    CLIENT_INVALID_PASSWORD = 0x208,
    CLIENT_TOO_MANY_CLONES_CONNECTED = 0x209,
    CLIENT_VERSION_OUTDATED = 0x20A,
    CLIENT_IS_ONLINE = 0x20B,
    CLIENT_IS_FLOODING = 0x20C,
    CLIENT_HACKED = 0x20D,
    CLIENT_CANNOT_VERIFY_NOW = 0x20E,
    CLIENT_LOGIN_NOT_PERMITTED = 0x20F,
    CLIENT_NOT_SUBSCRIBED = 0x210,
    CLIENT_UNKNOWN = 0x0211,
    CLIENT_JOIN_RATE_LIMIT_REACHED = 0x0212,
    CLIENT_IS_ALREADY_MEMBER_OF_GROUP = 0x0213,
    CLIENT_IS_NOT_MEMBER_OF_GROUP = 0x0214,
    CLIENT_TYPE_IS_NOT_ALLOWED = 0x0215,

    CHANNEL_INVALID_ID = 0x300,
    CHANNEL_PROTOCOL_LIMIT_REACHED = 0x301,
    CHANNEL_ALREADY_IN = 0x302,
    CHANNEL_NAME_INUSE = 0x303,
    CHANNEL_NOT_EMPTY = 0x304,
    CHANNEL_CAN_NOT_DELETE_DEFAULT = 0x305,
    CHANNEL_DEFAULT_REQUIRE_PERMANENT = 0x306,
    CHANNEL_INVALID_FLAGS = 0x307,
    CHANNEL_PARENT_NOT_PERMANENT = 0x308,
    CHANNEL_MAXCLIENTS_REACHED = 0x309,
    CHANNEL_MAXFAMILY_REACHED = 0x30A,
    CHANNEL_INVALID_ORDER = 0x30B,
    CHANNEL_NO_FILETRANSFER_SUPPORTED = 0x30C,
    CHANNEL_INVALID_PASSWORD = 0x30D,
    CHANNEL_IS_PRIVATE_CHANNEL = 0x30E,
    CHANNEL_INVALID_SECURITY_HASH = 0x30F,
    CHANNEL_IS_DELETED = 0x310,
    CHANNEL_NAME_INVALID = 0x311,
    CHANNEL_LIMIT_REACHED = 0x312,

    SERVER_INVALID_ID = 0x400,
    SERVER_RUNNING = 0x401,
    SERVER_IS_SHUTTING_DOWN = 0x402,
    SERVER_MAXCLIENTS_REACHED = 0x403,
    SERVER_INVALID_PASSWORD = 0x404,
    SERVER_DEPLOYMENT_ACTIVE = 0x405,
    SERVER_UNABLE_TO_STOP_OWN_SERVER = 0x406,
    SERVER_IS_VIRTUAL = 0x407,
    SERVER_WRONG_MACHINEID = 0x408,
    SERVER_IS_NOT_RUNNING = 0x409,
    SERVER_IS_BOOTING = 0x40A,
    SERVER_STATUS_INVALID = 0x40B,
    SERVER_MODAL_QUIT = 0x40C,
    SERVER_VERSION_OUTDATED = 0x40D,
    SERVER_ALREADY_JOINED = 0x40D,
    SERVER_IS_NOT_SHUTTING_DOWN = 0x40E,
    SERVER_MAX_VS_REACHED = 0x40F,
    SERVER_UNBOUND = 0x410,
    SERVER_JOIN_RATE_LIMIT_REACHED = 0x411,

    SQL = 0x500,
    DATABASE_EMPTY_RESULT = 0x501,
    DATABASE_DUPLICATE_ENTRY = 0x502,
    DATABASE_NO_MODIFICATIONS = 0x503,
    DATABASE_CONSTRAINT = 0x504,
    DATABASE_REINVOKE = 0x505,

    PARAMETER_QUOTE = 0x600,
    PARAMETER_INVALID_COUNT = 0x601,
    PARAMETER_INVALID = 0x602,
    PARAMETER_NOT_FOUND = 0x603,
    PARAMETER_CONVERT = 0x604,
    PARAMETER_INVALID_SIZE = 0x605,
    PARAMETER_MISSING = 0x606,
    PARAMETER_CHECKSUM = 0x607,
    PARAMETER_CONSTRAINT_VIOLATION = 0x6010,

    VS_CRITICAL = 0x700,
    CONNECTION_LOST = 0x701,
    NOT_CONNECTED = 0x702,
    NO_CACHED_CONNECTION_INFO = 0x703,
    CURRENTLY_NOT_POSSIBLE = 0x704,
    FAILED_CONNECTION_INITIALISATION = 0x705,
    COULD_NOT_RESOLVE_HOSTNAME = 0x706,
    INVALID_SERVER_CONNECTION_HANDLER_ID = 0x707,
    COULD_NOT_INITIALISE_INPUT_CLIENT = 0x708,
    CLIENTLIBRARY_NOT_INITIALISED = 0x709,
    SERVERLIBRARY_NOT_INITIALISED = 0x70A,
    WHISPER_TOO_MANY_TARGETS = 0x70B,
    WHISPER_NO_TARGETS = 0x70C,

    FILE_INVALID_NAME = 0x800,
    FILE_INVALID_PERMISSIONS = 0x801,
    FILE_ALREADY_EXISTS = 0x802,
    FILE_NOT_FOUND = 0x803,
    FILE_IO_ERROR = 0x804,
    FILE_INVALID_TRANSFER_ID = 0x805,
    FILE_INVALID_PATH = 0x806,
    FILE_NO_FILES_AVAILABLE = 0x807,
    FILE_OVERWRITE_EXCLUDES_RESUME = 0x808,
    FILE_INVALID_SIZE = 0x809,
    FILE_ALREADY_IN_USE = 0x80A,
    FILE_COULD_NOT_OPEN_CONNECTION = 0x80B,
    FILE_NO_SPACE_LEFT_ON_DEVICE = 0x80C,
    FILE_EXCEEDS_FILE_SYSTEM_MAXIMUM_SIZE = 0x80D,
    FILE_TRANSFER_CONNECTION_TIMEOUT = 0x80E,
    FILE_CONNECTION_LOST = 0x80F,
    FILE_EXCEEDS_SUPPLIED_SIZE = 0x810,
    FILE_TRANSFER_COMPLETE = 0x811,
    FILE_TRANSFER_CANCELED = 0x812,
    FILE_TRANSFER_INTERRUPTED = 0x813,
    FILE_TRANSFER_SERVER_QUOTA_EXCEEDED = 0x814,
    FILE_TRANSFER_CLIENT_QUOTA_EXCEEDED = 0x815,
    FILE_TRANSFER_RESET = 0x816,
    FILE_TRANSFER_LIMIT_REACHED = 0x817,

    FILE_API_TIMEOUT = 0x820,
    FILE_VIRTUAL_SERVER_NOT_REGISTERED = 0x821,
    FILE_SERVER_TRANSFER_LIMIT_REACHED = 0x822,
    FILE_CLIENT_TRANSFER_LIMIT_REACHED = 0x823,

    SERVER_INSUFFICIENT_PERMISSIONS = 0xA08,
    ACCOUNTING_SLOT_LIMIT_REACHED = 0xB01,
    SERVER_CONNECT_BANNED = 0xD01,
    BAN_FLOODING = 0xD03,
    TOKEN_INVALID_ID = 0xF00,
    TOKEN_EXPIRED = 0xf10,
    TOKEN_USE_LIMIT_EXCEEDED = 0xf11,
    WEB_HANDSHAKE_INVALID = 0x1000,
    WEB_HANDSHAKE_UNSUPPORTED = 0x1001,
    WEB_HANDSHAKE_IDENTITY_UNSUPPORTED = 0x1002,
    WEB_HANDSHAKE_IDENTITY_PROOF_FAILED = 0x1003,
    WEB_HANDSHAKE_IDENTITY_OUTDATED = 0x1004,

    MUSIC_INVALID_ID = 0x1100,
    MUSIC_LIMIT_REACHED = 0x1101,
    MUSIC_CLIENT_LIMIT_REACHED = 0x1102,
    MUSIC_INVALID_PLAYER_STATE = 0x1103,
    MUSIC_INVALID_ACTION = 0x1104,
    MUSIC_NO_PLAYER = 0x1105,
    MUSIC_DISABLED = 0x1105,
    PLAYLIST_INVALID_ID = 0x2100,
    PLAYLIST_INVALID_SONG_ID = 0x2101,
    PLAYLIST_ALREADY_IN_USE = 0x2102,
    PLAYLIST_IS_IN_USE = 0x2103,
    QUERY_NOT_EXISTS = 0x1200,
    QUERY_ALREADY_EXISTS = 0x1201,

    GROUP_INVALID_ID = 0x1300,
    GROUP_NAME_INUSE = 0x1301,
    GROUP_NOT_ASSIGNED_OVER_THIS_SERVER = 0x1302,

    CONVERSATION_INVALID_ID = 0x2200,
    CONVERSATION_MORE_DATA = 0x2201,
    CONVERSATION_IS_PRIVATE = 0x2202,

    CUSTOM_ERROR = 0xFFFF,

    /** @deprecated Use SERVER_INSUFFICIENT_PERMISSIONS */
    PERMISSION_ERROR = ErrorCode.SERVER_INSUFFICIENT_PERMISSIONS,
    /** @deprecated Use DATABASE_EMPTY_RESULT */
    EMPTY_RESULT = ErrorCode.DATABASE_EMPTY_RESULT
}