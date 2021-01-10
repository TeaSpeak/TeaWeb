import {spawnReactModal} from "tc-shared/ui/react-elements/Modal";
import {InternalModal} from "tc-shared/ui/react-elements/internal-modal/Controller";
import * as React from "react";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {EchoTestEventRegistry, EchoTestModal} from "tc-shared/ui/modal/echo-test/Renderer";
import {Registry} from "tc-shared/events";
import {EchoTestEvents, TestState} from "tc-shared/ui/modal/echo-test/Definitions";
import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import {global_client_actions} from "tc-shared/events/GlobalEvents";
import {VoiceConnectionStatus} from "tc-shared/connection/VoiceConnection";
import {Settings, settings} from "tc-shared/settings";
import {CommandResult} from "tc-shared/connection/ServerConnectionDeclaration";
import {LogCategory, logError, logTrace, logWarn} from "tc-shared/log";
import {ServerFeature} from "tc-shared/connection/ServerFeatures";

export function spawnEchoTestModal(connection: ConnectionHandler) {
    const events = new Registry<EchoTestEvents>();

    initializeController(connection, events);

    const modal = spawnReactModal(class extends InternalModal {
        constructor() {
            super();
        }

        renderBody(): React.ReactElement {
            return (
                <EchoTestEventRegistry.Provider value={events}>
                    <EchoTestModal/>
                </EchoTestEventRegistry.Provider>
            );
        }

        title(): string | React.ReactElement<Translatable> {
            return <Translatable>Voice echo test</Translatable>;
        }
    });

    events.on("action_close", () => {
        modal.destroy();
    });

    modal.events.on("close", () => events.fire_react("notify_close"));
    modal.events.on("destroy", () => {
        events.fire("notify_destroy");
        events.destroy();
    });

    modal.show();
}

function initializeController(connection: ConnectionHandler, events: Registry<EchoTestEvents>) {
    let testState: TestState = {state: "stopped"};

    events.on("action_open_microphone_settings", () => {
        global_client_actions.fire("action_open_window_settings", {defaultCategory: "audio-microphone"});
    });

    events.on("action_toggle_tests", event => {
        settings.setValue(Settings.KEY_VOICE_ECHO_TEST_ENABLED, event.enabled);
    });

    events.on("query_test_state", () => {
        events.fire_react("notify_tests_toggle", {enabled: settings.getValue(Settings.KEY_VOICE_ECHO_TEST_ENABLED)});
    });

    events.on("notify_destroy", settings.globalChangeListener(Settings.KEY_VOICE_ECHO_TEST_ENABLED, value => {
        events.fire_react("notify_tests_toggle", {enabled: value});
    }));

    events.on("action_test_result", event => {
        if (event.status === "success") {
            events.fire("action_close");
        } else {
            events.fire_react("action_stop_test");
            events.fire_react("notify_test_phase", {phase: "troubleshooting"});
        }
    });

    events.on("action_troubleshooting_finished", event => {
        if (event.status === "aborted") {
            events.fire("action_close");
        } else {
            events.fire_react("notify_test_phase", {phase: "testing"});
            events.fire("action_start_test");
        }
    });

    const reportVoiceConnectionState = (state: VoiceConnectionStatus) => {
        if (state === VoiceConnectionStatus.Connected) {
            beginTest();
        } else {
            endTest();
        }
        switch (state) {
            case VoiceConnectionStatus.Connected:
                events.fire_react("notify_voice_connection_state", {state: "connected"});
                break;

            case VoiceConnectionStatus.Disconnected:
            case VoiceConnectionStatus.Disconnecting:
                events.fire_react("notify_voice_connection_state", {state: "disconnected"});
                break;

            case VoiceConnectionStatus.Connecting:
                events.fire_react("notify_voice_connection_state", {state: "connecting"});
                break;

            case VoiceConnectionStatus.ClientUnsupported:
                events.fire_react("notify_voice_connection_state", {state: "unsupported-client"});
                break;

            case VoiceConnectionStatus.ServerUnsupported:
                events.fire_react("notify_voice_connection_state", {state: "unsupported-server"});
                break;

            case VoiceConnectionStatus.Failed:
                events.fire_react("notify_voice_connection_state", {state: "failed", message: connection.getServerConnection().getVoiceConnection().getFailedMessage() });
                break;
        }
    };

    events.on("notify_destroy", connection.getServerConnection().getVoiceConnection().events.on("notify_connection_status_changed", event => {
        reportVoiceConnectionState(event.newStatus);
    }));

    events.on("query_voice_connection_state", () => reportVoiceConnectionState(connection.getServerConnection().getVoiceConnection().getConnectionState()));

    events.on("query_test_state", () => {
        events.fire_react("notify_test_state", {state: testState});
    });

    events.on("action_start_test", () => {
        beginTest();
    });

    events.on("action_unmute", () => {
        connection.setSpeakerMuted(false, true);
        connection.setMicrophoneMuted(false, true);
        beginTest();
    });

    const setTestState = (state: TestState) => {
        testState = state;
        events.fire_react("notify_test_state", {state: state});
    }

    let testId = 0;
    const beginTest = () => {
        if (testState.state === "initializing" || testState.state === "running") {
            return;
        } else if (!connection.serverFeatures.supportsFeature(ServerFeature.WHISPER_ECHO)) {
            setTestState({state: "unsupported"});
            return;
        } else if (connection.isSpeakerMuted() || connection.isMicrophoneMuted()) {
            setTestState({
                state: "muted",
                speaker: connection.isSpeakerMuted(),
                microphone: connection.isMicrophoneMuted()
            });
            return;
        }

        setTestState({state: "initializing"});


        const currentTestId = ++testId;
        connection.startEchoTest().then(() => {
            if (currentTestId !== testId) {
                return;
            }

            logTrace(LogCategory.VOICE, tr("Echo test started."));
            setTestState({state: "running"});
        }).catch(error => {
            logWarn(LogCategory.VOICE, tr("Failed to start echo test: %o"), error);
            if (currentTestId !== testId) {
                return;
            }

            let message;
            if (error instanceof CommandResult) {
                message = error.formattedMessage();
            } else if (error instanceof Error) {
                message = error.message;
            } else if (typeof error === "string") {
                message = error;
            } else {
                message = tr("lookup the console");
                logError(LogCategory.AUDIO, tr("Failed to begin echo testing: %o"), error);
            }

            setTestState({state: "start-failed", error: message});
        });
    }

    const endTest = () => {
        setTestState({state: "stopped"});
        connection.stopEchoTest();
    }

    events.on(["notify_destroy", "notify_close", "action_stop_test"], endTest);
}