import {AbstractModal} from "tc-shared/ui/react-elements/modal/Definitions";
import React, {useContext} from "react";
import {Translatable, VariadicTranslatable} from "tc-shared/ui/react-elements/i18n";
import {IpcRegistryDescription, Registry} from "tc-events";
import {ModalVideoViewersEvents, ModalVideoViewersVariables} from "tc-shared/ui/modal/video-viewers/Definitions";
import {UiVariableConsumer} from "tc-shared/ui/utils/Variable";
import {createIpcUiVariableConsumer, IpcVariableDescriptor} from "tc-shared/ui/utils/IpcVariable";
import {joinClassList} from "tc-shared/ui/react-elements/Helper";
import {ClientTag} from "tc-shared/ui/tree/EntryTags";
import {ClientIconRenderer} from "tc-shared/ui/react-elements/Icons";
import {ClientIcon} from "svg-sprites/client-icons";
import {LoadingDots} from "tc-shared/ui/react-elements/LoadingDots";

const cssStyle = require("./Renderer.scss");

const EventContext = React.createContext<Registry<ModalVideoViewersEvents>>(undefined);
const VariablesContext = React.createContext<UiVariableConsumer<ModalVideoViewersVariables>>(undefined);

const ViewerRenderer = React.memo((props: { clientId: number, screen: boolean, camera: boolean }) => {
    const variables = useContext(VariablesContext);
    const clientInfo = variables.useReadOnly("viewerInfo", props.clientId, undefined);

    let clientName, clientIcon;
    if(clientInfo) {
        clientName = (
            <ClientTag
                key={"name-loaded"}
                clientName={clientInfo.clientName}
                clientUniqueId={clientInfo.clientUniqueId}
                handlerId={clientInfo.handlerId}
                className={cssStyle.name}
            />
        );

        clientIcon = clientInfo.clientStatus || ClientIcon.PlayerOff;
    } else {
        clientName = (
            <React.Fragment key={"name-loading"}>
                <Translatable>loading</Translatable> <LoadingDots />
            </React.Fragment>
        )

        clientIcon = ClientIcon.PlayerOff;
    }

    let videoStatus = [];
    if(props.camera) {
        videoStatus.push(
            <ClientIconRenderer
                icon={ClientIcon.VideoMuted}
                className={cssStyle.subscribeIcon}
                title={tr("Client is viewing your camera stream")}
                key={"camera"}
            />
        );
    }

    if(props.screen) {
        videoStatus.push(
            <ClientIconRenderer
                icon={ClientIcon.ShareScreen}
                className={cssStyle.subscribeIcon}
                title={tr("Client is viewing your screen stream")}
                key={"screen"}
            />
        );
    }

    return (
        <div className={cssStyle.viewerEntry}>
            <ClientIconRenderer icon={clientIcon} className={cssStyle.statusIcon} />
            <div className={cssStyle.nameContainer}>
                {clientName}
            </div>
            <div className={cssStyle.videoStatus}>
                {videoStatus}
            </div>
        </div>
    )
});

const ViewerList = React.memo(() => {
    const variables = useContext(VariablesContext);
    const viewers = variables.useReadOnly("videoViewers", undefined, { __internal_client_order: [ ] });

    let body;
    if(typeof viewers.screen === "undefined" && typeof viewers.camera === "undefined") {
        body = (
            <div className={cssStyle.overlay} key={"not-sharing"}>
                <div className={cssStyle.text}>
                    <Translatable>You're not sharing any video</Translatable>
                </div>
            </div>
        );
    } else if(viewers.__internal_client_order.length) {
        body = viewers.__internal_client_order.map(clientId => (
            <ViewerRenderer
                screen={viewers.screen?.indexOf(clientId) >= 0}
                camera={viewers.camera?.indexOf(clientId) >= 0}
                clientId={clientId}
                key={"viewer-" + clientId}
            />
        ));
    } else {
        body = (
            <div className={cssStyle.overlay} key={"nobody-watching"}>
                <div className={cssStyle.text}>
                    <Translatable>Nobody is watching your video feed :(</Translatable>
                </div>
            </div>
        );
    }
    return (
        <div className={cssStyle.viewerList}>
            {body}
        </div>
    )
});

const ViewerCount = React.memo((props: { viewer: number[] | undefined }) => {
    if(!Array.isArray(props.viewer)) {
        return (
            <Translatable key={"not-enabled"}>Not Enabled</Translatable>
        );
    }

    if(props.viewer.length === 1) {
        return (
            <Translatable key={"one"}>1 Viewer</Translatable>
        );
    }

    return (
        <VariadicTranslatable text={"{} Viewers"} key={"multi"}>
            {props.viewer.length}
        </VariadicTranslatable>
    );
});

const ViewerSummary = React.memo(() => {
    const variables = useContext(VariablesContext);
    const viewers = variables.useReadOnly("videoViewers", undefined, { __internal_client_order: [ ] });

    return (
        <div className={cssStyle.viewerSummary}>
            <div className={cssStyle.left}>
                <Translatable>Video viewers</Translatable>
            </div>
            <div className={cssStyle.right}>
                <div className={cssStyle.entry}>
                    <ViewerCount viewer={viewers?.camera} /> <ClientIconRenderer icon={ClientIcon.VideoMuted} className={cssStyle.icon} />
                </div>

                <div className={cssStyle.entry}>
                    <ViewerCount viewer={viewers?.screen} /> <ClientIconRenderer icon={ClientIcon.ShareScreen} className={cssStyle.icon} />
                </div>
            </div>
        </div>
    );
})

class Modal extends AbstractModal {
    private readonly events: Registry<ModalVideoViewersEvents>;
    private readonly variables: UiVariableConsumer<ModalVideoViewersVariables>;

    constructor(events: IpcRegistryDescription<ModalVideoViewersEvents>, variables: IpcVariableDescriptor<ModalVideoViewersVariables>) {
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
            <VariablesContext.Provider value={this.variables}>
                <EventContext.Provider value={this.events}>
                    <div className={joinClassList(cssStyle.container, this.properties.windowed && cssStyle.windowed)}>
                        <ViewerSummary />
                        <ViewerList />
                    </div>
                </EventContext.Provider>
            </VariablesContext.Provider>
        );
    }

    renderTitle(): string | React.ReactElement {
        return (
            <Translatable>Video Viewers</Translatable>
        );
    }
}

export default Modal;