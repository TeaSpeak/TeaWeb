import * as moment from "moment";
import * as loader from "tc-loader";
import {settings, Settings} from "tc-shared/settings";
import * as profiles from "tc-shared/profiles/ConnectionProfile";
import {LogCategory} from "tc-shared/log";
import * as log from "tc-shared/log";
import * as bipc from "./BrowserIPC";
import * as sound from "./sound/Sounds";
import * as i18n from "./i18n/localize";
import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import {createInfoModal} from "tc-shared/ui/elements/Modal";
import {tra} from "./i18n/localize";
import {RequestFileUpload} from "tc-shared/FileManager";
import * as stats from "./stats";
import * as fidentity from "./profiles/identities/TeaForumIdentity";
import {default_recorder, RecorderProfile, set_default_recorder} from "tc-shared/voice/RecorderProfile";
import * as cmanager from "tc-shared/ui/frames/connection_handlers";
import {server_connections, ServerConnectionManager} from "tc-shared/ui/frames/connection_handlers";
import * as control_bar from "tc-shared/ui/frames/ControlBar";
import {spawnConnectModal} from "tc-shared/ui/modal/ModalConnect";
import * as top_menu from "./ui/frames/MenuBar";
import {spawnYesNo} from "tc-shared/ui/modal/ModalYesNo";
import {formatMessage} from "tc-shared/ui/frames/chat";
import {openModalNewcomer} from "tc-shared/ui/modal/ModalNewcomer";
import * as aplayer from "tc-backend/audio/player";
import * as arecorder from "tc-backend/audio/recorder";
import * as ppt from "tc-backend/ppt";

/* required import for init */
require("./proto").initialize();
require("./ui/elements/ContextDivider").initialize();
require("./connection/CommandHandler"); /* else it might not get bundled because only the backends are accessing it */

const js_render = window.jsrender || $;
const native_client = window.require !== undefined;

declare global {
    interface Window {
        open_connected_question: () => Promise<boolean>;
    }
}

function setup_close() {
    window.onbeforeunload = event => {
        if(profiles.requires_save())
            profiles.save();

        if(!settings.static(Settings.KEY_DISABLE_UNLOAD_DIALOG, false)) {
            const active_connections = server_connections.server_connection_handlers().filter(e => e.connected);
            if(active_connections.length == 0) return;

            if(!native_client) {
                event.returnValue = "Are you really sure?<br>You're still connected!";
            } else {
                const do_exit = () => {
                    const dp = server_connections.server_connection_handlers().map(e => {
                        if(e.serverConnection.connected())
                            return e.serverConnection.disconnect(tr("client closed"));
                        return Promise.resolve();
                    }).map(e => e.catch(error => {
                        console.warn(tr("Failed to disconnect from server on client close: %o"), e);
                    }));

                    const exit = () => {
                        const {remote} = window.require('electron');
                        remote.getCurrentWindow().close();
                    };

                    Promise.all(dp).then(exit);
                    /* force exit after 2500ms */
                    setTimeout(exit, 2500);
                };
                if(window.open_connected_question) {
                    event.preventDefault();
                    event.returnValue = "question";
                    window.open_connected_question().then(result => {
                        if(result) {
                            /* prevent quitting because we try to disconnect */
                            window.onbeforeunload = e => e.preventDefault();

                            /* allow a force quit after 5 seconds */
                            setTimeout(() => window.onbeforeunload, 5000);
                            do_exit();
                        }
                    });
                } else {
                    /* we're in debugging mode */
                    do_exit();
                }
            }
        }
    };
}

function setup_jsrender() : boolean {
    if(!js_render) {
        loader.critical_error("Missing jsrender extension!");
        return false;
    }
    if(!js_render.views) {
        loader.critical_error("Missing jsrender viewer extension!");
        return false;
    }
    js_render.views.settings.allowCode(true);
    js_render.views.tags("rnd", (argument) => {
        let min = parseInt(argument.substr(0, argument.indexOf('~')));
        let max = parseInt(argument.substr(argument.indexOf('~') + 1));

        return (Math.round(Math.random() * (min + max + 1) - min)).toString();
    });

    js_render.views.tags("fmt_date", (...args) => {
        return moment(args[0]).format(args[1]);
    });

    js_render.views.tags("tr", (...args) => {
        return /* @tr-ignore */ tr(args[0]);
    });

    $(".jsrender-template").each((idx, _entry) => {
        if(!js_render.templates(_entry.id, _entry.innerHTML)) {
            log.error(LogCategory.GENERAL, tr("Failed to setup cache for js renderer template %s!"), _entry.id);
        } else
            log.info(LogCategory.GENERAL, tr("Successfully loaded jsrender template %s"), _entry.id);
    });
    return true;
}

async function initialize() {
    Settings.initialize();

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
            app_version: loader.version().ui
        }).dividerfy();

        $("body").append(main);
    } catch(error) {
        log.error(LogCategory.GENERAL, error);
        loader.critical_error(tr("Failed to setup main page!"));
        return;
    }

    control_bar.set_control_bar(new control_bar.ControlBar($("#control_bar"))); /* setup the control bar */

    if(!aplayer.initialize())
        console.warn(tr("Failed to initialize audio controller!"));

    aplayer.on_ready(() => {
        if(aplayer.set_master_volume)
            aplayer.on_ready(() => aplayer.set_master_volume(settings.global(Settings.KEY_SOUND_MASTER) / 100));
        else
            log.warn(LogCategory.GENERAL, tr("Client does not support aplayer.set_master_volume()... May client is too old?"));
        if(arecorder.device_refresh_available())
            arecorder.refresh_devices();
    });

    set_default_recorder(new RecorderProfile("default"));
    default_recorder.initialize().catch(error => {
        log.error(LogCategory.AUDIO, tr("Failed to initialize default recorder: %o"), error);
    });

    sound.initialize().then(() => {
        log.info(LogCategory.AUDIO, tr("Sounds initialized"));
    });
    sound.set_master_volume(settings.global(Settings.KEY_SOUND_MASTER_SOUNDS) / 100);

    await profiles.load();

    try {
        await ppt.initialize();
    } catch(error) {
        log.error(LogCategory.GENERAL, tr("Failed to initialize ppt!\nError: %o"), error);
        loader.critical_error(tr("Failed to initialize ppt!"));
        return;
    }

    setup_close();
}

/*
class TestProxy extends bipc.MethodProxy {
    constructor(params: bipc.MethodProxyConnectParameters) {
        super(bipc.get_handler(), params.channel_id && params.client_id ? params : undefined);

        if(!this.is_slave()) {
            this.register_method(this.add_slave);
        }
        if(!this.is_master()) {
            this.register_method(this.say_hello);
            this.register_method(this.add_master);
        }
    }

    setup() {
        super.setup();
    }

    protected on_connected() {
        log.info(LogCategory.IPC, "Test proxy connected");
    }

    protected on_disconnected() {
        log.info(LogCategory.IPC, "Test proxy disconnected");
    }

    private async say_hello() : Promise<void> {
        log.info(LogCategory.IPC, "Hello World");
    }

    private async add_slave(a: number, b: number) : Promise<number> {
        return a + b;
    }

    private async add_master(a: number, b: number) : Promise<number> {
        return a * b;
    }
}
interface Window {
    proxy_instance: TestProxy & {url: () => string};
}
*/

export function handle_connect_request(properties: bipc.connect.ConnectRequestData, connection: ConnectionHandler) {
    const profile_uuid = properties.profile || (profiles.default_profile() || {id: 'default'}).id;
    const profile = profiles.find_profile(profile_uuid) || profiles.default_profile();
    const username = properties.username || profile.connect_username();

    const password = properties.password ? properties.password.value : "";
    const password_hashed = properties.password ? properties.password.hashed : false;

    if(profile && profile.valid()) {
        connection.startConnection(properties.address, profile, true, {
            nickname: username,
            password: password.length > 0 ? {
                password: password,
                hashed: password_hashed
            } : undefined
        });
        server_connections.set_active_connection_handler(connection);
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
    /*
    window.proxy_instance = new TestProxy({
        client_id: settings.static_global<string>("proxy_client_id", undefined),
        channel_id: settings.static_global<string>("proxy_channel_id", undefined)
    }) as any;
    if(window.proxy_instance.is_master()) {
        window.proxy_instance.setup();
        window.proxy_instance.url = () => {
            const data = window.proxy_instance.generate_connect_parameters();
            return "proxy_channel_id=" + data.channel_id + "&proxy_client_id=" + data.client_id;
        };
    }
    */
    //http://localhost:63343/Web-Client/index.php?_ijt=omcpmt8b9hnjlfguh8ajgrgolr&default_connect_url=true&default_connect_type=teamspeak&default_connect_url=localhost%3A9987&disableUnloadDialog=1&loader_ignore_age=1

    /* initialize font */
    {
        const font = settings.static_global(Settings.KEY_FONT_SIZE, 14); //parseInt(getComputedStyle(document.body).fontSize)
        $(document.body).css("font-size", font + "px");
    }

    /* context menu prevent */
    $(document).on('contextmenu', event => {
        if(event.isDefaultPrevented())
            return;

        if(!settings.static_global(Settings.KEY_DISABLE_GLOBAL_CONTEXT_MENU))
            event.preventDefault();
    });

    top_menu.initialize();

    cmanager.initialize(new ServerConnectionManager($("#connection-handlers")));
    control_bar.control_bar.initialise(); /* before connection handler to allow property apply */

    const initial_handler = server_connections.spawn_server_connection_handler();
    initial_handler.acquire_recorder(default_recorder, false);
    control_bar.control_bar.set_connection_handler(initial_handler);
    /** Setup the XF forum identity **/
    fidentity.update_forum();

    let _resize_timeout: NodeJS.Timer;
    $(window).on('resize', event => {
        if(event.target !== window)
            return;

        if(_resize_timeout)
            clearTimeout(_resize_timeout);
        _resize_timeout = setTimeout(() => {
            for(const connection of server_connections.server_connection_handlers())
                connection.invoke_resized_on_activate = true;
            const active_connection = server_connections.active_connection_handler();
            if(active_connection)
                active_connection.resize_elements();
            $(".window-resize-listener").trigger('resize');
        }, 1000);
    });

    stats.initialize({
        verbose: true,
        anonymize_ip_addresses: true,
        volatile_collection_only: false
    });
    stats.register_user_count_listener(status => {
        log.info(LogCategory.STATISTICS, tr("Received user count update: %o"), status);
    });

    server_connections.set_active_connection_handler(server_connections.server_connection_handlers()[0]);


    (<any>window).test_upload = (message?: string) => {
        message = message || "Hello World";

        const connection = server_connections.active_connection_handler();
        connection.fileManager.upload_file({
            size: message.length,
            overwrite: true,
            channel: connection.getClient().currentChannel(),
            name: '/HelloWorld.txt',
            path: ''
        }).then(key => {
            const upload = new RequestFileUpload(key);

            const buffer = new Uint8Array(message.length);
            {
                for(let index = 0; index < message.length; index++)
                    buffer[index] = message.charCodeAt(index);
            }

            upload.put_data(buffer).catch(error => {
                console.error(error);
            });
        })
    };

    /* schedule it a bit later then the main because the main function is still within the loader */
    setTimeout(() => {
        const connection = server_connections.active_connection_handler();
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
    //Modals.spawnSettingsModal("identity-profiles");
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


    /* for testing */
    if(settings.static_global(Settings.KEY_USER_IS_NEW)) {
        const modal = openModalNewcomer();
        modal.close_listener.push(() => settings.changeGlobal(Settings.KEY_USER_IS_NEW, false));
    }
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
                    $(document).one('click', event => aplayer.initializeFromGesture());
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
        const chandler = bipc.get_connect_handler();
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

            if(chandler) {
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

            loader.register_task(loader.Stage.LOADED, {
                priority: 0,
                function: async () => handle_connect_request(connect_data, server_connections.active_connection_handler() || server_connections.spawn_server_connection_handler()),
                name: tr("default url connect")
            });
        }
        if(chandler) {
            /* no instance avail, so lets make us avail */
            chandler.callback_available = data => {
                return !settings.static_global(Settings.KEY_DISABLE_MULTI_SESSION);
            };

            chandler.callback_execute = data => {
                handle_connect_request(data, server_connections.spawn_server_connection_handler());
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
        const certificate_accept = settings.static_global(Settings.KEY_CERTIFICATE_CALLBACK, undefined);
        if(certificate_accept) {
            log.info(LogCategory.IPC, tr("Using this instance as certificate callback. ID: %s"), certificate_accept);
            try {
                try {
                    await bipc.get_handler().post_certificate_accpected(certificate_accept);
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

                const message =
                    "You've successfully accepted the certificate.{:br:}" +
                    "This page will close in {0} seconds.";
                createInfoModal(
                    tr("Certificate acccepted successfully"),
                    formatMessage(/* @tr-ignore */ tr(message), seconds_tag),
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

        loader.register_task(loader.Stage.LOADED, task_connect_handler);
    },
    priority: 10
};

loader.register_task(loader.Stage.JAVASCRIPT_INITIALIZING, {
    name: "jrendere initialize",
    function: async () => {
        try {
            if(!setup_jsrender())
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

            if(loader.version().type == "web") {
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