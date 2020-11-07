import {LogMessage, ServerLogUIEvents} from "tc-shared/ui/frames/log/Definitions";
import {VariadicTranslatable} from "tc-shared/ui/react-elements/i18n";
import {Registry} from "tc-shared/events";
import {useEffect, useRef, useState} from "react";
import * as React from "react";
import {findLogDispatcher} from "tc-shared/ui/frames/log/DispatcherLog";

const cssStyle = require("./Renderer.scss");

const LogFallbackDispatcher = (_unused, __unused, eventType) => (
    <div className={cssStyle.errorMessage}>
        <VariadicTranslatable text={"Missing log entry builder for {0}"}>
            <>{eventType}</>
        </VariadicTranslatable>
    </div>
);

const LogEntryRenderer = React.memo((props: { entry: LogMessage, handlerId: string }) => {
    const dispatcher = findLogDispatcher(props.entry.type as any) || LogFallbackDispatcher;
    const rendered = dispatcher(props.entry.data, props.handlerId, props.entry.type);

    if(!rendered) /* hide message */
        return null;

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

export const ServerLogRenderer = (props: { events: Registry<ServerLogUIEvents>, handlerId: string }) => {
    const [ logs, setLogs ] = useState<LogMessage[] | "loading">(() => {
        props.events.fire_react("query_log");
        return "loading";
    });

    const [ revision, setRevision ] = useState(0);

    const refContainer = useRef<HTMLDivElement>();
    const scrollOffset = useRef<number | "bottom">("bottom");

    props.events.reactUse("notify_log", event => {
        const logs = event.log.slice(0);
        logs.splice(0, Math.max(0, logs.length - 100));
        logs.sort((a, b) => a.timestamp - b.timestamp);
        setLogs(logs);
    });

    props.events.reactUse("notify_log_add", event => {
        if(logs === "loading") {
            return;
        }

        logs.push(event.event);
        logs.splice(0, Math.max(0, logs.length - 100));
        logs.sort((a, b) => a.timestamp - b.timestamp);
        setRevision(revision + 1);
    });

    const fixScroll = () => {
        if(!refContainer.current)
            return;

        refContainer.current.scrollTop = scrollOffset.current === "bottom" ? refContainer.current.scrollHeight : scrollOffset.current;
    };

    props.events.reactUse("notify_show", () => {
        requestAnimationFrame(fixScroll);
    });

    useEffect(() => {
        const id = requestAnimationFrame(fixScroll);
        return () => cancelAnimationFrame(id);
    });

    return (
        <div className={cssStyle.logContainer} ref={refContainer} onScroll={event => {
            const target = event.target as HTMLDivElement;

            const top = target.scrollTop;
            const total = target.scrollHeight - target.clientHeight;
            const shouldFollow = top + 50 > total;

            scrollOffset.current = shouldFollow ? "bottom" : top;
        }}>
            {logs === "loading" ? null : logs.map(e => <LogEntryRenderer key={e.uniqueId} entry={e} handlerId={props.handlerId} />)}
        </div>
    );
};
