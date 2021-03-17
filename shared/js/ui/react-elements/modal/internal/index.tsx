import {
    AbstractModal,
    constructAbstractModalClass, ModalInstanceController, ModalInstanceEvents,
    ModalOptions,
    ModalState
} from "tc-shared/ui/react-elements/modal/Definitions";
import * as React from "react";
import * as ReactDOM from "react-dom";
import {
    ModalBodyRenderer,
    ModalFrameRenderer,
    ModalFrameTopRenderer,
    PageModalRenderer
} from "tc-shared/ui/react-elements/modal/Renderer";
import {RegisteredModal} from "tc-shared/ui/react-elements/modal/Registry";
import {LogCategory, logError} from "tc-shared/log";
import {Registry} from "tc-events";

export class InternalModalInstance implements ModalInstanceController {
    readonly events: Registry<ModalInstanceEvents>;

    private readonly modalKlass: RegisteredModal<any>;
    private readonly constructorArguments: any[];
    private readonly rendererInstance: React.RefObject<PageModalRenderer>;

    private readonly modalOptions: ModalOptions;

    private state: ModalState;

    private modalInstance: AbstractModal;
    private htmlContainer: HTMLDivElement;

    private modalInitializePromise: Promise<void>;

    constructor(modalType: RegisteredModal<any>, constructorArguments: any[], modalOptions: ModalOptions) {
        this.events = new Registry<ModalInstanceEvents>();

        this.modalKlass = modalType;
        this.modalOptions = modalOptions;
        this.constructorArguments = constructorArguments;

        this.rendererInstance = React.createRef();
        this.state = ModalState.DESTROYED;
    }

    private async constructModal() {
        if(this.htmlContainer || this.modalInstance) {
            throw tr("internal modal has already been constructed");
        }

        const modalClass = await this.modalKlass.classLoader();
        if(!modalClass) {
            throw tr("invalid modal class");
        }

        try {
            this.modalInstance = constructAbstractModalClass(modalClass.default, { windowed: false }, this.constructorArguments);
        } catch (error) {
            logError(LogCategory.GENERAL, tr("Failed to create new modal of instance type %s: %o"), this.modalKlass.modalId, error);
            throw tr("failed to create new modal instance");
        }

        this.htmlContainer = document.createElement("div");
        document.body.appendChild(this.htmlContainer);

        await new Promise(resolve => {
            ReactDOM.render(
                <PageModalRenderer modalInstance={this.modalInstance} onBackdropClicked={this.getCloseCallback()} ref={this.rendererInstance}>
                    <ModalFrameRenderer>
                        <ModalFrameTopRenderer
                            replacePageTitle={false}
                            modalInstance={this.modalInstance}

                            onClose={this.getCloseCallback()}
                            onPopout={this.getPopoutCallback()}
                            onMinimize={this.getMinimizeCallback()}
                        />
                        <ModalBodyRenderer modalInstance={this.modalInstance} />
                    </ModalFrameRenderer>
                </PageModalRenderer>,
                this.htmlContainer,
                resolve
            );
        });
    }

    private destructModal() {
        this.state = ModalState.DESTROYED;
        if(this.htmlContainer) {
            ReactDOM.unmountComponentAtNode(this.htmlContainer);
            this.htmlContainer.remove();
            this.htmlContainer = undefined;
        }

        if(this.modalInstance) {
            this.modalInstance["onDestroy"]();
            this.modalInstance = undefined;
        }
        this.events.fire("notify_destroy");
    }

    getState(): ModalState {
        return this.state;
    }

    getEvents(): Registry<ModalInstanceEvents> {
        return this.events;
    }

    async show() : Promise<void> {
        if(this.modalInitializePromise) {
            await this.modalInitializePromise;
        }

        if(!this.modalInstance) {
            this.modalInitializePromise = this.constructModal();
            await this.modalInitializePromise;
        }

        if(!this.rendererInstance.current) {
            return;
        }

        this.state = ModalState.SHOWN;
        this.modalInstance["onOpen"]();
        await new Promise(resolve => this.rendererInstance.current.setState({ shown: true }, resolve));
        this.events.fire("notify_open");
    }

    async hide() : Promise<void> {
        if(this.modalInitializePromise) {
            await this.modalInitializePromise;
        }

        if(!this.rendererInstance.current) {
            return;
        }

        this.state = ModalState.HIDDEN;
        this.modalInstance["onClose"]();
        await new Promise(resolve => this.rendererInstance.current.setState({ shown: false }, resolve));

        /* TODO: Somehow get the real animation finish signal? */
        await new Promise(resolve => setTimeout(resolve, 500));
        this.events.fire("notify_close");
    }

    destroy() {
        this.destructModal();
        this.events.destroy();
    }

    private getCloseCallback() {
        return () => this.events.fire("action_close");
    }

    private getPopoutCallback() {
        if(!this.modalKlass.popoutSupported) {
            return undefined;
        }

        if(typeof this.modalOptions.popoutable !== "boolean" || !this.modalOptions.popoutable) {
            return undefined;
        }

        return () => this.events.fire("action_popout");
    }

    private getMinimizeCallback() {
        /* We can't minimize any windows */
        return undefined;
    }
}