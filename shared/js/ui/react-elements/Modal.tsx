import * as React from "react";
import * as ReactDOM from "react-dom";
import {ReactElement} from "react";
import {Registry} from "tc-shared/events";
import {Translatable} from "tc-shared/ui/react-elements/i18n";

const cssStyle = require("./Modal.scss");

export type ModalType = "error" | "warning" | "info" | "none";

export interface ModalOptions {
    destroyOnClose?: boolean;

    defaultSize?: { width: number, height: number };
}

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

export interface ModalController {
    getOptions() : Readonly<ModalOptions>;
    getEvents() : Registry<ModalEvents>;
    getState() : ModalState;

    show() : Promise<void>;
    hide() : Promise<void>;

    destroy();
}

export abstract class AbstractModal {
    protected constructor() {}

    abstract renderBody() : ReactElement;
    abstract title() : string | React.ReactElement<Translatable>;

    /* only valid for the "inline" modals */
    type() : ModalType { return "none"; }

    protected onInitialize() {}
    protected onDestroy() {}

    protected onClose() {}
    protected onOpen() {}
}

export class InternalModalController<InstanceType extends InternalModal = InternalModal> implements ModalController {
    readonly events: Registry<ModalEvents>;
    readonly modalInstance: InstanceType;

    private initializedPromise: Promise<void>;

    private domElement: Element;
    private refModal: React.RefObject<InternalModalRenderer>;
    private modalState_: ModalState = ModalState.HIDDEN;

    constructor(instance: InstanceType) {
        this.modalInstance = instance;
        this.events = new Registry<ModalEvents>();
        this.initialize();
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

    private initialize() {
        this.refModal = React.createRef();
        this.domElement = document.createElement("div");

        const element = <InternalModalRenderer controller={this} ref={this.refModal} />;
        document.body.appendChild(this.domElement);
        this.initializedPromise = new Promise<void>(resolve => {
            ReactDOM.render(element, this.domElement, () => setTimeout(resolve, 0));
        });

        this.modalInstance["onInitialize"]();
    }

    async show() : Promise<void> {
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

export abstract class InternalModal extends AbstractModal { }

class InternalModalRenderer extends React.PureComponent<{ controller: InternalModalController  }, { show: boolean }> {
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

export function spawnReactModal<ModalClass extends InternalModal, A1>(modalClass: new () => ModalClass) : InternalModalController<ModalClass>;
export function spawnReactModal<ModalClass extends InternalModal, A1>(modalClass: new (..._: [A1]) => ModalClass, arg1: A1) : InternalModalController<ModalClass>;
export function spawnReactModal<ModalClass extends InternalModal, A1, A2>(modalClass: new (..._: [A1, A2]) => ModalClass, arg1: A1, arg2: A2) : InternalModalController<ModalClass>;
export function spawnReactModal<ModalClass extends InternalModal, A1, A2, A3>(modalClass: new (..._: [A1, A2, A3]) => ModalClass, arg1: A1, arg2: A2, arg3: A3) : InternalModalController<ModalClass>;
export function spawnReactModal<ModalClass extends InternalModal, A1, A2, A3, A4>(modalClass: new (..._: [A1, A2, A3, A4]) => ModalClass, arg1: A1, arg2: A2, arg3: A3, arg4: A4) : InternalModalController<ModalClass>;
export function spawnReactModal<ModalClass extends InternalModal, A1, A2, A3, A4, A5>(modalClass: new (..._: [A1, A2, A3, A4]) => ModalClass, arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5) : InternalModalController<ModalClass>;
export function spawnReactModal<ModalClass extends InternalModal>(modalClass: new (..._: any[]) => ModalClass, ...args: any[]) : InternalModalController<ModalClass> {
    return new InternalModalController(new modalClass(...args));
}