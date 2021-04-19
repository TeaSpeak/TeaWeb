import {Registry} from "tc-events";
import {ModalAboutEvents, ModalAboutVariables} from "tc-shared/ui/modal/about/Definitions";
import {IpcUiVariableProvider} from "tc-shared/ui/utils/IpcVariable";
import {spawnModal} from "tc-shared/ui/react-elements/modal";
import {CallOnce, ignorePromise} from "tc-shared/proto";
import {getBackend} from "tc-shared/backend";

class Controller {
    readonly events: Registry<ModalAboutEvents>;
    readonly variables: IpcUiVariableProvider<ModalAboutVariables>;

    private eggShown: boolean;

    constructor() {
        this.events = new Registry<ModalAboutEvents>();
        this.variables = new IpcUiVariableProvider<ModalAboutVariables>();

        this.eggShown = false;

        this.variables.setVariableProvider("nativeVersion", () => {
            if(__build.target === "client") {
                const backend = getBackend("native");
                return backend.getVersionInfo().version;
            } else {
                return "unknown";
            }
        });

        this.variables.setVariableProvider("uiVersion", () => __build.version);
        this.variables.setVariableProvider("uiVersionTimestamp", () => __build.timestamp);

        this.variables.setVariableProvider("eggShown", () => this.eggShown);
        this.variables.setVariableEditor("eggShown", newValue => { this.eggShown = newValue; });

        this.events.on("action_update_high_score", event => {
            let highScore = parseInt(localStorage.getItem("ee-snake-high-score"));
            if(!isNaN(highScore) && highScore >= event.score) {
                /* No change */
                return;
            }

            localStorage.setItem("ee-snake-high-score", event.score.toString());
        });

        this.events.on("query_high_score", () => {
            let highScore = parseInt(localStorage.getItem("ee-snake-high-score"));
            if(isNaN(highScore)) {
                highScore = 0;
            }

            this.events.fire("notify_high_score", { score: highScore });
        });
    }

    @CallOnce
    destroy() {
        this.events.destroy();
        this.variables.destroy();
    }
}

export function spawnAboutModal() {
    const controller = new Controller();
    const modal = spawnModal("modal-about", [
        controller.events.generateIpcDescription(),
        controller.variables.generateConsumerDescription()
    ], {
        popoutable: true
    });

    modal.getEvents().on("destroy", () => controller.destroy());
    ignorePromise(modal.show());
}