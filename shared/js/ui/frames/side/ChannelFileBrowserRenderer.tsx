import {useState} from "react";
import {Registry} from "tc-shared/events";
import {ChannelFileBrowserUiEvents} from "tc-shared/ui/frames/side/ChannelFileBrowserDefinitions";
import {channelPathPrefix, FileBrowserEvents} from "tc-shared/ui/modal/transfer/FileDefinitions";
import {
    FileBrowserClassContext,
    FileBrowserRenderer, FileBrowserRendererClasses,
    NavigationBar
} from "tc-shared/ui/modal/transfer/FileBrowserRenderer";
import * as React from "react";

const cssStyle = require("./ChannelFileBrowserRenderer.scss");

const kFileBrowserClasses: FileBrowserRendererClasses = {
    navigation: {
        boxedInput: cssStyle.boxedInput
    },
    fileTable: {
        table: cssStyle.fileTable,
        header: cssStyle.header
    },
    fileEntry: {
        entry: cssStyle.fileEntry,
        dropHovered: cssStyle.hovered,
        selected: cssStyle.fileEntrySelected
    }
};

export const ChannelFileBrowser = (props: { events: Registry<ChannelFileBrowserUiEvents> }) => {
    const [ events, setEvents ] = useState<{ events: Registry<FileBrowserEvents>, channelId: number }>(() => {
        props.events.fire("query_events");
        return undefined;
    });
    props.events.reactUse("notify_events", event => setEvents({
        events: event.browserEvents,
        channelId: event.channelId
    }));

    if(!events) {
        return null;
    }

    return (
        <div className={cssStyle.container}>
            <FileBrowserClassContext.Provider value={kFileBrowserClasses}>
                <div className={cssStyle.navbar}>
                    <NavigationBar events={events.events} initialPath={events.channelId > 0 ? "/" + channelPathPrefix + events.channelId + "/" : "/"} />
                </div>
                <FileBrowserRenderer initialPath={events.channelId > 0 ? "/" + channelPathPrefix + events.channelId + "/" : "/"} events={events.events} key={"browser"} />
            </FileBrowserClassContext.Provider>
        </div>
    );
};