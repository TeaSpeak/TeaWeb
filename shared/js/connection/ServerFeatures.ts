import {ConnectionEvents, ConnectionHandler, ConnectionState} from "../ConnectionHandler";
import {Registry} from "../events";
import {CommandResult} from "../connection/ServerConnectionDeclaration";
import {ErrorCode} from "../connection/ErrorCode";
import {LogCategory, logDebug, logTrace, logWarn} from "../log";
import {ExplicitCommandHandler} from "../connection/AbstractCommandHandler";
import { tr } from "tc-shared/i18n/localize";

export type ServerFeatureSupport = "unsupported" | "supported" | "experimental" | "deprecated";

export enum ServerFeature {
    ERROR_BULKS= "error-bulks", /* Current version is 1 */
    ADVANCED_CHANNEL_CHAT= "advanced-channel-chat", /* Current version is 1 */
    LOG_QUERY= "log-query", /* Current version is 1 */
    WHISPER_ECHO = "whisper-echo", /* Current version is 1 */
    VIDEO = "video"
}

export interface ServerFeatureEvents {
    notify_state_changed: {
        feature: ServerFeature,
        version?: number,
        support: ServerFeatureSupport
    }
}

export class ServerFeatures {
    readonly events: Registry<ServerFeatureEvents>;
    private readonly connection: ConnectionHandler;
    private readonly explicitCommandHandler: ExplicitCommandHandler;
    private readonly stateChangeListener: (event: ConnectionEvents["notify_connection_state_changed"]) => void;

    private featureAwait: Promise<boolean>;
    private featureAwaitCallback: (success: boolean) => void;
    private featuresSet = false;

    private featureStates: {[key: string]: { version?: number, support: ServerFeatureSupport }} = {};

    constructor(connection: ConnectionHandler) {
        this.events = new Registry<ServerFeatureEvents>();
        this.connection = connection;

        this.connection.getServerConnection().command_handler_boss().register_explicit_handler("notifyfeaturesupport", this.explicitCommandHandler = command => {
            for(const set of command.arguments) {
                let support: ServerFeatureSupport;
                switch (parseInt(set["support"])) {
                    case 0:
                        support = "unsupported";
                        break;

                    case 1:
                        support = "supported";
                        break;

                    case 2:
                        support = "experimental";
                        break;

                    case 3:
                        support = "deprecated";
                        break;

                    default:
                        logWarn(LogCategory.SERVER, tr("Received feature %s with unknown support state: %s"), set["name"], set["support"])
                }
                this.setFeatureSupport(set["name"], support, parseInt(set["version"]));
            }
        });

        this.connection.events().on("notify_connection_state_changed", this.stateChangeListener = event => {
            if(event.newState === ConnectionState.CONNECTED) {
                this.connection.getServerConnection().send_command("listfeaturesupport").catch(error => {
                    this.disableAllFeatures();
                    if(error instanceof CommandResult) {
                        if(error.id === ErrorCode.COMMAND_NOT_FOUND) {
                            logDebug(LogCategory.SERVER, tr("Target server does not support the feature list command. Disabling all features."));
                            return;
                        }
                    }
                    logWarn(LogCategory.SERVER, tr("Failed to query server features: %o"), error);
                }).then(() => {
                    this.featuresSet = true;
                    if(this.featureAwaitCallback) {
                        this.featureAwaitCallback(true);
                    }
                });
            } else if(event.newState === ConnectionState.DISCONNECTING || event.newState === ConnectionState.UNCONNECTED) {
                this.disableAllFeatures();
                this.featureAwait = undefined;
                this.featureAwaitCallback = undefined;
                this.featuresSet = false;
            }
        });
    }

    destroy() {
        this.connection.events().off(this.stateChangeListener);
        this.connection.getServerConnection()?.command_handler_boss()?.unregister_explicit_handler("notifyfeaturesupport", this.explicitCommandHandler);

        if(this.featureAwaitCallback) {
            this.featureAwaitCallback(false);
        }

        this.events.destroy();
    }

    supportsFeature(feature: ServerFeature, version?: number) : boolean {
        const support = this.featureStates[feature];
        if(!support) {
            return false;
        }

        if(support.support === "supported" || support.support === "experimental" || support.support === "deprecated") {
            return typeof version === "number" ? version >= support.version : true;
        }

        return false;
    }

    awaitFeatures() : Promise<boolean> {
        if(this.featureAwait) {
            return this.featureAwait;
        } else if(this.featuresSet) {
            return Promise.resolve(true);
        }

        return this.featureAwait = new Promise<boolean>(resolve => this.featureAwaitCallback = resolve);
    }

    listenSupportChange(feature: ServerFeature, listener: (support: boolean) => void, version?: number) : () => void {
        return this.events.on("notify_state_changed", event => {
            if(event.feature !== feature) {
                return;
            }

            listener(this.supportsFeature(feature, version));
        });
    }

    private disableAllFeatures() {
        for(const feature of Object.keys(this.featureStates) as ServerFeature[]) {
            this.setFeatureSupport(feature, "unsupported");
        }
    }

    private setFeatureSupport(feature: ServerFeature, support: ServerFeatureSupport, version?: number) {
        logTrace(LogCategory.SERVER, tr("Setting server feature %s to %s (version %d)"), feature, support, version);
        if(support === "unsupported") {
            if(!this.featureStates[feature]) {
                return;
            }

            delete this.featureStates[feature];
            this.events.fire("notify_state_changed", { feature: feature, support: "unsupported" });
        } else {
            if(!this.featureStates[feature] || this.featureStates[feature].version !== version || this.featureStates[feature].support !== support) {
                this.featureStates[feature] = {
                    support: support,
                    version: version
                };

                this.events.fire("notify_state_changed", {
                    feature: feature,
                    support: support,
                    version: version
                });
            }
        }
    }
}