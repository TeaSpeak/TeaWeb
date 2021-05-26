import {ChannelTree} from "./ChannelTree";
import {Settings, settings} from "../settings";
import * as contextmenu from "../ui/elements/ContextMenu";
import * as log from "../log";
import {LogCategory, logError, logInfo, LogType} from "../log";
import {Sound} from "../audio/Sounds";
import {createServerModal} from "../ui/modal/ModalServerEdit";
import {spawnAvatarList} from "../ui/modal/ModalAvatarList";
import {Registry} from "../events";
import {ChannelTreeEntry, ChannelTreeEntryEvents} from "./ChannelTreeEntry";
import {tr} from "tc-shared/i18n/localize";
import {spawnInviteGenerator} from "tc-shared/ui/modal/invite/Controller";
import {HostBannerInfo, HostBannerInfoMode} from "tc-shared/ui/frames/HostBannerDefinitions";
import {spawnServerInfoNew} from "tc-shared/ui/modal/server-info/Controller";
import {CommandResult} from "tc-shared/connection/ServerConnectionDeclaration";
import {ErrorCode} from "tc-shared/connection/ErrorCode";
import {
    kServerConnectionInfoFields, ServerAudioEncryptionMode,
    ServerConnectionInfo,
    ServerConnectionInfoResult,
    ServerProperties
} from "tc-shared/tree/ServerDefinitions";
import {spawnIconManage} from "tc-shared/ui/modal/icon-viewer/Controller";

/* TODO: Rework all imports */
export * from "./ServerDefinitions";

export interface ServerAddress {
    host: string;
    port: number;
}

export function parseServerAddress(address: string) : ServerAddress | undefined {
    let ipv6End = address.indexOf(']');
    let lastColonIndex = address.lastIndexOf(':');

    if(lastColonIndex != -1 && lastColonIndex > ipv6End) {
        const portStr = address.substr(lastColonIndex + 1);
        if(!portStr.match(/^[0-9]{1,5}$/)) {
            return undefined;
        }

        const port = parseInt(portStr);
        if(port > 65565) {
            return undefined;
        }

        return {
            port: port,
            host: address.substr(0, lastColonIndex)
        };
    } else {
        return {
            port: 9987,
            host: address
        };
    }
}

export function stringifyServerAddress(address: ServerAddress) : string {
    let result = address.host;
    if(address.port !== 9987) {
        if(address.host.indexOf(":") === -1) {
            result += ":" + address.port;
        } else {
            result = "[" + result + "]:" + address.port;
        }
    }
    return result;
}

export interface ServerEvents extends ChannelTreeEntryEvents {
    notify_properties_updated: {
        updated_properties: Partial<ServerProperties>;
        server_properties: ServerProperties
    },
    notify_host_banner_updated: {},
}

export class ServerEntry extends ChannelTreeEntry<ServerEvents> {
    remote_address: ServerAddress;
    channelTree: ChannelTree;
    properties: ServerProperties;

    readonly events: Registry<ServerEvents>;

    private info_request_promise: Promise<void> = undefined;
    private info_request_promise_resolve: any = undefined;
    private info_request_promise_reject: any = undefined;

    private requestInfoPromise: Promise<ServerConnectionInfoResult>;
    private requestInfoPromiseTimestamp: number;

    /* TODO: Remove this? */
    private _info_connection_promise: Promise<ServerConnectionInfo>;
    private _info_connection_promise_timestamp: number;
    private _info_connection_promise_resolve: any;
    private _info_connection_promise_reject: any;

    lastInfoRequest: number = 0;
    nextInfoRequest: number = 0;
    private _destroyed = false;

    constructor(tree, name, address: ServerAddress) {
        super();

        this.events = new Registry<ServerEvents>();

        this.properties = new ServerProperties();
        this.channelTree = tree;
        this.remote_address = Object.assign({}, address); /* copy the address because it might get changed due to the DNS resolve */
        this.properties.virtualserver_name = name;

        this.events.on("notify_properties_updated", event => {
            if(
                "virtualserver_hostbanner_url" in event.updated_properties ||
                "virtualserver_hostbanner_mode" in event.updated_properties ||
                "virtualserver_hostbanner_gfx_url" in event.updated_properties ||
                "virtualserver_hostbanner_gfx_interval" in event.updated_properties
            ) {
                this.events.fire("notify_host_banner_updated");
            }
        });
    }

    destroy() {
        this._destroyed = true;
        this.info_request_promise = undefined;
        this.info_request_promise_resolve = undefined;
        this.info_request_promise_reject = undefined;

        this.channelTree = undefined;
        this.remote_address = undefined;
    }

    contextMenuItems() : contextmenu.MenuEntry[] {
        return [
            {
                type: contextmenu.MenuEntryType.ENTRY,
                name: tr("Show server info"),
                callback: () => spawnServerInfoNew(this.channelTree.client),
                icon_class: "client-about"
            }, {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-invite_buddy",
                name: tr("Invite buddy"),
                callback: () => spawnInviteGenerator(this)
            }, {
                type: contextmenu.MenuEntryType.HR,
                name: ''
            }, {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-channel_switch",
                name: tr("Join server text channel"),
                callback: () => {
                    this.channelTree.client.getChannelConversations().setSelectedConversation(this.channelTree.client.getChannelConversations().findOrCreateConversation(0));
                    this.channelTree.client.getSideBar().showServer();
                },
                visible: !settings.getValue(Settings.KEY_SWITCH_INSTANT_CHAT)
            }, {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-virtualserver_edit",
                name: tr("Edit"),
                callback: () => {
                    createServerModal(this, properties => {
                        logInfo(LogCategory.SERVER, tr("Changing server properties %o"), properties);
                        if (Object.keys(properties || {}).length > 0) {
                            return this.channelTree.client.serverConnection.send_command("serveredit", properties).then(() => {
                                this.channelTree.client.sound.play(Sound.SERVER_EDITED_SELF);
                            });
                        }
                        return Promise.resolve();
                    });
                }
            }, {
                type: contextmenu.MenuEntryType.HR,
                visible: true,
                name: ''
            }, {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-iconviewer",
                name: tr("View icons"),
                callback: () => spawnIconManage(this.channelTree.client, 0, undefined)
            }, {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: 'client-iconsview',
                name: tr("View avatars"),
                visible: false, //TODO: Enable again as soon the new design is finished
                callback: () => spawnAvatarList(this.channelTree.client)
            },
            {
                type: contextmenu.MenuEntryType.HR,
                name: ''
            },
            {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-channel_collapse_all",
                name: tr("Collapse all channels"),
                callback: () => this.channelTree.collapse_channels()
            },
            {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-channel_expand_all",
                name: tr("Expend all channels"),
                callback: () => this.channelTree.expand_channels()
            },
        ];
    }

    showContextMenu(x: number, y: number, on_close: () => void = () => {}) {
        contextmenu.spawn_context_menu(x, y, ...this.contextMenuItems(),
            contextmenu.Entry.CLOSE(on_close)
        );
    }

    updateVariables(is_self_notify: boolean, ...variables: {key: string, value: string}[]) {
        let group = log.group(log.LogType.DEBUG, LogCategory.SERVER, tr("Update properties (%i)"), variables.length);

        {
            const entries = [];
            for(const variable of variables)
                entries.push({
                    key: variable.key,
                    value: variable.value,
                    type: typeof (this.properties[variable.key])
                });
            log.table(LogType.DEBUG, LogCategory.PERMISSIONS, "Server update properties", entries);
        }

        let updatedProperties: Partial<ServerProperties> = {};
        for(let variable of variables) {
            if(!JSON.map_field_to(this.properties, variable.value, variable.key)) {
                /* The value has not been updated */
                continue;
            }

            updatedProperties[variable.key] = variable.value;
            if(variable.key == "virtualserver_icon_id") {
                this.properties.virtualserver_icon_id = variable.value as any >>> 0;
            }
        }

        this.events.fire("notify_properties_updated", {
            updated_properties: updatedProperties,
            server_properties: this.properties
        });

        group.end();
        if(is_self_notify && this.info_request_promise_resolve) {
            this.info_request_promise_resolve();
            this.info_request_promise = undefined;
            this.info_request_promise_reject = undefined;
            this.info_request_promise_resolve = undefined;
        }
    }

    /* this result !must! be cached for at least a second */
    updateProperties() : Promise<void> {
        if(this.info_request_promise && Date.now() - this.lastInfoRequest < 1000) return this.info_request_promise;
        this.lastInfoRequest = Date.now();
        this.nextInfoRequest =  this.lastInfoRequest + 10 * 1000;
        this.channelTree.client.serverConnection.send_command("servergetvariables").catch(error => {
            this.info_request_promise_reject(error);
            this.info_request_promise = undefined;
            this.info_request_promise_reject = undefined;
            this.info_request_promise_resolve = undefined;
        });

        return this.info_request_promise = new Promise<void>((resolve, reject) => {
            this.info_request_promise_reject = reject;
            this.info_request_promise_resolve = resolve;
        });
    }

    /* max 1s ago, so we could update every second */
    request_connection_info() : Promise<ServerConnectionInfo> {
        if(Date.now() - 900 < this._info_connection_promise_timestamp && this._info_connection_promise) {
            return this._info_connection_promise;
        }

        if(this._info_connection_promise_reject) {
            this._info_connection_promise_resolve("timeout");
        }

        let _local_reject; /* to ensure we're using the right resolve! */
        this._info_connection_promise = new Promise<ServerConnectionInfo>((resolve, reject) => {
            this._info_connection_promise_resolve = resolve;
            this._info_connection_promise_reject = reject;
            _local_reject = reject;
        });

        this._info_connection_promise_timestamp = Date.now();
        this.channelTree.client.serverConnection.send_command("serverrequestconnectioninfo", {}, { process_result: false }).catch(error => _local_reject(error));
        return this._info_connection_promise;
    }

    requestConnectionInfo() : Promise<ServerConnectionInfoResult> {
        if(this.requestInfoPromise && Date.now() - 900 < this.requestInfoPromiseTimestamp) {
            return this.requestInfoPromise;
        }

        this.requestInfoPromiseTimestamp = Date.now();
        return this.requestInfoPromise = this.doRequestConnectionInfo();
    }

    private async doRequestConnectionInfo() : Promise<ServerConnectionInfoResult> {
        const connection = this.channelTree.client.serverConnection;

        let result: ServerConnectionInfoResult = { status: "error", message: "missing notify" };
        const handlerUnregister = connection.getCommandHandler().registerCommandHandler("notifyserverconnectioninfo", command => {
            const payload = command.arguments[0];

            const info = {} as any;
            for(const key of Object.keys(kServerConnectionInfoFields)) {
                if(!(key in payload)) {
                    result = { status: "error", message: "missing key " + key };
                    return;
                }

                info[key] = parseFloat(payload[key]);
            }

            result = { status: "success", resultCached: false, result: info };
            return false;
        });

        try {
            await connection.send_command("serverrequestconnectioninfo", {}, { process_result: false });
        } catch (error) {
            if(error instanceof CommandResult) {
                if(error.id === ErrorCode.SERVER_INSUFFICIENT_PERMISSIONS) {
                    result = { status: "no-permission", failedPermission: this.channelTree.client.permissions.getFailedPermission(error) };
                } else {
                    result = { status: "error", message: error.formattedMessage() };
                }
            } else if(typeof error === "string") {
                result = { status: "error", message: error };
            } else {
                logError(LogCategory.NETWORKING, tr("Failed to request the server connection info: %o"), error);
                result = { status: "error", message: tr("lookup the console") };
            }
        } finally {
            handlerUnregister();
        }
        return result;
    }

    set_connection_info(info: ServerConnectionInfo) {
        if(!this._info_connection_promise_resolve)
            return;
        this._info_connection_promise_resolve(info);
        this._info_connection_promise_resolve = undefined;
        this._info_connection_promise_reject = undefined;
    }

    shouldUpdateProperties() : boolean {
        return this.nextInfoRequest < Date.now();
    }

    calculateUptime() : number {
        if(this.properties.virtualserver_uptime == 0 || this.lastInfoRequest == 0) return this.properties.virtualserver_uptime;
        return this.properties.virtualserver_uptime + (new Date().getTime() - this.lastInfoRequest) / 1000;
    }

    reset() {
        this.properties = new ServerProperties();
        this._info_connection_promise = undefined;
        this._info_connection_promise_reject = undefined;
        this._info_connection_promise_resolve = undefined;
        this._info_connection_promise_timestamp = undefined;
    }

    generateHostBannerInfo() : HostBannerInfo {
        if(!this.properties.virtualserver_hostbanner_gfx_url) {
            return { status: "none" };
        }

        let mode: HostBannerInfoMode;
        switch (this.properties.virtualserver_hostbanner_mode) {
            case 0:
                mode = "original";
                break;

            case 1:
                mode = "resize";
                break;

            case 2:
            default:
                mode = "resize-ratio";
                break;
        }

        return {
            status: "set",

            linkUrl: this.properties.virtualserver_hostbanner_url,
            mode: mode,

            imageUrl: this.properties.virtualserver_hostbanner_gfx_url,
            updateInterval: this.properties.virtualserver_hostbanner_gfx_interval,
        };
    }

    getAudioEncryptionMode() : ServerAudioEncryptionMode {
        switch (this.properties.virtualserver_codec_encryption_mode) {
            case 0:
                return "globally-off";

            default:
            case 1:
                return "individual";

            case 2:
                return "globally-on";
        }
    }
}