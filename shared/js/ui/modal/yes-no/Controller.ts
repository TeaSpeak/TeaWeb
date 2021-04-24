import {spawnModal} from "tc-shared/ui/react-elements/modal";
import {Registry} from "tc-events";
import {ModalYesNoEvents, ModalYesNoVariables} from "tc-shared/ui/modal/yes-no/Definitions";
import {IpcUiVariableProvider} from "tc-shared/ui/utils/IpcVariable";
import {CallOnce, ignorePromise} from "tc-shared/proto";

class Controller {
    readonly properties: YesNoParameters;
    readonly events: Registry<ModalYesNoEvents>;
    readonly variables: IpcUiVariableProvider<ModalYesNoVariables>;

    constructor(properties: YesNoParameters) {
        this.properties = properties;
        this.events = new Registry<ModalYesNoEvents>();
        this.variables = new IpcUiVariableProvider<ModalYesNoVariables>();

        this.variables.setVariableProvider("title", () => this.properties.title);
        this.variables.setVariableProvider("question", () => this.properties.question);

        this.variables.setVariableProvider("textYes", () => this.properties.textYes);
        this.variables.setVariableProvider("textNo", () => this.properties.textNo);
    }

    @CallOnce
    destroy() {
        this.events.destroy();
        this.variables.destroy();
    }
}

export interface YesNoParameters {
    title: string,
    question: string,

    textYes?: string,
    textNo?: string,

    closeable?: boolean
}

export async function promptYesNo(properties: YesNoParameters) : Promise<boolean | undefined> {
    /* Having these checks because tra(..) still might return jQuery */
    if(typeof properties.title !== "string") {
        debugger;
        throw "yes-no title isn't a string";
    }

    if(typeof properties.question !== "string") {
        debugger;
        throw "yes-no question isn't a string";
    }

    const controller = new Controller(properties);
    const modal = spawnModal("modal-yes-no", [
        controller.events.generateIpcDescription(),
        controller.variables.generateConsumerDescription()
    ], {
        popoutable: false,
        destroyOnClose: true
    });

    modal.getEvents().on("destroy", () => controller.destroy());
    ignorePromise(modal.show());

    return await new Promise<boolean | undefined>(resolve => {
        modal.getEvents().on("destroy", () => resolve());
        controller.events.on("action_submit", event => {
            resolve(event.status);
            modal.destroy();
        });
    });
}