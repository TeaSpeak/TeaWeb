import * as React from "react";
import {useEffect, useState} from "react";

const SecondsDiv = 1000;
const MinutesDiv = 60 * SecondsDiv;
const HoursDiv = 60 * MinutesDiv;

export const Countdown = (props: { timestamp: number, finished?: React.ReactNode, callbackFinished?: () => void }) => {
    const [ revision, setRevision ] = useState(0);

    let difference = props.timestamp - Date.now();

    useEffect(() => {
        if(difference <= 0)
            return;

        const timeout = setTimeout(() => { setRevision(revision + 1)}, 1000);
        return () => clearTimeout(timeout);
    });


    if(difference <= 0) {
        props.callbackFinished && setTimeout(props.callbackFinished);
        return <React.Fragment key={"finished"}>{props.finished}</React.Fragment>;
    }

    if(difference % 1000 !== 0)
        difference += 1000;

    const hours = Math.floor(difference / HoursDiv);
    const minutes = Math.floor((difference % HoursDiv) / MinutesDiv);
    const seconds = Math.floor((difference % MinutesDiv) / SecondsDiv);

    let message = "";
    if(hours > 1)
        message += " " +hours + " " + tr("hours");
    else if(hours === 1)
        message += " " + tr("1 hour");

    if(minutes > 1)
        message += " " +minutes + " " + tr("minutes");
    else if(minutes === 1)
        message += " " + tr("1 minute");

    if(seconds > 1)
        message += " " + seconds + " " + tr("seconds");
    else if(seconds === 1)
        message += " " + tr("1 second");

    return <>{message.substr(1)}</>;
};