import * as loader from "tc-loader";
import {setupIpcHandler} from "tc-shared/ipc/BrowserIPC";
import {initializeI18N, tra} from "tc-shared/i18n/localize";
import {Stage} from "tc-loader";
import {AbstractModal, constructAbstractModalClass} from "tc-shared/ui/react-elements/modal/Definitions";
import {AppParameters, Settings, settings} from "tc-shared/settings";
import {setupJSRender} from "tc-shared/ui/jsrender";
import {findRegisteredModal} from "tc-shared/ui/react-elements/modal/Registry";
import {ModalWindowControllerInstance} from "./Controller";
import {LogCategory, logError, logInfo} from "tc-shared/log";
import {ModalRenderer} from "./ModalRenderer";

import "../../../../../file/RemoteAvatars";
import "../../../../../file/RemoteIcons";

let instanceController: ModalWindowControllerInstance;

let mainModalId: string;
let mainModalRenderer: ModalRenderer;
let mainModalInstance: AbstractModal;

loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    name: "setup",
    priority: 110,
    function: async () => {
        await import("tc-shared/proto");
        await initializeI18N();
        setupIpcHandler();
        setupJSRender();

        {
            const font = settings.getValue(Settings.KEY_FONT_SIZE);

            document.body.style.fontSize = font + "px";
            settings.globalChangeListener(Settings.KEY_FONT_SIZE, value => {
                document.body.style.fontSize = value + "px";
            });
        }
    }
});

loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    name: "modal renderer initialize",
    priority: 100,
    function: async () => {
        mainModalRenderer = new ModalRenderer({
            close() {
                instanceController?.triggerModalAction(mainModalId, "close");
            },
            minimize() {
                instanceController?.triggerModalAction(mainModalId, "minimize");
            }
        });
    }
});

loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    name: "modal initialize",
    priority: 10,
    function: initializeModalRenderer
});

async function initializeModalRenderer(taskId) {
    loader.setCurrentTaskName(taskId, tr("connecting to controller"));
    instanceController = new ModalWindowControllerInstance(AppParameters.getValue(AppParameters.KEY_MODAL_IPC_CHANNEL, "invalid"));
    const result = await instanceController.initialize();
    if(result.status === "timeout") {
        loader.critical_error("Modal controller timeout", "Modal controller failed to call back.");
        throw "modal controller timeout";
    } else if(result.status === "rejected") {
        loader.critical_error("Modal controller reject", result.message || tr("unknown why"));
        throw "modal controller reject";
    }

    mainModalId = result.modalId;

    loader.setCurrentTaskName(taskId, tr("loading modal class"));
    let modalClass: new (...args: any[]) => AbstractModal;
    logInfo(LogCategory.GENERAL, tr("Loading modal class %s"), result.modalType);
    try {
        const registeredModal = findRegisteredModal(result.modalType as any);
        if(!registeredModal) {
            loader.critical_error(tr("Unknown modal"), tra("Modal {} is unknown", result.modalType));
            throw "missing modal";
        }

        modalClass = (await registeredModal.classLoader()).default;
    } catch(error) {
        loader.critical_error("Failed to load modal", "Lookup the console for more detail");
        logError(LogCategory.GENERAL,tr("Failed to load main modal %s: %o"), result.modalType, error);
    }

    loader.setCurrentTaskName(taskId, tr("initializing modal class"));
    try {
        mainModalInstance = constructAbstractModalClass(modalClass, { windowed: true }, result.constructorArguments);
        mainModalInstance["onInitialize"]();
        mainModalRenderer.renderModal(mainModalInstance);
        mainModalInstance["onOpen"]();
    } catch(error) {
        loader.critical_error("Failed to invoker modal", "Lookup the console for more detail");
        logError(LogCategory.GENERAL,tr("Failed to load modal: %o"), error);
    }
}