import {
    BatchUpdateAssignment,
    BatchUpdateType,
    ReactComponentBase
} from "tc-shared/ui/react-elements/ReactComponentBase";
import {EventHandler, ReactEventHandler, Registry} from "tc-shared/events";
import * as React from "react";
import {ChannelTreeUIEvents} from "tc-shared/ui/tree/Definitions";
import ResizeObserver from 'resize-observer-polyfill';
import {RDPChannelTree, RDPEntry} from "./RendererDataProvider";
import {ClientIconRenderer} from "tc-shared/ui/react-elements/Icons";
import {ClientIcon} from "svg-sprites/client-icons";

const viewStyle = require("./View.scss");

export class PopoutButton extends React.Component<{ tree: RDPChannelTree }, {}> {
    render() {
        if(!this.props.tree.popoutButtonShown) {
            return null;
        }

        return (
            <div className={viewStyle.popoutButton} onClick={() => this.props.tree.events.fire("action_toggle_popout", { shown: !this.props.tree.popoutShown })}>
                <div className={viewStyle.button} title={this.props.tree.popoutShown ? tr("Popin the second channel tree view") : tr("Popout the channel tree view")}>
                    <ClientIconRenderer icon={this.props.tree.popoutShown ? ClientIcon.ChannelPopin : ClientIcon.ChannelPopout} />
                </div>
            </div>
        );
    }
}

export interface ChannelTreeViewProperties {
    events: Registry<ChannelTreeUIEvents>;
    dataProvider: RDPChannelTree;
    moveThreshold?: number;
}

export interface ChannelTreeViewState {
    elementScrollOffset?: number; /* in px */
    scrollOffset: number; /* in px */
    viewHeight: number; /* in px */
    fontSize: number; /* in px */

    treeVersion: number;
    smoothScroll: boolean;

    /* the currently rendered tree */
    tree: RDPEntry[];
    treeRevision: number;
}

@ReactEventHandler<ChannelTreeView>(e => e.props.events)
@BatchUpdateAssignment(BatchUpdateType.CHANNEL_TREE)
export class ChannelTreeView extends ReactComponentBase<ChannelTreeViewProperties, ChannelTreeViewState> {
    public static readonly EntryHeightEm = 1.3;

    private readonly refContainer = React.createRef<HTMLDivElement>();
    private resizeObserver: ResizeObserver;

    private scrollFixRequested;

    private inViewCallbacks: {
        index: number,
        callback: () => void,
        timeout
    }[] = [];

    constructor(props) {
        super(props);

        this.state = {
            scrollOffset: 0,
            viewHeight: 0,
            treeVersion: 0,
            smoothScroll: false,
            tree: [],
            treeRevision: -1,
            fontSize: 14
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
            const fontSize = parseFloat(getComputedStyle(entries[0].target).getPropertyValue("font-size"));
            if (this.state.viewHeight !== bounds.height || this.state.fontSize !== fontSize) {
                this.setState({
                    viewHeight: bounds.height,
                    fontSize: fontSize
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
            this.refContainer.current.scrollTop = this.state.scrollOffset;
            this.setState({smoothScroll: true});
        });
    }

    private visibleEntries() {
        const entryHeight = ChannelTreeView.EntryHeightEm * this.state.fontSize;
        let viewEntryCount = Math.ceil(this.state.viewHeight / entryHeight);
        const viewEntryBegin = Math.floor(this.state.scrollOffset / entryHeight);
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
                onContextMenu={event => {
                    if(event.target !== this.refContainer.current) { return; }

                    event.preventDefault();
                    this.props.events.fire("action_show_context_menu", { pageY: event.pageY, pageX: event.pageX, treeEntryIds: [] });
                }}
            >
                <div
                    className={viewStyle.channelTree}
                    style={{height: (this.state.tree.length * ChannelTreeView.EntryHeightEm) + "em"}}>
                    {elements}
                </div>
            </div>
        )
    }

    private onScroll() {
        this.setState({
            scrollOffset: this.refContainer.current.scrollTop
        });
    }

    scrollEntryInView(entryId: number, callback?: () => void) {
        const index = this.state.tree.findIndex(e => e.entryId === entryId);
        if (index === -1) {
            if (callback) callback();
            console.warn(tr("Failed to scroll tree entry in view because its not registered within the view. EntryId: %d"), entryId);
            return;
        }

        let newIndex;
        const currentRange = this.visibleEntries();
        if (index >= currentRange.end - 1) {
            newIndex = index - (currentRange.end - currentRange.begin) + 2;
        } else if (index < currentRange.begin) {
            newIndex = index;
        } else {
            if (callback) callback();
            return;
        }

        this.refContainer.current.scrollTop = newIndex * ChannelTreeView.EntryHeightEm * this.state.fontSize;

        if (callback) {
            let cb = {
                index: index,
                callback: callback,
                timeout: setTimeout(() => {
                    this.inViewCallbacks.remove(cb);
                    callback();
                }, (Math.abs(newIndex - currentRange.begin) / (currentRange.end - currentRange.begin)) * 1500)
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

        if (pageX < 0 || pageY < 0) {
            return undefined;
        }

        if (pageX > container.clientWidth) {
            return undefined;
        }

        const totalOffset = container.scrollTop + pageY;
        return this.state.tree[Math.floor(totalOffset / (ChannelTreeView.EntryHeightEm * this.state.fontSize))]?.entryId;
    }
}