import {InternalModal, ModalConstructorArguments} from "tc-shared/ui/react-elements/modal/Definitions";
import {ModalController, ModalOptions} from "tc-shared/ui/react-elements/ModalDefinitions";
import {GenericModalController} from "tc-shared/ui/react-elements/modal/Controller";

export function spawnModal<T extends keyof ModalConstructorArguments>(modal: T, constructorArguments: ModalConstructorArguments[T], options?: ModalOptions) : ModalController {
    return new GenericModalController(modal, constructorArguments, options);
}

export function spawnReactModal<ModalClass extends InternalModal, A1>(modalClass: new () => ModalClass) : ModalController;
export function spawnReactModal<ModalClass extends InternalModal, A1>(modalClass: new (..._: [A1]) => ModalClass, arg1: A1) : ModalController;
export function spawnReactModal<ModalClass extends InternalModal, A1, A2>(modalClass: new (..._: [A1, A2]) => ModalClass, arg1: A1, arg2: A2) : ModalController;
export function spawnReactModal<ModalClass extends InternalModal, A1, A2, A3>(modalClass: new (..._: [A1, A2, A3]) => ModalClass, arg1: A1, arg2: A2, arg3: A3) : ModalController;
export function spawnReactModal<ModalClass extends InternalModal, A1, A2, A3, A4>(modalClass: new (..._: [A1, A2, A3, A4]) => ModalClass, arg1: A1, arg2: A2, arg3: A3, arg4: A4) : ModalController;
export function spawnReactModal<ModalClass extends InternalModal, A1, A2, A3, A4, A5>(modalClass: new (..._: [A1, A2, A3, A4]) => ModalClass, arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5) : ModalController;
export function spawnReactModal<ModalClass extends InternalModal>(modalClass: new (..._: any[]) => ModalClass, ...args: any[]) : ModalController {
    return GenericModalController.fromInternalModal(modalClass, args);
}