import {
    AbstractModal,
    constructAbstractModalClass,
    ModalInstanceController,
    ModalInstanceEvents,
    ModalOptions,
    ModalState
} from "tc-shared/ui/react-elements/modal/Definitions";
import * as React from "react";
import {
    ModalBodyRenderer,
    ModalFrameRenderer,
    ModalFrameTopRenderer,
    PageModalRenderer
} from "tc-shared/ui/react-elements/modal/Renderer";
import {RegisteredModal} from "tc-shared/ui/react-elements/modal/Registry";
import {LogCategory, logError} from "tc-shared/log";
import {Registry} from "tc-events";
import {guid} from "tc-shared/crypto/uid";
import {ErrorBoundary} from "tc-shared/ui/react-elements/ErrorBoundary";

class InternalRendererInstance extends React.PureComponent<{
    instance: InternalModalInstance,
}, {
    shown: boolean
}> {
    constructor(props) {
        super(props);

        this.state = {
            shown: false
        };
    }

    render() {
        const instance = this.props.instance;
        if(!instance?.modalInstance) {
            throw tr("missing modal instance");
        }

        return (
            <PageModalRenderer modalInstance={instance.modalInstance} onBackdropClicked={instance.getCloseCallback()} shown={this.state.shown}>
                <ModalFrameRenderer windowed={false}>
                    <ModalFrameTopRenderer
                        replacePageTitle={false}
                        modalInstance={instance.modalInstance}

                        onClose={instance.getCloseCallback()}
                        onPopout={instance.getPopoutCallback()}
                        onMinimize={instance.getMinimizeCallback()}
                    />
                    <ModalBodyRenderer modalInstance={instance.modalInstance} />
                </ModalFrameRenderer>
            </PageModalRenderer>
        );
    }

    componentWillUnmount() {
        /* TODO: May notify the instance about this if this wasn't planned */
    }
}

export class InternalModalInstance implements ModalInstanceController {
    readonly instanceUniqueId: string;
    readonly events: Registry<ModalInstanceEvents>;
    readonly refRendererInstance: React.RefObject<InternalRendererInstance>;

    private readonly modalKlass: RegisteredModal<any>;
    private readonly constructorArguments: any[];

    private readonly modalOptions: ModalOptions;

    private state: ModalState;

    public modalInstance: AbstractModal;
    private modalInitializePromise: Promise<void>;

    constructor(modalType: RegisteredModal<any>, constructorArguments: any[], modalOptions: ModalOptions) {
        this.instanceUniqueId = guid();
        this.events = new Registry<ModalInstanceEvents>();

        this.modalKlass = modalType;
        this.modalOptions = modalOptions;
        this.constructorArguments = constructorArguments;

        this.refRendererInstance = React.createRef();
        this.state = ModalState.DESTROYED;
    }

    private async constructModal() {
        if(this.modalInstance) {
            throw tr("internal modal has already been constructed");
        }

        const modalClass = await this.modalKlass.classLoader();
        if(!modalClass) {
            throw tr("invalid modal class");
        }

        try {
            this.modalInstance = constructAbstractModalClass(modalClass.default, { windowed: false }, this.constructorArguments);
            this.modalInstance["onInitialize"]();
        } catch (error) {
            this.destructModalInstance();
            logError(LogCategory.GENERAL, tr("Failed to create new modal of instance type %s: %o"), this.modalKlass.modalId, error);
            throw tr("failed to create new modal instance");
        }

        if(!internalModalContainer.current) {
            this.destructModalInstance();
            throw tr("missing modal hanging container");
        }

        await new Promise<void>(resolve => internalModalContainer.current.addModalInstance(this, resolve));
        if(!this.refRendererInstance.current) {
            this.destructModalInstance();
            throw tr("missing rendered modal reference");
        }
    }

    private destructModal() {
        this.state = ModalState.DESTROYED;
        this.destructModalInstance();
        this.events.fire("notify_destroy");
    }

    private destructModalInstance() {
        internalModalContainer.current?.removeModalInstance(this);
        if(!this.modalInstance) {
            return;
        }

        try {
            this.modalInstance["onDestroy"]();
        } catch (error) {
            logError(LogCategory.GENERAL, tr("Failed to invoke the destroy callback on the created modal instance: %o"), error);
        }
        this.modalInstance = undefined;
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

        if(!this.refRendererInstance.current) {
            return;
        }

        this.modalInstance["onOpen"]();
        this.state = ModalState.SHOWN;
        await new Promise<void>(resolve => this.refRendererInstance.current.setState({ shown: true }, resolve));
        this.events.fire("notify_open");
    }

    async hide() : Promise<void> {
        if(this.modalInitializePromise) {
            await this.modalInitializePromise;
        }

        if(!this.refRendererInstance.current) {
            return;
        }

        this.state = ModalState.HIDDEN;
        this.modalInstance["onClose"]();
        await new Promise<void>(resolve => this.refRendererInstance.current.setState({ shown: false }, resolve));

        /* TODO: Somehow get the real animation finish signal? */
        await new Promise(resolve => setTimeout(resolve, 500));
        this.events.fire("notify_close");
    }

    async minimize(): Promise<void> { }
    async maximize(): Promise<void> { }

    destroy() {
        this.destructModal();
        this.events.destroy();
    }

    public getCloseCallback() {
        return () => this.events.fire("action_close");
    }

    public getPopoutCallback() {
        if(!this.modalKlass.popoutSupported) {
            return undefined;
        }

        if(typeof this.modalOptions.popoutable !== "boolean" || !this.modalOptions.popoutable) {
            return undefined;
        }

        return () => this.events.fire("action_popout");
    }

    public getMinimizeCallback() {
        /* We can't minimize any windows */
        return undefined;
    }
}

const internalModalContainer: React.RefObject<InternalModalHookInner> = React.createRef();
class InternalModalHookInner extends React.PureComponent<{}, {
    revision: number
}> {
    private modalStack: InternalModalInstance[];

    constructor(props) {
        super(props);

        this.modalStack = [];
        this.state = { revision: 0 };
    }

    render() {
        return (
            this.modalStack.map(modal => (
                <ErrorBoundary key={modal.instanceUniqueId}>
                    <InternalRendererInstance instance={modal} ref={modal.refRendererInstance} />
                </ErrorBoundary>
            ))
        );
    }

    addModalInstance(modal: InternalModalInstance, callbackRendered?: () => void) {
        this.modalStack.push(modal);
        this.setState({ revision: performance.now() }, callbackRendered);
    }

    removeModalInstance(modal: InternalModalInstance) {
        if(!this.modalStack.remove(modal)) {
            return;
        }
        this.setState({ revision: performance.now() });
    }
}

export const InternalModalHook = React.memo(() => (
    <InternalModalHookInner ref={internalModalContainer} />
));