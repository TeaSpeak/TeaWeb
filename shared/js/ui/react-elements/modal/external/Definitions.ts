export interface ModalIPCMessages {
    "hello-renderer": { version: string },
    "hello-controller": {
        accepted: true,

        modalId: string,
        modalType: string,
        constructorArguments: any[],
    } | {
        accepted: false,
        message: string
    },
    /*
    "create-inline-modal": {
        modalId: string,
        modalType: string,
        constructorArguments: any[],
    },
    "destroy-inline-modal": {

    },
    */
    "invoke-modal-action": {
        modalId: string,
        action: "close" | "minimize"
    },

    /* The controller has a new peer which authenticated for the modal */
    "invalidate-modal-instance": {}
}

export type ModalIPCRenderer2ControllerMessages = Pick<ModalIPCMessages, "hello-renderer" | "invoke-modal-action">;
export type ModalIPCController2Renderer = Pick<ModalIPCMessages, "hello-controller" | "invalidate-modal-instance">;

export type ModalIPCMessage<Messages, T extends keyof Messages = keyof Messages> = {
    type: T,
    payload: Messages[T]
}