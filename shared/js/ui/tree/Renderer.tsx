import {Registry} from "tc-shared/events";
import {ChannelTreeUIEvents} from "tc-shared/ui/tree/Definitions";
import * as React from "react";
import {ChannelTreeView} from "tc-shared/ui/tree/RendererView";
import {RDPChannelTree} from "./RendererDataProvider";
import {useEffect} from "react";

export const ChannelTreeRenderer = (props: { handlerId: string, events: Registry<ChannelTreeUIEvents> }) => {
    const dataProvider = new RDPChannelTree(props.events, props.handlerId);
    dataProvider.initialize();
    useEffect(() => () => dataProvider.destroy());
    return <ChannelTreeView events={props.events} dataProvider={dataProvider} ref={dataProvider.refTree} />;
}