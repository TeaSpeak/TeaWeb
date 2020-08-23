import * as loader from "tc-loader";
import * as ipc from "../../../ipc/BrowserIPC";
import * as i18n from "../../../i18n/localize";

import {Stage} from "tc-loader";
import {AbstractModal, ModalRenderer} from "tc-shared/ui/react-elements/ModalDefinitions";
import {Settings, SettingsKey} from "tc-shared/settings";
import {getPopoutController} from "./PopoutController";
import {findPopoutHandler} from "tc-shared/ui/react-elements/external-modal/PopoutRegistry";
import {Registry} from "tc-shared/events";
import {WebModalRenderer} from "tc-shared/ui/react-elements/external-modal/PopoutRendererWeb";
import {ClientModalRenderer} from "tc-shared/ui/react-elements/external-modal/PopoutRendererClient";
import {setupJSRender} from "tc-shared/ui/jsrender";

let modalRenderer: ModalRenderer;
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
        await import("tc-shared/proto");
        await i18n.initialize();
        ipc.setup();

        setupJSRender();
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
    name: "modal renderer loader",
    priority: 10,
    function: async () => {
        if(__build.target === "web") {
            modalRenderer = new WebModalRenderer();
        } else {
            modalRenderer = new ClientModalRenderer({
                close() {
                    getPopoutController().doClose()
                },
                minimize() {
                    getPopoutController().doMinimize()
                }
            });
        }
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
            modalRenderer.renderModal(modalInstance);
        } catch(error) {
            loader.critical_error("Failed to invoker modal", "Lookup the console for more detail");
            console.error("Failed to load modal: %o", error);
        }
    }
});
