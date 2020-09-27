import {EventHandler, Registry} from "tc-shared/events";
import {
    ChannelEntryInfo,
    ChannelIcons,
    ChannelTreeUIEvents,
    ClientIcons,
    ClientNameInfo, ClientTalkIconState, ServerState
} from "tc-shared/ui/tree/Definitions";
import {ChannelTreeView} from "tc-shared/ui/tree/RendererView";
import * as React from "react";
import {ChannelIconClass, ChannelIconsRenderer, RendererChannel} from "tc-shared/ui/tree/RendererChannel";
import {ClientIcon} from "svg-sprites/client-icons";
import {UnreadMarkerRenderer} from "tc-shared/ui/tree/RendererTreeEntry";
import {LogCategory, logError} from "tc-shared/log";
import {
    ClientIconsRenderer,
    ClientName,
    ClientStatus,
    ClientTalkStatusIcon,
    RendererClient
} from "tc-shared/ui/tree/RendererClient";
import {ServerRenderer} from "tc-shared/ui/tree/RendererServer";
import {RendererMove} from "./RendererMove";

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

export class RDPChannelTree {
    readonly events: Registry<ChannelTreeUIEvents>;
    readonly handlerId: string;

    private registeredEventHandlers = [];

    readonly refMove = React.createRef<RendererMove>();
    readonly refTree = React.createRef<ChannelTreeView>();

    private treeRevision: number = 0;
    private orderedTree: RDPEntry[] = [];
    private treeEntries: {[key: number]: RDPEntry} = {};

    constructor(events: Registry<ChannelTreeUIEvents>, handlerId: string) {
        this.events = events;
        this.handlerId = handlerId;
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

        events.push(this.events.on("notify_select_state", event => {
            const entry = this.treeEntries[event.treeEntryId];
            if(!entry) {
                logError(LogCategory.CHANNEL, tr("Received select notify for invalid tree entry %o."), event.treeEntryId);
                return;
            }

            entry.handleSelectUpdate(event.selected);
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

        this.events.fire("query_tree_entries");
    }

    destroy() {
        this.events.unregister_handler(this);
        this.registeredEventHandlers.forEach(callback => callback());
        this.registeredEventHandlers = [];
    }

    getTreeEntries() {
        return this.orderedTree;
    }

    @EventHandler<ChannelTreeUIEvents>("notify_tree_entries")
    private handleNotifyTreeEntries(event: ChannelTreeUIEvents["notify_tree_entries"]) {
        const oldEntryInstances = this.treeEntries;
        this.treeEntries = {};

        this.orderedTree = event.entries.map((entry, index) => {
            let result: RDPEntry;
            if(oldEntryInstances[entry.entryId]) {
                result = oldEntryInstances[entry.entryId];
                delete oldEntryInstances[entry.entryId];
            } else {
                switch (entry.type) {
                    case "channel":
                        result = new RDPChannel(this, entry.entryId);
                        break;

                    case "client":
                    case "client-local":
                        result = new RDPClient(this, entry.entryId, entry.type === "client-local");
                        break;

                    case "server":
                        result = new RDPServer(this, entry.entryId);
                        break;

                    default:
                        throw "invalid channel entry type " + entry.type;
                }

                result.queryState();
            }

            this.treeEntries[entry.entryId] = result;
            result.handlePositionUpdate(index * ChannelTreeView.EntryHeight, entry.depth);

            return result;
        }).filter(e => !!e);

        Object.keys(oldEntryInstances).map(key => oldEntryInstances[key]).forEach(entry => {
            entry.destroy();
        });

        this.refTree?.current.setState({
            tree: this.orderedTree.slice(),
            treeRevision: ++this.treeRevision
        });
    }


    @EventHandler<ChannelTreeUIEvents>("notify_entry_move")
    private handleNotifyEntryMove(event: ChannelTreeUIEvents["notify_entry_move"]) {
        if(!this.refMove.current) {
            this.events.fire_async("action_move_entries", { treeEntryId: 0 });
            return;
        }

        this.refMove.current.enableEntryMove(event.entries, event.begin, event.current);
    }
}

export abstract class RDPEntry {
    readonly handle: RDPChannelTree;
    readonly entryId: number;

    readonly refUnread = React.createRef<UnreadMarkerRenderer>();

    offsetTop: number;
    offsetLeft: number;

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
        const events = this.getEvents();

        events.fire("query_unread_state", { treeEntryId: this.entryId });
        events.fire("query_select_state", { treeEntryId: this.entryId });
    }

    handleUnreadUpdate(value: boolean) {
        if(this.unread === value) { return; }

        this.unread = value;
        this.refUnread.current?.forceUpdate();
    }

    handleSelectUpdate(value: boolean) {
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

    protected abstract doRender() : React.ReactElement;

    protected abstract renderSelectStateUpdate();
    protected abstract renderPositionUpdate();
}

export class RDPChannel extends RDPEntry {
    readonly refIcon = React.createRef<ChannelIconClass>();
    readonly refIcons = React.createRef<ChannelIconsRenderer>();
    readonly refChannel = React.createRef<RendererChannel>();

    /* if uninitialized, undefined */
    info: ChannelEntryInfo;

    /* if uninitialized, undefined */
    icon: ClientIcon;

    /* if uninitialized, undefined */
    icons: ChannelIcons;

    constructor(handle: RDPChannelTree, entryId: number) {
        super(handle, entryId);
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
    info: ClientNameInfo;
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