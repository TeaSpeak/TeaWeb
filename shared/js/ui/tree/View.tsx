import {
    BatchUpdateAssignment,
    BatchUpdateType,
    ReactComponentBase
} from "tc-shared/ui/react-elements/ReactComponentBase";
import {ChannelTree, ChannelTreeEvents} from "tc-shared/ui/view";
import ResizeObserver from 'resize-observer-polyfill';

import * as React from "react";

import {EventHandler, ReactEventHandler} from "tc-shared/events";

import {ChannelEntryView as ChannelEntryView} from "./Channel";
import {ServerEntry as ServerEntryView} from "./Server";
import {ClientEntry as ClientEntryView} from "./Client";

import {ChannelEntry} from "tc-shared/ui/channel";
import {ServerEntry} from "tc-shared/ui/server";
import {ClientEntry, LocalClientEntry} from "tc-shared/ui/client";

const viewStyle = require("./View.scss");


export interface ChannelTreeViewProperties {
    tree: ChannelTree;
}

export interface ChannelTreeViewState {
    element_scroll_offset?: number; /* in px */
    scroll_offset: number; /* in px */
    view_height: number; /* in px */
}

type TreeEntry = ChannelEntry | ServerEntry | ClientEntry;
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
    private update_timeout;

    private in_view_callbacks: {
        index: number,
        callback: () => void,
        timeout
    }[] = [];

    protected defaultState(): ChannelTreeViewState {
        return {
            scroll_offset: 0,
            view_height: 0,
        };
    }

    componentDidMount(): void {
        this.resize_observer = new ResizeObserver(entries => {
            if(entries.length !== 1) {
                if(entries.length === 0)
                    console.warn("Channel resize observer fired resize event with no entries!");
                else
                    console.warn("Channel resize observer fired resize event with more than one entry which should not be possible (%d)!", entries.length);
                return;
            }
            const bounds = entries[0].contentRect;
            if(this.state.view_height !== bounds.height) {
                console.log("Handling height update and change tree height to %d from %d", bounds.height, this.state.view_height);
                this.setState({
                    view_height: bounds.height
                });
            }
        });
        this.resize_observer.observe(this.ref_container.current);
    }

    componentWillUnmount(): void {
        this.resize_observer.disconnect();
        this.resize_observer = undefined;
    }

    protected initialize() {
        (window as any).do_tree_update = () => this.handleTreeUpdate();
        this.listener_client_change = () => this.handleTreeUpdate();
        this.listener_channel_change = () => this.handleTreeUpdate();
        this.listener_state_collapsed = () => this.handleTreeUpdate();
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
            <div className={viewStyle.channelTreeContainer} onScroll={() => this.onScroll()} ref={this.ref_container} >
                <div className={viewStyle.channelTree} style={{height: (this.flat_tree.length * ChannelTreeView.EntryHeight) + "px"}}>
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

        this.flat_tree.push({
            entry: entry,
            rendered: <ChannelEntryView key={"channel-" + entry.channelId} channel={entry} offset={this.build_top_offset += ChannelTreeView.EntryHeight} depth={depth} ref={entry.view} />
        });

        if(entry.collapsed) return;
        this.flat_tree.push(...entry.clients(false).map(e => {
            return {
                entry: e,
                rendered: <ClientEntryView key={"client-" + e.clientId()} client={e} offset={this.build_top_offset += ChannelTreeView.EntryHeight} depth={depth + 1} ref={e.view} />
            };
        }));
        for (const channel of entry.children(false))
            this.build_sub_tree(channel, depth + 1);
    }

    private rebuild_tree() {
        const tree = this.props.tree;
        {
            let index = this.flat_tree.length;
            while(index--) {
                const entry = this.flat_tree[index].entry;
                if(entry instanceof ChannelEntry) {
                    entry.events.off("notify_clients_changed", this.listener_client_change);
                    entry.events.off("notify_children_changed", this.listener_channel_change);
                    entry.events.off("notify_collapsed_state_changed", this.listener_state_collapsed);
                }
            }
        }
        this.build_top_offset = -ChannelTreeView.EntryHeight; /* because of the += */
        this.flat_tree = [{
            entry: tree.server,
            rendered: <ServerEntryView key={"server"} server={tree.server} offset={this.build_top_offset += ChannelTreeView.EntryHeight} ref={tree.server.view} />
        }];

        for (const channel of tree.rootChannel())
            this.build_sub_tree(channel, 1);
    }

    @EventHandler<ChannelTreeEvents>("notify_root_channel_changed")
    private handleRootChannelChanged() {
        this.handleTreeUpdate();
    }

    private onScroll() {
        this.setState({
            scroll_offset: this.ref_container.current.scrollTop
        });
    }

    scrollEntryInView(entry: TreeEntry, callback?: () => void) {
        const index = this.flat_tree.findIndex(e => e.entry === entry);
        if(index === -1) {
            if(callback) callback();
            console.warn("Failed to scroll tree entry in view because its not registered within the view. Entry: %o", entry);
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
}