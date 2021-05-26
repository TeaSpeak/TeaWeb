import {AbstractModal} from "tc-shared/ui/react-elements/modal/Definitions";
import React, {useContext, useEffect, useRef, useState} from "react";
import {IpcRegistryDescription, Registry} from "tc-events";
import {ModalServerInfoEvents, ModalServerInfoVariables} from "tc-shared/ui/modal/server-info/Definitions";
import {UiVariableConsumer} from "tc-shared/ui/utils/Variable";
import {createIpcUiVariableConsumer, IpcVariableDescriptor} from "tc-shared/ui/utils/IpcVariable";
import {HostBannerRenderer} from "tc-shared/ui/frames/HostBannerRenderer";

import ImageServerEdit1 from "./serveredit_1.png";
import ImageServerEdit2 from "./serveredit_2.png";
import ImageServerEdit3 from "./serveredit_3.png";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {joinClassList} from "tc-shared/ui/react-elements/Helper";
import {CountryCode} from "tc-shared/ui/react-elements/CountryCode";
import moment from "moment";
import {tr} from "tc-shared/i18n/localize";
import {format_online_time} from "tc-shared/utils/TimeUtils";
import {IconTooltip} from "tc-shared/ui/react-elements/Tooltip";
import {Button} from "tc-shared/ui/react-elements/Button";
import {ServerConnectionInfo} from "tc-shared/tree/ServerDefinitions";

const cssStyle = require("./Renderer.scss");

const EventContext = React.createContext<Registry<ModalServerInfoEvents>>(undefined);
const VariablesContext = React.createContext<UiVariableConsumer<ModalServerInfoVariables>>(undefined);

const Group = React.memo((props: {
    children: React.ReactElement[],
    reverse: boolean
}) => (
    <div className={joinClassList(cssStyle.group, props.reverse && cssStyle.reverse)}>
        <div className={cssStyle.image}>
            {props.children[0]}
        </div>
        <div className={cssStyle.properties}>
            {...props.children.slice(1)}
        </div>
    </div>
));

const HostBanner = React.memo(() => {
    const variables = useContext(VariablesContext);
    const hostBanner = variables.useReadOnly("hostBanner", undefined, { status: "none" });

    if(hostBanner.status === "none") {
        return null;
    } else {
        return (
            <div className={cssStyle.containerHostBanner}>
                <HostBannerRenderer banner={hostBanner} className={cssStyle.hostBanner} clickable={false} />
            </div>
        );
    }
});

const TitleRenderer = React.memo(() => {
    return <>Server Info</>;
});

const VariablePropertyName: {[T in keyof ModalServerInfoVariables]?: () => React.ReactElement } = {
    name: () => <Translatable>Server name</Translatable>,
    region: () => <Translatable>Server region</Translatable>,
    slots: () => <Translatable>Slots</Translatable>,
    firstRun: () => <Translatable>First run</Translatable>,
    uptime: () => <Translatable>Uptime</Translatable>,
    ipAddress: () => <Translatable>Ip Address</Translatable>,
    version: () => <Translatable>Version</Translatable>,
    platform: () => <Translatable>Platform</Translatable>,
    uniqueId: () => <Translatable>Global unique id</Translatable>,
    channelCount: () => <Translatable>Current channels</Translatable>,
    voiceDataEncryption: () => <Translatable>Voice data encryption</Translatable>,
    securityLevel: () => <Translatable>Minimal security level</Translatable>,
    complainsUntilBan: () => <Translatable>Complains until ban</Translatable>
};

const VariableProperty = <T extends keyof ModalServerInfoVariables>(props: {
    property: T,
    children?: (value: ModalServerInfoVariables[T]) => React.ReactNode
}) => {
    const variables = useContext(VariablesContext);
    const value = variables.useReadOnly(props.property, undefined, undefined);

    return (
        <div className={cssStyle.row}>
            <div className={cssStyle.key}>
                {(VariablePropertyName[props.property] || (() => props.property))()}
            </div>
            <div className={cssStyle.value}>
                {(props.children || ((value) => value))(value)}
            </div>
        </div>
    )
};

const ConnectionProperty = React.memo((props: { children: [
    React.ReactNode,
    (value: ServerConnectionInfo ) => React.ReactNode
] }) => {
    const variables = useContext(VariablesContext);
    const value = variables.useReadOnly("connectionInfo", undefined, { status: "loading" });

    let body;
    switch (value.status) {
        case "loading":
            body = <Translatable key={"loading"}>loading</Translatable>;
            break;

        case "error":
            body = <React.Fragment key={"error"}>error: {value.message}</React.Fragment>;
            break;

        case "no-permission":
            body = <Translatable key={"no-permission"}>No Permission</Translatable>;
            break;

        case "success":
            body = <React.Fragment key={"success"}>{props.children[1](value.result)}</React.Fragment>;
            break;

        default:
            break;
    }

    return (
        <div className={cssStyle.row}>
            <div className={cssStyle.key}>
                {props.children[0]}
            </div>
            <div className={cssStyle.value}>
                {body}
            </div>
        </div>
    )
});

const ServerFirstRun = React.memo(() => (
    <VariableProperty property={"firstRun"}>
        {value => (
            value > 0 ? moment(value * 1000).format('MMMM Do YYYY, h:mm:ss a') :
            tr("Unknown")
        )}
    </VariableProperty>
));

const ServerSlots = React.memo(() => (
    <VariableProperty property={"slots"}>
        {value => {
            if(!value) {
                return "--";
            }

            let text = value.used + "/" + value.max;
            if(value.reserved > 0) {
                text += " (" + value.reserved + " " + tr("Reserved") + ")";
            }
            if(value.queries > 1) {
                text += " +" + value.queries + " " + tr("Queries");
            } else if(value.queries === 1) {
                text += " " + tr("+1 Query");
            }
            return text;
        }}
    </VariableProperty>
));

const OnlineTimestampRenderer = React.memo((props: { timestamp: number }) => {
    const initialRenderTimestamp = useRef(Date.now());
    const [ , setRenderedTimestamp ] = useState(0);

    const difference = props.timestamp + Math.ceil((Date.now() - initialRenderTimestamp.current) / 1000);
    useEffect(() => {
        const interval = setInterval(() => {
            setRenderedTimestamp(Date.now());
        }, 900);
        return () => clearInterval(interval);
    }, []);

    return <>{format_online_time(difference)}</>;
});

const kVersionsRegex = /(.*)\[Build: ([0-9]+)]/;
const VersionsTimestamp = (props: { timestamp: string }) => {
    if(!props.timestamp) {
        return null;
    }

    const match = props.timestamp.match(kVersionsRegex);
    if(!match || !match[2]) {
        return <React.Fragment key={"unknown"}>{props.timestamp}</React.Fragment>;
    }

    return (
        <div className={cssStyle.version} key={"parsed"}>
            <IconTooltip className={cssStyle.tooltip}>
                {"Build timestamp: " + moment(parseInt(match[2]) * 1000).format("YYYY-MM-DD HH:mm Z")}
            </IconTooltip>
            {match[1].trim()}
        </div>
    );
};

const ButtonRefresh = React.memo(() => {
    const variables = useContext(VariablesContext);
    const events = useContext(EventContext);

    const nextRefresh = variables.useReadOnly("refreshAllowed");
    const [ renderTimestamp, setRenderTimestamp ] = useState(Date.now());

    const allowed = nextRefresh.status === "loaded" && renderTimestamp >= nextRefresh.value;

    useEffect(() => {
        if(nextRefresh.status !== "loaded" || allowed) {
            return;
        }

        const time = nextRefresh.value - Date.now();
        const timeout = setTimeout(() => setRenderTimestamp(Date.now()), time);
        return () => clearTimeout(timeout);
    }, [ nextRefresh.value ]);

    return (
        <Button color={"green"} onClick={() => events.fire("action_refresh")} disabled={!allowed}>
            <Translatable>Refresh</Translatable>
        </Button>
    );
});

const Buttons = React.memo(() => {
    const events = useContext(EventContext);
    return (
        <div className={cssStyle.buttons}>
            <ButtonRefresh />

            <Button color={"red"} onClick={() => events.fire("action_close")}>
                <Translatable>Close</Translatable>
            </Button>
        </div>
    )
})

class Modal extends AbstractModal {
    private readonly events: Registry<ModalServerInfoEvents>;
    private readonly variables: UiVariableConsumer<ModalServerInfoVariables>;

    constructor(events: IpcRegistryDescription<ModalServerInfoEvents>, variables: IpcVariableDescriptor<ModalServerInfoVariables>) {
        super();

        this.events = Registry.fromIpcDescription(events);
        this.variables = createIpcUiVariableConsumer(variables);
    }

    protected onDestroy() {
        super.onDestroy();

        this.events.destroy();
        this.variables.destroy();
    }

    renderBody(): React.ReactElement {
        return (
            <EventContext.Provider value={this.events}>
                <VariablesContext.Provider value={this.variables}>
                    <div className={joinClassList(cssStyle.container, this.properties.windowed && cssStyle.windowed)}>
                        <HostBanner />
                        <div className={cssStyle.properties}>
                            <Group reverse={false}>
                                <img draggable={false} src={ImageServerEdit1} alt={""} />
                                <VariableProperty property={"name"} />
                                <VariableProperty property={"region"}>
                                    {value => <CountryCode alphaCode={value} />}
                                </VariableProperty>
                                <ServerSlots />
                                <ServerFirstRun />

                                <VariableProperty property={"uptime"}>
                                    {value => <OnlineTimestampRenderer timestamp={value} />}
                                </VariableProperty>
                            </Group>
                            <Group reverse={true}>
                                <img draggable={false} src={ImageServerEdit2} alt={""} />
                                <VariableProperty property={"ipAddress"} />
                                <VariableProperty property={"version"}>
                                    {value => <VersionsTimestamp timestamp={value} />}
                                </VariableProperty>
                                <VariableProperty property={"platform"} />
                                <div className={cssStyle.network}>
                                    <div className={cssStyle.button}>
                                        <Button color={"purple"} onClick={() => this.events.fire("action_show_bandwidth")}>
                                            <Translatable>Show Bandwidth</Translatable>
                                        </Button>
                                    </div>
                                    <div className={cssStyle.right}>
                                        <ConnectionProperty>
                                            <Translatable>Average ping</Translatable>
                                            {value => value.connection_ping.toFixed(2) + " ms"}
                                        </ConnectionProperty>
                                        <ConnectionProperty>
                                            <Translatable>Average packet loss</Translatable>
                                            {value => value.connection_packetloss_total.toFixed(2) + " %"}
                                        </ConnectionProperty>
                                    </div>
                                </div>
                            </Group>
                            <Group reverse={false}>
                                <img draggable={false} src={ImageServerEdit3} alt={""} />
                                <VariableProperty property={"uniqueId"} />
                                <VariableProperty property={"channelCount"} />
                                <VariableProperty property={"voiceDataEncryption"}>
                                    {value => {
                                        switch(value) {
                                            case "global-off":
                                                return <Translatable key={value}>Globally off</Translatable>;

                                            case "global-on":
                                                return <Translatable key={value}>Globally on</Translatable>;

                                            case "channel-individual":
                                                return <Translatable key={value}>Individually configured per channel</Translatable>;

                                            case "unknown":
                                            default:
                                                return <Translatable key={value}>Unknown</Translatable>;
                                        }
                                    }}
                                </VariableProperty>
                                <VariableProperty property={"securityLevel"} />
                                <VariableProperty property={"complainsUntilBan"} />
                            </Group>
                        </div>
                        <Buttons />
                    </div>
                </VariablesContext.Provider>
            </EventContext.Provider>
        );
    }

    renderTitle(): string | React.ReactElement {
        return <TitleRenderer />;
    }
}

export default Modal;