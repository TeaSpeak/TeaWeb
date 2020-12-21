import {ChannelEntry, ChannelProperties} from "tc-shared/tree/Channel";
import {ChannelEditableProperty} from "tc-shared/ui/modal/channel-edit/Definitions";
import {ChannelTree} from "tc-shared/tree/ChannelTree";

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

ChannelPropertyProviders["name"] = SimplePropertyProvider("channel_name", "");
ChannelPropertyProviders["phoneticName"] = SimplePropertyProvider("channel_name_phonetic", "");
ChannelPropertyProviders["type"] = {
    provider: async properties => {
        if(properties.channel_flag_default) {
            return "default";
        } else if(properties.channel_flag_permanent) {
            return "permanent";
        } else if(properties.channel_flag_semi_permanent) {
            return "semi-permanent";
        } else {
            return "temporary";
        }
    },
    applier: (value, properties) => {
        properties["channel_flag_default"] = false;
        properties["channel_flag_permanent"] = false;
        properties["channel_flag_semi_permanent"] = false;

        switch (value) {
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
        if(channel) {
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
ChannelPropertyProviders["encryptedVoiceData"] = SimplePropertyProvider("channel_codec_is_unencrypted", true);
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