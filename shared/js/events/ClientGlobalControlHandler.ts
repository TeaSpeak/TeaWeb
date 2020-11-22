import {Registry} from "../events";
import {ClientGlobalControlEvents} from "../events/GlobalEvents";
import {Sound} from "../sound/Sounds";
import {ConnectionHandler} from "../ConnectionHandler";
import {createErrorModal, createInfoModal, createInputModal} from "../ui/elements/Modal";
import {spawnConnectModal} from "../ui/modal/ModalConnect";
import PermissionType from "../permission/PermissionType";
import {spawnQueryCreate} from "../ui/modal/ModalQuery";
import {openBanList} from "../ui/modal/ModalBanList";
import {formatMessage} from "../ui/frames/chat";
import {CommandResult} from "../connection/ServerConnectionDeclaration";
import {spawnSettingsModal} from "../ui/modal/ModalSettings";
import {spawnPermissionEditorModal} from "../ui/modal/permission/ModalPermissionEditor";
import {tr} from "../i18n/localize";
import {spawnGlobalSettingsEditor} from "tc-shared/ui/modal/global-settings-editor/Controller";
import {spawnModalCssVariableEditor} from "tc-shared/ui/modal/css-editor/Controller";
import {server_connections} from "tc-shared/ConnectionManager";
import {spawnAbout} from "tc-shared/ui/modal/ModalAbout";
import {spawnVideoSourceSelectModal} from "tc-shared/ui/modal/video-source/Controller";
import {LogCategory, logError} from "tc-shared/log";
import {getVideoDriver} from "tc-shared/video/VideoSource";

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

            default:
                console.warn(tr("Received open window event for an unknown window: %s"), event.window);
        }
    });

    event_registry.on("action_open_window_connect", event => {
        spawnConnectModal({
            default_connect_new_tab: event.newTab
        });
    });

    event_registry.on("action_open_window_settings", event => {
        spawnSettingsModal(event.defaultCategory);
    });

    event_registry.on("action_open_window_permissions", event => {
        spawnPermissionEditorModal(event.connection ? event.connection : server_connections.active_connection(), event.defaultTab);
    });

    event_registry.on("action_toggle_video_broadcasting", event => {
        if(event.enabled) {
            spawnVideoSourceSelectModal(event.broadcastType, true).then(async source => {
                if(!source) { return; }

                try {
                    event.connection.getServerConnection().getVideoConnection().startBroadcasting(event.broadcastType, source)
                        .catch(error => {
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
                } finally {
                    source.deref();
                }
            });
        } else {
            event.connection.getServerConnection().getVideoConnection().stopBroadcasting(event.broadcastType);
        }
    });
}