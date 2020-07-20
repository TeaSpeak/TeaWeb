import {useEffect, useState} from "react";
import * as React from "react";

export const LoadingDots = (props: { maxDots?: number, speed?: number, textOnly?: boolean }) => {
    let { maxDots, speed } = props;
    if(!maxDots || maxDots < 1)
        maxDots = 3;

    const [dots, setDots] = useState(0);

    useEffect(() => {
        const timeout = setTimeout(() => setDots(dots + 1), speed || 500);
        return () => clearTimeout(timeout);
    });

    let result = ".";
    for(let index = 0; index < dots % maxDots; index++)
        result += ".";

    if(props.textOnly)
        return <>{result}</>;
    return <div style={{ width: (maxDots / 3) + "em", display: "inline-block", textAlign: "left" }}>{result}</div>;
};