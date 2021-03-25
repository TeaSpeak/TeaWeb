import {Registry} from "tc-shared/events";
import {
    Bookmark,
    ControlBarEvents,
    ControlBarMode,
    HostButtonInfo,
    VideoDeviceInfo,
    VideoState
} from "tc-shared/ui/frames/control-bar/Definitions";
import {server_connections} from "tc-shared/ConnectionManager";
import {ConnectionHandler, ConnectionState} from "tc-shared/ConnectionHandler";
import {Settings, settings} from "tc-shared/settings";
import {global_client_actions} from "tc-shared/events/GlobalEvents";
import {createErrorModal, createInputModal} from "tc-shared/ui/elements/Modal";
import {VideoBroadcastType, VideoConnectionStatus} from "tc-shared/connection/VideoConnection";
import {tr} from "tc-shared/i18n/localize";
import {getVideoDriver} from "tc-shared/video/VideoSource";
import {kLocalBroadcastChannels} from "tc-shared/ui/frames/video/Definitions";
import {getRecorderBackend, InputDevice} from "tc-shared/audio/Recorder";
import {defaultRecorder, defaultRecorderEvents} from "tc-shared/voice/RecorderProfile";
import {bookmarks} from "tc-shared/Bookmarks";
import {connectionHistory} from "tc-shared/connectionlog/History";
import {RemoteIconInfo} from "tc-shared/file/Icons";
import {spawnModalAddCurrentServerToBookmarks} from "tc-shared/ui/modal/bookmarks-add-server/Controller";
import {getAudioBackend, OutputDevice} from "tc-shared/audio/Player";

class InfoController {
    private readonly mode: ControlBarMode;
    private readonly events: Registry<ControlBarEvents>;
    private currentHandler: ConnectionHandler;

    private globalEvents: (() => void)[] = [];
    private globalHandlerRegisteredEvents: {[key: string]: (() => void)[]} = {};
    private handlerRegisteredEvents: (() => void)[] = [];
    private defaultRecorderListener: () => void;

    constructor(events: Registry<ControlBarEvents>, mode: ControlBarMode) {
        this.events = events;
        this.mode = mode;
    }

    public getCurrentHandler() : ConnectionHandler { return this.currentHandler; }
    public getMode() : ControlBarMode { return this.mode; }

    public initialize() {
        server_connections.getAllConnectionHandlers().forEach(handler => this.registerGlobalHandlerEvents(handler));

        const events = this.globalEvents;
        events.push(server_connections.events().on("notify_handler_created", event => {
            this.registerGlobalHandlerEvents(event.handler);
            this.sendConnectionState();
            this.sendAwayState();
            this.sendVideoState("screen");
            this.sendVideoState("camera");
        }));
        events.push(server_connections.events().on("notify_handler_deleted", event => {
            this.unregisterGlobalHandlerEvents(event.handler);
            this.sendConnectionState();
            this.sendAwayState();
            this.sendVideoState("screen");
            this.sendVideoState("camera");
        }));
        bookmarks.events.on(["notify_bookmark_edited", "notify_bookmark_created", "notify_bookmark_deleted", "notify_bookmarks_imported"], () => this.sendBookmarks());
        events.push(getVideoDriver().getEvents().on("notify_device_list_changed", () => this.sendCameraList()));
        events.push(getRecorderBackend().getDeviceList().getEvents().on("notify_list_updated", () => this.sendMicrophoneList()));
        events.push(defaultRecorderEvents.on("notify_default_recorder_changed", () => {
            this.unregisterDefaultRecorderEvents();
            this.registerDefaultRecorderEvents();
            this.sendMicrophoneList();
        }));
        events.push(settings.globalChangeListener(Settings.KEY_SPEAKER_DEVICE_ID, () => this.sendSpeakerList()));
        getAudioBackend().executeWhenInitialized(() => this.sendSpeakerList());

        if(this.mode === "main") {
            events.push(server_connections.events().on("notify_active_handler_changed", event => this.setConnectionHandler(event.newHandler)));
        }

        this.setConnectionHandler(server_connections.getActiveConnectionHandler());
    }

    public destroy() {
        this.unregisterDefaultRecorderEvents();

        server_connections.getAllConnectionHandlers().forEach(handler => this.unregisterGlobalHandlerEvents(handler));
        this.unregisterCurrentHandlerEvents();

        this.globalEvents.forEach(callback => callback());
        this.globalEvents = [];
    }

    private registerDefaultRecorderEvents() {
        if(!defaultRecorder) {
            return;
        }

        this.defaultRecorderListener = defaultRecorder.events.on("notify_device_changed", () => this.sendMicrophoneList());
    }

    private unregisterDefaultRecorderEvents() {
        if(this.defaultRecorderListener) {
            this.defaultRecorderListener();
            this.defaultRecorderListener = undefined;
        }
    }

    private registerGlobalHandlerEvents(handler: ConnectionHandler) {
        const events = this.globalHandlerRegisteredEvents[handler.handlerId] = [];

        events.push(handler.events().on("notify_connection_state_changed", () => this.sendConnectionState()));
        events.push(handler.events().on("notify_state_updated", event => {
            if(event.state === "away") { this.sendAwayState(); }
        }));
    }

    private unregisterGlobalHandlerEvents(handler: ConnectionHandler) {
        const callbacks = this.globalHandlerRegisteredEvents[handler.handlerId];
        if(!callbacks) { return; }

        delete this.globalHandlerRegisteredEvents[handler.handlerId];
        callbacks.forEach(callback => callback());
    }

    private registerCurrentHandlerEvents(handler: ConnectionHandler) {
        const events = this.handlerRegisteredEvents;

        events.push(handler.events().on("notify_connection_state_changed", event => {
            if(event.oldState === ConnectionState.CONNECTED || event.newState === ConnectionState.CONNECTED) {
                this.sendHostButton();
                this.sendVideoState("screen");
                this.sendVideoState("camera");
            }
        }));

        events.push(handler.channelTree.server.events.on("notify_properties_updated", event => {
            if("virtualserver_hostbutton_gfx_url" in event.updated_properties ||
                "virtualserver_hostbutton_url" in event.updated_properties ||
                "virtualserver_hostbutton_tooltip" in event.updated_properties) {
                this.sendHostButton();
            }
        }));

        events.push(handler.events().on("notify_state_updated", event => {
            if(event.state === "microphone") {
                this.sendMicrophoneState();
            } else if(event.state === "speaker") {
                this.sendSpeakerState();
            } else if(event.state === "query") {
                this.sendQueryState();
            } else if(event.state === "subscribe") {
                this.sendSubscribeState();
            }
        }));

        const videoConnection = handler.getServerConnection().getVideoConnection();
        for(const channel of kLocalBroadcastChannels) {
            const broadcast = videoConnection.getLocalBroadcast(channel);
            events.push(broadcast.getEvents().on("notify_state_changed", () => this.sendVideoState(channel)));
        }
        events.push(videoConnection.getEvents().on("notify_status_changed", () => {
            this.sendVideoState("screen");
            this.sendVideoState("camera");
        }));
    }

    private unregisterCurrentHandlerEvents() {
        this.handlerRegisteredEvents.forEach(callback => callback());
        this.handlerRegisteredEvents = [];
    }


    public setConnectionHandler(handler: ConnectionHandler) {
        if(handler === this.currentHandler) { return; }

        this.currentHandler = handler;
        this.unregisterCurrentHandlerEvents();
        this.registerCurrentHandlerEvents(handler);

        /* update all states */
        this.sendConnectionState();
        this.sendBookmarks(); /* not really required, not directly related to the connection handler */
        this.sendAwayState();
        this.sendMicrophoneState();
        this.sendSpeakerState();
        this.sendSubscribeState();
        this.sendQueryState();
        this.sendHostButton();
        this.sendVideoState("screen");
        this.sendVideoState("camera");
    }

    public sendConnectionState() {
        const globallyConnected = server_connections.getAllConnectionHandlers().findIndex(e => e.connected) !== -1;
        const locallyConnected = this.currentHandler?.connected;
        const multisession = !settings.getValue(Settings.KEY_DISABLE_MULTI_SESSION);

        this.events.fire_react("notify_connection_state", {
            state: {
                currentlyConnected: locallyConnected,
                generallyConnected: globallyConnected,
                multisession: multisession
            }
        });
    }

    public async sendBookmarks() {
        const bookmarkList = bookmarks.getOrderedRegisteredBookmarks();

        const parent: Bookmark[] = [];
        const parentStack: Bookmark[][] = [];

        while(bookmarkList.length > 0) {
            const bookmark = bookmarkList.pop_front();
            const parentList = parentStack.pop() || parent;

            if(bookmark.entry.type === "entry") {
                let icon: RemoteIconInfo;

                try {
                    const connectInfo = await connectionHistory.lastConnectInfo(bookmark.entry.serverAddress, "address");
                    if(connectInfo) {
                        const info = await connectionHistory.queryServerInfo(connectInfo.serverUniqueId);
                        if(info && info.iconId > 0) {
                            icon = { iconId: info.iconId, serverUniqueId: connectInfo.serverUniqueId };
                        }
                    }
                } catch (_) {
                    /* no need for any error handling */
                }

                parentList.push({
                    children: undefined,
                    icon: icon,
                    label: bookmark.entry.displayName,
                    uniqueId: bookmark.entry.uniqueId
                });
            } else if(bookmark.entry.type === "directory") {
                const children = [];
                parentList.push({
                    children: children,
                    icon: undefined,
                    label: bookmark.entry.displayName,
                    uniqueId: bookmark.entry.uniqueId
                });

                for(let i = 0; i < bookmark.childCount; i++) {
                    parentStack.push(children);
                }
            }
        }

        this.events.fire_react("notify_bookmarks", {
            marks: parent
        });
    }

    public sendAwayState() {
        const globalAwayCount = server_connections.getAllConnectionHandlers().filter(handler => handler.isAway()).length;
        const awayLocally = !!this.currentHandler?.isAway();

        this.events.fire_react("notify_away_state", {
            state: {
                globallyAway: globalAwayCount === server_connections.getAllConnectionHandlers().length ? "full" : globalAwayCount > 0 ? "partial" : "none",
                locallyAway: awayLocally
            }
        });
    }

    public sendMicrophoneState() {
        this.events.fire_react("notify_microphone_state", {
            state: this.currentHandler?.isMicrophoneDisabled() ? "disabled" : this.currentHandler?.isMicrophoneMuted() ? "muted" : "enabled"
        });
    }

    public sendMicrophoneList() {
        const deviceList = getRecorderBackend().getDeviceList();
        const devices = deviceList.getDevices();
        const defaultDevice = deviceList.getDefaultDeviceId();
        const selectedDevice = defaultRecorder?.getDeviceId();

        this.events.fire_react("notify_microphone_list", {
            devices: devices.map(device => {
                let selected = false;
                if(selectedDevice === InputDevice.DefaultDeviceId && device.deviceId === defaultDevice) {
                    selected = true;
                } else if(selectedDevice === device.deviceId) {
                    selected = true;
                }

                return {
                    name: device.name,
                    driver: device.driver,
                    id: device.deviceId,
                    selected: selected
                };
            })
        })
    }

    public sendSpeakerState() {
        this.events.fire_react("notify_speaker_state", {
            enabled: !this.currentHandler?.isSpeakerMuted()
        });
    }

    public async sendSpeakerList() {
        const backend = getAudioBackend();
        if(!backend.isInitialized()) {
            this.events.fire_react("notify_speaker_list", { state: "uninitialized" });
            return;
        }

        const devices = await backend.getAvailableDevices();
        const selectedDeviceId = backend.getCurrentDevice()?.device_id;
        const defaultDeviceId = backend.getDefaultDeviceId();
        this.events.fire_react("notify_speaker_list", {
            state: "initialized",
            devices: devices.map(device => {
                let selected = false;
                if(selectedDeviceId === OutputDevice.DefaultDeviceId && device.device_id === defaultDeviceId) {
                    selected = true;
                } else if(selectedDeviceId === device.device_id) {
                    selected = true;
                }

                return {
                    name: device.name,
                    driver: device.driver,

                    id: device.device_id,
                    selected: selected
                }
            })
        });
    }

    public sendSubscribeState() {
        this.events.fire_react("notify_subscribe_state", {
            subscribe: !!this.currentHandler?.isSubscribeToAllChannels()
        });
    }

    public sendQueryState() {
        this.events.fire_react("notify_query_state", {
            shown: !!this.currentHandler?.areQueriesShown()
        });
    }

    public sendHostButton() {
        let info: HostButtonInfo;

        if(this.currentHandler?.connected) {
            const properties = this.currentHandler.channelTree.server.properties;
            info = properties.virtualserver_hostbutton_gfx_url ? {
                url: properties.virtualserver_hostbutton_gfx_url,
                target: properties.virtualserver_hostbutton_url,
                title: properties.virtualserver_hostbutton_tooltip
            } : undefined;
        }

        this.events.fire_react("notify_host_button", {
            button: info
        });
    }

    public sendVideoState(type: VideoBroadcastType) {
        let state: VideoState;
        if(this.currentHandler?.connected) {
            const videoConnection = this.currentHandler.getServerConnection().getVideoConnection();
            if(videoConnection.getStatus() === VideoConnectionStatus.Connected) {
                const broadcast = videoConnection.getLocalBroadcast(type);
                if(broadcast.getState().state === "broadcasting" || broadcast.getState().state === "initializing") {
                    state = "enabled";
                } else {
                    state = "disabled";
                }
            } else if(videoConnection.getStatus() === VideoConnectionStatus.Unsupported) {
                state = "unsupported";
            } else {
                state = "unavailable";
            }
        } else {
            state = "disconnected";
        }

        this.events.fire_react("notify_video_state", { state: state, broadcastType: type });
    }

    public sendCameraList() {
        let devices: VideoDeviceInfo[] = [];
        const driver = getVideoDriver();
        driver.getDevices().then(result => {
            if(result === false || result.length === 0) {
                return;
            }

            this.events.fire_react("notify_camera_list", {
                devices: result.map(e => {
                    return {
                        name: e.name,
                        id: e.id
                    };
                })
            });
        })
        this.events.fire_react("notify_camera_list", { devices: devices });
    }
}

export function initializePopoutControlBarController(events: Registry<ControlBarEvents>, handler: ConnectionHandler) {
    const infoHandler = initializeControlBarController(events, "channel-popout");
    infoHandler.setConnectionHandler(handler);
}

export function initializeControlBarController(events: Registry<ControlBarEvents>, mode: ControlBarMode) : InfoController {
    const infoHandler = new InfoController(events, mode);
    infoHandler.initialize();

    events.on("notify_destroy", () => infoHandler.destroy());

    events.on("query_mode", () => events.fire_react("notify_mode", { mode: infoHandler.getMode() }));
    events.on("query_connection_state", () => infoHandler.sendConnectionState());
    events.on("query_bookmarks", () => infoHandler.sendBookmarks());
    events.on("query_away_state", () => infoHandler.sendAwayState());
    events.on("query_microphone_state", () => infoHandler.sendMicrophoneState());
    events.on("query_microphone_list", () => infoHandler.sendMicrophoneList());
    events.on("query_speaker_state", () => infoHandler.sendSpeakerState());
    events.on("query_speaker_list", () => infoHandler.sendSpeakerList());
    events.on("query_subscribe_state", () => infoHandler.sendSubscribeState());
    events.on("query_host_button", () => infoHandler.sendHostButton());
    events.on("query_video_state", event => infoHandler.sendVideoState(event.broadcastType));
    events.on("query_camera_list", () => infoHandler.sendCameraList());

    events.on("action_connection_connect", event => global_client_actions.fire("action_open_window_connect", { newTab: event.newTab }));
    events.on("action_connection_disconnect", event => {
        (event.generally ? server_connections.getAllConnectionHandlers() : [infoHandler.getCurrentHandler()]).filter(e => !!e).forEach(connection => {
            connection.disconnectFromServer().then(() => {});
        });
    });

    events.on("action_bookmark_manage", () => global_client_actions.fire("action_open_window", { window: "bookmark-manage" }));
    events.on("action_bookmark_add_current_server", () => spawnModalAddCurrentServerToBookmarks(infoHandler.getCurrentHandler()));
    events.on("action_bookmark_connect", event => bookmarks.executeConnect(event.bookmarkUniqueId, event.newTab));

    events.on("action_toggle_away", event => {
        if(event.away) {
            const setAway = message => {
                const value = typeof message === "string" ? message : true;
                (event.globally ? server_connections.getAllConnectionHandlers() : [server_connections.getActiveConnectionHandler()]).filter(e => !!e).forEach(connection => {
                    connection.setAway(value);
                });
                settings.setValue(Settings.KEY_CLIENT_STATE_AWAY, true);
                settings.setValue(Settings.KEY_CLIENT_AWAY_MESSAGE, typeof value === "boolean" ? "" : value);
            };

            if(event.promptMessage) {
                createInputModal(tr("Set away message"), tr("Please enter your away message"), () => true, message => {
                    if(typeof(message) === "string")
                        setAway(message);
                }).open();
            } else {
                setAway(undefined);
            }
        } else {
            for(const connection of event.globally ? server_connections.getAllConnectionHandlers() : [server_connections.getActiveConnectionHandler()]) {
                if(!connection) continue;

                connection.setAway(false);
            }

            settings.setValue(Settings.KEY_CLIENT_STATE_AWAY, false);
        }
    });

    events.on("action_toggle_microphone", async event => {
        /* change the default global setting */
        settings.setValue(Settings.KEY_CLIENT_STATE_MICROPHONE_MUTED,  !event.enabled);

        if(typeof event.targetDeviceId === "string") {
            const device = getRecorderBackend().getDeviceList().getDevices().find(device => device.deviceId === event.targetDeviceId);
            try {
                if(!device) {
                    throw tr("Target device could not be found.");
                }

                await defaultRecorder?.setDevice(device);
            } catch (error) {
                createErrorModal(tr("Failed to change microphone"), tr("Failed to change microphone.\nTarget device could not be found.")).open();
                return;
            }
        }

        const current_connection_handler = infoHandler.getCurrentHandler();
        if(current_connection_handler) {
            current_connection_handler.setMicrophoneMuted(!event.enabled);
            if(current_connection_handler.getVoiceRecorder()) {
                if(event.enabled) {
                    current_connection_handler.startVoiceRecorder(true).then(undefined);
                }
            } else {
                current_connection_handler.acquireInputHardware().then(() => {});
            }
        }
    });

    events.on("action_open_microphone_settings", () => {
        global_client_actions.fire("action_open_window_settings", { defaultCategory: "audio-microphone" });
    });

    events.on("action_toggle_speaker", async event => {
        /* change the default global setting */
        settings.setValue(Settings.KEY_CLIENT_STATE_SPEAKER_MUTED, !event.enabled);

        if(typeof event.targetDeviceId === "string") {
            try {
                const devices = await getAudioBackend().getAvailableDevices();
                const device = devices.find(device => device.device_id === event.targetDeviceId);
                if(!device) {
                    throw tr("Target device could not be found.");
                }

                await getAudioBackend().setCurrentDevice(device.device_id);
                settings.setValue(Settings.KEY_SPEAKER_DEVICE_ID, device.device_id);
            } catch (error) {
                createErrorModal(tr("Failed to change speaker"), tr("Failed to change speaker.\nTarget device could not be found.")).open();
                return;
            }
        }

        infoHandler.getCurrentHandler()?.setSpeakerMuted(!event.enabled);
    });

    events.on("action_open_speaker_settings", () => {
        global_client_actions.fire("action_open_window_settings", { defaultCategory: "audio-speaker" });
    });

    events.on("action_toggle_subscribe", event => {
        settings.setValue(Settings.KEY_CLIENT_STATE_SUBSCRIBE_ALL_CHANNELS, event.subscribe);

        infoHandler.getCurrentHandler()?.setSubscribeToAllChannels(event.subscribe);
    });

    events.on("action_toggle_query", event => {
        settings.setValue(Settings.KEY_CLIENT_STATE_QUERY_SHOWN, event.show);

        infoHandler.getCurrentHandler()?.setQueriesShown(event.show);
    });
    events.on("action_query_manage", () => {
        global_client_actions.fire("action_open_window", { window: "query-manage" });
    });
    events.on("action_toggle_video", event => {
        if(infoHandler.getCurrentHandler()) {
            global_client_actions.fire("action_toggle_video_broadcasting", {
                connection: infoHandler.getCurrentHandler(),
                broadcastType: event.broadcastType,
                enabled: event.enable,
                quickSelect: event.quickStart,
                defaultDevice: event.deviceId
            });
        } else {
            createErrorModal(tr("Missing connection handler"), tr("Cannot start video broadcasting with a missing connection handler")).open();
        }
    });
    events.on("action_manage_video", event => {
        if(infoHandler.getCurrentHandler()) {
            global_client_actions.fire("action_edit_video_broadcasting", {
                connection: infoHandler.getCurrentHandler(),
                broadcastType: event.broadcastType
            });
        } else {
            createErrorModal(tr("Missing connection handler"), tr("Cannot start video broadcasting with a missing connection handler")).open();
        }
    });

    return infoHandler;
}