import {Registry} from "../events";
import {ClientGlobalControlEvents} from "../events/GlobalEvents";
import {Sound} from "../sound/Sounds";
import {ConnectionHandler} from "../ConnectionHandler";
import {createErrorModal, createInfoModal, createInputModal} from "../ui/elements/Modal";
import PermissionType from "../permission/PermissionType";
import {spawnQueryCreate} from "../ui/modal/ModalQuery";
import {openBanList} from "../ui/modal/ModalBanList";
import {formatMessage} from "../ui/frames/chat";
import {CommandResult} from "../connection/ServerConnectionDeclaration";
import {spawnSettingsModal} from "../ui/modal/ModalSettings";
import {spawnPermissionEditorModal} from "../ui/modal/permission/ModalPermissionEditor";
import {tr, tra} from "../i18n/localize";
import {spawnGlobalSettingsEditor} from "tc-shared/ui/modal/global-settings-editor/Controller";
import {spawnModalCssVariableEditor} from "tc-shared/ui/modal/css-editor/Controller";
import {server_connections} from "tc-shared/ConnectionManager";
import {spawnAbout} from "tc-shared/ui/modal/ModalAbout";
import {spawnVideoSourceSelectModal} from "tc-shared/ui/modal/video-source/Controller";
import {LogCategory, logError, logWarn} from "tc-shared/log";
import {spawnEchoTestModal} from "tc-shared/ui/modal/echo-test/Controller";
import {spawnConnectModalNew} from "tc-shared/ui/modal/connect/Controller";

/*
function initialize_sounds(event_registry: Registry<ClientGlobalControlEvents>) {
    {
        let microphone_muted = undefined;
        event_registry.on("action_toggle_speaker", event => {
            if(microphone_muted === event.state) return;
            if(typeof microphone_muted !== "undefined")
                manager.play(event.state ? Sound.MICROPHONE_MUTED : Sound.MICROPHONE_ACTIVATED);
            microphone_muted = event.state;
        })
    }
    {
        let speakers_muted = undefined;
        event_registry.on("action_toggle_microphone", event => {
            if(speakers_muted === event.state) return;
            if(typeof speakers_muted !== "undefined")
                manager.play(event.state ? Sound.SOUND_MUTED : Sound.SOUND_ACTIVATED);
            speakers_muted = event.state;
        })
    }
}

export function load_default_states(event_registry: Registry<ClientGlobalControlEvents>) {
    event_registry.fire("action_toggle_speaker", { state: settings.static_global(Settings.KEY_CONTROL_MUTE_OUTPUT, false) });
    event_registry.fire("action_toggle_microphone", { state: settings.static_global(Settings.KEY_CONTROL_MUTE_INPUT, false) });
}
*/

export function initialize(event_registry: Registry<ClientGlobalControlEvents>) {
    let current_connection_handler: ConnectionHandler | undefined;
    server_connections.events().on("notify_active_handler_changed", event => current_connection_handler = event.newHandler);
    //initialize_sounds(event_registry);

    event_registry.on("action_open_window", event => {
        const handle_import_error = error => {
            console.error("Failed to import script: %o", error);
            createErrorModal(tr("Failed to load window"), tr("Failed to load the bookmark window.\nSee the console for more details.")).open();
        };

        const connection_handler = event.connection || current_connection_handler;
        switch (event.window) {
            case "bookmark-manage":
                import("../ui/modal/ModalBookmarks").catch(error => {
                    handle_import_error(error);
                    return undefined;
                }).then(window => {
                    window?.spawnBookmarkModal();
                });
                break;
            case "query-manage":
                if(!connection_handler || !connection_handler.connected) {
                    createErrorModal(tr("You have to be connected"), tr("You have to be connected!")).open();
                    return;
                }
                import("../ui/modal/ModalQueryManage").catch(error => {
                    handle_import_error(error);
                    return undefined;
                }).then(window => {
                    window?.spawnQueryManage(connection_handler);
                });
                break;

            case "query-create":
                if(!connection_handler || !connection_handler.connected) {
                    createErrorModal(tr("You have to be connected"), tr("You have to be connected!")).open();
                    return;
                }

                if(connection_handler.permissions.neededPermission(PermissionType.B_CLIENT_CREATE_MODIFY_SERVERQUERY_LOGIN).granted(1)) {
                    spawnQueryCreate(connection_handler);
                } else {
                    createErrorModal(tr("You dont have the permission"), tr("You dont have the permission to create a server query login")).open();
                    connection_handler.sound.play(Sound.ERROR_INSUFFICIENT_PERMISSIONS);
                }
                break;

            case "ban-list":
                if(!connection_handler || !connection_handler.connected) {
                    createErrorModal(tr("You have to be connected"), tr("You have to be connected!")).open();
                    return;
                }

                if(connection_handler.permissions.neededPermission(PermissionType.B_CLIENT_BAN_LIST).granted(1)) {
                    openBanList(connection_handler);
                } else {
                    createErrorModal(tr("You dont have the permission"), tr("You dont have the permission to view the ban list")).open();
                    connection_handler.sound.play(Sound.ERROR_INSUFFICIENT_PERMISSIONS);
                }
                break;

            case "permissions":
                if(!connection_handler || !connection_handler.connected) {
                    createErrorModal(tr("You have to be connected"), tr("You have to be connected!")).open();
                    return;
                }

                if(connection_handler)
                    spawnPermissionEditorModal(connection_handler);
                else
                    createErrorModal(tr("You have to be connected"), tr("You have to be connected!")).open();
                break;

            case "token-list":
                createErrorModal(tr("Not implemented"), tr("Token list is not implemented yet!")).open();
                break;

            case "token-use":
                //FIXME: Move this out to a dedicated method
                createInputModal(tr("Use token"), tr("Please enter your token/privilege key"), message => message.length > 0, result => {
                    if(!result) return;
                    if(connection_handler.serverConnection.connected)
                        connection_handler.serverConnection.send_command("tokenuse", {
                            token: result
                        }).then(() => {
                            createInfoModal(tr("Use token"), tr("Toke successfully used!")).open();
                        }).catch(error => {
                            //TODO tr
                            createErrorModal(tr("Use token"), formatMessage(tr("Failed to use token: {}"), error instanceof CommandResult ? error.message : error)).open();
                        });
                }).open();
                break;

            case "css-variable-editor":
                spawnModalCssVariableEditor();
                break;

            case "settings":
                spawnSettingsModal();
                break;

            case "settings-registry":
                spawnGlobalSettingsEditor();
                break;

            case "about":
                spawnAbout();
                break;

            case "server-echo-test":
                const connection = event.connection || server_connections.getActiveConnectionHandler();
                if(connection) {
                    spawnEchoTestModal(connection);
                }
                break;

            default:
                console.warn(tr("Received open window event for an unknown window: %s"), event.window);
        }
    });

    event_registry.on("action_open_window_connect", event => {
        spawnConnectModalNew({
            connectInANewTab: event.newTab
        });
    });

    event_registry.on("action_open_window_settings", event => {
        spawnSettingsModal(event.defaultCategory);
    });

    event_registry.on("action_open_window_permissions", event => {
        spawnPermissionEditorModal(event.connection ? event.connection : server_connections.getActiveConnectionHandler(), event.defaultTab);
    });

    event_registry.on("action_toggle_video_broadcasting", event => {
        if(event.enabled) {
            const connection = event.connection;
            if(!connection.connected) {
                createErrorModal(tr("You're not connected"), tr("You're not connected to any server!")).open();
                return;
            }

            spawnVideoSourceSelectModal(event.broadcastType, event.quickSelect ? { mode: "select-quick", defaultDevice: event.defaultDevice } : { mode: "select-default", defaultDevice: event.defaultDevice })
                .then(async ({ source, config }) => {
                if(!source) { return; }

                try {
                    const broadcast = connection.getServerConnection().getVideoConnection().getLocalBroadcast(event.broadcastType);
                    if(broadcast.getState().state === "initializing" || broadcast.getState().state === "broadcasting") {
                        console.error("Change source");
                        broadcast.changeSource(source, config).catch(error => {
                            logError(LogCategory.VIDEO, tr("Failed to change broadcast source: %o"), event.broadcastType, error);
                            if(typeof error !== "string") {
                                error = tr("lookup the console for detail");
                            }

                            if(event.broadcastType === "camera") {
                                createErrorModal(tr("Failed to change video source"), tra("Failed to change video broadcasting source:\n{}", error)).open();
                            } else {
                                createErrorModal(tr("Failed to change screen sharing source"), tra("Failed to change screen sharing source:\n{}", error)).open();
                            }
                        });
                    } else {
                        console.error("Start broadcast");
                        broadcast.startBroadcasting(source, config).catch(error => {
                            logError(LogCategory.VIDEO, tr("Failed to start %s broadcasting: %o"), event.broadcastType, error);
                            if(typeof error !== "string") {
                                error = tr("lookup the console for detail");
                            }

                            if(event.broadcastType === "camera") {
                                createErrorModal(tr("Failed to start video broadcasting"), tra("Failed to start video broadcasting:\n{}", error)).open();
                            } else {
                                createErrorModal(tr("Failed to start screen sharing"), tra("Failed to start screen sharing:\n{}", error)).open();
                            }
                        });
                    }
                } finally {
                    source.deref();
                }
            });
        } else {
            const connection = event.connection;
            const broadcast = connection.getServerConnection().getVideoConnection().getLocalBroadcast(event.broadcastType);
            broadcast.stopBroadcasting();
        }
    });

    event_registry.on("action_edit_video_broadcasting", event => {
        const connection = event.connection;
        if(!connection.connected) {
            createErrorModal(tr("You're not connected"), tr("You're not connected to any server!")).open();
            return;
        }

        const broadcast = connection.getServerConnection().getVideoConnection().getLocalBroadcast(event.broadcastType);
        if(!broadcast || (broadcast.getState().state !== "broadcasting" && broadcast.getState().state !== "initializing")) {
            createErrorModal(tr("You're not broadcasting"), tr("You're not broadcasting any video!")).open();
            return;
        }

        spawnVideoSourceSelectModal(event.broadcastType, { mode: "edit", source: broadcast.getSource(), broadcastConstraints: Object.assign({}, broadcast.getConstraints()) })
        .then(async ({ source, config }) => {
            if (!source) {
                return;
            }

            if(broadcast.getState().state !== "broadcasting" && broadcast.getState().state !== "initializing") {
                createErrorModal(tr("Video broadcast has ended"), tr("The video broadcast has ended.\nUpdate failed.")).open();
                return;
            }

            await broadcast.changeSource(source, config);
        }).catch(error => {
            logWarn(LogCategory.VIDEO, tr("Failed to edit video broadcast: %o"), error);
            createErrorModal(tr("Broadcast update failed"), tr("We failed to update the current video broadcast settings.\nThe old settings will be used.")).open();
        });
    });
}