import {Registry} from "tc-shared/events";
import {
    ConnectionComponent,
    ConnectionStatus,
    ConnectionStatusEvents
} from "tc-shared/ui/frames/footer/StatusDefinitions";
import * as React from "react";
import {useContext, useEffect, useRef, useState} from "react";
import {Translatable, VariadicTranslatable} from "tc-shared/ui/react-elements/i18n";
import {network} from "tc-shared/ui/frames/chat";

const cssStyle = require("./Renderer.scss");
export const StatusEvents = React.createContext<Registry<ConnectionStatusEvents>>(undefined);

const ConnectionStateRenderer = React.memo((props: { state: ConnectionStatus, isGeneral: boolean, onClick?: () => void }) => {
    let statusClass;
    let statusBody;
    let title;
    switch (props.state.type) {
        case "disconnected":
            title = tr("Not connected");
            statusClass = cssStyle.disconnected;
            statusBody = <Translatable key={"disconnected"}>Disconnected</Translatable>;
            break;

        case "connecting-signalling":
            statusClass = cssStyle.connecting;

            switch (props.state.state) {
                case "initializing":
                    title = tr("Initializing connection");
                    statusBody = <Translatable key={"connecting-signalling-initializing"}>Initializing</Translatable>;
                    break;

                case "connecting":
                    title = tr("Connecting to target");
                    statusBody = <Translatable key={"connecting-signalling-connecting"}>Connecting</Translatable>;
                    break;

                case "authentication":
                    title = tr("Authenticating");
                    statusBody = <Translatable key={"connecting-signalling-authenticating"}>Authenticating</Translatable>;
                    break;
            }
            break;
        case "connecting-voice":
            title = tr("Establishing audio connection");
            statusClass = cssStyle.connecting;
            if(props.isGeneral) {
                statusBody = <Translatable key={"connecting-voice-general"}>Audio connecting</Translatable>;
            } else {
                statusBody = <Translatable key={"connecting-voice-general"}>Connecting</Translatable>;
            }
            break;

        case "connecting-video":
            title = tr("Establishing video connection");
            statusClass = cssStyle.connecting;
            if(props.isGeneral) {
                statusBody = <Translatable key={"connecting-video-general"}>Video connecting</Translatable>;
            } else {
                statusBody = <Translatable key={"connecting-video-general"}>Connecting</Translatable>;
            }
            break;

        case "unhealthy":
            title = props.state.reason;
            statusClass = cssStyle.unhealthy;
            statusBody = <Translatable key={"unhealthy"}>Unhealthy</Translatable>;
            break;

        case "healthy":
            title = tr("Connection is healthy");
            statusClass = cssStyle.healthy;
            statusBody = <Translatable key={"healthy"}>Healthy</Translatable>;
            break;

        case "unsupported":
            title = tr("Not supported");
            statusClass = cssStyle.disconnected;
            statusBody = <Translatable key={"not-supported"}>Not supported</Translatable>;
            break;

        default:
            statusClass = cssStyle.unhealthy;
            statusBody = <Translatable key={"invalid-state"}>Invalid state</Translatable>;
            break;
    }

    return <div className={cssStyle.status + " " + statusClass} title={title} onClick={props.onClick}>{statusBody}</div>;
})

export const StatusTextRenderer = React.memo(() => {
    const events = useContext(StatusEvents);

    const [ status, setStatus ] = useState<ConnectionStatus>(() => {
        events.fire("query_connection_status");
        return { type: "disconnected" };
    });
    events.reactUse("notify_connection_status", event => setStatus(event.status), undefined, []);

    return (
        <div className={cssStyle.rtcStatus}>
            <div><Translatable>Connection status:</Translatable></div>
            <ConnectionStateRenderer
                state={status}
                isGeneral={true}
                onClick={() => events.fire("action_toggle_component_detail")}
            />
        </div>
    );
});

const ComponentStatusRenderer = React.memo((props: { component: ConnectionComponent }) => {
    const events = useContext(StatusEvents);
    const [ status, setStatus ] = useState<ConnectionStatus>(() => {
        events.fire("query_component_status", { component: props.component });
        return { type: "disconnected" };
    });
    events.reactUse("notify_component_status", event => event.component === props.component && setStatus(event.status),
        undefined, []);

    let title;
    switch (props.component) {
        case "signaling":
            title = <Translatable key={"control"}>Control</Translatable>;
            break;
        case "video":
            title = <Translatable key={"video"}>Video</Translatable>;
            break;
        case "voice":
            title = <Translatable key={"voice"}>Voice</Translatable>;
            break;
    }

    let body;
    switch (status.type) {
        case "healthy":
            body = (
                <React.Fragment key={"healthy"}>
                    <div className={cssStyle.row}>
                        <div className={cssStyle.key}><Translatable>Incoming:</Translatable></div>
                        <div className={cssStyle.value}>{network.binarySizeToString(status.bytesReceived)}</div>
                    </div>
                    <div className={cssStyle.row}>
                        <div className={cssStyle.key}><Translatable>Outgoing:</Translatable></div>
                        <div className={cssStyle.value}>{network.binarySizeToString(status.bytesSend)}</div>
                    </div>
                </React.Fragment>
            );
            break;

        case "connecting-signalling":
        case "connecting-voice":
        case "connecting-video":
        case "disconnected":
        case "unsupported":
            let text;
            switch (props.component) {
                case "signaling":
                    text = <Translatable key={"signalling"}>The control component is the main server connection. All actions are transceived by this connection.</Translatable>;
                    break;
                case "video":
                    text = <Translatable key={"video"}>The video component transmits and receives video data. It's used to transmit camara and screen data.</Translatable>;
                    break;
                case "voice":
                    text = <Translatable key={"voice"}>The voice component transmits and receives audio data.</Translatable>;
                    break;
            }
            body = (
                <div className={cssStyle.row + " " + cssStyle.error} key={"description"}>
                    <div className={cssStyle.text}>{text}</div>
                </div>
            );
            break;

        case "unhealthy":
            let errorText;
            if(status.retryTimestamp) {
                let time = Math.ceil((status.retryTimestamp - Date.now()) / 1000);
                let minutes = Math.floor(time / 60);
                let seconds = time % 60;
                errorText = <VariadicTranslatable key={"retry"} text={"Error occurred. Retry in {}."}>{(minutes > 0 ? minutes + "m" : "") + seconds + "s"}</VariadicTranslatable>;
            } else {
                errorText = <Translatable key={"no-retry"}>Error occurred. No retry.</Translatable>;
            }
            body = (
                <div className={cssStyle.row + " " + cssStyle.error} key={"error"}>
                    <div className={cssStyle.text + " " + cssStyle.errorRow}>{errorText}</div>
                    <div className={cssStyle.text + " " + cssStyle.error} title={status.reason}>{status.reason}</div>
                </div>
            );
            break;
    }

    return (<>
        <div className={cssStyle.row + " " + cssStyle.title}>
            <div className={cssStyle.key}>{title}</div>
            <div className={cssStyle.value}>
                <ConnectionStateRenderer state={status} isGeneral={false} />
            </div>
        </div>
        {body}
    </>);
})

export const StatusDetailRenderer = () => {
    const events = useContext(StatusEvents);

    const refContainer = useRef<HTMLDivElement>();
    const refShowId = useRef(0);

    const [ shown, setShown ] = useState(() => {
        events.fire("query_component_detail_state");
        return false;
    });
    events.reactUse("notify_component_detail_state", event => {
        if(event.shown) {
            refShowId.current++;
        }
        setShown(event.shown);
    });

    useEffect(() => {
        if(!shown) { return; }

        const listener = (event: MouseEvent) => {
            const target = event.target as HTMLDivElement;
            if(!refContainer.current?.contains(target)) {
                events.fire("action_toggle_component_detail", { shown: false });
            }
        };
        document.addEventListener("click", listener);
        return () => document.removeEventListener("click", listener);
    }, [shown]);

    return (
        <div className={cssStyle.rtcStatusDetail + " " + (shown ? cssStyle.shown : "")} ref={refContainer}>
            <div className={cssStyle.header}><Translatable>Connection Details</Translatable></div>
            <ComponentStatusRenderer component={"signaling"} key={"rev-0-" + refShowId.current} />
            <ComponentStatusRenderer component={"voice"} key={"rev-1-" + refShowId.current} />
            <ComponentStatusRenderer component={"video"} key={"rev-2-" + refShowId.current} />
        </div>
    )
};