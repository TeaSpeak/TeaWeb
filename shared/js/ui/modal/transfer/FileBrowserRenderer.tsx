import {EventHandler, ReactEventHandler, Registry} from "tc-shared/events";
import {useContext, useEffect, useRef, useState} from "react";
import {FileType} from "tc-shared/file/FileManager";
import * as ppt from "tc-backend/ppt";
import {SpecialKey} from "tc-shared/PPTListener";
import {createErrorModal} from "tc-shared/ui/elements/Modal";
import {tra} from "tc-shared/i18n/localize";
import {network} from "tc-shared/ui/frames/chat";
import {Table, TableColumn, TableRow, TableRowElement} from "tc-shared/ui/react-elements/Table";
import {ReactComponentBase} from "tc-shared/ui/react-elements/ReactComponentBase";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import * as Moment from "moment";
import {MenuEntryType, spawn_context_menu} from "tc-shared/ui/elements/ContextMenu";
import {BoxedInputField} from "tc-shared/ui/react-elements/InputField";
import * as log from "tc-shared/log";
import {LogCategory} from "tc-shared/log";
import {LoadingDots} from "tc-shared/ui/react-elements/LoadingDots";
import React = require("react");
import {
    FileBrowserEvents,
    FileTransferUrlMediaType,
    ListedFileInfo,
    TransferStatus
} from "tc-shared/ui/modal/transfer/FileDefinitions";
import {joinClassList} from "tc-shared/ui/react-elements/Helper";

export interface FileBrowserRendererClasses {
    navigation?: {
        boxedInput?: string
    },
    fileTable?: {
        table?: string,
        header?: string,
        body?: string
    },
    fileEntry?: {
        entry?: string,
        selected?: string,
        dropHovered?: string
    }
}

const EventsContext = React.createContext<Registry<FileBrowserEvents>>(undefined);
const CustomClassContext = React.createContext<FileBrowserRendererClasses>(undefined);
export const FileBrowserClassContext = CustomClassContext;

const cssStyle = require("./FileBrowserRenderer.scss");

interface NavigationBarProperties {
    initialPath: string;
    events: Registry<FileBrowserEvents>;
}

interface NavigationBarState {
    currentPath: string;

    state: "editing" | "navigating" | "normal";
}

const ArrowRight = () => (
    <div className={cssStyle.arrow}>
        <div className={cssStyle.inner}/>
    </div>
);

const NavigationEntry = (props: { events: Registry<FileBrowserEvents>, path: string, name: string }) => {
    const [dragHovered, setDragHovered] = useState(false);

    useEffect(() => {
        if (!dragHovered)
            return;

        const dragListener = () => setDragHovered(false);
        props.events.on("notify_drag_ended", dragListener);
        return () => props.events.off("notify_drag_ended", dragListener);
    });

    return (
        <a
            className={(props.name.length > 9 ? cssStyle.pathShrink : "") + " " + (dragHovered ? cssStyle.hovered : "")}
            title={props.name}
            onClick={event => {
                event.preventDefault();
                props.events.fire("action_navigate_to", {path: props.path});
            }}
            onDragOver={event => {
                const types = event.dataTransfer.types;
                if (types.length !== 1) {
                    return;
                }

                if (types[0] === FileTransferUrlMediaType) {
                    /* TODO: Detect if its remote move or internal move */
                    event.dataTransfer.effectAllowed = "move";
                } else if (types[0] === "Files") {
                    event.dataTransfer.effectAllowed = "copy";
                } else {
                    return;
                }

                event.preventDefault();
                setDragHovered(true);
            }}
            onDragLeave={() => setDragHovered(false)}
            onDrop={event => {
                const types = event.dataTransfer.types;
                if (types.length !== 1) {
                    return;
                }

                /* TODO: Fix this code duplicate! */
                if (types[0] === FileTransferUrlMediaType) {
                    /* TODO: If cross move upload! */
                    const fileUrls = event.dataTransfer.getData(FileTransferUrlMediaType).split("&").map(e => decodeURIComponent(e));
                    for (const fileUrl of fileUrls) {
                        const name = fileUrl.split("/").last();
                        const oldPath = fileUrl.split("/").slice(0, -1).join("/") + "/";

                        props.events.fire("action_rename_file", {
                            newPath: props.path + "/",
                            oldPath: oldPath,
                            oldName: name,
                            newName: name
                        });
                    }
                } else if (types[0] === "Files") {
                    props.events.fire("action_start_upload", {
                        path: props.path,
                        mode: "files",
                        files: [...event.dataTransfer.files]
                    });
                } else {
                    log.warn(LogCategory.FILE_TRANSFER, tr("Received an unknown drop media type (%o)"), types);
                    event.preventDefault();
                    return;
                }
                event.preventDefault();
            }}
        >{props.name}</a>
    );
};

@ReactEventHandler(e => e.props.events)
export class NavigationBar extends ReactComponentBase<NavigationBarProperties, NavigationBarState> {
    private refRendered = React.createRef<HTMLInputElement>();
    private refInput = React.createRef<BoxedInputField>();
    private ignoreBlur = false;
    private lastSucceededPath = "";

    protected defaultState(): NavigationBarState {
        return {
            currentPath: this.props.initialPath,
            state: "normal",
        }
    }

    render() {
        let input;
        let path = this.state.currentPath;
        if (!path.endsWith("/"))
            path += "/";

        if (this.state.state === "editing") {
            input = (
                <CustomClassContext.Consumer>
                    {customClasses => (
                        <BoxedInputField key={"nav-editing"}
                                         ref={this.refInput}
                                         defaultValue={path}
                                         leftIcon={() =>
                                             <div key={"left-icon"}
                                                  className={cssStyle.directoryIcon + " " + cssStyle.containerIcon}>
                                                 <div className={"icon_em client-file_home"}/>
                                             </div>
                                         }

                                         rightIcon={() =>
                                             <div key={"right-icon"}
                                                  className={cssStyle.refreshIcon + " " + cssStyle.containerIcon}>
                                                 <div className={"icon_em client-refresh"}/>
                                             </div>
                                         }

                                         onChange={path => this.onPathEntered(path)}
                                         onBlur={() => this.onInputPathBluer()}
                                         className={customClasses?.navigation?.boxedInput}
                        />
                    )}
                </CustomClassContext.Consumer>
            );
        } else if (this.state.state === "navigating" || this.state.state === "normal") {
            input = (
                <CustomClassContext.Consumer>
                    {customClasses => (
                        <BoxedInputField key={"nav-rendered"}
                                         ref={this.refInput}
                                         leftIcon={() =>
                                             <div key={"left-icon"}
                                                  className={cssStyle.directoryIcon + " " + cssStyle.containerIcon}
                                                  onClick={event => this.onPathClicked(event, -1)}>
                                                 <div className={"icon_em client-file_home"}/>
                                             </div>
                                         }

                                         rightIcon={() =>
                                             <div
                                                 key={"right-icon"}
                                                 className={cssStyle.refreshIcon + " " + (this.state.state === "normal" ? cssStyle.enabled : "") + " " + cssStyle.containerIcon}
                                                 onClick={() => this.onButtonRefreshClicked()}>
                                                 <div className={"icon_em client-refresh"}/>
                                             </div>
                                         }

                                         inputBox={() =>
                                             <div key={"custom-input"} className={cssStyle.containerPath}
                                                  ref={this.refRendered}>
                                                 {this.state.currentPath.split("/").filter(e => !!e).map((e, index, arr) => [
                                                     <ArrowRight key={"arrow-right-" + index + "-" + e}/>,
                                                     <NavigationEntry key={"de-" + index + "-" + e}
                                                                      path={"/" + arr.slice(0, index + 1).join("/") + "/"}
                                                                      name={e} events={this.props.events}/>
                                                 ])}
                                             </div>
                                         }

                                         editable={this.state.state === "normal"}
                                         onFocus={event => !event.defaultPrevented && this.onRenderedPathClicked()}
                                         className={customClasses?.navigation?.boxedInput}
                        />
                    )}
                </CustomClassContext.Consumer>
            );
        }

        return (
            <div className={cssStyle.navigation}>
                {input}
            </div>
        );
    }

    componentDidUpdate(prevProps: Readonly<NavigationBarProperties>, prevState: Readonly<NavigationBarState>, snapshot?: any): void {
        setTimeout(() => {
            if (this.refRendered.current)
                this.refRendered.current.scrollLeft = 999999;
        }, 10);
    }

    private onPathClicked(event: React.MouseEvent, index: number) {
        let path;
        if (index === -1)
            path = "/";
        else
            path = "/" + this.state.currentPath.split("/").filter(e => !!e).slice(0, index + 1).join("/") + "/";
        this.props.events.fire("action_navigate_to", {path: path});

        event.stopPropagation();
    }

    private onRenderedPathClicked() {
        if (this.state.state !== "normal") {
            return;
        }

        this.setState({
            state: "editing"
        }, () => this.refInput.current?.focusInput());
    }

    private onInputPathBluer() {
        if (this.state.state !== "editing" || this.ignoreBlur)
            return;

        this.setState({
            state: "normal"
        });
    }

    private onPathEntered(newPath: string) {
        if (newPath === this.state.currentPath) {
            return;
        }

        this.ignoreBlur = true;
        this.props.events.fire("action_navigate_to", {path: newPath});
        this.setState({
            currentPath: newPath
        });
    }

    private onButtonRefreshClicked() {
        if (this.state.state !== "normal")
            return;

        this.props.events.fire("action_navigate_to", {path: this.state.currentPath});
    }

    @EventHandler<FileBrowserEvents>("action_navigate_to")
    private handleNavigateBegin() {
        this.setState({
            state: "navigating"
        }, () => this.ignoreBlur = false);
    }

    @EventHandler<FileBrowserEvents>("notify_current_path")
    private handleCurrentPath(event: FileBrowserEvents["notify_current_path"]) {
        if (event.status === "success") {
            this.lastSucceededPath = event.path;
        }

        this.setState({
            state: "normal",
            currentPath: this.lastSucceededPath
        });

        if (event.status !== "success") {
            if (event.status === "timeout") {
                createErrorModal(tr("Failed to enter path"), tra("Failed to enter given path.{:br:}Action resulted in a timeout.")).open();
            } else {
                createErrorModal(tr("Failed to enter path"), tra("Failed to enter given path:{:br:}{0}", event.error)).open();
            }
        }
    }
}

interface FileListTableProperties {
    initialPath: string;
    events: Registry<FileBrowserEvents>;
}

interface FileListTableState {
    state: "querying" | "normal" | "error" | "query-timeout" | "no-permissions" | "invalid-password";
    errorMessage?: string;
}

const FileName = (props: { path: string, file: ListedFileInfo }) => {
    const events = useContext(EventsContext);
    const [editing, setEditing] = useState(props.file.mode === "create");
    const [fileName, setFileName] = useState(props.file.name);
    const refInput = useRef<HTMLInputElement>();

    let icon;
    if (props.file.type === FileType.FILE) {
        icon = <img key={"nicon"} src={"img/icon_file_text.svg"} alt={tr("File")} draggable={false}/>;
    } else {
        switch (props.file.mode) {
            case "normal":
                icon = <img key={"nicon"} src={"img/icon_folder.svg"} alt={tr("Directory icon")} title={tr("Directory")}
                            draggable={false}/>;
                break;

            case "create":
            case "creating":
            case "empty":
                icon = <img key={"nicon"} src={"img/icon_folder_empty.svg"} alt={tr("Empty directory icon")}
                            title={tr("Empty directory")} draggable={false}/>;
                break;

            case "password":
                icon = <img key={"nicon"} src={"img/icon_folder_password.svg"} alt={tr("Directory password protected")}
                            title={tr("Password protected directory")} draggable={false}/>;
                break;

            default:
                throw tr("Invalid directory state");
        }
    }

    let name;
    if (editing && props.file.mode !== "creating" && props.file.mode !== "uploading") {
        name = <input
            ref={refInput}
            defaultValue={fileName}

            onBlur={event => {
                let name = event.target.value;
                setEditing(false);

                if (props.file.mode === "create") {
                    name = name || props.file.name;

                    events.fire("action_create_directory", {
                        path: props.path,
                        name: name
                    });
                    setFileName(name);
                    props.file.name = name;
                    props.file.mode = "creating";
                } else {
                    if (name.length > 0 && name !== props.file.name) {
                        events.fire("action_rename_file", {
                            oldName: props.file.name,
                            newName: name,
                            oldPath: props.path,
                            newPath: props.path
                        });
                        setFileName(name);
                    }
                }
            }}

            onKeyPress={event => {
                if (event.key === "Enter") {
                    event.currentTarget.blur();
                    return;
                } else if (event.key === "/") {
                    event.preventDefault();
                    return;
                }
            }}

            onPaste={event => {
                const input = event.currentTarget;
                setTimeout(() => {
                    input.value = input.value.replace("/", "");
                });
            }}

            draggable={false}
        />;
    } else {
        name = <a key={"name"} onDoubleClick={event => {
            if (props.file.virtual || props.file.mode === "creating" || props.file.mode === "uploading")
                return;

            if (!ppt.key_pressed(SpecialKey.SHIFT))
                return;

            event.stopPropagation();
            events.fire("action_select_files", {
                mode: "exclusive",
                files: [{name: props.file.name, type: props.file.type}]
            });
            events.fire("action_start_rename", {
                path: props.path,
                name: props.file.name
            });
        }}>{fileName}</a>;
    }

    events.reactUse("action_start_rename", event => setEditing(event.name === props.file.name && event.path === props.path));
    events.reactUse("action_rename_file_result", event => {
        if (event.oldPath !== props.path || event.oldName !== props.file.name)
            return;

        if (event.status === "no-changes")
            return;

        if (event.status === "success") {
            props.file.name = event.newName;
        } else {
            setFileName(props.file.name);
            if (event.status === "timeout") {
                createErrorModal(tr("Failed to rename file"), tra("Failed to rename file.{:br:}Action resulted in a timeout.")).open();
            } else {
                createErrorModal(tr("Failed to rename file"), tra("Failed to rename file:{:br:}{0}", event.error)).open();
            }
        }
    });
    useEffect(() => {
        refInput.current?.focus();
    });

    return <>{icon} {name}</>;
};

const FileSize = (props: { path: string, file: ListedFileInfo }) => {
    const events = useContext(EventsContext);
    const [size, setSize] = useState(-1);

    events.reactUse("notify_transfer_status", event => {
        if (event.id !== props.file.transfer?.id)
            return;

        if (props.file.transfer?.direction !== "upload")
            return;

        switch (event.status) {
            case "pending":
                setSize(0);
                break;

            case "finished":
            case "none":
                setSize(-1);
                break;
        }
    });

    events.reactUse("notify_transfer_progress", event => {
        if (event.id !== props.file.transfer?.id)
            return;

        if (props.file.transfer?.direction !== "upload")
            return;

        setSize(event.fileSize);
    });

    if (size < 0 && (props.file.size < 0 || typeof props.file.size === "undefined")) {
        return (
            <a key={"size-invalid"}>
                <Translatable>unknown</Translatable>
            </a>
        );
    }

    return (
        <a key={"size"}>
            {network.format_bytes(size >= 0 ? size : props.file.size, {
                unit: "B",
                time: "",
                exact: false
            })}
        </a>
    );
};

const FileTransferIndicator = (props: { file: ListedFileInfo, events: Registry<FileBrowserEvents> }) => {
    const [transferStatus, setTransferStatus] = useState<TransferStatus>(props.file.transfer?.status || "none");
    const [transferProgress, setTransferProgress] = useState(props.file.transfer?.percent | 0);

    props.events.reactUse("notify_transfer_start", event => {
        if (event.path !== props.file.path || event.name !== props.file.name)
            return;

        setTransferStatus("pending");
    });

    props.events.reactUse("notify_transfer_status", event => {
        if (event.id !== props.file.transfer?.id)
            return;

        setTransferStatus(event.status);
        if (event.status === "finished" || event.status === "errored")
            setTransferProgress(100);
    });

    props.events.reactUse("notify_transfer_progress", event => {
        if (event.id !== props.file.transfer?.id)
            return;

        setTransferProgress(event.progress);
        setTransferStatus(event.status);
    });

    /* reset the status after two seconds */
    useEffect(() => {
        if (transferStatus !== "finished" && transferStatus !== "errored")
            return;

        const id = setTimeout(() => {
            setTransferStatus("none");
        }, 3 * 1000);
        return () => clearTimeout(id);
    });

    if (!props.file.transfer)
        return null;

    let color;
    switch (transferStatus) {
        case "pending":
        case "transferring":
            color = cssStyle.blue;
            break;

        case "errored":
            color = cssStyle.red;
            break;

        case "finished":
            color = cssStyle.green;
            break;

        case "none":
            color = cssStyle.hidden;
            break;
    }

    return (
        <div className={cssStyle.indicator + " " + color} style={{right: ((1 - transferProgress) * 100) + "%"}}>
            <div className={cssStyle.status}/>
        </div>
    );
};

const FileListEntry = (props: { row: TableRow<ListedFileInfo>, columns: TableColumn[], events: Registry<FileBrowserEvents> }) => {
    const file = props.row.userData;
    const [hidden, setHidden] = useState(false);
    const [selected, setSelected] = useState(false);
    const [dropHovered, setDropHovered] = useState(false);
    const customClasses = useContext(CustomClassContext);

    const onDoubleClicked = () => {
        if (file.type === FileType.DIRECTORY) {
            if (file.mode === "creating" || file.mode === "create") {
                return;
            }

            props.events.fire("action_navigate_to", {
                path: file.path + file.name + "/"
            });
        } else {
            if (file.mode === "uploading" || file.virtual) {
                return;
            }

            props.events.fire("action_start_download", {
                files: [{
                    path: file.path,
                    name: file.name
                }]
            });
        }
    };

    props.events.reactUse("action_select_files", event => {
        const contains = event.files.findIndex(e => e.name === file.name && e.type === file.type) !== -1;
        if (event.mode === "toggle" && contains)
            setSelected(!selected);
        else if (event.mode === "exclusive") {
            setSelected(contains);
        }
    });

    props.events.reactUse("notify_drag_ended", () => setDropHovered(false), dropHovered);

    props.events.reactUse("action_delete_file_result", event => {
        event.results.forEach(e => {
            if (e.status !== "success")
                return;

            if (e.path !== file.path || e.name !== file.name)
                return;

            setHidden(true);
        });
    }, !hidden);

    if (hidden) {
        return null;
    }

    const elementClassList = joinClassList(
        cssStyle.directoryEntry, customClasses?.fileEntry?.entry,
        selected && cssStyle.selected, selected && customClasses?.fileEntry?.selected,
        dropHovered && cssStyle.hovered, dropHovered && customClasses?.fileEntry?.dropHovered
    );

    return (
        <TableRowElement
            className={elementClassList}
            rowData={props.row}
            columns={props.columns}
            onDoubleClick={onDoubleClicked}

            onClick={() => props.events.fire("action_select_files", {
                files: [{name: file.name, type: file.type}],
                mode: ppt.key_pressed(SpecialKey.SHIFT) ? "toggle" : "exclusive"
            })}
            onContextMenu={e => {
                if (!selected) {
                    if (!(e.target instanceof HTMLDivElement)) {
                        /* explicitly clicked on one file */
                        props.events.fire("action_select_files", {
                            files: [{name: file.name, type: file.type}],
                            mode: ppt.key_pressed(SpecialKey.SHIFT) ? "toggle" : "exclusive"
                        });
                    } else {
                        props.events.fire("action_select_files", {files: [], mode: "exclusive"});
                    }
                }

                props.events.fire("action_selection_context_menu", {
                    pageX: e.pageX,
                    pageY: e.pageY
                });
                e.stopPropagation();
            }}
            draggable={!props.row.userData.virtual}
            onDragStart={event => {
                if (!selected) {
                    setSelected(true);
                    props.events.fire("action_select_files", {
                        files: [{name: file.name, type: file.type}],
                        mode: "exclusive"
                    });
                }
                props.events.fire("notify_drag_started", {event: event.nativeEvent});
            }}

            onDragOver={event => {
                const types = event.dataTransfer.types;
                if (types.length !== 1)
                    return;

                if (props.row.userData.type !== FileType.DIRECTORY) {
                    event.stopPropagation();
                    return;
                }

                if (types[0] === FileTransferUrlMediaType) {
                    /* TODO: Detect if its remote move or internal move */
                    event.dataTransfer.effectAllowed = "move";
                } else if (types[0] === "Files") {
                    event.dataTransfer.effectAllowed = "copy";
                } else {
                    return;
                }

                event.preventDefault();
                setDropHovered(true);
            }}

            onDragLeave={() => setDropHovered(false)}
            onDragEnd={() => props.events.fire("notify_drag_ended")}

            x-drag-upload-path={props.row.userData.type === FileType.DIRECTORY ? props.row.userData.path + props.row.userData.name + "/" : undefined}
        >
            <FileTransferIndicator events={props.events} file={props.row.userData}/>
        </TableRowElement>
    );
};

type FileListState = {
    state: "querying" | "invalid-password"
} | {
    state: "no-permissions",
    failedPermission: string
} | {
    state: "error",
    reason: string
} | {
    state: "normal",
    files: ListedFileInfo[]
};


function fileTableHeaderContextMenu(event: React.MouseEvent, table: Table | undefined) {
    event.preventDefault();

    if(!table) {
        return;
    }

    spawn_context_menu(event.pageX, event.pageY, {
        type: MenuEntryType.CHECKBOX,
        name: tr("Size"),
        checkbox_checked: table.state.hiddenColumns.findIndex(e => e === "size") === -1,
        callback: () => {
            table.state.hiddenColumns.toggle("size");
            table.forceUpdate();
        }
    }, {
        type: MenuEntryType.CHECKBOX,
        name: tr("Type"),
        checkbox_checked: table.state.hiddenColumns.findIndex(e => e === "type") === -1,
        callback: () => {
            table.state.hiddenColumns.toggle("type");
            table.forceUpdate();
        }
    }, {
        type: MenuEntryType.CHECKBOX,
        name: tr("Last changed"),
        checkbox_checked: table.state.hiddenColumns.findIndex(e => e === "change-date") === -1,
        callback: () => {
            table.state.hiddenColumns.toggle("change-date");
            table.forceUpdate();
        }
    })
}

// const FileListRenderer = React.memo((props: { path: string }) => {
//     const events = useContext(EventsContext);
//     const customClasses = useContext(CustomClassContext);
//
//     const refTable = useRef<Table>();
//
//     const [ state, setState ] = useState<FileListState>(() => {
//         events.fire("query_files", { path: props.path });
//         return { state: "querying" };
//     });
//
//     events.reactUse("query_files", event => {
//         if(event.path === props.path) {
//             setState({ state: "querying" });
//         }
//     });
//
//     events.reactUse("query_files_result", event => {
//         if(event.path !== props.path) {
//             return;
//         }
//
//         switch(event.status) {
//             case "no-permissions":
//                 setState({ state: "no-permissions", failedPermission: event.error });
//                 break;
//
//             case "error":
//                 setState({ state: "error", reason: event.error });
//                 break;
//
//             case "success":
//                 setState({ state: "normal", files: event.files });
//                 break;
//
//             case "invalid-password":
//                 setState({ state: "invalid-password" });
//                 break;
//
//             case "timeout":
//                 setState({ state: "error", reason: tr("query timeout") });
//                 break;
//
//             default:
//                 setState({ state: "error", reason: tra("invalid query result state {}", event.status) });
//                 break;
//         }
//     });
//
//     let rows: TableRow[] = [];
//     let overlay;
//
//     switch (state.state) {
//         case "querying":
//             overlay = () => (
//                 <div key={"loading"} className={cssStyle.overlay}>
//                     <a><Translatable>loading</Translatable><LoadingDots maxDots={3}/></a>
//                 </div>
//             );
//             break;
//
//         case "error":
//             overlay = () => (
//                 <div key={"query-error"} className={cssStyle.overlay + " " + cssStyle.overlayError}>
//                     <a><Translatable>Failed to query directory:</Translatable><br/>{state.reason}</a>
//                 </div>
//             );
//             break;
//
//         case "no-permissions":
//             overlay = () => (
//                 <div key={"no-permissions"} className={cssStyle.overlay + " " + cssStyle.overlayError}>
//                     <a><Translatable>Directory query failed on permission</Translatable><br/>{state.failedPermission}
//                     </a>
//                 </div>
//             );
//             break;
//
//         case "invalid-password":
//             /* TODO: Allow the user to enter a password */
//             overlay = () => (
//                 <div key={"invalid-password"} className={cssStyle.overlay + " " + cssStyle.overlayError}>
//                     <a><Translatable>Directory query failed because it is password protected</Translatable></a>
//                 </div>
//             );
//             break;
//
//         case "normal":
//             if(state.files.length === 0) {
//                 overlay = () => (
//                     <div key={"no-files"} className={cssStyle.overlayEmptyFolder}>
//                         <a><Translatable>This folder is empty.</Translatable></a>
//                     </div>
//                 );
//             } else {
//                 const directories = state.files.filter(e => e.type === FileType.DIRECTORY);
//                 const files = state.files.filter(e => e.type === FileType.FILE);
//
//                 for (const directory of directories.sort((a, b) => a.name > b.name ? 1 : -1)) {
//                     rows.push({
//                         columns: {
//                             "name": () => <FileName path={props.path} file={directory}/>,
//                             "type": () => <a key={"type"}><Translatable>Directory</Translatable></a>,
//                             "change-date": () => directory.datetime ?
//                                 <a>{Moment(directory.datetime).format("DD/MM/YYYY HH:mm")}</a> : undefined
//                         },
//                         className: cssStyle.directoryEntry,
//                         userData: directory
//                     });
//                 }
//
//                 for (const file of files.sort((a, b) => a.name > b.name ? 1 : -1)) {
//                     rows.push({
//                         columns: {
//                             "name": () => <FileName path={props.path} file={file}/>,
//                             "size": () => <FileSize path={props.path} file={file}/>,
//                             "type": () => <a key={"type"}><Translatable>File</Translatable></a>,
//                             "change-date": () => file.datetime ?
//                                 <a key={"date"}>{Moment(file.datetime).format("DD/MM/YYYY HH:mm")}</a> :
//                                 undefined
//                         },
//                         className: cssStyle.directoryEntry,
//                         userData: file
//                     });
//                 }
//             }
//             break;
//     }
//
//     return (
//         <Table
//             ref={refTable}
//             className={joinClassList(cssStyle.fileTable, customClasses?.fileTable?.table)}
//             bodyClassName={joinClassList(cssStyle.body, customClasses?.fileTable?.body)}
//             headerClassName={joinClassList(cssStyle.header, customClasses?.fileTable?.header)}
//             columns={[
//                 {
//                     name: "name", header: () => [
//                         <a key={"name-name"}><Translatable>Name</Translatable></a>,
//                         <div key={"seperator-name"} className={cssStyle.separator}/>
//                     ], width: 80, className: cssStyle.columnName
//                 },
//                 {
//                     name: "type", header: () => [
//                         <a key={"name-type"}><Translatable>Type</Translatable></a>,
//                         <div key={"seperator-type"} className={cssStyle.separator}/>
//                     ], fixedWidth: "8em", className: cssStyle.columnType
//                 },
//                 {
//                     name: "size", header: () => [
//                         <a key={"name-size"}><Translatable>Size</Translatable></a>,
//                         <div key={"seperator-size"} className={cssStyle.separator}/>
//                     ], fixedWidth: "8em", className: cssStyle.columnSize
//                 },
//                 {
//                     name: "change-date", header: () => [
//                         <a key={"name-date"}><Translatable>Last changed</Translatable></a>,
//                         <div key={"seperator-date"} className={cssStyle.separator}/>
//                     ], fixedWidth: "8em", className: cssStyle.columnChanged
//                 },
//             ]}
//             rows={rows}
//
//             bodyOverlayOnly={rows.length === 0}
//             bodyOverlay={overlay}
//
//             hiddenColumns={["type"]}
//
//             onHeaderContextMenu={e => fileTableHeaderContextMenu(e, refTable.current)}
//             onBodyContextMenu={event => {
//                 event.preventDefault();
//                 events.fire("action_select_files", { mode: "exclusive", files: [] });
//                 events.fire("action_selection_context_menu", { pageY: event.pageY, pageX: event.pageX });
//             }}
//             onDrop={e => this.onDrop(e)}
//             onDragOver={event => {
//                 const types = event.dataTransfer.types;
//                 if (types.length !== 1)
//                     return;
//
//                 if (types[0] === FileTransferUrlMediaType) {
//                     /* TODO: Detect if its remote move or internal move */
//                     event.dataTransfer.effectAllowed = "move";
//                 } else if (types[0] === "Files") {
//                     event.dataTransfer.effectAllowed = "copy";
//                 } else {
//                     return;
//                 }
//
//                 event.preventDefault();
//             }}
//
//             renderRow={(row: TableRow<ListedFileInfo>, columns, uniqueId) => (
//                 <FileListEntry columns={columns}
//                                row={row} key={uniqueId}
//                                events={this.props.events}/>
//             )}
//         />
//     );
// });

@ReactEventHandler(e => e.props.events)
export class FileBrowserRenderer extends ReactComponentBase<FileListTableProperties, FileListTableState> {
    private refTable = React.createRef<Table>();
    private currentPath: string;
    private fileList: ListedFileInfo[];
    private selection: { name: string, type: FileType }[] = [];

    protected defaultState(): FileListTableState {
        return {
            state: "querying"
        };
    }

    render() {
        let rows: TableRow[] = [];

        let overlay, overlayOnly;
        if (this.state.state === "querying") {
            overlayOnly = true;
            overlay = () => (
                <div key={"loading"} className={cssStyle.overlay}>
                    <a><Translatable>loading</Translatable><LoadingDots maxDots={3}/></a>
                </div>
            );
        } else if (this.state.state === "error") {
            overlayOnly = true;
            overlay = () => (
                <div key={"query-error"} className={cssStyle.overlay + " " + cssStyle.overlayError}>
                    <a><Translatable>Failed to query directory:</Translatable><br/>{this.state.errorMessage}</a>
                </div>
            );
        } else if (this.state.state === "query-timeout") {
            overlayOnly = true;
            overlay = () => (
                <div key={"query-timeout"} className={cssStyle.overlay + " " + cssStyle.overlayError}>
                    <a><Translatable>Directory query timed out.</Translatable><br/><Translatable>Please try
                        again.</Translatable></a>
                </div>
            );
        } else if (this.state.state === "no-permissions") {
            overlayOnly = true;
            overlay = () => (
                <div key={"no-permissions"} className={cssStyle.overlay + " " + cssStyle.overlayError}>
                    <a><Translatable>Directory query failed on permission</Translatable><br/>{this.state.errorMessage}
                    </a>
                </div>
            );
        } else if (this.state.state === "invalid-password") {
            overlayOnly = true;
            overlay = () => (
                <div key={"invalid-password"} className={cssStyle.overlay + " " + cssStyle.overlayError}>
                    <a><Translatable>Directory query failed because it is password protected</Translatable></a>
                </div>
            );
        } else if (this.state.state === "normal") {
            if (this.fileList.length === 0) {
                overlayOnly = true;
                overlay = () => (
                    <div key={"no-files"} className={cssStyle.overlayEmptyFolder}>
                        <a><Translatable>This folder is empty.</Translatable></a>
                    </div>
                );
            } else {
                const directories = this.fileList.filter(e => e.type === FileType.DIRECTORY);
                const files = this.fileList.filter(e => e.type === FileType.FILE);

                for (const directory of directories.sort((a, b) => a.name > b.name ? 1 : -1)) {
                    rows.push({
                        columns: {
                            "name": () => <FileName path={this.currentPath} file={directory}/>,
                            "type": () => <a key={"type"}><Translatable>Directory</Translatable></a>,
                            "change-date": () => directory.datetime ?
                                <a>{Moment(directory.datetime).format("DD/MM/YYYY HH:mm")}</a> : undefined
                        },
                        className: cssStyle.directoryEntry,
                        userData: directory
                    })
                }

                for (const file of files.sort((a, b) => a.name > b.name ? 1 : -1)) {
                    rows.push({
                        columns: {
                            "name": () => <FileName path={this.currentPath} file={file}/>,
                            "size": () => <FileSize path={this.currentPath} file={file}/>,
                            "type": () => <a key={"type"}><Translatable>File</Translatable></a>,
                            "change-date": () => file.datetime ?
                                <a key={"date"}>{Moment(file.datetime).format("DD/MM/YYYY HH:mm")}</a> : undefined
                        },
                        className: cssStyle.directoryEntry,
                        userData: file
                    })
                }
            }
        }

        return (
            <EventsContext.Provider value={this.props.events}>
                <CustomClassContext.Consumer>
                    {classes => (
                        <Table
                            ref={this.refTable}
                            className={this.classList(cssStyle.fileTable, classes?.fileTable?.table)}
                            bodyClassName={this.classList(cssStyle.body, classes?.fileTable?.body)}
                            headerClassName={this.classList(cssStyle.header, classes?.fileTable?.header)}
                            columns={[
                                {
                                    name: "name", header: () => [
                                        <a key={"name-name"}><Translatable>Name</Translatable></a>,
                                        <div key={"seperator-name"} className={cssStyle.separator}/>
                                    ], width: 80, className: cssStyle.columnName
                                },
                                {
                                    name: "type", header: () => [
                                        <a key={"name-type"}><Translatable>Type</Translatable></a>,
                                        <div key={"seperator-type"} className={cssStyle.separator}/>
                                    ], fixedWidth: "8em", className: cssStyle.columnType
                                },
                                {
                                    name: "size", header: () => [
                                        <a key={"name-size"}><Translatable>Size</Translatable></a>,
                                        <div key={"seperator-size"} className={cssStyle.separator}/>
                                    ], fixedWidth: "8em", className: cssStyle.columnSize
                                },
                                {
                                    name: "change-date", header: () => [
                                        <a key={"name-date"}><Translatable>Last changed</Translatable></a>,
                                        <div key={"seperator-date"} className={cssStyle.separator}/>
                                    ], fixedWidth: "8em", className: cssStyle.columnChanged
                                },
                            ]}
                            rows={rows}

                            bodyOverlayOnly={overlayOnly}
                            bodyOverlay={overlay}

                            hiddenColumns={["type"]}

                            onHeaderContextMenu={e => this.onHeaderContextMenu(e)}
                            onBodyContextMenu={e => this.onBodyContextMenu(e)}
                            onDrop={e => this.onDrop(e)}
                            onDragOver={event => {
                                const types = event.dataTransfer.types;
                                if (types.length !== 1)
                                    return;

                                if (types[0] === FileTransferUrlMediaType) {
                                    /* TODO: Detect if its remote move or internal move */
                                    event.dataTransfer.effectAllowed = "move";
                                } else if (types[0] === "Files") {
                                    event.dataTransfer.effectAllowed = "copy";
                                } else {
                                    return;
                                }

                                event.preventDefault();
                            }}

                            renderRow={(row: TableRow<ListedFileInfo>, columns, uniqueId) => (
                                <FileListEntry columns={columns}
                                               row={row} key={uniqueId}
                                               events={this.props.events}/>
                            )}
                        />
                    )}
                </CustomClassContext.Consumer>
            </EventsContext.Provider>
        );
    }

    componentDidMount(): void {
        this.selection = [];
        this.currentPath = this.props.initialPath;

        this.props.events.fire("query_current_path", {});
        this.props.events.fire("query_files", {
            path: this.currentPath
        });
    }

    private onDrop(event: React.DragEvent) {
        const types = event.dataTransfer.types;
        if (types.length !== 1) {
            return;
        }

        event.stopPropagation();
        let targetPath;
        {
            let currentTarget = event.target as HTMLElement;
            while (currentTarget && !currentTarget.hasAttribute("x-drag-upload-path")) {
                currentTarget = currentTarget.parentElement;
            }
            targetPath = currentTarget?.getAttribute("x-drag-upload-path") || this.currentPath;
        }

        if (types[0] === FileTransferUrlMediaType) {
            /* TODO: Test if we moved cross some boundaries */
            console.error(event.dataTransfer.getData(FileTransferUrlMediaType));
            const fileUrls = event.dataTransfer.getData(FileTransferUrlMediaType).split("&").map(e => decodeURIComponent(e));
            for (const fileUrl of fileUrls) {
                const name = fileUrl.split("/").last();
                const oldPath = fileUrl.split("/").slice(0, -1).join("/") + "/";

                this.props.events.fire("action_rename_file", {
                    newPath: targetPath,
                    oldPath: oldPath,
                    oldName: name,
                    newName: name
                });
            }
        } else if (types[0] === "Files") {
            this.props.events.fire("action_start_upload", {
                path: targetPath,
                mode: "files",
                files: [...event.dataTransfer.files]
            });
        } else {
            log.warn(LogCategory.FILE_TRANSFER, tr("Received an unknown drop media type (%o)"), types);
            event.preventDefault();
            return;
        }
        event.preventDefault();
    }

    private onHeaderContextMenu(event: React.MouseEvent) {
        event.preventDefault();

        const table = this.refTable.current;
        spawn_context_menu(event.pageX, event.pageY, {
            type: MenuEntryType.CHECKBOX,
            name: tr("Size"),
            checkbox_checked: table.state.hiddenColumns.findIndex(e => e === "size") === -1,
            callback: () => {
                table.state.hiddenColumns.toggle("size");
                table.forceUpdate();
            }
        }, {
            type: MenuEntryType.CHECKBOX,
            name: tr("Type"),
            checkbox_checked: table.state.hiddenColumns.findIndex(e => e === "type") === -1,
            callback: () => {
                table.state.hiddenColumns.toggle("type");
                table.forceUpdate();
            }
        }, {
            type: MenuEntryType.CHECKBOX,
            name: tr("Last changed"),
            checkbox_checked: table.state.hiddenColumns.findIndex(e => e === "change-date") === -1,
            callback: () => {
                table.state.hiddenColumns.toggle("change-date");
                table.forceUpdate();
            }
        })
    }

    private onBodyContextMenu(event: React.MouseEvent) {
        event.preventDefault();
        this.props.events.fire("action_select_files", {mode: "exclusive", files: []});
        this.props.events.fire("action_selection_context_menu", { pageY: event.pageY, pageX: event.pageX });
    }

    @EventHandler<FileBrowserEvents>("notify_current_path")
    private handleNavigationResult(event: FileBrowserEvents["notify_current_path"]) {
        if (event.status !== "success") {
            return;
        }

        this.currentPath = event.path;
        this.selection = [];
        this.props.events.fire("query_files", {
            path: event.path
        });
    }

    @EventHandler<FileBrowserEvents>("query_files")
    private handleQueryFiles(event: FileBrowserEvents["query_files"]) {
        if (event.path !== this.currentPath)
            return;

        this.setState({
            state: "querying"
        });
    }

    @EventHandler<FileBrowserEvents>("query_files_result")
    private handleQueryFilesResult(event: FileBrowserEvents["query_files_result"]) {
        if (event.status === "timeout") {
            this.setState({
                state: "query-timeout"
            });
        } else if (event.status === "error") {
            this.setState({
                state: "error",
                errorMessage: event.error || tr("unknown query error")
            });
        } else if (event.status === "success") {
            this.fileList = event.files;
            this.setState({
                state: "normal"
            });
        } else if (event.status === "no-permissions") {
            this.setState({
                state: "no-permissions",
                errorMessage: event.error || tr("unknown")
            });
        } else if (event.status === "invalid-password") {
            this.setState({
                state: "invalid-password"
            });
        } else {
            this.setState({
                state: "error",
                errorMessage: tr("invalid query result state")
            });
        }
    }

    @EventHandler<FileBrowserEvents>("action_delete_file_result")
    private handleActionDeleteResult(event: FileBrowserEvents["action_delete_file_result"]) {
        event.results.forEach(e => {
            const index = this.fileList.findIndex(e1 => e1.name === e.name && e1.path === e.path);
            if (index === -1)
                return;

            if (e.status === "success")
                this.fileList.splice(index, 1);
        });

        event.results.forEach(e => {
            if (e.status === "success")
                return;

            createErrorModal(tr("Failed to delete entry"), tra("Failed to delete \"{0}\":{:br:}{1}", e.name, e.error || tr("Unknown error"))).open();
        });
    }

    @EventHandler<FileBrowserEvents>("action_start_create_directory")
    private handleActionFileCreateBegin(event: FileBrowserEvents["action_start_create_directory"]) {
        let index = 0;
        while (this.fileList.find(e => e.name === (event.defaultName + (index > 0 ? " (" + index + ")" : "")))) {
            index++;
        }

        const name = event.defaultName + (index > 0 ? " (" + index + ")" : "");
        this.fileList.push({
            name: name,
            path: this.currentPath,
            type: FileType.DIRECTORY,
            size: 0,
            datetime: Date.now(),
            virtual: false,
            mode: "create"
        });

        /* fire_async because our children have to render first in order to have the row selected! */
        this.forceUpdate(() => {
            this.props.events.fire_react("action_select_files", {
                files: [{
                    name: name,
                    type: FileType.DIRECTORY
                }], mode: "exclusive"
            });
        });
    }

    @EventHandler<FileBrowserEvents>("action_create_directory_result")
    private handleActionFileCreateResult(event: FileBrowserEvents["action_create_directory_result"]) {
        let fileIndex = this.fileList.slice().reverse().findIndex(e => e.path === event.path && e.name === event.name);
        if (fileIndex === -1)
            return;
        fileIndex = this.fileList.length - fileIndex - 1;

        const file = this.fileList[fileIndex];
        if (event.status === "success") {
            if (file.mode === "creating")
                file.mode = "empty";
            return;
        } else if (file.mode !== "creating")
            return;

        this.fileList.splice(fileIndex, 1);
        this.forceUpdate();

        if (event.status === "timeout") {
            createErrorModal(tr("Failed to create directory"), tra("Failed to create directory.{:br:}Action resulted in a timeout.")).open();
        } else {
            createErrorModal(tr("Failed to create directory"), tra("Failed to create directory:{:br:}{0}", event.error)).open();
        }
    }

    @EventHandler<FileBrowserEvents>("action_select_files")
    private handleActionSelectFiles(event: FileBrowserEvents["action_select_files"]) {
        if (event.mode === "exclusive") {
            this.selection = event.files.slice(0);
        } else if (event.mode === "toggle") {
            event.files.forEach(e => {
                const index = this.selection.map(e => e.name).findIndex(b => b === e.name);
                if (index === -1)
                    this.selection.push(e);
                else
                    this.selection.splice(index);
            });
        }
    }

    @EventHandler<FileBrowserEvents>("notify_drag_started")
    private handleNotifyDragStarted(event: FileBrowserEvents["notify_drag_started"]) {
        if (this.selection.length === 0) {
            event.event.preventDefault();
            return;
        } else {
            const url = this.selection.map(e => encodeURIComponent(this.currentPath + e.name)).join("&");
            event.event.dataTransfer.setData(FileTransferUrlMediaType, url);
        }
    }

    @EventHandler<FileBrowserEvents>("action_rename_file_result")
    private handleFileRenameResult(event: FileBrowserEvents["action_rename_file_result"]) {
        if (event.oldPath !== this.currentPath && event.newPath !== this.currentPath)
            return;

        if (event.status !== "success")
            return;

        if (event.oldPath === event.newPath) {
            const index = this.selection.findIndex(e => e.name === event.oldName);
            if (index !== -1)
                this.selection[index].name = event.newName;
        } else {
            /* re query files, because list has changed */
            this.props.events.fire("query_files", {path: this.currentPath});
        }
    }

    @EventHandler<FileBrowserEvents>("notify_transfer_start")
    private handleTransferStart(event: FileBrowserEvents["notify_transfer_start"]) {
        if (event.path !== this.currentPath)
            return;

        let entry = this.fileList.find(e => e.name === event.name);
        if (!entry) {
            if (event.mode !== "upload") {
                log.warn(LogCategory.FILE_TRANSFER, tr("Having file download start notification for current path, but target file is unknown (%s%s)"), event.path, event.name);
                return;
            }

            entry = {
                name: event.name,
                path: event.path,

                type: FileType.FILE,
                mode: "uploading",
                virtual: true,
                datetime: Date.now(),
                size: -1
            };
            this.fileList.push(entry);
            this.forceUpdate();
        }

        entry.transfer = {
            status: "pending",
            direction: event.mode,
            id: event.id,
            percent: 0
        };
    }

    @EventHandler<FileBrowserEvents>("notify_transfer_status")
    private handleTransferStatus(event: FileBrowserEvents["notify_transfer_status"]) {
        const index = this.fileList.findIndex(e => e.transfer?.id === event.id);
        if (index === -1) {
            return;
        }

        let element = this.fileList[index];
        if (event.status === "errored") {
            if (element.mode === "uploading") {
                /* re query files, because we don't know what the server did with the errored upload */
                this.props.events.fire("query_files", {path: this.currentPath});
                return;
            }
        } else {
            element.transfer.status = event.status;
            if (element.mode === "uploading" && event.status === "finished") {
                /* upload finished, the element rerenders already with the correct values */
                element.size = event.fileSize;
                element.mode = "normal";
            }
        }
    }
}

