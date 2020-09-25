import * as React from "react";
import {RemoteIcon} from "tc-shared/file/Icons";
import {useState} from "react";

export const IconRenderer = (props: {
    icon: string;
    title?: string;
    className?: string;
}) => {
    if(!props.icon) {
        return <div className={"icon-container icon-empty " + props.className} title={props.title} />;
    } else if(typeof props.icon === "string") {
        return <div className={"icon " + props.icon + " " + props.className} title={props.title} />;
    } else {
        throw "JQuery icons are not longer supported";
    }
}

export const RemoteIconRenderer = (props: { icon: RemoteIcon, className?: string, title?: string }) => {
    const [ revision, setRevision ] = useState(0);

    props.icon.events.reactUse("notify_state_changed", () => setRevision(revision + 1));

    switch (props.icon.getState()) {
        case "empty":
        case "destroyed":
            return <div key={"empty"} className={"icon-container icon-empty " + props.className} title={props.title} />;

        case "loaded":
            if(props.icon.iconId >= 0 && props.icon.iconId <= 1000) {
                if(props.icon.iconId === 0) {
                    return <div key={"loaded-empty"} className={"icon-container icon-empty " + props.className} title={props.title} />;
                }

                return <div key={"loaded"} className={"icon_em client-group_" + props.icon.iconId + " " + props.className} title={props.title} />;
            }
            return (
                <div key={"icon"} className={"icon-container " + props.className} x-debug-version={2}>
                    <img style={{ maxWidth: "100%", maxHeight: "100%" }} src={props.icon.getImageUrl()} alt={props.title || ("icon " + props.icon.iconId)} draggable={false} />
                </div>
            );

        case "loading":
            return <div key={"loading"} className={"icon-container " + props.className} title={props.title}><div className={"icon_loading"} /></div>;

        case "error":
            return <div key={"error"} className={"icon client-warning " + props.className} title={props.icon.getErrorMessage() || tr("Failed to load icon")} />;

        default:
            throw "invalid icon state";
    }
};