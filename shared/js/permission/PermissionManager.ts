/// <reference path="../ConnectionHandler.ts" />
/// <reference path="../connection/ConnectionBase.ts" />

enum PermissionType {
    B_SERVERINSTANCE_HELP_VIEW = "b_serverinstance_help_view", /* Permission ID: 1 */
    B_SERVERINSTANCE_VERSION_VIEW = "b_serverinstance_version_view", /* Permission ID: 2 */
    B_SERVERINSTANCE_INFO_VIEW = "b_serverinstance_info_view", /* Permission ID: 3 */
    B_SERVERINSTANCE_VIRTUALSERVER_LIST = "b_serverinstance_virtualserver_list", /* Permission ID: 4 */
    B_SERVERINSTANCE_BINDING_LIST = "b_serverinstance_binding_list", /* Permission ID: 5 */
    B_SERVERINSTANCE_PERMISSION_LIST = "b_serverinstance_permission_list", /* Permission ID: 6 */
    B_SERVERINSTANCE_PERMISSION_FIND = "b_serverinstance_permission_find", /* Permission ID: 7 */
    B_VIRTUALSERVER_CREATE = "b_virtualserver_create", /* Permission ID: 8 */
    B_VIRTUALSERVER_DELETE = "b_virtualserver_delete", /* Permission ID: 9 */
    B_VIRTUALSERVER_START_ANY = "b_virtualserver_start_any", /* Permission ID: 10 */
    B_VIRTUALSERVER_STOP_ANY = "b_virtualserver_stop_any", /* Permission ID: 11 */
    B_VIRTUALSERVER_CHANGE_MACHINE_ID = "b_virtualserver_change_machine_id", /* Permission ID: 12 */
    B_VIRTUALSERVER_CHANGE_TEMPLATE = "b_virtualserver_change_template", /* Permission ID: 13 */
    B_SERVERQUERY_LOGIN = "b_serverquery_login", /* Permission ID: 14 */
    B_SERVERINSTANCE_TEXTMESSAGE_SEND = "b_serverinstance_textmessage_send", /* Permission ID: 15 */
    B_SERVERINSTANCE_LOG_VIEW = "b_serverinstance_log_view", /* Permission ID: 16 */
    B_SERVERINSTANCE_LOG_ADD = "b_serverinstance_log_add", /* Permission ID: 17 */
    B_SERVERINSTANCE_STOP = "b_serverinstance_stop", /* Permission ID: 18 */
    B_SERVERINSTANCE_MODIFY_SETTINGS = "b_serverinstance_modify_settings", /* Permission ID: 19 */
    B_SERVERINSTANCE_MODIFY_QUERYGROUP = "b_serverinstance_modify_querygroup", /* Permission ID: 20 */
    B_SERVERINSTANCE_MODIFY_TEMPLATES = "b_serverinstance_modify_templates", /* Permission ID: 21 */
    B_VIRTUALSERVER_SELECT = "b_virtualserver_select", /* Permission ID: 22 */
    B_VIRTUALSERVER_SELECT_GODMODE = "b_virtualserver_select_godmode", /* Permission ID: 23 */
    B_VIRTUALSERVER_INFO_VIEW = "b_virtualserver_info_view", /* Permission ID: 24 */
    B_VIRTUALSERVER_CONNECTIONINFO_VIEW = "b_virtualserver_connectioninfo_view", /* Permission ID: 25 */
    B_VIRTUALSERVER_CHANNEL_LIST = "b_virtualserver_channel_list", /* Permission ID: 26 */
    B_VIRTUALSERVER_CHANNEL_SEARCH = "b_virtualserver_channel_search", /* Permission ID: 27 */
    B_VIRTUALSERVER_CLIENT_LIST = "b_virtualserver_client_list", /* Permission ID: 28 */
    B_VIRTUALSERVER_CLIENT_SEARCH = "b_virtualserver_client_search", /* Permission ID: 29 */
    B_VIRTUALSERVER_CLIENT_DBLIST = "b_virtualserver_client_dblist", /* Permission ID: 30 */
    B_VIRTUALSERVER_CLIENT_DBSEARCH = "b_virtualserver_client_dbsearch", /* Permission ID: 31 */
    B_VIRTUALSERVER_CLIENT_DBINFO = "b_virtualserver_client_dbinfo", /* Permission ID: 32 */
    B_VIRTUALSERVER_PERMISSION_FIND = "b_virtualserver_permission_find", /* Permission ID: 33 */
    B_VIRTUALSERVER_CUSTOM_SEARCH = "b_virtualserver_custom_search", /* Permission ID: 34 */
    B_VIRTUALSERVER_START = "b_virtualserver_start", /* Permission ID: 35 */
    B_VIRTUALSERVER_STOP = "b_virtualserver_stop", /* Permission ID: 36 */
    B_VIRTUALSERVER_TOKEN_LIST = "b_virtualserver_token_list", /* Permission ID: 37 */
    B_VIRTUALSERVER_TOKEN_ADD = "b_virtualserver_token_add", /* Permission ID: 38 */
    B_VIRTUALSERVER_TOKEN_USE = "b_virtualserver_token_use", /* Permission ID: 39 */
    B_VIRTUALSERVER_TOKEN_DELETE = "b_virtualserver_token_delete", /* Permission ID: 40 */
    B_VIRTUALSERVER_LOG_VIEW = "b_virtualserver_log_view", /* Permission ID: 41 */
    B_VIRTUALSERVER_LOG_ADD = "b_virtualserver_log_add", /* Permission ID: 42 */
    B_VIRTUALSERVER_JOIN_IGNORE_PASSWORD = "b_virtualserver_join_ignore_password", /* Permission ID: 43 */
    B_VIRTUALSERVER_NOTIFY_REGISTER = "b_virtualserver_notify_register", /* Permission ID: 44 */
    B_VIRTUALSERVER_NOTIFY_UNREGISTER = "b_virtualserver_notify_unregister", /* Permission ID: 45 */
    B_VIRTUALSERVER_SNAPSHOT_CREATE = "b_virtualserver_snapshot_create", /* Permission ID: 46 */
    B_VIRTUALSERVER_SNAPSHOT_DEPLOY = "b_virtualserver_snapshot_deploy", /* Permission ID: 47 */
    B_VIRTUALSERVER_PERMISSION_RESET = "b_virtualserver_permission_reset", /* Permission ID: 48 */
    B_VIRTUALSERVER_MODIFY_NAME = "b_virtualserver_modify_name", /* Permission ID: 49 */
    B_VIRTUALSERVER_MODIFY_WELCOMEMESSAGE = "b_virtualserver_modify_welcomemessage", /* Permission ID: 50 */
    B_VIRTUALSERVER_MODIFY_MAXCLIENTS = "b_virtualserver_modify_maxclients", /* Permission ID: 51 */
    B_VIRTUALSERVER_MODIFY_RESERVED_SLOTS = "b_virtualserver_modify_reserved_slots", /* Permission ID: 52 */
    B_VIRTUALSERVER_MODIFY_PASSWORD = "b_virtualserver_modify_password", /* Permission ID: 53 */
    B_VIRTUALSERVER_MODIFY_DEFAULT_SERVERGROUP = "b_virtualserver_modify_default_servergroup", /* Permission ID: 54 */
    B_VIRTUALSERVER_MODIFY_DEFAULT_MUSICGROUP = "b_virtualserver_modify_default_musicgroup", /* Permission ID: 55 */
    B_VIRTUALSERVER_MODIFY_DEFAULT_CHANNELGROUP = "b_virtualserver_modify_default_channelgroup", /* Permission ID: 56 */
    B_VIRTUALSERVER_MODIFY_DEFAULT_CHANNELADMINGROUP = "b_virtualserver_modify_default_channeladmingroup", /* Permission ID: 57 */
    B_VIRTUALSERVER_MODIFY_CHANNEL_FORCED_SILENCE = "b_virtualserver_modify_channel_forced_silence", /* Permission ID: 58 */
    B_VIRTUALSERVER_MODIFY_COMPLAIN = "b_virtualserver_modify_complain", /* Permission ID: 59 */
    B_VIRTUALSERVER_MODIFY_ANTIFLOOD = "b_virtualserver_modify_antiflood", /* Permission ID: 60 */
    B_VIRTUALSERVER_MODIFY_FT_SETTINGS = "b_virtualserver_modify_ft_settings", /* Permission ID: 61 */
    B_VIRTUALSERVER_MODIFY_FT_QUOTAS = "b_virtualserver_modify_ft_quotas", /* Permission ID: 62 */
    B_VIRTUALSERVER_MODIFY_HOSTMESSAGE = "b_virtualserver_modify_hostmessage", /* Permission ID: 63 */
    B_VIRTUALSERVER_MODIFY_HOSTBANNER = "b_virtualserver_modify_hostbanner", /* Permission ID: 64 */
    B_VIRTUALSERVER_MODIFY_HOSTBUTTON = "b_virtualserver_modify_hostbutton", /* Permission ID: 65 */
    B_VIRTUALSERVER_MODIFY_PORT = "b_virtualserver_modify_port", /* Permission ID: 66 */
    B_VIRTUALSERVER_MODIFY_HOST = "b_virtualserver_modify_host", /* Permission ID: 67 */
    B_VIRTUALSERVER_MODIFY_DEFAULT_MESSAGES = "b_virtualserver_modify_default_messages", /* Permission ID: 68 */
    B_VIRTUALSERVER_MODIFY_AUTOSTART = "b_virtualserver_modify_autostart", /* Permission ID: 69 */
    B_VIRTUALSERVER_MODIFY_NEEDED_IDENTITY_SECURITY_LEVEL = "b_virtualserver_modify_needed_identity_security_level", /* Permission ID: 70 */
    B_VIRTUALSERVER_MODIFY_PRIORITY_SPEAKER_DIMM_MODIFICATOR = "b_virtualserver_modify_priority_speaker_dimm_modificator", /* Permission ID: 71 */
    B_VIRTUALSERVER_MODIFY_LOG_SETTINGS = "b_virtualserver_modify_log_settings", /* Permission ID: 72 */
    B_VIRTUALSERVER_MODIFY_MIN_CLIENT_VERSION = "b_virtualserver_modify_min_client_version", /* Permission ID: 73 */
    B_VIRTUALSERVER_MODIFY_ICON_ID = "b_virtualserver_modify_icon_id", /* Permission ID: 74 */
    B_VIRTUALSERVER_MODIFY_WEBLIST = "b_virtualserver_modify_weblist", /* Permission ID: 75 */
    B_VIRTUALSERVER_MODIFY_CODEC_ENCRYPTION_MODE = "b_virtualserver_modify_codec_encryption_mode", /* Permission ID: 76 */
    B_VIRTUALSERVER_MODIFY_TEMPORARY_PASSWORDS = "b_virtualserver_modify_temporary_passwords", /* Permission ID: 77 */
    B_VIRTUALSERVER_MODIFY_TEMPORARY_PASSWORDS_OWN = "b_virtualserver_modify_temporary_passwords_own", /* Permission ID: 78 */
    B_VIRTUALSERVER_MODIFY_CHANNEL_TEMP_DELETE_DELAY_DEFAULT = "b_virtualserver_modify_channel_temp_delete_delay_default", /* Permission ID: 79 */
    B_VIRTUALSERVER_MODIFY_MUSIC_BOT_LIMIT = "b_virtualserver_modify_music_bot_limit", /* Permission ID: 80 */
    I_CHANNEL_MIN_DEPTH = "i_channel_min_depth", /* Permission ID: 81 */
    I_CHANNEL_MAX_DEPTH = "i_channel_max_depth", /* Permission ID: 82 */
    B_CHANNEL_GROUP_INHERITANCE_END = "b_channel_group_inheritance_end", /* Permission ID: 83 */
    I_CHANNEL_PERMISSION_MODIFY_POWER = "i_channel_permission_modify_power", /* Permission ID: 84 */
    I_CHANNEL_NEEDED_PERMISSION_MODIFY_POWER = "i_channel_needed_permission_modify_power", /* Permission ID: 85 */
    B_CHANNEL_INFO_VIEW = "b_channel_info_view", /* Permission ID: 86 */
    B_CHANNEL_CREATE_CHILD = "b_channel_create_child", /* Permission ID: 87 */
    B_CHANNEL_CREATE_PERMANENT = "b_channel_create_permanent", /* Permission ID: 88 */
    B_CHANNEL_CREATE_SEMI_PERMANENT = "b_channel_create_semi_permanent", /* Permission ID: 89 */
    B_CHANNEL_CREATE_TEMPORARY = "b_channel_create_temporary", /* Permission ID: 90 */
    B_CHANNEL_CREATE_PRIVATE = "b_channel_create_private", /* Permission ID: 91 */
    B_CHANNEL_CREATE_WITH_TOPIC = "b_channel_create_with_topic", /* Permission ID: 92 */
    B_CHANNEL_CREATE_WITH_DESCRIPTION = "b_channel_create_with_description", /* Permission ID: 93 */
    B_CHANNEL_CREATE_WITH_PASSWORD = "b_channel_create_with_password", /* Permission ID: 94 */
    B_CHANNEL_CREATE_MODIFY_WITH_CODEC_SPEEX8 = "b_channel_create_modify_with_codec_speex8", /* Permission ID: 95 */
    B_CHANNEL_CREATE_MODIFY_WITH_CODEC_SPEEX16 = "b_channel_create_modify_with_codec_speex16", /* Permission ID: 96 */
    B_CHANNEL_CREATE_MODIFY_WITH_CODEC_SPEEX32 = "b_channel_create_modify_with_codec_speex32", /* Permission ID: 97 */
    B_CHANNEL_CREATE_MODIFY_WITH_CODEC_CELTMONO48 = "b_channel_create_modify_with_codec_celtmono48", /* Permission ID: 98 */
    B_CHANNEL_CREATE_MODIFY_WITH_CODEC_OPUSVOICE = "b_channel_create_modify_with_codec_opusvoice", /* Permission ID: 99 */
    B_CHANNEL_CREATE_MODIFY_WITH_CODEC_OPUSMUSIC = "b_channel_create_modify_with_codec_opusmusic", /* Permission ID: 100 */
    I_CHANNEL_CREATE_MODIFY_WITH_CODEC_MAXQUALITY = "i_channel_create_modify_with_codec_maxquality", /* Permission ID: 101 */
    I_CHANNEL_CREATE_MODIFY_WITH_CODEC_LATENCY_FACTOR_MIN = "i_channel_create_modify_with_codec_latency_factor_min", /* Permission ID: 102 */
    B_CHANNEL_CREATE_WITH_MAXCLIENTS = "b_channel_create_with_maxclients", /* Permission ID: 103 */
    B_CHANNEL_CREATE_WITH_MAXFAMILYCLIENTS = "b_channel_create_with_maxfamilyclients", /* Permission ID: 104 */
    B_CHANNEL_CREATE_WITH_SORTORDER = "b_channel_create_with_sortorder", /* Permission ID: 105 */
    B_CHANNEL_CREATE_WITH_DEFAULT = "b_channel_create_with_default", /* Permission ID: 106 */
    B_CHANNEL_CREATE_WITH_NEEDED_TALK_POWER = "b_channel_create_with_needed_talk_power", /* Permission ID: 107 */
    B_CHANNEL_CREATE_MODIFY_WITH_FORCE_PASSWORD = "b_channel_create_modify_with_force_password", /* Permission ID: 108 */
    I_CHANNEL_CREATE_MODIFY_WITH_TEMP_DELETE_DELAY = "i_channel_create_modify_with_temp_delete_delay", /* Permission ID: 109 */
    B_CHANNEL_MODIFY_PARENT = "b_channel_modify_parent", /* Permission ID: 110 */
    B_CHANNEL_MODIFY_MAKE_DEFAULT = "b_channel_modify_make_default", /* Permission ID: 111 */
    B_CHANNEL_MODIFY_MAKE_PERMANENT = "b_channel_modify_make_permanent", /* Permission ID: 112 */
    B_CHANNEL_MODIFY_MAKE_SEMI_PERMANENT = "b_channel_modify_make_semi_permanent", /* Permission ID: 113 */
    B_CHANNEL_MODIFY_MAKE_TEMPORARY = "b_channel_modify_make_temporary", /* Permission ID: 114 */
    B_CHANNEL_MODIFY_NAME = "b_channel_modify_name", /* Permission ID: 115 */
    B_CHANNEL_MODIFY_TOPIC = "b_channel_modify_topic", /* Permission ID: 116 */
    B_CHANNEL_MODIFY_DESCRIPTION = "b_channel_modify_description", /* Permission ID: 117 */
    B_CHANNEL_MODIFY_PASSWORD = "b_channel_modify_password", /* Permission ID: 118 */
    B_CHANNEL_MODIFY_CODEC = "b_channel_modify_codec", /* Permission ID: 119 */
    B_CHANNEL_MODIFY_CODEC_QUALITY = "b_channel_modify_codec_quality", /* Permission ID: 120 */
    B_CHANNEL_MODIFY_CODEC_LATENCY_FACTOR = "b_channel_modify_codec_latency_factor", /* Permission ID: 121 */
    B_CHANNEL_MODIFY_MAXCLIENTS = "b_channel_modify_maxclients", /* Permission ID: 122 */
    B_CHANNEL_MODIFY_MAXFAMILYCLIENTS = "b_channel_modify_maxfamilyclients", /* Permission ID: 123 */
    B_CHANNEL_MODIFY_SORTORDER = "b_channel_modify_sortorder", /* Permission ID: 124 */
    B_CHANNEL_MODIFY_NEEDED_TALK_POWER = "b_channel_modify_needed_talk_power", /* Permission ID: 125 */
    I_CHANNEL_MODIFY_POWER = "i_channel_modify_power", /* Permission ID: 126 */
    I_CHANNEL_NEEDED_MODIFY_POWER = "i_channel_needed_modify_power", /* Permission ID: 127 */
    B_CHANNEL_MODIFY_MAKE_CODEC_ENCRYPTED = "b_channel_modify_make_codec_encrypted", /* Permission ID: 128 */
    B_CHANNEL_MODIFY_TEMP_DELETE_DELAY = "b_channel_modify_temp_delete_delay", /* Permission ID: 129 */
    B_CHANNEL_DELETE_PERMANENT = "b_channel_delete_permanent", /* Permission ID: 130 */
    B_CHANNEL_DELETE_SEMI_PERMANENT = "b_channel_delete_semi_permanent", /* Permission ID: 131 */
    B_CHANNEL_DELETE_TEMPORARY = "b_channel_delete_temporary", /* Permission ID: 132 */
    B_CHANNEL_DELETE_FLAG_FORCE = "b_channel_delete_flag_force", /* Permission ID: 133 */
    I_CHANNEL_DELETE_POWER = "i_channel_delete_power", /* Permission ID: 134 */
    I_CHANNEL_NEEDED_DELETE_POWER = "i_channel_needed_delete_power", /* Permission ID: 135 */
    B_CHANNEL_JOIN_PERMANENT = "b_channel_join_permanent", /* Permission ID: 136 */
    B_CHANNEL_JOIN_SEMI_PERMANENT = "b_channel_join_semi_permanent", /* Permission ID: 137 */
    B_CHANNEL_JOIN_TEMPORARY = "b_channel_join_temporary", /* Permission ID: 138 */
    B_CHANNEL_JOIN_IGNORE_PASSWORD = "b_channel_join_ignore_password", /* Permission ID: 139 */
    B_CHANNEL_JOIN_IGNORE_MAXCLIENTS = "b_channel_join_ignore_maxclients", /* Permission ID: 140 */
    B_CHANNEL_IGNORE_VIEW_POWER = "b_channel_ignore_view_power", /* Permission ID: 141 */
    I_CHANNEL_JOIN_POWER = "i_channel_join_power", /* Permission ID: 142 */
    I_CHANNEL_NEEDED_JOIN_POWER = "i_channel_needed_join_power", /* Permission ID: 143 */
    B_CHANNEL_IGNORE_JOIN_POWER = "b_channel_ignore_join_power", /* Permission ID: 144 */
    I_CHANNEL_VIEW_POWER = "i_channel_view_power", /* Permission ID: 145 */
    I_CHANNEL_NEEDED_VIEW_POWER = "i_channel_needed_view_power", /* Permission ID: 146 */
    I_CHANNEL_SUBSCRIBE_POWER = "i_channel_subscribe_power", /* Permission ID: 147 */
    I_CHANNEL_NEEDED_SUBSCRIBE_POWER = "i_channel_needed_subscribe_power", /* Permission ID: 148 */
    I_CHANNEL_DESCRIPTION_VIEW_POWER = "i_channel_description_view_power", /* Permission ID: 149 */
    I_CHANNEL_NEEDED_DESCRIPTION_VIEW_POWER = "i_channel_needed_description_view_power", /* Permission ID: 150 */
    I_ICON_ID = "i_icon_id", /* Permission ID: 151 */
    I_MAX_ICON_FILESIZE = "i_max_icon_filesize", /* Permission ID: 152 */
    B_ICON_MANAGE = "b_icon_manage", /* Permission ID: 153 */
    B_GROUP_IS_PERMANENT = "b_group_is_permanent", /* Permission ID: 154 */
    I_GROUP_AUTO_UPDATE_TYPE = "i_group_auto_update_type", /* Permission ID: 155 */
    I_GROUP_AUTO_UPDATE_MAX_VALUE = "i_group_auto_update_max_value", /* Permission ID: 156 */
    I_GROUP_SORT_ID = "i_group_sort_id", /* Permission ID: 157 */
    I_GROUP_SHOW_NAME_IN_TREE = "i_group_show_name_in_tree", /* Permission ID: 158 */
    B_VIRTUALSERVER_SERVERGROUP_CREATE = "b_virtualserver_servergroup_create", /* Permission ID: 159 */
    B_VIRTUALSERVER_SERVERGROUP_LIST = "b_virtualserver_servergroup_list", /* Permission ID: 160 */
    B_VIRTUALSERVER_SERVERGROUP_PERMISSION_LIST = "b_virtualserver_servergroup_permission_list", /* Permission ID: 161 */
    B_VIRTUALSERVER_SERVERGROUP_CLIENT_LIST = "b_virtualserver_servergroup_client_list", /* Permission ID: 162 */
    B_VIRTUALSERVER_CHANNELGROUP_CREATE = "b_virtualserver_channelgroup_create", /* Permission ID: 163 */
    B_VIRTUALSERVER_CHANNELGROUP_LIST = "b_virtualserver_channelgroup_list", /* Permission ID: 164 */
    B_VIRTUALSERVER_CHANNELGROUP_PERMISSION_LIST = "b_virtualserver_channelgroup_permission_list", /* Permission ID: 165 */
    B_VIRTUALSERVER_CHANNELGROUP_CLIENT_LIST = "b_virtualserver_channelgroup_client_list", /* Permission ID: 166 */
    B_VIRTUALSERVER_CLIENT_PERMISSION_LIST = "b_virtualserver_client_permission_list", /* Permission ID: 167 */
    B_VIRTUALSERVER_CHANNEL_PERMISSION_LIST = "b_virtualserver_channel_permission_list", /* Permission ID: 168 */
    B_VIRTUALSERVER_CHANNELCLIENT_PERMISSION_LIST = "b_virtualserver_channelclient_permission_list", /* Permission ID: 169 */
    B_VIRTUALSERVER_PLAYLIST_PERMISSION_LIST = "b_virtualserver_playlist_permission_list", /* Permission ID: 170 */
    I_SERVER_GROUP_MODIFY_POWER = "i_server_group_modify_power", /* Permission ID: 171 */
    I_SERVER_GROUP_NEEDED_MODIFY_POWER = "i_server_group_needed_modify_power", /* Permission ID: 172 */
    I_SERVER_GROUP_MEMBER_ADD_POWER = "i_server_group_member_add_power", /* Permission ID: 173 */
    I_SERVER_GROUP_SELF_ADD_POWER = "i_server_group_self_add_power", /* Permission ID: 174 */
    I_SERVER_GROUP_NEEDED_MEMBER_ADD_POWER = "i_server_group_needed_member_add_power", /* Permission ID: 175 */
    I_SERVER_GROUP_MEMBER_REMOVE_POWER = "i_server_group_member_remove_power", /* Permission ID: 176 */
    I_SERVER_GROUP_SELF_REMOVE_POWER = "i_server_group_self_remove_power", /* Permission ID: 177 */
    I_SERVER_GROUP_NEEDED_MEMBER_REMOVE_POWER = "i_server_group_needed_member_remove_power", /* Permission ID: 178 */
    I_CHANNEL_GROUP_MODIFY_POWER = "i_channel_group_modify_power", /* Permission ID: 179 */
    I_CHANNEL_GROUP_NEEDED_MODIFY_POWER = "i_channel_group_needed_modify_power", /* Permission ID: 180 */
    I_CHANNEL_GROUP_MEMBER_ADD_POWER = "i_channel_group_member_add_power", /* Permission ID: 181 */
    I_CHANNEL_GROUP_SELF_ADD_POWER = "i_channel_group_self_add_power", /* Permission ID: 182 */
    I_CHANNEL_GROUP_NEEDED_MEMBER_ADD_POWER = "i_channel_group_needed_member_add_power", /* Permission ID: 183 */
    I_CHANNEL_GROUP_MEMBER_REMOVE_POWER = "i_channel_group_member_remove_power", /* Permission ID: 184 */
    I_CHANNEL_GROUP_SELF_REMOVE_POWER = "i_channel_group_self_remove_power", /* Permission ID: 185 */
    I_CHANNEL_GROUP_NEEDED_MEMBER_REMOVE_POWER = "i_channel_group_needed_member_remove_power", /* Permission ID: 186 */
    I_GROUP_MEMBER_ADD_POWER = "i_group_member_add_power", /* Permission ID: 187 */
    I_GROUP_NEEDED_MEMBER_ADD_POWER = "i_group_needed_member_add_power", /* Permission ID: 188 */
    I_GROUP_MEMBER_REMOVE_POWER = "i_group_member_remove_power", /* Permission ID: 189 */
    I_GROUP_NEEDED_MEMBER_REMOVE_POWER = "i_group_needed_member_remove_power", /* Permission ID: 190 */
    I_GROUP_MODIFY_POWER = "i_group_modify_power", /* Permission ID: 191 */
    I_GROUP_NEEDED_MODIFY_POWER = "i_group_needed_modify_power", /* Permission ID: 192 */
    I_PERMISSION_MODIFY_POWER = "i_permission_modify_power", /* Permission ID: 193 */
    B_PERMISSION_MODIFY_POWER_IGNORE = "b_permission_modify_power_ignore", /* Permission ID: 194 */
    B_VIRTUALSERVER_SERVERGROUP_DELETE = "b_virtualserver_servergroup_delete", /* Permission ID: 195 */
    B_VIRTUALSERVER_CHANNELGROUP_DELETE = "b_virtualserver_channelgroup_delete", /* Permission ID: 196 */
    I_CLIENT_PERMISSION_MODIFY_POWER = "i_client_permission_modify_power", /* Permission ID: 197 */
    I_CLIENT_NEEDED_PERMISSION_MODIFY_POWER = "i_client_needed_permission_modify_power", /* Permission ID: 198 */
    I_CLIENT_MAX_CLONES_UID = "i_client_max_clones_uid", /* Permission ID: 199 */
    I_CLIENT_MAX_CLONES_IP = "i_client_max_clones_ip", /* Permission ID: 200 */
    I_CLIENT_MAX_CLONES_HWID = "i_client_max_clones_hwid", /* Permission ID: 201 */
    I_CLIENT_MAX_IDLETIME = "i_client_max_idletime", /* Permission ID: 202 */
    I_CLIENT_MAX_AVATAR_FILESIZE = "i_client_max_avatar_filesize", /* Permission ID: 203 */
    I_CLIENT_MAX_CHANNEL_SUBSCRIPTIONS = "i_client_max_channel_subscriptions", /* Permission ID: 204 */
    I_CLIENT_MAX_CHANNELS = "i_client_max_channels", /* Permission ID: 205 */
    I_CLIENT_MAX_TEMPORARY_CHANNELS = "i_client_max_temporary_channels", /* Permission ID: 206 */
    I_CLIENT_MAX_SEMI_CHANNELS = "i_client_max_semi_channels", /* Permission ID: 207 */
    I_CLIENT_MAX_PERMANENT_CHANNELS = "i_client_max_permanent_channels", /* Permission ID: 208 */
    B_CLIENT_USE_PRIORITY_SPEAKER = "b_client_use_priority_speaker", /* Permission ID: 209 */
    B_CLIENT_SKIP_CHANNELGROUP_PERMISSIONS = "b_client_skip_channelgroup_permissions", /* Permission ID: 210 */
    B_CLIENT_FORCE_PUSH_TO_TALK = "b_client_force_push_to_talk", /* Permission ID: 211 */
    B_CLIENT_IGNORE_BANS = "b_client_ignore_bans", /* Permission ID: 212 */
    B_CLIENT_IGNORE_VPN = "b_client_ignore_vpn", /* Permission ID: 213 */
    B_CLIENT_IGNORE_ANTIFLOOD = "b_client_ignore_antiflood", /* Permission ID: 214 */
    B_CLIENT_ENFORCE_VALID_HWID = "b_client_enforce_valid_hwid", /* Permission ID: 215 */
    B_CLIENT_ALLOW_INVALID_PACKET = "b_client_allow_invalid_packet", /* Permission ID: 216 */
    B_CLIENT_ALLOW_INVALID_BADGES = "b_client_allow_invalid_badges", /* Permission ID: 217 */
    B_CLIENT_ISSUE_CLIENT_QUERY_COMMAND = "b_client_issue_client_query_command", /* Permission ID: 218 */
    B_CLIENT_USE_RESERVED_SLOT = "b_client_use_reserved_slot", /* Permission ID: 219 */
    B_CLIENT_USE_CHANNEL_COMMANDER = "b_client_use_channel_commander", /* Permission ID: 220 */
    B_CLIENT_REQUEST_TALKER = "b_client_request_talker", /* Permission ID: 221 */
    B_CLIENT_AVATAR_DELETE_OTHER = "b_client_avatar_delete_other", /* Permission ID: 222 */
    B_CLIENT_IS_STICKY = "b_client_is_sticky", /* Permission ID: 223 */
    B_CLIENT_IGNORE_STICKY = "b_client_ignore_sticky", /* Permission ID: 224 */
    B_CLIENT_MUSIC_CREATE_PERMANENT = "b_client_music_create_permanent", /* Permission ID: 225 */
    B_CLIENT_MUSIC_CREATE_SEMI_PERMANENT = "b_client_music_create_semi_permanent", /* Permission ID: 226 */
    B_CLIENT_MUSIC_CREATE_TEMPORARY = "b_client_music_create_temporary", /* Permission ID: 227 */
    B_CLIENT_MUSIC_MODIFY_PERMANENT = "b_client_music_modify_permanent", /* Permission ID: 228 */
    B_CLIENT_MUSIC_MODIFY_SEMI_PERMANENT = "b_client_music_modify_semi_permanent", /* Permission ID: 229 */
    B_CLIENT_MUSIC_MODIFY_TEMPORARY = "b_client_music_modify_temporary", /* Permission ID: 230 */
    I_CLIENT_MUSIC_CREATE_MODIFY_MAX_VOLUME = "i_client_music_create_modify_max_volume", /* Permission ID: 231 */
    I_CLIENT_MUSIC_LIMIT = "i_client_music_limit", /* Permission ID: 232 */
    I_CLIENT_MUSIC_NEEDED_DELETE_POWER = "i_client_music_needed_delete_power", /* Permission ID: 233 */
    I_CLIENT_MUSIC_DELETE_POWER = "i_client_music_delete_power", /* Permission ID: 234 */
    I_CLIENT_MUSIC_PLAY_POWER = "i_client_music_play_power", /* Permission ID: 235 */
    I_CLIENT_MUSIC_NEEDED_PLAY_POWER = "i_client_music_needed_play_power", /* Permission ID: 236 */
    I_CLIENT_MUSIC_MODIFY_POWER = "i_client_music_modify_power", /* Permission ID: 237 */
    I_CLIENT_MUSIC_NEEDED_MODIFY_POWER = "i_client_music_needed_modify_power", /* Permission ID: 238 */
    I_CLIENT_MUSIC_RENAME_POWER = "i_client_music_rename_power", /* Permission ID: 239 */
    I_CLIENT_MUSIC_NEEDED_RENAME_POWER = "i_client_music_needed_rename_power", /* Permission ID: 240 */
    B_PLAYLIST_CREATE = "b_playlist_create", /* Permission ID: 241 */
    I_PLAYLIST_VIEW_POWER = "i_playlist_view_power", /* Permission ID: 242 */
    I_PLAYLIST_NEEDED_VIEW_POWER = "i_playlist_needed_view_power", /* Permission ID: 243 */
    I_PLAYLIST_MODIFY_POWER = "i_playlist_modify_power", /* Permission ID: 244 */
    I_PLAYLIST_NEEDED_MODIFY_POWER = "i_playlist_needed_modify_power", /* Permission ID: 245 */
    I_PLAYLIST_PERMISSION_MODIFY_POWER = "i_playlist_permission_modify_power", /* Permission ID: 246 */
    I_PLAYLIST_NEEDED_PERMISSION_MODIFY_POWER = "i_playlist_needed_permission_modify_power", /* Permission ID: 247 */
    I_PLAYLIST_DELETE_POWER = "i_playlist_delete_power", /* Permission ID: 248 */
    I_PLAYLIST_NEEDED_DELETE_POWER = "i_playlist_needed_delete_power", /* Permission ID: 249 */
    I_PLAYLIST_SONG_ADD_POWER = "i_playlist_song_add_power", /* Permission ID: 250 */
    I_PLAYLIST_SONG_NEEDED_ADD_POWER = "i_playlist_song_needed_add_power", /* Permission ID: 251 */
    I_PLAYLIST_SONG_REMOVE_POWER = "i_playlist_song_remove_power", /* Permission ID: 254 */
    I_PLAYLIST_SONG_NEEDED_REMOVE_POWER = "i_playlist_song_needed_remove_power", /* Permission ID: 255 */
    B_CLIENT_INFO_VIEW = "b_client_info_view", /* Permission ID: 256 */
    B_CLIENT_PERMISSIONOVERVIEW_VIEW = "b_client_permissionoverview_view", /* Permission ID: 257 */
    B_CLIENT_PERMISSIONOVERVIEW_OWN = "b_client_permissionoverview_own", /* Permission ID: 258 */
    B_CLIENT_REMOTEADDRESS_VIEW = "b_client_remoteaddress_view", /* Permission ID: 259 */
    I_CLIENT_SERVERQUERY_VIEW_POWER = "i_client_serverquery_view_power", /* Permission ID: 260 */
    I_CLIENT_NEEDED_SERVERQUERY_VIEW_POWER = "i_client_needed_serverquery_view_power", /* Permission ID: 261 */
    B_CLIENT_CUSTOM_INFO_VIEW = "b_client_custom_info_view", /* Permission ID: 262 */
    B_CLIENT_MUSIC_CHANNEL_LIST = "b_client_music_channel_list", /* Permission ID: 263 */
    B_CLIENT_MUSIC_SERVER_LIST = "b_client_music_server_list", /* Permission ID: 264 */
    I_CLIENT_MUSIC_INFO = "i_client_music_info", /* Permission ID: 265 */
    I_CLIENT_MUSIC_NEEDED_INFO = "i_client_music_needed_info", /* Permission ID: 266 */
    I_CLIENT_KICK_FROM_SERVER_POWER = "i_client_kick_from_server_power", /* Permission ID: 267 */
    I_CLIENT_NEEDED_KICK_FROM_SERVER_POWER = "i_client_needed_kick_from_server_power", /* Permission ID: 268 */
    I_CLIENT_KICK_FROM_CHANNEL_POWER = "i_client_kick_from_channel_power", /* Permission ID: 269 */
    I_CLIENT_NEEDED_KICK_FROM_CHANNEL_POWER = "i_client_needed_kick_from_channel_power", /* Permission ID: 270 */
    I_CLIENT_BAN_POWER = "i_client_ban_power", /* Permission ID: 271 */
    I_CLIENT_NEEDED_BAN_POWER = "i_client_needed_ban_power", /* Permission ID: 272 */
    I_CLIENT_MOVE_POWER = "i_client_move_power", /* Permission ID: 273 */
    I_CLIENT_NEEDED_MOVE_POWER = "i_client_needed_move_power", /* Permission ID: 274 */
    I_CLIENT_COMPLAIN_POWER = "i_client_complain_power", /* Permission ID: 275 */
    I_CLIENT_NEEDED_COMPLAIN_POWER = "i_client_needed_complain_power", /* Permission ID: 276 */
    B_CLIENT_COMPLAIN_LIST = "b_client_complain_list", /* Permission ID: 277 */
    B_CLIENT_COMPLAIN_DELETE_OWN = "b_client_complain_delete_own", /* Permission ID: 278 */
    B_CLIENT_COMPLAIN_DELETE = "b_client_complain_delete", /* Permission ID: 279 */
    B_CLIENT_BAN_LIST = "b_client_ban_list", /* Permission ID: 280 */
    B_CLIENT_BAN_LIST_GLOBAL = "b_client_ban_list_global", /* Permission ID: 281 */
    B_CLIENT_BAN_TRIGGER_LIST = "b_client_ban_trigger_list", /* Permission ID: 282 */
    B_CLIENT_BAN_CREATE = "b_client_ban_create", /* Permission ID: 283 */
    B_CLIENT_BAN_CREATE_GLOBAL = "b_client_ban_create_global", /* Permission ID: 284 */
    B_CLIENT_BAN_NAME = "b_client_ban_name", /* Permission ID: 285 */
    B_CLIENT_BAN_IP = "b_client_ban_ip", /* Permission ID: 286 */
    B_CLIENT_BAN_HWID = "b_client_ban_hwid", /* Permission ID: 287 */
    B_CLIENT_BAN_EDIT = "b_client_ban_edit", /* Permission ID: 288 */
    B_CLIENT_BAN_EDIT_GLOBAL = "b_client_ban_edit_global", /* Permission ID: 289 */
    B_CLIENT_BAN_DELETE_OWN = "b_client_ban_delete_own", /* Permission ID: 290 */
    B_CLIENT_BAN_DELETE = "b_client_ban_delete", /* Permission ID: 291 */
    B_CLIENT_BAN_DELETE_OWN_GLOBAL = "b_client_ban_delete_own_global", /* Permission ID: 292 */
    B_CLIENT_BAN_DELETE_GLOBAL = "b_client_ban_delete_global", /* Permission ID: 293 */
    I_CLIENT_BAN_MAX_BANTIME = "i_client_ban_max_bantime", /* Permission ID: 294 */
    I_CLIENT_PRIVATE_TEXTMESSAGE_POWER = "i_client_private_textmessage_power", /* Permission ID: 295 */
    I_CLIENT_NEEDED_PRIVATE_TEXTMESSAGE_POWER = "i_client_needed_private_textmessage_power", /* Permission ID: 296 */
    B_CLIENT_EVEN_TEXTMESSAGE_SEND = "b_client_even_textmessage_send", /* Permission ID: 297 */
    B_CLIENT_SERVER_TEXTMESSAGE_SEND = "b_client_server_textmessage_send", /* Permission ID: 298 */
    B_CLIENT_CHANNEL_TEXTMESSAGE_SEND = "b_client_channel_textmessage_send", /* Permission ID: 299 */
    B_CLIENT_OFFLINE_TEXTMESSAGE_SEND = "b_client_offline_textmessage_send", /* Permission ID: 300 */
    I_CLIENT_TALK_POWER = "i_client_talk_power", /* Permission ID: 301 */
    I_CLIENT_NEEDED_TALK_POWER = "i_client_needed_talk_power", /* Permission ID: 302 */
    I_CLIENT_POKE_POWER = "i_client_poke_power", /* Permission ID: 303 */
    I_CLIENT_NEEDED_POKE_POWER = "i_client_needed_poke_power", /* Permission ID: 304 */
    B_CLIENT_SET_FLAG_TALKER = "b_client_set_flag_talker", /* Permission ID: 305 */
    I_CLIENT_WHISPER_POWER = "i_client_whisper_power", /* Permission ID: 306 */
    I_CLIENT_NEEDED_WHISPER_POWER = "i_client_needed_whisper_power", /* Permission ID: 307 */
    B_CLIENT_MODIFY_DESCRIPTION = "b_client_modify_description", /* Permission ID: 308 */
    B_CLIENT_MODIFY_OWN_DESCRIPTION = "b_client_modify_own_description", /* Permission ID: 309 */
    B_CLIENT_USE_BBCODE_ANY = "b_client_use_bbcode_any", /* Permission ID: 310 */
    B_CLIENT_USE_BBCODE_URL = "b_client_use_bbcode_url", /* Permission ID: 311 */
    B_CLIENT_USE_BBCODE_IMAGE = "b_client_use_bbcode_image", /* Permission ID: 312 */
    B_CLIENT_MODIFY_DBPROPERTIES = "b_client_modify_dbproperties", /* Permission ID: 313 */
    B_CLIENT_DELETE_DBPROPERTIES = "b_client_delete_dbproperties", /* Permission ID: 314 */
    B_CLIENT_CREATE_MODIFY_SERVERQUERY_LOGIN = "b_client_create_modify_serverquery_login", /* Permission ID: 315 */
    B_CLIENT_QUERY_CREATE = "b_client_query_create", /* Permission ID: 316 */
    B_CLIENT_QUERY_LIST = "b_client_query_list", /* Permission ID: 317 */
    B_CLIENT_QUERY_LIST_OWN = "b_client_query_list_own", /* Permission ID: 318 */
    B_CLIENT_QUERY_RENAME = "b_client_query_rename", /* Permission ID: 319 */
    B_CLIENT_QUERY_RENAME_OWN = "b_client_query_rename_own", /* Permission ID: 320 */
    B_CLIENT_QUERY_CHANGE_PASSWORD = "b_client_query_change_password", /* Permission ID: 321 */
    B_CLIENT_QUERY_CHANGE_OWN_PASSWORD = "b_client_query_change_own_password", /* Permission ID: 322 */
    B_CLIENT_QUERY_CHANGE_PASSWORD_GLOBAL = "b_client_query_change_password_global", /* Permission ID: 323 */
    B_CLIENT_QUERY_DELETE = "b_client_query_delete", /* Permission ID: 324 */
    B_CLIENT_QUERY_DELETE_OWN = "b_client_query_delete_own", /* Permission ID: 325 */
    B_FT_IGNORE_PASSWORD = "b_ft_ignore_password", /* Permission ID: 326 */
    B_FT_TRANSFER_LIST = "b_ft_transfer_list", /* Permission ID: 327 */
    I_FT_FILE_UPLOAD_POWER = "i_ft_file_upload_power", /* Permission ID: 328 */
    I_FT_NEEDED_FILE_UPLOAD_POWER = "i_ft_needed_file_upload_power", /* Permission ID: 329 */
    I_FT_FILE_DOWNLOAD_POWER = "i_ft_file_download_power", /* Permission ID: 330 */
    I_FT_NEEDED_FILE_DOWNLOAD_POWER = "i_ft_needed_file_download_power", /* Permission ID: 331 */
    I_FT_FILE_DELETE_POWER = "i_ft_file_delete_power", /* Permission ID: 332 */
    I_FT_NEEDED_FILE_DELETE_POWER = "i_ft_needed_file_delete_power", /* Permission ID: 333 */
    I_FT_FILE_RENAME_POWER = "i_ft_file_rename_power", /* Permission ID: 334 */
    I_FT_NEEDED_FILE_RENAME_POWER = "i_ft_needed_file_rename_power", /* Permission ID: 335 */
    I_FT_FILE_BROWSE_POWER = "i_ft_file_browse_power", /* Permission ID: 336 */
    I_FT_NEEDED_FILE_BROWSE_POWER = "i_ft_needed_file_browse_power", /* Permission ID: 337 */
    I_FT_DIRECTORY_CREATE_POWER = "i_ft_directory_create_power", /* Permission ID: 338 */
    I_FT_NEEDED_DIRECTORY_CREATE_POWER = "i_ft_needed_directory_create_power", /* Permission ID: 339 */
    I_FT_QUOTA_MB_DOWNLOAD_PER_CLIENT = "i_ft_quota_mb_download_per_client", /* Permission ID: 340 */
    I_FT_QUOTA_MB_UPLOAD_PER_CLIENT = "i_ft_quota_mb_upload_per_client", /* Permission ID: 341 */
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
            this.type.name,
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

class ChannelPermissionRequest {
    requested: number;
    channel_id: number;
    callback_success: ((_: PermissionValue[]) => any)[] = [];
    callback_error: ((_: any) => any)[] = [];
}

class TeaPermissionRequest {
    client_id?: number;
    channel_id?: number;
    playlist_id?: number;
    promise: LaterPromise<PermissionValue[]>;
}

class PermissionManager extends connection.AbstractCommandHandler {
    readonly handle: ConnectionHandler;

    permissionList: PermissionInfo[] = [];
    permissionGroups: PermissionGroup[] = [];
    neededPermissions: NeededPermissionValue[] = [];

    needed_permission_change_listener: {[permission: string]:(() => any)[]} = {};

    requests_channel_permissions: ChannelPermissionRequest[] = [];
    requests_client_permissions: TeaPermissionRequest[] = [];
    requests_client_channel_permissions: TeaPermissionRequest[] = [];
    requests_playlist_permissions: TeaPermissionRequest[] = [];

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

        this.requests_channel_permissions = undefined;
        this.requests_client_permissions = undefined;
        this.requests_client_channel_permissions = undefined;
        this.requests_playlist_permissions = undefined;

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
            case "notifyplaylistpermlist":
                this.onPlaylistPermList(command.arguments);
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
                 this.handle.serverConnection.send_command("channelpermlist", {"cid": channelId});
                 this.requests_channel_permissions.push(request);
             }
             request.callback_error.push(reject);
             request.callback_success.push(resolve);
        });
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

    requestClientPermissions(client_id: number) : Promise<PermissionValue[]> {
        for(let request of this.requests_client_permissions)
            if(request.client_id == client_id && request.promise.time() + 1000 > Date.now())
                return request.promise;

        let request: TeaPermissionRequest = {} as any;
        request.client_id = client_id;
        request.promise = new LaterPromise<PermissionValue[]>();

        this.handle.serverConnection.send_command("clientpermlist", {cldbid: client_id}).catch(error => {
            if(error instanceof CommandResult && error.id == ErrorID.EMPTY_RESULT)
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

        this.handle.serverConnection.send_command("channelclientpermlist", {cldbid: client_id, cid: channel_id}).catch(error => {
            if(error instanceof CommandResult && error.id == ErrorID.EMPTY_RESULT)
                request.promise.resolved([]);
            else
                request.promise.rejected(error);
        });

        this.requests_client_channel_permissions.push(request);
        return request.promise;
    }



    private onPlaylistPermList(json: any[]) {
        let playlist_id = parseInt(json[0]["playlist_id"]);
        let permissions = PermissionManager.parse_permission_bulk(json, this);
        for(let req of this.requests_playlist_permissions.slice(0)) {
            if(req.playlist_id == playlist_id) {
                this.requests_playlist_permissions.remove(req);
                req.promise.resolved(permissions);
            }
        }
    }

    requestPlaylistPermissions(playlist_id: number) : Promise<PermissionValue[]> {
        for(let request of this.requests_playlist_permissions)
            if(request.playlist_id == playlist_id && request.promise.time() + 1000 > Date.now())
                return request.promise;

        let request: TeaPermissionRequest = {} as any;
        request.playlist_id = playlist_id;
        request.promise = new LaterPromise<PermissionValue[]>();

        this.handle.serverConnection.send_command("playlistpermlist", {playlist_id: playlist_id}).catch(error => {
            if(error instanceof CommandResult && error.id == ErrorID.EMPTY_RESULT)
                request.promise.resolved([]);
            else
                request.promise.rejected(error);
        });

        this.requests_playlist_permissions.push(request);
        return request.promise;
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