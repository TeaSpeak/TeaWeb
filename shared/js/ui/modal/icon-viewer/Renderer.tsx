import {AbstractModal} from "tc-shared/ui/react-elements/modal/Definitions";
import React, {useContext, useEffect, useMemo, useRef, useState} from "react";
import {Translatable, VariadicTranslatable} from "tc-shared/ui/react-elements/i18n";
import {IpcRegistryDescription, Registry} from "tc-events";
import {
    IconUploadProgress,
    ModalIconViewerEvents,
    ModalIconViewerVariables,
    RemoteIconList
} from "tc-shared/ui/modal/icon-viewer/Definitions";
import {UiVariableConsumer} from "tc-shared/ui/utils/Variable";
import {createIpcUiVariableConsumer, IpcVariableDescriptor} from "tc-shared/ui/utils/IpcVariable";
import {Tab, TabEntry} from "tc-shared/ui/react-elements/Tab";
import {joinClassList} from "tc-shared/ui/react-elements/Helper";
import {Button} from "tc-shared/ui/react-elements/Button";
import {LoadingDots} from "tc-shared/ui/react-elements/LoadingDots";
import {getIconManager} from "tc-shared/file/Icons";
import {IconEmpty, IconError, IconLoading, IconUrl} from "tc-shared/ui/react-elements/Icon";
import {tra} from "tc-shared/i18n/localize";
import {ClientIconRenderer} from "tc-shared/ui/react-elements/Icons";
import {ClientIcon} from "svg-sprites/client-icons";
import {spawnContextMenu} from "tc-shared/ui/ContextMenu";
import {guid} from "tc-shared/crypto/uid";
import {LogCategory, logError} from "tc-shared/log";
import {ImageType, imageType2MediaType, responseImageType} from "tc-shared/file/ImageCache";
import {Crc32} from "tc-shared/crypto/crc32";
import {downloadUrl, promptFile} from "tc-shared/file/Utils";
import {createErrorModal} from "tc-shared/ui/elements/Modal";
import {Tooltip} from "tc-shared/ui/react-elements/Tooltip";
import {ignorePromise} from "tc-shared/proto";

const cssStyle = require("./Renderer.scss");

const HandlerIdContext = React.createContext<string>(undefined);
const EventContext = React.createContext<Registry<ModalIconViewerEvents>>(undefined);
const VariablesContext = React.createContext<UiVariableConsumer<ModalIconViewerVariables>>(undefined);

const kLocalIconIds = [
    "100",
    "200",
    "300",
    "500",
    "600"
];

const LocalIcon = React.memo((props: { iconId: string, selected: boolean }) => {
    const variables = useContext(VariablesContext);
    const events = useContext(EventContext);

    return (
        <div
            className={joinClassList(cssStyle.iconContainer, props.selected && cssStyle.selected)}
            title={tra("Local icon {}", props.iconId)}
            onClick={() => variables.setVariable("selectedIconId", undefined, props.iconId)}
            onDoubleClick={() => events.fire("action_select", { targetIcon: props.iconId })}
        >
            <div className={joinClassList(cssStyle.circle, cssStyle.hidden)}>
                <ProgressRing progress={74} stroke={25} />
            </div>
            <ClientIconRenderer icon={ClientIcon["Group_" + props.iconId] || ClientIcon.About} className={cssStyle.icon} />
        </div>
    );
});

const LocalIconTab = React.memo(() => {
    const variables = useContext(VariablesContext);
    const selectedIconId = variables.useReadOnly("selectedIconId", undefined, undefined);

    return (
        <div className={cssStyle.tabContent}>
            <div className={cssStyle.body}>
                {kLocalIconIds.map(iconId => (
                    <LocalIcon iconId={iconId} selected={selectedIconId === iconId} key={iconId} />
                ))}
            </div>
            <div className={cssStyle.footer}>
                <div className={cssStyle.text}>
                    <Translatable>
                        Local icons are icons which are defined by your icon pack. <br />
                        Everybody has the same set of local icons which only differ in their appearance.
                    </Translatable>
                </div>
            </div>
        </div>
    );
});

const ProgressRing = React.memo((props: { stroke, progress }) => {
    const radius = 100;
    const { stroke, progress } = props;

    const normalizedRadius = radius - stroke / 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - progress / 100 * circumference;

    return (
        <svg
            viewBox={"0 0 " + (radius * 2) + " " + (radius * 2)}
        >
            <circle
                stroke="white"
                fill="transparent"
                strokeWidth={ stroke }
                strokeDasharray={ circumference + ' ' + circumference }
                style={ { strokeDashoffset } }
                r={ normalizedRadius }
                cx={ radius }
                cy={ radius }
            />
        </svg>
    );
});

const RemoteIconLiveRenderer = React.memo((props: { iconId: string, remoteIconId: number, selected: boolean }) => {
    const variables = useContext(VariablesContext);
    const handlerId = useContext(HandlerIdContext);
    const events = useContext(EventContext);
    const icon = useMemo(() => getIconManager().resolveIcon(props.remoteIconId, undefined, handlerId), [ props.remoteIconId ]);

    const [ , setRevision ] = useState(0);
    icon.events.reactUse("notify_state_changed", () => {
        setRevision(Date.now());
    });

    let iconBody, iconUrl;
    switch (icon.getState()) {
        case "destroyed":
        case "empty":
            iconBody = (
                <IconEmpty key={"empty"} className={cssStyle.icon} />
            );
            break;

        case "loading":
            iconBody = (
                <IconLoading key={"loading"} className={cssStyle.icon} />
            );
            break;

        case "error":
            iconBody = (
                <IconError title={tra("Failed to load icon {}:\n{}", props.remoteIconId, icon.getErrorMessage())} className={cssStyle.icon} key={"error"} />
            );
            break;

        case "loaded":
            iconUrl = icon.getImageUrl();
            iconBody = (
                <IconUrl iconUrl={icon.getImageUrl()} title={tra("Icon {}", props.remoteIconId)} className={cssStyle.icon} key={"loaded"} />
            );
            break;
    }

    return (
        <div
            className={joinClassList(cssStyle.iconContainer, props.selected && cssStyle.selected)}
            title={tra("Remote icon {}", props.remoteIconId)}
            onDoubleClick={() => events.fire("action_select", { targetIcon: props.iconId })}
            onClick={() => variables.setVariable("selectedIconId", undefined, props.iconId)}
            onContextMenu={event => {
                event.preventDefault();
                variables.setVariable("selectedIconId", undefined, props.iconId);
                spawnContextMenu({ pageY: event.pageY, pageX: event.pageX }, [
                    {
                        type: "normal",
                        icon: ClientIcon.Download,
                        label: tr("Download"),
                        click: () => downloadUrl(iconUrl, "icon_" + props.remoteIconId),
                        visible: !!iconUrl
                    },
                    {
                        type: "normal",
                        icon: ClientIcon.Delete,
                        label: tr("Delete"),
                        click: () => events.fire("action_delete", { iconId: props.iconId })
                    }
                ]);
            }}
        >
            {iconBody}
        </div>
    );
});

const UploadingTooltipRenderer = React.memo((props: { process: IconUploadProgress }) => {
    switch (props.process.state) {
        case "failed":
            return (
                <VariadicTranslatable text={"Icon upload failed:\n{}"} key={props.process.state}>
                    {props.process.message}
                </VariadicTranslatable>
            );

        case "transferring":
            return (
                <VariadicTranslatable text={"Uploading icon ({}%)"} key={props.process.state}>
                    {props.process.process * 100}
                </VariadicTranslatable>
            );

        case "pre-process":
            return (
                <Translatable key={props.process.state}>
                    Preprocessing icon for upload
                </Translatable>
            );

        case "pending":
            return (
                <Translatable key={props.process.state}>
                    Icon upload pending and will start soon
                </Translatable>
            );

        case "initializing":
            return (
                <Translatable key={props.process.state}>
                    Icon upload initializing
                </Translatable>
            );

        default:
            return (
                <Translatable key={"unknown"}>
                    Unknown upload state
                </Translatable>
            );
    }
});

const RemoteIconUploadingRenderer = React.memo((props: { iconId: string, selected: boolean, progress: IconUploadProgress }) => {
    const events = useContext(EventContext);
    const variables = useContext(VariablesContext);
    const iconBuffer = variables.useReadOnly("uploadingIconPayload", props.iconId, undefined);

    const iconUrl = useMemo(() => {
        if(!iconBuffer) {
            return undefined;
        }

        const imageType = responseImageType(iconBuffer);
        if(imageType === ImageType.UNKNOWN) {
            return URL.createObjectURL(new Blob([ iconBuffer ]));
        } else {
            const media = imageType2MediaType(imageType);
            return URL.createObjectURL(new Blob([ iconBuffer ], { type: media }));
        }
    }, [ iconBuffer ]);
    useEffect(() => () => URL.revokeObjectURL(iconUrl), [ iconUrl ]);

    let icon;
    if(iconUrl) {
        icon = <IconUrl iconUrl={iconUrl} key={"icon"} className={cssStyle.icon + " " + cssStyle.uploading} />;
    } else if(props.progress.state === "failed") {
        icon = <IconError key={"error"} className={cssStyle.icon} />;
    } else {
        icon = <IconLoading key={"loading"} className={cssStyle.icon + " " + cssStyle.uploading} />;
    }

    let progress: number;
    switch (props.progress.state) {
        default:
        case "failed":
            progress = 100;
            break;

        case "pre-process":
            progress = 10;
            break;

        case "pending":
            progress = 20;
            break;

        case "initializing":
            progress = 30;
            break;

        case "transferring":
            progress = 30 + 70 * props.progress.process;
            break;
    }

    return (
        <Tooltip tooltip={() => <UploadingTooltipRenderer process={props.progress} />}>
            <div
                className={joinClassList(cssStyle.iconContainer, props.selected && cssStyle.selected)}
                onContextMenu={event => {
                    event.preventDefault();
                    if(props.progress.state === "failed") {
                        spawnContextMenu({ pageX: event.pageX, pageY: event.pageY }, [
                            {
                                type: "normal",
                                label: tr("Clear failed icons"),
                                icon: ClientIcon.Delete,
                                click: () => events.fire("action_clear_failed")
                            }
                        ])
                    }
                }}
            >
                <div className={joinClassList(cssStyle.circle, props.progress.state === "failed" && cssStyle.error)}>
                    <ProgressRing progress={progress} stroke={25} />
                </div>
                {icon}
            </div>
        </Tooltip>
    );
})

const RemoteIcon = React.memo((props: { iconId: string, selected: boolean }) => {
    const variables = useContext(VariablesContext);
    const iconInfo = variables.useReadOnly("remoteIconInfo", props.iconId);

    if(iconInfo.status === "loading") {
        return (
            <div
                key={"loading"}
                className={joinClassList(cssStyle.iconContainer, props.selected && cssStyle.selected)}
                title={tr("loading icon")}
            >
                <IconLoading className={cssStyle.icon} />
            </div>
        );
    }

    switch (iconInfo.value.status) {
        case "live":
            return (
                <RemoteIconLiveRenderer key={"remote-icon"} iconId={props.iconId} selected={props.selected} remoteIconId={iconInfo.value.iconId} />
            );

        case "uploading":
            return (
                <RemoteIconUploadingRenderer key={"uploading"} iconId={props.iconId} selected={props.selected} progress={iconInfo.value.process} />
            );

        case "unknown":
        default:
            return null;
    }
});

const RemoteIconListRenderer = React.memo((props: { status: RemoteIconList }) => {
    const variables = useContext(VariablesContext);
    const selectedIconId = variables.useReadOnly("selectedIconId", undefined, undefined);

    switch (props.status.status) {
        case "loading":
            return (
                <div className={cssStyle.overlay} key={props.status.status}>
                    <div className={cssStyle.text}>
                        <Translatable>Loading</Translatable> <LoadingDots />
                    </div>
                </div>
            );

        case "no-permission":
            return (
                <div className={cssStyle.overlay} key={props.status.status}>
                    <div className={joinClassList(cssStyle.text, cssStyle.error)}>
                        <VariadicTranslatable text={"You don't have permissions to view icons:\n{}"}>{props.status.failedPermission}</VariadicTranslatable>
                    </div>
                </div>
            );

        case "loaded":
            return (
                <React.Fragment key={props.status.status}>
                    {props.status.icons.map(iconId => (
                        <RemoteIcon iconId={iconId} selected={selectedIconId === iconId} key={"icon-" + iconId} />
                    ))}
                </React.Fragment>
            );

        case "error":
        default:
            return (
                <div className={cssStyle.overlay} key={props.status.status}>
                    <div className={joinClassList(cssStyle.text, cssStyle.error)}>
                        <VariadicTranslatable text={"An error occurred:\n{}"}>{props.status.status === "error" ? props.status.message : tr("Invalid state")}</VariadicTranslatable>
                    </div>
                </div>
            );
    }
});

async function doExecuteIconUpload(uploadId: string, file: File, events: Registry<ModalIconViewerEvents>) {
    /* TODO: Upload */
    if(file.size > 16 * 1024 * 1024) {
        throw tr("Icon file too large");
    }

    /* Only check the type here if given else we'll check the content type later */
    if(file.type) {
        if(!file.type.startsWith("image/")) {
            throw tra("Icon isn't an image ({})", file.type);
        }
    }

    let buffer: ArrayBuffer;
    try {
        buffer = await file.arrayBuffer();
    } catch (error) {
        logError(LogCategory.GENERAL, tr("Failed to read icon file as array buffer: %o"), error);
        throw tr("Failed to read file");
    }

    const contentType = responseImageType(buffer);
    switch (contentType) {
        case ImageType.BITMAP:
        case ImageType.GIF:
        case ImageType.JPEG:
        case ImageType.PNG:
        case ImageType.SVG:
            break;

        case ImageType.UNKNOWN:
        default:
            throw tr("File content isn't an image");
    }

    let iconId: number;
    {
        const crc = new Crc32();
        crc.update(buffer);
        iconId = parseInt(crc.digest(10)) >>> 0;
    }

    events.fire("action_upload", {
        buffer: buffer,
        iconId: iconId,
        uploadId: uploadId
    });
}

async function executeIconUploads(files: File[], events: Registry<ModalIconViewerEvents>) {
    const uploads = files.map<[string, File]>(file => [ guid(), file ]);
    for(const [ uploadId, ] of uploads) {
        events.fire("action_initialize_upload", { uploadId: uploadId });
    }

    for(const [ uploadId, file ] of uploads) {
        await doExecuteIconUpload(uploadId, file, events).catch(error => {
            let message;
            if(typeof error === "string") {
                message = error;
            } else {
                logError(LogCategory.GENERAL, tr("Failed to run icon upload: %o"), error);
                message = tr("lookup the console");
            }
            events.fire("action_fail_upload", { uploadId: uploadId, message: message });
        });
    }
}

const ButtonDelete = React.memo(() => {
    return (
        <Button color={"red"} className={joinClassList(cssStyle.button, cssStyle.buttonDelete)}>
            <Translatable>Delete</Translatable>
        </Button>
    );
});

const ButtonRefresh = React.memo(() => {
    const events = useContext(EventContext);
    const variables = useContext(VariablesContext);
    const iconIds = variables.useReadOnly("remoteIconList", undefined, { status: "loading" });

    const [ renderTimestamp, setRenderTimestamp ] = useState(Date.now());
    useEffect(() => {
        if(iconIds.status === "loading") {
            return;
        }

        if(renderTimestamp >= iconIds.refreshTimestamp) {
            return;
        }

        const id = setTimeout(() => setRenderTimestamp(Date.now()), iconIds.refreshTimestamp - Date.now());
        return () => clearTimeout(id);
    }, [ iconIds ]);

    return (
        <Button
            color={"blue"}
            className={joinClassList(cssStyle.button, cssStyle.buttonRefresh)}
            disabled={iconIds.status === "loading" ? true : renderTimestamp < iconIds.refreshTimestamp}
            onClick={() => events.fire("action_refresh")}
        >
            <Translatable>Refresh</Translatable>
        </Button>
    );
});

const RemoteIconTab = React.memo(() => {
    const events = useContext(EventContext);
    const variables = useContext(VariablesContext);
    const iconIds = variables.useReadOnly("remoteIconList", undefined, { status: "loading" });
    const [ dragOverCount, setDragOverCount ] = useState(0);
    const dragOverTimeout = useRef(0);

    return (
        <div className={cssStyle.tabContent}>
            <div
                className={cssStyle.body}
                onDragOver={event => {
                    clearTimeout(dragOverTimeout.current);
                    dragOverTimeout.current = 0;

                    const files = [...event.dataTransfer.items].filter(item => item.kind === "file");
                    if(files.length === 0) {
                        /* No files */
                        return;
                    }

                    /* Allow drop */
                    event.preventDefault();
                    setDragOverCount(files.length);
                }}
                onDragLeave={() => {
                    if(dragOverTimeout.current) {
                        clearTimeout(dragOverTimeout.current);
                        return;
                    }

                    dragOverTimeout.current = setTimeout(() => setDragOverCount(0), 250);
                }}
                onDrop={event => {
                    event.preventDefault();

                    clearTimeout(dragOverTimeout.current);
                    dragOverTimeout.current = 0;

                    setDragOverCount(0);

                    const files = [...event.dataTransfer.items]
                        .filter(item => item.kind === "file")
                        .map(file => file.getAsFile())
                        .filter(file => !!file);

                    if(files.length === 0) {
                        /* No files */
                        return;
                    }

                    ignorePromise(executeIconUploads(files, events));
                }}
            >
                <RemoteIconListRenderer status={iconIds} key={"icons"} />
                <div className={joinClassList(cssStyle.overlay, !dragOverCount && cssStyle.hidden)} key={"drag-overlay"}>
                    <div className={joinClassList(cssStyle.text)}>
                        <VariadicTranslatable text={"Drop {} icons to upload them"}>{dragOverCount}</VariadicTranslatable>
                    </div>
                </div>
            </div>
            <div className={cssStyle.footer}>
                <Button
                    color={"green"}
                    className={joinClassList(cssStyle.button, cssStyle.buttonUpload)}
                    onClick={() => {
                        promptFile({ multiple: true }).then(files => {
                            ignorePromise(executeIconUploads(files, events));
                        });
                    }}
                >
                    <Translatable>Upload</Translatable>
                </Button>
                <ButtonDelete />
                <ButtonRefresh />
            </div>
        </div>
    );
});

const IconTabs = React.memo(() => {
    const variables = useContext(VariablesContext);
    const selectedTab = variables.useVariable("selectedTab", undefined, "remote");

    return (
        <Tab
            selectedTab={selectedTab.localValue}
            onChange={newTab => selectedTab.setValue(newTab as any)}
            className={cssStyle.tab}
            bodyClassName={cssStyle.tabBody}
        >
            <TabEntry id={"remote"}>
                <Translatable>Remote</Translatable>
                <RemoteIconTab />
            </TabEntry>
            <TabEntry id={"local"}>
                <Translatable>Local</Translatable>
                <LocalIconTab />
            </TabEntry>
        </Tab>
    );
});

const SelectButtons = React.memo(() => {
    const events = useContext(EventContext);
    const variables = useContext(VariablesContext);
    const selectedIcon = variables.useReadOnly("selectedIconId", undefined, undefined);

    return (
        <div className={cssStyle.selectButtons}>
            <Button color={"red"} onClick={() => events.fire("action_select", { targetIcon: undefined })}>
                <Translatable>Remove Icon</Translatable>
            </Button>
            <Button color={"green"} disabled={!selectedIcon} onClick={() => events.fire("action_select", { targetIcon: selectedIcon })}>
                <Translatable>Select Icon</Translatable>
            </Button>
        </div>
    );
});

class Modal extends AbstractModal {
    private readonly handlerId: string;
    private readonly events: Registry<ModalIconViewerEvents>;
    private readonly variables: UiVariableConsumer<ModalIconViewerVariables>;
    private readonly isIconSelect: boolean;

    constructor(handlerId: string, events: IpcRegistryDescription<ModalIconViewerEvents>, variables: IpcVariableDescriptor<ModalIconViewerVariables>, isIconSelect: boolean) {
        super();

        this.handlerId = handlerId;
        this.events = Registry.fromIpcDescription(events);
        this.variables = createIpcUiVariableConsumer(variables);
        this.isIconSelect = isIconSelect;

        this.events.on("notify_delete_error", event => {
            switch (event.status) {
                case "no-permissions":
                    createErrorModal(tr("Failed to delete icon"), tra("Failed to delete icon (No permissions):\n{}", event.failedPermission)).open();
                    break;

                case "not-found":
                    createErrorModal(tr("Failed to delete icon"), tra("Failed to delete icon (Icon not found)")).open();
                    break;

                case "error":
                default:
                    createErrorModal(tr("Failed to delete icon"), tra("Failed to delete icon:\n{}", event.message || tr("Unknown/invalid error status"))).open();
                    break;
            }
        });
    }

    protected onDestroy() {
        super.onDestroy();

        this.events.destroy();
        this.variables.destroy();
    }

    renderBody(): React.ReactElement {
        return (
            <HandlerIdContext.Provider value={this.handlerId}>
                <EventContext.Provider value={this.events}>
                    <VariablesContext.Provider value={this.variables}>
                        <div className={joinClassList(cssStyle.container, this.properties.windowed && cssStyle.windowed)}>
                            <IconTabs />
                            {this.isIconSelect ? (
                                <SelectButtons key={"select-buttons"} />
                            ) : undefined}
                        </div>
                    </VariablesContext.Provider>
                </EventContext.Provider>
            </HandlerIdContext.Provider>
        );
    }

    renderTitle(): React.ReactNode {
        return (
            <Translatable>Icon manager</Translatable>
        );
    }
}

export default Modal;