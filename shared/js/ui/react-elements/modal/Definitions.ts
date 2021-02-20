import {IpcRegistryDescription, Registry} from "tc-shared/events";
import {VideoViewerEvents} from "tc-shared/video-viewer/Definitions";
import {ChannelEditEvents} from "tc-shared/ui/modal/channel-edit/Definitions";
import {EchoTestEvents} from "tc-shared/ui/modal/echo-test/Definitions";
import {ModalGlobalSettingsEditorEvents} from "tc-shared/ui/modal/global-settings-editor/Definitions";
import {InviteUiEvents, InviteUiVariables} from "tc-shared/ui/modal/invite/Definitions";

import {ReactElement} from "react";
import * as React from "react";
import {IpcVariableDescriptor} from "tc-shared/ui/utils/IpcVariable";

export type ModalType = "error" | "warning" | "info" | "none";
export type ModalRenderType = "page" | "dialog";

export interface ModalOptions {
    /**
     * Unique modal id.
     */
    uniqueId?: string,

    /**
     * Destroy the modal if it has been closed.
     * If the value is `false` it *might* destroy the modal anyways.
     * Default: `true`.
     */
    destroyOnClose?: boolean,

    /**
     * Default size of the modal in pixel.
     * This value might or might not be respected.
     */
    defaultSize?: { width: number, height: number },

    /**
     * Determines if the modal is resizeable or now.
     * Some browsers might not support non resizeable modals.
     * Default: `both`
     */
    resizeable?: "none" | "vertical" | "horizontal" | "both",

    /**
     * If the modal should be popoutable.
     * Default: `false`
     */
    popoutable?: boolean,

    /**
     * The default popout state.
     * Default: `false`
     */
    popedOut?: boolean
}

export interface ModalFunctionController {
    minimize();
    supportMinimize() : boolean;

    maximize();
    supportMaximize() : boolean;

    close();
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
    abstract renderTitle() : string | React.ReactElement;

    /* only valid for the "inline" modals */
    type() : ModalType { return "none"; }
    color() : "none" | "blue" { return "none"; }
    verticalAlignment() : "top" | "center" | "bottom" { return "center"; }

    protected onInitialize() {}
    protected onDestroy() {}

    protected onClose() {}
    protected onOpen() {}
}


export interface ModalRenderer {
    renderModal(modal: AbstractModal | undefined);
}

export interface ModalConstructorArguments {
    "video-viewer": [
        /* events */ IpcRegistryDescription<VideoViewerEvents>,
        /* handlerId */ string,
    ],
    "channel-edit": [
        /* events */ IpcRegistryDescription<ChannelEditEvents>,
        /* isChannelCreate */ boolean
    ],
    "echo-test": [
        /* events */ IpcRegistryDescription<EchoTestEvents>
    ],
    "global-settings-editor": [
        /* events */ IpcRegistryDescription<ModalGlobalSettingsEditorEvents>
    ],
    "conversation": any,
    "css-editor": any,
    "channel-tree": any,
    "modal-connect": any,
    "modal-invite": [
        /* events */ IpcRegistryDescription<InviteUiEvents>,
        /* variables */ IpcVariableDescriptor<InviteUiVariables>,
        /* serverName */ string
    ]
}