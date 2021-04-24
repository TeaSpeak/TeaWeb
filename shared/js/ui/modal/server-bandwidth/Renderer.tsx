import {AbstractModal} from "tc-shared/ui/react-elements/modal/Definitions";
import React, {useContext, useEffect, useRef, useState} from "react";
import {Translatable, VariadicTranslatable} from "tc-shared/ui/react-elements/i18n";
import {IpcRegistryDescription, Registry} from "tc-events";
import {ModalServerBandwidthEvents} from "tc-shared/ui/modal/server-bandwidth/Definitions";
import ImageTop from "./serveredit_3.png";
import {ServerConnectionInfo, ServerConnectionInfoResult} from "tc-shared/tree/ServerDefinitions";
import {joinClassList, useTr} from "tc-shared/ui/react-elements/Helper";
import {network} from "tc-shared/ui/frames/chat";
import binarySizeToString = network.binarySizeToString;
import {Graph} from "tc-shared/ui/elements/NetGraph";
import ResizeObserver from "resize-observer-polyfill";
import {Tooltip} from "tc-shared/ui/react-elements/Tooltip";

const cssStyle = require("./Renderer.scss");
/*
<script class="jsrender-template" id="tmpl_server_info_bandwidth" type="text/html">
    <div> <!-- required for the renderer -->
        <div class="bottom">
            <div class="statistic statistic-bandwidth">
                <a class="title">{{tr "Current bandwidth" /}}</a>
                <div class="body">
                    <div class="container-canvas">
                        <canvas></canvas>
                    </div>
                    <div class="values">
                        <a class="upload" title="{{tr 'Upload bandwidth' /}}">N Bytes/s</a>
                        <a class="download" title="{{tr 'Download bandwidth' /}}">N Bytes/s</a>
                    </div>
                </div>
            </div>
            <div class="statistic statistic-ft-bandwidth">
                <a class="title">{{tr "Current file transfer bandwidth" /}}</a>
                <div class="body">
                    <div class="container-canvas">
                        <canvas></canvas>
                    </div>
                    <div class="values">
                        <a class="upload" title="{{tr 'Upload bandwidth' /}}">N Bytes/s</a>
                        <a class="download" title="{{tr 'Download bandwidth' /}}">N Bytes/s</a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</script>
 */

const EventsContext = React.createContext<Registry<ModalServerBandwidthEvents>>(undefined);
const ConnectionInfoContext = React.createContext<ServerConnectionInfoResult | { status: "loading" }>({ status: "loading" });

const TopContainerStatistic = React.memo((props: {
    children: [ React.ReactNode, (info: ServerConnectionInfo) => React.ReactNode, (info: ServerConnectionInfo) => React.ReactNode ]
}) => (
    <div className={cssStyle.statistic}>
        <div className={cssStyle.title}>
            {props.children[0]}
        </div>
        <div className={cssStyle.values}>
            <div className={cssStyle.value + " " + cssStyle.upload} title={useTr("Upload bandwidth")}>
                <CurrentConnectionInfoVariable>
                    {props.children[1]}
                </CurrentConnectionInfoVariable>
            </div>
            <div className={cssStyle.value + " " + cssStyle.download} title={useTr("Download bandwidth")}>
                <CurrentConnectionInfoVariable>
                    {props.children[2]}
                </CurrentConnectionInfoVariable>
            </div>
        </div>
    </div>
));

const CurrentConnectionInfoProvider = React.memo((props: { children }) => {
    const events = useContext(EventsContext);
    const [ info, setInfo ] = useState<ServerConnectionInfoResult>(undefined);

    events.reactUse("notify_connection_info", event => setInfo(event.info));

    return (
        <ConnectionInfoContext.Provider value={info ? info : { status: "loading" }}>
            {props.children}
        </ConnectionInfoContext.Provider>
    )
});

/* We're caching this so the tooltip can work properly */
const NoPermissionRenderer = React.memo((props: { failedPermission: string }) => (
    <Tooltip
        tooltip={() => (
            <VariadicTranslatable text={"Failed on permission:\n{}"}>
                {props.failedPermission}
            </VariadicTranslatable>
        )}
        spawnHover={true}
        key={"no-permissions"}
    >
        <Translatable>No Permission</Translatable>
    </Tooltip>
));

const CurrentConnectionInfoVariable = React.memo((props: {
    children: (info: ServerConnectionInfo) => React.ReactNode
}) => {
    const info = useContext(ConnectionInfoContext);
    switch (info.status) {
        case "loading":
            return <Translatable key={"loading"}>loading</Translatable>;

        case "error":
            return <React.Fragment key={"error"}>error: {info.message}</React.Fragment>;

        case "no-permission":
            return <NoPermissionRenderer key={"no-permission"} failedPermission={info.failedPermission} />

        case "success":
            return <React.Fragment key={"success"}>{props.children(info.result)}</React.Fragment>;

        default:
            break;
    }
});

const CurrentBandwidthGraph = React.memo((props: {
    upload: keyof ServerConnectionInfo,
    download: keyof ServerConnectionInfo,
    children: React.ReactNode
}) => {
    const events = useContext(EventsContext);
    const graph = useRef(new Graph());
    const refCanvas = useRef<HTMLCanvasElement>();

    const [ customInfo, setCustomInfo ] = useState<[number, number]>(undefined);

    useEffect(() => {
        const graphInstance = graph.current;
        graphInstance.maxGapSize(0);
        graphInstance.initialize();
        graphInstance.initializeCanvas(refCanvas.current);
        graphInstance.resize();

        graphInstance.callbackDetailedInfo = (upload, download) => setCustomInfo([upload, download]);
        graphInstance.callbackDetailedHide = () => setCustomInfo(undefined);

        const resizeObserver = new ResizeObserver(() => graphInstance.resize());
        resizeObserver.observe(refCanvas.current);

        return () => {
            resizeObserver.disconnect();

            graphInstance.callbackDetailedInfo = undefined;
            graphInstance.callbackDetailedHide = undefined;
            graph.current.finalize();
        }
    }, []);

    events.reactUse("notify_connection_info", event => {
        const graphInstance = graph.current;
        if(!graphInstance) {
            /* should never happen */
            return;
        }

        if(graphInstance.entryCount() === 0) {
            graphInstance.pushEntry({
                timestamp: Date.now() - 400,

                download: undefined,
                upload: undefined
            });
        }

        if(event.info.status === "success") {
            graphInstance.pushEntry({
                timestamp: Date.now(),

                download: event.info.result[props.download],
                upload: event.info.result[props.upload],
            });
        } else {
            graphInstance.pushEntry({
                timestamp: Date.now(),

                download: undefined,
                upload: undefined
            });
        }

        /* fade in the new data point within a second */
        graphInstance.timeSpan.origin = Object.assign(graphInstance.calculateTimespan(), { time: Date.now() });
        graphInstance.timeSpan.target = {
            begin: Date.now() - 120 * 1000,
            end: Date.now(),
            time: Date.now() + 200
        };

        graphInstance.cleanup();
    }, undefined, []);

    let uploadValue, downloadValue;
    if(customInfo) {
        if(typeof customInfo[0] === "number") {
            uploadValue = binarySizeToString(customInfo[0]) + "/s";
        } else {
            uploadValue = tr("Unknown");
        }

        if(typeof customInfo[1] === "number") {
            downloadValue = binarySizeToString(customInfo[1]) + "/s";
        } else {
            downloadValue = tr("Unknown");
        }
    } else {
        uploadValue = <CurrentConnectionInfoVariable key={"general"}>{info => binarySizeToString(info[props.upload]) + "/s"}</CurrentConnectionInfoVariable>;
        downloadValue = <CurrentConnectionInfoVariable key={"general"}>{info => binarySizeToString(info[props.download]) + "/s"}</CurrentConnectionInfoVariable>;
    }

    return (
        <div className={cssStyle.statistic}>
            <div className={cssStyle.title}>
                {props.children}
            </div>
            <div className={cssStyle.body}>
                <div className={cssStyle.canvas}>
                    <canvas ref={refCanvas} />
                </div>

                <div className={cssStyle.values} key={"general"}>
                    <div className={cssStyle.upload} title={useTr("Upload bandwidth")}>
                        {uploadValue}
                    </div>
                    <div className={cssStyle.download} title={useTr("Download bandwidth")}>
                        {downloadValue}
                    </div>
                </div>
            </div>
        </div>
    )
});

class Modal extends AbstractModal {
    private readonly events: Registry<ModalServerBandwidthEvents>;

    constructor(events: IpcRegistryDescription<ModalServerBandwidthEvents>) {
        super();

        this.events = Registry.fromIpcDescription(events);
    }

    protected onDestroy() {
        super.onDestroy();

        this.events.destroy();
    }

    renderBody(): React.ReactElement {
        return (
            <EventsContext.Provider value={this.events}>
                <CurrentConnectionInfoProvider>
                    <div className={joinClassList(cssStyle.container, this.properties.windowed && cssStyle.windowed)}>
                        <div className={cssStyle.top}>
                            <div className={cssStyle.image}>
                                <img draggable={false} alt={""} src={ImageTop} />
                            </div>
                            <div className={cssStyle.stats}>
                                <TopContainerStatistic>
                                    <Translatable>Transmitted packets</Translatable>
                                    {info => binarySizeToString(info.connection_packets_sent_total)}
                                    {info => binarySizeToString(info.connection_packets_received_total)}
                                </TopContainerStatistic>
                                <TopContainerStatistic>
                                    <Translatable>Transmitted bytes</Translatable>
                                    {info => binarySizeToString(info.connection_bytes_sent_total)}
                                    {info => binarySizeToString(info.connection_bytes_received_total)}
                                </TopContainerStatistic>
                                <TopContainerStatistic>
                                    <Translatable>Transferred file transfer bytes</Translatable>
                                    {info => binarySizeToString(info.connection_filetransfer_bytes_received_total)}
                                    {info => binarySizeToString(info.connection_filetransfer_bytes_sent_total)}
                                </TopContainerStatistic>
                            </div>
                        </div>
                        <div className={cssStyle.bottom}>
                            <CurrentBandwidthGraph
                                upload={"connection_bandwidth_sent_last_second_total"}
                                download={"connection_bandwidth_received_last_second_total"}
                            >
                                <Translatable>Current Bandwidth</Translatable>
                            </CurrentBandwidthGraph>
                            {/* TODO: connection_filetransfer_bandwidth_* is per minute and not per second */}
                            <CurrentBandwidthGraph
                                upload={"connection_filetransfer_bandwidth_sent"}
                                download={"connection_filetransfer_bandwidth_received"}
                            >
                                <Translatable>Current File Transfer bandwidth</Translatable>
                            </CurrentBandwidthGraph>
                        </div>
                    </div>
                </CurrentConnectionInfoProvider>
            </EventsContext.Provider>
        );
    }

    renderTitle(): string | React.ReactElement {
        return <Translatable>Server bandwidth usage</Translatable>;
    }

}

export default Modal;