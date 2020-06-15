import * as React from "react";
import * as ReactDOM from "react-dom";
import {ReactElement} from "react";
import {Registry} from "tc-shared/events";

const cssStyle = require("./Modal.scss");

export type ModalType = "error" | "warning" | "info" | "none";

export interface ModalEvents {
    "open": {},
    "close": {},

    /* create is implicitly at object creation */
    "destroy": {}
}

export enum ModalState {
    SHOWN,
    HIDDEN,
    DESTROYED
}

export class ModalController<InstanceType extends Modal = Modal> {
    readonly events: Registry<ModalEvents>;
    readonly modalInstance: InstanceType;

    private initializedPromise: Promise<void>;

    private domElement: Element;
    private refModal: React.RefObject<ModalImpl>;
    private modalState_: ModalState = ModalState.HIDDEN;

    constructor(instance: InstanceType) {
        this.modalInstance = instance;
        instance["__modal_controller"] = this;

        this.events = new Registry<ModalEvents>();
        this.initialize();
    }

    private initialize() {
        this.refModal = React.createRef();
        this.domElement = document.createElement("div");

        const element = <ModalImpl controller={this} ref={this.refModal} />;
        document.body.appendChild(this.domElement);
        this.initializedPromise = new Promise<void>(resolve => {
            ReactDOM.render(element, this.domElement, () => setTimeout(resolve, 0));
        });

        this.modalInstance["onInitialize"]();
    }

    modalState() {
        return this.modalState_;
    }

    async show() {
        await this.initializedPromise;
        if(this.modalState_ === ModalState.DESTROYED)
            throw tr("modal has been destroyed");
        else if(this.modalState_ === ModalState.SHOWN)
            return;

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

export abstract class Modal {
    private __modal_controller: ModalController;
    public constructor() {}

    type() : ModalType { return "none"; }
    abstract renderBody() : ReactElement;
    abstract title() : string;

    /**
     * Will only return a modal controller when the modal has not been destroyed
     */
    modalController() : ModalController | undefined {
        return this.__modal_controller;
    }

    protected onInitialize() {}
    protected onDestroy() {}

    protected onClose() {}
    protected onOpen() {}
}

class ModalImpl extends React.PureComponent<{ controller: ModalController  }, { show: boolean }> {
    private readonly refModal = React.createRef<HTMLDivElement>();

    constructor(props) {
        super(props);

        this.state = { show: false };
    }

    render() {
        const modal = this.props.controller.modalInstance;
        let modalExtraClass = "";

        const type = modal.type();
        if(typeof type === "string" && type !== "none")
            modalExtraClass = cssStyle["modal-type-" + type];

        const showClass = this.state.show ? cssStyle.shown : "";
        return (
            <div className={cssStyle.modal + " " + modalExtraClass + " " + showClass} tabIndex={-1} role={"dialog"} aria-hidden={true} onClick={event => this.onBackdropClick(event)} ref={this.refModal}>
                <div className={cssStyle.dialog}>
                    <div className={cssStyle.content}>
                        <div className={cssStyle.header}>
                            <div className={cssStyle.icon}>
                                <img src="img/favicon/teacup.png"  alt={tr("Modal - Icon")} />
                            </div>
                            <div className={cssStyle.title}>{modal.title()}</div>
                            <div className={cssStyle.buttonClose} onClick={() => this.props.controller.destroy() }>
                                <div className="icon_em client-close_button" />
                            </div>
                        </div>
                        <div className={cssStyle.body}>
                            {modal.renderBody()}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    private onBackdropClick(event: React.MouseEvent) {
        if(event.target !== this.refModal.current || event.isDefaultPrevented())
            return;

        this.props.controller.destroy();
    }
}

export function spawnReactModal<ModalClass extends Modal, A1>(modalClass: new (..._: [A1]) => ModalClass, arg1: A1) : ModalController<ModalClass>;
export function spawnReactModal<ModalClass extends Modal, A1, A2>(modalClass: new (..._: [A1, A2]) => ModalClass, arg1: A1, arg2: A2) : ModalController<ModalClass>;
export function spawnReactModal<ModalClass extends Modal, A1, A2, A3>(modalClass: new (..._: [A1, A2, A3]) => ModalClass, arg1: A1, arg2: A2, arg3: A3) : ModalController<ModalClass>;
export function spawnReactModal<ModalClass extends Modal, A1, A2, A3, A4>(modalClass: new (..._: [A1, A2, A3, A4]) => ModalClass, arg1: A1, arg2: A2, arg3: A3, arg4: A4) : ModalController<ModalClass>;
export function spawnReactModal<ModalClass extends Modal>(modalClass: new (..._: any[]) => ModalClass, ...args: any[]) : ModalController<ModalClass> {
    return new ModalController(new modalClass(...args));
}