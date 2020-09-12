import {
    BatchUpdateAssignment,
    BatchUpdateType,
    ReactComponentBase
} from "tc-shared/ui/react-elements/ReactComponentBase";
import {ChannelTree, ChannelTreeEvents} from "tc-shared/tree/ChannelTree";
import ResizeObserver from 'resize-observer-polyfill';

import * as React from "react";

import {EventHandler, ReactEventHandler} from "tc-shared/events";

import {ChannelEntryView as ChannelEntryView} from "./Channel";
import {ServerEntry as ServerEntryView} from "./Server";
import {ClientEntry as ClientEntryView} from "./Client";

import {ChannelEntry, ChannelEvents} from "tc-shared/tree/Channel";
import {ServerEntry} from "tc-shared/tree/server";
import {ClientEntry, ClientType} from "tc-shared/tree/Client";
import * as log from "tc-shared/log";
import {LogCategory} from "tc-shared/log";
import {ConnectionEvents} from "tc-shared/ConnectionHandler";

const viewStyle = require("./View.scss");


export interface ChannelTreeViewProperties {
    tree: ChannelTree;
    onMoveStart: (start: { x: number, y: number }, current: { x: number, y: number }) => void;
    moveThreshold?: number;
}

export interface ChannelTreeViewState {
    element_scroll_offset?: number; /* in px */
    scroll_offset: number; /* in px */
    view_height: number; /* in px */

    tree_version: number;
    smoothScroll: boolean;
}

export type TreeEntry = ChannelEntry | ServerEntry | ClientEntry;
type FlatTreeEntry = {
    rendered: any;
    entry: TreeEntry;
}

//TODO: Only register listeners when channel is in view ;)
@ReactEventHandler<ChannelTreeView>(e => e.props.tree.events)
@BatchUpdateAssignment(BatchUpdateType.CHANNEL_TREE)
export class ChannelTreeView extends ReactComponentBase<ChannelTreeViewProperties, ChannelTreeViewState> {
    private static readonly EntryHeight = 18;

    private readonly ref_container = React.createRef<HTMLDivElement>();
    private resize_observer: ResizeObserver;

    private flat_tree: FlatTreeEntry[] = [];
    private listener_client_change;
    private listener_channel_change;
    private listener_state_collapsed;
    private listener_channel_properties;
    private listener_tree_visibility_changed;

    private update_timeout;
    private scrollFixRequested;

    private mouse_move: { x: number, y: number, down: boolean, fired: boolean } = { x: 0, y: 0, down: false, fired: false };
    private document_mouse_listener;

    private in_view_callbacks: {
        index: number,
        callback: () => void,
        timeout
    }[] = [];

    protected defaultState(): ChannelTreeViewState {
        return {
            scroll_offset: 0,
            view_height: 0,
            tree_version: 0,
            smoothScroll: false
        };
    }

    componentDidMount(): void {
        (window as any).channelTrees = (window as any).channelTrees || [];
        (window as any).channelTrees.push(this);

        this.resize_observer = new ResizeObserver(entries => {
            if(entries.length !== 1) {
                if(entries.length === 0)
                    console.warn(tr("Channel resize observer fired resize event with no entries!"));
                else
                    console.warn(tr("Channel resize observer fired resize event with more than one entry which should not be possible (%d)!"), entries.length);
                return;
            }
            const bounds = entries[0].contentRect;
            if(this.state.view_height !== bounds.height) {
                this.setState({
                    view_height: bounds.height
                });
            }
        });
        this.resize_observer.observe(this.ref_container.current);
        this.props.tree.client.events().on("notify_visibility_changed", this.listener_tree_visibility_changed);
    }

    componentWillUnmount(): void {
        (window as any).channelTrees?.remove(this);

        this.resize_observer.disconnect();
        this.resize_observer = undefined;

        this.props.tree.client.events().off("notify_visibility_changed", this.listener_tree_visibility_changed);
    }

    protected initialize() {
        this.listener_client_change = () => this.handleTreeUpdate();
        this.listener_channel_change = () => this.handleTreeUpdate();
        this.listener_state_collapsed = () => this.handleTreeUpdate();
        this.listener_channel_properties = (event: ChannelEvents["notify_properties_updated"]) => {
            if(typeof event.updated_properties.channel_needed_talk_power !== "undefined") /* talk power flags have changed */
                this.handleTreeUpdate();
        };

        this.document_mouse_listener = (e: MouseEvent) => {
            if(e.type !== "mouseleave" && e.button !== 0)
                return;

            this.mouse_move.down = false;
            this.mouse_move.fired = false;

            this.removeDocumentMouseListener();
        };

        this.listener_tree_visibility_changed = (event: ConnectionEvents["notify_visibility_changed"]) => {
            if(!event.visible) {
                this.setState({ smoothScroll: false });
                return;
            }

            if(this.scrollFixRequested)
                return;

            this.scrollFixRequested = true;
            requestAnimationFrame(() => {
                this.scrollFixRequested = false;
                this.ref_container.current.scrollTop = this.state.scroll_offset;
                this.setState({ smoothScroll: true });
            });
        }
    }

    private registerDocumentMouseListener() {
        document.addEventListener("mouseleave", this.document_mouse_listener);
        document.addEventListener("mouseup", this.document_mouse_listener);
    }

    private removeDocumentMouseListener() {
        document.removeEventListener("mouseleave", this.document_mouse_listener);
        document.removeEventListener("mouseup", this.document_mouse_listener);
    }

    private handleTreeUpdate() {
        clearTimeout(this.update_timeout);
        this.update_timeout = setTimeout(() => {
            this.rebuild_tree();
            this.forceUpdate();
        }, 50);
    }

    private visibleEntries() {
        let view_entry_count = Math.ceil(this.state.view_height / ChannelTreeView.EntryHeight);
        const view_entry_begin = Math.floor(this.state.scroll_offset / ChannelTreeView.EntryHeight);
        const view_entry_end = Math.min(this.flat_tree.length, view_entry_begin + view_entry_count);

        return {
            begin: view_entry_begin,
            end: view_entry_end
        }
    }

    render() {
        const entry_prerender_count = 5;
        const entry_postrender_count = 5;

        const elements = [];
        const renderedRange = this.visibleEntries();
        const view_entry_begin = Math.max(0, renderedRange.begin - entry_prerender_count);
        const view_entry_end = Math.min(this.flat_tree.length, renderedRange.end + entry_postrender_count);

        for (let index = view_entry_begin; index < view_entry_end; index++)
            elements.push(this.flat_tree[index].rendered);

        for(const callback of this.in_view_callbacks.slice(0)) {
            if(callback.index >= renderedRange.begin && callback.index <= renderedRange.end) {
                clearTimeout(callback.timeout);
                callback.callback();
                this.in_view_callbacks.remove(callback);
            }
        }

        return (
            <div
                 className={viewStyle.channelTreeContainer + " " + (this.state.smoothScroll ? viewStyle.smoothScroll : "")}
                 onScroll={() => this.onScroll()}
                 ref={this.ref_container}
                 onMouseDown={e => this.onMouseDown(e)}
                 onMouseMove={e => this.onMouseMove(e)} >
                <div className={this.classList(viewStyle.channelTree, this.props.tree.isClientMoveActive() && viewStyle.move)} style={{height: (this.flat_tree.length * ChannelTreeView.EntryHeight) + "px"}}>
                    {elements}
                </div>
            </div>
        )
    }

    private build_top_offset: number;
    private build_sub_tree(entry: ChannelEntry, depth: number) {
        entry.events.on("notify_clients_changed", this.listener_client_change);
        entry.events.on("notify_children_changed", this.listener_channel_change);
        entry.events.on("notify_collapsed_state_changed", this.listener_state_collapsed);
        entry.events.on("notify_properties_updated", this.listener_channel_properties);

        this.flat_tree.push({
            entry: entry,
            rendered: <ChannelEntryView key={this.state.tree_version + "-channel-" + entry.channelId} channel={entry} offset={this.build_top_offset += ChannelTreeView.EntryHeight} depth={depth} ref={entry.view} />
        });

        if(entry.collapsed) return;
        let clients = entry.clients(false);
        if(!this.props.tree.areServerQueriesShown())
            clients = clients.filter(e => e.properties.client_type_exact !== ClientType.CLIENT_QUERY);
        this.flat_tree.push(...clients.map(e => {
            return {
                entry: e,
                rendered: <ClientEntryView key={this.state.tree_version + "-client-" + e.clientId()} client={e} offset={this.build_top_offset += ChannelTreeView.EntryHeight} depth={depth + 1} ref={e.view} />
            };
        }));
        for (const channel of entry.children(false))
            this.build_sub_tree(channel, depth + 1);
    }

    private rebuild_tree() {
        log.debug(LogCategory.CHANNEL, tr("Rebuilding the channel tree"));
        const tree = this.props.tree;
        {
            let index = this.flat_tree.length;
            while(index--) {
                const entry = this.flat_tree[index].entry;
                if(entry instanceof ChannelEntry) {
                    entry.events.off("notify_properties_updated", this.listener_client_change);
                    entry.events.off("notify_clients_changed", this.listener_client_change);
                    entry.events.off("notify_children_changed", this.listener_channel_change);
                    entry.events.off("notify_properties_updated", this.listener_channel_properties);
                }
            }
        }
        this.build_top_offset = -ChannelTreeView.EntryHeight; /* because of the += */
        this.flat_tree = [{
            entry: tree.server,
            rendered: <ServerEntryView key={this.state.tree_version + "-server"} server={tree.server} offset={this.build_top_offset += ChannelTreeView.EntryHeight} ref={tree.server.view} />
        }];

        for (const channel of tree.rootChannel())
            this.build_sub_tree(channel, 1);
    }

    @EventHandler<ChannelTreeEvents>("notify_root_channel_changed")
    private handleRootChannelChanged() {
        this.handleTreeUpdate();
    }

    @EventHandler<ChannelTreeEvents>("notify_query_view_state_changed")
    private handleQueryViewStateChange() {
        this.handleTreeUpdate();
    }

    @EventHandler<ChannelTreeEvents>("notify_entry_move_begin")
    private handleEntryMoveBegin() {
        this.handleTreeUpdate();
    }

    @EventHandler<ChannelTreeEvents>("notify_entry_move_end")
    private handleEntryMoveEnd() {
        this.handleTreeUpdate();
    }

    @EventHandler<ChannelTreeEvents>("notify_tree_reset")
    private handleTreeReset() {
        this.rebuild_tree();
        this.setState({
            tree_version: this.state.tree_version + 1
        });
    }

    private onScroll() {
        this.setState({
            scroll_offset: this.ref_container.current.scrollTop
        });
    }

    private onMouseDown(e: React.MouseEvent) {
        if(e.button !== 0) return; /* left button only */

        this.mouse_move.down = true;
        this.mouse_move.x = e.pageX;
        this.mouse_move.y = e.pageY;
        this.registerDocumentMouseListener();
    }

    private onMouseMove(e: React.MouseEvent) {
        if(!this.mouse_move.down || this.mouse_move.fired) return;
        if(Math.abs((this.mouse_move.x - e.pageX) * (this.mouse_move.y - e.pageY)) > (this.props.moveThreshold || 9)) {
            this.mouse_move.fired = true;
            this.props.onMoveStart({x: this.mouse_move.x, y: this.mouse_move.y}, {x: e.pageX, y: e.pageY});
        }
    }

    scrollEntryInView(entry: TreeEntry, callback?: () => void) {
        const index = this.flat_tree.findIndex(e => e.entry === entry);
        if(index === -1) {
            if(callback) callback();
            console.warn(tr("Failed to scroll tree entry in view because its not registered within the view. Entry: %o"), entry);
            return;
        }

        let new_index;
        const currentRange = this.visibleEntries();
        if(index >= currentRange.end - 1) {
            new_index = index - (currentRange.end - currentRange.begin) + 2;
        } else if(index < currentRange.begin) {
            new_index = index;
        } else {
            if(callback) callback();
            return;
        }

        this.ref_container.current.scrollTop = new_index * ChannelTreeView.EntryHeight;

        if(callback) {
            let cb = {
                index: index,
                callback: callback,
                timeout: setTimeout(() => {
                    this.in_view_callbacks.remove(cb);
                    callback();
                }, (Math.abs(new_index - currentRange.begin) / (currentRange.end - currentRange.begin)) * 1500)
            };
            this.in_view_callbacks.push(cb);
        }
    }

    getEntryFromPoint(pageX: number, pageY: number) {
        const container = this.ref_container.current;
        if(!container) return;

        const bounds = container.getBoundingClientRect();
        pageY -= bounds.y;
        pageX -= bounds.x;

        if(pageX < 0 || pageY < 0)
            return undefined;

        if(pageX > container.clientWidth)
            return undefined;

        const total_offset = container.scrollTop + pageY;
        return this.flat_tree[Math.floor(total_offset / ChannelTreeView.EntryHeight)]?.entry;
    }
}