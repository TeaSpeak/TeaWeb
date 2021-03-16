import {ModalInstanceController, ModalOptions} from "../modal/Definitions";
import "./Controller";

export type ControllerFactory = (modalType: string, constructorArguments?: any[], options?: ModalOptions) => ModalInstanceController;

let modalControllerFactory: ControllerFactory;
export function setExternalModalControllerFactory(factory: ControllerFactory) {
    modalControllerFactory = factory;
}

export function spawnExternalModal<EventClass extends { [key: string]: any }>(modalType: string, constructorArguments: any[], options: ModalOptions) : ModalInstanceController {
    if(typeof modalControllerFactory === "undefined") {
        throw tr("No external modal factory has been set");
    }

    return modalControllerFactory(modalType, constructorArguments, options);
}