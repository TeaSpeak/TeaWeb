import {ConnectionHandler, ConnectionState} from "tc-shared/ConnectionHandler";
import {Registry} from "tc-events";
import {ModalServerInfoEvents, ModalServerInfoVariables} from "tc-shared/ui/modal/server-info/Definitions";
import {IpcUiVariableProvider} from "tc-shared/ui/utils/IpcVariable";
import {CallOnce, ignorePromise} from "tc-shared/proto";
import {spawnModal} from "tc-shared/ui/react-elements/modal";
import {ServerConnectionInfoResult, ServerProperties} from "tc-shared/tree/Server";
import {LogCategory, logWarn} from "tc-shared/log";
import {spawnServerBandwidth} from "tc-shared/ui/modal/server-bandwidth/Controller";

const kPropertyUpdateMatrix: {[T in keyof ServerProperties]?: [keyof ModalServerInfoVariables]} = {
    "virtualserver_name": [ "name" ],
    "virtualserver_country_code": [ "region" ],
    "virtualserver_reserved_slots": [ "slots" ],
    "virtualserver_maxclients": [ "slots" ],
    "virtualserver_clientsonline": [ "slots" ],
    "virtualserver_queryclientsonline": [ "slots" ],
    "virtualserver_created": [ "firstRun" ],
    "virtualserver_uptime": [ "uptime" ],

    "virtualserver_version": [ "version" ],
    "virtualserver_platform": [ "platform" ],
    "virtualserver_unique_identifier": [ "uniqueId" ],
    "virtualserver_channelsonline": [ "channelCount" ],
    "virtualserver_codec_encryption_mode": [ "voiceDataEncryption" ],
    "virtualserver_needed_identity_security_level": [ "securityLevel" ],
    "virtualserver_complain_autoban_count": [ "complainsUntilBan" ],
};

class Controller {
    readonly handler: ConnectionHandler;
    readonly events: Registry<ModalServerInfoEvents>;
    readonly variables: IpcUiVariableProvider<ModalServerInfoVariables>;

    private serverListeners: (() => void)[];

    private connectionInfoInterval: number;
    private connectionInfo: ServerConnectionInfoResult;

    private propertyUpdateInterval: number;
    private nextRefreshAllowed: number;

    constructor(handler: ConnectionHandler) {
        this.handler = handler;

        this.events = new Registry<ModalServerInfoEvents>();
        this.variables = new IpcUiVariableProvider<ModalServerInfoVariables>();
    }

    private getServerProperties() : ServerProperties {
        return this.handler.channelTree.server.properties;
    }

    @CallOnce
    initialize() {
        this.variables.setVariableProvider("name", () => this.getServerProperties().virtualserver_name);
        this.variables.setVariableProvider("region", () => this.getServerProperties().virtualserver_country_code);
        this.variables.setVariableProvider("slots", () => ({
            max: this.getServerProperties().virtualserver_maxclients,
            reserved: this.getServerProperties().virtualserver_reserved_slots,

            used: this.getServerProperties().virtualserver_clientsonline,
            queries: this.getServerProperties().virtualserver_queryclientsonline
        }));
        this.variables.setVariableProvider("firstRun", () => this.getServerProperties().virtualserver_created);
        this.variables.setVariableProvider("uptime", () => this.getServerProperties().virtualserver_uptime);

        this.variables.setVariableProvider("ipAddress", () => {
            const address = this.handler.channelTree.server.remote_address;
            return address.host + (address.port === 9987 ? "" : ":" + address.port);
        });
        this.variables.setVariableProvider("version", () => this.getServerProperties().virtualserver_version);
        this.variables.setVariableProvider("platform", () => this.getServerProperties().virtualserver_platform);
        /* TODO: Ping & Packet loss */

        this.variables.setVariableProvider("uniqueId", () => this.getServerProperties().virtualserver_unique_identifier);
        this.variables.setVariableProvider("channelCount", () => this.getServerProperties().virtualserver_channelsonline);
        this.variables.setVariableProvider("voiceDataEncryption", () => {
            switch(this.getServerProperties().virtualserver_codec_encryption_mode) {
                case 0:
                    return "global-off";
                case 1:
                    return "channel-individual";
                case 2:
                    return "global-on";
                default:
                    return "unknown";
            }
        });

        this.variables.setVariableProvider("securityLevel", () => this.getServerProperties().virtualserver_needed_identity_security_level);
        this.variables.setVariableProvider("complainsUntilBan", () => this.getServerProperties().virtualserver_complain_autoban_count);

        this.variables.setVariableProvider("hostBanner", () => this.handler.channelTree.server.generateHostBannerInfo());
        this.variables.setVariableProvider("connectionInfo", () => {
            if(this.connectionInfo) {
                return this.connectionInfo;
            } else {
                return { status: "loading" };
            }
        });
        this.variables.setVariableProvider("refreshAllowed", () => this.nextRefreshAllowed);

        this.serverListeners = [];
        this.serverListeners.push(this.handler.channelTree.server.events.on("notify_properties_updated", event => {
            const updatedVariables = new Set<keyof ModalServerInfoVariables>();
            for(const key of Object.keys(event.updated_properties)) {
                kPropertyUpdateMatrix[key]?.forEach(update => updatedVariables.add(update));
            }

            updatedVariables.forEach(entry => this.variables.sendVariable(entry));
        }));
        this.serverListeners.push(this.handler.channelTree.server.events.on("notify_host_banner_updated",
            () => this.variables.sendVariable("hostBanner")
        ));

        this.events.on("action_refresh", () => this.refreshProperties());

        this.refreshConnectionInfo();
        this.connectionInfoInterval = setInterval(() => this.refreshConnectionInfo(), 1000);

        this.refreshProperties();
        this.propertyUpdateInterval = setInterval(() => this.refreshProperties(), 30 * 1000);
    }

    @CallOnce
    destroy() {
        clearInterval(this.connectionInfoInterval);
        this.connectionInfoInterval = 0;

        clearInterval(this.propertyUpdateInterval);
        this.propertyUpdateInterval = 0;

        this.serverListeners?.forEach(callback => callback());
        this.serverListeners = undefined;

        this.events.destroy();
        this.variables.destroy();
    }

    refreshProperties() {
        if(Date.now() < this.nextRefreshAllowed) {
            return;
        }

        this.nextRefreshAllowed = Date.now() + 10 * 1000;
        this.variables.sendVariable("refreshAllowed");

        /*
         * Updates itself will be triggered via the notify_properties_updated event
         */
        const server = this.handler.channelTree.server;
        server.updateProperties().catch(error => {
            logWarn(LogCategory.GENERAL, tr("Failed to update server properties: %o"), error);
        });
    }

    private refreshConnectionInfo() {
        const server = this.handler.channelTree.server;
        server.requestConnectionInfo().then(info => {
            this.connectionInfo = info;
            this.variables.sendVariable("connectionInfo");
        });
    }
}

export function spawnServerInfoNew(handler: ConnectionHandler) {
    const controller = new Controller(handler);
    controller.initialize();

    const modal = spawnModal("modal-server-info", [
        controller.events.generateIpcDescription(),
        controller.variables.generateConsumerDescription()
    ], {
        popoutable: true
    });

    controller.events.on("action_close", () => modal.destroy());
    controller.events.on("action_show_bandwidth", () => spawnServerBandwidth(handler));

    modal.getEvents().on("destroy", () => controller.destroy());
    modal.getEvents().on("destroy", handler.events().on("notify_connection_state_changed", event => {
        if(event.newState !== ConnectionState.CONNECTED) {
            modal.destroy();
        }
    }));
    ignorePromise(modal.show());
}