import {RemoteIcon} from "tc-shared/file/Icons";
import {ClientIcon} from "svg-sprites/client-icons";
import {tr} from "tc-shared/i18n/localize";

export type MenuEntryLabel = {
    text: string,
    bold?: boolean;
} | string;

export type MenuEntryClickable = {
    uniqueId?: string,
    label: MenuEntryLabel,

    enabled?: boolean;
    visible?: boolean;

    click?: () => void;
    icon?: RemoteIcon | ClientIcon;
}

export type ContextMenuEntryNormal = {
    type: "normal",
    subMenu?: ContextMenuEntry[],
} & MenuEntryClickable;

export type ContextMenuEntrySeparator = {
    uniqueId?: string,
    type: "separator",
    visible?: boolean
}

export type ContextMenuEntryCheckbox = {
    type: "checkbox",
    checked?: boolean;
} & MenuEntryClickable;

export type ContextMenuEntry = ContextMenuEntryNormal | ContextMenuEntrySeparator | ContextMenuEntryCheckbox;

export interface ContextMenuFactory {
    spawnContextMenu(position: { pageX: number, pageY: number }, entries: ContextMenuEntry[], callbackClose?: () => void);
    closeContextMenu();
}

let globalContextMenuFactory: ContextMenuFactory;
export function setGlobalContextMenuFactory(instance: ContextMenuFactory) {
    if(globalContextMenuFactory) {
        throw tr("the global context menu factory has already been set");
    }
    globalContextMenuFactory = instance;
}


export function spawnContextMenu(position: { pageX: number, pageY: number }, entries: ContextMenuEntry[], callbackClose?: () => void) {
    if(!globalContextMenuFactory) {
        throw tr("missing global context menu factory");
    }

    globalContextMenuFactory.spawnContextMenu(position, entries, callbackClose);
}


export function closeContextMenu() {
    if(!globalContextMenuFactory) {
        throw tr("missing global context menu factory");
    }

    globalContextMenuFactory.closeContextMenu();
}