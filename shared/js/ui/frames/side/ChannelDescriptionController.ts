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
        try {
            let description;
            if(this.currentChannel) {
                description = await new Promise<any>((resolve, reject) => {
                    this.currentChannel.getChannelDescription().then(resolve).catch(reject);
                    setTimeout(() => reject(tr("timeout")), 5000);
                });
            }

            this.cachedDescriptionStatus = {
                status: "success",
                description: description,
                handlerId: this.currentChannel?.channelTree.client.handlerId || "unknown"
            };
        } catch (error) {
            if(error instanceof CommandResult) {
                if(error.id === ErrorCode.SERVER_INSUFFICIENT_PERMISSIONS) {
                    const permission = this.currentChannel?.channelTree.client.permissions.resolveInfo(parseInt(error.json["failed_permid"]));
                    this.cachedDescriptionStatus = {
                        status: "no-permissions",
                        failedPermission: permission ? permission.name : "unknown"
                    };
                    return;
                }

                error = error.formattedMessage();
            } else if(typeof error !== "string") {
                logError(LogCategory.GENERAL, tr("Failed to get channel descriptions: %o"), error);
                error = tr("lookup the console");
            }

            this.cachedDescriptionStatus = {
                status: "error",
                reason: error
            };
        }
        this.cachedDescriptionAge = Date.now();
    }
}