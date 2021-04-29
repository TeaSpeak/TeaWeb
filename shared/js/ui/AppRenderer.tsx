import * as React from "react";
import {useEffect, useMemo} from "react";
import {ControlBar2} from "tc-shared/ui/frames/control-bar/Renderer";
import {IpcRegistryDescription, Registry} from "tc-shared/events";
import {ConnectionHandlerList} from "tc-shared/ui/frames/connection-handler-list/Renderer";
import {ErrorBoundary} from "tc-shared/ui/react-elements/ErrorBoundary";
import {ContextDivider} from "tc-shared/ui/react-elements/ContextDivider";
import {SideBarRenderer} from "tc-shared/ui/frames/SideBarRenderer";
import {ServerLogFrame} from "tc-shared/ui/frames/log/Renderer";
import {FooterRenderer} from "tc-shared/ui/frames/footer/Renderer";
import {HostBanner} from "tc-shared/ui/frames/HostBannerRenderer";
import {AppUiVariables} from "tc-shared/ui/AppDefinitions";
import {ChannelTreeRenderer} from "tc-shared/ui/tree/Renderer";
import {ImagePreviewHook} from "tc-shared/ui/frames/ImagePreview";
import {InternalModalHook} from "tc-shared/ui/react-elements/modal/internal";
import {TooltipHook} from "tc-shared/ui/react-elements/Tooltip";
import {ChannelVideoRenderer} from "tc-shared/ui/frames/video/Renderer";
import {
    createIpcUiVariableConsumer,
    IpcVariableDescriptor
} from "tc-shared/ui/utils/IpcVariable";
import {UiVariableConsumer} from "tc-shared/ui/utils/Variable";
import {useRegistry} from "tc-shared/ui/react-elements/Helper";
const cssStyle = require("./AppRenderer.scss");

const VideoFrame = React.memo((props: { variables: UiVariableConsumer<AppUiVariables> }) => {
    const data = props.variables.useReadOnly("channelVideo", undefined, { handlerId: undefined, events: undefined });
    const events = useRegistry(data.events);

    if(!data.events) {
        return null;
    }

    return <ChannelVideoRenderer handlerId={data.handlerId} events={events} key={"video-" + data.handlerId} />;
});

const ChannelTree = React.memo((props: { variables: UiVariableConsumer<AppUiVariables> }) => {
    const data = props.variables.useReadOnly("channelTree", undefined, { handlerId: undefined, events: undefined });
    const events = useRegistry(data.events);

    if(!events) {
        return null;
    }

    return <ChannelTreeRenderer handlerId={data.handlerId} events={events} key={"tree-" + data.handlerId} />;
});

const SideBar = React.memo((props: { variables: UiVariableConsumer<AppUiVariables> }) => (
    <EventProvider registry={props.variables.useReadOnly("sidebar", undefined, undefined)}>
        {sidebarRegistry => (
            <EventProvider registry={props.variables.useReadOnly("sidebarHeader", undefined, undefined)}>
                {sidebarHeaderRegistry => sidebarRegistry && sidebarHeaderRegistry ? (
                    <SideBarRenderer events={sidebarRegistry} eventsHeader={sidebarHeaderRegistry} className={cssStyle.sideBar} />
                ) : null}
            </EventProvider>
        )}
    </EventProvider>
));

function EventProvider<T>(props: {
    registry: IpcRegistryDescription<T> | undefined,
    children: (registry: Registry<T> | undefined) => React.ReactElement
}) : React.ReactElement {
    return props.children(useRegistry(props.registry));
}

export const TeaAppMainView = (props: {
    variables: IpcVariableDescriptor<AppUiVariables>,
}) => {
    const variables = useMemo(() => createIpcUiVariableConsumer(props.variables), [ props.variables ]);
    useEffect(() => () => variables.destroy(), [ props.variables ]);

    return (
        <div className={cssStyle.app}>
            <ErrorBoundary>
                <EventProvider registry={variables.useReadOnly("controlBar", undefined, undefined)}>
                    {registry => registry ? (
                        <ControlBar2 events={registry} className={cssStyle.controlBar} />
                    ) : null}
                </EventProvider>
            </ErrorBoundary>
            <ErrorBoundary>
                <EventProvider registry={variables.useReadOnly("connectionList", undefined, undefined)}>
                    {registry => registry ? (
                        <ConnectionHandlerList events={registry} />
                    ) : null}
                </EventProvider>
            </ErrorBoundary>

            <div className={cssStyle.mainContainer}>
                <VideoFrame variables={variables} />

                <div className={cssStyle.channelTreeAndSidebar}>
                    <div className={cssStyle.channelTree}>
                        <ErrorBoundary>
                            <EventProvider registry={variables.useReadOnly("hostBanner", undefined, undefined)}>
                                {registry => registry ? (
                                    <HostBanner events={registry} />
                                ) : null}
                            </EventProvider>
                            <ChannelTree variables={variables} />
                        </ErrorBoundary>
                    </div>
                    <ContextDivider id={"channel-chat"} direction={"horizontal"} defaultValue={25} />
                    <SideBar variables={variables} />
                </div>
                <ContextDivider id={"main-log"} direction={"vertical"} defaultValue={75} />
                <ErrorBoundary>
                    <div className={cssStyle.containerLog}>
                        <EventProvider registry={variables.useReadOnly("log", undefined, undefined)}>
                            {registry => registry ? (
                                <ServerLogFrame events={registry} />
                            ) : null}
                        </EventProvider>
                    </div>
                </ErrorBoundary>
            </div>
            <FooterRenderer />

            <ErrorBoundary>
                <ImagePreviewHook />
            </ErrorBoundary>

            <ErrorBoundary>
                <InternalModalHook />
            </ErrorBoundary>

            <ErrorBoundary>
                <TooltipHook />
            </ErrorBoundary>
        </div>
    );
}