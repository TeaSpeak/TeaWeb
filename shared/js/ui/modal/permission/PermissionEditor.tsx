import * as React from "react";
import {useEffect, useRef, useState} from "react";
import {FlatInputField} from "tc-shared/ui/react-elements/InputField";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {EventHandler, ReactEventHandler, Registry} from "tc-shared/events";
import {Switch} from "tc-shared/ui/react-elements/Switch";
import PermissionType from "tc-shared/permission/PermissionType";
import * as log from "tc-shared/log";
import {LogCategory} from "tc-shared/log";

import ResizeObserver from "resize-observer-polyfill";
import {LoadingDots} from "tc-shared/ui/react-elements/LoadingDots";
import {Button} from "tc-shared/ui/react-elements/Button";
import {IconRenderer, LocalIconRenderer} from "tc-shared/ui/react-elements/Icon";
import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import * as contextmenu from "tc-shared/ui/elements/ContextMenu";
import {copy_to_clipboard} from "tc-shared/utils/helpers";
import {createInfoModal} from "tc-shared/ui/elements/Modal";

const cssStyle = require("./PermissionEditor.scss");

export interface EditorGroupedPermissions {
    groupId: string,
    groupName: string,
    permissions: {
        id: number,
        name: string;
        description: string;
    }[],
    children: EditorGroupedPermissions[]
}

type PermissionEditorMode = "unset" | "no-permissions" | "normal";
export interface PermissionEditorEvents {
    action_set_mode: { mode: PermissionEditorMode, failedPermission?: string }
    action_toggle_client_button: { visible: boolean },
    action_toggle_client_list: { visible: boolean },

    action_set_filter: { filter?: string }
    action_set_assigned_only: { value: boolean }

    action_set_default_value: { value: number },

    action_open_icon_select: { iconId?: number }
    action_set_senseless_permissions: { permissions: string[] }

    action_remove_permissions: {
        permissions: {
            name: string;
            mode: "value" | "grant";
        }[]
    }
    action_remove_permissions_result: {
        permissions: {
            name: string;
            mode: "value" | "grant";
            success: boolean;
        }[]
    }

    action_set_permissions: {
        permissions: {
            name: string;

            mode: "value" | "grant";

            value?: number;
            flagNegate?: boolean;
            flagSkip?: boolean;
        }[]
    }
    action_set_permissions_result: {
        permissions: {
            name: string;

            mode: "value" | "grant";

            newValue?: number; /* undefined if it didnt worked */
            flagNegate?: boolean;
            flagSkip?: boolean;
        }[]
    }

    action_toggle_group: {
        groupId: string | null; /* if null, all groups are affected */
        collapsed: boolean;
    }

    action_start_permission_edit: {
        target: "value" | "grant";
        permission: string;
        defaultValue: number;
    },

    action_add_permission_group: {
        groupId: string,
        mode: "value" | "grant";
    },
    action_remove_permission_group: {
        groupId: string
        mode: "value" | "grant";
    }

    query_permission_list: {},
    query_permission_list_result: {
        hideSenselessPermissions: boolean;
        permissions: EditorGroupedPermissions[]
    },

    query_permission_values: {},
    query_permission_values_result: {
        status: "error" | "success"; /* no perms will cause a action_set_mode event with no permissions */

        error?: string;
        permissions?: {
            name: string;
            value?: number;
            flagNegate?: boolean;
            flagSkip?: boolean;
            granted?: number;
        }[]
    }
}

const ButtonIconPreview = (props: { events: Registry<PermissionEditorEvents>, connection: ConnectionHandler }) => {
    const [ iconId, setIconId ] = useState(0);
    const [ unset, setUnset ] = useState(true);

    props.events.reactUse("action_set_mode", event => setUnset(event.mode !== "normal"));

    props.events.reactUse("action_remove_permissions_result", event => {
        const iconPermission = event.permissions.find(e => e.name === PermissionType.I_ICON_ID);
        if(!iconPermission || !iconPermission.success) return;

        if(iconPermission.mode === "value")
            setIconId(0);
    });

    props.events.reactUse("action_set_permissions_result", event => {
        const iconPermission = event.permissions.find(e => e.name === PermissionType.I_ICON_ID);
        if(!iconPermission) return;

        if(typeof iconPermission.newValue === "number")
            setIconId(iconPermission.newValue);
    });

    props.events.reactUse("query_permission_values_result", event => {
        if(event.status !== "success") {
            setIconId(0);
            return;
        }

        const permission = event.permissions.find(e => e.name === PermissionType.I_ICON_ID);
        if(!permission) {
            setIconId(0);
            return;
        }

        if(typeof permission.value === "number") {
            setIconId(permission.value >>> 0);
        } else {
            setIconId(0);
        }
    });

    let icon;
    if(!unset && iconId > 0)
        icon = <LocalIconRenderer key={"icon-" + iconId} icon={props.connection.fileManager.icons.load_icon(iconId)} />;

    return (
        <div className={cssStyle.containerIconSelect}>
            <div className={cssStyle.preview} onClick={() => props.events.fire("action_open_icon_select", { iconId: iconId })}>
                { icon }
            </div>
            <div className={cssStyle.containerDropdown}>
                <div className={cssStyle.button}>
                    <div className="arrow down" />
                </div>
                <div className={cssStyle.dropdown}>
                    {iconId ? <div className={cssStyle.entry} key={"edit-icon"} onClick={() => props.events.fire("action_open_icon_select", { iconId: iconId })}>
                        <Translatable>Edit icon</Translatable>
                    </div> : undefined}
                    {iconId ? <div className={cssStyle.entry} key={"remove-icon"} onClick={() => props.events.fire("action_remove_permissions", { permissions: [{ name: PermissionType.I_ICON_ID, mode: "value" }] })}>
                        <Translatable>Remove icon</Translatable>
                    </div> : undefined}
                    {!iconId ? <div className={cssStyle.entry} key={"add-icon"} onClick={() => props.events.fire("action_open_icon_select", { iconId: 0 })}>
                        <Translatable>Add icon</Translatable>
                    </div> : undefined}
                </div>
            </div>
        </div>
    );
};

const ClientListButton = (props: { events: Registry<PermissionEditorEvents> }) => {
    const [ visible, setVisible ] = useState(true);
    const [ toggled, setToggled ] = useState(false);

    props.events.reactUse("action_toggle_client_button", event => setVisible(event.visible));
    props.events.reactUse("action_toggle_client_list", event => setToggled(event.visible));

    return <Button
        key={"button-clients"}
        className={cssStyle.clients + " " + (visible ? "" : cssStyle.hidden)}
        color={"green"}
        onClick={() => props.events.fire("action_toggle_client_list", { visible: !toggled })}>
        <Translatable>{toggled ? "Hide clients in group" : "Show clients in group"}</Translatable>
    </Button>
};

const MenuBar = (props: { events: Registry<PermissionEditorEvents>, connection: ConnectionHandler }) => {
    return <div className={cssStyle.containerMenuBar}>
        <ClientListButton events={props.events} />
        <FlatInputField
            className={cssStyle.filter}

            label={<Translatable>Filter permissions</Translatable>}
            labelType={"floating"}
            labelClassName={cssStyle.label}
            labelFloatingClassName={cssStyle.labelFloating}
            onInput={text => props.events.fire("action_set_filter", { filter: text })}
        />
        <div className={cssStyle.options}>
            <Switch initialState={false} label={<Translatable>Assigned only</Translatable>} onChange={state => props.events.fire("action_set_assigned_only", { value: state })} />
            { /* <Switch initialState={true} label={<Translatable>Editable only</Translatable>} /> */ }
        </div>
        <ButtonIconPreview events={props.events} connection={props.connection} />
    </div>;
};

interface LinkedGroupedPermissions {
    groupId: string;
    groupName: string;

    depth: number;
    parent: LinkedGroupedPermissions | undefined;
    children: LinkedGroupedPermissions[];

    permissions: {
        id: number;
        name: string;
        description: string;

        elementVisible: boolean;
    }[],
    anyPermissionVisible: boolean;

    nextGroup: LinkedGroupedPermissions;
    nextIfCollapsed: LinkedGroupedPermissions;

    collapsed: boolean;

    elementVisible: boolean;
}

const PermissionEntryRow = (props: {
    events: Registry<PermissionEditorEvents>,
    groupId: string,
    permission: string,
    value: PermissionValue,
    isOdd: boolean,
    depth: number,
    offsetTop: number,
    defaultValue: number,
    description: string
}) => {
    const [ defaultValue, setDefaultValue ] = useState(props.defaultValue);
    const [ value, setValue ] = useState<number>(props.value.value);
    const [ forceValueUpdate, setForceValueUpdate ] = useState(false);
    const [ valueEditing, setValueEditing ] = useState(false);
    const [ valueApplying, setValueApplying ] = useState(false);

    const [ flagNegated, setFlagNegated ] = useState(props.value.flagNegate);
    const [ flagSkip, setFlagSkip ] = useState(props.value.flagSkip);

    const [ granted, setGranted ] = useState(props.value.granted);
    const [ forceGrantedUpdate, setForceGrantedUpdate ] = useState(false);
    const [ grantedEditing, setGrantedEditing ] = useState(false);
    const [ grantedApplying, setGrantedApplying ] = useState(false);

    const refGranted = useRef<HTMLInputElement>();
    const refValueI = useRef<HTMLInputElement>();
    const refValueB = useRef<Switch>();

    const refSkip = useRef<Switch>();
    const refNegate = useRef<Switch>();

    const isActive = typeof value === "number" || typeof granted === "number";
    const isBoolPermission = props.permission.startsWith("b_");

    let valueElement, skipElement, negateElement, grantedElement;
    if(typeof value === "number") {
        if(isBoolPermission) {
            valueElement = <Switch ref={refValueB} key={"value-b"} initialState={value >= 1} disabled={valueApplying} onChange={flag => {
                props.events.fire("action_set_permissions", { permissions: [{ name: props.permission, mode: "value", value: flag ? 1 : 0, flagSkip: flagSkip, flagNegate: flagNegated }]});
            }} onBlur={() => setValueEditing(false)} />;
        } else if(valueApplying) {
            valueElement = <input key={"value-i-applying"} className={cssStyle.applying} type="number" placeholder={tr("applying")} readOnly={true} onChange={() => {}} />;
        } else {
            valueElement = <input ref={refValueI} key={"value-i"} type="number" disabled={valueApplying} defaultValue={value} onBlur={() => {
                setValueEditing(false);
                if(!refValueI.current)
                    return;

                const newValue = refValueI.current.value;
                if(newValue === "") {
                    if(typeof value !== "number" && !forceValueUpdate) {
                        /* no change */
                        return;
                    }

                    setForceValueUpdate(false);
                    props.events.fire("action_remove_permissions", { permissions: [{ name: props.permission, mode: "value" }] });
                } else {
                    const numberValue = parseInt(newValue);
                    if(isNaN(numberValue)) return;
                    if(numberValue === value && !forceValueUpdate) {
                        /* no change */
                        return;
                    }

                    setForceValueUpdate(false);
                    props.events.fire("action_set_permissions", { permissions: [{ name: props.permission, mode: "value", value: numberValue, flagSkip: flagSkip, flagNegate: flagNegated }]});
                }
            }} onChange={() => {}} onKeyPress={e => e.key === "Enter" && e.currentTarget.blur()} />;
        }

        skipElement = <Switch key={"skip"} initialState={flagSkip} disabled={valueApplying} onChange={flag => {
            props.events.fire("action_set_permissions", { permissions: [{ name: props.permission, mode: "value", value: value, flagSkip: flag, flagNegate: flagNegated }]});
        }} />;
        negateElement = <Switch key={"negate"} initialState={flagNegated} disabled={valueApplying} onChange={flag => {
            props.events.fire("action_set_permissions", { permissions: [{ name: props.permission, mode: "value", value: value, flagSkip: flagSkip, flagNegate: flag }]});
        }} />;
    }

    if(typeof granted === "number") {
        if(grantedApplying) {
            grantedElement = <input key={"grant-applying"} className={cssStyle.applying} type="number" placeholder={tr("applying")} readOnly={true} onChange={() => {}} />;
        } else {
            grantedElement = <input ref={refGranted} key={"grant"} type="number" defaultValue={granted} onBlur={() => {
                setGrantedEditing(false);
                if(!refGranted.current)
                    return;

                const newValue = refGranted.current.value;
                if(newValue === "") {
                    if(typeof granted === "undefined")
                        return;

                    setForceGrantedUpdate(true);
                    props.events.fire("action_remove_permissions", { permissions: [{ name: props.permission, mode: "grant" }] });
                } else {
                    const numberValue = parseInt(newValue);
                    if(isNaN(numberValue)) return;
                    if(numberValue === granted && !forceGrantedUpdate) {
                        /* no change */
                        return;
                    }

                    setForceGrantedUpdate(true);
                    props.events.fire("action_set_permissions", { permissions: [{ name: props.permission, mode: "grant", value: numberValue }]});
                }
            }} onChange={() => {}} onKeyPress={e => e.key === "Enter" && e.currentTarget.blur()} />;
        }
    }

    props.events.reactUse("action_start_permission_edit", event => {
        if(event.permission !== props.permission)
            return;

        if(event.target === "grant") {
            setGranted(event.defaultValue);
            setGrantedEditing(true);
            setForceGrantedUpdate(true);
        } else {
            if(isBoolPermission && typeof value === "undefined") {
                setValue(event.defaultValue >= 1 ? 1 : 0);
                props.events.fire("action_set_permissions", { permissions: [{ name: props.permission, mode: "value", value: event.defaultValue >= 1 ? 1 : 0, flagSkip: flagSkip, flagNegate: flagNegated }]});
            } else {
                setValue(event.defaultValue);
                setForceValueUpdate(true);
                setValueEditing(true);
            }
        }
    });

    props.events.reactUse("action_set_permissions", event => {
        const values = event.permissions.find(e => e.name === props.permission);
        if(!values) return;

        if(values.mode === "value") {
            setValueApplying(true);
            refSkip.current?.setState({ disabled: true });
            refNegate.current?.setState({ disabled: true });
        } else {
            setGrantedApplying(true);
        }
    });

    props.events.reactUse("action_set_permissions_result", event => {
        const result = event.permissions.find(e => e.name === props.permission);
        if(!result) return;

        if(result.mode === "value") {
            setValueApplying(false);
            if(typeof result.newValue === "number") {
                setValue(result.newValue);
                setFlagSkip(result.flagSkip);
                setFlagSkip(result.flagNegate);

                refValueB.current?.setState({ disabled: false, checked: result.newValue >= 1 });
                refSkip.current?.setState({ disabled: false, checked: result.flagSkip });
                refNegate.current?.setState({ disabled: false, checked: result.flagNegate });
                refValueI.current && (refValueI.current.value = result.newValue.toString());

                props.value.value = result.newValue;
                props.value.flagSkip = result.flagSkip;
                props.value.flagNegate = result.flagNegate;
            } else {
                refValueB.current?.setState({ disabled: false, checked: props.value.value >= 1 });
                refSkip.current?.setState({ disabled: false, checked: props.value.flagSkip });
                refNegate.current?.setState({ disabled: false, checked: props.value.flagNegate });
                refValueI.current && (refValueI.current.value = props.value.value?.toString());

                setValue(props.value.value);
                setFlagSkip(props.value.flagSkip);
                setFlagSkip(props.value.flagNegate);
            }
        } else {
            setGrantedApplying(false);
            if(typeof result.newValue === "number") {
                setGranted(result.newValue);
                refGranted.current && (refGranted.current.value = result.newValue.toString());
            } else {
                setGranted(props.value.granted);
                refGranted.current && (refGranted.current.value = props.value.granted?.toString());
            }
        }
    });

    props.events.reactUse("action_remove_permissions", event => {
        const modes = event.permissions.find(e => e.name === props.permission);
        if(!modes) return;

        if(modes.mode === "value") {
            setValueApplying(true);
            refValueB.current?.setState({ disabled: true });
            refSkip.current?.setState({ disabled: true });
            refNegate.current?.setState({ disabled: true });
        }

        if(modes.mode === "grant")
            setGrantedApplying(true);
    });

    props.events.reactUse("action_remove_permissions_result", event => {
        const modes = event.permissions.find(e => e.name === props.permission);
        if(!modes) return;

        if(modes.mode === "value") {
            modes.success && setValue(undefined);
            setValueApplying(false);
            setValueEditing(false);

            modes.success && setFlagSkip(false);
            modes.success && setFlagNegated(false);
        }

        if(modes.mode === "grant") {
            modes.success && setGranted(undefined);
            setGrantedEditing(false);
            setGrantedApplying(false);
        }
    });

    props.events.reactUse("action_set_default_value", event => setDefaultValue(event.value));

    useEffect(() => {
        if(grantedEditing)
            refGranted.current?.focus();

        if(valueEditing) {
            refValueI.current?.focus();
            refValueB.current?.focus();
        }
    });

    return (
        <div
            className={cssStyle.row + " " + cssStyle.permission + " " + (props.isOdd ? "" : cssStyle.even) + " " + (isActive ? cssStyle.active : "")}
            style={{ paddingLeft: (props.depth + 1) + "em", top: props.offsetTop }}
            onDoubleClick={e => {
                if(e.isDefaultPrevented())
                    return;

                props.events.fire("action_start_permission_edit", { permission: props.permission, target: "value", defaultValue: defaultValue });
                e.preventDefault();
            }}
            onContextMenu={e => {
                e.preventDefault();

                let entries: contextmenu.MenuEntry[] = [];
                if(typeof value === "undefined") {
                    entries.push({
                        type: contextmenu.MenuEntryType.ENTRY,
                        name: tr("Add permission"),
                        callback: () => props.events.fire("action_start_permission_edit", { permission: props.permission, target: "value", defaultValue: defaultValue })
                    });
                } else {
                    entries.push({
                        type: contextmenu.MenuEntryType.ENTRY,
                        name: tr("Remove permission"),
                        callback: () => props.events.fire("action_remove_permissions", { permissions: [{ name: props.permission, mode: "value" }] })
                    });
                }

                if(typeof granted === "undefined") {
                    entries.push({
                        type: contextmenu.MenuEntryType.ENTRY,
                        name: tr("Add grant permission"),
                        callback: () => props.events.fire("action_start_permission_edit", { permission: props.permission, target: "grant", defaultValue: defaultValue })
                    });
                } else {
                    entries.push({
                        type: contextmenu.MenuEntryType.ENTRY,
                        name: tr("Remove grant permission"),
                        callback: () => props.events.fire("action_remove_permissions", { permissions: [{ name: props.permission, mode: "grant" }] })
                    });
                }

                entries.push(contextmenu.Entry.HR());
                entries.push({
                    type: contextmenu.MenuEntryType.ENTRY,
                    name: tr("Collapse group"),
                    callback: () => props.events.fire("action_toggle_group", { groupId: props.groupId, collapsed: true })
                });
                entries.push({
                    type: contextmenu.MenuEntryType.ENTRY,
                    name: tr("Expend all"),
                    callback: () => props.events.fire("action_toggle_group", { groupId: null, collapsed: false })
                });
                entries.push({
                    type: contextmenu.MenuEntryType.ENTRY,
                    name: tr("Collapse all"),
                    callback: () => props.events.fire("action_toggle_group", { groupId: null, collapsed: true })
                });
                entries.push(contextmenu.Entry.HR());
                entries.push({
                    type: contextmenu.MenuEntryType.ENTRY,
                    name: tr("Show permission description"),
                    callback: () => {
                        createInfoModal(
                            tr("Permission description"),
                            tr("Permission description for permission ") + props.permission + ": <br>" + props.description
                        ).open();
                    }
                });
                entries.push({
                    type: contextmenu.MenuEntryType.ENTRY,
                    name: tr("Copy permission name"),
                    callback: () => copy_to_clipboard(props.permission)
                });

                contextmenu.spawn_context_menu(e.pageX, e.pageY, ...entries);
            }}
        >
            <div className={cssStyle.columnName}>
                {props.permission}
            </div>
            <div className={cssStyle.columnValue}>{valueElement}</div>
            <div className={cssStyle.columnSkip}>{skipElement}</div>
            <div className={cssStyle.columnNegate}>{negateElement}</div>
            <div className={cssStyle.columnGranted} onDoubleClick={e => {
                props.events.fire("action_start_permission_edit", { permission: props.permission, target: "grant", defaultValue: defaultValue });
                e.preventDefault();
            }}>{grantedElement}</div>
        </div>
    );
};

const PermissionGroupRow = (props: { events: Registry<PermissionEditorEvents>, group: LinkedGroupedPermissions, isOdd: boolean, offsetTop: number }) => {
    const [ collapsed, setCollapsed ] = useState(props.group.collapsed);

    props.events.reactUse("action_toggle_group", event => {
        if(event.groupId !== null && event.groupId !== props.group.groupId)
            return;

        setCollapsed(event.collapsed);
    });

    return (
        <div className={cssStyle.row + " " + cssStyle.group + " " + (props.isOdd ? "" : cssStyle.even)} style={{ paddingLeft: props.group.depth + "em", top: props.offsetTop }} onContextMenu={e => {
            e.preventDefault();

            let entries = [];
            entries.push({
                type: contextmenu.MenuEntryType.ENTRY,
                name: tr("Add permissions to this group"),
                callback: () => props.events.fire("action_add_permission_group", { groupId: props.group.groupId, mode: "value" })
            });
            entries.push({
                type: contextmenu.MenuEntryType.ENTRY,
                name: tr("Remove permissions from this group"),
                callback: () => props.events.fire("action_remove_permission_group", { groupId: props.group.groupId, mode: "value" })
            });
            entries.push({
                type: contextmenu.MenuEntryType.ENTRY,
                name: tr("Add granted permissions to this group"),
                callback: () => props.events.fire("action_add_permission_group", { groupId: props.group.groupId, mode: "grant" })
            });
            entries.push({
                type: contextmenu.MenuEntryType.ENTRY,
                name: tr("Remove granted permissions from this group"),
                callback: () => props.events.fire("action_remove_permission_group", { groupId: props.group.groupId, mode: "grant" })
            });
            entries.push(contextmenu.Entry.HR());
            if(collapsed) {
                entries.push({
                    type: contextmenu.MenuEntryType.ENTRY,
                    name: tr("Expend group"),
                    callback: () => props.events.fire("action_toggle_group", { groupId: props.group.groupId, collapsed: false })
                });
            } else {
                entries.push({
                    type: contextmenu.MenuEntryType.ENTRY,
                    name: tr("Collapse group"),
                    callback: () => props.events.fire("action_toggle_group", { groupId: props.group.groupId, collapsed: true })
                });
            }
            entries.push({
                type: contextmenu.MenuEntryType.ENTRY,
                name: tr("Expend all"),
                callback: () => props.events.fire("action_toggle_group", { groupId: null, collapsed: false })
            });
            entries.push({
                type: contextmenu.MenuEntryType.ENTRY,
                name: tr("Collapse all"),
                callback: () => props.events.fire("action_toggle_group", { groupId: null, collapsed: true })
            });
            contextmenu.spawn_context_menu(e.pageX, e.pageY, ...entries);
        }}
         onDoubleClick={() => props.events.fire("action_toggle_group", { collapsed: !collapsed, groupId: props.group.groupId })}
        >
            <div className={cssStyle.columnName}>
                <div className={"arrow " + (collapsed ? "right" : "down")} onClick={() => props.events.fire("action_toggle_group", { collapsed: !collapsed, groupId: props.group.groupId })} />
                <div className={cssStyle.groupName} title={/* @tr-ignore */ tr(props.group.groupName)}><Translatable>{props.group.groupName}</Translatable></div>
            </div>
            <div className={cssStyle.columnValue} />
            <div className={cssStyle.columnSkip} />
            <div className={cssStyle.columnNegate} />
            <div className={cssStyle.columnGranted} />
        </div>
    );
};

type PermissionValue = { value?: number, flagNegate?: boolean, flagSkip?: boolean, granted?: number };

@ReactEventHandler<PermissionList>(e => e.props.events)
class PermissionList extends React.Component<{ events: Registry<PermissionEditorEvents> }, { state: "loading" | "normal" | "error", viewHeight: number, scrollOffset: number, error?: string }> {
    private readonly refContainer = React.createRef<HTMLDivElement>();
    private resizeObserver: ResizeObserver;

    private permissionsHead: LinkedGroupedPermissions;
    private permissionByGroupId: {[key: string]: LinkedGroupedPermissions} = {};
    private permissionValuesByName: {[key: string]: PermissionValue} = {};

    private hideSenselessPermissions = true;
    private senselessPermissions: string[] = [];

    private currentListElements: React.ReactElement[] = [];
    private heightPerElement = 28; /* default font size 28px */
    private heightPerElementInitialized = false;

    private filterText: string | undefined;
    private filterAssignedOnly: boolean = false;

    private loadingPermissionList = true;
    private loadingPermissionValues = false;

    private defaultPermissionValue = 1;

    constructor(props) {
        super(props);

        this.state = {
            viewHeight: 0,
            scrollOffset: 0,
            state: "loading"
        }
    }

    render() {
        const view = this.visibleEntries();
        let elements = this.state.state === "normal" ? this.currentListElements.slice(Math.max(0, view.begin - 5), Math.min(view.end + 5, this.currentListElements.length)) : [];

        return (
            <div className={cssStyle.body} ref={this.refContainer} onScroll={() => this.state.state === "normal" && this.setState({ scrollOffset: this.refContainer.current.scrollTop })} onContextMenu={e => {
                if(e.isDefaultPrevented())
                    return;

                e.preventDefault();
                contextmenu.spawn_context_menu(e.pageX, e.pageY, {
                    type: contextmenu.MenuEntryType.ENTRY,
                    name: tr("Expend all"),
                    callback: () => this.props.events.fire("action_toggle_group", { groupId: null, collapsed: false })
                }, {
                    type: contextmenu.MenuEntryType.ENTRY,
                    name: tr("Collapse all"),
                    callback: () => this.props.events.fire("action_toggle_group", { groupId: null, collapsed: true })
                });
            }}>
                {elements}
                <div key={"space"} className={cssStyle.spaceAllocator} style={{height: this.state.state === "normal" ? this.currentListElements.length * this.heightPerElement : 0}} />
                <div key={"loading"} className={cssStyle.overlay + " " + (this.state.state === "loading" ? "" : cssStyle.hidden)}>
                    <a title={tr("loading")}><Translatable>loading</Translatable> <LoadingDots maxDots={3} /></a>
                </div>
                <div key={"error"} className={cssStyle.overlay + " " + cssStyle.error + " " + (this.state.state === "error" ? "" : cssStyle.hidden)}>
                    <a title={tr("An error happened")}>{this.state.error}</a>
                </div>
            </div>
        )
    }

    private visibleEntries() {
        let view_entry_count = Math.ceil(this.state.viewHeight / this.heightPerElement);
        const view_entry_begin = Math.floor(this.state.scrollOffset / this.heightPerElement);
        const view_entry_end = Math.min(this.currentListElements.length, view_entry_begin + view_entry_count);

        return {
            begin: view_entry_begin,
            end: view_entry_end
        }
    }

    componentDidMount(): void {
        this.resizeObserver = new ResizeObserver(entries => {
            if(entries.length !== 1) {
                if(entries.length === 0)
                    log.warn(LogCategory.PERMISSIONS, tr("Permission editor resize observer fired resize event with no entries!"));
                else
                    log.warn(LogCategory.PERMISSIONS, tr("Permission editor resize observer fired resize event with more than one entry which should not be possible (%d)!"), entries.length);
                return;
            }
            const bounds = entries[0].contentRect;
            if(this.state.viewHeight !== bounds.height) {
                log.debug(LogCategory.PERMISSIONS, tr("Handling height update and change permission view height to %d from %d"), bounds.height, this.state.viewHeight);
                this.setState({
                    viewHeight: bounds.height
                });
            }
        });
        this.resizeObserver.observe(this.refContainer.current);

        this.props.events.fire("query_permission_list");
    }

    componentWillUnmount(): void {
        this.resizeObserver.disconnect();
        this.resizeObserver = undefined;
    }

    private initializeElementHeight() {
        if(this.heightPerElementInitialized)
            return;

        requestAnimationFrame(() => {
            const firstElement = this.refContainer.current?.firstElementChild;
            /* the first element might be the space allocator in cases without any shown row elements */
            if(firstElement && firstElement.classList.contains(cssStyle.row)) {
                this.heightPerElementInitialized = true;
                const rect = firstElement.getBoundingClientRect();
                if(this.heightPerElement !== rect.height) {
                    this.heightPerElement = rect.height;
                    this.updateReactComponents();
                }
            }
        });
    }

    componentDidUpdate(prevProps: Readonly<{ events: Registry<PermissionEditorEvents> }>, prevState: Readonly<{ state: "loading" | "normal" | "error", viewHeight: number, scrollOffset: number, error?: string }>, snapshot?: any): void {
        if(prevState.state !== "normal" && this.state.state === "normal")
            requestAnimationFrame(() => this.refContainer.current.scrollTop = this.state.scrollOffset);
        if(this.state.state === "normal")
            this.initializeElementHeight();
    }

    @EventHandler<PermissionEditorEvents>("query_permission_list")
    private handlePermissionListQuery() {
        this.loadingPermissionList = true;
        this.setState({ state: "loading" });
    }

    @EventHandler<PermissionEditorEvents>("query_permission_list_result")
    private handlePermissionList(event: PermissionEditorEvents["query_permission_list_result"]) {
        this.loadingPermissionList = false;

        this.hideSenselessPermissions = event.hideSenselessPermissions;
        const visitGroup = (group: EditorGroupedPermissions, parent: LinkedGroupedPermissions, depth: number): LinkedGroupedPermissions => {
            const result: LinkedGroupedPermissions = {
                groupName: group.groupName,
                groupId: group.groupId,

                collapsed: false,

                permissions: group.permissions.map(e => {
                    return {
                        name: e.name,
                        id: e.id,
                        description: e.description,

                        elementVisible: true
                    }
                }),
                anyPermissionVisible: true,

                depth: depth,
                parent: parent,
                children: [],

                nextGroup: undefined,
                nextIfCollapsed: undefined, /* will be set later */

                elementVisible: true,
            };

            if(group.children && group.children.length > 0) {
                result.nextGroup = visitGroup(group.children[0], result, depth + 1);
                result.children.push(result.nextGroup);

                let currentHead = result.nextGroup;
                for(let index = 1; index < group.children.length; index++) {
                    currentHead.nextIfCollapsed = visitGroup(group.children[index], result, depth + 1);
                    currentHead = currentHead.nextIfCollapsed;
                    result.children.push(currentHead);
                }
            }

            return result;
        };

        this.permissionsHead = visitGroup(event.permissions[0], undefined, 0);
        let currentHead = this.permissionsHead;
        for(let index = 1; index < event.permissions.length; index++) {
            currentHead.nextIfCollapsed = visitGroup(event.permissions[index], undefined, 0);
            currentHead = currentHead.nextIfCollapsed;
        }

        /* fixup the next group linkage */
        currentHead = this.permissionsHead;
        while(currentHead) {
            if(!currentHead.nextIfCollapsed && currentHead.parent)
                currentHead.nextIfCollapsed = currentHead.parent.nextIfCollapsed;

            if(!currentHead.nextGroup)
                currentHead.nextGroup = currentHead.nextIfCollapsed;

            currentHead = currentHead.nextGroup;
        }

        /* build up the group key index */
        this.permissionByGroupId = {};
        currentHead = this.permissionsHead;
        while(currentHead) {
            this.permissionByGroupId[currentHead.groupId] = currentHead;
            currentHead = currentHead.nextGroup;
        }

        this.setState({ state: this.loadingPermissionList || this.loadingPermissionValues ? "loading" :  this.state.error ? "error" : "normal" });
        this.updateReactComponents();
    }

    @EventHandler<PermissionEditorEvents>("action_set_senseless_permissions")
    private handleSenselessPermissions(event: PermissionEditorEvents["action_set_senseless_permissions"]) {
        this.senselessPermissions = event.permissions.slice(0);
        this.updateReactComponents();
    }

    @EventHandler<PermissionEditorEvents>("query_permission_values")
    private handleRequestPermissionValues() {
        this.loadingPermissionValues = true;
        this.setState({ state: "loading" });
    }

    @EventHandler<PermissionEditorEvents>("query_permission_values_result")
    private handleRequestPermissionValuesResult(event: PermissionEditorEvents["query_permission_values_result"]) {
        this.loadingPermissionValues = false;
        this.permissionValuesByName = {};

        Object.values(this.permissionValuesByName).forEach(e => { e.value = undefined; e.granted = undefined; });
        (event.permissions || []).forEach(permission => Object.assign(this.permissionValuesByName[permission.name] || (this.permissionValuesByName[permission.name] = {}), {
            value: permission.value,
            granted: permission.granted,
            flagNegate: permission.flagNegate,
            flagSkip: permission.flagSkip
        }));

        this.setState({
            state: this.loadingPermissionList || this.loadingPermissionValues ? "loading" : event.status !== "success" ? "error" : "normal" ,
            error: event.error
        });

        if(event.status === "success")
            this.updateReactComponents();
    }

    @EventHandler<PermissionEditorEvents>("action_set_permissions_result")
    private handlePermissionSetResult(event: PermissionEditorEvents["action_set_permissions_result"]) {
        event.permissions.forEach(e => {
            if(typeof e.newValue !== "number")
                return;

            const values = this.permissionValuesByName[e.name] || (this.permissionValuesByName[e.name] = {});
            if(e.mode === "value") {
                values.value = e.newValue;
                values.flagSkip = e.flagSkip;
                values.flagNegate = e.flagNegate;
            } else {
                values.granted = e.newValue;
            }
        });
    }

    @EventHandler<PermissionEditorEvents>("action_remove_permissions_result")
    private handlePermissionRemoveResult(event: PermissionEditorEvents["action_remove_permissions_result"]) {
        event.permissions.forEach(e => {
            if(!e.success)
                return;

            const values = this.permissionValuesByName[e.name] || (this.permissionValuesByName[e.name] = {});
            if(e.mode === "value") {
                values.value = undefined;
                values.flagSkip = false;
                values.flagNegate = false;
            } else {
                values.granted = undefined;
            }
        });
    }

    @EventHandler<PermissionEditorEvents>("action_toggle_group")
    private handleToggleGroup(event: PermissionEditorEvents["action_toggle_group"]) {
        if(event.groupId === null) {
            Object.values(this.permissionByGroupId).forEach(e => e.collapsed = event.collapsed);
        } else {
            const group = this.permissionByGroupId[event.groupId];
            if(!group) {
                console.warn(tr("Received group toogle for unknwon group: %s"), event.groupId);
                return;
            }

            if(group.collapsed === event.collapsed)
                return;

            group.collapsed = event.collapsed;
        }
        this.updateReactComponents();
    }

    @EventHandler<PermissionEditorEvents>("action_set_filter")
    private handleSetFilter(event: PermissionEditorEvents["action_set_filter"]) {
        if(this.filterText === event.filter)
            return;

        this.filterText = event.filter;
        this.updateReactComponents();
    }

    @EventHandler<PermissionEditorEvents>("action_set_assigned_only")
    private handleSetAssignedFilter(event: PermissionEditorEvents["action_set_assigned_only"]) {
        if(this.filterAssignedOnly === event.value)
            return;

        this.filterAssignedOnly = event.value;
        this.updateReactComponents();
    }

    @EventHandler<PermissionEditorEvents>("action_set_default_value")
    private handleSetDefaultPermissionValue(event: PermissionEditorEvents["action_set_default_value"]) {
        this.defaultPermissionValue = event.value;
    }

    @EventHandler<PermissionEditorEvents>("action_add_permission_group")
    private handleEnablePermissionGroup(event: PermissionEditorEvents["action_add_permission_group"]) {
        const group = this.permissionByGroupId[event.groupId];
        if(!group) return;

        const permissions: { id: number, name: string, elementVisible: boolean }[] = [];
        const visitGroup = (group: LinkedGroupedPermissions) => {
            permissions.push(...group.permissions);
            group.children.forEach(visitGroup);
        };
        visitGroup(group);

        this.props.events.fire("action_set_permissions", {
            permissions: permissions.map(e => {
                return {
                    name: e.name,
                    mode: event.mode as "value" | "grant",

                    value: e.name.startsWith("b_") && event.mode === "value" ? 1 : this.defaultPermissionValue,
                    flagNegate: false,
                    flagSkip: false
                }
            })
        });
    }

    @EventHandler<PermissionEditorEvents>("action_remove_permission_group")
    private handleDisablePermissionGroup(event: PermissionEditorEvents["action_remove_permission_group"]) {
        const group = this.permissionByGroupId[event.groupId];
        if(!group) return;

        const permissions: { id: number, name: string, elementVisible: boolean }[] = [];
        const visitGroup = (group: LinkedGroupedPermissions) => {
            permissions.push(...group.permissions);
            group.children.forEach(visitGroup);
        };
        visitGroup(group);

        this.props.events.fire("action_remove_permissions", {
            permissions: permissions.map(e => {
                return {
                    name: e.name,
                    mode: event.mode as "value" | "grant",
                }
            })
        });
    }

    private updateReactComponents() {
        let currentGroup = this.permissionsHead;
        let visibleGroups: LinkedGroupedPermissions[] = [];
        while(currentGroup) {
            visibleGroups.push(currentGroup);
            if(currentGroup.collapsed) {
                currentGroup = currentGroup.nextIfCollapsed;
                continue;
            }

            currentGroup.anyPermissionVisible = false;
            for(const permission of currentGroup.permissions) {
                permission.elementVisible = false;
                if(this.filterText && permission.name.indexOf(this.filterText) === -1)
                    continue;

                if(this.hideSenselessPermissions && this.senselessPermissions.findIndex(e => e === permission.name) !== -1)
                    continue;

                const permissionValue = this.permissionValuesByName[permission.name] || (this.permissionValuesByName[permission.name] = {});
                if(this.filterAssignedOnly) {
                    if(typeof permissionValue.value !== "number" && typeof permissionValue.granted !== "number") {
                        continue;
                    }
                }

                permission.elementVisible = true;
                currentGroup.anyPermissionVisible = true;
            }

            currentGroup = currentGroup.nextGroup;
        }

        /* update the visibility from the bottom to the top */
        visibleGroups.sort((a, b) => b.depth - a.depth);
        visibleGroups.forEach(e => {
            for(const child of e.children) {
                if(child.elementVisible) {
                    e.elementVisible = true;
                    return;
                }
            }

            e.elementVisible = e.anyPermissionVisible;
        });

        /* lets build up the final list view */
        this.currentListElements = [];
        let index = 0;
        currentGroup = this.permissionsHead;
        while(currentGroup) {
            if(currentGroup.elementVisible) {
                this.currentListElements.push(<PermissionGroupRow key={"group-" + currentGroup.groupId} events={this.props.events} group={currentGroup} isOdd={index % 2 === 1} offsetTop={this.heightPerElement * index} />);
                index++;
            }

            if(currentGroup.collapsed) {
                currentGroup = currentGroup.nextIfCollapsed;
                continue;
            } else if(!currentGroup.elementVisible) {
                currentGroup = currentGroup.nextGroup;
                continue;
            }

            currentGroup.permissions.forEach(e => {
                if(!e.elementVisible)
                    return;

                this.currentListElements.push(<PermissionEntryRow
                    key={"permission-" + e.name + " - " + Math.random()} /* force a update of this */
                    events={this.props.events}
                    permission={e.name}
                    groupId={currentGroup.groupId}
                    isOdd={index % 2 === 1}
                    depth={currentGroup.depth}
                    offsetTop={this.heightPerElement * index}
                    value={this.permissionValuesByName[e.name] || {}}
                    defaultValue={this.defaultPermissionValue}
                    description={e.description}
                />);
                index++;
            });

            currentGroup = currentGroup.nextGroup;
        }

        this.forceUpdate();
    }
}

const PermissionTable = (props: { events: Registry<PermissionEditorEvents> }) => {
    const [ mode, setMode ] = useState<PermissionEditorMode>("unset");
    const [ failedPermission, setFailedPermission ] = useState(undefined);

    props.events.reactUse("action_set_mode", event => { setMode(event.mode); setFailedPermission(event.failedPermission); });

    return (
        <div className={cssStyle.permissionTable}>
            <div className={cssStyle.header}>
                <div className={cssStyle.row + " " + cssStyle.header}>
                    <div className={cssStyle.columnName}>
                        <a title={tr("Permission Name")}><Translatable>Permission Name</Translatable></a>
                    </div>
                    <div className={cssStyle.columnValue}>
                        <a title={tr("Value")}><Translatable>Value</Translatable></a>
                    </div>
                    <div className={cssStyle.columnSkip}>
                        <a title={tr("Skip")}><Translatable>Skip</Translatable></a>
                    </div>
                    <div className={cssStyle.columnNegate}>
                        <a title={tr("Negate")}><Translatable>Negate</Translatable></a>
                    </div>
                    <div className={cssStyle.columnGranted}>
                        <a title={tr("Granted")}><Translatable>Granted</Translatable></a>
                    </div>
                </div>
            </div>
            <PermissionList events={props.events} />
            <div className={cssStyle.overlay + " " + cssStyle.unset + " " + (mode === "unset" ? "" : cssStyle.hidden)} />

            <div className={cssStyle.overlay + " " + cssStyle.noPermissions + " " + (mode === "no-permissions" ? "" : cssStyle.hidden)}>
                <a><Translatable>You don't have the permissions to view this permissions</Translatable><br/>({failedPermission})</a>
            </div>
        </div>
    );
};

const RefreshButton = (props: { events: Registry<PermissionEditorEvents> }) => {
    const [ unset, setUnset ] = useState(true);
    const [ nextTime, setNextTime ] = useState(0);
    const refButton = useRef<Button>();

    props.events.reactUse("action_set_mode", event => setUnset(event.mode !== "normal" && event.mode !== "no-permissions"));
    props.events.reactUse("query_permission_values", () => {
        setNextTime(Date.now() + 5000);
        refButton.current?.setState({ disabled: true });
    });

    useEffect(() => {
        if(Date.now() >= nextTime) {
            refButton.current?.setState({ disabled: false });
            return;
        }

        const id = setTimeout(() => refButton.current?.setState({ disabled: false }), Math.max(0, nextTime - Date.now()));
        return () => clearTimeout(id);
    });

    return <Button
        ref={refButton}
        disabled={unset || Date.now() < nextTime}
        onClick={() => props.events.fire("query_permission_values")}
    >
        <IconRenderer icon={"client-check_update"} /> <Translatable>Update</Translatable>
    </Button>
};

interface PermissionEditorProperties {
    connection: ConnectionHandler;
    events: Registry<PermissionEditorEvents>;
}

interface PermissionEditorState {
    state: "no-permissions" | "unset" | "normal";
}

export class PermissionEditor extends React.Component<PermissionEditorProperties, PermissionEditorState> {
    render() {
        return [
            <MenuBar key={"menu-bar"} events={this.props.events} connection={this.props.connection} />,
            <PermissionTable key={"table"} events={this.props.events} />,
            <div key={"footer"} className={cssStyle.containerFooter}>
                <RefreshButton events={this.props.events} />
            </div>
        ]
    }

    componentDidMount(): void {
        this.props.events.fire("action_set_mode", { mode: "unset" });
    }
}