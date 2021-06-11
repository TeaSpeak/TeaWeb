import {AbstractModal} from "tc-shared/ui/react-elements/modal/Definitions";
import {createIpcUiVariableConsumer, IpcVariableDescriptor} from "tc-shared/ui/utils/IpcVariable";
import {
    BookmarkConnectInfo,
    BookmarkListEntry,
    ModalBookmarkEvents,
    ModalBookmarkVariables
} from "tc-shared/ui/modal/bookmarks/Definitions";
import {IpcRegistryDescription, Registry} from "tc-events";
import {UiVariableConsumer} from "tc-shared/ui/utils/Variable";
import {Translatable, VariadicTranslatable} from "tc-shared/ui/react-elements/i18n";
import {useContext, useEffect, useRef} from "react";
import {ContextDivider} from "tc-shared/ui/react-elements/ContextDivider";
import {joinClassList, useDependentState, useTr} from "tc-shared/ui/react-elements/Helper";
import {Button} from "tc-shared/ui/react-elements/Button";
import {LoadingDots} from "tc-shared/ui/react-elements/LoadingDots";
import {IconRenderer, RemoteIconRenderer} from "tc-shared/ui/react-elements/Icon";
import {getIconManager} from "tc-shared/file/Icons";
import {ClientIcon} from "svg-sprites/client-icons";
import {ClientIconRenderer} from "tc-shared/ui/react-elements/Icons";
import {spawnContextMenu} from "tc-shared/ui/ContextMenu";
import {formatMessage} from "tc-shared/ui/frames/chat";
import {createErrorModal, createInfoModal, createInputModal} from "tc-shared/ui/elements/Modal";
import {HostBannerRenderer} from "tc-shared/ui/frames/HostBannerRenderer";
import {ControlledBoxedInputField, ControlledSelect} from "tc-shared/ui/react-elements/InputField";
import {Checkbox} from "tc-shared/ui/react-elements/Checkbox";
import * as React from "react";

import DefaultHeaderImage from "./header_background.png";
import ServerInfoImage from "./serverinfo.png";
import {IconTooltip} from "tc-shared/ui/react-elements/Tooltip";
import {CountryCode} from "tc-shared/ui/react-elements/CountryCode";
import {downloadTextAsFile, requestFileAsText} from "tc-shared/file/Utils";

const EventContext = React.createContext<Registry<ModalBookmarkEvents>>(undefined);
const VariableContext = React.createContext<UiVariableConsumer<ModalBookmarkVariables>>(undefined);
const SelectedBookmarkIdContext = React.createContext<{ type: "empty" | "bookmark" | "directory", id: string | undefined }>({ type: "empty", id: undefined });
const SelectedBookmarkInfoContext = React.createContext<BookmarkConnectInfo>(undefined);

const cssStyle = require("./Renderer.scss");

const Link = (props: { connected: boolean }) => (
    <div className={joinClassList(
        cssStyle.link,
        props.connected ? cssStyle.connected : undefined
    )} />
);

const BookmarkListEntryRenderer = React.memo((props: { entry: BookmarkListEntry }) => {
    const variables = useContext(VariableContext);
    const events = useContext(EventContext);
    const selectedItem = variables.useVariable("bookmarkSelected", undefined, undefined);

    let icon;
    if(props.entry.icon) {
        icon = <RemoteIconRenderer key={"icon-" + props.entry.icon.iconId} icon={getIconManager().resolveIconInfo(props.entry.icon)} className={cssStyle.icon} />;
    } else if(props.entry.type === "directory") {
        icon = <IconRenderer key={"directory"} icon={ClientIcon.Folder} className={cssStyle.icon} />;
    } else {
        icon = <IconRenderer key={"no-icon"} icon={ClientIcon.ServerGreen} className={cssStyle.icon} />;
    }

    let links = [];
    for(let i = 0; i < props.entry.depth; i++) {
        links.push(<Link connected={i + 1 === props.entry.depth} key={"link-" + i} />);
    }

    let buttons = [];
    if(props.entry.type === "bookmark") {
        buttons.push(
            <div
                className={cssStyle.button}
                key={"bookmark-duplicate"}
                title={tr("Duplicate entry")}
                onClick={() => events.fire("action_duplicate_bookmark", { uniqueId: props.entry.uniqueId, displayName: undefined, originalName: props.entry.displayName })}
            >
                <ClientIconRenderer icon={ClientIcon.BookmarkDuplicate} />
            </div>
        );
    }
    buttons.push(
        <div className={cssStyle.button} key={"bookmark-remove"} title={tr("Delete entry")} onClick={() => {
            events.fire("action_delete_bookmark", { uniqueId: props.entry.uniqueId, force: false });
        }}>
            <ClientIconRenderer icon={ClientIcon.Delete} />
        </div>
    );

    return (
        <div
            key={"entry-" + props.entry.uniqueId}
            className={joinClassList(
                props.entry.type === "directory" ? cssStyle.directory : cssStyle.bookmark,
                props.entry.childCount > 0 ? cssStyle.linkStart : undefined,
                selectedItem.remoteValue?.id === props.entry.uniqueId ? cssStyle.selected : undefined,
            )}
            onClick={() => {
                if(selectedItem.remoteValue?.id === props.entry.uniqueId) {
                    return;
                }

                selectedItem.setValue({id: props.entry.uniqueId});
            }}
            onDoubleClick={() => {
                if(props.entry.type !== "bookmark") {
                    return;
                }

                events.fire("action_connect", { uniqueId: props.entry.uniqueId, newTab: false, closeModal: true });
            }}
            onContextMenu={event => {
                event.stopPropagation();

                if(selectedItem.remoteValue?.id !== props.entry.uniqueId) {
                    selectedItem.setValue({ id: props.entry.uniqueId });
                }

                spawnContextMenu({ pageX: event.pageX, pageY: event.pageY }, [
                    {
                        type: "normal",
                        label: tr("Connect to server"),
                        visible: props.entry.type === "bookmark",
                        icon: ClientIcon.Connect,
                        click: () => events.fire("action_connect", { uniqueId: props.entry.uniqueId, newTab: false, closeModal: true })
                    },
                    {
                        type: "normal",
                        label: tr("Connect in a new tab"),
                        visible: props.entry.type === "bookmark",
                        icon: ClientIcon.Connect,
                        click: () => events.fire("action_connect", { uniqueId: props.entry.uniqueId, newTab: true, closeModal: true })
                    },
                    {
                        type: "separator",
                        visible: props.entry.type === "bookmark",
                    },
                    {
                        type: "normal",
                        label: tr("Duplicate Bookmark"),
                        visible: props.entry.type === "bookmark",
                        icon: ClientIcon.BookmarkDuplicate,
                        click: () => events.fire("action_duplicate_bookmark", { uniqueId: props.entry.uniqueId, displayName: undefined, originalName: props.entry.displayName })
                    },
                    {
                        type: "normal",
                        label: tr("Add bookmark"),
                        icon: ClientIcon.BookmarkAdd,
                        click: () => events.fire("action_create_bookmark", { entryType: "bookmark", order: { type: "parent", entry: props.entry.uniqueId }, displayName: undefined })
                    },
                    {
                        type: "normal",
                        label: tr("Add directory"),
                        icon: ClientIcon.BookmarkAddFolder,
                        click: () => events.fire("action_create_bookmark", { entryType: "directory", order: { type: "previous", entry: props.entry.uniqueId }, displayName: undefined })
                    },
                    {
                        type: "normal",
                        label: tr("Add sub directory"),
                        visible: props.entry.type === "directory",
                        icon: ClientIcon.BookmarkAddFolder,
                        click: () => events.fire("action_create_bookmark", { entryType: "directory", order: { type: "parent", entry: props.entry.uniqueId }, displayName: undefined })
                    },
                    {
                        type: "separator",
                    },
                    {
                        type: "normal",
                        label: props.entry.type === "bookmark" ? tr("Delete bookmark") : tr("Delete directory"),
                        icon: ClientIcon.BookmarkRemove,
                        click: () => events.fire("action_delete_bookmark", { uniqueId: props.entry.uniqueId, force: false })
                    }
                ]);
            }}
        >
            {...links}
            {icon}
            <div className={cssStyle.name} title={props.entry.displayName}>
                {props.entry.displayName}
            </div>
            <div className={cssStyle.bookmarkButtons}>
                {...buttons}
            </div>
        </div>
    );
});

const BookmarkList = React.memo(() => {
    const events = useContext(EventContext);
    const variables = useContext(VariableContext);
    const bookmarksInfo = variables.useReadOnly("bookmarks");

    const bookmarks = bookmarksInfo.status === "loaded" ? bookmarksInfo.value : [];

    return (
        <div
            className={cssStyle.containerBookmarks}
            onContextMenu={event => {
                if(bookmarks.length === 0) {
                    /* We've an extra overlay for not having any bookmarks. */
                    return;
                }

                spawnContextMenu({ pageX: event.pageX, pageY: event.pageY }, [
                    {
                        type: "normal",
                        label: tr("Add bookmark"),
                        icon: ClientIcon.BookmarkAdd,
                        click: () => events.fire("action_create_bookmark", { entryType: "bookmark", order: { type: "end" }, displayName: undefined })
                    },
                    {
                        type: "normal",
                        label: tr("Add directory"),
                        icon: ClientIcon.BookmarkAddFolder,
                        click: () => events.fire("action_create_bookmark", { entryType: "directory", order: { type: "end" }, displayName: undefined })
                    },
                ]);
            }}
        >
            {bookmarks.map(entry => <BookmarkListEntryRenderer entry={entry} key={"entry-" + entry.uniqueId} />)}
            <div key={"overlay-loading"} className={cssStyle.overlay + " " + (bookmarksInfo.status === "loaded" ? "" : cssStyle.shown)}>
                <div className={cssStyle.text}><Translatable>loading</Translatable> <LoadingDots /></div>
            </div>
            <div key={"overlay-no-entries"} className={cssStyle.overlay + " " + (bookmarksInfo.status === "loaded" && bookmarksInfo.value.length === 0 ? cssStyle.shown : "")}>
                <div className={cssStyle.text}>
                    <Translatable>You don't have any bookmarks</Translatable>
                </div>
                <Button
                    onClick={() => events.fire("action_create_bookmark", { order: { type: "selected" }, displayName: undefined, entryType: "bookmark" })}
                    className={cssStyle.buttonCreate}
                >
                    <Translatable>Create new bookmark</Translatable>
                </Button>
            </div>
        </div>
    );
});

const BookmarkListContainer = React.memo(() => {
    const events = useContext(EventContext);

    return (
        <div className={cssStyle.listContainer}>
            <div className={cssStyle.title} title={useTr("Your bookmarks")}>
                <div className={cssStyle.text}><Translatable>Your bookmarks</Translatable></div>
                <div className={cssStyle.containerButton}>
                    <div
                        className={cssStyle.button}
                        title={useTr("Add new bookmark")}
                        onClick={() => events.fire("action_create_bookmark", { entryType: "bookmark", order: { type: "selected" }, displayName: undefined })}
                    >
                        <ClientIconRenderer icon={ClientIcon.BookmarkAdd} />
                    </div>
                </div>
            </div>
            <BookmarkList />
            <div className={cssStyle.buttons}>
                <Button onClick={() => events.fire("action_export")}>
                    <Translatable>Export</Translatable>
                </Button>
                <Button onClick={() => events.fire("action_import")}>
                    <Translatable>Import</Translatable>
                </Button>
            </div>
        </div>
    );
});

const SelectedBookmarkBanner = React.memo(() => {
    const bookmarkInfo = useContext(SelectedBookmarkInfoContext);

    if(!bookmarkInfo?.hostBannerUrl) {
        return (
            <img key={"default"} alt={""} src={DefaultHeaderImage} className={cssStyle.hostBanner} />
        );
    }

    return (
        <div className={cssStyle.hostBanner + " " + cssStyle.individual} key={"server"}>
            <HostBannerRenderer
                key={"hostbanner"}
                banner={{
                    imageUrl: bookmarkInfo.hostBannerUrl,
                    linkUrl: undefined,
                    mode: "resize-ratio",
                    updateInterval: 0
                }}
                className={cssStyle.renderer}
                clickable={false}
            />
        </div>
    );
});

const SelectedBookmarkName = React.memo(() => {
    const refEditPanel = useRef<HTMLDivElement>();
    const selectedBookmarkId = useContext(SelectedBookmarkIdContext);
    const variables = useContext(VariableContext);
    const nameVariable = variables.useVariable("bookmarkName", selectedBookmarkId.id);
    let [ editMode, setEditMode ] = useDependentState(() => false, [ selectedBookmarkId.id ]);
    if(selectedBookmarkId.type === "empty") {
        editMode = false;
    }

    useEffect(() => {
        if(refEditPanel.current) {
            refEditPanel.current.textContent = nameVariable.localValue;
            refEditPanel.current.focus();
        }
    }, [ editMode ]);

    if(nameVariable.status === "loading") {
        return (
            <div key={"name-loading"} className={cssStyle.containerName}>
                <div className={cssStyle.name}><Translatable>loading</Translatable> <LoadingDots /></div>
            </div>
        );
    } else if(editMode) {
        return (
            <div key={"name-edit"} className={cssStyle.containerName + " " + cssStyle.editing}>
                <div
                    ref={refEditPanel}
                    className={cssStyle.name}
                    contentEditable={true}
                    onKeyDown={event => {
                        if(event.key === "Enter") {
                            event.preventDefault();
                            refEditPanel.current?.blur();
                        } else if(event.key === "Backspace" || event.key === "Delete") {
                            /* never prevent these */
                        } else if(event.ctrlKey) {
                            /* don't prevent this */
                        } else if(event.currentTarget.textContent?.length >= 32) {
                            event.preventDefault();
                        }
                    }}
                    onInput={event => {
                        const value = event.currentTarget.textContent;
                        const valid = typeof value === "string" && value.length > 0 && value.length <= 32;
                        refEditPanel.current?.classList.toggle(cssStyle.invalid, !valid);
                    }}
                    onBlur={() => {
                        const value = refEditPanel.current?.textContent;
                        setEditMode(false);

                        if(!value || value.length > 32) { return; }
                        nameVariable.setValue(value);
                    }}
                >
                </div>
            </div>
        );
    } else {
        return (
            <div key={"name-value"} className={cssStyle.containerName}>
                <div className={cssStyle.name}>{nameVariable.status === "applying" ? tr("applying") : nameVariable.localValue}</div>
                <div className={cssStyle.edit} onClick={() => setEditMode(true)}>
                    <div className={cssStyle.button}>
                        <ClientIconRenderer className={cssStyle.icon} icon={ClientIcon.BookmarkEditName} />
                    </div>
                </div>
            </div>
        );
    }
})

const SelectedBookmarkHeader = React.memo(() => {
    const selectedBookmarkId = useContext(SelectedBookmarkIdContext);
    const variables = useContext(VariableContext);
    const addressVariable = variables.useReadOnly("bookmarkServerAddress", selectedBookmarkId.id);

    let address;
    if(selectedBookmarkId.type === "bookmark") {
        if(addressVariable.status === "loading") {
            address = <React.Fragment key={"address-loading"}><Translatable>loading</Translatable> <LoadingDots /></React.Fragment>
        } else {
            address = <React.Fragment key={"address-value"}>{addressVariable.value}</React.Fragment>;
        }
    }

    return (
        <div className={cssStyle.header}>
            <SelectedBookmarkName />
            <div className={cssStyle.containerAddress}>{address}</div>
            <SelectedBookmarkBanner />
        </div>
    )
});

const BookmarkSettingsGroup = React.memo((props: { children, className?: string }) => {
    return (
        <div className={cssStyle.group + " " + props.className}>
            {props.children}
        </div>
    )
});

const BookmarkSetting = React.memo((props: { children: [React.ReactNode, React.ReactNode] }) => {
    return (
        <div className={cssStyle.row}>
            <div className={cssStyle.key}>
                {props.children[0]}
            </div>
            <div className={cssStyle.value}>
                {props.children[1]}
            </div>
        </div>
    )
});

const BookmarkSettingConnectProfile = () => {
    const selectedBookmark = useContext(SelectedBookmarkIdContext);
    const variables = useContext(VariableContext);
    const selectedProfile = variables.useVariable("bookmarkConnectProfile", selectedBookmark.id);
    const availableProfiles = variables.useReadOnly("connectProfiles");

    let value;
    const profiles = [];
    let invalid = false;

    if(selectedBookmark.type !== "bookmark") {
        value = "empty";
    } else if(availableProfiles.status !== "loaded") {
        value = "loading";
    } else if(selectedProfile.status === "loading") {
        value = "loading";
    } else {
        value = selectedProfile.localValue;

        profiles.push(...availableProfiles.value.map(entry => (
            <option key={"profile-" + entry.id} value={entry.id}>{entry.name}</option>
        )));

        if(availableProfiles.value.findIndex(entry => entry.id === selectedProfile.localValue) === -1) {
            invalid = true;
            profiles.push(
                <option key={"profile-" + selectedProfile.localValue} value={selectedProfile.localValue} style={{ display: "none" }}>{useTr("Unknown profile") + ": " + selectedProfile.localValue}</option>
            );
        }
    }

    return (
        <ControlledSelect
            type={"boxed"}
            value={value}
            disabled={availableProfiles.status !== "loaded" || selectedProfile.status !== "loaded" || selectedBookmark.type !== "bookmark"}
            onChange={event => selectedProfile.setValue(event.target.value)}
            invalid={invalid}
        >
            <option key={"empty"} value={"empty"} style={{ display: "none" }} />
            <option key={"loading"} value={"loading"} style={{ display: "none" }}>{useTr("loading")}</option>
            <option key={"applying-value"} value={"applying-value"} style={{ display: "none" }}>{useTr("applying")}</option>
            {profiles as any}
        </ControlledSelect>
    );
};

const BookmarkSettingAutoConnect = () => {
    const selectedBookmark = useContext(SelectedBookmarkIdContext);
    const variables = useContext(VariableContext);
    const value = variables.useVariable("bookmarkConnectOnStartup", selectedBookmark.id, false);

    return (
        <Checkbox
            onChange={newValue => value.setValue(newValue)}
            value={value.localValue}
            disabled={value.status !== "loaded" || selectedBookmark.type !== "bookmark"}
            label={<Translatable>Automatically connect to server on client start</Translatable>}
        />
    );
};

const BookmarkSettingServerAddress = React.memo(() => {
    const selectedBookmark = useContext(SelectedBookmarkIdContext);
    const variables = useContext(VariableContext);
    const value = variables.useVariable("bookmarkServerAddress", selectedBookmark.id);

    return (
        <ControlledBoxedInputField
            value={value.localValue}
            disabled={selectedBookmark.type !== "bookmark" || value.status !== "loaded"}
            onChange={newValue => value.setValue(newValue, true)}
            onBlur={() => value.setValue(value.localValue)}
            finishOnEnter={true}
        />
    );
});

const BookmarkSettingPassword = React.memo((props: { field: "bookmarkServerPassword" | "bookmarkDefaultChannelPassword", disabled: boolean }) => {
    const selectedBookmark = useContext(SelectedBookmarkIdContext);
    const variables = useContext(VariableContext);
    const value = variables.useVariable(props.field, selectedBookmark.id);

    let placeholder = "", inputValue = "";
    if(props.disabled) {
        /* disabled, show nothing */
    } else if(value.status === "loaded") {
        if(value.localValue && value.localValue === value.remoteValue) {
            placeholder = tr("password hidden");
        } else {
            inputValue = value.localValue;
        }
    } else if(value.status === "applying") {
        if(value.localValue) {
            placeholder = tr("hashing password");
        } else {
            /* we've resetted the password. Don't show "hashing password" */
        }
    }

    const disabled = props.disabled || selectedBookmark.type !== "bookmark" || value.status !== "loaded";
    return (
        <ControlledBoxedInputField
            value={inputValue}
            placeholder={placeholder}
            disabled={disabled}
            onChange={newValue => value.setValue(newValue, true)}
            onBlur={() => value.setValue(value.localValue)}
            rightIcon={() => (
                <div className={cssStyle.inputIconContainer + " " + (disabled ? "" : cssStyle.enabled)}>
                    <div className={cssStyle.iconContainer} onClick={() => !disabled && value.setValue("")}>
                        <ClientIconRenderer icon={ClientIcon.Refresh} title={useTr("Reset password")} className={cssStyle.icon} />
                    </div>
                </div>
            )}
            finishOnEnter={true}
        />
    );
});

const BookmarkSettingChannel = React.memo(() => {
    const selectedBookmark = useContext(SelectedBookmarkIdContext);
    const variables = useContext(VariableContext);
    const defaultChannel = variables.useVariable("bookmarkDefaultChannel", selectedBookmark.id);
    const currentClientChannel = variables.useReadOnly("currentClientChannel", selectedBookmark.id);

    const inputDisabled = selectedBookmark.type !== "bookmark" || defaultChannel.status !== "loaded";
    const channelSelectDisabled = inputDisabled || currentClientChannel.status !== "loaded" || !currentClientChannel.value;

    let selectCurrentTitle;
    if(channelSelectDisabled) {
        selectCurrentTitle = tr("Select current channel.\nYou're not connected to the target server.");
    } else {
        selectCurrentTitle = tr("Select current channel") + ":\n" + currentClientChannel.value?.name;
        selectCurrentTitle += "\n\n" + tr("Shift click to use the channel name path.");
    }

    return (
        <ControlledBoxedInputField
            value={defaultChannel.localValue}
            disabled={inputDisabled}
            onChange={newValue => defaultChannel.setValue(newValue, true)}
            onBlur={() => defaultChannel.setValue(defaultChannel.localValue)}
            rightIcon={() => (
                <div className={cssStyle.inputIconContainer + " " + (channelSelectDisabled ? "" : cssStyle.enabled)}>
                    <div
                        title={selectCurrentTitle}
                        className={cssStyle.iconContainer}
                        onClick={event => {
                            if(currentClientChannel.status !== "loaded") {
                                return;
                            }

                            if(!currentClientChannel.value) {
                                return;
                            }

                            if(event.shiftKey) {
                                defaultChannel.setValue(currentClientChannel.value.path);
                            } else {
                                defaultChannel.setValue("/" + currentClientChannel.value.channelId);
                            }
                            variables.setVariable("bookmarkDefaultChannelPassword", selectedBookmark.id, currentClientChannel.value.passwordHash);
                        }}
                    >
                        <ClientIconRenderer icon={ClientIcon.ChannelEdit} className={cssStyle.icon} />
                    </div>
                </div>
            )}
            finishOnEnter={true}
        />
    );
});

const BookmarkSettingChannelPassword = () => {
    const selectedBookmark = useContext(SelectedBookmarkIdContext);
    const variables = useContext(VariableContext);
    const value = variables.useReadOnly("bookmarkDefaultChannel", selectedBookmark.id, undefined);
    return <BookmarkSettingPassword field={"bookmarkDefaultChannelPassword"} disabled={!value} />;
}

const BookmarkInfoRenderer = React.memo(() => {
    const selectedBookmark = useContext(SelectedBookmarkIdContext);
    const bookmarkInfo = useContext(SelectedBookmarkInfoContext);
    let connectCount = bookmarkInfo ? Math.max(bookmarkInfo.connectCountUniqueId, bookmarkInfo.connectCountAddress) : -1;

    return (
        <div className={cssStyle.group + " " + cssStyle.connectInfoContainer}>
            <div className={cssStyle.containerImage}>
                <img src={ServerInfoImage} alt={""} />
            </div>
            <div className={cssStyle.containerProperties}>
                <div className={cssStyle.row}>
                    <div className={cssStyle.key}>{useTr("Server name")}</div>
                    <div className={cssStyle.value}>
                        {bookmarkInfo?.serverName}
                    </div>
                </div>
                <div className={cssStyle.row}>
                    <div className={cssStyle.key}>{useTr("Server region")}</div>
                    <div className={cssStyle.value}>
                        <CountryCode alphaCode={bookmarkInfo?.serverRegion} />
                    </div>
                </div>
                <div className={cssStyle.row}>
                    <div className={cssStyle.key}>{useTr("Last ping")}</div>
                    <div className={cssStyle.value}>
                        {useTr("Not yet supported")}
                    </div>
                </div>
                <div className={cssStyle.row}>
                    <div className={cssStyle.key}>{useTr("Last client count")}</div>
                    <div className={cssStyle.value}>
                        {bookmarkInfo?.clientsOnline} / {bookmarkInfo?.clientsMax}
                    </div>
                </div>
                <div className={cssStyle.row}>
                    <div className={cssStyle.key}>{useTr("Connection count")}</div>
                    <div className={cssStyle.value + " " + cssStyle.valueConnectCount}>
                        <div className={cssStyle.text}>{connectCount === -1 ? tr("fetch error") : connectCount}</div>
                        <IconTooltip className={cssStyle.tooltipIcon}>
                            <div style={{ width: "20em" }}>
                                <VariadicTranslatable text={"Connections to the server unique id: {}"}>
                                    {bookmarkInfo?.connectCountUniqueId}
                                </VariadicTranslatable>
                                <br />
                                <VariadicTranslatable text={"Connections to the address: {}"}>
                                    {bookmarkInfo?.connectCountAddress}
                                </VariadicTranslatable>
                            </div>
                        </IconTooltip>
                    </div>
                </div>
            </div>
            <div className={cssStyle.overlay + " " + (connectCount === -1 ? cssStyle.shown : "")}>
                <div className={cssStyle.text}>
                    <Translatable>You never connected to that server.</Translatable>
                </div>
            </div>
            <div className={cssStyle.overlay + " " + (selectedBookmark.type !== "bookmark" ? cssStyle.shown : "")}>
                <div className={cssStyle.text}>
                    {/* bookmark is a directory */}
                </div>
            </div>
        </div>
    );
});

const BookmarkInfoContainerInner = React.memo(() => (
    <div className={cssStyle.infoContainer}>
        <SelectedBookmarkHeader />
        <div className={cssStyle.containerSettings}>
            <BookmarkSettingsGroup>
                <BookmarkSetting>
                    <Translatable>Connect profile</Translatable>
                    <BookmarkSettingConnectProfile />
                </BookmarkSetting>
                <BookmarkSettingAutoConnect />
            </BookmarkSettingsGroup>
            <BookmarkSettingsGroup>
                <BookmarkSetting>
                    <Translatable>Server Address</Translatable>
                    <BookmarkSettingServerAddress />
                </BookmarkSetting>
                <BookmarkSetting>
                    <Translatable>Server Password</Translatable>
                    <BookmarkSettingPassword field={"bookmarkServerPassword"} disabled={false} />
                </BookmarkSetting>
                <BookmarkSetting>
                    <Translatable>Default Channel</Translatable>
                    <BookmarkSettingChannel />
                </BookmarkSetting>
                <BookmarkSetting>
                    <Translatable>Channel password</Translatable>
                    <BookmarkSettingChannelPassword />
                </BookmarkSetting>
            </BookmarkSettingsGroup>
            <BookmarkInfoRenderer />
        </div>
    </div>
));

const BookmarkInfoContainer = React.memo(() => {
    const variables = useContext(VariableContext);
    const selectedBookmark = variables.useReadOnly("bookmarkSelected", undefined, { type: "empty", id: undefined });
    const selectedBookmarkInfo = variables.useReadOnly("bookmarkInfo", selectedBookmark.id, undefined);

    return (
        <SelectedBookmarkIdContext.Provider value={selectedBookmark as any}>
            <SelectedBookmarkInfoContext.Provider value={selectedBookmarkInfo}>
                <BookmarkInfoContainerInner />
            </SelectedBookmarkInfoContext.Provider>
        </SelectedBookmarkIdContext.Provider>
    )
});

class ModalBookmarks extends AbstractModal {
    readonly events: Registry<ModalBookmarkEvents>;
    readonly variables: UiVariableConsumer<ModalBookmarkVariables>;

    constructor(events: IpcRegistryDescription<ModalBookmarkEvents>, variables: IpcVariableDescriptor<ModalBookmarkVariables>) {
        super();

        this.events = Registry.fromIpcDescription(events);
        this.variables = createIpcUiVariableConsumer(variables);

        this.events.on("action_create_bookmark", event => {
            if(event.displayName) {
                return;
            }

            createInputModal(tr("Please enter a name"), tr("Please enter the bookmark name"), input => input.length > 0, value => {
                if(typeof value !== "string" || !value) {
                    return;
                }

                this.events.fire("action_create_bookmark", {
                    entryType: event.entryType,
                    order: event.order,
                    displayName: value
                });
            }).open();
        });

        this.events.on("action_duplicate_bookmark", event => {
            if(event.displayName) {
                return;
            }

            createInputModal(tr("Please enter a name"), tr("Please enter the new bookmark name"), input => input.length > 0, value => {
                if(typeof value !== "string" || !value) {
                    return;
                }

                this.events.fire("action_duplicate_bookmark", {
                    displayName: value,
                    uniqueId: event.uniqueId,
                    originalName: event.originalName
                });
            }, {
                defaultValue: event.originalName + " (Copy)"
            }).open();
        });

        this.events.on("notify_export_data", event => {
            downloadTextAsFile(event.payload, "bookmarks.json");
        });

        this.events.on("action_import", event => {
            if(event.payload) {
                return;
            }

            requestFileAsText().then(payload => {
                if(payload.length === 0) {
                    this.events.fire("notify_import_result", { status: "error", message: tr("File payload is empty") });
                    return;
                }

                this.events.fire("action_import", { payload: payload });
            });
        })

        this.events.on("notify_import_result", event => {
            switch (event.status) {
                case "error":
                    createErrorModal(tr("Failed to import bookmarks"), tr("Failed to import bookmarks:") + "\n" + event.message).open();
                    break;

                case "success":
                    createInfoModal(tr("Successfully imported"), formatMessage(tr("Successfully imported {0} bookmarks."), event.importedBookmarks)).open();
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
            <EventContext.Provider value={this.events}>
                <VariableContext.Provider value={this.variables}>
                    <div className={cssStyle.container + " " + (this.properties.windowed ? cssStyle.windowed : "")}>
                        <BookmarkListContainer />
                        <ContextDivider id={"separator-bookmarks"} direction={"horizontal"} defaultValue={25} />
                        <BookmarkInfoContainer />
                    </div>
                </VariableContext.Provider>
            </EventContext.Provider>
        );
    }

    renderTitle(): string | React.ReactElement {
        return <Translatable>Manage bookmarks</Translatable>;
    }

}

export = ModalBookmarks;