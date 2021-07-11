import {VariadicTranslatable} from "tc-shared/ui/react-elements/i18n";
import {Registry} from "tc-shared/events";
import * as React from "react";
import {useContext, useEffect, useRef, useState} from "react";
import {findLogEventRenderer} from "./RendererEvent";
import {LogMessage} from "tc-shared/connectionlog/Definitions";
import {ServerEventLogUiEvents} from "tc-shared/ui/frames/log/Definitions";
import {useDependentState} from "tc-shared/ui/react-elements/Helper";
import {ErrorBoundary} from "tc-shared/ui/react-elements/ErrorBoundary";

const cssStyle = require("./Renderer.scss");

const HandlerIdContext = React.createContext<string>(undefined);
const EventsContext = React.createContext<Registry<ServerEventLogUiEvents>>(undefined);

const LogFallbackDispatcher = (_unused, __unused, eventType) => (
    <div className={cssStyle.errorMessage}>
        <VariadicTranslatable text={"Missing log entry builder for {0}"}>
            <>{eventType}</>
        </VariadicTranslatable>
    </div>
);

const LogEntryRenderer = React.memo((props: { entry: LogMessage }) => {
    const handlerId = useContext(HandlerIdContext);
    const dispatcher = findLogEventRenderer(props.entry.type as any) || LogFallbackDispatcher;
    const rendered = dispatcher(props.entry.data, handlerId, props.entry.type);

    if(!rendered) { /* hide message */
        return null;
    }

    const date = new Date(props.entry.timestamp);
    return (
        <div className={cssStyle.logEntry}>
            <div className={cssStyle.timestamp}>&lt;{
                ("0" + date.getHours()).substr(-2) + ":" +
                ("0" + date.getMinutes()).substr(-2) + ":" +
                ("0" + date.getSeconds()).substr(-2)
            }&gt;</div>
            {rendered}
        </div>
    );
});

const ServerLogRenderer = (props: { backlog?: number }) => {
    const backlog = typeof props.backlog === "number" ? props.backlog : 100;
    const handlerId = useContext(HandlerIdContext);
    const events = useContext(EventsContext);

    const refContainer = useRef<HTMLDivElement>();
    const scrollOffset = useRef<number | "bottom">("bottom");

    const [ , setRevision ] = useState(0);
    const [ logs, setLogs ] = useDependentState<LogMessage[] | "loading">(() => {
        events.fire_react("query_log");
        return "loading";
    }, [ handlerId ]);

    events.reactUse("notify_log", event => {
        const logs = event.events.slice(0);
        logs.splice(0, Math.max(0, logs.length - backlog));
        logs.sort((a, b) => a.timestamp - b.timestamp);
        setLogs(logs);
    });

    events.reactUse("notify_log_add", event => {
        if(logs === "loading") {
            return;
        }

        logs.push(event.event);
        logs.splice(0, Math.max(0, logs.length - backlog));
        logs.sort((a, b) => a.timestamp - b.timestamp);
        setRevision(performance.now());
    });

    const fixScroll = () => {
        if(!refContainer.current) {
            return;
        }

        refContainer.current.scrollTop = scrollOffset.current === "bottom" ? refContainer.current.scrollHeight : scrollOffset.current;
    };

    useEffect(() => {
        const id = requestAnimationFrame(fixScroll);
        return () => cancelAnimationFrame(id);
    });

    return (
        <div className={cssStyle.logContainer} ref={refContainer} onScroll={event => {
            const target = event.target as HTMLDivElement;

            const top = target.scrollTop;
            const total = target.scrollHeight - target.clientHeight;
            const shouldFollow = top + 100 > total;

            scrollOffset.current = shouldFollow ? "bottom" : top;
        }}>
            {logs === "loading" ? null : logs.map(e => <LogEntryRenderer key={e.uniqueId} entry={e} />)}
        </div>
    );
};

export const ServerLogFrame = (props: { events: Registry<ServerEventLogUiEvents> }) => {
    const [ handlerId, setHandlerId ] = useState<string>(() => {
        props.events.fire("query_handler_id");
        return undefined;
    });
    props.events.reactUse("notify_handler_id", event => setHandlerId(event.handlerId));

    return (
        <EventsContext.Provider value={props.events}>
            <HandlerIdContext.Provider value={handlerId}>
                <ErrorBoundary>
                    <ServerLogRenderer />
                </ErrorBoundary>
            </HandlerIdContext.Provider>
        </EventsContext.Provider>
    );
}
