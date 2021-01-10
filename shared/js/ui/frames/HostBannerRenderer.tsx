import {Registry} from "tc-shared/events";
import {HostBannerInfo, HostBannerInfoSet, HostBannerUiEvents} from "tc-shared/ui/frames/HostBannerDefinitions";
import * as React from "react";
import {useEffect, useRef, useState} from "react";
import {useGlobalSetting, useTr} from "tc-shared/ui/react-elements/Helper";
import {ErrorBoundary} from "tc-shared/ui/react-elements/ErrorBoundary";
import {Settings} from "tc-shared/settings";

const cssStyle = require("./HostBannerRenderer.scss");

const HostBannerRenderer = React.memo((props: { banner: HostBannerInfoSet, }) => {
    const [ revision, setRevision ] = useState(Date.now());
    useEffect(() => {
        if(!props.banner.updateInterval) {
            return;
        }

        const id = setTimeout(() => setRevision(Date.now()), props.banner.updateInterval * 1000);
        return () => clearTimeout(id);
    });

    const [ loadingState, setLoadingState ] = useState<"loading" | "error" | "loaded">("loading");
    const refImage = useRef<HTMLImageElement>();

    useRef(() => {
        if(refImage.current.complete) {
            setLoadingState(refImage.current.naturalWidth === 0 ? "error" : "loaded");
        }
    });

    let appendix = (props.banner.imageUrl.indexOf("?") === -1 ? "?" : "&") + "_ts=" + revision;
    const withBackground = useGlobalSetting(Settings.KEY_HOSTBANNER_BACKGROUND);

    return (
        <div
            className={
                cssStyle.containerImage + " " + cssStyle["mode-" + props.banner.mode] + " " + cssStyle["state-" + loadingState] + " " +
                (withBackground ? cssStyle.withBackground : "")
            }
            onClick={() => {
                if(props.banner.linkUrl) {
                    window.open(props.banner.linkUrl, "_blank");
                }
            }}
        >
            <img
                src={props.banner.imageUrl + appendix}
                alt={useTr("Host banner")}
                onError={() => setLoadingState("error")}
                onLoad={() => setLoadingState("loaded")}
                ref={refImage}
            />
        </div>
    );
});

export const HostBanner = React.memo((props: { events: Registry<HostBannerUiEvents> }) => {
    const [ hostBanner, setHostBanner ] = useState<HostBannerInfo>(() => {
        props.events.fire("query_host_banner");
        return { status: "none" };
    });

    props.events.reactUse("notify_host_banner", event => {
        setHostBanner(event.banner);
    }, undefined, []);

    return (
        <div className={cssStyle.container + " " + (hostBanner.status !== "set" ? cssStyle.disabled : "")}>
            <ErrorBoundary>
                {hostBanner.status === "set" ? <HostBannerRenderer key={"banner"} banner={hostBanner} /> : undefined}
            </ErrorBoundary>
        </div>
    );
});