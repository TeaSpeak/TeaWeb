import {GroupedPermissions, PermissionInfo, PermissionValue} from "tc-shared/permission/PermissionManager";
import PermissionType from "tc-shared/permission/PermissionType";

export enum PermissionEditorMode {
    VISIBLE,
    NO_PERMISSION,
    UNSET
}

export abstract class AbstractPermissionEditor {
    protected _permissions: GroupedPermissions[];
    protected _listener_update: () => any;
    protected _listener_change: ChangeListener = () => Promise.resolve();
    protected _toggle_callback: () => string;

    icon_resolver: (id: number) => Promise<HTMLImageElement>;
    icon_selector: (current_id: number) => Promise<number>;

    protected constructor() {}

    abstract set_mode(mode: PermissionEditorMode);

    abstract initialize(permissions: GroupedPermissions[]);
    abstract html_tag() : JQuery;
    abstract set_permissions(permissions?: PermissionValue[]);
    abstract set_hidden_permissions(permissions: PermissionType[]);

    set_listener(listener?: ChangeListener) {
        this._listener_change = listener || (() => Promise.resolve());
    }

    set_listener_update(listener?: () => any) { this._listener_update = listener; }
    trigger_update() { if(this._listener_update) this._listener_update(); }

    abstract set_toggle_button(callback: () => string, initial: string);
}

export interface PermissionEntry {
    tag: JQuery;
    tag_value: JQuery;
    tag_grant: JQuery;
    tag_flag_negate: JQuery;
    tag_flag_skip: JQuery;

    id: number;
    filter: string;
    is_bool: boolean;

}

export interface ChangedPermissionValue {
    remove: boolean; /* if set remove the set permission (value or granted) */

    granted?: number;
    value?: number;

    flag_skip?: boolean;
    flag_negate?: boolean;
}

export type ChangeListener = (permission: PermissionInfo, value?: ChangedPermissionValue) => Promise<void>;