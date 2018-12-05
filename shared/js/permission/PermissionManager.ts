/// <reference path="../client.ts" />

enum PermissionType {
    B_SERVERINSTANCE_HELP_VIEW = "b_serverinstance_help_view",
    B_SERVERINSTANCE_VERSION_VIEW = "b_serverinstance_version_view",
    B_SERVERINSTANCE_INFO_VIEW = "b_serverinstance_info_view",
    B_SERVERINSTANCE_VIRTUALSERVER_LIST = "b_serverinstance_virtualserver_list",
    B_SERVERINSTANCE_BINDING_LIST = "b_serverinstance_binding_list",
    B_SERVERINSTANCE_PERMISSION_LIST = "b_serverinstance_permission_list",
    B_SERVERINSTANCE_PERMISSION_FIND = "b_serverinstance_permission_find",
    B_VIRTUALSERVER_CREATE = "b_virtualserver_create",
    B_VIRTUALSERVER_DELETE = "b_virtualserver_delete",
    B_VIRTUALSERVER_START_ANY = "b_virtualserver_start_any",
    B_VIRTUALSERVER_STOP_ANY = "b_virtualserver_stop_any",
    B_VIRTUALSERVER_CHANGE_MACHINE_ID = "b_virtualserver_change_machine_id",
    B_VIRTUALSERVER_CHANGE_TEMPLATE = "b_virtualserver_change_template",
    B_SERVERQUERY_LOGIN = "b_serverquery_login",
    B_SERVERINSTANCE_TEXTMESSAGE_SEND = "b_serverinstance_textmessage_send",
    B_SERVERINSTANCE_LOG_VIEW = "b_serverinstance_log_view",
    B_SERVERINSTANCE_LOG_ADD = "b_serverinstance_log_add",
    B_SERVERINSTANCE_STOP = "b_serverinstance_stop",
    B_SERVERINSTANCE_MODIFY_SETTINGS = "b_serverinstance_modify_settings",
    B_SERVERINSTANCE_MODIFY_QUERYGROUP = "b_serverinstance_modify_querygroup",
    B_SERVERINSTANCE_MODIFY_TEMPLATES = "b_serverinstance_modify_templates",
    B_VIRTUALSERVER_SELECT = "b_virtualserver_select",
    B_VIRTUALSERVER_INFO_VIEW = "b_virtualserver_info_view",
    B_VIRTUALSERVER_CONNECTIONINFO_VIEW = "b_virtualserver_connectioninfo_view",
    B_VIRTUALSERVER_CHANNEL_LIST = "b_virtualserver_channel_list",
    B_VIRTUALSERVER_CHANNEL_SEARCH = "b_virtualserver_channel_search",
    B_VIRTUALSERVER_CLIENT_LIST = "b_virtualserver_client_list",
    B_VIRTUALSERVER_CLIENT_SEARCH = "b_virtualserver_client_search",
    B_VIRTUALSERVER_CLIENT_DBLIST = "b_virtualserver_client_dblist",
    B_VIRTUALSERVER_CLIENT_DBSEARCH = "b_virtualserver_client_dbsearch",
    B_VIRTUALSERVER_CLIENT_DBINFO = "b_virtualserver_client_dbinfo",
    B_VIRTUALSERVER_PERMISSION_FIND = "b_virtualserver_permission_find",
    B_VIRTUALSERVER_CUSTOM_SEARCH = "b_virtualserver_custom_search",
    B_VIRTUALSERVER_START = "b_virtualserver_start",
    B_VIRTUALSERVER_STOP = "b_virtualserver_stop",
    B_VIRTUALSERVER_TOKEN_LIST = "b_virtualserver_token_list",
    B_VIRTUALSERVER_TOKEN_ADD = "b_virtualserver_token_add",
    B_VIRTUALSERVER_TOKEN_USE = "b_virtualserver_token_use",
    B_VIRTUALSERVER_TOKEN_DELETE = "b_virtualserver_token_delete",
    B_VIRTUALSERVER_LOG_VIEW = "b_virtualserver_log_view",
    B_VIRTUALSERVER_LOG_ADD = "b_virtualserver_log_add",
    B_VIRTUALSERVER_JOIN_IGNORE_PASSWORD = "b_virtualserver_join_ignore_password",
    B_VIRTUALSERVER_NOTIFY_REGISTER = "b_virtualserver_notify_register",
    B_VIRTUALSERVER_NOTIFY_UNREGISTER = "b_virtualserver_notify_unregister",
    B_VIRTUALSERVER_SNAPSHOT_CREATE = "b_virtualserver_snapshot_create",
    B_VIRTUALSERVER_SNAPSHOT_DEPLOY = "b_virtualserver_snapshot_deploy",
    B_VIRTUALSERVER_PERMISSION_RESET = "b_virtualserver_permission_reset",
    B_VIRTUALSERVER_MODIFY_NAME = "b_virtualserver_modify_name",
    B_VIRTUALSERVER_MODIFY_WELCOMEMESSAGE = "b_virtualserver_modify_welcomemessage",
    B_VIRTUALSERVER_MODIFY_MAXCLIENTS = "b_virtualserver_modify_maxclients",
    B_VIRTUALSERVER_MODIFY_RESERVED_SLOTS = "b_virtualserver_modify_reserved_slots",
    B_VIRTUALSERVER_MODIFY_PASSWORD = "b_virtualserver_modify_password",
    B_VIRTUALSERVER_MODIFY_DEFAULT_SERVERGROUP = "b_virtualserver_modify_default_servergroup",
    B_VIRTUALSERVER_MODIFY_DEFAULT_CHANNELGROUP = "b_virtualserver_modify_default_channelgroup",
    B_VIRTUALSERVER_MODIFY_DEFAULT_CHANNELADMINGROUP = "b_virtualserver_modify_default_channeladmingroup",
    B_VIRTUALSERVER_MODIFY_CHANNEL_FORCED_SILENCE = "b_virtualserver_modify_channel_forced_silence",
    B_VIRTUALSERVER_MODIFY_COMPLAIN = "b_virtualserver_modify_complain",
    B_VIRTUALSERVER_MODIFY_ANTIFLOOD = "b_virtualserver_modify_antiflood",
    B_VIRTUALSERVER_MODIFY_FT_SETTINGS = "b_virtualserver_modify_ft_settings",
    B_VIRTUALSERVER_MODIFY_FT_QUOTAS = "b_virtualserver_modify_ft_quotas",
    B_VIRTUALSERVER_MODIFY_HOSTMESSAGE = "b_virtualserver_modify_hostmessage",
    B_VIRTUALSERVER_MODIFY_HOSTBANNER = "b_virtualserver_modify_hostbanner",
    B_VIRTUALSERVER_MODIFY_HOSTBUTTON = "b_virtualserver_modify_hostbutton",
    B_VIRTUALSERVER_MODIFY_PORT = "b_virtualserver_modify_port",
    B_VIRTUALSERVER_MODIFY_HOST = "b_virtualserver_modify_host",
    B_VIRTUALSERVER_MODIFY_AUTOSTART = "b_virtualserver_modify_autostart",
    B_VIRTUALSERVER_MODIFY_NEEDED_IDENTITY_SECURITY_LEVEL = "b_virtualserver_modify_needed_identity_security_level",
    B_VIRTUALSERVER_MODIFY_PRIORITY_SPEAKER_DIMM_MODIFICATOR = "b_virtualserver_modify_priority_speaker_dimm_modificator",
    B_VIRTUALSERVER_MODIFY_LOG_SETTINGS = "b_virtualserver_modify_log_settings",
    B_VIRTUALSERVER_MODIFY_MIN_CLIENT_VERSION = "b_virtualserver_modify_min_client_version",
    B_VIRTUALSERVER_MODIFY_ICON_ID = "b_virtualserver_modify_icon_id",
    B_VIRTUALSERVER_MODIFY_WEBLIST = "b_virtualserver_modify_weblist",
    B_VIRTUALSERVER_MODIFY_CODEC_ENCRYPTION_MODE = "b_virtualserver_modify_codec_encryption_mode",
    B_VIRTUALSERVER_MODIFY_TEMPORARY_PASSWORDS = "b_virtualserver_modify_temporary_passwords",
    B_VIRTUALSERVER_MODIFY_TEMPORARY_PASSWORDS_OWN = "b_virtualserver_modify_temporary_passwords_own",
    B_VIRTUALSERVER_MODIFY_CHANNEL_TEMP_DELETE_DELAY_DEFAULT = "b_virtualserver_modify_channel_temp_delete_delay_default",
    B_VIRTUALSERVER_MODIFY_MUSIC_BOT_LIMIT = "b_virtualserver_modify_music_bot_limit",
    B_VIRTUALSERVER_MODIFY_DEFAULT_MESSAGES = "b_virtualserver_modify_music_bot_limit",
    I_CHANNEL_MIN_DEPTH = "i_channel_min_depth",
    I_CHANNEL_MAX_DEPTH = "i_channel_max_depth",
    B_CHANNEL_GROUP_INHERITANCE_END = "b_channel_group_inheritance_end",
    I_CHANNEL_PERMISSION_MODIFY_POWER = "i_channel_permission_modify_power",
    I_CHANNEL_NEEDED_PERMISSION_MODIFY_POWER = "i_channel_needed_permission_modify_power",
    B_CHANNEL_INFO_VIEW = "b_channel_info_view",
    B_CHANNEL_CREATE_CHILD = "b_channel_create_child",
    B_CHANNEL_CREATE_PERMANENT = "b_channel_create_permanent",
    B_CHANNEL_CREATE_SEMI_PERMANENT = "b_channel_create_semi_permanent",
    B_CHANNEL_CREATE_TEMPORARY = "b_channel_create_temporary",
    B_CHANNEL_CREATE_PRIVATE = "b_channel_create_private",
    B_CHANNEL_CREATE_WITH_TOPIC = "b_channel_create_with_topic",
    B_CHANNEL_CREATE_WITH_DESCRIPTION = "b_channel_create_with_description",
    B_CHANNEL_CREATE_WITH_PASSWORD = "b_channel_create_with_password",
    B_CHANNEL_CREATE_MODIFY_WITH_CODEC_SPEEX8 = "b_channel_create_modify_with_codec_speex8",
    B_CHANNEL_CREATE_MODIFY_WITH_CODEC_SPEEX16 = "b_channel_create_modify_with_codec_speex16",
    B_CHANNEL_CREATE_MODIFY_WITH_CODEC_SPEEX32 = "b_channel_create_modify_with_codec_speex32",
    B_CHANNEL_CREATE_MODIFY_WITH_CODEC_CELTMONO48 = "b_channel_create_modify_with_codec_celtmono48",
    B_CHANNEL_CREATE_MODIFY_WITH_CODEC_OPUSVOICE = "b_channel_create_modify_with_codec_opusvoice",
    B_CHANNEL_CREATE_MODIFY_WITH_CODEC_OPUSMUSIC = "b_channel_create_modify_with_codec_opusmusic",
    I_CHANNEL_CREATE_MODIFY_WITH_CODEC_MAXQUALITY = "i_channel_create_modify_with_codec_maxquality",
    I_CHANNEL_CREATE_MODIFY_WITH_CODEC_LATENCY_FACTOR_MIN = "i_channel_create_modify_with_codec_latency_factor_min",
    B_CHANNEL_CREATE_WITH_MAXCLIENTS = "b_channel_create_with_maxclients",
    B_CHANNEL_CREATE_WITH_MAXFAMILYCLIENTS = "b_channel_create_with_maxfamilyclients",
    B_CHANNEL_CREATE_WITH_SORTORDER = "b_channel_create_with_sortorder",
    B_CHANNEL_CREATE_WITH_DEFAULT = "b_channel_create_with_default",
    B_CHANNEL_CREATE_WITH_NEEDED_TALK_POWER = "b_channel_create_with_needed_talk_power",
    B_CHANNEL_CREATE_MODIFY_WITH_FORCE_PASSWORD = "b_channel_create_modify_with_force_password",
    I_CHANNEL_CREATE_MODIFY_WITH_TEMP_DELETE_DELAY = "i_channel_create_modify_with_temp_delete_delay",
    B_CHANNEL_MODIFY_PARENT = "b_channel_modify_parent",
    B_CHANNEL_MODIFY_MAKE_DEFAULT = "b_channel_modify_make_default",
    B_CHANNEL_MODIFY_MAKE_PERMANENT = "b_channel_modify_make_permanent",
    B_CHANNEL_MODIFY_MAKE_SEMI_PERMANENT = "b_channel_modify_make_semi_permanent",
    B_CHANNEL_MODIFY_MAKE_TEMPORARY = "b_channel_modify_make_temporary",
    B_CHANNEL_MODIFY_NAME = "b_channel_modify_name",
    B_CHANNEL_MODIFY_TOPIC = "b_channel_modify_topic",
    B_CHANNEL_MODIFY_DESCRIPTION = "b_channel_modify_description",
    B_CHANNEL_MODIFY_PASSWORD = "b_channel_modify_password",
    B_CHANNEL_MODIFY_CODEC = "b_channel_modify_codec",
    B_CHANNEL_MODIFY_CODEC_QUALITY = "b_channel_modify_codec_quality",
    B_CHANNEL_MODIFY_CODEC_LATENCY_FACTOR = "b_channel_modify_codec_latency_factor",
    B_CHANNEL_MODIFY_MAXCLIENTS = "b_channel_modify_maxclients",
    B_CHANNEL_MODIFY_MAXFAMILYCLIENTS = "b_channel_modify_maxfamilyclients",
    B_CHANNEL_MODIFY_SORTORDER = "b_channel_modify_sortorder",
    B_CHANNEL_MODIFY_NEEDED_TALK_POWER = "b_channel_modify_needed_talk_power",
    I_CHANNEL_MODIFY_POWER = "i_channel_modify_power",
    I_CHANNEL_NEEDED_MODIFY_POWER = "i_channel_needed_modify_power",
    B_CHANNEL_MODIFY_MAKE_CODEC_ENCRYPTED = "b_channel_modify_make_codec_encrypted",
    B_CHANNEL_MODIFY_TEMP_DELETE_DELAY = "b_channel_modify_temp_delete_delay",
    B_CHANNEL_DELETE_PERMANENT = "b_channel_delete_permanent",
    B_CHANNEL_DELETE_SEMI_PERMANENT = "b_channel_delete_semi_permanent",
    B_CHANNEL_DELETE_TEMPORARY = "b_channel_delete_temporary",
    B_CHANNEL_DELETE_FLAG_FORCE = "b_channel_delete_flag_force",
    I_CHANNEL_DELETE_POWER = "i_channel_delete_power",
    I_CHANNEL_NEEDED_DELETE_POWER = "i_channel_needed_delete_power",
    B_CHANNEL_JOIN_PERMANENT = "b_channel_join_permanent",
    B_CHANNEL_JOIN_SEMI_PERMANENT = "b_channel_join_semi_permanent",
    B_CHANNEL_JOIN_TEMPORARY = "b_channel_join_temporary",
    B_CHANNEL_JOIN_IGNORE_PASSWORD = "b_channel_join_ignore_password",
    B_CHANNEL_JOIN_IGNORE_MAXCLIENTS = "b_channel_join_ignore_maxclients",
    I_CHANNEL_JOIN_POWER = "i_channel_join_power",
    I_CHANNEL_NEEDED_JOIN_POWER = "i_channel_needed_join_power",
    I_CHANNEL_SUBSCRIBE_POWER = "i_channel_subscribe_power",
    I_CHANNEL_NEEDED_SUBSCRIBE_POWER = "i_channel_needed_subscribe_power",
    I_CHANNEL_DESCRIPTION_VIEW_POWER = "i_channel_description_view_power",
    I_CHANNEL_NEEDED_DESCRIPTION_VIEW_POWER = "i_channel_needed_description_view_power",
    I_ICON_ID = "i_icon_id",
    I_MAX_ICON_FILESIZE = "i_max_icon_filesize",
    B_ICON_MANAGE = "b_icon_manage",
    B_GROUP_IS_PERMANENT = "b_group_is_permanent",
    I_GROUP_AUTO_UPDATE_TYPE = "i_group_auto_update_type",
    I_GROUP_AUTO_UPDATE_MAX_VALUE = "i_group_auto_update_max_value",
    I_GROUP_SORT_ID = "i_group_sort_id",
    I_GROUP_SHOW_NAME_IN_TREE = "i_group_show_name_in_tree",
    B_VIRTUALSERVER_SERVERGROUP_LIST = "b_virtualserver_servergroup_list",
    B_VIRTUALSERVER_SERVERGROUP_PERMISSION_LIST = "b_virtualserver_servergroup_permission_list",
    B_VIRTUALSERVER_SERVERGROUP_CLIENT_LIST = "b_virtualserver_servergroup_client_list",
    B_VIRTUALSERVER_CHANNELGROUP_LIST = "b_virtualserver_channelgroup_list",
    B_VIRTUALSERVER_CHANNELGROUP_PERMISSION_LIST = "b_virtualserver_channelgroup_permission_list",
    B_VIRTUALSERVER_CHANNELGROUP_CLIENT_LIST = "b_virtualserver_channelgroup_client_list",
    B_VIRTUALSERVER_CLIENT_PERMISSION_LIST = "b_virtualserver_client_permission_list",
    B_VIRTUALSERVER_CHANNEL_PERMISSION_LIST = "b_virtualserver_channel_permission_list",
    B_VIRTUALSERVER_CHANNELCLIENT_PERMISSION_LIST = "b_virtualserver_channelclient_permission_list",
    B_VIRTUALSERVER_SERVERGROUP_CREATE = "b_virtualserver_servergroup_create",
    B_VIRTUALSERVER_CHANNELGROUP_CREATE = "b_virtualserver_channelgroup_create",
    I_SERVER_GROUP_MODIFY_POWER = "i_server_group_modify_power",
    I_SERVER_GROUP_NEEDED_MODIFY_POWER = "i_server_group_needed_modify_power",
    I_SERVER_GROUP_MEMBER_ADD_POWER = "i_server_group_member_add_power",
    I_SERVER_GROUP_NEEDED_MEMBER_ADD_POWER = "i_server_group_needed_member_add_power",
    I_SERVER_GROUP_MEMBER_REMOVE_POWER = "i_server_group_member_remove_power",
    I_SERVER_GROUP_NEEDED_MEMBER_REMOVE_POWER = "i_server_group_needed_member_remove_power",
    I_CHANNEL_GROUP_MODIFY_POWER = "i_channel_group_modify_power",
    I_CHANNEL_GROUP_NEEDED_MODIFY_POWER = "i_channel_group_needed_modify_power",
    I_CHANNEL_GROUP_MEMBER_ADD_POWER = "i_channel_group_member_add_power",
    I_CHANNEL_GROUP_NEEDED_MEMBER_ADD_POWER = "i_channel_group_needed_member_add_power",
    I_CHANNEL_GROUP_MEMBER_REMOVE_POWER = "i_channel_group_member_remove_power",
    I_CHANNEL_GROUP_NEEDED_MEMBER_REMOVE_POWER = "i_channel_group_needed_member_remove_power",
    I_GROUP_MEMBER_ADD_POWER = "i_group_member_add_power",
    I_GROUP_NEEDED_MEMBER_ADD_POWER = "i_group_needed_member_add_power",
    I_GROUP_MEMBER_REMOVE_POWER = "i_group_member_remove_power",
    I_GROUP_NEEDED_MEMBER_REMOVE_POWER = "i_group_needed_member_remove_power",
    I_GROUP_MODIFY_POWER = "i_group_modify_power",
    I_GROUP_NEEDED_MODIFY_POWER = "i_group_needed_modify_power",
    I_DISPLAYED_GROUP_MEMBER_ADD_POWER = "i_displayed_group_member_add_power",
    I_DISPLAYED_GROUP_NEEDED_MEMBER_ADD_POWER = "i_displayed_group_needed_member_add_power",
    I_DISPLAYED_GROUP_MEMBER_REMOVE_POWER = "i_displayed_group_member_remove_power",
    I_DISPLAYED_GROUP_NEEDED_MEMBER_REMOVE_POWER = "i_displayed_group_needed_member_remove_power",
    I_DISPLAYED_GROUP_MODIFY_POWER = "i_displayed_group_modify_power",
    I_DISPLAYED_GROUP_NEEDED_MODIFY_POWER = "i_displayed_group_needed_modify_power",
    I_PERMISSION_MODIFY_POWER = "i_permission_modify_power",
    B_PERMISSION_MODIFY_POWER_IGNORE = "b_permission_modify_power_ignore",
    B_VIRTUALSERVER_SERVERGROUP_DELETE = "b_virtualserver_servergroup_delete",
    B_VIRTUALSERVER_CHANNELGROUP_DELETE = "b_virtualserver_channelgroup_delete",
    I_CLIENT_PERMISSION_MODIFY_POWER = "i_client_permission_modify_power",
    I_CLIENT_NEEDED_PERMISSION_MODIFY_POWER = "i_client_needed_permission_modify_power",
    I_CLIENT_MAX_CLONES_UID = "i_client_max_clones_uid",
    I_CLIENT_MAX_IDLETIME = "i_client_max_idletime",
    I_CLIENT_MAX_AVATAR_FILESIZE = "i_client_max_avatar_filesize",
    I_CLIENT_MAX_CHANNEL_SUBSCRIPTIONS = "i_client_max_channel_subscriptions",
    B_CLIENT_IS_PRIORITY_SPEAKER = "b_client_is_priority_speaker",
    B_CLIENT_SKIP_CHANNELGROUP_PERMISSIONS = "b_client_skip_channelgroup_permissions",
    B_CLIENT_FORCE_PUSH_TO_TALK = "b_client_force_push_to_talk",
    B_CLIENT_IGNORE_BANS = "b_client_ignore_bans",
    B_CLIENT_IGNORE_ANTIFLOOD = "b_client_ignore_antiflood",
    B_CLIENT_ISSUE_CLIENT_QUERY_COMMAND = "b_client_issue_client_query_command",
    B_CLIENT_USE_RESERVED_SLOT = "b_client_use_reserved_slot",
    B_CLIENT_USE_CHANNEL_COMMANDER = "b_client_use_channel_commander",
    B_CLIENT_REQUEST_TALKER = "b_client_request_talker",
    B_CLIENT_AVATAR_DELETE_OTHER = "b_client_avatar_delete_other",
    B_CLIENT_IS_STICKY = "b_client_is_sticky",
    B_CLIENT_IGNORE_STICKY = "b_client_ignore_sticky",
    B_CLIENT_MUSIC_CHANNEL_LIST = "b_client_music_channel_list",
    B_CLIENT_MUSIC_SERVER_LIST = "b_client_music_server_list",
    I_CLIENT_MUSIC_INFO = "i_client_music_info",
    I_CLIENT_MUSIC_NEEDED_INFO = "i_client_music_needed_info",
    B_CLIENT_INFO_VIEW = "b_client_info_view",
    B_CLIENT_PERMISSIONOVERVIEW_VIEW = "b_client_permissionoverview_view",
    B_CLIENT_PERMISSIONOVERVIEW_OWN = "b_client_permissionoverview_own",
    B_CLIENT_REMOTEADDRESS_VIEW = "b_client_remoteaddress_view",
    I_CLIENT_SERVERQUERY_VIEW_POWER = "i_client_serverquery_view_power",
    I_CLIENT_NEEDED_SERVERQUERY_VIEW_POWER = "i_client_needed_serverquery_view_power",
    B_CLIENT_CUSTOM_INFO_VIEW = "b_client_custom_info_view",
    I_CLIENT_KICK_FROM_SERVER_POWER = "i_client_kick_from_server_power",
    I_CLIENT_NEEDED_KICK_FROM_SERVER_POWER = "i_client_needed_kick_from_server_power",
    I_CLIENT_KICK_FROM_CHANNEL_POWER = "i_client_kick_from_channel_power",
    I_CLIENT_NEEDED_KICK_FROM_CHANNEL_POWER = "i_client_needed_kick_from_channel_power",
    I_CLIENT_BAN_POWER = "i_client_ban_power",
    I_CLIENT_NEEDED_BAN_POWER = "i_client_needed_ban_power",
    I_CLIENT_MOVE_POWER = "i_client_move_power",
    I_CLIENT_NEEDED_MOVE_POWER = "i_client_needed_move_power",
    I_CLIENT_COMPLAIN_POWER = "i_client_complain_power",
    I_CLIENT_NEEDED_COMPLAIN_POWER = "i_client_needed_complain_power",
    B_CLIENT_COMPLAIN_LIST = "b_client_complain_list",
    B_CLIENT_COMPLAIN_DELETE_OWN = "b_client_complain_delete_own",
    B_CLIENT_COMPLAIN_DELETE = "b_client_complain_delete",
    B_CLIENT_BAN_LIST = "b_client_ban_list",
    B_CLIENT_BAN_LIST_GLOBAL = "b_client_ban_list_global",
    B_CLIENT_BAN_CREATE = "b_client_ban_create",
    B_CLIENT_BAN_CREATE_GLOBAL = "b_client_ban_create_global",
    B_CLIENT_BAN_EDIT = "b_client_ban_edit",
    B_CLIENT_BAN_EDIT_GLOBAL = "b_client_ban_edit_global",
    B_CLIENT_BAN_DELETE_OWN = "b_client_ban_delete_own",
    B_CLIENT_BAN_DELETE = "b_client_ban_delete",
    B_CLIENT_BAN_DELETE_OWN_GLOBAL = "b_client_ban_delete_own_global",
    B_CLIENT_BAN_DELETE_GLOBAL = "b_client_ban_delete_global",
    I_CLIENT_BAN_MAX_BANTIME = "i_client_ban_max_bantime",
    I_CLIENT_PRIVATE_TEXTMESSAGE_POWER = "i_client_private_textmessage_power",
    I_CLIENT_NEEDED_PRIVATE_TEXTMESSAGE_POWER = "i_client_needed_private_textmessage_power",
    B_CLIENT_SERVER_TEXTMESSAGE_SEND = "b_client_server_textmessage_send",
    B_CLIENT_CHANNEL_TEXTMESSAGE_SEND = "b_client_channel_textmessage_send",
    B_CLIENT_OFFLINE_TEXTMESSAGE_SEND = "b_client_offline_textmessage_send",
    I_CLIENT_TALK_POWER = "i_client_talk_power",
    I_CLIENT_NEEDED_TALK_POWER = "i_client_needed_talk_power",
    I_CLIENT_POKE_POWER = "i_client_poke_power",
    I_CLIENT_NEEDED_POKE_POWER = "i_client_needed_poke_power",
    B_CLIENT_SET_FLAG_TALKER = "b_client_set_flag_talker",
    I_CLIENT_WHISPER_POWER = "i_client_whisper_power",
    I_CLIENT_NEEDED_WHISPER_POWER = "i_client_needed_whisper_power",
    B_CLIENT_MODIFY_DESCRIPTION = "b_client_modify_description",
    B_CLIENT_MODIFY_OWN_DESCRIPTION = "b_client_modify_own_description",
    B_CLIENT_MODIFY_DBPROPERTIES = "b_client_modify_dbproperties",
    B_CLIENT_DELETE_DBPROPERTIES = "b_client_delete_dbproperties",
    B_CLIENT_CREATE_MODIFY_SERVERQUERY_LOGIN = "b_client_create_modify_serverquery_login",
    B_CLIENT_MUSIC_CREATE = "b_client_music_create",
    I_CLIENT_MUSIC_LIMIT = "i_client_music_limit",
    I_CLIENT_MUSIC_DELETE_POWER = "i_client_music_delete_power",
    I_CLIENT_MUSIC_NEEDED_DELETE_POWER = "i_client_music_needed_delete_power",
    I_CLIENT_MUSIC_PLAY_POWER = "i_client_music_play_power",
    I_CLIENT_MUSIC_NEEDED_PLAY_POWER = "i_client_music_needed_play_power",
    I_CLIENT_MUSIC_RENAME_POWER = "i_client_music_rename_power",
    I_CLIENT_MUSIC_NEEDED_RENAME_POWER = "i_client_music_needed_rename_power",
    B_FT_IGNORE_PASSWORD = "b_ft_ignore_password",
    B_FT_TRANSFER_LIST = "b_ft_transfer_list",
    I_FT_FILE_UPLOAD_POWER = "i_ft_file_upload_power",
    I_FT_NEEDED_FILE_UPLOAD_POWER = "i_ft_needed_file_upload_power",
    I_FT_FILE_DOWNLOAD_POWER = "i_ft_file_download_power",
    I_FT_NEEDED_FILE_DOWNLOAD_POWER = "i_ft_needed_file_download_power",
    I_FT_FILE_DELETE_POWER = "i_ft_file_delete_power",
    I_FT_NEEDED_FILE_DELETE_POWER = "i_ft_needed_file_delete_power",
    I_FT_FILE_RENAME_POWER = "i_ft_file_rename_power",
    I_FT_NEEDED_FILE_RENAME_POWER = "i_ft_needed_file_rename_power",
    I_FT_FILE_BROWSE_POWER = "i_ft_file_browse_power",
    I_FT_NEEDED_FILE_BROWSE_POWER = "i_ft_needed_file_browse_power",
    I_FT_DIRECTORY_CREATE_POWER = "i_ft_directory_create_power",
    I_FT_NEEDED_DIRECTORY_CREATE_POWER = "i_ft_needed_directory_create_power",
    I_FT_QUOTA_MB_DOWNLOAD_PER_CLIENT = "i_ft_quota_mb_download_per_client",
    I_FT_QUOTA_MB_UPLOAD_PER_CLIENT = "i_ft_quota_mb_upload_per_client"
}

class PermissionInfo {
    name: string;
    id: number;
    description: string;
}

class PermissionGroup {
    begin: number;
    end: number;
    deep: number;
    name: string;
}

class GroupedPermissions {
    group: PermissionGroup;
    permissions: PermissionInfo[];
    children: GroupedPermissions[];
    parent: GroupedPermissions;
}

class PermissionValue {
    readonly type: PermissionInfo;
    value: number;
    flag_skip: boolean;
    flag_negate: boolean;
    granted_value: number;

    constructor(type, value) {
        this.type = type;
        this.value = value;
    }

    granted(requiredValue: number, required: boolean = true) : boolean {
        let result;
        result = this.value == -1 || this.value >= requiredValue || (this.value == -2 && requiredValue == -2 && !required);
        log.trace(LogCategory.PERMISSIONS, tr("Test needed required: %o | %i | %o => %o"), this, requiredValue, required, result);
        return result;
    }

    hasValue() : boolean {
        return this.value != -2;
    }
}

class NeededPermissionValue extends PermissionValue {
    changeListener: ((newValue: number) => void)[] = [];

    constructor(type, value) {
        super(type, value);
    }
}

class ChannelPermissionRequest {
    requested: number;
    channel_id: number;
    callback_success: ((_: PermissionValue[]) => any)[] = [];
    callback_error: ((_: any) => any)[] = [];
}

class TeaPermissionRequest {
    client_id?: number;
    channel_id?: number;
    promise: LaterPromise<PermissionValue[]>;
}

class PermissionManager {
    readonly handle: TSClient;

    permissionList: PermissionInfo[] = [];
    permissionGroups: PermissionGroup[] = [];
    neededPermissions: NeededPermissionValue[] = [];

    requests_channel_permissions: ChannelPermissionRequest[] = [];
    requests_client_permissions: TeaPermissionRequest[] = [];
    requests_client_channel_permissions: TeaPermissionRequest[] = [];

    initializedListener: ((initialized: boolean) => void)[] = [];
    private _cacheNeededPermissions: any;

    /* Static info mapping until TeaSpeak implements a detailed info */
    //TODO tr
    static readonly group_mapping: {name: string, deep: number}[] = [
        {name: "Global", deep: 0},
            {name: "Information", deep: 1},
            {name: "Virtual server management", deep: 1},
            {name: "Administration", deep: 1},
            {name: "Settings", deep: 1},
        {name: "Virtual Server", deep: 0},
            {name: "Information", deep: 1},
            {name: "Administration", deep: 1},
            {name: "Settings", deep: 1},
        {name: "Channel", deep: 0},
            {name: "Information", deep: 1},
            {name: "Create", deep: 1},
            {name: "Modify", deep: 1},
            {name: "Delete", deep: 1},
            {name: "Access", deep: 1},
        {name: "Group", deep: 0},
            {name: "Information", deep: 1},
            {name: "Create", deep: 1},
            {name: "Modify", deep: 1},
            {name: "Delete", deep: 1},
        {name: "Client", deep: 0},
            {name: "Information", deep: 1},
            {name: "Admin", deep: 1},
            {name: "Basics", deep: 1},
            {name: "Modify", deep: 1},
        //TODO Music bot
        {name: "File Transfer", deep: 0},
    ];
    private _group_mapping;

    public static parse_permission_bulk(json: any[], manager: PermissionManager) : PermissionValue[] {
        let permissions: PermissionValue[] = [];
        for(let perm of json) {
            let perm_id = parseInt(perm["permid"]);
            let perm_grant = (perm_id & (1 << 15)) > 0;
            if(perm_grant)
                perm_id &= ~(1 << 15);

            let perm_info = manager.resolveInfo(perm_id);
            if(!perm_info) {
                log.warn(LogCategory.PERMISSIONS, tr("Got unknown permission id (%o/%o (%o))!"), perm["permid"], perm_id, perm["permsid"]);
                return;
            }

            let permission: PermissionValue;
            for(let ref_perm of permissions) {
                if(ref_perm.type == perm_info) {
                    permission = ref_perm;
                    break;
                }
            }
            if(!permission) {
                permission = new PermissionValue(perm_info, 0);
                permission.granted_value = undefined;
                permission.value = undefined;
                permissions.push(permission);
            }
            if(perm_grant) {
                permission.granted_value = parseInt(perm["permvalue"]);
            } else {
                permission.value = parseInt(perm["permvalue"]);
                permission.flag_negate = perm["permnegated"] == "1";
                permission.flag_skip = perm["permskip"] == "1";
            }
        }
        return permissions;
    }

    constructor(client: TSClient) {
        this.handle = client;

        this.handle.serverConnection.commandHandler["notifyclientneededpermissions"] = this.onNeededPermissions.bind(this);
        this.handle.serverConnection.commandHandler["notifypermissionlist"] = this.onPermissionList.bind(this);
        this.handle.serverConnection.commandHandler["notifychannelpermlist"] = this.onChannelPermList.bind(this);
        this.handle.serverConnection.commandHandler["notifyclientpermlist"] = this.onClientPermList.bind(this);
    }

    initialized() : boolean {
        return this.permissionList.length > 0;
    }

    public requestPermissionList() {
        this.handle.serverConnection.sendCommand("permissionlist");
    }

    private onPermissionList(json) {
        this.permissionList = [];
        this.permissionGroups = [];
        this._group_mapping = PermissionManager.group_mapping.slice();

        let group = log.group(log.LogType.TRACE, LogCategory.PERMISSIONS, tr("Permission mapping"));
        for(let e of json) {
            if(e["group_id_end"]) {
                let group = new PermissionGroup();
                group.begin = this.permissionGroups.length ? this.permissionGroups.last().end : 0;
                group.end = parseInt(e["group_id_end"]);
                group.deep = 0;
                group.name = tr("Group ") + e["group_id_end"];

                let info = this._group_mapping.pop_front();
                if(info) {
                    group.name = info.name;
                    group.deep = info.deep;
                }
                this.permissionGroups.push(group);
            }

            let perm = new PermissionInfo();
            perm.name = e["permname"];
            perm.id = parseInt(e["permid"]);
            perm.description = e["permdesc"];
            group.log(tr("%i <> %s -> %s"), perm.id, perm.name, perm.description);
            this.permissionList.push(perm);
        }
        group.end();

        log.info(LogCategory.PERMISSIONS, tr("Got %i permissions"), this.permissionList.length);
        if(this._cacheNeededPermissions)
            this.onNeededPermissions(this._cacheNeededPermissions);
        for(let listener of this.initializedListener)
            listener(true);
    }

    private onNeededPermissions(json) {
        if(this.permissionList.length == 0) {
            log.warn(LogCategory.PERMISSIONS, tr("Got needed permissions but don't have a permission list!"));
            this._cacheNeededPermissions = json;
            return;
        }
        this._cacheNeededPermissions = undefined;

        let copy = this.neededPermissions.slice();
        let addcount = 0;

        let group = log.group(log.LogType.TRACE, LogCategory.PERMISSIONS, tr("Got %d needed permissions."), json.length);
        for(let e of json) {
            let entry: NeededPermissionValue = undefined;
            for(let p of copy) {
                if(p.type.id == e["permid"]) {
                    entry = p;
                    copy.remove(p);
                    break;
                }
            }
            if(!entry) {
                let info = this.resolveInfo(e["permid"]);
                if(info) {
                    entry = new NeededPermissionValue(info, -2);
                    this.neededPermissions.push(entry);
                } else {
                    log.warn(LogCategory.PERMISSIONS, tr("Could not resolve perm for id %s (%o|%o)"), e["permid"], e, info);
                    continue;
                }
                addcount++;
            }

            if(entry.value == parseInt(e["permvalue"])) continue;
            entry.value = parseInt(e["permvalue"]);

            //TODO tr
            group.log("Update needed permission " + entry.type.name + " to " + entry.value);
            for(let listener of entry.changeListener)
                listener(entry.value);
        }
        group.end();

        //TODO tr
        log.debug(LogCategory.PERMISSIONS, "Dropping " + copy.length + " needed permissions and added " + addcount + " permissions.");
        for(let e of copy) {
            e.value = -2;
            for(let listener of e.changeListener)
                listener(e.value);
        }
    }

    private onChannelPermList(json) {
       let channelId: number = parseInt(json[0]["cid"]);

       let permissions = PermissionManager.parse_permission_bulk(json, this.handle.permissions);
       log.debug(LogCategory.PERMISSIONS, tr("Got channel permissions for channel %o"), channelId);
       for(let element of this.requests_channel_permissions) {
           if(element.channel_id == channelId) {
               for(let l of element.callback_success)
                   l(permissions);
               this.requests_channel_permissions.remove(element);
               return;
           }
       }
        log.debug(LogCategory.PERMISSIONS, tr("Missing channel permission handle for requested channel id %o"), channelId);
    }

    resolveInfo?(key: number | string | PermissionType) : PermissionInfo {
        for(let perm of this.permissionList)
            if(perm.id == key || perm.name == key)
                return perm;
        return undefined;
    }

    requestChannelPermissions(channelId: number) : Promise<PermissionValue[]> {
        return new Promise<PermissionValue[]>((resolve, reject) => {
             let request: ChannelPermissionRequest;
             for(let element of this.requests_channel_permissions)
                 if(element.requested + 1000 < Date.now() && element.channel_id == channelId) {
                    request = element;
                    break;
                 }
             if(!request) {
                 request = new ChannelPermissionRequest();
                 request.requested = Date.now();
                 request.channel_id = channelId;
                 this.handle.serverConnection.sendCommand("channelpermlist", {"cid": channelId});
                 this.requests_channel_permissions.push(request);
             }
             request.callback_error.push(reject);
             request.callback_success.push(resolve);
        });
    }

    requestClientPermissions(client_id: number) : Promise<PermissionValue[]> {
        for(let request of this.requests_client_permissions)
            if(request.client_id == client_id && request.promise.time() + 1000 > Date.now())
                return request.promise;

        let request: TeaPermissionRequest = {} as any;
        request.client_id = client_id;
        request.promise = new LaterPromise<PermissionValue[]>();

        this.handle.serverConnection.sendCommand("clientpermlist", {cldbid: client_id}).catch(error => {
            if(error instanceof CommandResult && error.id == 0x0501)
                request.promise.resolved([]);
            else
                request.promise.rejected(error);
        });

        this.requests_client_permissions.push(request);
        return request.promise;
    }

    requestClientChannelPermissions(client_id: number, channel_id: number) : Promise<PermissionValue[]> {
        for(let request of this.requests_client_channel_permissions)
            if(request.client_id == client_id && request.channel_id == channel_id && request.promise.time() + 1000 > Date.now())
                return request.promise;

        let request: TeaPermissionRequest = {} as any;
        request.client_id = client_id;
        request.channel_id = channel_id;
        request.promise = new LaterPromise<PermissionValue[]>();

        this.handle.serverConnection.sendCommand("channelclientpermlist", {cldbid: client_id, cid: channel_id}).catch(error => {
            if(error instanceof CommandResult && error.id == 0x0501)
                request.promise.resolved([]);
            else
                request.promise.rejected(error);
        });

        this.requests_client_channel_permissions.push(request);
        return request.promise;
    }

    private onClientPermList(json: any[]) {
        let client = parseInt(json[0]["cldbid"]);
        let permissions = PermissionManager.parse_permission_bulk(json, this);
        for(let req of this.requests_client_permissions.slice(0)) {
            if(req.client_id == client) {
                this.requests_client_permissions.remove(req);
                req.promise.resolved(permissions);
            }
        }
    }

    neededPermission(key: number | string | PermissionType | PermissionInfo) : PermissionValue {
        for(let perm of this.neededPermissions)
            if(perm.type.id == key || perm.type.name == key || perm.type == key)
                return perm;
        log.debug(LogCategory.PERMISSIONS, tr("Could not resolve grant permission %o. Creating a new one."), key);
        let info = key instanceof PermissionInfo ? key : this.resolveInfo(key);
        if(!info) {
            log.warn(LogCategory.PERMISSIONS, tr("Requested needed permission with invalid key! (%o)"), key);
            return undefined;
        }
        let result = new NeededPermissionValue(info, -2);
        this.neededPermissions.push(result);
        return result;
    }

    groupedPermissions() : GroupedPermissions[] {
        let result: GroupedPermissions[] = [];
        let current: GroupedPermissions;

        for(let group of this.permissionGroups) {
            if(group.deep == 0) {
                current = new GroupedPermissions();
                current.group = group;
                current.parent = undefined;
                current.children = [];
                current.permissions = [];
                result.push(current);
            } else {
                if(!current) {
                    throw tr("invalid order!");
                } else {
                    while(group.deep <= current.group.deep)
                        current = current.parent;

                    let parent = current;
                    current = new GroupedPermissions();
                    current.group = group;
                    current.parent = parent;
                    current.children = [];
                    current.permissions = [];
                    parent.children.push(current);
                }
            }

            for(let permission of this.permissionList)
                if(permission.id > current.group.begin && permission.id <= current.group.end)
                    current.permissions.push(permission);

        }

        return result;
    }
}