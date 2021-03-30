import {IpcRegistryDescription, Registry} from "tc-shared/events";
import {ChannelEditEvents} from "tc-shared/ui/modal/channel-edit/Definitions";
import {EchoTestEvents} from "tc-shared/ui/modal/echo-test/Definitions";
import {ModalGlobalSettingsEditorEvents} from "tc-shared/ui/modal/global-settings-editor/Definitions";
import {InviteUiEvents, InviteUiVariables} from "tc-shared/ui/modal/invite/Definitions";
import React, {ReactElement} from "react";
import {IpcVariableDescriptor} from "tc-shared/ui/utils/IpcVariable";
import {ModalBookmarkEvents, ModalBookmarkVariables} from "tc-shared/ui/modal/bookmarks/Definitions";
import {
    ModalBookmarksAddServerEvents,
    ModalBookmarksAddServerVariables
} from "tc-shared/ui/modal/bookmarks-add-server/Definitions";
import {ModalPokeEvents, ModalPokeVariables} from "tc-shared/ui/modal/poke/Definitions";
import {
    ModalClientGroupAssignmentEvents,
    ModalClientGroupAssignmentVariables
} from "tc-shared/ui/modal/group-assignment/Definitions";
import {VideoViewerEvents} from "tc-shared/ui/modal/video-viewer/Definitions";
import {PermissionModalEvents} from "tc-shared/ui/modal/permission/ModalDefinitions";
import {PermissionEditorEvents} from "tc-shared/ui/modal/permission/EditorDefinitions";
import {PermissionEditorServerInfo} from "tc-shared/ui/modal/permission/ModalRenderer";
import {ModalAvatarUploadEvents, ModalAvatarUploadVariables} from "tc-shared/ui/modal/avatar-upload/Definitions";
import {ModalInputProcessorEvents, ModalInputProcessorVariables} from "tc-shared/ui/modal/input-processor/Definitios";

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

export interface ModalEvents {
    "open": {},
    "close": {},

    "destroy": {}
}

export enum ModalState {
    SHOWN,
    HIDDEN,
    DESTROYED
}

export interface ModalInstanceEvents {
    /* Actions which must be implemented by our modal owner */
    action_close: {},
    action_minimize: {},
    action_popout: {},

    /* State changes we encountered */
    notify_open: {}
    notify_minimize: {},
    notify_close: {},
    notify_destroy: {},
}

export interface ModalInstanceController {
    getState() : ModalState;
    getEvents() : Registry<ModalInstanceEvents>;

    show() : Promise<void>;
    hide() : Promise<void>;

    minimize() : Promise<void>;
    maximize() : Promise<void>;

    destroy();
}

export interface ModalController {
    getOptions() : Readonly<ModalOptions>;
    getEvents() : Registry<ModalEvents>;
    getState() : ModalState;

    show() : Promise<void>;
    hide() : Promise<void>;

    destroy();
}

export interface ModalInstanceProperties {
    windowed: boolean
}

let currentModalProperties: ModalInstanceProperties
export abstract class AbstractModal {
    protected readonly properties: ModalInstanceProperties;

    protected constructor() {
        if(typeof currentModalProperties === "undefined") {
            throw "missing modal properties";
        }
        this.properties = currentModalProperties;
        currentModalProperties = undefined;
    }

    abstract renderBody() : ReactElement;
    abstract renderTitle() : string | React.ReactElement;

    /* only valid for the "inline" modals */
    type() : ModalType { return "none"; }
    color() : "none" | "blue" { return "none"; }
    verticalAlignment() : "top" | "center" | "bottom" { return "center"; }

    /** @deprecated */
    protected onInitialize() {}
    protected onDestroy() {}

    protected onClose() {}
    protected onOpen() {}
}
export abstract class InternalModal extends AbstractModal {}

export function constructAbstractModalClass<T extends keyof ModalConstructorArguments>(
    klass: new (...args: ModalConstructorArguments[T]) => AbstractModal,
    properties: ModalInstanceProperties,
    args: ModalConstructorArguments[T]) : AbstractModal {
    currentModalProperties = properties;
    try {
        return new klass(...args);
    } finally {
        currentModalProperties = undefined;
    }
}


export interface ModalConstructorArguments {
    "__internal__modal__": any[],

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
    ],
    "modal-bookmarks": [
        /* events */ IpcRegistryDescription<ModalBookmarkEvents>,
        /* variables */ IpcVariableDescriptor<ModalBookmarkVariables>,
    ],
    "modal-bookmark-add-server": [
        /* events */ IpcRegistryDescription<ModalBookmarksAddServerEvents>,
        /* variables */ IpcVariableDescriptor<ModalBookmarksAddServerVariables>,
    ],
    "modal-poked": [
        /* events */ IpcRegistryDescription<ModalPokeEvents>,
        /* variables */ IpcVariableDescriptor<ModalPokeVariables>,
    ],
    "modal-assign-server-groups": [
        /* events */ IpcRegistryDescription<ModalClientGroupAssignmentEvents>,
        /* variables */ IpcVariableDescriptor<ModalClientGroupAssignmentVariables>,
    ],
    "modal-permission-edit": [
        /* serverInfo */ PermissionEditorServerInfo,
        /* modalEvents */ IpcRegistryDescription<PermissionModalEvents>,
        /* editorEvents */ IpcRegistryDescription<PermissionEditorEvents>
    ],
    "modal-avatar-upload": [
        /* events */ IpcRegistryDescription<ModalAvatarUploadEvents>,
        /* variables */ IpcVariableDescriptor<ModalAvatarUploadVariables>,
        /* serverUniqueId */ string
    ],
    "modal-input-processor": [
        /* events */ IpcRegistryDescription<ModalInputProcessorEvents>,
        /* variables */ IpcVariableDescriptor<ModalInputProcessorVariables>,
    ]
}