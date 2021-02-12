import {
    AbstractModal,
    ModalFunctionController,
    ModalOptions,
    ModalRenderType
} from "tc-shared/ui/react-elements/modal/Definitions";
import {useContext} from "react";

const ControllerContext = useContext<ModalRendererController>(undefined);

interface RendererControllerEvents {

}

export class ModalRendererController {
    readonly renderType: ModalRenderType;
    readonly modal: AbstractModal;

    constructor(renderType: ModalRenderType, modal: AbstractModal,) {
        this.renderType = renderType;
        this.modal = modal;
    }

    setShown(shown: boolean) {

    }
}

export const ModalRenderer = (props: {
    mode: "page" | "dialog",
    modal: AbstractModal,
    modalOptions: ModalOptions,
    modalActions: ModalFunctionController
}) => {

}

const ModalRendererDialog = (props: {
    modal: AbstractModal,
    modalOptions: ModalOptions,
    modalActions: ModalFunctionController
}) => {
}