import {closeContextMenu, ContextMenuEntry, spawnContextMenu} from "tc-shared/ui/context-menu";
import {ClientIcon} from "svg-sprites/client-icons";

export interface MenuEntry {
    callback?: () => void;
    type: MenuEntryType;
    name: (() => string) | string;
    icon_class?: string;
    icon_path?: string;
    disabled?:  boolean;
    visible?: boolean;

    checkbox_checked?: boolean;

    invalidPermission?:  boolean;
    sub_menu?: MenuEntry[];
}

export enum MenuEntryType {
    CLOSE,
    ENTRY,
    CHECKBOX,
    HR,
    SUB_MENU
}

export class Entry {
    static HR() {
        return {
            callback: () => {},
            type: MenuEntryType.HR,
            name: "",
            icon: ""
        };
    };

    static CLOSE(callback: () => void) {
        return {
            callback: callback,
            type: MenuEntryType.CLOSE,
            name: "",
            icon: ""
        };
    }
}

export interface ContextMenuProvider {
    despawn_context_menu();
    spawn_context_menu(x: number, y: number, ...entries: MenuEntry[]);

    initialize();
    finalize();

    html_format_enabled() : boolean;
}

let provider: ContextMenuProvider;
export function spawn_context_menu(x: number, y: number, ...entries: MenuEntry[]) {
    if(!provider) {
        console.error(tr("Failed to spawn context menu! Missing provider!"));
        return;
    }

    provider.spawn_context_menu(x, y, ...entries);
}

export function despawn_context_menu() {
    if(!provider)
        return;

    provider.despawn_context_menu();
}

export function get_provider() : ContextMenuProvider { return provider; }
export function set_provider(_provider: ContextMenuProvider) {
    provider = _provider;
    provider.initialize();
}

class LegacyBridgeContextMenuProvider implements ContextMenuProvider {
    despawn_context_menu() {
        closeContextMenu();
    }

    finalize() { }
    initialize() { }

    html_format_enabled(): boolean {
        return false;
    }

    private static mapEntry(entry: MenuEntry, closeListener: (() => void)[]) : ContextMenuEntry | undefined {
        switch (entry.type) {
            case MenuEntryType.CLOSE:
                closeListener.push(entry.callback);
                break;

            case MenuEntryType.CHECKBOX:
                return {
                    type: "checkbox",
                    checked: entry.checkbox_checked,
                    label: typeof entry.name === "function" ? entry.name() : entry.name,
                    click: entry.callback,
                    enabled: !entry.disabled && !entry.invalidPermission,
                    visible: entry.visible
                };

            case MenuEntryType.ENTRY:
            case MenuEntryType.SUB_MENU:
                return {
                    type: "normal",
                    label: typeof entry.name === "function" ? entry.name() : entry.name,
                    click: entry.callback,
                    enabled: !entry.disabled && !entry.invalidPermission,
                    visible: entry.visible,
                    icon: entry.icon_class as ClientIcon,
                    subMenu: entry.sub_menu ? entry.sub_menu.map(entry => this.mapEntry(entry, closeListener)).filter(e => !!e) : undefined
                };

            case MenuEntryType.HR:
                return {
                    type: "separator",
                    visible: entry.visible
                };

            default:
                return undefined;
        }
    }

    spawn_context_menu(x: number, y: number, ...entries: MenuEntry[]) {
        const closeCallbacks = [];
        spawnContextMenu({ pageX: x, pageY: y }, entries.map(e => LegacyBridgeContextMenuProvider.mapEntry(e, closeCallbacks)).filter(e => !!e), () => closeCallbacks.forEach(callback => callback()));
    }
}

set_provider(new LegacyBridgeContextMenuProvider());