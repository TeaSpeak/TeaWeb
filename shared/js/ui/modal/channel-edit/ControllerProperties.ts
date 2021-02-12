import {ChannelEntry, ChannelNameParser, ChannelProperties, ChannelSidebarMode} from "tc-shared/tree/Channel";
import {ChannelEditableProperty} from "tc-shared/ui/modal/channel-edit/Definitions";
import {ChannelTree} from "tc-shared/tree/ChannelTree";
import {ServerFeature} from "tc-shared/connection/ServerFeatures";

export type ChannelPropertyProvider<T extends keyof ChannelEditableProperty> = {
    provider: (properties: ChannelProperties, channel: ChannelEntry | undefined, parentChannel: ChannelEntry | undefined, channelTree: ChannelTree) => Promise<ChannelEditableProperty[T]>,
    applier: (value: ChannelEditableProperty[T], properties: Partial<ChannelProperties>, channel: ChannelEntry | undefined) => void
};

export const ChannelPropertyProviders: {[T in keyof ChannelEditableProperty]?: ChannelPropertyProvider<T>} = {};

const SimplePropertyProvider = <P extends keyof ChannelProperties>(channelProperty: P, defaultValue: ChannelProperties[P]) => {
    return {
        provider: async properties => typeof properties[channelProperty] === "undefined" ? defaultValue : properties[channelProperty],
        applier: (value, properties) => properties[channelProperty] = value
    };
}

ChannelPropertyProviders["name"] = {
    provider: async (properties, channel, parentChannel, channelTree) => {
        let spacerUniqueId = 0;
        const hasParent = !!(channel?.hasParent() || parentChannel);
        if(!hasParent) {
            const channels = channelTree.rootChannel();
            while(true) {
                let matchFound = false;
                for(const channel of channels) {
                    if(channel.parsed_channel_name.uniqueId === spacerUniqueId.toString()) {
                        matchFound = true;
                        break;
                    }
                }

                if(!matchFound) {
                    break;
                }

                spacerUniqueId++;
            }
        }

        const parsed = new ChannelNameParser(properties.channel_name, hasParent);
        return {
            rawName: properties.channel_name,
            spacerUniqueId: parsed.uniqueId || spacerUniqueId.toString(),
            hasParent,
            maxNameLength: 30 - (parsed.originalName.length - parsed.text.length),
            parsedAlignment: parsed.alignment,
            parsedName: parsed.text
        }
    },
    applier: (value, properties) => properties.channel_name = value.rawName
}
ChannelPropertyProviders["phoneticName"] = SimplePropertyProvider("channel_name_phonetic", "");
ChannelPropertyProviders["icon"] = {
    provider: async (properties, _channel, _parentChannel, channelTree) => {
        return {
            iconId: properties.channel_icon_id,
            remoteIcon: {
                iconId: properties.channel_icon_id,
                serverUniqueId: channelTree.server.properties.virtualserver_unique_identifier,
                handlerId: channelTree.client.handlerId
            }
        }
    },
    applier: (value, properties) => properties.channel_icon_id = value.iconId
};
ChannelPropertyProviders["type"] = {
    provider: async (properties, channel) => {
        let type;
        if(properties.channel_flag_default) {
            type = "default";
        } else if(properties.channel_flag_permanent) {
            type = "permanent";
        } else if(properties.channel_flag_semi_permanent) {
            type = "semi-permanent";
        } else {
            type = "temporary";
        }

        return {
            type: type,
            originallyDefault: !!channel?.properties.channel_flag_default
        };
    },
    applier: (value, properties) => {
        properties["channel_flag_default"] = false;
        properties["channel_flag_permanent"] = false;
        properties["channel_flag_semi_permanent"] = false;

        switch (value.type) {
            case "default":
                properties["channel_flag_permanent"] = true;
                properties["channel_flag_default"] = true;
                break;

            case "permanent":
                properties["channel_flag_permanent"] = true;
                break;

            case "semi-permanent":
                properties["channel_flag_semi_permanent"] = true;
                break;

            case "temporary":
                /* Nothing to do, default state */
        }
    }
}
ChannelPropertyProviders["sideBar"] = {
    provider: async (properties, channel, parentChannel, channelTree) => {
        const features = channelTree.client.serverFeatures;

        if(!features.supportsFeature(ServerFeature.SIDEBAR_MODE)) {
            return "not-supported";
        }

        switch (properties.channel_sidebar_mode) {
            case ChannelSidebarMode.FileTransfer:
                return "file-transfer";
            case ChannelSidebarMode.Description:
                return "description";
            case ChannelSidebarMode.Conversation:
                return "conversation";
            case ChannelSidebarMode.Unknown:
            default:
                return "unknown";
        }
    },
    applier: (value, properties) => {
        switch (value) {
            case "file-transfer":
                properties.channel_sidebar_mode = ChannelSidebarMode.FileTransfer;
                break;

            case "conversation":
                properties.channel_sidebar_mode = ChannelSidebarMode.Conversation;
                break;

            case "description":
                properties.channel_sidebar_mode = ChannelSidebarMode.Description;
                break;
        }
    }
}
ChannelPropertyProviders["password"] = {
    provider: async properties => properties.channel_flag_password ? { state: "set" } : { state: "clear" },
    applier: (value, properties) => {
        if(value.state === "set") {
            properties.channel_flag_password = true;
            /* FIXME: Hash the password! */
            properties.channel_password = value.password;
        } else {
            properties.channel_flag_password = false;
        }
    }
}
ChannelPropertyProviders["sortingOrder"] = {
    provider: async (properties, channel, parentChannel, channelTree) => {
        const availableChannels: { channelName: string, channelId: number }[] = [];

        let channelSibling: ChannelEntry = parentChannel ? parentChannel.child_channel_head : channelTree.get_first_channel();
        while(channelSibling) {
            availableChannels.push({ channelId: channelSibling.channelId, channelName: channelSibling.properties.channel_name });
            channelSibling = channelSibling.channel_next;
        }

        return {
            previousChannelId: typeof properties.channel_order === "undefined" ? 0 : properties.channel_order,
            availableChannels: availableChannels
        }
    },
    applier: (value, properties) => properties.channel_order = value.previousChannelId
};
ChannelPropertyProviders["topic"] = SimplePropertyProvider("channel_topic", "");
ChannelPropertyProviders["description"] = {
    provider: async (properties, channel) => {
        if(typeof properties.channel_description !== "undefined" && (properties.channel_description.length !== 0 || channel?.isDescriptionCached())) {
            return properties.channel_description;
        } else if(channel) {
            return await channel.getChannelDescription();
        } else {
            return "";
        }
    },
    applier: (value, properties) => properties.channel_description = value
};
ChannelPropertyProviders["codec"] = {
    provider: async properties => {
        return {
            type: properties.channel_codec,
            quality: properties.channel_codec_quality
        };
    },
    applier: (value, properties) => {
        properties.channel_codec = value.type;
        properties.channel_codec_quality = value.quality;
    }
}
ChannelPropertyProviders["talkPower"] = SimplePropertyProvider("channel_needed_talk_power", 0);
ChannelPropertyProviders["encryptedVoiceData"] = {
    provider: async (properties, channel, parentChannel, channelTree) => {
        let serverSetting: "encrypted" | "unencrypted" | "individual";
        switch (channelTree.server.properties.virtualserver_codec_encryption_mode) {
            case 1:
                serverSetting = "unencrypted";
                break;

            case 2:
                serverSetting = "encrypted";
                break;

            default:
                serverSetting = "individual";
                break;
        }

        return {
            encrypted: properties.channel_codec_is_unencrypted,
            serverSetting: serverSetting
        };
    },
    applier: (value, properties) => properties.channel_codec_is_unencrypted = value.encrypted
}
ChannelPropertyProviders["maxUsers"] = {
    provider: async properties => {
        if(properties.channel_flag_maxclients_unlimited) {
            return "unlimited";
        }
        return properties.channel_maxclients;
    },
    applier: (value, properties) => {
        if(value === "unlimited") {
            properties.channel_flag_maxclients_unlimited = true;
        } else {
            properties.channel_flag_maxclients_unlimited = false;
            properties.channel_maxclients = value;
        }
    }
}
ChannelPropertyProviders["maxFamilyUsers"] = {
    provider: async (properties) => {
        if(properties.channel_flag_maxfamilyclients_unlimited) {
            return "unlimited";
        } else if(properties.channel_flag_maxfamilyclients_inherited) {
            return "inherited";
        } else {
            return properties.channel_maxfamilyclients;
        }
    },
    applier: (value, properties) => {
        if(value === "unlimited") {
            properties.channel_flag_maxfamilyclients_unlimited = true;
            properties.channel_flag_maxfamilyclients_inherited = false;
        } else if(value === "inherited") {
            properties.channel_flag_maxfamilyclients_unlimited = false;
            properties.channel_flag_maxfamilyclients_inherited = true;
        } else {
            properties.channel_flag_maxfamilyclients_unlimited = false;
            properties.channel_flag_maxfamilyclients_inherited = false;
            properties.channel_maxfamilyclients = value;
        }
    }
}
ChannelPropertyProviders["deleteDelay"] = SimplePropertyProvider("channel_delete_delay", 60);