import {InternalModal, InternalModalController} from "tc-shared/ui/react-elements/internal-modal/Controller";

export function spawnReactModal<ModalClass extends InternalModal, A1>(modalClass: new () => ModalClass) : InternalModalController<ModalClass>;
export function spawnReactModal<ModalClass extends InternalModal, A1>(modalClass: new (..._: [A1]) => ModalClass, arg1: A1) : InternalModalController<ModalClass>;
export function spawnReactModal<ModalClass extends InternalModal, A1, A2>(modalClass: new (..._: [A1, A2]) => ModalClass, arg1: A1, arg2: A2) : InternalModalController<ModalClass>;
export function spawnReactModal<ModalClass extends InternalModal, A1, A2, A3>(modalClass: new (..._: [A1, A2, A3]) => ModalClass, arg1: A1, arg2: A2, arg3: A3) : InternalModalController<ModalClass>;
export function spawnReactModal<ModalClass extends InternalModal, A1, A2, A3, A4>(modalClass: new (..._: [A1, A2, A3, A4]) => ModalClass, arg1: A1, arg2: A2, arg3: A3, arg4: A4) : InternalModalController<ModalClass>;
export function spawnReactModal<ModalClass extends InternalModal, A1, A2, A3, A4, A5>(modalClass: new (..._: [A1, A2, A3, A4]) => ModalClass, arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5) : InternalModalController<ModalClass>;
export function spawnReactModal<ModalClass extends InternalModal>(modalClass: new (..._: any[]) => ModalClass, ...args: any[]) : InternalModalController<ModalClass> {
    return new InternalModalController(new modalClass(...args));
}