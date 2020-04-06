import {Registry} from "tc-shared/events";
import {ClientGlobalControlEvents} from "tc-shared/events/GlobalEvents";
import {control_bar_instance, ControlBarEvents} from "tc-shared/ui/frames/control-bar";
import {manager, Sound} from "tc-shared/sound/Sounds";
import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import {server_connections} from "tc-shared/ui/frames/connection_handlers";
import {createErrorModal, createInfoModal, createInputModal} from "tc-shared/ui/elements/Modal";
import {default_recorder} from "tc-shared/voice/RecorderProfile";
import {Settings, settings} from "tc-shared/settings";
import {add_current_server} from "tc-shared/bookmarks";
import {spawnConnectModal} from "tc-shared/ui/modal/ModalConnect";
import PermissionType from "tc-shared/permission/PermissionType";
import {spawnQueryCreate} from "tc-shared/ui/modal/ModalQuery";
import {openBanList} from "tc-shared/ui/modal/ModalBanList";
import {spawnPermissionEdit} from "tc-shared/ui/modal/permission/ModalPermissionEdit";
import {formatMessage} from "tc-shared/ui/frames/chat";
import {CommandResult} from "tc-shared/connection/ServerConnectionDeclaration";
import {spawnSettingsModal} from "tc-shared/ui/modal/ModalSettings";

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

function load_default_states() {
    this.event_registry.fire("action_toggle_speaker", { state: settings.static_global(Settings.KEY_CONTROL_MUTE_OUTPUT, false) });
    this.event_registry.fire("action_toggle_microphone", { state: settings.static_global(Settings.KEY_CONTROL_MUTE_INPUT, false) });
}

export function initialize(event_registry: Registry<ClientGlobalControlEvents>) {
    let current_connection_handler: ConnectionHandler | undefined;
    event_registry.on("action_set_active_connection_handler", event => { current_connection_handler = event.handler; });

    initialize_sounds(event_registry);

    /* away state handler */
    event_registry.on("action_set_away", event => {
        const set_away = message => {
            for(const connection of event.globally ? server_connections.server_connection_handlers() : [server_connections.active_connection_handler()]) {
                if(!connection) continue;

                connection.set_away_status(typeof message === "string" && !!message ? message : true, false);
            }
            control_bar_instance()?.events()?.fire("update_state", { state: "away" });
        };

        if(event.prompt_reason) {
            createInputModal(tr("Set away message"), tr("Please enter your away message"), () => true, message => {
                if(typeof(message) === "string")
                    set_away(message);
            }).open();
        } else {
            set_away(undefined);
        }
    });

    event_registry.on("action_disable_away", event => {
        for(const connection of event.globally ? server_connections.server_connection_handlers() : [server_connections.active_connection_handler()]) {
            if(!connection) continue;

            connection.set_away_status(false, false);
        }

        control_bar_instance()?.events()?.fire("update_state", { state: "away" });
    });


    event_registry.on("action_toggle_microphone", event => {
        /* just update the last changed value */
        settings.changeGlobal(Settings.KEY_CONTROL_MUTE_INPUT,  !event.state);

        if(current_connection_handler) {
            current_connection_handler.client_status.input_muted = !event.state;
            if(!current_connection_handler.client_status.input_hardware)
                current_connection_handler.acquire_recorder(default_recorder, true); /* acquire_recorder already updates the voice status */
            else
                current_connection_handler.update_voice_status(undefined);
        }
    });

    event_registry.on("action_toggle_speaker", event => {
        /* just update the last changed value */
        settings.changeGlobal(Settings.KEY_CONTROL_MUTE_OUTPUT, !event.state);

        if(!current_connection_handler) return;

        current_connection_handler.client_status.output_muted = !event.state;
        current_connection_handler.update_voice_status(undefined);
    });

    event_registry.on("action_set_channel_subscribe_mode", event => {
        if(!current_connection_handler) return;

        current_connection_handler.client_status.channel_subscribe_all = event.subscribe;
        if(event.subscribe)
            current_connection_handler.channelTree.subscribe_all_channels();
        else
            current_connection_handler.channelTree.unsubscribe_all_channels(true);
        current_connection_handler.settings.changeServer(Settings.KEY_CONTROL_CHANNEL_SUBSCRIBE_ALL, event.subscribe);
    });

    event_registry.on("action_toggle_query", event => {
        if(!current_connection_handler) return;

        current_connection_handler.client_status.queries_visible = event.shown;
        current_connection_handler.channelTree.toggle_server_queries(event.shown);
        current_connection_handler.settings.changeServer(Settings.KEY_CONTROL_SHOW_QUERIES, event.shown);
    });

    event_registry.on("action_add_current_server_to_bookmarks", () => add_current_server());

    event_registry.on("action_open_connect", event => {
        current_connection_handler?.cancel_reconnect(true);
        spawnConnectModal({
            default_connect_new_tab: event.new_tab
        }, {
            url: "ts.TeaSpeak.de",
            enforce: false
        });
    });

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
                    spawnPermissionEdit(connection_handler).open();
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

            case "settings":
                spawnSettingsModal();
                break;

            default:
                console.warn(tr("Received open window event for an unknown window: %s"), event.window);
        }
    });

    load_default_states();
}