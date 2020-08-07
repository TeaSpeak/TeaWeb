import {Registry} from "tc-shared/events";
import {ModalController} from "tc-shared/ui/react-elements/Modal";
import "./Controller"; /* we've to reference him here, else the client would not */

export type ControllerFactory = (modal: string, events: Registry, userData: any) => ModalController;
let modalControllerFactory: ControllerFactory;

export function setExternalModalControllerFactory(factory: ControllerFactory) {
    modalControllerFactory = factory;
}

export function spawnExternalModal<EventClass extends { [key: string]: any }>(modal: string, events: Registry<EventClass>, userData: any) : ModalController {
    if(typeof modalControllerFactory === "undefined")
        throw tr("No external modal factory has been set");

    return modalControllerFactory(modal, events as any, userData);
}