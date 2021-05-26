import {ChangeLog} from "../update/ChangeLog";

export interface Updater {
    getChangeLog() : ChangeLog;
    getChangeList(oldVersion: string) : ChangeLog;

    /**
     * @returns `undefined` if `updateUsedVersion()` never has been called.
     */
    getLastUsedVersion() : string | undefined;
    getCurrentVersion() : string;

    /* update the last used version to the current version */
    updateUsedVersion();
}