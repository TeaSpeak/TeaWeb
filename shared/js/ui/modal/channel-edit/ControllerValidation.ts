import {ChannelEditableProperty} from "tc-shared/ui/modal/channel-edit/Definitions";
import {ChannelEntry, ChannelProperties} from "tc-shared/tree/Channel";
import {ChannelTree} from "tc-shared/tree/ChannelTree";
import {PermissionManager} from "tc-shared/permission/PermissionManager";
import PermissionType from "tc-shared/permission/PermissionType";

export const ChannelPropertyValidators: {[T in keyof ChannelEditableProperty]?: (
    currentProperties: ChannelProperties,
    originalProperties: ChannelProperties,
    channel: ChannelEntry | undefined,
    parent: ChannelEntry | undefined,
    permissions: PermissionManager,
    channelTree: ChannelTree
) => boolean} = {};

ChannelPropertyValidators["name"] = properties => properties.channel_name.length > 0 && properties.channel_name.length <= 30;
ChannelPropertyValidators["phoneticName"] = properties => properties.channel_name_phonetic.length >= 0 && properties.channel_name_phonetic.length <= 30;
ChannelPropertyValidators["password"] = (currentProperties, originalProperties, _channel, _parent, permissions) => {
    if(!currentProperties.channel_flag_password) {
        if(permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_MODIFY_WITH_FORCE_PASSWORD).granted(1)) {
            return false;
        }
    }
    return true;
}