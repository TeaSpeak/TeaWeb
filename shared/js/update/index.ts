import {Updater} from "./Updater";
import {ChangeLog} from "../update/ChangeLog";
import {spawnUpdatedModal} from "../ui/modal/whats-new/Controller";

const kIsNewUserKey = "updater-set";
let updaterUi: Updater;
let updaterNative: Updater;

export function setUIUpdater(updater: Updater) {
    if(typeof updaterUi !== "undefined") {
        throw tr("An UI updater has already been registered");
    }
    updaterUi = updater;
}

export function setNativeUpdater(updater: Updater) {
    if(typeof updaterNative !== "undefined") {
        throw tr("An native updater has already been registered");
    }
    updaterNative = updater;
}

function getChangedChangeLog(updater: Updater) : ChangeLog | undefined {
    if(updater.getCurrentVersion() === updater.getLastUsedVersion())
        return undefined;

    const changes = updater.getChangeList(updater.getLastUsedVersion());
    return changes.changes.length > 0 ? changes : undefined;
}

export function checkForUpdatedApp() {
    if(localStorage.getItem(kIsNewUserKey)) {
        let changesUI = updaterUi ? getChangedChangeLog(updaterUi) : undefined;
        let changesNative = updaterNative ? getChangedChangeLog(updaterNative) : undefined;

        if(changesUI !== undefined || changesNative !== undefined) {
            spawnUpdatedModal({
                changesUI: changesUI,
                changesClient: changesNative
            });

            updaterUi?.updateUsedVersion();
            updaterNative?.updateUsedVersion();
        }
    } else {
        localStorage.setItem(kIsNewUserKey, "1");
        updaterUi?.updateUsedVersion();
        updaterNative?.updateUsedVersion();
    }
}