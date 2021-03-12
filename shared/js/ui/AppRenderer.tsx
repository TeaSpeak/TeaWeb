import * as React from "react";
import {useEffect, useState} from "react";
import {ControlBar2} from "tc-shared/ui/frames/control-bar/Renderer";
import {Registry} from "tc-shared/events";
import {ControlBarEvents} from "tc-shared/ui/frames/control-bar/Definitions";
import {ConnectionListUIEvents} from "tc-shared/ui/frames/connection-handler-list/Definitions";
import {ConnectionHandlerList} from "tc-shared/ui/frames/connection-handler-list/Renderer";
import {ErrorBoundary} from "tc-shared/ui/react-elements/ErrorBoundary";
import {ContextDivider} from "tc-shared/ui/react-elements/ContextDivider";
import {SideBarRenderer} from "tc-shared/ui/frames/SideBarRenderer";
import {SideBarEvents} from "tc-shared/ui/frames/SideBarDefinitions";
import {SideHeaderEvents} from "tc-shared/ui/frames/side/HeaderDefinitions";
import {ServerLogFrame} from "tc-shared/ui/frames/log/Renderer";
import {ServerEventLogUiEvents} from "tc-shared/ui/frames/log/Definitions";
import {FooterRenderer} from "tc-shared/ui/frames/footer/Renderer";
import {HostBanner} from "tc-shared/ui/frames/HostBannerRenderer";
import {HostBannerUiEvents} from "tc-shared/ui/frames/HostBannerDefinitions";
import {AppUiEvents} from "tc-shared/ui/AppDefinitions";
import {ChannelTreeRenderer} from "tc-shared/ui/tree/Renderer";
import {ChannelTreeUIEvents} from "tc-shared/ui/tree/Definitions";

const cssStyle = require("./AppRenderer.scss");

const VideoFrame = React.memo((props: { events: Registry<AppUiEvents> }) => {
    const refElement = React.useRef<HTMLDivElement>();
    const [ container, setContainer ] = useState<HTMLDivElement | undefined>(() => {
        props.events.fire("query_video_container");
        return undefined;
    });
    props.events.reactUse("notify_video_container", event => setContainer(event.container));

    useEffect(() => {
        if(!refElement.current || !container) {
            return;
        }

        refElement.current.replaceWith(container);
        return () => container.replaceWith(refElement.current);
    });

    if(!container) {
        return null;
    }

    return <div ref={refElement} />;
});

const ChannelTree = React.memo((props: { events: Registry<AppUiEvents> }) => {
    const [ data, setData ] = useState<{ events: Registry<ChannelTreeUIEvents>, handlerId: string }>(() => {
        props.events.fire("query_channel_tree");
        return undefined;
    });

    props.events.reactUse("notify_channel_tree", event => {
        setData({ events: event.events, handlerId: event.handlerId });
    }, undefined, []);

    if(!data?.events) {
        return null;
    }

    return <ChannelTreeRenderer handlerId={data.handlerId} events={data.events} />;
});

export const TeaAppMainView = (props: {
    events: Registry<AppUiEvents>
    controlBar: Registry<ControlBarEvents>,
    connectionList: Registry<ConnectionListUIEvents>,
    sidebar: Registry<SideBarEvents>,
    sidebarHeader: Registry<SideHeaderEvents>,
    log: Registry<ServerEventLogUiEvents>,
    hostBanner: Registry<HostBannerUiEvents>
}) => {
    return (
        <div className={cssStyle.app}>
            <ErrorBoundary>
                <ControlBar2 events={props.controlBar} className={cssStyle.controlBar} />
            </ErrorBoundary>
            <ErrorBoundary>
                <ConnectionHandlerList events={props.connectionList} />
            </ErrorBoundary>

            <div className={cssStyle.mainContainer}>
                <VideoFrame events={props.events} />

                <div className={cssStyle.channelTreeAndSidebar}>
                    <div className={cssStyle.channelTree}>
                        <ErrorBoundary>
                            <HostBanner events={props.hostBanner} />
                            <ChannelTree events={props.events} />
                        </ErrorBoundary>
                    </div>
                    <ContextDivider id={"channel-chat"} direction={"horizontal"} defaultValue={25} />
                    <SideBarRenderer events={props.sidebar} eventsHeader={props.sidebarHeader} className={cssStyle.sideBar} />
                </div>
                <ContextDivider id={"main-log"} direction={"vertical"} defaultValue={75} />
                <ErrorBoundary>
                    <div className={cssStyle.containerLog}>
                        <ServerLogFrame events={props.log} />
                    </div>
                </ErrorBoundary>
            </div>
            <FooterRenderer />
        </div>
    );
}

/* ConnectionHandlerList  */