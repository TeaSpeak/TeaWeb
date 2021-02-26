import * as loader from "tc-loader";
import {Stage} from "tc-loader";
import * as bipc from "./ipc/BrowserIPC";
import * as sound from "./sound/Sounds";
import * as i18n from "./i18n/localize";
import {tra} from "./i18n/localize";
import * as fidentity from "./profiles/identities/TeaForumIdentity";
import * as aplayer from "tc-backend/audio/player";
import * as ppt from "tc-backend/ppt";
import * as global_ev_handler from "./events/ClientGlobalControlHandler";
import {AppParameters, settings, Settings, UrlParameterBuilder, UrlParameterParser} from "tc-shared/settings";
import {LogCategory, logDebug, logError, logInfo, logWarn} from "tc-shared/log";
import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import {createErrorModal, createInfoModal} from "tc-shared/ui/elements/Modal";
import {RecorderProfile, setDefaultRecorder} from "tc-shared/voice/RecorderProfile";
import {spawnYesNo} from "tc-shared/ui/modal/ModalYesNo";
import {formatMessage} from "tc-shared/ui/frames/chat";
import {openModalNewcomer} from "tc-shared/ui/modal/ModalNewcomer";
import {global_client_actions} from "tc-shared/events/GlobalEvents";
import {MenuEntryType, spawn_context_menu} from "tc-shared/ui/elements/ContextMenu";
import {copyToClipboard} from "tc-shared/utils/helpers";
import {checkForUpdatedApp} from "tc-shared/update";
import {setupJSRender} from "tc-shared/ui/jsrender";
import {ConnectRequestData} from "tc-shared/ipc/ConnectHandler";
import {defaultConnectProfile, findConnectProfile} from "tc-shared/profiles/ConnectionProfile";
import {server_connections} from "tc-shared/ConnectionManager";
import {spawnConnectModalNew} from "tc-shared/ui/modal/connect/Controller";
import {initializeKeyControl} from "./KeyControl";
import {assertMainApplication} from "tc-shared/ui/utils";

/* required import for init */
import "svg-sprites/client-icons";
import "../css/load-css"
import "./proto";
import "./video-viewer/Controller";
import "./profiles/ConnectionProfile";
import "./update/UpdaterWeb";
import "./file/LocalIcons";
import "./connection/CommandHandler";
import "./connection/ConnectionBase";
import "./connection/rtc/Connection";
import "./connection/rtc/video/Connection";
import "./video/VideoSource";
import "./media/Video";
import "./ui/AppController";
import "./ui/frames/menu-bar/MainMenu";
import "./ui/modal/connect/Controller";
import "./ui/elements/ContextDivider";
import "./ui/elements/Tab";
import "./clientservice";
import "./text/bbcode/InviteController";
import {clientServiceInvite} from "tc-shared/clientservice";
import {ActionResult} from "tc-services";
import {CommandResult} from "tc-shared/connection/ServerConnectionDeclaration";
import {ErrorCode} from "tc-shared/connection/ErrorCode";

assertMainApplication();

let preventWelcomeUI = false;
async function initialize() {
    try {
        await i18n.initialize();
    } catch(error) {
        console.error(tr("Failed to initialized the translation system!\nError: %o"), error);
        loader.critical_error("Failed to setup the translation system");
        return;
    }

    bipc.setupIpcHandler();
}

async function initializeApp() {
    global_ev_handler.initialize(global_client_actions);

    if(!aplayer.initialize()) {
        console.warn(tr("Failed to initialize audio controller!"));
    }

    aplayer.on_ready(() => aplayer.set_master_volume(settings.getValue(Settings.KEY_SOUND_MASTER) / 100));

    const recorder = new RecorderProfile("default");
    try {
        await recorder.initialize();
    } catch (error) {
        /* TODO: Recover into a defined state? */
        logError(LogCategory.AUDIO, tr("Failed to initialize default recorder: %o"), error);
    }
    setDefaultRecorder(recorder);

    sound.initialize().then(() => {
        logInfo(LogCategory.AUDIO, tr("Sounds initialized"));
    });
    sound.set_master_volume(settings.getValue(Settings.KEY_SOUND_MASTER_SOUNDS) / 100);

    try {
        await ppt.initialize();
    } catch(error) {
        logError(LogCategory.GENERAL, tr("Failed to initialize ppt!\nError: %o"), error);
        loader.critical_error(tr("Failed to initialize ppt!"));
        return;
    }
}

/* The native client has received a connect request. */
export function handleNativeConnectRequest(url: URL) {
    let serverAddress = url.host;
    if(url.searchParams.has("port")) {
        if(serverAddress.indexOf(':') !== -1) {
            logWarn(LogCategory.GENERAL, tr("Received connect request which specified the port twice (via parameter and host). Using host port."));
        } else if(serverAddress.indexOf(":") === -1) {
            serverAddress += ":" + url.searchParams.get("port");
        } else {
            serverAddress = `[${serverAddress}]:${url.searchParams.get("port")}`;
        }
    }

    handleConnectRequest(serverAddress, undefined, new UrlParameterParser(url)).then(undefined);
}

export async function handleConnectRequest(serverAddress: string, serverUniqueId: string | undefined, parameters: UrlParameterParser) {
    const inviteLinkId = parameters.getValue(AppParameters.KEY_CONNECT_INVITE_REFERENCE, undefined);
    logDebug(LogCategory.STATISTICS, tr("Executing connect request with invite key reference: %o"), inviteLinkId);

    if(inviteLinkId) {
        clientServiceInvite.logAction(inviteLinkId, "ConnectAttempt").then(result => {
            if(result.status !== "success") {
                logWarn(LogCategory.STATISTICS, tr("Failed to register connect attempt: %o"), result.result);
            }
        });
    }

    const result = await doHandleConnectRequest(serverAddress, serverUniqueId, parameters);
    if(inviteLinkId) {
        let promise: Promise<ActionResult<void>>;
        switch (result.status) {
            case "success":
                promise = clientServiceInvite.logAction(inviteLinkId, "ConnectSuccess");
                break;

            case "channel-already-joined":
            case "server-already-joined":
                promise = clientServiceInvite.logAction(inviteLinkId, "ConnectNoAction", { reason: result.status });
                break;

            default:
                promise = clientServiceInvite.logAction(inviteLinkId, "ConnectFailure", { reason: result.status });
                break;
        }

        promise.then(result => {
            if(result.status !== "success") {
                logWarn(LogCategory.STATISTICS, tr("Failed to register connect result: %o"), result.result);
            }
        });
    }
}

type ConnectRequestResult = {
    status:
        "success" |
        "profile-invalid" |
        "client-aborted" |
        "server-join-failed" |
        "server-already-joined" |
        "channel-already-joined" |
        "channel-not-visible" |
        "channel-join-failed"
}

/**
 * @param serverAddress The target address to connect to
 * @param serverUniqueId If given a server unique id. If any of our current connections matches it, such connection will be used
 * @param parameters General connect parameters from the connect URL
 */
async function doHandleConnectRequest(serverAddress: string, serverUniqueId: string | undefined, parameters: UrlParameterParser) : Promise<ConnectRequestResult> {

    let targetServerConnection: ConnectionHandler;
    let isCurrentServerConnection: boolean;

    if(serverUniqueId) {
        if(server_connections.getActiveConnectionHandler()?.getCurrentServerUniqueId() === serverUniqueId) {
            targetServerConnection = server_connections.getActiveConnectionHandler();
            isCurrentServerConnection = true;
        } else {
            targetServerConnection = server_connections.getAllConnectionHandlers().find(connection => connection.getCurrentServerUniqueId() === serverUniqueId);
            isCurrentServerConnection = false;
        }
    }

    const profileId = parameters.getValue(AppParameters.KEY_CONNECT_PROFILE, undefined);
    const profile = findConnectProfile(profileId) || targetServerConnection?.serverConnection.handshake_handler()?.parameters.profile || defaultConnectProfile();

    if(!profile || !profile.valid()) {
        spawnConnectModalNew({
            selectedAddress: serverAddress,
            selectedProfile: profile
        });
        return { status: "profile-invalid" };
    }

    if(!aplayer.initialized()) {
        /* Trick the client into clicking somewhere on the site to initialize audio */
        const resultPromise = new Promise<boolean>(resolve => {
            spawnYesNo(tra("Connect to {}", serverAddress), tra("Would you like to connect to {}?", serverAddress), resolve).open();
        });

        if(!(await resultPromise)) {
            /* Well... the client don't want to... */
            return { status: "client-aborted" };
        }

        await new Promise(resolve => aplayer.on_ready(resolve));
    }

    const clientNickname = parameters.getValue(AppParameters.KEY_CONNECT_NICKNAME, undefined);

    const serverPassword = parameters.getValue(AppParameters.KEY_CONNECT_SERVER_PASSWORD, undefined);
    const passwordsHashed = parameters.getValue(AppParameters.KEY_CONNECT_PASSWORDS_HASHED);

    const channel = parameters.getValue(AppParameters.KEY_CONNECT_CHANNEL, undefined);
    const channelPassword = parameters.getValue(AppParameters.KEY_CONNECT_CHANNEL_PASSWORD, undefined);

    const connectToken = parameters.getValue(AppParameters.KEY_CONNECT_TOKEN, undefined);

    if(!targetServerConnection) {
        targetServerConnection = server_connections.getActiveConnectionHandler();
        if(targetServerConnection.connected) {
            targetServerConnection = server_connections.spawnConnectionHandler();
        }
    }

    server_connections.setActiveConnectionHandler(targetServerConnection);
    if(targetServerConnection.getCurrentServerUniqueId() === serverUniqueId) {
        /* Just join the new channel and may use the token (before) */

        if(connectToken) {
            try {
                await targetServerConnection.serverConnection.send_command("tokenuse", { token: connectToken }, { process_result: false });
            } catch (error) {
                if(error instanceof CommandResult) {
                    if(error.id === ErrorCode.TOKEN_INVALID_ID) {
                        targetServerConnection.log.log("error.custom", { message: tr("Try to use invite key token but the token is invalid.")});
                    } else if(error.id == ErrorCode.TOKEN_EXPIRED) {
                        targetServerConnection.log.log("error.custom", { message: tr("Try to use invite key token but the token is expired.")});
                    } else if(error.id === ErrorCode.TOKEN_USE_LIMIT_EXCEEDED) {
                        targetServerConnection.log.log("error.custom", { message: tr("Try to use invite key token but the token has been used too many times.")});
                    } else {
                        targetServerConnection.log.log("error.custom", { message: tra("Try to use invite key token but an error occurred: {}", error.formattedMessage())});
                    }
                } else {
                    logError(LogCategory.GENERAL, tr("Failed to use token: {}"), error);
                }
            }
        }

        if(!channel) {
            /* No need to join any channel */
            if(!connectToken) {
                createInfoModal(tr("Already connected"), tr("You're already connected to the target server.")).open();
            } else {
                /* Don't show a message since a token has been used */
            }

            return { status: "server-already-joined" };
        }

        const targetChannel = targetServerConnection.channelTree.resolveChannelPath(channel);
        if(!targetChannel) {
            createErrorModal(tr("Missing target channel"), tr("Failed to join channel since it is not visible.")).open();
            return { status: "channel-not-visible" };
        }

        if(targetServerConnection.getClient().currentChannel() === targetChannel) {
            createErrorModal(tr("Channel already joined"), tr("You already joined the channel.")).open();
            return { status: "channel-already-joined" };
        }

        if(targetChannel.getCachedPasswordHash()) {
            const succeeded = await targetChannel.joinChannel();
            if(succeeded) {
                /* Successfully joined channel with a password we already knew */
                return { status: "success" };
            }
        }

        targetChannel.setCachedHashedPassword(channelPassword);
        /* Force join the channel. Either we have the password, can ignore the password or we don't want to join. */
        if(await targetChannel.joinChannel(true)) {
            return { status: "success" };
        } else {
            /* TODO: More detail? */
            return { status: "channel-join-failed" };
        }
    } else {
        await targetServerConnection.startConnectionNew({
            targetAddress: serverAddress,

            nickname: clientNickname,
            nicknameSpecified: false,

            profile: profile,
            token: connectToken,

            serverPassword: serverPassword,
            serverPasswordHashed: passwordsHashed,

            defaultChannel: channel,
            defaultChannelPassword: channelPassword,
            defaultChannelPasswordHashed: passwordsHashed
        }, false);

        if(targetServerConnection.connected) {
            return { status: "success" };
        } else {
            /* TODO: More detail? */
            return { status: "server-join-failed" };
        }
    }
}

/* Used by the old native clients (an within the multi instance handler). Delete it later */
export function handle_connect_request(properties: ConnectRequestData, _connection: ConnectionHandler) {
    const urlBuilder = new UrlParameterBuilder();
    urlBuilder.setValue(AppParameters.KEY_CONNECT_PROFILE, properties.profile);
    urlBuilder.setValue(AppParameters.KEY_CONNECT_NICKNAME, properties.username);

    urlBuilder.setValue(AppParameters.KEY_CONNECT_SERVER_PASSWORD, properties.password?.value);
    urlBuilder.setValue(AppParameters.KEY_CONNECT_PASSWORDS_HASHED, properties.password?.hashed);

    const url = new URL(`https://localhost/?${urlBuilder.build()}`);
    handleConnectRequest(properties.address, undefined, new UrlParameterParser(url));
}

function main() {
    /* initialize font */
    {
        const font = settings.getValue(Settings.KEY_FONT_SIZE);

        document.body.style.fontSize = font + "px";
        settings.globalChangeListener(Settings.KEY_FONT_SIZE, value => {
            document.body.style.fontSize = value + "px";
        });
    }

    /* context menu prevent */
    document.addEventListener("contextmenu", event => {
        if(event.defaultPrevented) {
            return;
        }

        if(event.target instanceof HTMLInputElement) {
            const target = event.target;
            if((!!event.target.value || __build.target === "client") && !event.target.disabled && !event.target.readOnly && event.target.type !== "number") {
                spawn_context_menu(event.pageX, event.pageY, {
                    type: MenuEntryType.ENTRY,
                    name: tr("Copy"),
                    callback: () => copyToClipboard(target.value),
                    icon_class: "client-copy",
                    visible: !!event.target.value
                }, {
                    type: MenuEntryType.ENTRY,
                    name: tr("Paste"),
                    callback: () => {
                        const { clipboard } = __non_webpack_require__('electron');
                        target.value = clipboard.readText();
                    },
                    icon_class: "client-copy",
                    visible: __build.target === "client",
                });
            }

            event.preventDefault();
            return;
        }

        if(settings.getValue(Settings.KEY_DISABLE_GLOBAL_CONTEXT_MENU)) {
            event.preventDefault();
        }
    });
    window.removeLoaderContextMenuHook();

    const initialHandler = server_connections.spawnConnectionHandler();
    server_connections.setActiveConnectionHandler(initialHandler);
    initialHandler.acquireInputHardware().then(() => {});

    /** Setup the XF forum identity **/
    fidentity.update_forum();
    initializeKeyControl();

    checkForUpdatedApp();

    if(settings.getValue(Settings.KEY_USER_IS_NEW) && !preventWelcomeUI) {
        const modal = openModalNewcomer();
        modal.close_listener.push(() => settings.setValue(Settings.KEY_USER_IS_NEW, false));
    }
}

const task_teaweb_starter: loader.Task = {
    name: "voice app starter",
    function: async () => {
        try {
            await initializeApp();
            main();
            if(!aplayer.initialized()) {
                logInfo(LogCategory.VOICE, tr("Initialize audio controller later!"));
                if(!aplayer.initializeFromGesture) {
                    console.error(tr("Missing aplayer.initializeFromGesture"));
                } else {
                    $(document).one('click', () => aplayer.initializeFromGesture());
                }
            }

            loader.config.abortAnimationOnFinish = settings.getValue(Settings.KEY_LOADER_ANIMATION_ABORT);
        } catch (ex) {
            console.error(ex.stack);
            if(ex instanceof ReferenceError || ex instanceof TypeError) {
                ex = ex.name + ": " + ex.message;
            }
            loader.critical_error("Failed to invoke main function:<br>" + ex);
        }
    },
    priority: 10
};

const task_connect_handler: loader.Task = {
    name: "Connect handler",
    function: async () => {
        const address = AppParameters.getValue(AppParameters.KEY_CONNECT_ADDRESS, undefined);
        if(typeof address === "undefined") {
            loader.register_task(loader.Stage.LOADED, task_teaweb_starter);
            return;
        }

        /* FIXME: All additional connect parameters! */
        const connectData = {
            address: address,

            profile: AppParameters.getValue(AppParameters.KEY_CONNECT_PROFILE, ""),
            username: AppParameters.getValue(AppParameters.KEY_CONNECT_NICKNAME, ""),

            password: {
                value: AppParameters.getValue(AppParameters.KEY_CONNECT_SERVER_PASSWORD, ""),
                hashed: true
            }
        };

        const chandler = bipc.getInstanceConnectHandler();
        if(chandler && AppParameters.getValue(AppParameters.KEY_CONNECT_NO_SINGLE_INSTANCE)) {
            try {
                await chandler.post_connect_request(connectData, () => new Promise<boolean>(resolve => {
                    spawnYesNo(tr("Another TeaWeb instance is already running"), tra("Another TeaWeb instance is already running.{:br:}Would you like to connect there?"), response => {
                        resolve(response);
                    }, {
                        closeable: false
                    }).open();
                }));
                logInfo(LogCategory.CLIENT, tr("Executed connect successfully in another browser window. Closing this window"));

                const message =
                    "You're connecting to {0} within the other TeaWeb instance.{:br:}" +
                    "You could now close this page.";
                createInfoModal(
                    tr("Connecting successfully within other instance"),
                    formatMessage(/* @tr-ignore */ tr(message), connectData.address),
                    {
                        closeable: false,
                        footer: undefined
                    }
                ).open();
                return;
            } catch(error) {
                logInfo(LogCategory.CLIENT, tr("Failed to execute connect within other TeaWeb instance. Using this one. Error: %o"), error);
            }

            if(chandler) {
                /* no instance avail, so lets make us avail */
                chandler.callback_available = () => {
                    return !settings.getValue(Settings.KEY_DISABLE_MULTI_SESSION);
                };

                chandler.callback_execute = data => {
                    preventWelcomeUI = true;
                    handle_connect_request(data, server_connections.spawnConnectionHandler());
                    return true;
                }
            }
        }

        preventWelcomeUI = true;
        loader.register_task(loader.Stage.LOADED, {
            priority: 0,
            function: async () => {
                handleConnectRequest(address, undefined, AppParameters.Instance).then(undefined);
            },
            name: tr("default url connect")
        });
        loader.register_task(loader.Stage.LOADED, task_teaweb_starter);
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
    priority: 110
});

loader.register_task(loader.Stage.JAVASCRIPT_INITIALIZING, {
    name: "app starter",
    function: async () => {
        try {
            await initialize();

            if(__build.target == "web") {
                loader.register_task(loader.Stage.LOADED, task_connect_handler);
            } else {
                loader.register_task(loader.Stage.LOADED, task_teaweb_starter);
            }
        } catch (ex) {
            if(ex instanceof Error || typeof(ex.stack) !== "undefined") {
                console.error((tr || (msg => msg))("Critical error stack trace: %o"), ex.stack);
            }

            if(ex instanceof ReferenceError || ex instanceof TypeError) {
                ex = ex.name + ": " + ex.message;
            }

            loader.critical_error("Failed to boot app function:<br>" + ex);
        }
    },
    priority: 1000
});

loader.register_task(loader.Stage.LOADED, {
    name: "error task",
    function: async () => {
        if(AppParameters.getValue(AppParameters.KEY_LOAD_DUMMY_ERROR)) {
            loader.critical_error("The tea is cold!", "Argh, this is evil! Cold tea does not taste good.");
            throw "The tea is cold!";
        }
    },
    priority: 2000
});

/* TODO: Remove this after the image preview has been rewritten into react */
loader.register_task(Stage.JAVASCRIPT_INITIALIZING,{
    name: "app init",
    function: async () => {
        try {
            $("body").append($("#tmpl_main").renderTag());
        } catch(error) {
            logError(LogCategory.GENERAL, error);
            loader.critical_error(tr("Failed to setup main page!"));
            return;
        }
    },
    priority: 100
});