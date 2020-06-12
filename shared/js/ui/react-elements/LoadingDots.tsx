import {useEffect, useState} from "react";
import * as React from "react";

export const LoadingDots = (props: { maxDots?: number, speed?: number }) => {
    if(!props.maxDots || props.maxDots < 1)
        props.maxDots = 3;

    const [dots, setDots] = useState(0);

    useEffect(() => {
        const timeout = setTimeout(() => setDots(dots + 1), props.speed || 500);
        return () => clearTimeout(timeout);
    });

    let result = ".";
    for(let index = 0; index < dots % props.maxDots; index++)
        result += ".";
    return <div style={{ width: (props.maxDots / 3) + "em", display: "inline-block", textAlign: "left" }}>{result}</div>;
};