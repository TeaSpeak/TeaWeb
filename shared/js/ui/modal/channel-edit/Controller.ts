import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import {ChannelEntry, ChannelProperties} from "tc-shared/tree/Channel";
import {
    ChannelEditablePermissions,
    ChannelEditableProperty,
    ChannelEditEvents,
    ChannelPropertyPermission
} from "tc-shared/ui/modal/channel-edit/Definitions";
import {Registry} from "tc-shared/events";
import {ChannelPropertyProviders} from "tc-shared/ui/modal/channel-edit/ControllerProperties";
import {LogCategory, logDebug, logError} from "tc-shared/log";
import {ChannelPropertyPermissionsProviders} from "tc-shared/ui/modal/channel-edit/ControllerPermissions";
import {spawnModal} from "tc-shared/ui/react-elements/modal";
import {PermissionValue} from "tc-shared/permission/PermissionManager";
import {CommandResult} from "tc-shared/connection/ServerConnectionDeclaration";
import PermissionType from "tc-shared/permission/PermissionType";
import {ChannelPropertyValidators} from "tc-shared/ui/modal/channel-edit/ControllerValidation";
import {hashPassword} from "tc-shared/utils/helpers";
import {ErrorCode} from "tc-shared/connection/ErrorCode";
import {spawnIconSelect} from "tc-shared/ui/modal/ModalIconSelect";

export type ChannelEditCallback = (properties: Partial<ChannelProperties>, permissions: ChannelEditChangedPermission[]) => void;
export type ChannelEditChangedPermission = { permission: PermissionType, value: number };

export const spawnChannelEditNew = (connection: ConnectionHandler, channel: ChannelEntry | undefined, parent: ChannelEntry | undefined, callback: ChannelEditCallback) => {
    const controller = new ChannelEditController(connection, channel, parent);
    const modal = spawnModal("channel-edit", [controller.uiEvents.generateIpcDescription(), typeof channel !== "object"], {
        popedOut: false,
        popoutable: true
    });
    modal.show().then(undefined);

    modal.getEvents().on("destroy", () => {
        controller.destroy();
    });

    controller.uiEvents.one("action_cancel", () => modal.destroy());
    controller.uiEvents.on("action_apply", async () => {
        if(!controller.validateAllProperties()) {
            return;
        }

        const changedProperties = controller.getChangedProperties();
        if("channel_password" in changedProperties) {
            changedProperties.channel_password = await hashPassword(changedProperties.channel_password);
        }

        logDebug(LogCategory.CHANNEL, tr("Updating channel properties: %o"), changedProperties);
        logDebug(LogCategory.CHANNEL, tr("Updating channel permissions: %o"), controller.getChangedPermissions());
        callback(changedProperties, controller.getChangedPermissions());
        modal.destroy();
    });
};

type PermissionCacheState = {
    state: "loaded",
    permissions: PermissionValue[]
} | {
    state: "loading",
    promise: Promise<void>
} | {
    state: "uninitialized",
} | {
    state: "error",
    reason: string
} | {
    state: "no-permissions",
    failedPermission: string
};

function permissionFromEditablePermission(permission: ChannelEditablePermissions) : PermissionType {
    switch (permission) {
        case "join": return PermissionType.I_CHANNEL_NEEDED_JOIN_POWER;
        case "view": return PermissionType.I_CHANNEL_NEEDED_VIEW_POWER;
        case "view-description": return PermissionType.I_CHANNEL_NEEDED_DESCRIPTION_VIEW_POWER;
        case "subscribe": return PermissionType.I_CHANNEL_NEEDED_SUBSCRIBE_POWER;
        case "modify": return PermissionType.I_CHANNEL_NEEDED_MODIFY_POWER;
        case "delete": return PermissionType.I_CHANNEL_NEEDED_DELETE_POWER;

        case "browse": return PermissionType.I_FT_NEEDED_FILE_BROWSE_POWER;
        case "upload": return PermissionType.I_FT_NEEDED_FILE_UPLOAD_POWER;
        case "download": return PermissionType.I_FT_NEEDED_FILE_DOWNLOAD_POWER;
        case "rename": return PermissionType.I_FT_NEEDED_FILE_RENAME_POWER;
        case "directory-create": return PermissionType.I_FT_NEEDED_DIRECTORY_CREATE_POWER;
        case "file-delete": return PermissionType.I_FT_NEEDED_FILE_DELETE_POWER;

        default:
            throw tr("invalid editable permission");
    }
}

class ChannelEditController {
    readonly uiEvents: Registry<ChannelEditEvents>;

    private readonly listenerPermissions: (() => void)[];

    private readonly connection: ConnectionHandler;
    private readonly channelParent: ChannelEntry | undefined;
    private readonly channel: ChannelEntry | undefined;

    private readonly originalProperties: ChannelProperties;
    private readonly currentProperties: ChannelProperties;

    private propertyValidationStates: {[T in keyof ChannelEditableProperty]?: boolean} = {};

    private cachedChannelPermissions: PermissionCacheState;
    private currentChannelPermissions: {[T in keyof ChannelEditablePermissions]?: number} = {};

    constructor(connection: ConnectionHandler, channel: ChannelEntry | undefined, channelParent: ChannelEntry | undefined) {
        this.connection = connection;
        this.channel = channel;
        this.channelParent = channelParent;
        this.uiEvents = new Registry<ChannelEditEvents>();

        this.uiEvents.on("query_property", event => this.notifyProperty(event.property));
        this.uiEvents.on("query_property_permission", event => this.notifyPropertyPermission(event.permission));
        this.uiEvents.on("query_permission", event => this.notifyPermission(event.permission));
        this.uiEvents.on("query_permissions", () => this.notifyPermissions());

        this.uiEvents.on("action_change_property", event => {
            if (typeof ChannelPropertyProviders[event.property] !== "object") {
                logError(LogCategory.CHANNEL, tr("Channel edit ui tried to change an unknown property %s."), event.property);
                return;
            }

            ChannelPropertyProviders[event.property as any].applier(event.value, this.currentProperties, this.channel);
            this.notifyProperty(event.property);
            this.validateProperty(event.property);
        });
        this.uiEvents.on("action_change_permission", event => {
            this.currentChannelPermissions[event.permission] = event.value;
            this.notifyPermission(event.permission);
        });
        this.uiEvents.on("action_icon_select", () => {
            spawnIconSelect(this.connection, id => {
                this.uiEvents.fire("action_change_property", { property: "icon", value: { iconId: id } });
            }, this.currentProperties.channel_icon_id);
        });

        this.listenerPermissions = [];
        for(const key of Object.keys(ChannelPropertyPermissionsProviders)) {
            const provider = ChannelPropertyPermissionsProviders[key];
            this.listenerPermissions.push(
                ...provider.registerUpdates(() => this.notifyPropertyPermission(key as any), this.connection.permissions, this.channel, this.connection.channelTree)
            );
        }

        if(channel) {
            this.originalProperties = channel.properties;
            this.cachedChannelPermissions = { state: "uninitialized" };
        } else {
            this.originalProperties = new ChannelProperties();
            /* TODO: Get the default channel delete/modify power? */
            this.cachedChannelPermissions = { state: "loaded", permissions: [] }; /* The channel has no default values */
        }

        this.currentProperties = new ChannelProperties();
        Object.keys(this.originalProperties).forEach(key => this.currentProperties[key] = this.originalProperties[key]);

        this.uiEvents.enableDebug("channel-edit");
    }

    destroy() {
        this.listenerPermissions.forEach(callback => callback());
        this.listenerPermissions.splice(0,  this.listenerPermissions.length);

        this.uiEvents.destroy();
    }

    validateAllProperties() : boolean {
        for(const property of Object.keys(ChannelPropertyValidators)) {
            this.validateProperty(property as any);
        }

        return Object.keys(ChannelPropertyValidators).map(key => this.propertyValidationStates[key])
            .findIndex(entry => entry === false) === -1;
    }

    private validateProperty(property: keyof ChannelEditableProperty) {
        const validator = ChannelPropertyValidators[property];
        if(!validator) { return; }

        const newState = validator(
            this.currentProperties, this.originalProperties,
            this.channel, this.channelParent,
            this.connection.permissions,
            this.connection.channelTree
        );

        if(this.propertyValidationStates[property] !== newState) {
            this.propertyValidationStates[property] = newState;
            this.notifyValidStatus(property);
        }
    }

    getChangedProperties() : Partial<ChannelProperties> {
        const properties: Partial<ChannelProperties> = {};

        for(const key of Object.keys(this.currentProperties)) {
            if(this.currentProperties[key] !== this.originalProperties[key]) {
                properties[key] = this.currentProperties[key];
            }
        }

        for(const key of Object.keys(this.originalProperties)) {
            if(this.currentProperties[key] !== this.originalProperties[key]) {
                properties[key] = this.currentProperties[key];
            }
        }

        return properties;
    }

    getChangedPermissions() : { permission: PermissionType, value: number }[] {
        const changes = [];
        for(const key of Object.keys(this.currentChannelPermissions)) {
            const neededPermission = permissionFromEditablePermission(key as any);
            const permissionInfo = this.connection.permissions.resolveInfo(neededPermission);
            if(!permissionInfo) {
                continue;
            }

            if(this.cachedChannelPermissions.state === "loaded") {
                const defaultValue = this.cachedChannelPermissions.permissions.find(permission => permission.type === permissionInfo);
                if(defaultValue?.valueOr(0) === this.currentChannelPermissions[key]) {
                    continue;
                }
            }

            changes.push({ permission: neededPermission, value: this.currentChannelPermissions[key] });
        }

        return changes;
    }

    private notifyProperty(property: keyof ChannelEditableProperty) {
        if (typeof ChannelPropertyProviders[property] !== "object") {
            logError(LogCategory.CHANNEL, tr("Channel edit controller missing property provider %s."), property);
            return;
        }

        ChannelPropertyProviders[property as any].provider(this.currentProperties, this.channel, this.channelParent, this.connection.channelTree).then(value => {
            this.uiEvents.fire_react("notify_property", {
                property: property,
                value: value
            });
        }).catch(error => {
            logError(LogCategory.CHANNEL, tr("Failed to get property value for %s: %o"), property, error);
        });
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

    private async notifyPermissions() {
        switch(this.cachedChannelPermissions.state) {
            case "error":
                this.uiEvents.fire_react("notify_permissions", {
                    state: {
                        state: "error",
                        reason: this.cachedChannelPermissions.reason
                    }
                });
                break;

            case "loading":
                /* will be notified later */
                break;

            case "loaded":
                this.uiEvents.fire_react("notify_permissions", {
                    state: {
                        state: "editable"
                    }
                });
                break;

            case "no-permissions":
                this.uiEvents.fire_react("notify_permissions", {
                    state: {
                        state: "no-permissions",
                        failedPermission: this.cachedChannelPermissions.failedPermission
                    }
                });
                break;

            case "uninitialized":
                const promise = this.connection.permissions.requestChannelPermissions(this.channel.channelId, false).then(permissions => {
                    this.cachedChannelPermissions = {
                        state: "loaded",
                        permissions: permissions
                    };
                }).catch(error => {
                    if(error instanceof CommandResult) {
                        if(error.id === ErrorCode.SERVER_INSUFFICIENT_PERMISSIONS) {
                            this.cachedChannelPermissions = {
                                state: "no-permissions",
                                failedPermission: this.connection.permissions.getFailedPermission(error)
                            };
                            return;
                        }

                        error = error.formattedMessage();
                    } else if(typeof error !== "string") {
                        logError(LogCategory.PERMISSIONS, tr("Failed to request channel permissions: %o"), error);
                        error = tr("Lookup the console");
                    }

                    this.cachedChannelPermissions = {
                        state: "error",
                        reason: error
                    };
                }).then(() => this.notifyPermissions());
                this.cachedChannelPermissions = { state: "loading", promise: promise };
                break;
        }
    }

    private notifyPermission(permission: ChannelEditablePermissions) {
        switch(this.cachedChannelPermissions.state) {
            case "error":
            case "uninitialized":
            case "loading":
            case "no-permissions":
                this.uiEvents.fire_react("notify_permission", {permission: permission, value: {state: "loading"}});
                break;

            case "loaded":
                const neededPermission = permissionFromEditablePermission(permission);
                const permissionInfo = this.connection.permissions.resolveInfo(neededPermission);
                if(permissionInfo) {
                    //const neededModifyPower = this.cachedChannelPermissions.permissions.find(permission => permission.type.name === PermissionType.I_CHANNEL_NEEDED_PERMISSION_MODIFY_POWER);
                    const defaultValue = this.cachedChannelPermissions.permissions.find(permission => permission.type === permissionInfo);

                    let value: number = 0;
                    if(defaultValue?.hasValue()) {
                        value = defaultValue.value;
                    }

                    if(this.currentChannelPermissions[permission]) {
                        value = this.currentChannelPermissions[permission];
                    }

                    /* FIXME: Test if permissions are really editable! */
                    this.uiEvents.fire_react("notify_permission", { permission: permission, value: {state: "editable", value: value} });
                } else {
                    this.uiEvents.fire_react("notify_permission", { permission: permission, value: {state: "unsupported"} });
                }
                break;
        }
    }

    private notifyValidStatus(property: keyof ChannelEditableProperty) {
        this.uiEvents.fire_react("notify_property_validate_state", {
            property: property,
            valid: typeof this.propertyValidationStates[property] === "boolean" ? this.propertyValidationStates[property] : true
        });
    }
}
