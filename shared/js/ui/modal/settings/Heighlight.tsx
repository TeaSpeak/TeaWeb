import * as React from "react";
import {useContext} from "react";

const cssStyle = require("./Heighlight.scss");

const HighlightContext = React.createContext<string>(undefined);
export const HighlightContainer = (props: { children: React.ReactNode | React.ReactNode[], classList?: string, highlightedId?: string, onClick?: () => void }) => {
    return (
        <HighlightContext.Provider value={props.highlightedId}>
            <div className={cssStyle.container + " " + (props.highlightedId ? cssStyle.shown : "") + " " + props.classList} onClick={props.highlightedId ? props.onClick : undefined}>
                {props.children}
                <div className={cssStyle.background} />
            </div>
        </HighlightContext.Provider>
    );
};

export const HighlightRegion = (props: React.HTMLProps<HTMLDivElement> & { highlightId: string } ) => {
    const wProps = Object.assign({}, props);
    delete wProps["highlightId"];

    const highlightedId = useContext(HighlightContext);
    const highlighted = highlightedId === props.highlightId;

    wProps.className = (props.className || "") + " " + cssStyle.highlightable + " " + (highlighted ? cssStyle.highlighted : "");
    return React.createElement("div", wProps);
};

export const HighlightText = (props: { highlightId: string, className?: string, children?: React.ReactNode | React.ReactNode[] } ) => {
    const highlightedId = useContext(HighlightContext);
    const highlighted = highlightedId === props.highlightId;

    return (
        <div className={cssStyle.helpText + " " + (highlighted ? cssStyle.shown : "") + " " + props.className}>
            {props.children}
        </div>
    )
};