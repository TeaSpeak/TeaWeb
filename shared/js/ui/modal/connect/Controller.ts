import {Registry} from "tc-shared/events";
import {
    ConnectUiEvents,
    ConnectUiVariables,
} from "tc-shared/ui/modal/connect/Definitions";
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
import {UiVariableProvider} from "tc-shared/ui/utils/Variable";
import {createLocalUiVariables} from "tc-shared/ui/utils/LocalVariable";
import {createIpcUiVariableProvider} from "tc-shared/ui/utils/IpcVariable";

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

class ConnectController {
    readonly uiEvents: Registry<ConnectUiEvents>;
    readonly uiVariables: UiVariableProvider<ConnectUiVariables>;

    private readonly defaultAddress: string;

    private historyShown: boolean;

    private currentAddress: string;
    private currentNickname: string;
    private currentPassword: string;
    private currentPasswordHashed: boolean;
    private currentProfile: ConnectionProfile | undefined;

    private selectedHistoryId: number;
    private history: ConnectionHistoryEntry[];

    private validateNickname: boolean;
    private validateAddress: boolean;

    constructor(uiVariables: UiVariableProvider<ConnectUiVariables>) {7
        this.uiEvents = new Registry<ConnectUiEvents>();
        this.uiEvents.enableDebug("modal-connect");

        this.uiVariables = uiVariables;
        this.history = undefined;

        this.validateNickname = false;
        this.validateAddress = false;

        this.defaultAddress = "ts.teaspeak.de";
        this.historyShown = settings.getValue(Settings.KEY_CONNECT_SHOW_HISTORY);

        this.currentAddress = settings.getValue(Settings.KEY_CONNECT_ADDRESS);
        this.currentProfile = findConnectProfile(settings.getValue(Settings.KEY_CONNECT_PROFILE)) || defaultConnectProfile();
        this.currentNickname = settings.getValue(Settings.KEY_CONNECT_USERNAME);

        this.uiEvents.on("action_delete_history", event => {
            connectionHistory.deleteConnectionAttempts(event.target, event.targetType).then(() => {
                this.history = undefined;
                this.uiVariables.sendVariable("history");
            }).catch(error => {
                logWarn(LogCategory.GENERAL, tr("Failed to delete connection attempts: %o"), error);
            })
        });

        this.uiEvents.on("action_manage_profiles", () => {
            /* TODO: This is more a hack. Proper solution is that the connection profiles fire events if they've been changed... */
            const modal = spawnSettingsModal("identity-profiles");
            modal.close_listener.push(() => {
                this.uiVariables.sendVariable("profiles", undefined);
            });
        });

        this.uiEvents.on("action_select_history", event => this.setSelectedHistoryId(event.id));

        this.uiEvents.on("action_connect", () => {
            this.validateNickname = true;
            this.validateAddress = true;
            this.updateValidityStates();
        });

        this.uiVariables.setVariableProvider("server_address", () => ({
            currentAddress: this.currentAddress,
            defaultAddress: this.defaultAddress
        }));

        this.uiVariables.setVariableProvider("server_address_valid", () => {
            if(this.validateAddress) {
                const address = this.currentAddress || this.defaultAddress || "";
                const parsedAddress = parseServerAddress(address);

                if(parsedAddress) {
                    kRegexDomain.lastIndex = 0;
                    return kRegexDomain.test(parsedAddress.host) || ipRegex({ exact: true }).test(parsedAddress.host);
                } else {
                    return false;
                }
            } else {
                return true;
            }
        });

        this.uiVariables.setVariableEditor("server_address", newValue => {
            if(this.currentAddress === newValue.currentAddress) {
                return false;
            }

            this.setSelectedAddress(newValue.currentAddress, true, false);
            return true;
        });

        this.uiVariables.setVariableProvider("nickname", () => ({
            defaultNickname: this.currentProfile?.connectUsername(),
            currentNickname: this.currentNickname,
        }));

        this.uiVariables.setVariableProvider("nickname_valid", () => {
            if(this.validateNickname) {
                const nickname = this.currentNickname || this.currentProfile?.connectUsername() || "";
                return nickname.length >= 3 && nickname.length <= 30;
            } else {
                return true;
            }
        });

        this.uiVariables.setVariableEditor("nickname", newValue => {
            if(this.currentNickname === newValue.currentNickname) {
                return false;
            }

            this.currentNickname = newValue.currentNickname;
            settings.setValue(Settings.KEY_CONNECT_USERNAME, this.currentNickname);

            this.validateNickname = true;
            this.uiVariables.sendVariable("nickname_valid");
            return true;
        });

        this.uiVariables.setVariableProvider("password", () => ({
            password: this.currentPassword,
            hashed: this.currentPasswordHashed
        }));

        this.uiVariables.setVariableEditor("password", newValue => {
            if(this.currentPassword === newValue.password) {
                return false;
            }

            this.currentPassword = newValue.password;
            this.currentPasswordHashed = newValue.hashed;
            return true;
        });

        this.uiVariables.setVariableProvider("profile_valid", () => !!this.currentProfile?.valid());

        this.uiVariables.setVariableProvider("historyShown", () => this.historyShown);
        this.uiVariables.setVariableEditor("historyShown", newValue => {
            if(this.historyShown === newValue) {
                return false;
            }

            this.historyShown = newValue;
            settings.setValue(Settings.KEY_CONNECT_SHOW_HISTORY, newValue);
            return true;
        });

        this.uiVariables.setVariableProvider("history",async () => {
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
        });

        this.uiVariables.setVariableProvider("history_entry", async customData => {
            const info = await connectionHistory.queryServerInfo(customData.serverUniqueId);
            return {
                icon: {
                    iconId: info.iconId,
                    serverUniqueId: customData.serverUniqueId,
                    handlerId: undefined
                },
                name: info.name,
                password: info.passwordProtected,
                country: info.country,
                clients: info.clientsOnline,
                maxClients: info.clientsMax
            };
        });

        this.uiVariables.setVariableProvider("history_connections", async customData => {
            return await connectionHistory.countConnectCount(customData.target, customData.targetType).catch(async error => {
                logError(LogCategory.GENERAL, tr("Failed to query the connect count for %s (%s): %o"), customData.target, customData.targetType, error);
                return -1;
            });
        })

        this.uiVariables.setVariableProvider("profiles", () => ({
            selected: this.currentProfile?.id,
            profiles: availableConnectProfiles().map(profile => ({
                id: profile.id,
                valid: profile.valid(),
                name: profile.profileName
            }))
        }));

        this.uiVariables.setVariableEditor("profiles", newValue => {
            const profile = findConnectProfile(newValue.selected);
            if(!profile) {
                createErrorModal(tr("Invalid profile"), tr("Target connect profile is missing.")).open();
                return false;
            }

            this.setSelectedProfile(profile);
            return; /* No need to update anything. The ui should received the values needed already */
        });
    }

    destroy() {
        this.uiEvents.destroy();
        this.uiVariables.destroy();
    }

    generateConnectParameters() : ConnectParameters | undefined {
        if(!this.uiVariables.getVariableSync("nickname_valid", undefined, true)) {
            return undefined;
        }

        if(!this.uiVariables.getVariableSync("server_address_valid", undefined, true)) {
            return undefined;
        }

        if(!this.uiVariables.getVariableSync("profile_valid", undefined, true)) {
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
        this.uiVariables.sendVariable("history");

        const historyEntry = this.history?.find(entry => entry.id === id);
        if(!historyEntry) { return; }

        this.currentAddress = historyEntry.targetAddress;
        this.currentNickname = historyEntry.nickname;
        this.currentPassword = historyEntry.hashedPassword;
        this.currentPasswordHashed = true;

        this.uiVariables.sendVariable("server_address");
        this.uiVariables.sendVariable("password");
        this.uiVariables.sendVariable("nickname");
    }

    setSelectedAddress(address: string | undefined, validate: boolean, updateUi: boolean) {
        if(this.currentAddress !== address) {
            this.currentAddress = address;
            settings.setValue(Settings.KEY_CONNECT_ADDRESS, address);
            this.setSelectedHistoryId(-1);

            if(updateUi) {
                this.uiVariables.sendVariable("server_address");
            }
        }

        this.validateAddress = true;
        this.uiVariables.sendVariable("server_address_valid");
    }

    setSelectedProfile(profile: ConnectionProfile | undefined) {
        if(this.currentProfile === profile) {
            return;
        }

        this.currentProfile = profile;
        this.uiVariables.sendVariable("profile_valid");
        this.uiVariables.sendVariable("profiles");
        settings.setValue(Settings.KEY_CONNECT_PROFILE, profile.id);

        /* Clear out the nickname on profile switch and use the default nickname */
        this.currentNickname = undefined;
        this.uiVariables.sendVariable("nickname");
    }

    private updateValidityStates() {
        this.uiVariables.sendVariable("server_address_valid");
        this.uiVariables.sendVariable("nickname_valid");
        this.uiVariables.sendVariable("profile_valid");
    }
}

export type ConnectModalOptions = {
    connectInANewTab?: boolean,

    selectedAddress?: string,
    selectedProfile?: ConnectionProfile,
}

export function spawnConnectModalNew(options: ConnectModalOptions) {
    const variableProvider = createIpcUiVariableProvider();
    const controller = new ConnectController(variableProvider);

    if(typeof options.selectedAddress === "string") {
        controller.setSelectedAddress(options.selectedAddress, false, true);
    }

    if(typeof options.selectedProfile === "object") {
        controller.setSelectedProfile(options.selectedProfile);
    }

    const modal = spawnReactModal(ConnectModal, controller.uiEvents, variableProvider.generateConsumerDescription(), options.connectInANewTab || false);
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
            connection = server_connections.spawnConnectionHandler();
            server_connections.setActiveConnectionHandler(connection);
        } else {
            connection = server_connections.getActiveConnectionHandler();
        }

        if(!connection) {
            return;
        }

        connection.startConnectionNew(parameters, false).then(undefined);
    });
}