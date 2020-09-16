export type VoiceConnectionState =
    "connecting"
    | "connected"
    | "disconnected"
    | "unsupported-client"
    | "unsupported-server"
    | "failed";
export type TestState =
    { state: "initializing" | "running" | "stopped" | "microphone-invalid" | "unsupported" }
    | { state: "start-failed", error: string };

export interface EchoTestEvents {
    action_troubleshooting_finished: { status: "test-again" | "aborted" }
    action_close: {},
    action_test_result: { status: "success" | "fail" },
    action_open_microphone_settings: {},
    /* toggle the default test popup */
    action_toggle_tests: { enabled: boolean },
    action_start_test: {},
    action_stop_test: {},

    query_voice_connection_state: {},
    query_test_state: {},
    query_test_toggle: {},

    notify_destroy: {},
    notify_close: {},

    notify_test_phase: {
        phase: "testing" | "troubleshooting"
    },
    notify_voice_connection_state: {
        state: VoiceConnectionState,
        message?: string
    },
    notify_test_state: {
        state: TestState
    },
    notify_tests_toggle: {
        enabled: boolean
    }
}