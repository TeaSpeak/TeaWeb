import * as React from "react";
import {ReactElement} from "react";
import {Registry} from "../../events";

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