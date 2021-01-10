import {RegistryMap} from "../../../events";
import "./Controller";
import {ModalController} from "../../../ui/react-elements/ModalDefinitions"; /* we've to reference him here, else the client would not */

export type ControllerFactory = (modal: string, registryMap: RegistryMap, userData: any, uniqueModalId: string) => ModalController;
let modalControllerFactory: ControllerFactory;

export function setExternalModalControllerFactory(factory: ControllerFactory) {
    modalControllerFactory = factory;
}

export function spawnExternalModal<EventClass extends { [key: string]: any }>(modal: string, registryMap: RegistryMap, userData: any, uniqueModalId?: string) : ModalController {
    if(typeof modalControllerFactory === "undefined")
        throw tr("No external modal factory has been set");

    return modalControllerFactory(modal, registryMap, userData, uniqueModalId);
}