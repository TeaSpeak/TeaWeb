import {Registry} from "tc-shared/events";
import {ChannelTreeUIEvents} from "tc-shared/ui/tree/Definitions";
import * as React from "react";
import {useEffect, useRef} from "react";
import {ChannelTreeView, PopoutButton} from "tc-shared/ui/tree/RendererView";
import {RDPChannel, RDPChannelTree} from "./RendererDataProvider";

const viewStyle = require("./View.scss");

export const ChannelTreeRenderer = (props: { handlerId: string, events: Registry<ChannelTreeUIEvents> }) => {
    const dataProvider = new RDPChannelTree(props.events, props.handlerId);
    dataProvider.initialize();
    useEffect(() => () => dataProvider.destroy());

    return <ContainerView tree={dataProvider} events={props.events} />;
}

const ContainerView = (props: { tree: RDPChannelTree, events: Registry<ChannelTreeUIEvents> }) => {
    const refContainer = useRef<HTMLDivElement>();
    const focusWithin = useRef(false);

    useEffect(() => {
        let mouseDownListener;
        document.addEventListener("mousedown", mouseDownListener = event => {
            let target = event.target as HTMLElement;
            while(target !== refContainer.current && target) { target = target.parentElement; }

            if(focusWithin.current) {
                refContainer.current?.focus();
            }
        });

        let keyListener;
        document.addEventListener("keydown", keyListener = event => {
            if(!focusWithin.current) { return; }

            if(event.key === "ArrowUp") {
                event.preventDefault();
                props.tree.selection.selectNext(true, "up");
            } else if(event.key === "ArrowDown") {
                event.preventDefault();
                props.tree.selection.selectNext(true, "down");
            } else if(event.key === "Enter") {
                event.preventDefault();

                const selectedEntries = props.tree.selection.selectedEntries;
                if(selectedEntries.length !== 1) { return; }
                if(!(selectedEntries[0] instanceof RDPChannel)) { return; }
                props.events.fire("action_channel_join", { treeEntryId: selectedEntries[0].entryId });
            }
        });

        return () => {
            document.removeEventListener("mousedown", mouseDownListener);
            document.removeEventListener("keypress", keyListener);
        }
    });

    return (
        <div
            className={viewStyle.treeContainer}
            ref={refContainer}
            onBlur={() => focusWithin.current = false}
            onFocus={() => focusWithin.current = true}
            tabIndex={1}
        >
            <ChannelTreeView events={props.events} dataProvider={props.tree} ref={props.tree.refTree} />
            <PopoutButton tree={props.tree} ref={props.tree.refPopoutButton} />
        </div>
    )
}