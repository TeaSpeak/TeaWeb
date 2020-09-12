import {useEffect, useState} from "react";
import * as React from "react";
import {format_chat_time} from "tc-shared/utils/DateUtils";

export const TimestampRenderer = (props: { timestamp: number }) => {
    const time = format_chat_time(new Date(props.timestamp));
    const [ revision, setRevision ] = useState(0);

    useEffect(() => {
        if(!time.next_update)
            return;

        const id = setTimeout(() => setRevision(revision + 1), time.next_update);
        return () => clearTimeout(id);
    });

    return <>{time.result}</>;
};