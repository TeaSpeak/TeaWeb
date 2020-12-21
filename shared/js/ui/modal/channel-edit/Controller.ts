import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import {ChannelEntry, ChannelProperties} from "tc-shared/tree/Channel";
import {ChannelEditEvents, ChannelPropertyPermission} from "tc-shared/ui/modal/channel-edit/Definitions";
import {Registry} from "tc-shared/events";
import {ChannelPropertyProviders} from "tc-shared/ui/modal/channel-edit/ControllerProperties";
import {LogCategory, logError} from "tc-shared/log";
import {ChannelPropertyPermissionsProviders} from "tc-shared/ui/modal/channel-edit/ControllerPermissions";
import {spawnReactModal} from "tc-shared/ui/react-elements/Modal";
import {ChannelEditModal} from "tc-shared/ui/modal/channel-edit/Renderer";
import {PermissionValue} from "tc-shared/permission/PermissionManager";

export const spawnChannelEditNew = (connection: ConnectionHandler, channel: ChannelEntry | undefined, parent: ChannelEntry | undefined, callback: (properties?: ChannelProperties, permissions?: PermissionValue[]) => void) => {
    const controller = new ChannelEditController(connection, channel);
    const modal = spawnReactModal(ChannelEditModal, controller.uiEvents, typeof channel === "number");
    modal.show().then(undefined);


    modal.events.on("destroy", () => {
        controller.destroy();
    });
};

class ChannelEditController {
    readonly uiEvents: Registry<ChannelEditEvents>;

    private readonly listenerPermissions: (() => void)[];

    private readonly connection: ConnectionHandler;
    private readonly channel: ChannelEntry | undefined;

    private readonly originalProperties: ChannelProperties;
    private currentProperties: ChannelProperties;

    constructor(connection: ConnectionHandler, channel: ChannelEntry | undefined) {
        this.connection = connection;
        this.channel = channel;
        this.uiEvents = new Registry<ChannelEditEvents>();

        this.uiEvents.on("query_property", event => {
            if (typeof ChannelPropertyProviders[event.property] !== "object") {
                logError(LogCategory.CHANNEL, tr("Channel edit controller missing property provider %s."), event.property);
                return;
            }

            ChannelPropertyProviders[event.property as any].provider(this.currentProperties, this.channel, this.channel?.parent_channel(), this.connection.channelTree).then(value => {
                this.uiEvents.fire_react("notify_property", {
                    property: event.property,
                    value: value
                });
            }).catch(error => {
                logError(LogCategory.CHANNEL, tr("Failed to get property value for %s: %o"), event.property, error);
            });
        });

        this.uiEvents.on("query_property_permission", event => this.notifyPropertyPermission(event.permission));

        this.listenerPermissions = [];
        for(const key of Object.keys(ChannelPropertyPermissionsProviders)) {
            const provider = ChannelPropertyPermissionsProviders[key];
            this.listenerPermissions.push(
                ...provider.registerUpdates(() => this.notifyPropertyPermission(key as any), this.connection.permissions, this.channel, this.connection.channelTree)
            );
        }

        if(channel) {
            this.originalProperties = channel.properties;
        } else {
            this.originalProperties = new ChannelProperties();
        }

        /* FIXME: Correctly setup the currentProperties! */
        this.currentProperties = new ChannelProperties();
    }

    destroy() {
        this.listenerPermissions.forEach(callback => callback());
        this.listenerPermissions.splice(0,  this.listenerPermissions.length);

        this.uiEvents.destroy();
    }

    private notifyPropertyPermission(permission: keyof ChannelPropertyPermission) {
        if (typeof ChannelPropertyPermissionsProviders[permission] !== "object") {
            logError(LogCategory.CHANNEL, tr("Channel edit controller missing property permission provider %s."), permission);
            return;
        }

        const value = ChannelPropertyPermissionsProviders[permission].provider(this.connection.permissions, this.channel, this.connection.channelTree);
        this.uiEvents.fire_react("notify_property_permission", {
            permission: permission,
            value: value
        });
    }
}
