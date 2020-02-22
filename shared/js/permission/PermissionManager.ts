/// <reference path="../ConnectionHandler.ts" />
/// <reference path="../connection/ConnectionBase.ts" />
/// <reference path="../i18n/localize.ts" />

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
    B_VIRTUALSERVER_SELECT_GODMODE = "b_virtualserver_select_godmode",
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
    B_VIRTUALSERVER_MODIFY_DEFAULT_MUSICGROUP = "b_virtualserver_modify_default_musicgroup",
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
    B_VIRTUALSERVER_MODIFY_DEFAULT_MESSAGES = "b_virtualserver_modify_default_messages",
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
    B_VIRTUALSERVER_MODIFY_COUNTRY_CODE = "b_virtualserver_modify_country_code",
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
    I_CHANNEL_CREATE_MODIFY_CONVERSATION_HISTORY_LENGTH = "i_channel_create_modify_conversation_history_length",
    B_CHANNEL_CREATE_MODIFY_CONVERSATION_HISTORY_UNLIMITED = "b_channel_create_modify_conversation_history_unlimited",
    B_CHANNEL_CREATE_MODIFY_CONVERSATION_PRIVATE = "b_channel_create_modify_conversation_private",
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
    B_CHANNEL_CONVERSATION_MESSAGE_DELETE = "b_channel_conversation_message_delete",
    I_CHANNEL_NEEDED_DELETE_POWER = "i_channel_needed_delete_power",
    B_CHANNEL_JOIN_PERMANENT = "b_channel_join_permanent",
    B_CHANNEL_JOIN_SEMI_PERMANENT = "b_channel_join_semi_permanent",
    B_CHANNEL_JOIN_TEMPORARY = "b_channel_join_temporary",
    B_CHANNEL_JOIN_IGNORE_PASSWORD = "b_channel_join_ignore_password",
    B_CHANNEL_JOIN_IGNORE_MAXCLIENTS = "b_channel_join_ignore_maxclients",
    B_CHANNEL_IGNORE_VIEW_POWER = "b_channel_ignore_view_power",
    I_CHANNEL_JOIN_POWER = "i_channel_join_power",
    I_CHANNEL_NEEDED_JOIN_POWER = "i_channel_needed_join_power",
    B_CHANNEL_IGNORE_JOIN_POWER = "b_channel_ignore_join_power",
    B_CHANNEL_IGNORE_DESCRIPTION_VIEW_POWER = "b_channel_ignore_description_view_power",
    I_CHANNEL_VIEW_POWER = "i_channel_view_power",
    I_CHANNEL_NEEDED_VIEW_POWER = "i_channel_needed_view_power",
    I_CHANNEL_SUBSCRIBE_POWER = "i_channel_subscribe_power",
    I_CHANNEL_NEEDED_SUBSCRIBE_POWER = "i_channel_needed_subscribe_power",
    I_CHANNEL_DESCRIPTION_VIEW_POWER = "i_channel_description_view_power",
    I_CHANNEL_NEEDED_DESCRIPTION_VIEW_POWER = "i_channel_needed_description_view_power",
    I_ICON_ID = "i_icon_id",
    I_MAX_ICON_FILESIZE = "i_max_icon_filesize",
    I_MAX_PLAYLIST_SIZE = "i_max_playlist_size",
    I_MAX_PLAYLISTS = "i_max_playlists",
    B_ICON_MANAGE = "b_icon_manage",
    B_GROUP_IS_PERMANENT = "b_group_is_permanent",
    I_GROUP_AUTO_UPDATE_TYPE = "i_group_auto_update_type",
    I_GROUP_AUTO_UPDATE_MAX_VALUE = "i_group_auto_update_max_value",
    I_GROUP_SORT_ID = "i_group_sort_id",
    I_GROUP_SHOW_NAME_IN_TREE = "i_group_show_name_in_tree",
    B_VIRTUALSERVER_SERVERGROUP_CREATE = "b_virtualserver_servergroup_create",
    B_VIRTUALSERVER_SERVERGROUP_LIST = "b_virtualserver_servergroup_list",
    B_VIRTUALSERVER_SERVERGROUP_PERMISSION_LIST = "b_virtualserver_servergroup_permission_list",
    B_VIRTUALSERVER_SERVERGROUP_CLIENT_LIST = "b_virtualserver_servergroup_client_list",
    B_VIRTUALSERVER_CHANNELGROUP_CREATE = "b_virtualserver_channelgroup_create",
    B_VIRTUALSERVER_CHANNELGROUP_LIST = "b_virtualserver_channelgroup_list",
    B_VIRTUALSERVER_CHANNELGROUP_PERMISSION_LIST = "b_virtualserver_channelgroup_permission_list",
    B_VIRTUALSERVER_CHANNELGROUP_CLIENT_LIST = "b_virtualserver_channelgroup_client_list",
    B_VIRTUALSERVER_CLIENT_PERMISSION_LIST = "b_virtualserver_client_permission_list",
    B_VIRTUALSERVER_CHANNEL_PERMISSION_LIST = "b_virtualserver_channel_permission_list",
    B_VIRTUALSERVER_CHANNELCLIENT_PERMISSION_LIST = "b_virtualserver_channelclient_permission_list",
    B_VIRTUALSERVER_PLAYLIST_PERMISSION_LIST = "b_virtualserver_playlist_permission_list",
    I_SERVER_GROUP_MODIFY_POWER = "i_server_group_modify_power",
    I_SERVER_GROUP_NEEDED_MODIFY_POWER = "i_server_group_needed_modify_power",
    I_SERVER_GROUP_MEMBER_ADD_POWER = "i_server_group_member_add_power",
    I_SERVER_GROUP_SELF_ADD_POWER = "i_server_group_self_add_power",
    I_SERVER_GROUP_NEEDED_MEMBER_ADD_POWER = "i_server_group_needed_member_add_power",
    I_SERVER_GROUP_MEMBER_REMOVE_POWER = "i_server_group_member_remove_power",
    I_SERVER_GROUP_SELF_REMOVE_POWER = "i_server_group_self_remove_power",
    I_SERVER_GROUP_NEEDED_MEMBER_REMOVE_POWER = "i_server_group_needed_member_remove_power",
    I_CHANNEL_GROUP_MODIFY_POWER = "i_channel_group_modify_power",
    I_CHANNEL_GROUP_NEEDED_MODIFY_POWER = "i_channel_group_needed_modify_power",
    I_CHANNEL_GROUP_MEMBER_ADD_POWER = "i_channel_group_member_add_power",
    I_CHANNEL_GROUP_SELF_ADD_POWER = "i_channel_group_self_add_power",
    I_CHANNEL_GROUP_NEEDED_MEMBER_ADD_POWER = "i_channel_group_needed_member_add_power",
    I_CHANNEL_GROUP_MEMBER_REMOVE_POWER = "i_channel_group_member_remove_power",
    I_CHANNEL_GROUP_SELF_REMOVE_POWER = "i_channel_group_self_remove_power",
    I_CHANNEL_GROUP_NEEDED_MEMBER_REMOVE_POWER = "i_channel_group_needed_member_remove_power",
    I_GROUP_MEMBER_ADD_POWER = "i_group_member_add_power",
    I_GROUP_NEEDED_MEMBER_ADD_POWER = "i_group_needed_member_add_power",
    I_GROUP_MEMBER_REMOVE_POWER = "i_group_member_remove_power",
    I_GROUP_NEEDED_MEMBER_REMOVE_POWER = "i_group_needed_member_remove_power",
    I_GROUP_MODIFY_POWER = "i_group_modify_power",
    I_GROUP_NEEDED_MODIFY_POWER = "i_group_needed_modify_power",
    I_PERMISSION_MODIFY_POWER = "i_permission_modify_power",
    B_PERMISSION_MODIFY_POWER_IGNORE = "b_permission_modify_power_ignore",
    B_VIRTUALSERVER_SERVERGROUP_DELETE = "b_virtualserver_servergroup_delete",
    B_VIRTUALSERVER_CHANNELGROUP_DELETE = "b_virtualserver_channelgroup_delete",
    I_CLIENT_PERMISSION_MODIFY_POWER = "i_client_permission_modify_power",
    I_CLIENT_NEEDED_PERMISSION_MODIFY_POWER = "i_client_needed_permission_modify_power",
    I_CLIENT_MAX_CLONES_UID = "i_client_max_clones_uid",
    I_CLIENT_MAX_CLONES_IP = "i_client_max_clones_ip",
    I_CLIENT_MAX_CLONES_HWID = "i_client_max_clones_hwid",
    I_CLIENT_MAX_IDLETIME = "i_client_max_idletime",
    I_CLIENT_MAX_AVATAR_FILESIZE = "i_client_max_avatar_filesize",
    I_CLIENT_MAX_CHANNEL_SUBSCRIPTIONS = "i_client_max_channel_subscriptions",
    I_CLIENT_MAX_CHANNELS = "i_client_max_channels",
    I_CLIENT_MAX_TEMPORARY_CHANNELS = "i_client_max_temporary_channels",
    I_CLIENT_MAX_SEMI_CHANNELS = "i_client_max_semi_channels",
    I_CLIENT_MAX_PERMANENT_CHANNELS = "i_client_max_permanent_channels",
    B_CLIENT_USE_PRIORITY_SPEAKER = "b_client_use_priority_speaker",
    B_CLIENT_SKIP_CHANNELGROUP_PERMISSIONS = "b_client_skip_channelgroup_permissions",
    B_CLIENT_FORCE_PUSH_TO_TALK = "b_client_force_push_to_talk",
    B_CLIENT_IGNORE_BANS = "b_client_ignore_bans",
    B_CLIENT_IGNORE_VPN = "b_client_ignore_vpn",
    B_CLIENT_IGNORE_ANTIFLOOD = "b_client_ignore_antiflood",
    B_CLIENT_ENFORCE_VALID_HWID = "b_client_enforce_valid_hwid",
    B_CLIENT_ALLOW_INVALID_PACKET = "b_client_allow_invalid_packet",
    B_CLIENT_ALLOW_INVALID_BADGES = "b_client_allow_invalid_badges",
    B_CLIENT_ISSUE_CLIENT_QUERY_COMMAND = "b_client_issue_client_query_command",
    B_CLIENT_USE_RESERVED_SLOT = "b_client_use_reserved_slot",
    B_CLIENT_USE_CHANNEL_COMMANDER = "b_client_use_channel_commander",
    B_CLIENT_REQUEST_TALKER = "b_client_request_talker",
    B_CLIENT_AVATAR_DELETE_OTHER = "b_client_avatar_delete_other",
    B_CLIENT_IS_STICKY = "b_client_is_sticky",
    B_CLIENT_IGNORE_STICKY = "b_client_ignore_sticky",
    B_CLIENT_MUSIC_CREATE_PERMANENT = "b_client_music_create_permanent",
    B_CLIENT_MUSIC_CREATE_SEMI_PERMANENT = "b_client_music_create_semi_permanent",
    B_CLIENT_MUSIC_CREATE_TEMPORARY = "b_client_music_create_temporary",
    B_CLIENT_MUSIC_MODIFY_PERMANENT = "b_client_music_modify_permanent",
    B_CLIENT_MUSIC_MODIFY_SEMI_PERMANENT = "b_client_music_modify_semi_permanent",
    B_CLIENT_MUSIC_MODIFY_TEMPORARY = "b_client_music_modify_temporary",
    I_CLIENT_MUSIC_CREATE_MODIFY_MAX_VOLUME = "i_client_music_create_modify_max_volume",
    I_CLIENT_MUSIC_LIMIT = "i_client_music_limit",
    I_CLIENT_MUSIC_NEEDED_DELETE_POWER = "i_client_music_needed_delete_power",
    I_CLIENT_MUSIC_DELETE_POWER = "i_client_music_delete_power",
    I_CLIENT_MUSIC_PLAY_POWER = "i_client_music_play_power",
    I_CLIENT_MUSIC_NEEDED_PLAY_POWER = "i_client_music_needed_play_power",
    I_CLIENT_MUSIC_MODIFY_POWER = "i_client_music_modify_power",
    I_CLIENT_MUSIC_NEEDED_MODIFY_POWER = "i_client_music_needed_modify_power",
    I_CLIENT_MUSIC_RENAME_POWER = "i_client_music_rename_power",
    I_CLIENT_MUSIC_NEEDED_RENAME_POWER = "i_client_music_needed_rename_power",
    B_PLAYLIST_CREATE = "b_playlist_create",
    I_PLAYLIST_VIEW_POWER = "i_playlist_view_power",
    I_PLAYLIST_NEEDED_VIEW_POWER = "i_playlist_needed_view_power",
    I_PLAYLIST_MODIFY_POWER = "i_playlist_modify_power",
    I_PLAYLIST_NEEDED_MODIFY_POWER = "i_playlist_needed_modify_power",
    I_PLAYLIST_PERMISSION_MODIFY_POWER = "i_playlist_permission_modify_power",
    I_PLAYLIST_NEEDED_PERMISSION_MODIFY_POWER = "i_playlist_needed_permission_modify_power",
    I_PLAYLIST_DELETE_POWER = "i_playlist_delete_power",
    I_PLAYLIST_NEEDED_DELETE_POWER = "i_playlist_needed_delete_power",
    I_PLAYLIST_SONG_ADD_POWER = "i_playlist_song_add_power",
    I_PLAYLIST_SONG_NEEDED_ADD_POWER = "i_playlist_song_needed_add_power",
    I_PLAYLIST_SONG_REMOVE_POWER = "i_playlist_song_remove_power",
    I_PLAYLIST_SONG_NEEDED_REMOVE_POWER = "i_playlist_song_needed_remove_power",
    B_CLIENT_INFO_VIEW = "b_client_info_view",
    B_CLIENT_PERMISSIONOVERVIEW_VIEW = "b_client_permissionoverview_view",
    B_CLIENT_PERMISSIONOVERVIEW_OWN = "b_client_permissionoverview_own",
    B_CLIENT_REMOTEADDRESS_VIEW = "b_client_remoteaddress_view",
    I_CLIENT_SERVERQUERY_VIEW_POWER = "i_client_serverquery_view_power",
    I_CLIENT_NEEDED_SERVERQUERY_VIEW_POWER = "i_client_needed_serverquery_view_power",
    B_CLIENT_CUSTOM_INFO_VIEW = "b_client_custom_info_view",
    B_CLIENT_MUSIC_CHANNEL_LIST = "b_client_music_channel_list",
    B_CLIENT_MUSIC_SERVER_LIST = "b_client_music_server_list",
    I_CLIENT_MUSIC_INFO = "i_client_music_info",
    I_CLIENT_MUSIC_NEEDED_INFO = "i_client_music_needed_info",
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
    B_CLIENT_BAN_TRIGGER_LIST = "b_client_ban_trigger_list",
    B_CLIENT_BAN_CREATE = "b_client_ban_create",
    B_CLIENT_BAN_CREATE_GLOBAL = "b_client_ban_create_global",
    B_CLIENT_BAN_NAME = "b_client_ban_name",
    B_CLIENT_BAN_IP = "b_client_ban_ip",
    B_CLIENT_BAN_HWID = "b_client_ban_hwid",
    B_CLIENT_BAN_EDIT = "b_client_ban_edit",
    B_CLIENT_BAN_EDIT_GLOBAL = "b_client_ban_edit_global",
    B_CLIENT_BAN_DELETE_OWN = "b_client_ban_delete_own",
    B_CLIENT_BAN_DELETE = "b_client_ban_delete",
    B_CLIENT_BAN_DELETE_OWN_GLOBAL = "b_client_ban_delete_own_global",
    B_CLIENT_BAN_DELETE_GLOBAL = "b_client_ban_delete_global",
    I_CLIENT_BAN_MAX_BANTIME = "i_client_ban_max_bantime",
    I_CLIENT_PRIVATE_TEXTMESSAGE_POWER = "i_client_private_textmessage_power",
    I_CLIENT_NEEDED_PRIVATE_TEXTMESSAGE_POWER = "i_client_needed_private_textmessage_power",
    B_CLIENT_EVEN_TEXTMESSAGE_SEND = "b_client_even_textmessage_send",
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
    B_CLIENT_USE_BBCODE_ANY = "b_client_use_bbcode_any",
    B_CLIENT_USE_BBCODE_URL = "b_client_use_bbcode_url",
    B_CLIENT_USE_BBCODE_IMAGE = "b_client_use_bbcode_image",
    B_CLIENT_MODIFY_DBPROPERTIES = "b_client_modify_dbproperties",
    B_CLIENT_DELETE_DBPROPERTIES = "b_client_delete_dbproperties",
    B_CLIENT_CREATE_MODIFY_SERVERQUERY_LOGIN = "b_client_create_modify_serverquery_login",
    B_CLIENT_QUERY_CREATE = "b_client_query_create",
    B_CLIENT_QUERY_LIST = "b_client_query_list",
    B_CLIENT_QUERY_LIST_OWN = "b_client_query_list_own",
    B_CLIENT_QUERY_RENAME = "b_client_query_rename",
    B_CLIENT_QUERY_RENAME_OWN = "b_client_query_rename_own",
    B_CLIENT_QUERY_CHANGE_PASSWORD = "b_client_query_change_password",
    B_CLIENT_QUERY_CHANGE_OWN_PASSWORD = "b_client_query_change_own_password",
    B_CLIENT_QUERY_CHANGE_PASSWORD_GLOBAL = "b_client_query_change_password_global",
    B_CLIENT_QUERY_DELETE = "b_client_query_delete",
    B_CLIENT_QUERY_DELETE_OWN = "b_client_query_delete_own",
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

    is_boolean() { return this.name.startsWith("b_"); }
    id_grant() : number {
        return this.id | (1 << 15);
    }
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

    constructor(type, value?) {
        this.type = type;
        this.value = value;
    }

    granted(requiredValue: number, required: boolean = true) : boolean {
        let result;
        result = this.value == -1 || this.value >= requiredValue || (this.value == -2 && requiredValue == -2 && !required);

        log.trace(LogCategory.PERMISSIONS,
            tr("Required permission test resulted for permission %s: %s. Required value: %s, Granted value: %s"),
            this.type ? this.type.name : "unknown",
            result ? tr("granted") : tr("denied"),
            requiredValue + (required ? " (" + tr("required") + ")" : ""),
            this.hasValue() ? this.value : tr("none")
        );
        return result;
    }

    hasValue() : boolean {
        return typeof(this.value) !== "undefined" && this.value != -2;
    }
    hasGrant() : boolean {
        return typeof(this.granted_value) !== "undefined" && this.granted_value != -2;
    }
}

class NeededPermissionValue extends PermissionValue {
    constructor(type, value) {
        super(type, value);
    }
}

namespace permissions {
    export type PermissionRequestKeys = {
        client_id?: number;
        channel_id?: number;
        playlist_id?: number;
    }

    export type PermissionRequest = PermissionRequestKeys & {
        timeout_id: any;
        promise: LaterPromise<PermissionValue[]>;
    };

    export namespace find {
        export type Entry = {
            type: "server" | "channel" | "client" | "client_channel" | "channel_group" | "server_group";
            value: number;
            id: number;
        }

        export type Client = Entry & {
            type: "client",

            client_id: number;
        }

        export type Channel = Entry & {
            type: "channel",

            channel_id: number;
        }

        export type Server = Entry & {
            type: "server"
        }

        export type ClientChannel = Entry & {
            type: "client_channel",

            client_id: number;
            channel_id: number;
        }

        export type ChannelGroup = Entry & {
            type: "channel_group",

            group_id: number;
        }

        export type ServerGroup = Entry & {
            type: "server_group",

            group_id: number;
        }
    }
}

type RequestLists =
    "requests_channel_permissions" |
    "requests_client_permissions" |
    "requests_client_channel_permissions" |
    "requests_playlist_permissions" |
    "requests_playlist_client_permissions";
class PermissionManager extends connection.AbstractCommandHandler {
    readonly handle: ConnectionHandler;

    permissionList: PermissionInfo[] = [];
    permissionGroups: PermissionGroup[] = [];
    neededPermissions: NeededPermissionValue[] = [];

    needed_permission_change_listener: {[permission: string]:(() => any)[]} = {};

    requests_channel_permissions: permissions.PermissionRequest[] = [];
    requests_client_permissions: permissions.PermissionRequest[] = [];
    requests_client_channel_permissions: permissions.PermissionRequest[] = [];
    requests_playlist_permissions: permissions.PermissionRequest[] = [];
    requests_playlist_client_permissions: permissions.PermissionRequest[] = [];

    requests_permfind: {
        timeout_id: number,
        permission: string,
        callback: (status: "success" | "error", data: any) => void
    }[] = [];

    initializedListener: ((initialized: boolean) => void)[] = [];
    private _cacheNeededPermissions: any;

    /* Static info mapping until TeaSpeak implements a detailed info */
    static readonly group_mapping: {name: string, deep: number}[] = [
        {name: tr("Global"), deep: 0},
            {name: tr("Information"), deep: 1},
            {name: tr("Virtual server management"), deep: 1},
            {name: tr("Administration"), deep: 1},
            {name: tr("Settings"), deep: 1},
        {name: tr("Virtual Server"), deep: 0},
            {name: tr("Information"), deep: 1},
            {name: tr("Administration"), deep: 1},
            {name: tr("Settings"), deep: 1},
        {name: tr("Channel"), deep: 0},
            {name: tr("Information"), deep: 1},
            {name: tr("Create"), deep: 1},
            {name: tr("Modify"), deep: 1},
            {name: tr("Delete"), deep: 1},
            {name: tr("Access"), deep: 1},
        {name: tr("Group"), deep: 0},
            {name: tr("Information"), deep: 1},
            {name: tr("Create"), deep: 1},
            {name: tr("Modify"), deep: 1},
            {name: tr("Delete"), deep: 1},
        {name: tr("Client"), deep: 0},
            {name: tr("Information"), deep: 1},
            {name: tr("Admin"), deep: 1},
            {name: tr("Basics"), deep: 1},
            {name: tr("Modify"), deep: 1},
        //TODO Music bot
        {name: tr("File Transfer"), deep: 0},
    ];
    private _group_mapping;

    public static parse_permission_bulk(json: any[], manager: PermissionManager) : PermissionValue[] {
        let permissions: PermissionValue[] = [];
        for(let perm of json) {
            if(perm["permid"] === undefined) continue;

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

    constructor(client: ConnectionHandler) {
        super(client.serverConnection);

        //FIXME? Dont register the handler like this?
        this.volatile_handler_boss = true;
        client.serverConnection.command_handler_boss().register_handler(this);

        this.handle = client;
    }

    destroy() {
        this.handle.serverConnection && this.handle.serverConnection.command_handler_boss().unregister_handler(this);
        this.needed_permission_change_listener = {};

        this.permissionList = undefined;
        this.permissionGroups = undefined;

        this.neededPermissions = undefined;

        /* delete all requests */
        for(const key of Object.keys(this))
            if(key.startsWith("requests"))
                delete this[key];

        this.initializedListener = undefined;
        this._cacheNeededPermissions = undefined;
    }

    handle_command(command: connection.ServerCommand): boolean {
        switch (command.command) {
            case "notifyclientneededpermissions":
                this.onNeededPermissions(command.arguments);
                return true;
            case "notifypermissionlist":
                this.onPermissionList(command.arguments);
                return true;
            case "notifychannelpermlist":
                this.onChannelPermList(command.arguments);
                return true;
            case "notifyclientpermlist":
                this.onClientPermList(command.arguments);
                return true;
            case "notifyclientchannelpermlist":
                this.onChannelClientPermList(command.arguments);
                return true;
            case "notifyplaylistpermlist":
                this.onPlaylistPermList(command.arguments);
                return true;
            case "notifyplaylistclientpermlist":
                this.onPlaylistClientPermList(command.arguments);
                return true;
        }
        return false;
    }

    initialized() : boolean {
        return this.permissionList.length > 0;
    }

    public requestPermissionList() {
        this.handle.serverConnection.send_command("permissionlist");
    }

    private onPermissionList(json) {
        this.permissionList = [];
        this.permissionGroups = [];
        this._group_mapping = PermissionManager.group_mapping.slice();

        let group = log.group(log.LogType.TRACE, LogCategory.PERMISSIONS, tr("Permission mapping"));
        const table_entries = [];
        let permission_id = 0;
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
                continue;
            }

            let perm = new PermissionInfo();
            permission_id++;

            perm.name = e["permname"];
            perm.id = parseInt(e["permid"]) || permission_id; /* using permission_id as fallback if we dont have permid */
            perm.description = e["permdesc"];
            this.permissionList.push(perm);

            table_entries.push({
                "id": perm.id,
                "name": perm.name,
                "description": perm.description
            });
        }
        log.table(LogType.DEBUG, LogCategory.PERMISSIONS, "Permission list", table_entries);
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
        const table_entries = [];

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

            for(const listener of this.needed_permission_change_listener[entry.type.name] || [])
                listener();

            table_entries.push({
                "permission": entry.type.name,
                "value": entry.value
            });
        }

        log.table(LogType.DEBUG, LogCategory.PERMISSIONS, "Needed client permissions", table_entries);
        group.end();

        log.debug(LogCategory.PERMISSIONS, tr("Dropping %o needed permissions and added %o permissions."), copy.length, addcount);
        for(let e of copy) {
            e.value = -2;
            for(const listener of this.needed_permission_change_listener[e.type.name] || [])
                listener();
        }
    }

    register_needed_permission(key: PermissionType, listener: () => any) {
        const array = this.needed_permission_change_listener[key] || [];
        array.push(listener);
        this.needed_permission_change_listener[key] = array;
    }

    unregister_needed_permission(key: PermissionType, listener: () => any) {
        const array = this.needed_permission_change_listener[key];
        if(!array) return;

        array.remove(listener);
        this.needed_permission_change_listener[key] = array.length > 0 ? array : undefined;
    }

    resolveInfo?(key: number | string | PermissionType) : PermissionInfo {
        for(let perm of this.permissionList)
            if(perm.id == key || perm.name == key)
                return perm;
        return undefined;
    }

    /* channel permission request */
    private onChannelPermList(json) {
        let channelId: number = parseInt(json[0]["cid"]);

        this.fullfill_permission_request("requests_channel_permissions", {
            channel_id: channelId
        }, "success", PermissionManager.parse_permission_bulk(json, this.handle.permissions));
    }

    private execute_channel_permission_request(request: permissions.PermissionRequestKeys) {
        this.handle.serverConnection.send_command("channelpermlist", {"cid": request.channel_id}).catch(error => {
            if(error instanceof CommandResult && error.id == ErrorID.EMPTY_RESULT)
                this.fullfill_permission_request("requests_channel_permissions", request, "success", []);
            else
                this.fullfill_permission_request("requests_channel_permissions", request, "error", error);
        });
    }

    requestChannelPermissions(channelId: number) : Promise<PermissionValue[]> {
        const keys: permissions.PermissionRequestKeys = {
            channel_id: channelId
        };
        return this.execute_permission_request("requests_channel_permissions", keys, this.execute_channel_permission_request.bind(this));
    }

    /* client permission request */
    private onClientPermList(json: any[]) {
        let client = parseInt(json[0]["cldbid"]);
        this.fullfill_permission_request("requests_client_permissions", {
            client_id: client
        }, "success", PermissionManager.parse_permission_bulk(json, this.handle.permissions));
    }

    private execute_client_permission_request(request: permissions.PermissionRequestKeys) {
        this.handle.serverConnection.send_command("clientpermlist", {cldbid: request.client_id}).catch(error => {
            if(error instanceof CommandResult && error.id == ErrorID.EMPTY_RESULT)
                this.fullfill_permission_request("requests_client_permissions", request, "success", []);
            else
                this.fullfill_permission_request("requests_client_permissions", request, "error", error);
        });
    }

    requestClientPermissions(client_id: number) : Promise<PermissionValue[]> {
        const keys: permissions.PermissionRequestKeys = {
            client_id: client_id
        };
        return this.execute_permission_request("requests_client_permissions", keys, this.execute_client_permission_request.bind(this));
    }

    /* client channel permission request */
    private onChannelClientPermList(json: any[]) {
        let client_id = parseInt(json[0]["cldbid"]);
        let channel_id = parseInt(json[0]["cid"]);

        this.fullfill_permission_request("requests_client_channel_permissions", {
            client_id: client_id,
            channel_id: channel_id
        }, "success", PermissionManager.parse_permission_bulk(json, this.handle.permissions));
    }

    private execute_client_channel_permission_request(request: permissions.PermissionRequestKeys) {
        this.handle.serverConnection.send_command("channelclientpermlist", {cldbid: request.client_id, cid: request.channel_id})
        .catch(error => {
            if(error instanceof CommandResult && error.id == ErrorID.EMPTY_RESULT)
                this.fullfill_permission_request("requests_client_channel_permissions", request, "success", []);
            else
                this.fullfill_permission_request("requests_client_channel_permissions", request, "error", error);
        });
    }

    requestClientChannelPermissions(client_id: number, channel_id: number) : Promise<PermissionValue[]> {
        const keys: permissions.PermissionRequestKeys = {
            client_id: client_id
        };
        return this.execute_permission_request("requests_client_channel_permissions", keys, this.execute_client_channel_permission_request.bind(this));
    }

    /* playlist permissions */
    private onPlaylistPermList(json: any[]) {
        let playlist_id = parseInt(json[0]["playlist_id"]);

        this.fullfill_permission_request("requests_playlist_permissions", {
            playlist_id: playlist_id
        }, "success", PermissionManager.parse_permission_bulk(json, this.handle.permissions));
    }

    private execute_playlist_permission_request(request: permissions.PermissionRequestKeys) {
        this.handle.serverConnection.send_command("playlistpermlist", {playlist_id: request.playlist_id})
            .catch(error => {
                if(error instanceof CommandResult && error.id == ErrorID.EMPTY_RESULT)
                    this.fullfill_permission_request("requests_playlist_permissions", request, "success", []);
                else
                    this.fullfill_permission_request("requests_playlist_permissions", request, "error", error);
            });
    }

    requestPlaylistPermissions(playlist_id: number) : Promise<PermissionValue[]> {
        const keys: permissions.PermissionRequestKeys = {
            playlist_id: playlist_id
        };
        return this.execute_permission_request("requests_playlist_permissions", keys, this.execute_playlist_permission_request.bind(this));
    }

    /* playlist client permissions */
    private onPlaylistClientPermList(json: any[]) {
        let playlist_id = parseInt(json[0]["playlist_id"]);
        let client_id = parseInt(json[0]["cldbid"]);

        this.fullfill_permission_request("requests_playlist_client_permissions", {
            playlist_id: playlist_id,
            client_id: client_id
        }, "success", PermissionManager.parse_permission_bulk(json, this.handle.permissions));
    }

    private execute_playlist_client_permission_request(request: permissions.PermissionRequestKeys) {
        this.handle.serverConnection.send_command("playlistclientpermlist", {playlist_id: request.playlist_id, cldbid: request.client_id})
            .catch(error => {
                if(error instanceof CommandResult && error.id == ErrorID.EMPTY_RESULT)
                    this.fullfill_permission_request("requests_playlist_client_permissions", request, "success", []);
                else
                    this.fullfill_permission_request("requests_playlist_client_permissions", request, "error", error);
            });
    }

    requestPlaylistClientPermissions(playlist_id: number, client_database_id: number) : Promise<PermissionValue[]> {
        const keys: permissions.PermissionRequestKeys = {
            playlist_id: playlist_id,
            client_id: client_database_id
        };
        return this.execute_permission_request("requests_playlist_client_permissions", keys, this.execute_playlist_client_permission_request.bind(this));
    }

    private readonly criteria_equal = (a, b) => {
        for(const criteria of ["client_id", "channel_id", "playlist_id"]) {
            if((typeof a[criteria] === "undefined") !== (typeof b[criteria] === "undefined")) return false;
            if(a[criteria] != b[criteria]) return false;
        }
        return true;
    };

    private execute_permission_request(list: RequestLists,
                                       criteria: permissions.PermissionRequestKeys,
                                       execute: (criteria: permissions.PermissionRequestKeys) => any) : Promise<PermissionValue[]> {
        for(const request of this[list])
            if(this.criteria_equal(request, criteria) && request.promise.time() + 1000 < Date.now())
                return request.promise;

        const result = Object.assign({
            timeout_id: setTimeout(() => this.fullfill_permission_request(list, criteria, "error", tr("timeout")), 5000),
            promise: new LaterPromise<PermissionValue[]>()
        }, criteria);
        this[list].push(result);
        execute(criteria);
        return result.promise;
    };

    private fullfill_permission_request(list: RequestLists, criteria: permissions.PermissionRequestKeys, status: "success" | "error", result: any) {
        for(const request of this[list]) {
            if(this.criteria_equal(request, criteria)) {
                this[list].remove(request);
                clearTimeout(request.timeout_id);
                status === "error" ? request.promise.rejected(result) : request.promise.resolved(result);
            }
        }
    }

    find_permission(...permissions: string[]) : Promise<permissions.find.Entry[]> {
        const permission_ids = [];
        for(const permission of permissions) {
            const info = this.resolveInfo(permission);
            if(!info) continue;

            permission_ids.push(info.id);
        }
        if(!permission_ids.length) return Promise.resolve([]);

        return new Promise<permissions.find.Entry[]>((resolve, reject) => {
            const single_handler = {
                command: "notifypermfind",
                function: command => {
                    const result: permissions.find.Entry[] = [];
                    for(const entry of command.arguments) {
                        const perm_id = parseInt(entry["p"]);
                        if(permission_ids.indexOf(perm_id) === -1) return; /* not our permfind result */

                        const value = parseInt(entry["v"]);
                        const type = parseInt(entry["t"]);

                        let data;
                        switch (type) {
                            case 0:
                                data = {
                                    type: "server_group",
                                    group_id: parseInt(entry["id1"]),
                                } as permissions.find.ServerGroup;
                                break;
                            case 1:
                                data = {
                                    type: "client",
                                    client_id: parseInt(entry["id2"]),
                                } as permissions.find.Client;
                                break;
                            case 2:
                                data = {
                                    type: "channel",
                                    channel_id: parseInt(entry["id2"]),
                                } as permissions.find.Channel;
                                break;
                            case 3:
                                data = {
                                    type: "channel_group",
                                    group_id: parseInt(entry["id1"]),
                                } as permissions.find.ChannelGroup;
                                break;
                            case 4:
                                data = {
                                    type: "client_channel",
                                    client_id: parseInt(entry["id1"]),
                                    channel_id: parseInt(entry["id1"]),
                                } as permissions.find.ClientChannel;
                                break;
                            default:
                                continue;
                        }

                        data.id = perm_id;
                        data.value = value;
                        result.push(data);
                    }

                    resolve(result);
                    return true;
                }
            };
            this.handler_boss.register_single_handler(single_handler);

            this.connection.send_command("permfind", permission_ids.map(e => { return {permid: e }})).catch(error => {
                this.handler_boss.remove_single_handler(single_handler);

                if(error instanceof CommandResult && error.id == ErrorID.EMPTY_RESULT) {
                    resolve([]);
                    return;
                }
                reject(error);
            });
        });
    }

    neededPermission(key: number | string | PermissionType | PermissionInfo) : NeededPermissionValue {
        for(let perm of this.neededPermissions)
            if(perm.type.id == key || perm.type.name == key || perm.type == key)
                return perm;

        log.debug(LogCategory.PERMISSIONS, tr("Could not resolve grant permission %o. Creating a new one."), key);
        let info = key instanceof PermissionInfo ? key : this.resolveInfo(key);
        if(!info) {
            log.warn(LogCategory.PERMISSIONS, tr("Requested needed permission with invalid key! (%o)"), key);
            return new NeededPermissionValue(undefined, -2);
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

    /**
     * Generates an enum with all know permission types, used for the enum above
     */
    export_permission_types() {
        let result = "";
        result = result + "enum PermissionType {\n";

        for(const permission of this.permissionList) {
            if(!permission.name) continue;
            result = result + "\t" + permission.name.toUpperCase() + " = \"" + permission.name.toLowerCase() + "\", /* Permission ID: " + permission.id + " */\n";
        }

        result = result + "}";
        return result;
    }
}