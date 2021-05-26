import * as React from "react";
import {CSSProperties, useEffect, useRef, useState} from "react";
import ResizeObserver from "resize-observer-polyfill";

const SpanCssProperties: CSSProperties = {
    position: "absolute",
    fontSize: "inherit",
    top: 0,
    left: 0,
    width: "1em",
    height: 1,
    translate: "none",
    transition: "none",
    transform: "none"
};

export const FontSizeObserver = React.memo((props: { children: (fontSize: number) => React.ReactNode | React.ReactNode[] }) => {
    const refContainer = useRef<HTMLSpanElement>();
    const [ fontSize, setFontSize ] = useState(() => {
        return  parseFloat(window.getComputedStyle(document.body, null).getPropertyValue('font-size'));
    });

    useEffect(() => {
        const resizeObserver = new ResizeObserver(entries => {
            const entry = entries.last();
            setFontSize(entry.contentRect.width);
        });

        resizeObserver.observe(refContainer.current);
        return () => resizeObserver.disconnect();
    })

    return (
        <React.Fragment>
            <span style={SpanCssProperties} ref={refContainer}>&nbsp;</span>
            {props.children(fontSize)}
        </React.Fragment>
    )
});