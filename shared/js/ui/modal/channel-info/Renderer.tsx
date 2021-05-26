import {AbstractModal} from "tc-shared/ui/react-elements/modal/Definitions";
import React, {useContext} from "react";
import {IpcRegistryDescription, Registry} from "tc-events";
import {ModalChannelInfoEvents, ModalChannelInfoVariables} from "tc-shared/ui/modal/channel-info/Definitions";
import {UiVariableConsumer} from "tc-shared/ui/utils/Variable";
import {createIpcUiVariableConsumer, IpcVariableDescriptor} from "tc-shared/ui/utils/IpcVariable";
import {Translatable, VariadicTranslatable} from "tc-shared/ui/react-elements/i18n";
import {tr} from "tc-shared/i18n/localize";
import {joinClassList, useTr} from "tc-shared/ui/react-elements/Helper";
import {LoadingDots} from "tc-shared/ui/react-elements/LoadingDots";
import {Button} from "tc-shared/ui/react-elements/Button";
import {BBCodeRenderer} from "tc-shared/text/bbcode";
import {ClientIconRenderer} from "tc-shared/ui/react-elements/Icons";
import {ClientIcon} from "svg-sprites/client-icons";
import {copyToClipboard} from "tc-shared/utils/helpers";
const cssStyle = require("./Renderer.scss");

const VariablesContext = React.createContext<UiVariableConsumer<ModalChannelInfoVariables>>(undefined);
const EventContext = React.createContext<Registry<ModalChannelInfoEvents>>(undefined);

const kCodecNames = [
    () => useTr("Speex Narrowband"),
    () => useTr("Speex Wideband"),
    () => useTr("Speex Ultra-Wideband"),
    () => useTr("CELT Mono"),
    () => useTr("Opus Voice"),
    () => useTr("Opus Music")
];

const TitleRenderer = React.memo(() => {
    const title = useContext(VariablesContext).useReadOnly("name");
    if(title.status === "loaded") {
        return (
            <VariadicTranslatable text={"Channel information: {}"} key={"channel"}>
                {title.value}
            </VariadicTranslatable>
        );
    } else {
        return (
            <Translatable key={"general"}>Channel information</Translatable>
        );
    }
});

const TopicRenderer = React.memo(() => {
    const topic = useContext(VariablesContext).useReadOnly("topic");
    if(topic.status !== "loaded" || !topic.value) {
        return null;
    }

    return (
        <div className={cssStyle.row}>
            <div className={cssStyle.column}>
                <div className={cssStyle.title}>
                    <Translatable>Topic</Translatable>
                </div>
                <div className={cssStyle.value}>
                    {topic.value}
                </div>
            </div>
        </div>
    )
});

const DescriptionRenderer = React.memo(() => {
    const description = useContext(VariablesContext).useReadOnly("description");

    let overlay, copyButton;
    let descriptionBody;
    if(description.status === "loaded") {
        switch(description.value.status) {
            case "success":
                const descriptionText = description.value.description;
                descriptionBody = (
                    <BBCodeRenderer
                        message={descriptionText}
                        settings={{ convertSingleUrls: true }}
                        handlerId={description.value.handlerId}
                    />
                );
                copyButton = (
                    <div className={cssStyle.buttonCopy} onClick={() => {
                        copyToClipboard(descriptionText);
                    }}>
                        <ClientIconRenderer icon={ClientIcon.Copy} />
                    </div>
                )
                break;

            case "empty":
                overlay = <Translatable key={"no-description"}>Channel has no description</Translatable>;
                break;

            case "no-permissions":
                overlay = (
                    <VariadicTranslatable key={"no-permissions"} text={"No permissions to view the channel description:\n{}"}>
                        {description.value.failedPermission}
                    </VariadicTranslatable>
                );
                break;

            case "error":
            default:
                overlay = (
                    <VariadicTranslatable key={"error"} text={"Failed to query channel description:\n{}"}>
                        {description.value.status === "error" ? description.value.message : tr("Unknown error")}
                    </VariadicTranslatable>
                );
                break;

        }
    } else {
        overlay = <React.Fragment><Translatable>Loading</Translatable> <LoadingDots /></React.Fragment>;
    }
    return (
        <div className={cssStyle.description}>
            <div className={cssStyle.title}>
                <Translatable>Description</Translatable> {copyButton}
            </div>
            <div className={cssStyle.value} style={{ display: descriptionBody ? undefined : "none" }}>
                {descriptionBody}
            </div>
            <div className={joinClassList(cssStyle.overlay, descriptionBody && cssStyle.hidden)}>
                {overlay}
            </div>
        </div>
    );
});

const kVariablePropertyName: {[T in keyof ModalChannelInfoVariables]?: () => React.ReactElement } = {
    name: () => <Translatable>Channel Name</Translatable>,
    type: () => <Translatable>Channel Type</Translatable>,
    chatMode: () => <Translatable>Chat Mode</Translatable>,
    currentClients: () => <Translatable>Current Clients</Translatable>,
    audioCodec: () => <Translatable>Audio Codec</Translatable>,
    audioEncrypted: () => <Translatable>Audio Encrypted</Translatable>,
    password: () => <Translatable>Password protected</Translatable>,
    topic: () => <Translatable>Topic</Translatable>,
    description: () => <Translatable>Description</Translatable>
};

const PropertyRenderer = <T extends keyof ModalChannelInfoVariables>(props: {
    property: T,
    children: (value: ModalChannelInfoVariables[T]) => React.ReactNode | React.ReactNode[],
    className?: string,
}) => {
    const value = useContext(VariablesContext).useReadOnly(props.property);

    return (
        <div className={cssStyle.column + " " + props.className}>
            <div className={cssStyle.title}>
                {kVariablePropertyName[props.property]()}
            </div>
            <div className={cssStyle.value}>
                {value.status === "loaded" ? props.children(value.value) : undefined}
            </div>
        </div>
    );
};

class Modal extends AbstractModal {
    private readonly events: Registry<ModalChannelInfoEvents>;
    private readonly variables: UiVariableConsumer<ModalChannelInfoVariables>;

    constructor(events: IpcRegistryDescription<ModalChannelInfoEvents>, variables: IpcVariableDescriptor<ModalChannelInfoVariables>) {
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
                    <div className={joinClassList(cssStyle.container, this.properties.windowed && cssStyle.windowed)} draggable={false}>
                        <div className={cssStyle.row}>
                            <PropertyRenderer property={"type"}>
                                {value => {
                                    switch (value) {
                                        case "default":
                                            return <Translatable key={value}>Default Channel</Translatable>;

                                        case "permanent":
                                            return <Translatable key={value}>Permanent</Translatable>;

                                        case "semi-permanent":
                                            return <Translatable key={value}>Semi-Permanent</Translatable>;

                                        case "temporary":
                                            return <Translatable key={value}>Temporary</Translatable>;

                                        case "unknown":
                                        default:
                                            return <Translatable key={value}>Unknown</Translatable>;
                                    }
                                }}
                            </PropertyRenderer>
                            <PropertyRenderer property={"chatMode"}>
                                {value => {
                                    switch (value.mode) {
                                        case "private":
                                            return <Translatable key={"private"}>Private</Translatable>;

                                        case "none":
                                            return <Translatable key={"disabled"}>disabled</Translatable>;

                                        case "public":
                                            if(value.history === -1) {
                                                return <Translatable key={"semi-permanent"}>Semi-Permanent</Translatable>;
                                            } else if(value.history === 0) {
                                                return <Translatable key={"permanent"}>Permanent</Translatable>;
                                            } else {
                                                return (
                                                    <VariadicTranslatable key={"public"} text={"Public; Saving last {} messages"}>
                                                        {value.history}
                                                    </VariadicTranslatable>
                                                );
                                            }
                                        default:
                                            return <Translatable key={"unknown"}>Unknown</Translatable>;
                                    }
                                }}
                            </PropertyRenderer>
                            <PropertyRenderer property={"currentClients"}>
                                {value => {
                                    if(value.status === "subscribed") {
                                        let limit;
                                        if(value.limit === "unlimited") {
                                            limit = <Translatable key={"unlimited"}>Unlimited</Translatable>;
                                        } else if(value.limit === "inherited") {
                                            limit = <Translatable key={"inherited"}>Inherited</Translatable>;
                                        } else {
                                            limit = value.limit.toString();
                                        }

                                        return (
                                            <React.Fragment>
                                                {value.online} / {limit}
                                            </React.Fragment>
                                        );
                                    } else if(value.status === "unsubscribed") {
                                        return <Translatable key={"unsubscribed"}>Not subscribed</Translatable>;
                                    } else {
                                        return <Translatable key={"unknown"}>Unknown</Translatable>;
                                    }
                                }}
                            </PropertyRenderer>
                        </div>
                        <div className={cssStyle.row}>
                            <PropertyRenderer property={"audioCodec"}>
                                {value => (
                                    <React.Fragment>
                                        {kCodecNames[value.codec]() || tr("Unknown")} ({value.quality})
                                    </React.Fragment>
                                )}
                            </PropertyRenderer>
                            <PropertyRenderer property={"audioEncrypted"} className={cssStyle.audioEncrypted}>
                                {value => {
                                    let textValue = value.channel ? "Encrypted" : "Unencrypted";
                                    switch(value.server) {
                                        case "globally-on":
                                            return (
                                                <VariadicTranslatable text={"{}\nOverridden by the server with encrypted!"} key={"global-on"}>
                                                    {textValue}
                                                </VariadicTranslatable>
                                            );

                                        case "globally-off":
                                            return (
                                                <VariadicTranslatable text={"{}\nOverridden by the server with unencrypted!"} key={"global-off"}>
                                                    {textValue}
                                                </VariadicTranslatable>
                                            );

                                        default:
                                            return textValue;
                                    }
                                }}
                            </PropertyRenderer>
                            <PropertyRenderer property={"password"}>
                                {value => value ? (
                                    <Translatable key={"enabled"}>Yes</Translatable>
                                ) : (
                                    <Translatable key={"disabled"}>No</Translatable>
                                )}
                            </PropertyRenderer>
                        </div>
                        <TopicRenderer />
                        <DescriptionRenderer />
                        <div className={cssStyle.buttons}>
                            <Button color={"green"} onClick={() => this.events.fire("action_reload_description")}>
                                <Translatable>Refresh</Translatable>
                            </Button>
                        </div>
                    </div>
                </VariablesContext.Provider>
            </EventContext.Provider>
        );
    }

    renderTitle(): string | React.ReactElement {
        return (
            <VariablesContext.Provider value={this.variables}>
                <TitleRenderer />
            </VariablesContext.Provider>
        );
    }
}

export default Modal;