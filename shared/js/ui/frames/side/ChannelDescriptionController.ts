import {ChannelEntry} from "tc-shared/tree/Channel";
import {Registry} from "tc-shared/events";
import {
    ChannelDescriptionStatus,
    ChannelDescriptionUiEvents
} from "tc-shared/ui/frames/side/ChannelDescriptionDefinitions";
import {CommandResult} from "tc-shared/connection/ServerConnectionDeclaration";
import {LogCategory, logError} from "tc-shared/log";
import {ErrorCode} from "tc-shared/connection/ErrorCode";

export class ChannelDescriptionController {
    readonly uiEvents: Registry<ChannelDescriptionUiEvents>;
    private currentChannel: ChannelEntry;
    private listenerChannel: (() => void)[];

    private descriptionSendPending = false;
    private cachedDescriptionStatus: ChannelDescriptionStatus;
    private cachedDescriptionAge: number;

    constructor() {
        this.uiEvents = new Registry<ChannelDescriptionUiEvents>();
        this.listenerChannel = [];

        this.uiEvents.on("query_description", () => this.notifyDescription());
        this.uiEvents.enableDebug("channel-description");

        this.cachedDescriptionAge = 0;
    }

    destroy() {
        this.listenerChannel.forEach(callback => callback());
        this.listenerChannel = [];

        this.currentChannel = undefined;

        this.uiEvents.destroy();
    }

    setChannel(channel: ChannelEntry) {
        if(this.currentChannel === channel) {
            return;
        }

        this.listenerChannel.forEach(callback => callback());
        this.listenerChannel = [];

        this.currentChannel = channel;
        this.cachedDescriptionStatus = undefined;

        if(channel) {
            this.listenerChannel.push(channel.events.on("notify_properties_updated", event => {
                if("channel_description" in event.updated_properties) {
                    this.notifyDescription().then(undefined);
                }
            }));

            this.listenerChannel.push(channel.events.on("notify_description_changed", () => {
                this.notifyDescription().then(undefined);
            }));
        }

        this.notifyDescription().then(undefined);
    }

    private async notifyDescription() {
        if(this.descriptionSendPending) {
            return;
        }

        this.descriptionSendPending = true;
        try {
            if(Date.now() - this.cachedDescriptionAge > 5000 || !this.cachedDescriptionStatus) {
                await this.updateCachedDescriptionStatus();
            }

            this.uiEvents.fire_react("notify_description", { status: this.cachedDescriptionStatus });
        } finally {
            this.descriptionSendPending = false;
        }
    }

    private async updateCachedDescriptionStatus() {
        if(this.currentChannel) {
            const handlerId = this.currentChannel.channelTree.client.handlerId;
            const result = await this.currentChannel.getChannelDescription(false);
            switch (result.status) {
                case "success":
                case "empty":
                    this.cachedDescriptionStatus = {
                        status: "success",
                        description: result.status === "success" ? result.description : undefined,
                        handlerId: handlerId
                    };
                    break;

                case "no-permissions":
                    this.cachedDescriptionStatus = {
                        status: "no-permissions",
                        failedPermission: result.failedPermission
                    };
                    break;

                case "error":
                default:
                    this.cachedDescriptionStatus = {
                        status: "error",
                        reason: result.message || tr("unknown query result"),
                    };
                    break;
            }
        } else {
            this.cachedDescriptionStatus = {
                status: "success",
                description: undefined,
                handlerId: "unknown"
            };
        }
        this.cachedDescriptionAge = Date.now();
    }
}