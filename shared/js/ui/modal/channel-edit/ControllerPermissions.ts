import {ChannelPropertyPermission} from "tc-shared/ui/modal/channel-edit/Definitions";
import {PermissionManager} from "tc-shared/permission/PermissionManager";
import {ChannelEntry} from "tc-shared/tree/Channel";
import {ChannelTree} from "tc-shared/tree/ChannelTree";
import PermissionType from "tc-shared/permission/PermissionType";

export type ChannelPropertyPermissionsProvider<T extends keyof ChannelPropertyPermission> = {
    provider: (permissions: PermissionManager, channel: ChannelEntry | undefined, channelTree: ChannelTree) => ChannelPropertyPermission[T],
    registerUpdates: (callback: () => void, permissions: PermissionManager, channel: ChannelEntry | undefined, channelTree: ChannelTree) => (() => void)[],
};

export const ChannelPropertyPermissionsProviders: {[T in keyof ChannelPropertyPermission]?: ChannelPropertyPermissionsProvider<T>} = {};

const SimplePermissionProvider = (createPermission: PermissionType, editPermission: PermissionType) => {
    return {
        provider: (permissions, channel) => {
            return permissions.neededPermission(channel ? editPermission : createPermission).granted(1);
        },
        registerUpdates: (callback, permissions, channel) => [
            permissions.register_needed_permission(channel ? editPermission : createPermission, callback)
        ]
    };
}

ChannelPropertyPermissionsProviders["name"] = {
    provider: (permissions, channel) => {
        return channel ? permissions.neededPermission(PermissionType.B_CHANNEL_MODIFY_NAME).granted(1) : true;
    },
    registerUpdates: (callback, permissions) => [
        permissions.register_needed_permission(PermissionType.B_CHANNEL_MODIFY_NAME, callback)
    ]
}
ChannelPropertyPermissionsProviders["icon"] = SimplePermissionProvider(PermissionType.B_ICON_MANAGE, PermissionType.B_ICON_MANAGE);
ChannelPropertyPermissionsProviders["sortingOrder"] = SimplePermissionProvider(PermissionType.B_CHANNEL_CREATE_WITH_SORTORDER, PermissionType.B_CHANNEL_MODIFY_SORTORDER);
ChannelPropertyPermissionsProviders["description"] = SimplePermissionProvider(PermissionType.B_CHANNEL_CREATE_WITH_DESCRIPTION, PermissionType.B_CHANNEL_MODIFY_DESCRIPTION);
ChannelPropertyPermissionsProviders["topic"] = SimplePermissionProvider(PermissionType.B_CHANNEL_CREATE_WITH_TOPIC, PermissionType.B_CHANNEL_MODIFY_TOPIC);
ChannelPropertyPermissionsProviders["maxUsers"] = SimplePermissionProvider(PermissionType.B_CHANNEL_CREATE_WITH_MAXCLIENTS, PermissionType.B_CHANNEL_MODIFY_MAXCLIENTS);
ChannelPropertyPermissionsProviders["maxFamilyUsers"] = SimplePermissionProvider(PermissionType.B_CHANNEL_CREATE_WITH_MAXFAMILYCLIENTS, PermissionType.B_CHANNEL_MODIFY_MAXFAMILYCLIENTS);
ChannelPropertyPermissionsProviders["talkPower"] = SimplePermissionProvider(PermissionType.B_CHANNEL_CREATE_WITH_NEEDED_TALK_POWER, PermissionType.B_CHANNEL_MODIFY_NEEDED_TALK_POWER);
ChannelPropertyPermissionsProviders["encryptVoiceData"] = SimplePermissionProvider(PermissionType.B_CHANNEL_MODIFY_MAKE_CODEC_ENCRYPTED, PermissionType.B_CHANNEL_MODIFY_MAKE_CODEC_ENCRYPTED);
ChannelPropertyPermissionsProviders["password"] = {
    provider: (permissions, channel) => {
        return {
            editable: permissions.neededPermission(channel ? PermissionType.B_CHANNEL_MODIFY_PASSWORD : PermissionType.B_CHANNEL_CREATE_WITH_PASSWORD).granted(1),
            enforced: permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_MODIFY_WITH_FORCE_PASSWORD).granted(1),
        };
    },
    registerUpdates: (callback, permissions, channel) => [
        permissions.register_needed_permission(channel ? PermissionType.B_CHANNEL_MODIFY_PASSWORD : PermissionType.B_CHANNEL_CREATE_WITH_PASSWORD, callback),
        permissions.register_needed_permission(PermissionType.B_CHANNEL_CREATE_MODIFY_WITH_FORCE_PASSWORD, callback)
    ]
};
ChannelPropertyPermissionsProviders["channelType"] = {
    provider: (permissions, channel) => {
        return {
            permanent: permissions.neededPermission(channel ? PermissionType.B_CHANNEL_MODIFY_MAKE_PERMANENT : PermissionType.B_CHANNEL_CREATE_PERMANENT).granted(1),
            semiPermanent: permissions.neededPermission(channel ? PermissionType.B_CHANNEL_MODIFY_MAKE_SEMI_PERMANENT : PermissionType.B_CHANNEL_CREATE_SEMI_PERMANENT).granted(1),
            temporary: permissions.neededPermission(channel ? PermissionType.B_CHANNEL_MODIFY_MAKE_TEMPORARY : PermissionType.B_CHANNEL_CREATE_TEMPORARY).granted(1),
            default: permissions.neededPermission(channel ? PermissionType.B_CHANNEL_MODIFY_MAKE_DEFAULT : PermissionType.B_CHANNEL_CREATE_WITH_DEFAULT).granted(1),
        };
    },
    registerUpdates: (callback, permissions, channel) => [
        permissions.register_needed_permission(channel ? PermissionType.B_CHANNEL_MODIFY_MAKE_PERMANENT : PermissionType.B_CHANNEL_CREATE_PERMANENT, callback),
        permissions.register_needed_permission(channel ? PermissionType.B_CHANNEL_MODIFY_MAKE_SEMI_PERMANENT : PermissionType.B_CHANNEL_CREATE_SEMI_PERMANENT, callback),
        permissions.register_needed_permission(channel ? PermissionType.B_CHANNEL_MODIFY_MAKE_TEMPORARY : PermissionType.B_CHANNEL_CREATE_TEMPORARY, callback),
        permissions.register_needed_permission(channel ? PermissionType.B_CHANNEL_MODIFY_MAKE_DEFAULT : PermissionType.B_CHANNEL_CREATE_WITH_DEFAULT, callback),
    ]
};
ChannelPropertyPermissionsProviders["sidebarMode"] = SimplePermissionProvider(PermissionType.B_CHANNEL_CREATE_MODIFY_SIDEBAR_MODE, PermissionType.B_CHANNEL_CREATE_MODIFY_SIDEBAR_MODE);
ChannelPropertyPermissionsProviders["codec"] = {
    provider: (permissions) => {
        return {
            opusMusic: permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_MODIFY_WITH_CODEC_OPUSMUSIC).granted(1),
            opusVoice: permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_MODIFY_WITH_CODEC_OPUSVOICE).granted(1),
        };
    },
    registerUpdates: (callback, permissions) => [
        permissions.register_needed_permission(PermissionType.B_CHANNEL_CREATE_MODIFY_WITH_CODEC_OPUSMUSIC, callback),
        permissions.register_needed_permission(PermissionType.B_CHANNEL_CREATE_MODIFY_WITH_CODEC_OPUSVOICE, callback),
    ]
};
ChannelPropertyPermissionsProviders["codecQuality"] = SimplePermissionProvider(PermissionType.B_CHANNEL_MODIFY_CODEC_QUALITY, PermissionType.B_CHANNEL_MODIFY_CODEC_QUALITY);
ChannelPropertyPermissionsProviders["deleteDelay"] = {
    provider: permissions => {
        return {
            editable: permissions.neededPermission(PermissionType.B_CHANNEL_MODIFY_TEMP_DELETE_DELAY).granted(1),
            maxDelay: permissions.neededPermission(PermissionType.I_CHANNEL_CREATE_MODIFY_WITH_TEMP_DELETE_DELAY).valueNormalOr(-1)
        }
    },
    registerUpdates: (callback, permissions) => [
        permissions.register_needed_permission(PermissionType.B_CHANNEL_MODIFY_TEMP_DELETE_DELAY, callback),
        permissions.register_needed_permission(PermissionType.I_CHANNEL_CREATE_MODIFY_WITH_TEMP_DELETE_DELAY, callback),
    ]
};