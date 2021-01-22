import {ModalConstructorArguments} from "tc-shared/ui/react-elements/modal/Definitions";
import {ModalController, ModalOptions} from "tc-shared/ui/react-elements/ModalDefinitions";
import {spawnExternalModal} from "tc-shared/ui/react-elements/external-modal";
import {InternalModal, InternalModalController} from "tc-shared/ui/react-elements/internal-modal/Controller";
import {findRegisteredModal} from "tc-shared/ui/react-elements/modal/Registry";

export function spawnModal<T extends keyof ModalConstructorArguments>(modal: T, constructorArguments: ModalConstructorArguments[T], options?: ModalOptions) : ModalController {
    if(options?.popedOut) {
        return spawnExternalModal(modal, constructorArguments, options);
    } else {
        return spawnInternalModal(modal, constructorArguments, options);
    }
}

export function spawnReactModal<ModalClass extends InternalModal, A1>(modalClass: new () => ModalClass) : InternalModalController;
export function spawnReactModal<ModalClass extends InternalModal, A1>(modalClass: new (..._: [A1]) => ModalClass, arg1: A1) : InternalModalController;
export function spawnReactModal<ModalClass extends InternalModal, A1, A2>(modalClass: new (..._: [A1, A2]) => ModalClass, arg1: A1, arg2: A2) : InternalModalController;
export function spawnReactModal<ModalClass extends InternalModal, A1, A2, A3>(modalClass: new (..._: [A1, A2, A3]) => ModalClass, arg1: A1, arg2: A2, arg3: A3) : InternalModalController;
export function spawnReactModal<ModalClass extends InternalModal, A1, A2, A3, A4>(modalClass: new (..._: [A1, A2, A3, A4]) => ModalClass, arg1: A1, arg2: A2, arg3: A3, arg4: A4) : InternalModalController;
export function spawnReactModal<ModalClass extends InternalModal, A1, A2, A3, A4, A5>(modalClass: new (..._: [A1, A2, A3, A4]) => ModalClass, arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5) : InternalModalController;
export function spawnReactModal<ModalClass extends InternalModal>(modalClass: new (..._: any[]) => ModalClass, ...args: any[]) : InternalModalController {
    return new InternalModalController({
        popoutSupported: false,
        modalId: "__internal__unregistered",
        classLoader: async () => modalClass
    }, args);
}

export function spawnInternalModal<T extends keyof ModalConstructorArguments>(modal: T, constructorArguments: ModalConstructorArguments[T], options?: ModalOptions) : InternalModalController {
    return new InternalModalController(findRegisteredModal(modal), constructorArguments);
}