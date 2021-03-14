import {Registry} from "../../../events";
import * as React from "react";
import * as ReactDOM from "react-dom";
import {
    AbstractModal,
    ModalController,
    ModalEvents,
    ModalOptions,
    ModalState
} from "../../../ui/react-elements/ModalDefinitions";
import {InternalModalRenderer} from "../../../ui/react-elements/internal-modal/Renderer";
import {tr} from "tc-shared/i18n/localize";
import {RegisteredModal} from "tc-shared/ui/react-elements/modal/Registry";

export class InternalModalController implements ModalController {
    readonly events: Registry<ModalEvents>;

    private readonly modalType: RegisteredModal<any>;
    private readonly constructorArguments: any[];
    private modalInstance: AbstractModal;

    private initializedPromise: Promise<void>;

    private domElement: Element;
    private refModal: React.RefObject<InternalModalRenderer>;
    private modalState_: ModalState = ModalState.HIDDEN;

    constructor(modalType: RegisteredModal<any>, constructorArguments: any[]) {
        this.modalType = modalType;
        this.constructorArguments = constructorArguments;

        this.events = new Registry<ModalEvents>();
        this.initializedPromise = this.initialize();
    }

    getOptions(): Readonly<ModalOptions> {
        /* FIXME! */
        return {};
    }

    getEvents(): Registry<ModalEvents> {
        return this.events;
    }

    getState() {
        return this.modalState_;
    }

    private async initialize() {
        this.refModal = React.createRef();
        this.domElement = document.createElement("div");

        this.modalInstance = new (await this.modalType.classLoader()).default(...this.constructorArguments);
        const element = React.createElement(InternalModalRenderer, {
            ref: this.refModal,
            modal: this.modalInstance,
            onClose: () => this.destroy()
        });
        document.body.appendChild(this.domElement);
        await new Promise<void>(resolve => {
            ReactDOM.render(element, this.domElement, () => setTimeout(resolve, 0));
        });

        this.modalInstance["onInitialize"]();
    }

    async show() : Promise<void> {
        await this.initializedPromise;
        if(this.modalState_ === ModalState.DESTROYED) {
            throw tr("modal has been destroyed");
        } else if(this.modalState_ === ModalState.SHOWN) {
            return;
        }

        this.refModal.current?.setState({ show: true });
        this.modalState_ = ModalState.SHOWN;
        this.modalInstance["onOpen"]();
        this.events.fire("open");
    }

    async hide() : Promise<void> {
        await this.initializedPromise;
        if(this.modalState_ === ModalState.DESTROYED)
            throw tr("modal has been destroyed");
        else if(this.modalState_ === ModalState.HIDDEN)
            return;

        this.refModal.current?.setState({ show: false });
        this.modalState_ = ModalState.HIDDEN;
        this.modalInstance["onClose"]();
        this.events.fire("close");

        return new Promise<void>(resolve => setTimeout(resolve, 500));
    }

    destroy() {
        if(this.modalState_ === ModalState.SHOWN) {
            this.hide().then(() => this.destroy());
            return;
        }

        ReactDOM.unmountComponentAtNode(this.domElement);
        this.domElement.remove();

        this.domElement = undefined;
        this.modalState_ = ModalState.DESTROYED;
        this.modalInstance["onDestroy"]();
        this.events.fire("destroy");
    }
}

export abstract class InternalModal extends AbstractModal {}