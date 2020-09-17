import * as loader from "tc-loader";
import {settings, Settings} from "tc-shared/settings";
import * as log from "tc-shared/log";
import {LogCategory} from "tc-shared/log";
import * as bipc from "./ipc/BrowserIPC";
import * as sound from "./sound/Sounds";
import * as i18n from "./i18n/localize";
import {tra} from "./i18n/localize";
import {ConnectionHandler, ConnectionState} from "tc-shared/ConnectionHandler";
import {createInfoModal} from "tc-shared/ui/elements/Modal";
import * as stats from "./stats";
import * as fidentity from "./profiles/identities/TeaForumIdentity";
import {defaultRecorder, RecorderProfile, setDefaultRecorder} from "tc-shared/voice/RecorderProfile";
import * as cmanager from "tc-shared/ui/frames/connection_handlers";
import {server_connections} from "tc-shared/ui/frames/connection_handlers";
import {spawnConnectModal} from "tc-shared/ui/modal/ModalConnect";
import * as top_menu from "./ui/frames/MenuBar";
import {spawnYesNo} from "tc-shared/ui/modal/ModalYesNo";
import {formatMessage} from "tc-shared/ui/frames/chat";
import {openModalNewcomer} from "tc-shared/ui/modal/ModalNewcomer";
import * as aplayer from "tc-backend/audio/player";
import * as ppt from "tc-backend/ppt";
import * as keycontrol from "./KeyControl";
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as cbar from "./ui/frames/control-bar";
import * as global_ev_handler from "./events/ClientGlobalControlHandler";
import {global_client_actions} from "tc-shared/events/GlobalEvents";
import {FileTransferState, TransferProvider,} from "tc-shared/file/Transfer";
import {MenuEntryType, spawn_context_menu} from "tc-shared/ui/elements/ContextMenu";
import {copy_to_clipboard} from "tc-shared/utils/helpers";
import {checkForUpdatedApp} from "tc-shared/update";
import {setupJSRender} from "tc-shared/ui/jsrender";
import "svg-sprites/client-icons";

/* required import for init */
import "../css/load-css"
import "./proto";
import "./ui/elements/ContextDivider";
import "./ui/elements/Tab";
import "./connection/CommandHandler";
import "./connection/ConnectionBase";
import {ConnectRequestData} from "tc-shared/ipc/ConnectHandler";
import "./video-viewer/Controller";
import "./profiles/ConnectionProfile";
import "./update/UpdaterWeb";
import ContextMenuEvent = JQuery.ContextMenuEvent;
import {defaultConnectProfile, findConnectProfile} from "tc-shared/profiles/ConnectionProfile";
import {spawnGlobalSettingsEditor} from "tc-shared/ui/modal/global-settings-editor/Controller";

let preventWelcomeUI = false;
async function initialize() {
    try {
        await i18n.initialize();
    } catch(error) {
        console.error(tr("Failed to initialized the translation system!\nError: %o"), error);
        loader.critical_error("Failed to setup the translation system");
        return;
    }

    bipc.setup();
}

async function initialize_app() {
    try { //Initialize main template
        const main = $("#tmpl_main").renderTag({
            multi_session:  !settings.static_global(Settings.KEY_DISABLE_MULTI_SESSION),
            app_version: __build.version
        }).dividerfy();

        $("body").append(main);
    } catch(error) {
        log.error(LogCategory.GENERAL, error);
        loader.critical_error(tr("Failed to setup main page!"));
        return;
    }
    cmanager.initialize();
    global_ev_handler.initialize(global_client_actions);
    {
        const bar = (
            <cbar.ControlBar ref={cbar.react_reference()} multiSession={true} />
        );

        ReactDOM.render(bar, $(".container-control-bar")[0]);
    }
    /*
    loader.register_task(loader.Stage.JAVASCRIPT_INITIALIZING, {
        name: "settings init",
        priority: 10,
        function: async () => global_ev_handler.load_default_states(client_control_events)
    });
    */

    if(!aplayer.initialize())
        console.warn(tr("Failed to initialize audio controller!"));

    aplayer.on_ready(() => {
        if(aplayer.set_master_volume)
            aplayer.on_ready(() => aplayer.set_master_volume(settings.global(Settings.KEY_SOUND_MASTER) / 100));
        else
            log.warn(LogCategory.GENERAL, tr("Client does not support aplayer.set_master_volume()... May client is too old?"));
    });

    setDefaultRecorder(new RecorderProfile("default"));
    defaultRecorder.initialize().catch(error => {
        log.error(LogCategory.AUDIO, tr("Failed to initialize default recorder: %o"), error);
    });

    sound.initialize().then(() => {
        log.info(LogCategory.AUDIO, tr("Sounds initialized"));
    });
    sound.set_master_volume(settings.global(Settings.KEY_SOUND_MASTER_SOUNDS) / 100);

    try {
        await ppt.initialize();
    } catch(error) {
        log.error(LogCategory.GENERAL, tr("Failed to initialize ppt!\nError: %o"), error);
        loader.critical_error(tr("Failed to initialize ppt!"));
        return;
    }
}

export function handle_connect_request(properties: ConnectRequestData, connection: ConnectionHandler) {
    const profile_uuid = properties.profile || (defaultConnectProfile() || { id: 'default' }).id;
    const profile = findConnectProfile(profile_uuid) || defaultConnectProfile();
    const username = properties.username || profile.connectUsername();

    const password = properties.password ? properties.password.value : "";
    const password_hashed = properties.password ? properties.password.hashed : false;

    if(profile && profile.valid()) {
        settings.changeGlobal(Settings.KEY_USER_IS_NEW, false);
        connection.startConnection(properties.address, profile, true, {
            nickname: username,
            password: password.length > 0 ? {
                password: password,
                hashed: password_hashed
            } : undefined
        });
        server_connections.set_active_connection(connection);
    } else {
        spawnConnectModal({},{
            url: properties.address,
            enforce: true
        }, {
            profile: profile,
            enforce: true
        });
    }
}

function main() {
    /* initialize font */
    {
        const font = settings.static_global(Settings.KEY_FONT_SIZE);
        $(document.body).css("font-size", font + "px");
        settings.globalChangeListener(Settings.KEY_FONT_SIZE, value => {
            $(document.body).css("font-size", value + "px");
        })
    }

    /* context menu prevent */
    $(document).on('contextmenu', (event: ContextMenuEvent) => {
        if(event.isDefaultPrevented())
            return;

        if(event.target instanceof HTMLInputElement) {
            if((!!event.target.value || __build.target === "client") && !event.target.disabled && !event.target.readOnly && event.target.type !== "number") {
                spawn_context_menu(event.pageX, event.pageY, {
                    type: MenuEntryType.ENTRY,
                    name: tr("Copy"),
                    callback: () => {
                        copy_to_clipboard(event.target.value);
                    },
                    icon_class: "client-copy",
                    visible: !!event.target.value
                }, {
                    type: MenuEntryType.ENTRY,
                    name: tr("Paste"),
                    callback: () => {
                        const { clipboard } = __non_webpack_require__('electron');
                        event.target.value = clipboard.readText();
                    },
                    icon_class: "client-copy",
                    visible: __build.target === "client",
                });
            }
            event.preventDefault();
            return;
        }

        if(!settings.static_global(Settings.KEY_DISABLE_GLOBAL_CONTEXT_MENU))
            event.preventDefault();
    });

    top_menu.initialize();

    const initial_handler = server_connections.spawn_server_connection();
    initial_handler.acquireInputHardware().then(() => {});
    cmanager.server_connections.set_active_connection(initial_handler);
    /** Setup the XF forum identity **/
    fidentity.update_forum();
    keycontrol.initialize();

    stats.initialize({
        verbose: true,
        anonymize_ip_addresses: true,
        volatile_collection_only: false
    });
    stats.register_user_count_listener(status => {
        log.info(LogCategory.STATISTICS, tr("Received user count update: %o"), status);
    });

    server_connections.set_active_connection(server_connections.all_connections()[0]);
    checkForUpdatedApp();

    (window as any).test_download = async () => {
        const connection = server_connections.active_connection();
        const download = connection.fileManager.initializeFileDownload({
            targetSupplier: async () => await TransferProvider.provider().createDownloadTarget(),
            name: "HomeStudent2019Retail.img",
            path: "/",
            channel: 4
        });

        console.log("Download stated");
        await download.awaitFinished();
        console.log("Download finished (%s)", FileTransferState[download.transferState()]);
        //console.log(await (download.target as ResponseTransferTarget).getResponse().blob());
        console.log("Have buffer");
    };

    (window as any).test_upload = async () => {
        const connection = server_connections.active_connection();
        const download = connection.fileManager.initializeFileUpload({
            source: async () => await TransferProvider.provider().createTextSource("Hello my lovely world...."),
            name: "test-upload.txt",
            path: "/",
            channel: 4
        });

        console.log("Download stated");
        await download.awaitFinished();
        console.log("Download finished (%s)", FileTransferState[download.transferState()]);
        //console.log(await (download.target as ResponseTransferTarget).getResponse().blob());
        console.log("Have buffer");
    };

    /* schedule it a bit later then the main because the main function is still within the loader */
    setTimeout(() => {
        const connection = server_connections.active_connection();
        /*
        Modals.createChannelModal(connection, undefined, undefined, connection.permissions, (cb, perms) => {
            
        });
        */
       // Modals.openServerInfo(connection.channelTree.server);
        //Modals.createServerModal(connection.channelTree.server, properties => Promise.resolve());

        //Modals.openClientInfo(connection.getClient());
        //Modals.openServerInfoBandwidth(connection.channelTree.server);

        //Modals.openBanList(connection);
        /*
        Modals.spawnBanClient(connection,[
            {name: "WolverinDEV", unique_id: "XXXX"},
            {name: "WolverinDEV", unique_id: "XXXX"},
            {name: "WolverinDEV", unique_id: "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"},
            {name: "WolverinDEV", unique_id: "YYY"}
        ], () => {});
        */
    }, 4000);
    //spawnSettingsModal("general-keymap");
    //Modals.spawnKeySelect(console.log);
    //Modals.spawnBookmarkModal();

    /*
    {
        const modal = createModal({
            header: tr("Test Net Graph"),
            body: () => {
                const canvas = $.spawn("canvas")
                    .css("position", "absolute")
                    .css({
                        top: 0,
                        bottom: 0,
                        right: 0,
                        left: 0
                    });

                return $.spawn("div")
                    .css("height", "5em")
                    .css("width", "30em")
                    .css("position", "relative")
                    .append(canvas);
            },
            footer: null
        });

        const graph = new net.graph.Graph(modal.htmlTag.find("canvas")[0] as any);
        graph.initialize();

        modal.close_listener.push(() => graph.terminate());
        modal.open();
    }
     */
    //setTimeout(() => spawnPermissionEditorModal(server_connections.active_connection()), 3000);
    //setTimeout(() => spawnGroupCreate(server_connections.active_connection(), "server"), 3000);

    if(settings.static_global(Settings.KEY_USER_IS_NEW) && !preventWelcomeUI) {
        const modal = openModalNewcomer();
        modal.close_listener.push(() => settings.changeGlobal(Settings.KEY_USER_IS_NEW, false));
    }

    //spawnGlobalSettingsEditor();
    //spawnVideoPopout(server_connections.active_connection(), "https://www.youtube.com/watch?v=9683D18fyvs");
}

const task_teaweb_starter: loader.Task = {
    name: "voice app starter",
    function: async () => {
        try {
            await initialize_app();
            main();
            if(!aplayer.initialized()) {
                log.info(LogCategory.VOICE, tr("Initialize audio controller later!"));
                if(!aplayer.initializeFromGesture) {
                    console.error(tr("Missing aplayer.initializeFromGesture"));
                } else
                    $(document).one('click', () => aplayer.initializeFromGesture());
            }
        } catch (ex) {
            console.error(ex.stack);
            if(ex instanceof ReferenceError || ex instanceof TypeError)
                ex = ex.name + ": " + ex.message;
            loader.critical_error("Failed to invoke main function:<br>" + ex);
        }
    },
    priority: 10
};

const task_connect_handler: loader.Task = {
    name: "Connect handler",
    function: async () => {
        const address = settings.static(Settings.KEY_CONNECT_ADDRESS, "");
        const chandler = bipc.getInstanceConnectHandler();
        if(settings.static(Settings.KEY_FLAG_CONNECT_DEFAULT, false) && address) {
            const connect_data = {
                address: address,

                profile: settings.static(Settings.KEY_CONNECT_PROFILE, ""),
                username: settings.static(Settings.KEY_CONNECT_USERNAME, ""),

                password: {
                    value: settings.static(Settings.KEY_CONNECT_PASSWORD, ""),
                    hashed: settings.static(Settings.KEY_FLAG_CONNECT_PASSWORD, false)
                }
            };

            if(chandler && !settings.static(Settings.KEY_CONNECT_NO_SINGLE_INSTANCE)) {
                try {
                    await chandler.post_connect_request(connect_data, () => new Promise<boolean>((resolve, reject) => {
                        spawnYesNo(tr("Another TeaWeb instance is already running"), tra("Another TeaWeb instance is already running.{:br:}Would you like to connect there?"), response => {
                            resolve(response);
                        }, {
                            closeable: false
                        }).open();
                    }));
                    log.info(LogCategory.CLIENT, tr("Executed connect successfully in another browser window. Closing this window"));

                    const message =
                        "You're connecting to {0} within the other TeaWeb instance.{:br:}" +
                        "You could now close this page.";
                    createInfoModal(
                        tr("Connecting successfully within other instance"),
                        formatMessage(/* @tr-ignore */ tr(message), connect_data.address),
                        {
                            closeable: false,
                            footer: undefined
                        }
                    ).open();
                    return;
                } catch(error) {
                    log.info(LogCategory.CLIENT, tr("Failed to execute connect within other TeaWeb instance. Using this one. Error: %o"), error);
                }
            }

            preventWelcomeUI = true;
            loader.register_task(loader.Stage.LOADED, {
                priority: 0,
                function: async () => handle_connect_request(connect_data, server_connections.active_connection() || server_connections.spawn_server_connection()),
                name: tr("default url connect")
            });
        }
        if(chandler) {
            /* no instance avail, so lets make us avail */
            chandler.callback_available = data => {
                return !settings.static_global(Settings.KEY_DISABLE_MULTI_SESSION);
            };

            chandler.callback_execute = data => {
                preventWelcomeUI = true;
                handle_connect_request(data, server_connections.spawn_server_connection());
                return true;
            }
        }
        loader.register_task(loader.Stage.LOADED, task_teaweb_starter);
    },
    priority: 10
};

const task_certificate_callback: loader.Task = {
    name: "certificate accept tester",
    function: async () => {
        /*
            This is not needed any more. If we would use the certificate accept stuff, we would have an extra loader target.
            I'm just keeping this, so later I've not to to any work, writing this, again.
        const certificate_accept = settings.static_global(Settings.KEY_CERTIFICATE_CALLBACK, undefined);
        if(certificate_accept) {
            log.info(LogCategory.IPC, tr("Using this instance as certificate callback. ID: %s"), certificate_accept);
            try {
                try {
                    await bipc.getInstance().post_certificate_accpected(certificate_accept);
                } catch(e) {} //FIXME remove!
                log.info(LogCategory.IPC, tr("Other instance has acknowledged out work. Closing this window."));

                const seconds_tag = $.spawn("a");

                let seconds = 5;
                let interval_id;
                interval_id = setInterval(() => {
                    seconds--;
                    seconds_tag.text(seconds.toString());

                    if(seconds <= 0) {
                        clearTimeout(interval_id);
                        log.info(LogCategory.GENERAL, tr("Closing window"));
                        window.close();
                        return;
                    }
                }, 1000);

                createInfoModal(
                    tr("Certificate acccepted successfully"),
                    formatMessage(tr("You've successfully accepted the certificate.{:br:}This page will close in {0} seconds."), seconds_tag),
                    {
                        closeable: false,
                        footer: undefined
                    }
                ).open();
                return;
            } catch(error) {
                log.warn(LogCategory.IPC, tr("Failed to successfully post certificate accept status: %o"), error);
            }
        } else {
            log.info(LogCategory.IPC, tr("We're not used to accept certificated. Booting app."));
        }
         */
        loader.register_task(loader.Stage.LOADED, task_connect_handler);
    },
    priority: 10
};

loader.register_task(loader.Stage.JAVASCRIPT_INITIALIZING, {
    name: "jrendere initialize",
    function: async () => {
        try {
            if(!setupJSRender())
                throw "invalid load";
        } catch (error) {
            loader.critical_error(tr("Failed to setup jsrender"));
            console.error(tr("Failed to load jsrender! %o"), error);
            return;
        }
    },
    priority: 100
});

loader.register_task(loader.Stage.JAVASCRIPT_INITIALIZING, {
    name: "app starter",
    function: async () => {
        try {
            await initialize();

            if(__build.target == "web") {
                loader.register_task(loader.Stage.LOADED, task_certificate_callback);
            } else {
                loader.register_task(loader.Stage.LOADED, task_teaweb_starter);
            }
        } catch (ex) {
            if(ex instanceof Error || typeof(ex.stack) !== "undefined")
                console.error((tr || (msg => msg))("Critical error stack trace: %o"), ex.stack);

            if(ex instanceof ReferenceError || ex instanceof TypeError)
                ex = ex.name + ": " + ex.message;
            loader.critical_error("Failed to boot app function:<br>" + ex);
        }
    },
    priority: 1000
});

loader.register_task(loader.Stage.LOADED, {
    name: "error task",
    function: async () => {
        if(Settings.instance.static(Settings.KEY_LOAD_DUMMY_ERROR, false)) {
            loader.critical_error("The tea is cold!", "Argh, this is evil! Cold tea dosn't taste good.");
            throw "The tea is cold!";
        }
    },
    priority: 20
});