import {EventHandler, Registry} from "tc-shared/events";
import {
    ChannelEntryInfo,
    ChannelIcons,
    ChannelTreeDragEntry,
    ChannelTreeUIEvents,
    ClientIcons,
    ClientNameInfo,
    ClientTalkIconState,
    ServerState
} from "tc-shared/ui/tree/Definitions";
import {ChannelTreeView, PopoutButton} from "tc-shared/ui/tree/RendererView";
import * as React from "react";
import {ChannelIconClass, ChannelIconsRenderer, RendererChannel} from "tc-shared/ui/tree/RendererChannel";
import {ClientIcon} from "svg-sprites/client-icons";
import {UnreadMarkerRenderer} from "tc-shared/ui/tree/RendererTreeEntry";
import {LogCategory, logError, logWarn} from "tc-shared/log";
import {
    ClientIconsRenderer,
    ClientName,
    ClientStatus,
    ClientTalkStatusIcon,
    RendererClient
} from "tc-shared/ui/tree/RendererClient";
import {ServerRenderer} from "tc-shared/ui/tree/RendererServer";
import {
    DragImageEntryType,
    generateDragElement,
    getDragInfo,
    parseDragData,
    setupDragData
} from "tc-shared/ui/tree/DragHelper";
import {createErrorModal} from "tc-shared/ui/elements/Modal";

function isEquivalent(a, b) {
    const typeA = typeof a;
    const typeB = typeof b;

    if(typeA !== typeB) { return false; }

    if(typeA === "function") {
        throw "cant compare function";
    } else if(typeA === "object") {
        if(Array.isArray(a)) {
            if(!Array.isArray(b) || b.length !== a.length) {
                return false;
            }

            for(let index = 0; index < a.length; index++) {
                if(!isEquivalent(a[index], b[index])) {
                    return false;
                }
            }

            return true;
        } else {
            const keys = Object.keys(a);
            for(const key of keys) {
                if(!(key in b)) {
                    return false;
                }

                if(!isEquivalent(a[key], b[key])) {
                    return false;
                }
            }
            return true;
        }
    } else {
        return a === b;
    }
}

function generateDragElementFromRdp(entries: RDPEntry[]) : HTMLElement {
    return generateDragElement(entries.map<DragImageEntryType>(entry => {
        if(entry instanceof RDPClient) {
            return { name: entry.name?.name, icon: entry.status };
        } else if(entry instanceof RDPChannel) {
            return { name: entry.info?.name, icon: entry.icon };
        } else if(entry instanceof RDPServer) {
            switch (entry.state.state) {
                case "connected":
                    return { name: entry.state.name, icon: ClientIcon.ServerGreen };
                case "disconnected":
                    return { name: tr("Not connected"), icon: ClientIcon.ServerGreen };
                case "connecting":
                    return { name: tr("Connecting"), icon: ClientIcon.ServerGreen };
            }
        }
    }));
}

/**
 * auto      := Select/unselect/add/remove depending on the selected state & shift key state
 * exclusive := Only selected these entries
 * append    := Append these entries to the current selection
 * remove    := Remove these entries from the current selection
 */
export type RDPTreeSelectType = "auto" | "auto-add" | "exclusive" | "append" | "remove";
export class RDPTreeSelection {
    readonly handle: RDPChannelTree;
    selectedEntries: RDPEntry[] = [];

    private readonly documentKeyListener;
    private readonly documentBlurListener;
    private shiftKeyPressed = false;
    private controlKeyPressed = false;

    private rangeStartEntry: RDPEntry;
    private rangeMode: "add" | "remove";

    constructor(handle: RDPChannelTree) {
        this.handle = handle;

        this.documentKeyListener = (event: KeyboardEvent) => {
            this.shiftKeyPressed = event.shiftKey;
            this.controlKeyPressed = event.ctrlKey;
        };

        this.documentBlurListener = (event: MouseEvent | FocusEvent) => {
            if(event.relatedTarget === null || event.relatedTarget["nodeName"] === "HTML") {
                this.shiftKeyPressed = false;
                this.controlKeyPressed = false;
            }
        };

        document.addEventListener("keydown", this.documentKeyListener);
        document.addEventListener("keyup", this.documentKeyListener);
        document.addEventListener("focusout", this.documentBlurListener);
        document.addEventListener("mouseout", this.documentBlurListener);
    }

    reset() {
        this.clearSelection();
    }

    destroy() {
        document.removeEventListener("keydown", this.documentKeyListener);
        document.removeEventListener("keyup", this.documentKeyListener);
        document.removeEventListener("focusout", this.documentBlurListener);
        document.removeEventListener("mouseout", this.documentBlurListener);
        this.selectedEntries.splice(0, this.selectedEntries.length);
    }

    isMultiSelect() {
        return this.selectedEntries.length > 1;
    }

    isAnythingSelected() {
        return this.selectedEntries.length > 0;
    }

    clearSelection() {
        this.select([], "exclusive", false);
    }

    select(entries: RDPEntry[], mode: RDPTreeSelectType, selectMainTree: boolean) {
        entries = entries.filter(entry => !!entry);

        let deletedEntries: RDPEntry[] = [];
        let newEntries: RDPEntry[] = [];

        if(mode === "exclusive") {
            deletedEntries = this.selectedEntries.slice();
            newEntries = entries;
            this.rangeStartEntry = entries.last();
        } else if(mode === "append") {
            newEntries = entries;
        } else if(mode === "remove") {
            deletedEntries = entries;
        } else if(mode === "auto" || mode === "auto-add") {
            if(this.shiftKeyPressed && this.selectedEntries.length === 1) {
                this.rangeStartEntry = this.selectedEntries[0];
                this.rangeMode = "add";
            }

            if(this.shiftKeyPressed && this.rangeStartEntry) {
                const treeEntries = this.handle.getTreeEntries();

                const targetEntry = entries.last();
                if(!targetEntry) { return; }

                let targetIndex = treeEntries.indexOf(targetEntry);
                let sourceIndex = treeEntries.indexOf(this.rangeStartEntry);
                if(sourceIndex === -1 || targetIndex === -1) { return; }

                if(targetIndex < sourceIndex) {
                    const index = targetIndex;
                    targetIndex = sourceIndex;
                    sourceIndex = index;
                }

                const array = this.rangeMode === "add" ? newEntries : deletedEntries;
                for(let index = sourceIndex; index <= targetIndex; index++) {
                    array.push(treeEntries[index]);
                }
            } else if(this.controlKeyPressed || this.shiftKeyPressed) {
                const targetEntry = entries.last();
                if(!targetEntry) { return; }

                this.rangeStartEntry = targetEntry;
                if(this.selectedEntries.indexOf(targetEntry) === -1 || mode === "auto-add") {
                    this.rangeMode = "add";
                    newEntries.push(targetEntry);
                } else {
                    this.rangeMode = "remove";
                    deletedEntries.push(targetEntry);
                }
            } else {
                this.rangeStartEntry = undefined;
                deletedEntries = this.selectedEntries.slice();
                newEntries = entries;
            }
        } else {
            logWarn(LogCategory.CHANNEL, tr("Received entry select event with unknown mode: %s"), mode);
        }

        newEntries.forEach(entry => deletedEntries.remove(entry));
        newEntries = newEntries.filter(entry => {
            if(this.selectedEntries.indexOf(entry) === -1) {
                this.selectedEntries.push(entry);
                return true;
            } else {
                return false;
            }
        });
        deletedEntries = deletedEntries.filter(entry => this.selectedEntries.remove(entry));
        deletedEntries.forEach(entry => entry.setSelected(false));
        newEntries.forEach(entry => entry.setSelected(true));

        /* it's important to keep it sorted from the top to the bottom (example would be the channel move) */
        if(deletedEntries.length > 0 || newEntries.length > 0) {
            const treeEntries = this.handle.getTreeEntries();

            const lookupMap = {};
            this.selectedEntries.forEach(entry => lookupMap[entry.entryId] = treeEntries.indexOf(entry));
            this.selectedEntries.sort((a, b) => lookupMap[a.entryId] - lookupMap[b.entryId]);
        }

        if(this.selectedEntries.length === 1 && selectMainTree) {
            this.handle.events.fire("action_select", { treeEntryId: this.selectedEntries[0].entryId });
        }
    }

    public selectNext(selectClients: boolean, direction: "up" | "down") {
        const entries = this.handle.getTreeEntries();
        const selectedEntriesIndex = this.selectedEntries.map(e => entries.indexOf(e)).filter(e => e !== -1);

        let index;
        if(direction === "up") {
            index = selectedEntriesIndex.reduce((previousValue, currentValue) => Math.min(previousValue, currentValue), entries.length);
            if(index === entries.length) {
                index = entries.length - 1;
            }
        } else {
            index = selectedEntriesIndex.reduce((previousValue, currentValue) => Math.max(previousValue, currentValue), -1);
            if(index === -1) {
                index = entries.length - 1;
            }
        }

        if(index === -1) {
            /* tree contains no entries */
            return;
        }

        if(!this.doSelectNext(entries[index], selectClients, direction)) {
            /* There is no next entry. Select the last one. */
            if(this.isMultiSelect()) {
                this.select([ entries[index] ], "exclusive", true);
            }
        }
    }

    private doSelectNext(current: RDPEntry, selectClients: boolean, direction: "up" | "down") : boolean {
        const directionModifier = direction === "down" ? 1 : -1;

        const entries = this.handle.getTreeEntries();
        let index = entries.indexOf(current);
        if(index === -1) { return false; }
        index += directionModifier;

        if(selectClients) {
            if(index >= entries.length || index < 0) {
                return false;
            }

            this.select([entries[index]], "exclusive", true);
            return true;
        } else {
            while(index >= 0 && index < entries.length && entries[index] instanceof RDPClient) {
                index += directionModifier;
            }

            if(index === entries.length || index <= 0) {
                return false;
            }

            this.select([entries[index]], "exclusive", true);
            return true;
        }
    }
}

export class RDPChannelTree {
    readonly events: Registry<ChannelTreeUIEvents>;
    readonly handlerId: string;

    private registeredEventHandlers = [];

    readonly refTree = React.createRef<ChannelTreeView>();
    readonly refPopoutButton = React.createRef<PopoutButton>();

    readonly selection: RDPTreeSelection;

    popoutShown: boolean = false;
    popoutButtonShown: boolean = false;

    private readonly documentDragStopListener;

    private treeRevision: number = 0;
    private orderedTree: RDPEntry[] = [];
    private treeEntries: {[key: number]: RDPEntry} = {};

    private dragOverChannelEntry: RDPChannel;

    constructor(events: Registry<ChannelTreeUIEvents>, handlerId: string) {
        this.events = events;
        this.handlerId = handlerId;
        this.selection = new RDPTreeSelection(this);

        this.documentDragStopListener = () => {
            if(this.dragOverChannelEntry) {
                this.dragOverChannelEntry.setDragHint("none");
                this.dragOverChannelEntry = undefined;
            }
        }
    }

    initialize() {
        this.events.register_handler(this);

        const events = this.registeredEventHandlers;

        events.push(this.events.on("notify_unread_state", event => {
            const entry = this.treeEntries[event.treeEntryId];
            if(!entry) {
                logError(LogCategory.CHANNEL, tr("Received unread notify for invalid tree entry %o."), event.treeEntryId);
                return;
            }

            entry.handleUnreadUpdate(event.unread);
        }));

        events.push(this.events.on("notify_channel_info", event => {
            const entry = this.treeEntries[event.treeEntryId];
            if(!entry || !(entry instanceof RDPChannel)) {
                logError(LogCategory.CHANNEL, tr("Received channel info notify for invalid tree entry %o."), event.treeEntryId);
                return;
            }

            entry.handleInfoUpdate(event.info);
        }));

        events.push(this.events.on("notify_channel_icon", event => {
            const entry = this.treeEntries[event.treeEntryId];
            if(!entry || !(entry instanceof RDPChannel)) {
                logError(LogCategory.CHANNEL, tr("Received channel icon notify for invalid tree entry %o."), event.treeEntryId);
                return;
            }

            entry.handleIconUpdate(event.icon);
        }));

        events.push(this.events.on("notify_channel_icons", event => {
            const entry = this.treeEntries[event.treeEntryId];
            if(!entry || !(entry instanceof RDPChannel)) {
                logError(LogCategory.CHANNEL, tr("Received channel icons notify for invalid tree entry %o."), event.treeEntryId);
                return;
            }

            entry.handleIconsUpdate(event.icons);
        }));


        events.push(this.events.on("notify_client_status", event => {
            const entry = this.treeEntries[event.treeEntryId];
            if(!entry || !(entry instanceof RDPClient)) {
                logError(LogCategory.CHANNEL, tr("Received client status notify for invalid tree entry %o."), event.treeEntryId);
                return;
            }

            entry.handleStatusUpdate(event.status);
        }));

        events.push(this.events.on("notify_client_name", event => {
            const entry = this.treeEntries[event.treeEntryId];
            if(!entry || !(entry instanceof RDPClient)) {
                logError(LogCategory.CHANNEL, tr("Received client name notify for invalid tree entry %o."), event.treeEntryId);
                return;
            }

            entry.handleNameUpdate(event.info);
        }));

        events.push(this.events.on("notify_client_icons", event => {
            const entry = this.treeEntries[event.treeEntryId];
            if(!entry || !(entry instanceof RDPClient)) {
                logError(LogCategory.CHANNEL, tr("Received client icons notify for invalid tree entry %o."), event.treeEntryId);
                return;
            }

            entry.handleIconsUpdate(event.icons);
        }));

        events.push(this.events.on("notify_client_talk_status", event => {
            const entry = this.treeEntries[event.treeEntryId];
            if(!entry || !(entry instanceof RDPClient)) {
                logError(LogCategory.CHANNEL, tr("Received client talk notify for invalid tree entry %o."), event.treeEntryId);
                return;
            }

            entry.handleTalkStatusUpdate(event.status, event.requestMessage);
        }));

        events.push(this.events.on("notify_client_name_edit", event => {
            const entry = this.treeEntries[event.treeEntryId];
            if(!entry || !(entry instanceof RDPClient)) {
                logError(LogCategory.CHANNEL, tr("Received client name edit notify for invalid tree entry %o."), event.treeEntryId);
                return;
            }

            entry.handleOpenRename(event.initialValue);
        }));


        events.push(this.events.on("notify_server_state", event => {
            const entry = this.treeEntries[event.treeEntryId];
            if(!entry || !(entry instanceof RDPServer)) {
                logError(LogCategory.CHANNEL, tr("Received server state notify for invalid tree entry %o."), event.treeEntryId);
                return;
            }

            entry.handleStateUpdate(event.state);
        }));

        events.push(this.events.on("notify_selected_entry", event => {
            const entry = this.getTreeEntries().find(entry => entry.entryId === event.treeEntryId);
            this.selection.select(entry ? [entry] : [], "exclusive", false);
            if(entry) {
                this.refTree.current?.scrollEntryInView(entry.entryId);
            }
        }));

        document.addEventListener("dragend", this.documentDragStopListener);
        document.addEventListener("focusout", this.documentDragStopListener);
        document.addEventListener("mouseout", this.documentDragStopListener);

        this.events.fire("query_tree_entries", { fullInfo: true });
        this.events.fire("query_popout_state");
        this.events.fire("query_selected_entry");
    }

    destroy() {
        document.removeEventListener("dragend", this.documentDragStopListener);
        document.removeEventListener("focusout", this.documentDragStopListener);
        document.removeEventListener("mouseout", this.documentDragStopListener);

        this.events.unregister_handler(this);
        this.registeredEventHandlers.forEach(callback => callback());
        this.registeredEventHandlers = [];
    }

    getTreeEntries() {
        return this.orderedTree;
    }

    handleDragStart(event: DragEvent) {
        const entries = this.selection.selectedEntries;
        if(entries.length === 0) {
            /* should never happen */
            event.preventDefault();
            return;
        }

        let dragType;
        if(entries.findIndex(e => !(e instanceof RDPClient)) === -1) {
            /* clients only => move */
            event.dataTransfer.effectAllowed = "move"; /* prohibit copying */
            dragType = "client";
        } else if(entries.findIndex(e => !(e instanceof RDPServer)) === -1) {
            /* server only => doing nothing right now */
            event.preventDefault();
            return;
        } else if(entries.findIndex(e => !(e instanceof RDPChannel)) === -1) {
            /* channels only => move */
            event.dataTransfer.effectAllowed = "all";
            dragType = "channel";
        } else {
            event.preventDefault();
            return;
        }

        event.dataTransfer.dropEffect = "move";
        event.dataTransfer.setDragImage(generateDragElementFromRdp(entries), 0, 6);
        setupDragData(event.dataTransfer, this.handlerId, entries.map<ChannelTreeDragEntry>(entry => {
            if(entry instanceof RDPClient) {
                return {
                    type: "client",
                    uniqueTreeId: entry.entryId
                };
            } else if(entry instanceof RDPChannel) {
                return {
                    type: "channel",
                    uniqueTreeId: entry.entryId
                };
            }  else if(entry instanceof RDPServer) {
                return {
                    type: "server",
                };
            }
        }).filter(entry => !!entry), dragType);

        {
            let texts = [];
            for(const entry of entries) {
                if(entry instanceof RDPClient) {
                    texts.push(entry.name?.name);
                } else if(entry instanceof RDPChannel) {
                    texts.push(entry.info?.name);
                } else if(entry instanceof RDPServer) {
                    texts.push(entry.state.state === "connected" ? entry.state.name : undefined);
                }
            }
            event.dataTransfer.setData("text/plain", texts.filter(e => !!e).join(", "));
        }
    }


    handleUiDragOver(event: DragEvent, target: RDPEntry) {
        if(this.dragOverChannelEntry !== target) {
            this.dragOverChannelEntry?.setDragHint("none");
            this.dragOverChannelEntry = undefined;
        }

        const info = getDragInfo(event.dataTransfer);
        if(!info) {
            return;
        }

        event.dataTransfer.dropEffect = info.handlerId === this.handlerId ? "move" : "copy";
        if(info.type === "client") {
            if(target instanceof RDPServer) {
                /* can't move a client into a server */
                return;
            }


            if(target instanceof RDPChannel) {
                target.setDragHint("contain");
                this.dragOverChannelEntry = target;
            } else {
                const treeEntries = this.getTreeEntries();

                let index = treeEntries.indexOf(target);

                while(index >= 0 && !(treeEntries[index] instanceof RDPChannel)) {
                    index--;
                }

                if(index < 0) { return; }
                this.dragOverChannelEntry = treeEntries[index] as RDPChannel;
                this.dragOverChannelEntry.setDragHint("contain");
            }

            /* clients can be dropped anywhere (if they're getting dropped on another client we'll use use his channel */
            event.preventDefault();
            return;
        } else if(info.type === "channel") {
            if(!(target instanceof RDPChannel) || !target.refChannelContainer.current) {
                /* channel could only be moved into channels */
                return;
            }

            const containerPosition = target.refChannelContainer.current.getBoundingClientRect();
            const offsetY = (event.pageY - containerPosition.y) / containerPosition.height;

            if(offsetY <= .25) {
                target.setDragHint("top");
            } else if(offsetY <= .75) {
                target.setDragHint("contain");
            } else {
                target.setDragHint("bottom");
            }

            this.dragOverChannelEntry = target;
            event.preventDefault();
        } else {
            /* unknown => not supported */
        }
    }

    handleUiDrop(event: DragEvent, target: RDPEntry) {
        let currentDragHint: RDPChannelDragHint;
        if(this.dragOverChannelEntry) {
            currentDragHint = this.dragOverChannelEntry?.dragHint;
            this.dragOverChannelEntry?.setDragHint("none");
            this.dragOverChannelEntry = undefined;
        }

        const data = parseDragData(event.dataTransfer);
        if(!data) {
            return;
        }

        event.preventDefault();
        if(data.type === "client") {
            if(data.handlerId !== this.handlerId) {
                createErrorModal(tr("Action not possible"), tr("You can't move clients between different server connections.")).open();
                return;
            }

            this.events.fire("action_move_clients", {
                entries: data.entries,
                targetTreeEntry: target.entryId
            });
        } else if(data.type === "channel") {
            if(!(target instanceof RDPChannel)) {
                return;
            }

            if(!currentDragHint || currentDragHint === "none") {
                return;
            }

            if(data.entries.findIndex(entry => entry.type === "channel" && "uniqueTreeId" in entry && entry.uniqueTreeId === target.entryId) !== -1) {
                return;
            }

            this.events.fire("action_move_channels", {
                targetTreeEntry: target.entryId,
                mode: currentDragHint === "contain" ? "child" : currentDragHint === "top" ? "before" : "after",
                entries: data.entries
            });
        }
    }

    @EventHandler<ChannelTreeUIEvents>("notify_tree_entries_full")
    private handleNotifyTreeEntries(event: ChannelTreeUIEvents["notify_tree_entries_full"]) {
        const oldEntryInstances = this.treeEntries;
        this.treeEntries = {};

        this.orderedTree = event.entries.map((entry, index) => {
            let result: RDPEntry;
            switch (entry.type) {
                case "channel":
                    const channel = oldEntryInstances[entry.entryId] || new RDPChannel(this, entry.entryId);
                    if(!(channel instanceof RDPChannel)) {
                        throw tr("entry id type changed");
                    }

                    if(entry.fullInfo) {
                        channel.stateQueried = true;
                        channel.unread = entry.unread;
                        channel.handleInfoUpdate(entry.info);
                        channel.handleIconUpdate(entry.icon);
                        channel.handleIconsUpdate(entry.icons);
                    } else if(!channel.stateQueried) {
                        channel.queryState();
                    }
                    result = channel;
                    break;

                case "client":
                case "client-local":
                    const client = oldEntryInstances[entry.entryId] || new RDPClient(this, entry.entryId, entry.type === "client-local");
                    if(!(client instanceof RDPClient)) {
                        throw tr("entry id type changed");
                    }

                    if(entry.fullInfo) {
                        client.stateQueried = true;
                        client.unread = entry.unread;
                        client.handleNameUpdate(entry.name);
                        client.handleStatusUpdate(entry.status);
                        client.handleIconsUpdate(entry.icons);
                        client.handleTalkStatusUpdate(entry.talkStatus, entry.talkRequestMessage);
                    } else if(!client.stateQueried) {
                        client.queryState();
                    }
                    result = client;
                    break;

                case "server":
                    const server = oldEntryInstances[entry.entryId] || new RDPServer(this, entry.entryId);
                    if(!(server instanceof RDPServer)) {
                        throw tr("entry id type changed");
                    }

                    if(entry.fullInfo) {
                        server.stateQueried = true;
                        server.unread = entry.unread;
                        server.handleStateUpdate(entry.state);
                    } else if(!server.stateQueried) {
                        server.queryState();
                    }
                    result = server;
                    break;

                default:
                    throw "invalid channel entry type " + (entry as any).type;
            }
            delete oldEntryInstances[entry.entryId];

            this.treeEntries[entry.entryId] = result;
            result.handlePositionUpdate(index, entry.depth);

            return result;
        }).filter(e => !!e);

        const removedEntries = Object.keys(oldEntryInstances).map(key => oldEntryInstances[key]);
        if(removedEntries.indexOf(this.dragOverChannelEntry) !== -1) {
            this.dragOverChannelEntry = undefined;
        }

        if(removedEntries.length > 0) {
            this.selection.select(removedEntries, "remove", false);
            removedEntries.forEach(entry => entry.destroy());
        }

        this.refTree.current?.setState({
            tree: this.orderedTree.slice(),
            treeRevision: ++this.treeRevision
        });
    }

    @EventHandler<ChannelTreeUIEvents>("notify_popout_state")
    private handleNotifyPopoutState(event: ChannelTreeUIEvents["notify_popout_state"]) {
        this.popoutShown = event.shown;
        this.popoutButtonShown = event.showButton;
        this.refPopoutButton.current?.forceUpdate();
    }
}

export abstract class RDPEntry {
    readonly handle: RDPChannelTree;
    readonly entryId: number;

    readonly refUnread = React.createRef<UnreadMarkerRenderer>();

    stateQueried: boolean;

    offsetTop: number; /* In 16px units */
    offsetLeft: number; /* In channel units */

    selected: boolean = false;
    unread: boolean = false;

    private renderedInstance: React.ReactElement;
    private destroyed = false;

    protected constructor(handle: RDPChannelTree, entryId: number) {
        this.handle = handle;
        this.entryId = entryId;
    }

    destroy() {
        if(this.destroyed) {
            throw "can not destry an entry twice";
        }

        this.renderedInstance = undefined;
        this.destroyed = true;
    }

    /* returns true if this element does not longer exists, but it's still rendered */
    isDestroyed() { return this.destroyed; }

    getEvents() : Registry<ChannelTreeUIEvents> { return this.handle.events; }
    getHandlerId() : string { return this.handle.handlerId; }

    /* do the initial state query */
    queryState() {
        this.stateQueried = true;

        const events = this.getEvents();
        events.fire("query_unread_state", { treeEntryId: this.entryId });
    }

    handleUnreadUpdate(value: boolean) {
        if(this.unread === value) { return; }

        this.unread = value;
        this.refUnread.current?.forceUpdate();
    }

    setSelected(value: boolean) {
        if(this.selected === value) { return; }

        this.selected = value;
        this.renderSelectStateUpdate();
    }

    handlePositionUpdate(offsetTop: number, offsetLeft: number) {
        if(this.offsetLeft === offsetLeft && this.offsetTop === offsetTop) { return; }

        this.offsetTop = offsetTop;
        this.offsetLeft = offsetLeft;
        this.renderPositionUpdate();
    }

    render() : React.ReactElement {
        if(this.renderedInstance) { return this.renderedInstance; }

        return this.renderedInstance = this.doRender();
    }

    select(mode: RDPTreeSelectType) {
        this.handle.selection.select([ this ], mode, true);
    }

    handleUiDoubleClicked() {
        this.select("exclusive");
        this.getEvents().fire("action_client_double_click", { treeEntryId: this.entryId });
    }

    handleUiContextMenu(pageX: number, pageY: number) {
        this.select("auto-add");
        this.getEvents().fire("action_show_context_menu", {
            pageX: pageX,
            pageY: pageY,
            treeEntryIds: this.handle.selection.selectedEntries.map(entry => entry.entryId)
        });
    }

    handleUiDragStart(event: DragEvent) {
        if(!this.selected) {
            this.handle.selection.select([ this ], "exclusive", true);
        }

        this.handle.handleDragStart(event);
    }

    handleUiDragOver(event: DragEvent) {
        this.handle.handleUiDragOver(event, this);
    }

    handleUiDrop(event: DragEvent) {
        this.handle.handleUiDrop(event, this);
    }

    protected abstract doRender() : React.ReactElement;

    protected abstract renderSelectStateUpdate();
    protected abstract renderPositionUpdate();
}

export type RDPChannelDragHint = "none" | "top" | "bottom" | "contain";
export class RDPChannel extends RDPEntry {
    readonly refIcon = React.createRef<ChannelIconClass>();
    readonly refIcons = React.createRef<ChannelIconsRenderer>();
    readonly refChannel = React.createRef<RendererChannel>();
    readonly refChannelContainer = React.createRef<HTMLDivElement>();

    /* if uninitialized, undefined */
    info: ChannelEntryInfo;

    /* if uninitialized, undefined */
    icon: ClientIcon;

    /* if uninitialized, undefined */
    icons: ChannelIcons;

    dragHint: "none" | "top" | "bottom" | "contain";

    constructor(handle: RDPChannelTree, entryId: number) {
        super(handle, entryId);

        this.dragHint = "none";
    }

    doRender(): React.ReactElement {
        return <RendererChannel channel={this} key={this.entryId} ref={this.refChannel} />;
    }

    queryState() {
        super.queryState();

        const events = this.getEvents();
        events.fire("query_channel_info", { treeEntryId: this.entryId });
        events.fire("query_channel_icons", { treeEntryId: this.entryId });
        events.fire("query_channel_icon", { treeEntryId: this.entryId });
    }

    renderSelectStateUpdate() {
        this.refChannel.current?.forceUpdate();
    }

    protected renderPositionUpdate() {
        this.refChannel.current?.forceUpdate();
    }

    handleIconUpdate(newIcon: ClientIcon) {
        if(newIcon === this.icon) { return; }

        this.icon = newIcon;
        this.refIcon.current?.forceUpdate();
    }

    handleIconsUpdate(newIcons: ChannelIcons) {
        if(isEquivalent(newIcons, this.icons)) { return; }

        this.icons = newIcons;
        this.refIcons.current?.forceUpdate();
    }

    handleInfoUpdate(newInfo: ChannelEntryInfo) {
        if(isEquivalent(newInfo, this.info)) { return; }

        this.info = newInfo;
        this.refChannel.current?.forceUpdate();
    }

    setDragHint(hint: RDPChannelDragHint) {
        if(this.dragHint === hint) { return; }

        this.dragHint = hint;
        this.refChannel.current?.forceUpdate();
    }
}

export class RDPClient extends RDPEntry {
    readonly refClient = React.createRef<RendererClient>();
    readonly refStatus = React.createRef<ClientStatus>();
    readonly refName = React.createRef<ClientName>();
    readonly refTalkStatus = React.createRef<ClientTalkStatusIcon>();
    readonly refIcons = React.createRef<ClientIconsRenderer>();

    readonly localClient: boolean;

    name: ClientNameInfo;
    status: ClientIcon;
    icons: ClientIcons;

    rename: boolean = false;
    renameDefault: string;

    talkStatus: ClientTalkIconState;
    talkRequestMessage: string;

    constructor(handle: RDPChannelTree, entryId: number, localClient: boolean) {
        super(handle, entryId);
        this.localClient = localClient;
    }

    doRender(): React.ReactElement {
        return <RendererClient client={this} ref={this.refClient} key={this.entryId} />;
    }

    queryState() {
        super.queryState();

        const events = this.getEvents();
        events.fire("query_client_name", { treeEntryId: this.entryId });
        events.fire("query_client_status", { treeEntryId: this.entryId });
        events.fire("query_client_talk_status", { treeEntryId: this.entryId });
        events.fire("query_client_icons", { treeEntryId: this.entryId });
    }

    protected renderPositionUpdate() {
        this.refClient.current?.forceUpdate();
    }

    protected renderSelectStateUpdate() {
        this.refClient.current?.forceUpdate();
    }

    handleStatusUpdate(newStatus: ClientIcon) {
        if(newStatus === this.status) { return; }

        this.status = newStatus;
        this.refStatus.current?.forceUpdate();
    }

    handleNameUpdate(newName: ClientNameInfo) {
        if(isEquivalent(newName, this.name)) { return; }

        this.name = newName;
        this.refName.current?.forceUpdate();
    }

    handleTalkStatusUpdate(newStatus: ClientTalkIconState, requestMessage: string) {
        if(this.talkStatus === newStatus && this.talkRequestMessage === requestMessage) { return; }

        this.talkStatus = newStatus;
        this.talkRequestMessage = requestMessage;
        this.refTalkStatus.current?.forceUpdate();
    }

    handleIconsUpdate(newIcons: ClientIcons) {
        if(isEquivalent(newIcons, this.icons)) { return; }

        this.icons = newIcons;
        this.refIcons.current?.forceUpdate();
    }

    handleOpenRename(initialValue: string) {
        if(!initialValue) {
            this.rename = false;
            this.renameDefault = undefined;
            this.refClient.current?.forceUpdate();
            return;
        }
        if(!this.handle.refTree.current || !this.refClient.current) {
            /* TODO: Send error */
            return;
        }

        this.handle.refTree.current.scrollEntryInView(this.entryId, () => {
            this.rename = true;
            this.renameDefault = initialValue;
            this.refClient.current?.forceUpdate();
        });
    }
}

export class RDPServer extends RDPEntry {
    readonly refServer = React.createRef<ServerRenderer>();

    state: ServerState;

    constructor(handle: RDPChannelTree, entryId: number) {
        super(handle, entryId);
    }

    queryState() {
        super.queryState();

        const events = this.getEvents();
        events.fire("query_server_state", { treeEntryId: this.entryId });
    }

    protected doRender(): React.ReactElement {
        return <ServerRenderer server={this} ref={this.refServer} key={this.entryId} />;
    }

    protected renderPositionUpdate() {
        this.refServer.current?.forceUpdate();
    }

    protected renderSelectStateUpdate() {
        this.refServer.current?.forceUpdate();
    }

    handleStateUpdate(newState: ServerState) {
        if(isEquivalent(newState, this.state)) { return; }

        this.state = newState;
        this.refServer.current?.forceUpdate();
    }
}