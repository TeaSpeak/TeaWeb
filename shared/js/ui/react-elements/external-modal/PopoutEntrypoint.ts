import * as loader from "tc-loader";
import * as ipc from "../../../ipc/BrowserIPC";
import * as i18n from "../../../i18n/localize";
import {Stage} from "tc-loader";
import {AbstractModal} from "../../../ui/react-elements/ModalDefinitions";
import {AppParameters} from "../../../settings";
import {getPopoutController} from "./PopoutController";
import {setupJSRender} from "../../../ui/jsrender";
import {findRegisteredModal} from "tc-shared/ui/react-elements/modal/Registry";
import {ModalRenderer} from "tc-shared/ui/react-elements/external-modal/ModalRenderer";
import {constructAbstractModalClass} from "tc-shared/ui/react-elements/modal/Definitions";
import "../../../file/RemoteAvatars";
import "../../../file/RemoteIcons";

let modalRenderer: ModalRenderer;
let modalInstance: AbstractModal;
let modalClass: new (...args: any[]) => AbstractModal;

loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    name: "setup",
    priority: 110,
    function: async () => {
        await import("tc-shared/proto");
        await i18n.initialize();
        ipc.setupIpcHandler();

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
        modalRenderer = new ModalRenderer({
            close() {
                getPopoutController().doClose()
            },
            minimize() {
                getPopoutController().doMinimize()
            }
        });
    }
});

loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    name: "modal class loader",
    priority: 10,
    function: async () => {
        const modalTarget = AppParameters.getValue(AppParameters.KEY_MODAL_TARGET, "unknown");
        console.error("Loading modal class %s", modalTarget);
        try {
            const registeredModal = findRegisteredModal(modalTarget as any);
            if(!registeredModal) {
                loader.critical_error("Missing popout handler", "Handler " + modalTarget + " is missing.");
                throw "missing handler";
            }

            modalClass = (await registeredModal.classLoader()).default;
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
            modalInstance = constructAbstractModalClass(modalClass, { windowed: true }, getPopoutController().getConstructorArguments());
            modalRenderer.renderModal(modalInstance);
        } catch(error) {
            loader.critical_error("Failed to invoker modal", "Lookup the console for more detail");
            console.error("Failed to load modal: %o", error);
        }
    }
});
