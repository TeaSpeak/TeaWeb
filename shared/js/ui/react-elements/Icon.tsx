import * as React from "react";
import {useState} from "react";
import {getIconManager, RemoteIcon, RemoteIconInfo} from "tc-shared/file/Icons";

const cssStyle = require("./Icon.scss");

const EmptyIcon = (props: { className?: string, title?: string }) => <div className={cssStyle.container + " icon-container icon-empty " + props.className} title={props.title} />;

export const IconRenderer = (props: {
    icon: string;
    title?: string;
    className?: string;
}) => {
    if(!props.icon) {
        return <div className={cssStyle.container + " icon-container icon-empty " + props.className} title={props.title} />;
    } else if(typeof props.icon === "string") {
        return <div className={cssStyle.container + " icon_em " + props.icon + " " + props.className} title={props.title} />;
    } else {
        throw "JQuery icons are not longer supported";
    }
}

export const RemoteIconRenderer = (props: { icon: RemoteIcon | undefined, className?: string, title?: string }) => {
    const [ revision, setRevision ] = useState(0);

    props.icon.events.reactUse("notify_state_changed", () => setRevision(revision + 1));

    switch (props.icon.getState()) {
        case "empty":
        case "destroyed":
            return <div key={"empty"} className={cssStyle.container + " icon-container icon-empty " + props.className} title={props.title} />;

        case "loaded":
            if(props.icon.iconId >= 0 && props.icon.iconId <= 1000) {
                if(props.icon.iconId === 0) {
                    return <div key={"loaded-empty"} className={cssStyle.container + " icon-container icon-empty " + props.className} title={props.title} />;
                }

                return <div key={"loaded"} className={cssStyle.container + " icon_em client-group_" + props.icon.iconId + " " + props.className} title={props.title} />;
            }
            return (
                <div key={"icon-" + props.icon.iconId} className={cssStyle.container + " icon-container " + props.className}>
                    <img style={{ maxWidth: "100%", maxHeight: "100%" }} src={props.icon.getImageUrl()} alt={props.title || ("icon " + props.icon.iconId)} draggable={false} />
                </div>
            );

        case "loading":
            return <div key={"loading"} className={cssStyle.container + " icon-container " + props.className} title={props.title}><div className={"icon_loading"} /></div>;

        case "error":
            return <div key={"error"} className={cssStyle.container + " icon client-warning " + props.className} title={props.icon.getErrorMessage() || tr("Failed to load icon")} />;

        default:
            throw "invalid icon state";
    }
};

export const RemoteIconInfoRenderer = React.memo((props: { icon: RemoteIconInfo | undefined, className?: string, title?: string }) => {
    if(!props.icon || props.icon.iconId === 0) {
        return <EmptyIcon title={props.title} className={props.className} key={"empty-icon"} />;
    } else {
        return <RemoteIconRenderer icon={getIconManager().resolveIconInfo(props.icon)} className={props.className} title={props.title} key={"icon"} />;
    }
});