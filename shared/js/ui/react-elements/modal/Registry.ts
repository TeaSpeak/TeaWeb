import {AbstractModal} from "../../../ui/react-elements/ModalDefinitions";
import {ModalConstructorArguments} from "tc-shared/ui/react-elements/modal/Definitions";

export interface RegisteredModal<T extends keyof ModalConstructorArguments> {
    modalId: T,
    classLoader: () => Promise<{ default: new (...args: ModalConstructorArguments[T]) => AbstractModal }>,
    popoutSupported: boolean
}

const registeredModals: {
    [T in keyof ModalConstructorArguments]?: RegisteredModal<T>
} = {};

export function findRegisteredModal<T extends keyof ModalConstructorArguments>(name: T) : RegisteredModal<T> | undefined {
    return registeredModals[name] as any;
}

function registerModal<T extends keyof ModalConstructorArguments>(modal: RegisteredModal<T>) {
    registeredModals[modal.modalId] = modal as any;
}

registerModal({
    modalId: "video-viewer",
    classLoader: async () => await import("tc-shared/ui/modal/video-viewer/Renderer"),
    popoutSupported: true
});

registerModal({
    modalId: "channel-edit",
    classLoader: async () => await import("tc-shared/ui/modal/channel-edit/Renderer"),
    popoutSupported: false /* TODO: Needs style fixing */
});

registerModal({
    modalId: "echo-test",
    classLoader: async () => await import("tc-shared/ui/modal/echo-test/Renderer"),
    popoutSupported: false /* TODO: Needs style fixing */
});

registerModal({
    modalId: "global-settings-editor",
    classLoader: async () => await import("tc-shared/ui/modal/global-settings-editor/Renderer"),
    popoutSupported: true
});

registerModal({
    modalId: "conversation",
    classLoader: async () => await import("../../frames/side/PopoutConversationRenderer"),
    popoutSupported: true
});

registerModal({
    modalId: "css-editor",
    classLoader: async () => await import("tc-shared/ui/modal/css-editor/Renderer"),
    popoutSupported: true
});

registerModal({
    modalId: "channel-tree",
    classLoader: async () => await import("tc-shared/ui/tree/popout/RendererModal"),
    popoutSupported: true
});

registerModal({
    modalId: "modal-connect",
    classLoader: async () => await import("tc-shared/ui/modal/connect/Renderer"),
    popoutSupported: true
});

registerModal({
    modalId: "modal-invite",
    classLoader: async () => await import("tc-shared/ui/modal/invite/Renderer"),
    popoutSupported: true
});

registerModal({
    modalId: "modal-bookmarks",
    classLoader: async () => await import("tc-shared/ui/modal/bookmarks/Renderer"),
    popoutSupported: true
});

registerModal({
    modalId: "modal-bookmark-add-server",
    classLoader: async () => await import("tc-shared/ui/modal/bookmarks-add-server/Renderer"),
    popoutSupported: true
});

registerModal({
    modalId: "modal-poked",
    classLoader: async () => await import("tc-shared/ui/modal/poke/Renderer"),
    popoutSupported: true
});

registerModal({
    modalId: "modal-assign-server-groups",
    classLoader: async () => await import("tc-shared/ui/modal/group-assignment/Renderer"),
    popoutSupported: true
});

registerModal({
    modalId: "modal-permission-edit",
    classLoader: async () => await import("tc-shared/ui/modal/permission/ModalRenderer"),
    popoutSupported: true
});

registerModal({
    modalId: "modal-avatar-upload",
    classLoader: async () => await import("tc-shared/ui/modal/avatar-upload/Renderer"),
    popoutSupported: true
});

registerModal({
    modalId: "modal-input-processor",
    classLoader: async () => await import("tc-shared/ui/modal/input-processor/Renderer"),
    popoutSupported: true
});

registerModal({
    modalId: "modal-server-info",
    classLoader: async () => await import("tc-shared/ui/modal/server-info/Renderer"),
    popoutSupported: true
});

registerModal({
    modalId: "modal-server-bandwidth",
    classLoader: async () => await import("tc-shared/ui/modal/server-bandwidth/Renderer"),
    popoutSupported: true
});