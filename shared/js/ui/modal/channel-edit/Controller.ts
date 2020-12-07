import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import {ChannelEntry} from "tc-shared/tree/Channel";
import {ChannelEditableProperty} from "tc-shared/ui/modal/channel-edit/Definitions";

const spawnChannelEditNew = (connection: ConnectionHandler, channel: ChannelEntry) => {
};

class ChannelEditController {
    private readonly connection: ConnectionHandler;
    private readonly channel: ChannelEntry;

    constructor() {
        this.getChannelProperty("sortingOrder");
    }

    getChannelProperty<T extends keyof ChannelEditableProperty>(property: T) : ChannelEditableProperty[T] {

        const properties = this.channel.properties;

        /*
        switch (property) {
            case "name":
                return properties.channel_name;

            case "phoneticName":
                return properties.channel_name_phonetic;

            case "topic":
                return properties.channel_topic;

            case "description":
                return properties.channel_description;

            case "password":
                break;

        }
        */
        return undefined;
    }
}