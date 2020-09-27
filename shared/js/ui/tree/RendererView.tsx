import {
    BatchUpdateAssignment,
    BatchUpdateType,
    ReactComponentBase
} from "tc-shared/ui/react-elements/ReactComponentBase";
import {EventHandler, ReactEventHandler, Registry} from "tc-shared/events";
import * as React from "react";
import {ChannelTreeUIEvents} from "tc-shared/ui/tree/Definitions";
import ResizeObserver from 'resize-observer-polyfill';
import {RDPEntry, RDPChannelTree} from "./RendererDataProvider";
import {RendererMove} from "./RendererMove";

const viewStyle = require("./View.scss");

export interface ChannelTreeViewProperties {
    events: Registry<ChannelTreeUIEvents>;
    dataProvider: RDPChannelTree;
    moveThreshold?: number;
}

export interface ChannelTreeViewState {
    element_scroll_offset?: number; /* in px */
    scroll_offset: number; /* in px */
    view_height: number; /* in px */

    tree_version: number;
    smoothScroll: boolean;

    /* the currently rendered tree */
    tree: RDPEntry[];
    treeRevision: number;
}

@ReactEventHandler<ChannelTreeView>(e => e.props.events)
@BatchUpdateAssignment(BatchUpdateType.CHANNEL_TREE)
export class ChannelTreeView extends ReactComponentBase<ChannelTreeViewProperties, ChannelTreeViewState> {
    public static readonly EntryHeight = 18;

    private readonly refContainer = React.createRef<HTMLDivElement>();
    private resizeObserver: ResizeObserver;

    private scrollFixRequested;

    private mouseMove: { x: number, y: number, down: boolean, fired: boolean } = {
        x: 0,
        y: 0,
        down: false,
        fired: false
    };
    private readonly documentMouseListener;

    private inViewCallbacks: {
        index: number,
        callback: () => void,
        timeout
    }[] = [];

    constructor(props) {
        super(props);

        this.state = {
            scroll_offset: 0,
            view_height: 0,
            tree_version: 0,
            smoothScroll: false,
            tree: [],
            treeRevision: -1
        };

        this.documentMouseListener = (e: MouseEvent) => {
            if (e.type !== "mouseleave" && e.button !== 0)
                return;

            this.mouseMove.down = false;
            this.mouseMove.fired = false;

            this.removeDocumentMouseListener();
        };
    }

    componentDidMount(): void {
        this.resizeObserver = new ResizeObserver(entries => {
            if (entries.length !== 1) {
                if (entries.length === 0) {
                    console.warn(tr("Channel resize observer fired resize event with no entries!"));
                } else {
                    console.warn(tr("Channel resize observer fired resize event with more than one entry which should not be possible (%d)!"), entries.length);
                }
                return;
            }

            const bounds = entries[0].contentRect;
            if (this.state.view_height !== bounds.height) {
                this.setState({
                    view_height: bounds.height
                });
            }
        });

        this.resizeObserver.observe(this.refContainer.current);
        this.setState({ tree: this.props.dataProvider.getTreeEntries() });
    }

    componentWillUnmount(): void {
        this.resizeObserver.disconnect();
        this.resizeObserver = undefined;
    }

    @EventHandler<ChannelTreeUIEvents>("notify_visibility_changed")
    private handleVisibilityChanged(event: ChannelTreeUIEvents["notify_visibility_changed"]) {
        if (!event.visible) {
            this.setState({smoothScroll: false});
            return;
        }

        if (this.scrollFixRequested) {
            return;
        }

        this.scrollFixRequested = true;
        requestAnimationFrame(() => {
            this.scrollFixRequested = false;
            this.refContainer.current.scrollTop = this.state.scroll_offset;
            this.setState({smoothScroll: true});
        });
    }

    private registerDocumentMouseListener() {
        document.addEventListener("mouseleave", this.documentMouseListener);
        document.addEventListener("mouseup", this.documentMouseListener);
    }

    private removeDocumentMouseListener() {
        document.removeEventListener("mouseleave", this.documentMouseListener);
        document.removeEventListener("mouseup", this.documentMouseListener);
    }

    private visibleEntries() {
        let viewEntryCount = Math.ceil(this.state.view_height / ChannelTreeView.EntryHeight);
        const viewEntryBegin = Math.floor(this.state.scroll_offset / ChannelTreeView.EntryHeight);
        const viewEntryEnd = Math.min(this.state.tree.length, viewEntryBegin + viewEntryCount);

        return {
            begin: viewEntryBegin,
            end: viewEntryEnd
        }
    }

    render() {
        const entryPreRenderCount = 5;
        const entryPostRenderCount = 5;

        const elements = [];
        const renderedRange = this.visibleEntries();
        const viewEntryBegin = Math.max(0, renderedRange.begin - entryPreRenderCount);
        const viewEntryEnd = Math.min(this.state.tree.length, renderedRange.end + entryPostRenderCount);

        for (let index = viewEntryBegin; index < viewEntryEnd; index++) {
            elements.push(this.state.tree[index].render());
        }

        for (const callback of this.inViewCallbacks.slice(0)) {
            if (callback.index >= renderedRange.begin && callback.index <= renderedRange.end) {
                clearTimeout(callback.timeout);
                callback.callback();
                this.inViewCallbacks.remove(callback);
            }
        }

        return (
            <div
                className={viewStyle.channelTreeContainer + " " + (this.state.smoothScroll ? viewStyle.smoothScroll : "")}
                onScroll={() => this.onScroll()}
                ref={this.refContainer}
                onMouseDown={e => this.onMouseDown(e)}
                onMouseMove={e => this.onMouseMove(e)}>
                <div
                    className={viewStyle.channelTree}
                    style={{height: (this.state.tree.length * ChannelTreeView.EntryHeight) + "px"}}>
                    {elements}
                </div>
                <RendererMove
                    onMoveEnd={target => {
                        const targetEntry = this.getEntryFromPoint(target.x, target.y);
                        this.props.events.fire("action_move_entries", { treeEntryId: typeof targetEntry === "number" ? targetEntry : 0 });
                    }}
                    onMoveCancel={() => {
                        this.props.events.fire("action_move_entries", { treeEntryId: 0 });
                    }}
                    ref={this.props.dataProvider.refMove}
                />
            </div>
        )
    }

    private onScroll() {
        this.setState({
            scroll_offset: this.refContainer.current.scrollTop
        });
    }

    private onMouseDown(e: React.MouseEvent) {
        if (e.button !== 0) return; /* left button only */

        this.mouseMove.down = true;
        this.mouseMove.x = e.pageX;
        this.mouseMove.y = e.pageY;
        this.registerDocumentMouseListener();
    }

    private onMouseMove(e: React.MouseEvent) {
        if (!this.mouseMove.down || this.mouseMove.fired) return;
        if (Math.abs((this.mouseMove.x - e.pageX) * (this.mouseMove.y - e.pageY)) > (this.props.moveThreshold || 9)) {
            this.mouseMove.fired = true;
            this.props.events.fire("action_start_entry_move", {
                current: { x: e.pageX, y: e.pageY },
                start: { x: this.mouseMove.x, y: this.mouseMove.y }
            });
        }
    }

    scrollEntryInView(entryId: number, callback?: () => void) {
        const index = this.state.tree.findIndex(e => e.entryId === entryId);
        if (index === -1) {
            if (callback) callback();
            console.warn(tr("Failed to scroll tree entry in view because its not registered within the view. EntryId: %d"), entryId);
            return;
        }

        let new_index;
        const currentRange = this.visibleEntries();
        if (index >= currentRange.end - 1) {
            new_index = index - (currentRange.end - currentRange.begin) + 2;
        } else if (index < currentRange.begin) {
            new_index = index;
        } else {
            if (callback) callback();
            return;
        }

        this.refContainer.current.scrollTop = new_index * ChannelTreeView.EntryHeight;

        if (callback) {
            let cb = {
                index: index,
                callback: callback,
                timeout: setTimeout(() => {
                    this.inViewCallbacks.remove(cb);
                    callback();
                }, (Math.abs(new_index - currentRange.begin) / (currentRange.end - currentRange.begin)) * 1500)
            };
            this.inViewCallbacks.push(cb);
        }
    }

    getEntryFromPoint(pageX: number, pageY: number) : number {
        const container = this.refContainer.current;
        if (!container) return;

        const bounds = container.getBoundingClientRect();
        pageY -= bounds.y;
        pageX -= bounds.x;

        if (pageX < 0 || pageY < 0)
            return undefined;

        if (pageX > container.clientWidth)
            return undefined;

        const total_offset = container.scrollTop + pageY;
        return this.state.tree[Math.floor(total_offset / ChannelTreeView.EntryHeight)]?.entryId;
    }
}