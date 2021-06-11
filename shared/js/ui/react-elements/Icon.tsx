import * as React from "react";
import {ClientIconRenderer} from "tc-shared/ui/react-elements/Icons";
import {ClientIcon} from "svg-sprites/client-icons";
import {getIconManager, RemoteIcon, RemoteIconInfo} from "tc-shared/file/Icons";
import {useState} from "react";

const cssStyle = require("./Icon.scss");

export const IconEmpty = React.memo((props: { className?: string, title?: string }) => (
    <div className={cssStyle.container + " icon-container icon-empty " + props.className} title={props.title} />
));

export const IconLoading = React.memo((props: { className?: string, title?: string }) => (
    <div className={cssStyle.container + " icon-container " + props.className} title={props.title}>
        <div className={cssStyle.iconLoading} />
    </div>
));

export const IconError = React.memo((props: { className?: string, title?: string }) => (
    <ClientIconRenderer icon={ClientIcon.Warning} className={props.className} title={props.title} />
));

export const IconUrl = React.memo((props: { iconUrl: string, className?: string, title?: string }) => (
    <div className={cssStyle.container + " icon-container " + props.className}>
        <img style={{ maxWidth: "100%", maxHeight: "100%" }} src={props.iconUrl} alt={props.title} draggable={false} />
    </div>
));

export const IconRenderer = React.memo((props: {
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
});

export const RemoteIconRenderer = React.memo((props: { icon: RemoteIcon | undefined, className?: string, title?: string }) => {
    const [ revision, setRevision ] = useState(0);

    props.icon.events.reactUse("notify_state_changed", () => setRevision(revision + 1));

    switch (props.icon.getState()) {
        case "empty":
        case "destroyed":
            return (
                <IconEmpty key={"empty"} className={props.className} title={props.title} />
            );

        case "loaded":
            if(props.icon.iconId >= 0 && props.icon.iconId <= 1000) {
                if(props.icon.iconId === 0) {
                    return (
                        <IconEmpty key={"loaded-empty"} className={props.className} title={props.title} />
                    );
                }

                return <div key={"loaded"} className={cssStyle.container + " icon_em client-group_" + props.icon.iconId + " " + props.className} title={props.title} />;
            }

            return (
                <IconUrl iconUrl={props.icon.getImageUrl()} title={props.title || ("icon " + props.icon.iconId)} key={"icon-" + props.icon.iconId} className={props.className} />
            );

        case "loading":
            return (
                <IconLoading className={props.className} title={props.title} key={"loading"} />
            );

        case "error":
            return (
                <IconError key={"error"} className={props.className} title={props.icon.getErrorMessage()} />
            );

        default:
            throw "invalid icon state";
    }
});

export const RemoteIconInfoRenderer = React.memo((props: { icon: RemoteIconInfo | undefined, className?: string, title?: string }) => {
    if(!props.icon || props.icon.iconId === 0) {
        return <IconEmpty title={props.title} className={props.className} key={"empty-icon"} />;
    } else {
        return <RemoteIconRenderer icon={getIconManager().resolveIconInfo(props.icon)} className={props.className} title={props.title} key={"icon"} />;
    }
});