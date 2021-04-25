import {Registry} from "tc-events";
import {ModalChannelInfoEvents, ModalChannelInfoVariables} from "tc-shared/ui/modal/channel-info/Definitions";
import {IpcUiVariableProvider} from "tc-shared/ui/utils/IpcVariable";
import {ChannelEntry, ChannelProperties, ChannelType} from "tc-shared/tree/Channel";
import {CallOnce, ignorePromise} from "tc-shared/proto";
import {spawnModal} from "tc-shared/ui/react-elements/modal";
import _ from "lodash";

const kChannelUpdateMapping: {[key in keyof ChannelProperties]?: (keyof ModalChannelInfoVariables)[] } = {
    channel_name: [ "name" ],
    channel_description: [ "description" ],
    channel_topic: [ "topic" ],
    channel_conversation_history_length: [ "chatMode" ],
    channel_conversation_mode: [ "chatMode" ],
    channel_maxclients: [ "currentClients" ],
    channel_maxfamilyclients: [ "currentClients" ],
    channel_flag_maxclients_unlimited: [ "currentClients" ],
    channel_flag_maxfamilyclients_unlimited: [ "currentClients" ],
    channel_flag_maxfamilyclients_inherited: [ "currentClients" ],
    channel_codec_quality: [ "audioCodec" ],
    channel_codec: [ "audioCodec" ],
    channel_codec_is_unencrypted: [ "audioEncrypted" ],
    channel_flag_password: [ "password" ],
    channel_flag_semi_permanent: [ "type" ],
    channel_flag_permanent: [ "type" ],
    channel_delete_delay: [ "type" ],
    channel_flag_default: [ "type" ],
}

class Controller {
    readonly channel: ChannelEntry;
    readonly events: Registry<ModalChannelInfoEvents>;
    readonly variables: IpcUiVariableProvider<ModalChannelInfoVariables>;

    private channelEvents: (() => void)[];

    constructor(channel: ChannelEntry) {
        this.channel = channel;
        this.events = new Registry<ModalChannelInfoEvents>();
        this.variables = new IpcUiVariableProvider<ModalChannelInfoVariables>();

        this.initialize();
    }

    @CallOnce
    destroy() {
        this.channelEvents?.forEach(callback => callback());
        this.channelEvents = undefined;

        this.events.destroy();
        this.variables.destroy();
    }

    @CallOnce
    initialize() {
        this.variables.setVariableProvider("name", () => this.channel.properties.channel_name);
        this.variables.setVariableProvider("type", () => {
            switch (this.channel.getChannelType()) {
                case ChannelType.PERMANENT:
                    return "permanent";

                case ChannelType.SEMI_PERMANENT:
                    return "semi-permanent";

                case ChannelType.TEMPORARY:
                    return "temporary";

                default:
                    return "unknown";
            }
        });
        this.variables.setVariableProvider("chatMode", () => {
            if(this.channel.properties.channel_conversation_mode === 0 || this.channel.properties.channel_flag_password) {
                return { mode: "private" };
            } else if(this.channel.properties.channel_conversation_mode === 1) {
                return { mode: "public", history: this.channel.properties.channel_conversation_history_length };
            } else {
                return { mode: "none" };
            }
        });
        this.variables.setVariableProvider("currentClients", () => {
            if(!this.channel.isSubscribed()) {
                return { status: "unsubscribed" };
            }

            let limit;
            if(!this.channel.properties.channel_flag_maxclients_unlimited) {
                limit = this.channel.properties.channel_maxclients;
            } else if(!this.channel.properties.channel_flag_maxfamilyclients_unlimited) {
                if(this.channel.properties.channel_flag_maxfamilyclients_inherited) {
                    limit = "inherited";
                } else {
                    limit = this.channel.properties.channel_maxfamilyclients;
                }
            } else {
                limit = "unlimited";
            }

            return {
                status: "subscribed",
                online: this.channel.clients().length,
                limit: limit
            };
        });
        this.variables.setVariableProvider("audioCodec", () => ({
            codec: this.channel.properties.channel_codec,
            quality: this.channel.properties.channel_codec_quality
        }));
        this.variables.setVariableProvider("audioEncrypted", () => ({
            channel: this.channel.properties.channel_codec_is_unencrypted,
            server: this.channel.channelTree.server.getAudioEncryptionMode()
        }));
        this.variables.setVariableProvider("password", () => this.channel.properties.channel_flag_password);
        this.variables.setVariableProvider("topic", () => this.channel.properties.channel_topic);
        this.variables.setVariableProvider("description", async () => await this.channel.getChannelDescription(false));

        this.events.on("action_reload_description", () => {
            this.channel.clearDescriptionCache();
            this.variables.sendVariable("description");
        })

        this.channelEvents = [];
        this.channelEvents.push(this.channel.events.on("notify_properties_updated", event => {
            const updatedVariables = new Set<keyof ModalChannelInfoVariables>();
            for(const key of Object.keys(event.updated_properties)) {
                kChannelUpdateMapping[key]?.forEach(update => updatedVariables.add(update));
            }

            updatedVariables.forEach(entry => this.variables.sendVariable(entry));
        }));
        this.channelEvents.push(this.channel.events.on("notify_subscribe_state_changed", () => {
            this.variables.sendVariable("currentClients");
        }));
        this.channelEvents.push(this.channel.channelTree.events.on("notify_client_enter_view", event => {
            if(event.targetChannel === this.channel) {
                this.variables.sendVariable("currentClients");
            }
        }));
        this.channelEvents.push(this.channel.channelTree.events.on("notify_client_moved", event => {
            if(event.oldChannel === this.channel || event.newChannel === this.channel) {
                this.variables.sendVariable("currentClients");
            }
        }));
        this.channelEvents.push(this.channel.channelTree.events.on("notify_client_leave_view", event => {
            if(event.sourceChannel === this.channel) {
                this.variables.sendVariable("currentClients");
            }
        }));
    }
}

export function spawnChannelInfo(channel: ChannelEntry) {
    const controller = new Controller(channel);
    controller.initialize();

    const modal = spawnModal("channel-info", [
        controller.events.generateIpcDescription(),
        controller.variables.generateConsumerDescription(),
    ], {
        popoutable: true
    });

    modal.getEvents().on("destroy", () => controller.destroy());
    ignorePromise(modal.show());
}