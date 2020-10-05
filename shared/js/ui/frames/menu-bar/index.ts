import {ClientIcon} from "svg-sprites/client-icons";
import {RemoteIconInfo} from "tc-shared/file/Icons";

export type MenuBarEntrySeparator = {
    uniqueId?: string,
    type: "separator"
};
export type MenuBarEntryNormal = {
    uniqueId?: string,
    type: "normal",
    label: string,

    disabled?: boolean,
    visible?: boolean,

    icon?: ClientIcon | RemoteIconInfo,
    click?: () => void,

    children?: MenuBarEntry[]
};

export type MenuBarEntry = MenuBarEntrySeparator | MenuBarEntryNormal;

export interface MenuBarDriver {
    /**
     * Separators on top level might not be rendered.
     * @param entries
     */
    setEntries(entries: MenuBarEntry[]);

    /**
     * Removes the menu bar
     */
    clearEntries();
}

let driver: MenuBarDriver;
export function getMenuBarDriver() : MenuBarDriver {
    return driver;
}

export function setMenuBarDriver(driver_: MenuBarDriver) {
    driver = driver_;
}