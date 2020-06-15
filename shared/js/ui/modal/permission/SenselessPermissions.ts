import PermissionType from "tc-shared/permission/PermissionType";

export const senseless_server_group_permissions: PermissionType[] = [
    PermissionType.B_CHANNEL_GROUP_INHERITANCE_END
];

const filter = (text, ignore_type) => Object.keys(PermissionType)
    .filter(e => e.toLowerCase().substr(ignore_type ? 1 : 0).startsWith(text)).map(e => PermissionType[e]);

export const senseless_channel_group_permissions: PermissionType[] = [
    //Not sensefull to assign serverinstance permission to channel groups
    ...Object.keys(PermissionType).filter(e => e.toLowerCase().startsWith("b_serverinstance_")).map(e => PermissionType[e]),
    PermissionType.B_SERVERQUERY_LOGIN,

    //Not sensefull to assign virtual server permission to channel groups
    ...Object.keys(PermissionType).filter(e => e.toLowerCase().startsWith("b_virtualserver") && e.toLowerCase() === "b_virtualserver_channel_permission_list").map(e => PermissionType[e]),

    //Not sensefull to require some playlist permissions
    ...Object.keys(PermissionType).filter(e => e.toLowerCase().startsWith("i_playlist")).map(e => PermissionType[e]),
    PermissionType.B_PLAYLIST_CREATE,

    //Not sensefull to require some playlist permissions
    ...Object.keys(PermissionType).filter(e => e.toLowerCase().startsWith("i_client_music")).map(e => PermissionType[e]),
    ...Object.keys(PermissionType).filter(e => e.toLowerCase().startsWith("b_client_music")).map(e => PermissionType[e]),

    ...Object.keys(PermissionType).filter(e => e.toLowerCase().startsWith("i_server_group")).map(e => PermissionType[e]),

    PermissionType.I_MAX_ICON_FILESIZE,
    PermissionType.I_MAX_PLAYLIST_SIZE,
    PermissionType.I_MAX_PLAYLISTS,

    PermissionType.I_CLIENT_KICK_FROM_SERVER_POWER, //Why should channel groups kick clients from server. Yes there are cases, but not the usual once
    PermissionType.I_CLIENT_NEEDED_KICK_FROM_SERVER_POWER,

    PermissionType.I_CLIENT_BAN_POWER, //Why should channel groups ban clients from server. Yes there are cases, but not the usual once
    PermissionType.I_CLIENT_NEEDED_BAN_POWER,

    ...Object.keys(PermissionType).filter(e => e.toLowerCase().startsWith("b_client_complain")).map(e => PermissionType[e]),
    ...Object.keys(PermissionType).filter(e => e.toLowerCase().startsWith("b_client_ban")).map(e => PermissionType[e]),
    PermissionType.I_CLIENT_BAN_MAX_BANTIME,
    PermissionType.B_CLIENT_SERVER_TEXTMESSAGE_SEND,


    ...Object.keys(PermissionType).filter(e => e.toLowerCase().startsWith("b_client_query")).map(e => PermissionType[e]),
    PermissionType.B_CLIENT_CREATE_MODIFY_SERVERQUERY_LOGIN,
    PermissionType.B_CLIENT_DELETE_DBPROPERTIES,
    PermissionType.B_CLIENT_MODIFY_DBPROPERTIES
];

export const senseless_channel_permissions: PermissionType[] = [
    ...senseless_channel_group_permissions, //Powers and needed powers are not inherited here. We "hide" all powers

    ...filter("_channel_create", true),
    ...filter("_client", true),
    ...filter("_channel_group", true),
    ...filter("_group", true),
    ...filter("b_channel_", false),
    ...Object.keys(PermissionType).filter(e => {
        e = e.toLowerCase();
        return e.indexOf("_power") > 0 && e.indexOf("_needed_") == -1;
    }).map(e => PermissionType[e]),

    PermissionType.B_ICON_MANAGE,
    PermissionType.B_CLIENT_USE_PRIORITY_SPEAKER,
    PermissionType.B_CLIENT_USE_PRIORITY_SPEAKER,
    PermissionType.B_CHANNEL_IGNORE_DESCRIPTION_VIEW_POWER
];

export const senseless_client_permissions: PermissionType[] = [ ];

export const senseless_client_channel_permissions: PermissionType[] = [ ];