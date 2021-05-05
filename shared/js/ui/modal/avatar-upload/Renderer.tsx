import {AbstractModal} from "tc-shared/ui/react-elements/modal/Definitions";
import React, {useContext} from "react";
import {Translatable, VariadicTranslatable} from "tc-shared/ui/react-elements/i18n";
import {IpcRegistryDescription, Registry} from "tc-events";
import {
    CurrentAvatarState,
    ModalAvatarUploadEvents,
    ModalAvatarUploadVariables
} from "tc-shared/ui/modal/avatar-upload/Definitions";
import {UiVariableConsumer} from "tc-shared/ui/utils/Variable";
import {createIpcUiVariableConsumer, IpcVariableDescriptor} from "tc-shared/ui/utils/IpcVariable";
import {Button} from "tc-shared/ui/react-elements/Button";
import {promptFile} from "tc-shared/file/Utils";
import {network} from "tc-shared/ui/frames/chat";
import {LoadingDots} from "tc-shared/ui/react-elements/LoadingDots";
import {getOwnAvatarStorage} from "tc-shared/file/OwnAvatarStorage";
import {createErrorModal} from "tc-shared/ui/elements/Modal";
import {joinClassList, useDependentState} from "tc-shared/ui/react-elements/Helper";

import kDefaultAvatarUrl from "../../../../img/style/avatar.png";
import byteSizeToString = network.binarySizeToString;
import {tra} from "tc-shared/i18n/localize";

const ServerUniqueIdContext = React.createContext<string>(undefined);
const EventContext = React.createContext<Registry<ModalAvatarUploadEvents>>(undefined);
const VariablesContext = React.createContext<UiVariableConsumer<ModalAvatarUploadVariables>>(undefined);
const CurrentAvatarContext = React.createContext<CurrentAvatarState>(undefined);

const cssStyle = require("./Renderer.scss");

const AvatarFileName = React.memo(() => {
    const currentAvatar = useContext(CurrentAvatarContext);
    switch (currentAvatar.status) {
        case "loading":
            return (
                <div className={cssStyle.name} key={"loading"}>
                    <Translatable>Loading avatar</Translatable>
                </div>
            );

        case "server":
        case "unset":
            return (
                <div className={cssStyle.name} key={"unset"}>
                    <Translatable>No avatar selected</Translatable>
                </div>
            );

        case "available":
        case "exceeds-max-size":
            return (
                <div className={cssStyle.name} key={"available"}>
                    {currentAvatar.fileName}
                </div>
            );

        default:
            throw "invalid avatar state";
    }
});

const SizeLimitRenderer = React.memo((props: { byteSize: number }) => {
    if(props.byteSize === -1) {
        return <Translatable key={"unlimited"}>unlimited</Translatable>;
    } else {
        return <React.Fragment key={"limited"}>{byteSizeToString(props.byteSize)}</React.Fragment>;
    }
});

const MaxAvatarSize = React.memo(() => {
    const variables = useContext(VariablesContext);
    const currentAvatar = useContext(CurrentAvatarContext);
    const maxSize = variables.useReadOnly("maxAvatarSize", undefined);

    if(maxSize.status === "loading") {
        return (
            <div className={cssStyle.containerLimit} key={"loading"}>
                <Translatable>Maximal avatar size:</Translatable> <Translatable>loading</Translatable> <LoadingDots />
            </div>
        )
    } else if(currentAvatar.status === "loading" ||currentAvatar.status === "unset" || currentAvatar.status === "server") {
        return (
            <div className={cssStyle.containerLimit} key={"unset"}>
                <VariadicTranslatable text={"Maximal avatar size: {}"}>
                    <SizeLimitRenderer byteSize={maxSize.value} />
                </VariadicTranslatable>
            </div>
        );
    } else if(currentAvatar.status === "available") {
        return (
            <div className={cssStyle.containerLimit} key={"size-ok"}>
                <VariadicTranslatable text={"Avatar size: {} / {}"}>
                    {byteSizeToString(currentAvatar.fileSize)}
                    <SizeLimitRenderer byteSize={maxSize.value} />
                </VariadicTranslatable>
            </div>
        );
    } else if(currentAvatar.status === "exceeds-max-size") {
        return (
            <div className={cssStyle.containerLimit + " " + cssStyle.error} key={"unset"}>
                <VariadicTranslatable text={"Avatar {} exceeds allowed size of {}"}>
                    {byteSizeToString(currentAvatar.fileSize)}
                    {maxSize.value === -1 ? <Translatable key={"unlimited"}>unlimited</Translatable> : byteSizeToString(maxSize.value)}
                </VariadicTranslatable>
            </div>
        );
    } else {
        throw "invalid avatar state";
    }
})

const AvatarSelect = React.memo(() => {
    const currentAvatar = useContext(CurrentAvatarContext);
    const events = useContext(EventContext);

    return (
        <div className={cssStyle.containerSelect}>
            <div className={cssStyle.containerFile}>
                <Button
                    onClick={() => events.fire("action_open_select")}
                    className={cssStyle.button}
                    disabled={currentAvatar.status === "loading"}
                >
                    <Translatable>Select avatar</Translatable>
                </Button>
                <AvatarFileName />
            </div>
            <MaxAvatarSize />
        </div>
    )
});

const AvatarPreview = React.memo((props: { size: "client-info" | "chat" }) => {
    const currentAvatar = useContext(CurrentAvatarContext);

    let sizeClass;
    let name;
    switch (props.size) {
        case "client-info":
            sizeClass = cssStyle.sizeChatInfo;
            name = <Translatable key={"client-info"}>Client info</Translatable>;
            break;

        case "chat":
            sizeClass = cssStyle.sizeChat;
            name = <Translatable key={"chat-avatar"}>Chat Avatar</Translatable>;
            break;
    }

    let imageUrl;
    if(currentAvatar.status === "available" || currentAvatar.status === "exceeds-max-size") {
        imageUrl = currentAvatar.resourceUrl;
    } else if(currentAvatar.status === "server") {
        imageUrl = currentAvatar.resourceUrl;
    } else {
        imageUrl = kDefaultAvatarUrl;
    }

    const [ boundClass, setBoundClass ] = useDependentState(() => undefined, [ imageUrl ]);

    return (
        <div className={cssStyle.preview}>
            <div className={cssStyle.imageContainer + " " + sizeClass}>
                <img
                    className={joinClassList(cssStyle.image, boundClass)}
                    src={imageUrl}
                    alt={""}
                    onLoad={event => {
                        const imageElement = event.currentTarget;
                        if(imageElement.naturalHeight > imageElement.naturalWidth) {
                            setBoundClass(cssStyle.heightBound);
                        } else {
                            setBoundClass(cssStyle.widthBound);
                        }
                    }}
                />
            </div>
            <div className={cssStyle.name}>
                {name}
            </div>
        </div>
    )
});

const PreviewTitle = React.memo(() => {
    const currentAvatar = useContext(CurrentAvatarContext);
    if(currentAvatar.status === "server") {
        return <Translatable key={"server"}>Current Avatar</Translatable>;
    } else {
        return <Translatable key={"general"}>Preview</Translatable>;
    }
});

const AvatarPreviewContainer = React.memo(() => (
    <div className={cssStyle.containerPreview}>
        <div className={cssStyle.title}><PreviewTitle /></div>
        <div className={cssStyle.previews}>
            <AvatarPreview size={"client-info"} />
            <AvatarPreview size={"chat"} />
        </div>
    </div>
));

const Buttons = React.memo(() => {
    const events = useContext(EventContext);
    const currentAvatar = useContext(CurrentAvatarContext);

    let enableReset, enableUpload;
    switch (currentAvatar.status) {
        case "exceeds-max-size":
            enableReset = currentAvatar.serverHasAvatar;
            enableUpload = false;
            break;

        case "loading":
        case "unset":
            enableReset = false;
            enableUpload = false;
            break;

        case "available":
            enableReset = true;
            enableUpload = true;
            break;

        case "server":
            enableReset = true;
            enableUpload = false;
            break;
    }

    return (
        <div className={cssStyle.buttons}>
            <Button
                color={"red"}
                onClick={event => events.fire("action_avatar_delete", { closeWindow: !event.shiftKey })}
                disabled={!enableReset}
            >
                <Translatable>Delete Avatar</Translatable>
            </Button>
            <Button
                color={"green"}
                onClick={event => events.fire("action_avatar_upload", { closeWindow: !event.shiftKey })}
                disabled={!enableUpload}
            >
                <Translatable>Update avatar</Translatable>
            </Button>
        </div>
    )
});

const CurrentAvatarProvider = React.memo((props: { children }) => {
    const variables = useContext(VariablesContext);
    const avatar = variables.useReadOnly("currentAvatar", undefined, { status: "loading" });
    return (
        <CurrentAvatarContext.Provider value={avatar}>
            {props.children}
        </CurrentAvatarContext.Provider>
    );
});

class ModalAvatarUpload extends AbstractModal {
    private readonly serverUniqueId: string;
    private readonly events: Registry<ModalAvatarUploadEvents>;
    private readonly variables: UiVariableConsumer<ModalAvatarUploadVariables>;

    constructor(events: IpcRegistryDescription<ModalAvatarUploadEvents>, variables: IpcVariableDescriptor<ModalAvatarUploadVariables>, serverUniqueId: string) {
        super();

        this.serverUniqueId = serverUniqueId;
        this.events = Registry.fromIpcDescription(events);
        this.variables = createIpcUiVariableConsumer(variables);

        this.events.on("notify_avatar_load_error", event => {
            createErrorModal(tr("Failed to load avatar"), event.error).open();
        });

        this.events.on("action_open_select", async () => {
            this.events.fire("action_file_cache_loading");
            const files = await promptFile({
                multiple: false,
                accept: ".svg, .png, .jpg, .jpeg, gif"
            });

            if(files.length !== 1) {
                this.events.fire("action_file_cache_loading_finished", { success: false });
                return;
            }

            const result = await getOwnAvatarStorage().updateAvatar(serverUniqueId, "uploading", files[0]);
            let succeeded;
            if(result.status === "success") {
                succeeded = true;
            } else if(result.status === "error") {
                createErrorModal(tr("Failed to load avatar"), tra("Failed to load avatar: {}", result.reason)).open();
                succeeded = false;
            } else if(result.status === "cache-unavailable") {
                createErrorModal(tr("Failed to load avatar"), tra("Failed to load avatar:{:br:}Own avatar cache unavailable.")).open();
                succeeded = false;
            } else {
                succeeded = false;
            }

            this.events.fire("action_file_cache_loading_finished", { success: succeeded });
        });
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
                    <ServerUniqueIdContext.Provider value={this.serverUniqueId}>
                        <CurrentAvatarProvider>
                            <div className={cssStyle.container + " " + (this.properties.windowed ? cssStyle.windowed : "")}>
                                <AvatarSelect />
                                <AvatarPreviewContainer />
                                <Buttons />
                            </div>
                        </CurrentAvatarProvider>
                    </ServerUniqueIdContext.Provider>
                </VariablesContext.Provider>
            </EventContext.Provider>
        );
    }

    renderTitle(): string | React.ReactElement {
        return <Translatable>Avatar upload</Translatable>;
    }
}
export default ModalAvatarUpload;