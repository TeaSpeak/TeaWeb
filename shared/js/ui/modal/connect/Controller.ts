import {Registry} from "tc-shared/events";
import {ConnectProperties, ConnectUiEvents, PropertyValidState} from "tc-shared/ui/modal/connect/Definitions";
import {spawnReactModal} from "tc-shared/ui/react-elements/Modal";
import {ConnectModal} from "tc-shared/ui/modal/connect/Renderer";
import {LogCategory, logError, logWarn} from "tc-shared/log";
import {
    availableConnectProfiles,
    ConnectionProfile,
    defaultConnectProfile,
    findConnectProfile
} from "tc-shared/profiles/ConnectionProfile";
import {Settings, settings} from "tc-shared/settings";
import {connectionHistory, ConnectionHistoryEntry} from "tc-shared/connectionlog/History";
import {createErrorModal} from "tc-shared/ui/elements/Modal";
import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import {server_connections} from "tc-shared/ConnectionManager";
import {parseServerAddress} from "tc-shared/tree/Server";
import {spawnSettingsModal} from "tc-shared/ui/modal/ModalSettings";
import * as ipRegex from "ip-regex";
import _ = require("lodash");

const kRegexDomain = /^(localhost|((([a-zA-Z0-9_-]{0,63}\.){0,253})?[a-zA-Z0-9_-]{0,63}\.[a-zA-Z]{2,64}))$/i;

export type ConnectParameters = {
    targetAddress: string,
    targetPassword?: string,
    targetPasswordHashed?: boolean,

    nickname: string,
    nicknameSpecified: boolean,

    profile: ConnectionProfile,

    token?: string,

    defaultChannel?: string | number,
    defaultChannelPassword?: string,
}

type ValidityStates =  {[T in keyof PropertyValidState]: boolean};
const kDefaultValidityStates: ValidityStates = {
    address: false,
    nickname: false,
    password: false,
    profile: false
}

class ConnectController {
    readonly uiEvents: Registry<ConnectUiEvents>;

    private readonly defaultAddress: string;
    private readonly propertyProvider: {[K in keyof ConnectProperties]?: () => Promise<ConnectProperties[K]>} = {};

    private historyShown: boolean;

    private currentAddress: string;
    private currentNickname: string;
    private currentPassword: string;
    private currentPasswordHashed: boolean;
    private currentProfile: ConnectionProfile | undefined;

    private addressChanged: boolean;
    private nicknameChanged: boolean;

    private selectedHistoryId: number;
    private history: ConnectionHistoryEntry[];

    private validStates: {[T in keyof PropertyValidState]: boolean} = {
        address: false,
        nickname: false,
        password: false,
        profile: false
    };

    private validateStates: {[T in keyof PropertyValidState]: boolean} = {
        profile: false,
        password: false,
        nickname: false,
        address: false
    };

    constructor() {
        this.uiEvents = new Registry<ConnectUiEvents>();
        this.uiEvents.enableDebug("modal-connect");

        this.history = undefined;

        this.defaultAddress = "ts.teaspeak.de";
        this.historyShown = settings.static_global(Settings.KEY_CONNECT_SHOW_HISTORY);

        this.currentAddress = settings.static_global(Settings.KEY_CONNECT_ADDRESS);
        this.currentProfile = findConnectProfile(settings.static_global(Settings.KEY_CONNECT_PROFILE)) || defaultConnectProfile();
        this.currentNickname = settings.static_global(Settings.KEY_CONNECT_USERNAME);

        this.addressChanged = false;
        this.nicknameChanged = false;

        this.propertyProvider["nickname"] = async () => ({
            defaultNickname: this.currentProfile?.connectUsername(),
            currentNickname: this.currentNickname,
        });

        this.propertyProvider["address"] = async () => ({
            currentAddress: this.currentAddress,
            defaultAddress: this.defaultAddress,
        });

        this.propertyProvider["password"] = async () => this.currentPassword ? ({
            hashed: this.currentPasswordHashed,
            password: this.currentPassword
        }) : undefined;

        this.propertyProvider["profiles"] = async () => ({
            selected: this.currentProfile?.id,
            profiles: availableConnectProfiles().map(profile => ({
                id: profile.id,
                valid: profile.valid(),
                name: profile.profileName
            }))
        });

        this.propertyProvider["historyShown"] = async () => this.historyShown;
        this.propertyProvider["history"] = async () => {
            if(!this.history) {
                this.history = await connectionHistory.lastConnectedServers(10);
            }

            return {
                selected: this.selectedHistoryId,
                history: this.history.map(entry => ({
                    id: entry.id,
                    targetAddress: entry.targetAddress,
                    uniqueServerId: entry.serverUniqueId
                }))
            };
        };

        this.uiEvents.on("query_property", event => this.sendProperty(event.property));
        this.uiEvents.on("query_property_valid", event => this.uiEvents.fire_react("notify_property_valid", { property: event.property, value: this.validStates[event.property] }));
        this.uiEvents.on("query_history_connections", event => {
            connectionHistory.countConnectCount(event.target, event.targetType).catch(async error => {
                logError(LogCategory.GENERAL, tr("Failed to query the connect count for %s (%s): %o"), event.target, event.targetType, error);
                return -1;
            }).then(count => {
                this.uiEvents.fire_react("notify_history_connections", {
                    target: event.target,
                    targetType: event.targetType,
                    value: count
                });
            });
        });
        this.uiEvents.on("query_history_entry", event => {
            connectionHistory.queryServerInfo(event.serverUniqueId).then(info => {
                this.uiEvents.fire_react("notify_history_entry", {
                    serverUniqueId: event.serverUniqueId,
                    info: {
                        icon: {
                            iconId: info.iconId,
                            serverUniqueId: event.serverUniqueId,
                            handlerId: undefined
                        },
                        name: info.name,
                        password: info.passwordProtected,
                        country: info.country,
                        clients: info.clientsOnline,
                        maxClients: info.clientsMax
                    }
                });
            }).catch(async error => {
                logError(LogCategory.GENERAL, tr("Failed to query the history server info for %s: %o"), event.serverUniqueId, error);
            });
        });

        this.uiEvents.on("action_toggle_history", event => {
            if(this.historyShown === event.enabled) {
                return;
            }

            this.historyShown = event.enabled;
            this.sendProperty("historyShown").then(undefined);
            settings.changeGlobal(Settings.KEY_CONNECT_SHOW_HISTORY, event.enabled);
        });

        this.uiEvents.on("action_manage_profiles", () => {
            /* TODO: This is more a hack. Proper solution is that the connection profiles fire events if they've been changed... */
            const modal = spawnSettingsModal("identity-profiles");
            modal.close_listener.push(() => {
                this.sendProperty("profiles").then(undefined);
            });
        });

        this.uiEvents.on("action_select_profile", event => {
            const profile = findConnectProfile(event.id);
            if(!profile) {
                createErrorModal(tr("Invalid profile"), tr("Target connect profile is missing.")).open();
                return;
            }

            this.setSelectedProfile(profile);
        });

        this.uiEvents.on("action_set_address", event => this.setSelectedAddress(event.address, event.validate));

        this.uiEvents.on("action_set_nickname", event => {
            if(this.currentNickname !== event.nickname) {
                this.currentNickname = event.nickname;
                this.sendProperty("nickname").then(undefined);
                settings.changeGlobal(Settings.KEY_CONNECT_USERNAME, event.nickname);
            }

            this.validateStates["nickname"] = event.validate;
            this.updateValidityStates();
        });

        this.uiEvents.on("action_set_password", event => {
            if(this.currentPassword === event.password) {
                return;
            }

            this.currentPassword = event.password;
            this.currentPasswordHashed = event.hashed;
            this.sendProperty("password").then(undefined);

            this.validateStates["password"] = true;
            this.updateValidityStates();
        });

        this.uiEvents.on("action_select_history", event => this.setSelectedHistoryId(event.id));

        this.uiEvents.on("action_connect", () => {
            Object.keys(this.validateStates).forEach(key => this.validateStates[key] = true);
            this.updateValidityStates();
        });

        this.updateValidityStates();
    }

    destroy() {
        Object.keys(this.propertyProvider).forEach(key => delete this.propertyProvider[key]);
        this.uiEvents.destroy();
    }

    generateConnectParameters() : ConnectParameters | undefined {
        if(Object.keys(this.validStates).findIndex(key => this.validStates[key] === false) !== -1) {
            return undefined;
        }

        return {
            nickname: this.currentNickname || this.currentProfile?.connectUsername(),
            nicknameSpecified: !!this.currentNickname,

            targetAddress: this.currentAddress || this.defaultAddress,

            profile: this.currentProfile,

            targetPassword: this.currentPassword,
            targetPasswordHashed: this.currentPasswordHashed
        };
    }

    setSelectedHistoryId(id: number | -1) {
        if(this.selectedHistoryId === id) {
            return;
        }

        this.selectedHistoryId = id;
        this.sendProperty("history").then(undefined);

        const historyEntry = this.history?.find(entry => entry.id === id);
        if(!historyEntry) { return; }

        this.currentAddress = historyEntry.targetAddress;
        this.currentNickname = historyEntry.nickname;
        this.currentPassword = historyEntry.hashedPassword;
        this.currentPasswordHashed = true;

        this.sendProperty("address").then(undefined);
        this.sendProperty("password").then(undefined);
        this.sendProperty("nickname").then(undefined);
    }

    setSelectedAddress(address: string | undefined, validate: boolean) {
        if(this.currentAddress !== address) {
            this.currentAddress = address;
            this.sendProperty("address").then(undefined);
            settings.changeGlobal(Settings.KEY_CONNECT_ADDRESS, address);
            this.setSelectedHistoryId(-1);
        }

        this.validateStates["address"] = validate;
        this.updateValidityStates();
    }

    setSelectedProfile(profile: ConnectionProfile | undefined) {
        if(this.currentProfile === profile) {
            return;
        }

        this.currentProfile = profile;
        this.sendProperty("profiles").then(undefined);
        settings.changeGlobal(Settings.KEY_CONNECT_PROFILE, profile.id);

        /* Clear out the nickname on profile switch and use the default nickname */
        this.uiEvents.fire("action_set_nickname", { nickname: undefined, validate: true });

        this.validateStates["profile"] = true;
        this.updateValidityStates();
    }

    private updateValidityStates() {
        const newStates = Object.assign({}, kDefaultValidityStates);
        if(this.validateStates["nickname"]) {
            const nickname = this.currentNickname || this.currentProfile?.connectUsername() || "";
            newStates["nickname"] = nickname.length >= 3 && nickname.length <= 30;
        } else {
            newStates["nickname"] = true;
        }

        if(this.validateStates["address"]) {
            const address = this.currentAddress || this.defaultAddress || "";
            const parsedAddress = parseServerAddress(address);

            if(parsedAddress) {
                kRegexDomain.lastIndex = 0;
                newStates["address"] = kRegexDomain.test(parsedAddress.host) || ipRegex({ exact: true }).test(parsedAddress.host);
            } else {
                newStates["address"] = false;
            }
        } else {
            newStates["address"] = true;
        }

        newStates["profile"] = !!this.currentProfile?.valid();
        newStates["password"] = true;

        for(const key of Object.keys(newStates)) {
            if(_.isEqual(this.validStates[key], newStates[key])) {
                continue;
            }

            this.validStates[key] = newStates[key];
            this.uiEvents.fire_react("notify_property_valid", { property: key as any, value: this.validStates[key] });
        }
    }

    private async sendProperty(property: keyof ConnectProperties) {
        if(!this.propertyProvider[property]) {
            logWarn(LogCategory.GENERAL, tr("Tried to send a property where we don't have a provider for"));
            return;
        }

        this.uiEvents.fire_react("notify_property", {
            property: property,
            value: await this.propertyProvider[property]()
        });
    }
}

export type ConnectModalOptions = {
    connectInANewTab?: boolean,

    selectedAddress?: string,
    selectedProfile?: ConnectionProfile,
}

export function spawnConnectModalNew(options: ConnectModalOptions) {
    const controller = new ConnectController();

    if(typeof options.selectedAddress === "string") {
        controller.setSelectedAddress(options.selectedAddress, false);
    }

    if(typeof options.selectedProfile === "object") {
        controller.setSelectedProfile(options.selectedProfile);
    }

    const modal = spawnReactModal(ConnectModal, controller.uiEvents, options.connectInANewTab || false);
    modal.show();

    modal.events.one("destroy", () => {
        controller.destroy();
    });

    controller.uiEvents.on("action_connect", event => {
        const parameters = controller.generateConnectParameters();
        if(!parameters) {
            /* invalid parameters detected */
            return;
        }

        modal.destroy();

        let connection: ConnectionHandler;
        if(event.newTab) {
            connection = server_connections.spawn_server_connection();
            server_connections.set_active_connection(connection);
        } else {
            connection = server_connections.active_connection();
        }

        if(!connection) {
            return;
        }

        connection.startConnectionNew(parameters, false).then(undefined);
    });
}