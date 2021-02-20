import {ChannelEntry} from "tc-shared/tree/Channel";
import {ServerAddress, ServerEntry} from "tc-shared/tree/Server";
import {Registry} from "tc-events";
import {InviteChannel, InviteUiEvents, InviteUiVariables} from "tc-shared/ui/modal/invite/Definitions";
import {createIpcUiVariableProvider, IpcUiVariableProvider} from "tc-shared/ui/utils/IpcVariable";
import {spawnModal} from "tc-shared/ui/react-elements/modal";
import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import {hashPassword} from "tc-shared/utils/helpers";
import {LogCategory, logError} from "tc-shared/log";
import {clientServiceInvite, clientServices} from "tc-shared/clientservice";
import {Settings, settings} from "tc-shared/settings";

class InviteController {
    readonly connection: ConnectionHandler;
    readonly events: Registry<InviteUiEvents>;
    readonly variables: IpcUiVariableProvider<InviteUiVariables>;

    private registeredEvents: (() => void)[] = [];

    private readonly targetAddress: string;
    private readonly targetServerPassword: string | undefined;

    private readonly fallbackWebClientUrlBase: string;

    private targetChannelId: number;
    private targetChannelName: string;
    private targetChannelPasswordHashed: string | undefined;
    private targetChannelPasswordRaw: string | undefined;

    private useToken: string;
    private linkExpiresAfter: number | 0;

    private inviteLinkError: string;
    private inviteLinkShort: string;
    private inviteLinkLong: string;
    private inviteLinkExpireDate: number;

    private showShortInviteLink: boolean;
    private showAdvancedSettings: boolean;
    private webClientUrlBase: string;

    private inviteLinkUpdateExecuting: boolean;
    private inviteLinkUpdatePending: boolean;

    private linkAdminToken: string;

    constructor(connection: ConnectionHandler, targetAddress: string, targetHashedServerPassword: string | undefined) {
        this.connection = connection;
        this.events = new Registry<InviteUiEvents>();
        this.variables = createIpcUiVariableProvider();
        this.registeredEvents = [];

        if (document.location.protocol !== 'https:') {
            /*
             * Seems to be a test environment or the TeaClient for localhost where we dont have to use https.
             */
            this.fallbackWebClientUrlBase = "https://web.teaspeak.de/";
        } else if (document.location.hostname === "localhost" || document.location.host.startsWith("127.")) {
            this.fallbackWebClientUrlBase = "https://web.teaspeak.de/";
        } else {
            this.fallbackWebClientUrlBase = document.location.origin + document.location.pathname;
        }

        this.targetAddress = targetAddress;
        this.targetServerPassword = targetHashedServerPassword;

        this.targetChannelId = 0;

        this.linkExpiresAfter = 0;

        this.showShortInviteLink = settings.getValue(Settings.KEY_INVITE_SHORT_URL);
        this.showAdvancedSettings = settings.getValue(Settings.KEY_INVITE_ADVANCED_ENABLED);

        this.inviteLinkUpdateExecuting = false;
        this.inviteLinkUpdatePending = false;

        this.variables.setVariableProvider("generatedLink", () => {
            if(typeof this.inviteLinkError === "string") {
                return { status: "error", message: this.inviteLinkError };
            } else if(typeof this.inviteLinkLong === "string") {
                return { status: "success", shortUrl: this.inviteLinkShort, longUrl: this.inviteLinkLong, expireDate: this.inviteLinkExpireDate };
            } else {
                return { status: "generating" };
            }
        });
        this.variables.setVariableProvider("availableChannels", () => {
            const result: InviteChannel[] = [];
            const walkChannel = (channel: ChannelEntry, depth: number) => {
                result.push({ channelId: channel.channelId, channelName: channel.properties.channel_name, depth });

                channel = channel.child_channel_head;
                while(channel) {
                    walkChannel(channel, depth + 1);
                    channel = channel.channel_next;
                }
            };
            this.connection.channelTree.rootChannel().forEach(channel => walkChannel(channel, 0));
            return result;
        });

        this.variables.setVariableProvider("selectedChannel", () => this.targetChannelId);
        this.variables.setVariableEditor("selectedChannel", newValue => {
            const channel = this.connection.channelTree.findChannel(newValue);
            if(!channel) {
                return false;
            }

            this.selectChannel(channel);
        });

        this.variables.setVariableProvider("channelPassword", () => ({
            hashed: this.targetChannelPasswordHashed,
            raw: this.targetChannelPasswordRaw
        }));
        this.variables.setVariableEditorAsync("channelPassword", async newValue => {
            this.targetChannelPasswordRaw = newValue.raw;
            this.targetChannelPasswordHashed = await hashPassword(newValue.raw);
            this.updateInviteLink();

            return {
                hashed: this.targetChannelPasswordHashed,
                raw: this.targetChannelPasswordRaw
            };
        });

        this.registeredEvents.push(this.connection.channelTree.events.on(["notify_channel_list_received", "notify_channel_created"], () => {
            this.variables.sendVariable("availableChannels");
        }));

        this.registeredEvents.push(this.connection.channelTree.events.on("notify_channel_deleted", event => {
            if(this.targetChannelId === event.channel.channelId) {
                this.selectChannel(undefined);
            }

            this.variables.sendVariable("availableChannels");
        }));

        this.variables.setVariableProvider("shortLink", () => this.showShortInviteLink);
        this.variables.setVariableEditor("shortLink", newValue => {
            this.showShortInviteLink = newValue;
            settings.setValue(Settings.KEY_INVITE_SHORT_URL, newValue);
        });

        this.variables.setVariableProvider("advancedSettings", () => this.showAdvancedSettings);
        this.variables.setVariableEditor("advancedSettings", newValue => {
            this.showAdvancedSettings = newValue;
            settings.setValue(Settings.KEY_INVITE_ADVANCED_ENABLED, newValue);
        });

        this.variables.setVariableProvider("token", () => this.useToken);
        this.variables.setVariableEditor("token", newValue => {
            this.useToken = newValue;
            this.updateInviteLink();
        });

        this.variables.setVariableProvider("expiresAfter", () => this.linkExpiresAfter);
        this.variables.setVariableEditor("expiresAfter", newValue => {
            this.linkExpiresAfter = newValue;
            this.updateInviteLink();
        });

        this.variables.setVariableProvider("webClientUrlBase", () => ({ fallback: this.fallbackWebClientUrlBase, override: this.webClientUrlBase }));
        this.variables.setVariableEditor("webClientUrlBase", newValue => {
            this.webClientUrlBase = newValue.override;
            this.updateInviteLink();
        });
    }

    destroy() {
        this.events.destroy();
        this.variables.destroy();

        this.registeredEvents?.forEach(callback => callback());
        this.registeredEvents = undefined;
    }

    selectChannel(channel: ChannelEntry | undefined) {
        if(channel) {
            if(this.targetChannelId === channel.channelId) {
                return;
            }

            this.targetChannelId = channel.channelId;
            this.targetChannelName = channel.channelName();
            this.targetChannelPasswordHashed = channel.getCachedPasswordHash();
            this.targetChannelPasswordRaw = undefined;
        } else if(this.targetChannelId === 0) {
            return;
        } else {
            this.targetChannelId = 0;
            this.targetChannelPasswordHashed = undefined;
            this.targetChannelPasswordRaw = undefined;
        }
        this.updateInviteLink();
    }

    updateInviteLink() {
        if(this.inviteLinkUpdateExecuting) {
            this.inviteLinkUpdatePending = true;
            return;
        }

        this.inviteLinkUpdateExecuting = true;
        this.inviteLinkUpdatePending = true;

        (async () => {
            this.inviteLinkError = undefined;
            this.inviteLinkShort = undefined;
            this.inviteLinkLong = undefined;
            this.variables.sendVariable("generatedLink");

            while(this.inviteLinkUpdatePending) {
                this.inviteLinkUpdatePending = false;

                try {
                    await this.doUpdateInviteLink();
                } catch (error) {
                    logError(LogCategory.GENERAL, tr("Failed to update invite link: %o"), error);
                    this.inviteLinkError = tr("Unknown error occurred");
                }
            }

            this.variables.sendVariable("generatedLink");
            this.inviteLinkUpdateExecuting = false;
        })();
    }

    private async doUpdateInviteLink() {
        this.inviteLinkError = undefined;
        this.inviteLinkShort = undefined;
        this.inviteLinkLong = undefined;

        if(!clientServices.isSessionInitialized()) {
            this.inviteLinkError = tr("Client services not available");
            return;
        }

        const server = this.connection.channelTree.server;
        try { await server.updateProperties(); } catch (_) {}

        const propertiesInfo = {};
        const propertiesConnect = {};

        {
            propertiesInfo["server-name"] = server.properties.virtualserver_name;
            propertiesInfo["server-unique-id"] = server.properties.virtualserver_unique_identifier;
            propertiesInfo["slots-used"] = server.properties.virtualserver_clientsonline.toString();
            propertiesInfo["slots-max"] = server.properties.virtualserver_maxclients.toString();

            propertiesConnect["server-address"] = this.targetAddress;
            if(this.targetServerPassword) {
                propertiesConnect["server-password"] = this.targetServerPassword;
            }

            if(this.targetChannelId > 0) {
                propertiesConnect["channel"] = `/${this.targetChannelId}`;
                propertiesInfo["channel-name"] = this.targetChannelName;

                if(this.targetChannelPasswordHashed) {
                    propertiesConnect["channel-password"] = this.targetChannelPasswordHashed;
                }
            }

            if(this.targetChannelPasswordHashed || this.targetServerPassword) {
                propertiesConnect["passwords-hashed"] = "1";
            }

            const urlBase = this.webClientUrlBase || this.fallbackWebClientUrlBase;
            if(new URL(urlBase).hostname !== "web.teaspeak.de") {
                propertiesConnect["webclient-host"] = urlBase;
            }
        }

        const result = await clientServiceInvite.createInviteLink(propertiesConnect, propertiesInfo, typeof this.linkAdminToken === "undefined", this.linkExpiresAfter);
        if(result.status !== "success") {
            logError(LogCategory.GENERAL, tr("Failed to register invite link: %o"), result.result);
            this.inviteLinkError = tr("Server error") + " (" + result.result.type + ")";
            return;
        }

        const inviteLink = result.unwrap();
        this.linkAdminToken = inviteLink.adminToken;
        this.inviteLinkShort = `https://teaspeak.de/${inviteLink.linkId}`;
        this.inviteLinkLong = `https://join.teaspeak.de/${inviteLink.linkId}`;
        this.inviteLinkExpireDate = this.linkExpiresAfter;
    }
}

export function spawnInviteGenerator(target: ChannelEntry | ServerEntry) {
    let targetAddress: string, targetHashedServerPassword: string | undefined, serverName: string;

    {
        let address: ServerAddress;
        if(target instanceof ServerEntry) {
            address = target.remote_address;
            serverName = target.properties.virtualserver_name;
        } else if(target instanceof ChannelEntry) {
            address = target.channelTree.server.remote_address;
            serverName = target.channelTree.server.properties.virtualserver_name;
        } else {
            throw tr("invalid target");
        }

        const connection = target.channelTree.client;
        const connectParameters = connection.getServerConnection().handshake_handler().parameters;
        if(connectParameters.serverPassword) {
            if(!connectParameters.serverPasswordHashed) {
                throw tr("expected the target server password to be hashed");
            }
            targetHashedServerPassword = connectParameters.serverPassword;
        }

        if(!address) {
            throw tr("missing target address");
        }

        if(address.host.indexOf(':') === -1) {
            targetAddress = `${address.host}:${address.port}`;
        } else {
            targetAddress = `[${address.host}]:${address.port}`;
        }
    }

    const controller = new InviteController(target.channelTree.client, targetAddress, targetHashedServerPassword);
    if(target instanceof ChannelEntry) {
        /* will implicitly update the invite link */
        controller.selectChannel(target);
    } else {
        controller.updateInviteLink();
    }

    const modal = spawnModal("modal-invite", [ controller.events.generateIpcDescription(), controller.variables.generateConsumerDescription(), serverName ]);
    controller.events.one("action_close", () => modal.destroy());
    modal.getEvents().on("destroy", () => controller.destroy());
    modal.show().then(undefined);
}