import * as log from "tc-shared/log";
import {LogCategory} from "tc-shared/log";
import * as loader from "tc-loader";
import * as ipc from "../../../ipc/BrowserIPC";
import * as i18n from "../../../i18n/localize";

import "tc-shared/file/RemoteAvatars";
import "tc-shared/proto";

import {Stage} from "tc-loader";
import {AbstractModal} from "tc-shared/ui/react-elements/Modal";
import {Settings, SettingsKey} from "tc-shared/settings";
import {getPopoutController} from "./PopoutController";
import {findPopoutHandler} from "tc-shared/ui/react-elements/external-modal/PopoutRegistry";
import {bodyRenderer, titleRenderer} from "tc-shared/ui/react-elements/external-modal/PopoutRenderer";
import {Registry} from "tc-shared/events";

log.info(LogCategory.GENERAL, "Hello World");
console.error("External modal said hello!");

let modalInstance: AbstractModal;
let modalClass: new <T>(events: Registry<T>, userData: any) => AbstractModal;

const kSettingModalTarget: SettingsKey<string> = {
    key: "modal-target",
    valueType: "string"
};

loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    name: "setup",
    priority: 110,
    function: async () => {
        await i18n.initialize();
        ipc.setup();
    }
});

loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    name: "main app connect",
    priority: 100,
    function: async () => {
        const ppController = getPopoutController();
        await ppController.initialize();
    }
});

loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    name: "modal class loader",
    priority: 10,
    function: async () => {
        const modalTarget = Settings.instance.static(kSettingModalTarget, "unknown");
        console.error("Loading modal class %s", modalTarget);
        try {
            const handler = findPopoutHandler(modalTarget);
            if(!handler) {
                loader.critical_error("Missing popout handler", "Handler " + modalTarget + " is missing.");
                throw "missing handler";
            }

            modalClass = await handler.loadClass();
        } catch(error) {
            loader.critical_error("Failed to load modal", "Lookup the console for more detail");
            console.error("Failed to load modal %s: %o", modalTarget, error);
        }
    }
});

loader.register_task(Stage.LOADED, {
    name: "main app connect",
    priority: 100,
    function: async () => {
        try {
            modalInstance = new modalClass(getPopoutController().getEventRegistry(), getPopoutController().getUserData());
            titleRenderer.setInstance(modalInstance);
            bodyRenderer.setInstance(modalInstance);
        } catch(error) {
            loader.critical_error("Failed to invoker modal", "Lookup the console for more detail");
            console.error("Failed to load modal: %o", error);
        }
    }
});
