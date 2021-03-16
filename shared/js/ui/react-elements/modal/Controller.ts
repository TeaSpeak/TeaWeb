import {
    AbstractModal,
    InternalModal,
    ModalConstructorArguments,
    ModalController,
    ModalEvents,
    ModalInstanceController,
    ModalOptions,
    ModalState
} from "tc-shared/ui/react-elements/modal/Definitions";
import {Registry} from "tc-events";
import {findRegisteredModal, RegisteredModal} from "tc-shared/ui/react-elements/modal/Registry";
import {spawnExternalModal} from "tc-shared/ui/react-elements/external-modal";
import {InternalModalInstance} from "tc-shared/ui/react-elements/modal/internal";

export class GenericModalController<T extends keyof ModalConstructorArguments> implements ModalController {
    private readonly events: Registry<ModalEvents>;

    private readonly modalType: T;
    private readonly modalConstructorArguments: ModalConstructorArguments[T];
    private readonly modalOptions: ModalOptions;

    private modalKlass: RegisteredModal<T> | undefined;
    private instance: ModalInstanceController;
    private popedOut: boolean;

    public static fromInternalModal<ModalClass extends InternalModal>(klass: new (...args: any[]) => ModalClass, constructorArguments: any[]) : GenericModalController<"__internal__modal__"> {
        const result = new GenericModalController("__internal__modal__", constructorArguments, {
            popoutable: false,
            popedOut: false
        });

        result.modalKlass = new class implements RegisteredModal<"__internal__modal__"> {
            async classLoader(): Promise<{ default: { new(...args: ModalConstructorArguments["__internal__modal__"]): AbstractModal } }> {
                return { default: klass };
            }

            modalId: "__internal__modal__";
            popoutSupported: false;
        };

        return result;
    }

    constructor(modalType: T, constructorArguments: ModalConstructorArguments[T], options: ModalOptions) {
        this.events = new Registry<ModalEvents>();

        this.modalType = modalType;
        this.modalConstructorArguments = constructorArguments;
        this.modalOptions = options || {};

        this.popedOut = this.modalOptions.popedOut;
        if(typeof this.popedOut !== "boolean") {
            this.popedOut = false;
        }
    }

    private getModalClass() {
        const modalKlass = this.modalKlass || findRegisteredModal(this.modalType);
        if(!modalKlass) {
            throw tr("missing modal registration for") + this.modalType;
        }

        return modalKlass;
    }

    private createModalInstance() {
        if(this.popedOut) {
            this.instance = spawnExternalModal(this.modalType, this.modalConstructorArguments, this.modalOptions);
        } else {
            this.instance = new InternalModalInstance(this.getModalClass(), this.modalConstructorArguments, this.modalOptions);
        }

        const events = this.instance.getEvents();
        events.on("notify_destroy", events.on("notify_open", () => this.events.fire("open")));
        events.on("notify_destroy", events.on("notify_close", () => this.events.fire("close")));

        events.on("action_close", () => this.destroy());
        events.on("action_popout", () => {
            if(!this.popedOut) {
                if(!this.getModalClass().popoutSupported) {
                    return;
                }

                this.destroyModalInstance();
                this.popedOut = true;
                this.show().then(undefined);
            } else {
                if(this.modalOptions.popedOut) {
                    /* fixed poped out */
                    return;
                }

                this.destroyModalInstance();
                this.popedOut = false;
                this.show().then(undefined);
            }
        });
    }

    private destroyModalInstance() {
        this.instance?.destroy();
        this.instance = undefined;
    }

    destroy() {
        this.destroyModalInstance();
        this.events.fire("destroy");
    }

    getEvents(): Registry<ModalEvents> {
        return this.events;
    }

    getOptions(): Readonly<ModalOptions> {
        return this.modalOptions;
    }

    getState(): ModalState {
        return this.instance ? this.instance.getState() : ModalState.DESTROYED;
    }

    async hide(): Promise<void> {
        await this.instance?.hide();
    }

    async show(): Promise<void> {
        if(!this.instance) {
            this.createModalInstance();
        }

        await this.instance.show();
    }
}