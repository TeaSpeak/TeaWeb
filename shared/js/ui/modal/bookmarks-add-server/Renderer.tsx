import {AbstractModal} from "tc-shared/ui/react-elements/modal/Definitions";
import React, {useContext, useEffect, useRef} from "react";
import {UiVariableConsumer} from "tc-shared/ui/utils/Variable";
import {IpcRegistryDescription, Registry} from "tc-events";
import {
    ModalBookmarksAddServerEvents,
    ModalBookmarksAddServerVariables, TargetBookmarkInfo
} from "tc-shared/ui/modal/bookmarks-add-server/Definitions";
import {createIpcUiVariableConsumer, IpcVariableDescriptor} from "tc-shared/ui/utils/IpcVariable";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {Button} from "tc-shared/ui/react-elements/Button";
import {ControlledBoxedInputField} from "tc-shared/ui/react-elements/InputField";
import {Checkbox} from "tc-shared/ui/react-elements/Checkbox";
import {ChannelTag, ServerTag} from "tc-shared/ui/tree/EntryTags";
import {IconTooltip} from "tc-shared/ui/react-elements/Tooltip";

const cssStyle = require("./Renderer.scss");

const EventContext = React.createContext<Registry<ModalBookmarksAddServerEvents>>(undefined);
const VariablesContext = React.createContext<UiVariableConsumer<ModalBookmarksAddServerVariables>>(undefined);
const BookmarkInfoContext = React.createContext<TargetBookmarkInfo>(undefined);

const BookmarkInfoProvider = React.memo((props: { children }) => {
    const variables = useContext(VariablesContext);
    const info = variables.useReadOnly("serverInfo", undefined, { type: "loading" });
    return (
        <BookmarkInfoContext.Provider value={info}>
            {props.children}
        </BookmarkInfoContext.Provider>
    );
});

const BookmarkName = React.memo(() => {
    const events = useContext(EventContext);
    const variables = useContext(VariablesContext);
    const name = variables.useVariable("bookmarkName", undefined);
    const nameValid = variables.useReadOnly("bookmarkNameValid", undefined, true);
    const info = useContext(BookmarkInfoContext);

    const refField = useRef<HTMLInputElement>();
    useEffect(() => {
        if(info.type === "success") {
            refField.current?.focus();
        }
    }, [ info.type === "success" ]);

    return (
        <ControlledBoxedInputField
            refInput={refField}

            value={name.localValue}
            className={cssStyle.editableBookmarkName}
            isInvalid={!nameValid}

            onChange={newValue => name.setValue(newValue, true)}
            onBlur={() => name.setValue(name.localValue)}
            onEnter={() => events.fire("action_add_bookmark")}

            disabled={info.type !== "success"}
            finishOnEnter={true}
        />
    );
});

const BookmarkChannel = React.memo(() => {
    const variables = useContext(VariablesContext);
    const info = useContext(BookmarkInfoContext);
    const saveCurrentChannel = variables.useVariable("saveCurrentChannel", undefined, false);

    let helpIcon;
    if(info.type === "success") {
        helpIcon = (
            <IconTooltip className={cssStyle.channelIcon} outerClassName={cssStyle.channelTooltipOuter}>
                <Translatable>Current channel:</Translatable><br />
                <ChannelTag channelName={info.currentChannelName} channelId={info.currentChannelId} handlerId={info.handlerId} />
            </IconTooltip>
        )
    }

    return (
        <Checkbox
            disabled={info.type !== "success"}
            value={saveCurrentChannel.localValue}
            onChange={value => saveCurrentChannel.setValue(value)}
            label={<div className={cssStyle.channelLabel}><Translatable key={"unknown-channel"}>Save current channel as default channel</Translatable> {helpIcon}</div>}
        />
    );
});

const ServerName = React.memo(() => {
    const info = useContext(BookmarkInfoContext);
    if(info.type !== "success") {
        return null;
    }

    return <ServerTag serverName={info.serverName} handlerId={info.handlerId} serverUniqueId={info.serverUniqueId} />;
});

const RendererBookmarkInfo = React.memo(() => {
    return (
        <div className={cssStyle.bookmarkInfo}>
            <div className={cssStyle.text + " " + cssStyle.addServer}>Add server to bookmarks:</div>
            <div className={cssStyle.text + " " + cssStyle.serverName}><ServerName /></div>
            <div className={cssStyle.text + " " + cssStyle.bookmarkName}>Bookmark name:</div>
            <BookmarkName />
            <BookmarkChannel />
        </div>
    )
});

const RendererButtons = React.memo(() => {
    const info = useContext(BookmarkInfoContext);
    const events = useContext(EventContext);
    const variables = useContext(VariablesContext);
    const nameValid = variables.useReadOnly("bookmarkNameValid", undefined, true);

    return (
        <div className={cssStyle.buttons}>
            <Button color={"red"} onClick={() => events.fire("action_cancel")}>
                <Translatable>Cancel</Translatable>
            </Button>
            <Button
                color={"green"}
                onClick={() => events.fire("action_add_bookmark")}
                disabled={info.type !== "success" || !nameValid}
            >
                <Translatable>Create bookmark</Translatable>
            </Button>
        </div>
    )
})

class ModalBookmarksAddServer extends AbstractModal {
    private readonly variables: UiVariableConsumer<ModalBookmarksAddServerVariables>;
    private readonly events: Registry<ModalBookmarksAddServerEvents>;

    constructor(events: IpcRegistryDescription<ModalBookmarksAddServerEvents>, variables: IpcVariableDescriptor<ModalBookmarksAddServerVariables>) {
        super();

        this.variables = createIpcUiVariableConsumer(variables);
        this.events = Registry.fromIpcDescription(events);
    }

    renderBody(): React.ReactElement {
        return (
            <EventContext.Provider value={this.events}>
                <VariablesContext.Provider value={this.variables}>
                    <div className={cssStyle.container}>
                        <BookmarkInfoProvider>
                            <RendererBookmarkInfo />
                            <RendererButtons />
                        </BookmarkInfoProvider>
                    </div>
                </VariablesContext.Provider>
            </EventContext.Provider>
        );
    }

    renderTitle(): string | React.ReactElement {
        return <Translatable>Add server to bookmarks</Translatable>;
    }
}

export = ModalBookmarksAddServer;