import {ChangeLog} from "tc-shared/update/ChangeLog";

export interface Updater {
    getChangeLog() : ChangeLog;

    getLastUsedVersion() : string;
    getCurrentVersion() : string;

    /* update the last used version to the current version */
    updateUsedVersion();
}