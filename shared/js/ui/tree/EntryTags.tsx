import * as React from "react";

const cssStyle = require("./EntryTags.scss");

export const ClientTag = (props: { clientName: string, clientUniqueId: string, handlerId: string, clientId?: number, clientDatabaseId?: number, className?: string }) => {

    return (
        <div className={cssStyle.client + (props.className ? ` ${props.className}` : ``)}
             onContextMenu={event => {
                 event.preventDefault();

                 /* TODO: Enable context menus */
             }}
        >
            {props.clientName}
        </div>
    );
};

export const ChannelTag = (props: { channelName: string, channelId: number, handlerId: string, className?: string }) => {

    return <div className={cssStyle.client + (props.className ? ` ${props.className}` : ``)}>{props.channelName}</div>;
};