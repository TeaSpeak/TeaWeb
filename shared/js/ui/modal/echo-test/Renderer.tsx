import * as React from "react";
import {useContext, useState} from "react";
import {Registry} from "tc-shared/events";
import {EchoTestEvents, TestState, VoiceConnectionState} from "./Definitions";
import {Translatable, VariadicTranslatable} from "tc-shared/ui/react-elements/i18n";
import {ClientIcon} from "svg-sprites/client-icons";
import {ClientIconRenderer} from "tc-shared/ui/react-elements/Icons";
import {Checkbox} from "tc-shared/ui/react-elements/Checkbox";
import {Button} from "tc-shared/ui/react-elements/Button";
import {LoadingDots} from "tc-shared/ui/react-elements/LoadingDots";

const cssStyle = require("./Renderer.scss");

export const EchoTestEventRegistry = React.createContext<Registry<EchoTestEvents>>(undefined);

const VoiceStateOverlay = () => {
    const events = useContext(EchoTestEventRegistry);

    const [state, setState] = useState<"loading" | VoiceConnectionState>(() => {
        events.fire("query_voice_connection_state");
        return "loading";
    });
    const [message, setMessage] = useState(undefined);

    events.reactUse("notify_voice_connection_state", event => {
        setState(event.state);
        setMessage(event.message);
    });

    let inner, shown = true, error = false;
    switch (state) {
        case "failed":
            error = true;
            inner = <a key={state}>
                <Translatable>Voice connection establishment has been failed:</Translatable><br />
                {message}
            </a>;
            break;

        case "disconnected":
            inner = <a key={state}><Translatable>Voice connection has been disconnected.</Translatable></a>;
            break;

        case "unsupported-server":
            inner = <a key={state}><Translatable>Voice connection isn't supported by the server.</Translatable></a>;
            break;

        case "unsupported-client":
            inner = <a key={state}>
                <Translatable>Voice connection isn't supported by your browser.</Translatable><br/>
                <Translatable>Please use another browser.</Translatable>
            </a>;
            break;

        case "connecting":
            inner = <a key={state}><Translatable>establishing voice connection</Translatable> <LoadingDots/></a>;
            break;

        case "loading":
            inner = <a key={state}><Translatable>loading</Translatable> <LoadingDots/></a>;
            break;

        case "connected":
            shown = false;
            break;

        default:
            shown = false;
    }

    return (
        <div className={cssStyle.overlay + " " + (shown ? cssStyle.shown : "") + " " + (error ? cssStyle.error : "")}>
            {inner}
        </div>
    );
}

const TestStateOverlay = () => {
    const events = useContext(EchoTestEventRegistry);

    const [state, setState] = useState<{ state: "loading" } | TestState>(() => {
        events.fire("query_test_state");
        return {state: "loading"};
    });

    const [voiceConnected, setVoiceConnected] = useState<"loading" | boolean>(() => {
        return "loading";
    });

    events.reactUse("notify_voice_connection_state", event => setVoiceConnected(event.state === "connected"));
    events.reactUse("notify_test_state", event => setState(event.state));

    let inner;
    switch (state.state) {
        case "loading":
        case "initializing":
            inner = <a key={"initializing"}><Translatable>initializing</Translatable> <LoadingDots/></a>;
            break;

        case "start-failed":
            inner = <a key={"initializing"}>
                <VariadicTranslatable text={"Failed to start echo test:\n{0}"}>
                    {state.error}
                </VariadicTranslatable>
                <br/>
                <Button type={"small"} color={"green"} onClick={() => events.fire("action_start_test")}><Translatable>Try
                    again</Translatable></Button>
            </a>;
            break;

        case "unsupported":
            inner = <a key={"initializing"}>
                <Translatable>Echo testing hasn't been supported by the
                server.</Translatable>
            </a>;
            break;

        case "muted":
            if(state.microphone && state.speaker) {
                inner = <a key={"muted-microphone-speaker"}>
                    <Translatable>Your speaker and microphone have been muted.</Translatable>
                    <br/>
                    <Button type={"small"} color={"green"} onClick={() => events.fire("action_unmute")} transparency={false}>
                        <Translatable>Unmute speaker and microphone</Translatable>
                    </Button>
                </a>;
            } else if(state.microphone) {
                inner = <a key={"muted-microphone"}>
                    <Translatable>Your microphone has been muted.</Translatable>
                    <br/>
                    <Button type={"small"} color={"green"} onClick={() => events.fire("action_unmute")} transparency={false}>
                        <Translatable>Unmute microphone</Translatable>
                    </Button>
                </a>;
            } else {
                inner = <a key={"muted-speaker"}>
                    <Translatable>Your speaker has been muted.</Translatable>
                    <br/>
                    <Button type={"small"} color={"green"} onClick={() => events.fire("action_unmute")} transparency={false}>
                        <Translatable>Unmute speaker</Translatable>
                    </Button>
                </a>;
            }
            break;
    }

    return (
        <div className={cssStyle.overlay + " " + (state.state !== "running" && voiceConnected ? cssStyle.shown : "")}>
            {inner}
        </div>
    );
}

const TroubleshootingSoundOverlay = () => {
    const events = useContext(EchoTestEventRegistry);

    const [visible, setVisible] = useState(false);

    events.reactUse("notify_test_phase", event => setVisible(event.phase === "troubleshooting"));

    return (
        <div className={cssStyle.overlay + " " + cssStyle.troubleshoot + " " + (visible ? cssStyle.shown : "")}>
            <div className={cssStyle.top}>
                <div className={cssStyle.containerIcon}>
                    <ClientIconRenderer icon={ClientIcon.MicrophoneBroken} className={cssStyle.icon}/>
                </div>
                <div className={cssStyle.help}>
                    <h1><Translatable>Troubleshooting guide</Translatable></h1>
                    <ol>
                        <li>
                            <h2><Translatable>Correct microphone selected?</Translatable>
                                <Button type={"extra-small"}
                                        onClick={() => events.fire("action_open_microphone_settings")}>
                                    <Translatable>Open Microphone settings</Translatable>
                                </Button>
                            </h2>
                            <p>
                                <Translatable>Check within the settings, if the right microphone has been
                                    selected.</Translatable>
                                <Translatable>The indicators will show you any voice activity.</Translatable>
                            </p>
                        </li>
                        <li>
                            <h2><Translatable>Are any addons blocking the microphone access?</Translatable></h2>
                            <p>
                                <Translatable>Some addons might block the access to your microphone. Try to disable all
                                    addons and reload the site.</Translatable>
                            </p>
                        </li>
                        <li>
                            <h2><Translatable>Has WebRTC been enabled?</Translatable></h2>
                            <p>
                                <VariadicTranslatable
                                    text={"In some cases, WebRTC has been disabled. Click {0} to troubleshoot any WebRTC related issues."}>
                                    <a href={"https://test.webrtc.org"} hrefLang={"en"}
                                       target={"_blank"}><Translatable>here</Translatable></a>
                                </VariadicTranslatable>
                            </p>
                        </li>
                        <li>
                            <h2><Translatable>Reload the site</Translatable></h2>
                            <p>
                                <Translatable>In some cases, reloading the site will already solve the issue for
                                    you.</Translatable>
                            </p>
                        </li>
                        <li>
                            <h2><Translatable>Nothing worked? Submit an issue</Translatable></h2>
                            <p>
                                <VariadicTranslatable text={"If still nothing worked, try to seek help in our {0}."}>
                                    <a href={"https://forum.teaspeak.de"} hrefLang={"en"}
                                       target={"_blank"}><Translatable>forum</Translatable></a>
                                </VariadicTranslatable>
                                <VariadicTranslatable text={"You can also create a new issue/bug report {0}."}>
                                    <a href={"https://github.com/TeaSpeak/TeaWeb/issues"} hrefLang={"en"}
                                       target={"_blank"}><Translatable>here</Translatable></a>
                                </VariadicTranslatable>
                            </p>
                        </li>
                    </ol>
                </div>
            </div>
            <div className={cssStyle.buttons}>
                <Button type={"small"} color={"red"}
                        onClick={() => events.fire("action_troubleshooting_finished", {status: "aborted"})}>
                    <Translatable>Abort test</Translatable>
                </Button>

                <Button type={"small"} color={"green"}
                        onClick={() => events.fire("action_troubleshooting_finished", {status: "test-again"})}>
                    <Translatable>Test again</Translatable>
                </Button>
            </div>
        </div>
    )
}

export const TestToggle = () => {
    const events = useContext(EchoTestEventRegistry);

    const [state, setState] = useState<"loading" | boolean>(() => {
        events.fire("query_test_state");
        return "loading";
    });

    events.reactUse("notify_tests_toggle", event => setState(event.enabled));

    return (
        <Checkbox
            value={state === true}
            disabled={state === "loading"}
            onChange={() => events.fire("action_toggle_tests", {enabled: state === false})}
            label={<Translatable>Show this on the next connect</Translatable>}
        />
    )
}

export const EchoTestModal = () => {
    const events = useContext(EchoTestEventRegistry);

    return (
        <div className={cssStyle.container}>
            <h1 className={cssStyle.header}>
                <Translatable>Welcome to the private echo test. Can you hear yourself speaking?</Translatable>
            </h1>
            <div className={cssStyle.buttons}>
                <div className={cssStyle.buttonContainer}>
                    <div className={cssStyle.button + " " + cssStyle.success} title={tr("Yes")}
                         onClick={() => events.fire("action_test_result", {status: "success"})}>
                        <ClientIconRenderer icon={ClientIcon.Apply} className={cssStyle.icon}/>
                    </div>
                    <a><Translatable>Yes</Translatable></a>
                </div>
                <div className={cssStyle.buttonContainer}>
                    <div className={cssStyle.button + " " + cssStyle.fail} title={tr("No")}
                         onClick={() => events.fire("action_test_result", {status: "fail"})}>
                        <ClientIconRenderer icon={ClientIcon.Delete} className={cssStyle.icon}/>
                    </div>
                    <a><Translatable>No</Translatable></a>
                </div>

                <VoiceStateOverlay/>
                <TestStateOverlay/>
            </div>
            <div className={cssStyle.footer}>
                <TestToggle/>
                <Button color={"red"} type={"small"}
                        onClick={() => events.fire("action_close")}><Translatable>Close</Translatable></Button>
            </div>
            <TroubleshootingSoundOverlay/>
        </div>
    );
};