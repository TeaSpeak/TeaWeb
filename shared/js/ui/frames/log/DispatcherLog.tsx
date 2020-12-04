import {ViewReasonId} from "tc-shared/ConnectionHandler";
import {EventChannelData, EventClient, EventType, TypeInfo} from "tc-shared/ui/frames/log/Definitions";
import * as React from "react";
import {Translatable, VariadicTranslatable} from "tc-shared/ui/react-elements/i18n";
import {formatDate} from "tc-shared/MessageFormatter";
import {BBCodeRenderer} from "tc-shared/text/bbcode";
import {format_time} from "tc-shared/ui/frames/chat";
import {CommandResult} from "tc-shared/connection/ServerConnectionDeclaration";
import {XBBCodeRenderer} from "vendor/xbbcode/react";
import {ChannelTag, ClientTag} from "tc-shared/ui/tree/EntryTags";

const cssStyle = require("./DispatcherLog.scss");
const cssStyleRenderer = require("./Renderer.scss");

export type DispatcherLog<T extends keyof TypeInfo> = (data: TypeInfo[T], handlerId: string, eventType: T) => React.ReactNode;

const dispatchers: {[key: string]: DispatcherLog<any>} = { };
function registerDispatcher<T extends keyof TypeInfo>(key: T, builder: DispatcherLog<T>) {
    dispatchers[key] = builder;
}

export function findLogDispatcher<T extends keyof TypeInfo>(type: T) : DispatcherLog<T> {
    return dispatchers[type];
}

export function getRegisteredLogDispatchers() : TypeInfo[] {
    return Object.keys(dispatchers) as any;
}

const ClientRenderer = (props: { client: EventClient, handlerId: string, braces?: boolean }) => (
    <ClientTag
        handlerId={props.handlerId}
        clientName={props.client?.client_name || tr("Unknown")}
        clientId={props.client?.client_id || 0}
        clientUniqueId={props.client?.client_unique_id || "unknown"}
        className={cssStyle.clientEntry}
    />
);

const ChannelRenderer = (props: { channel: EventChannelData, handlerId: string, braces?: boolean }) => (
    <ChannelTag
        handlerId={props.handlerId}
        channelName={props.channel?.channel_name || tr("Unknown")}
        channelId={props.channel?.channel_id || 0}
        className={cssStyle.channelEntry}
    />
);

registerDispatcher(EventType.ERROR_CUSTOM, data => <div className={cssStyleRenderer.errorMessage}>{data.message}</div>);

registerDispatcher(EventType.CONNECTION_BEGIN, data => (
    <VariadicTranslatable text={"Connecting to {0}{1}"}>
        <>{data.address.server_hostname}</>
        <>{data.address.server_port == 9987 ? "" : (":" + data.address.server_port)}</>
    </VariadicTranslatable>
));

registerDispatcher(EventType.CONNECTION_HOSTNAME_RESOLVE, () => (
    <Translatable>Resolving hostname</Translatable>
));

registerDispatcher(EventType.CONNECTION_HOSTNAME_RESOLVED, data => (
    <VariadicTranslatable text={"Hostname resolved successfully to {0}:{1}"}>
        <>{data.address.server_hostname}</>
        <>{data.address.server_port}</>
    </VariadicTranslatable>
));

registerDispatcher(EventType.CONNECTION_HOSTNAME_RESOLVE_ERROR, data => (
    <VariadicTranslatable text={"Failed to resolve hostname. Connecting to given hostname. Error: {0}"}>
        <>{data.message}</>
    </VariadicTranslatable>
));

registerDispatcher(EventType.CONNECTION_LOGIN, () => (
    <Translatable>Logging in...</Translatable>
));

registerDispatcher(EventType.CONNECTION_FAILED, () => (
    <Translatable>Connect failed.</Translatable>
));

registerDispatcher(EventType.CONNECTION_CONNECTED, (data,handlerId) => (
    <VariadicTranslatable text={"Connected as {0}"}>
        <ClientRenderer client={data.own_client} handlerId={handlerId} />
    </VariadicTranslatable>
));

registerDispatcher(EventType.CONNECTION_VOICE_CONNECT, () => (
    <Translatable>Connecting voice bridge.</Translatable>
));

registerDispatcher(EventType.CONNECTION_VOICE_CONNECT_SUCCEEDED, () => (
    <Translatable>Voice bridge successfully connected.</Translatable>
));

registerDispatcher(EventType.CONNECTION_VOICE_CONNECT_FAILED, (data) => (
    <VariadicTranslatable text={"Failed to setup voice bridge: {0}. Allow reconnect: {1}"}>
        <>{data.reason}</>
        {data.reconnect_delay > 0 ? <Translatable>Yes</Translatable> : <Translatable>No</Translatable>}
    </VariadicTranslatable>
));

registerDispatcher(EventType.CONNECTION_VOICE_DROPPED, () => (
    <Translatable>Voice bridge has been dropped. Trying to reconnect.</Translatable>
));

registerDispatcher(EventType.ERROR_PERMISSION, data => (
    <div className={cssStyleRenderer.errorMessage}>
        <VariadicTranslatable text={"Insufficient client permissions. Failed on permission {0}"}>
            <>{data.permission ? data.permission.name : <Translatable>unknown</Translatable>}</>
        </VariadicTranslatable>
    </div>
));

registerDispatcher(EventType.CLIENT_VIEW_ENTER, (data, handlerId) => {
    switch (data.reason) {
        case ViewReasonId.VREASON_USER_ACTION:
            if(data.channel_from) {
                return (
                    <VariadicTranslatable text={"{0} appeared from {1} to {2}"}>
                        <ClientRenderer client={data.client} handlerId={handlerId} />
                        <ChannelRenderer channel={data.channel_from} handlerId={handlerId} />
                        <ChannelRenderer channel={data.channel_to} handlerId={handlerId} />
                    </VariadicTranslatable>
                );
            } else {
                return (
                    <VariadicTranslatable text={"{0} appeared to channel {1}"}>
                        <ClientRenderer client={data.client} handlerId={handlerId} />
                        <ChannelRenderer channel={data.channel_to} handlerId={handlerId} />
                    </VariadicTranslatable>
                );
            }

        case ViewReasonId.VREASON_MOVED:
            if(data.channel_from) {
                return (
                    <VariadicTranslatable text={"{0} appeared from {1} to {2}, moved by {3}"}>
                        <ClientRenderer client={data.client} handlerId={handlerId} />
                        <ChannelRenderer channel={data.channel_from} handlerId={handlerId} />
                        <ChannelRenderer channel={data.channel_to} handlerId={handlerId} />
                        <ClientRenderer client={data.invoker} handlerId={handlerId} />
                    </VariadicTranslatable>
                );
            } else {
                return (
                    <VariadicTranslatable text={"{0} appeared to {1}, moved by {2}"}>
                        <ClientRenderer client={data.client} handlerId={handlerId} />
                        <ChannelRenderer channel={data.channel_to} handlerId={handlerId} />
                        <ClientRenderer client={data.invoker} handlerId={handlerId} />
                    </VariadicTranslatable>
                );
            }

        case ViewReasonId.VREASON_CHANNEL_KICK:
            if(data.channel_from) {
                return (
                    <VariadicTranslatable text={"{0} appeared from {1} to {2}, kicked by {3}{4}"}>
                        <ClientRenderer client={data.client} handlerId={handlerId} />
                        <ChannelRenderer channel={data.channel_from} handlerId={handlerId} />
                        <ChannelRenderer channel={data.channel_to} handlerId={handlerId} />
                        <ClientRenderer client={data.invoker} handlerId={handlerId} />
                        <>{data.message ? " (" + data.message + ")" : ""}</>
                    </VariadicTranslatable>
                );
            } else {
                return (
                    <VariadicTranslatable text={"{0} appeared to {1}, kicked by {2}{3}"}>
                        <ClientRenderer client={data.client} handlerId={handlerId} />
                        <ChannelRenderer channel={data.channel_to} handlerId={handlerId} />
                        <ClientRenderer client={data.invoker} handlerId={handlerId} />
                        <>{data.message ? " (" + data.message + ")" : ""}</>
                    </VariadicTranslatable>
                );
            }

        case ViewReasonId.VREASON_SYSTEM:
            return undefined;

        default:
            return (
                <div className={cssStyleRenderer.errorMessage}>
                    <VariadicTranslatable text={"Having user enter event with invalid reason: {0}"}>
                        <>{data.reason}</>
                    </VariadicTranslatable>
                </div>
            );
    }
});

registerDispatcher(EventType.CLIENT_VIEW_ENTER_OWN_CHANNEL, (data, handlerId) => {
    switch (data.reason) {
        case ViewReasonId.VREASON_USER_ACTION:
            if(data.channel_from) {
                return (
                    <VariadicTranslatable text={"{0} appeared from {1} to your channel {2}"}>
                        <ClientRenderer client={data.client} handlerId={handlerId} />
                        <ChannelRenderer channel={data.channel_from} handlerId={handlerId} />
                        <ChannelRenderer channel={data.channel_to} handlerId={handlerId} />
                    </VariadicTranslatable>
                );
            } else {
                return (
                    <VariadicTranslatable text={"{0} appeared to your channel {1}"}>
                        <ClientRenderer client={data.client} handlerId={handlerId} />
                        <ChannelRenderer channel={data.channel_to} handlerId={handlerId} />
                    </VariadicTranslatable>
                );
            }

        case ViewReasonId.VREASON_MOVED:
            if(data.channel_from) {
                return (
                    <VariadicTranslatable text={"{0} appeared from {1} to your channel {2}, moved by {3}"}>
                        <ClientRenderer client={data.client} handlerId={handlerId} />
                        <ChannelRenderer channel={data.channel_from} handlerId={handlerId} />
                        <ChannelRenderer channel={data.channel_to} handlerId={handlerId} />
                        <ClientRenderer client={data.invoker} handlerId={handlerId} />
                    </VariadicTranslatable>
                );
            } else {
                return (
                    <VariadicTranslatable text={"{0} appeared to your channel {1}, moved by {2}"}>
                        <ClientRenderer client={data.client} handlerId={handlerId} />
                        <ChannelRenderer channel={data.channel_to} handlerId={handlerId} />
                        <ClientRenderer client={data.invoker} handlerId={handlerId} />
                    </VariadicTranslatable>
                );
            }

        case ViewReasonId.VREASON_CHANNEL_KICK:
            if(data.channel_from) {
                return (
                    <VariadicTranslatable text={"{0} appeared from {1} to your channel {2}, kicked by {3}{4}"}>
                        <ClientRenderer client={data.client} handlerId={handlerId} />
                        <ChannelRenderer channel={data.channel_from} handlerId={handlerId} />
                        <ChannelRenderer channel={data.channel_to} handlerId={handlerId} />
                        <ClientRenderer client={data.invoker} handlerId={handlerId} />
                        <>{data.message ? " (" + data.message + ")" : ""}</>
                    </VariadicTranslatable>
                );
            } else {
                return (
                    <VariadicTranslatable text={"{0} appeared to your channel {1}, kicked by {2}{3}"}>
                        <ClientRenderer client={data.client} handlerId={handlerId} />
                        <ChannelRenderer channel={data.channel_to} handlerId={handlerId} />
                        <ClientRenderer client={data.invoker} handlerId={handlerId} />
                        <>{data.message ? " (" + data.message + ")" : ""}</>
                    </VariadicTranslatable>
                );
            }

        case ViewReasonId.VREASON_SYSTEM:
            return undefined;

        default:
            return (
                <div className={cssStyleRenderer.errorMessage}>
                    <VariadicTranslatable text={"Having user enter your channel event with invalid reason: {0}"}>
                        <>{data.reason}</>
                    </VariadicTranslatable>
                </div>
            );
    }
});

registerDispatcher(EventType.CLIENT_VIEW_MOVE, (data, handlerId) => {
    switch (data.reason) {
        case ViewReasonId.VREASON_MOVED:
            return (
                <VariadicTranslatable text={"{0} was moved from channel {1} to {2} by {3}"}>
                    <ClientRenderer client={data.client} handlerId={handlerId} />
                    <ChannelRenderer channel={data.channel_from} handlerId={handlerId} />
                    <ChannelRenderer channel={data.channel_to} handlerId={handlerId} />
                    <ClientRenderer client={data.invoker} handlerId={handlerId} />
                </VariadicTranslatable>
            );

        case ViewReasonId.VREASON_USER_ACTION:
            return (
                <VariadicTranslatable text={"{0} switched from channel {1} to {2}"}>
                    <ClientRenderer client={data.client} handlerId={handlerId} />
                    <ChannelRenderer channel={data.channel_from} handlerId={handlerId} />
                    <ChannelRenderer channel={data.channel_to} handlerId={handlerId} />
                </VariadicTranslatable>
            );

        case ViewReasonId.VREASON_CHANNEL_KICK:
            return (
                <VariadicTranslatable text={"{0} got kicked from channel {1} to {2} by {3}{4}"}>
                    <ClientRenderer client={data.client} handlerId={handlerId} />
                    <ChannelRenderer channel={data.channel_from} handlerId={handlerId} />
                    <ChannelRenderer channel={data.channel_to} handlerId={handlerId} />
                    <ClientRenderer client={data.invoker} handlerId={handlerId} />
                    <>{data.message ? " (" + data.message + ")" : ""}</>
                </VariadicTranslatable>
            );

        default:
            return (
                <div className={cssStyleRenderer.errorMessage}>
                    <VariadicTranslatable text={"Having user move event with invalid reason: {0}"}>
                        <>{data.reason}</>
                    </VariadicTranslatable>
                </div>
            );
    }
});

registerDispatcher(EventType.CLIENT_VIEW_MOVE_OWN_CHANNEL, findLogDispatcher(EventType.CLIENT_VIEW_MOVE));

registerDispatcher(EventType.CLIENT_VIEW_MOVE_OWN, (data, handlerId) => {
    switch (data.reason) {
        case ViewReasonId.VREASON_MOVED:
            return (
                <VariadicTranslatable text={"You have been moved by {3} from channel {1} to {2}"}>
                    <ClientRenderer client={data.client} handlerId={handlerId} />
                    <ChannelRenderer channel={data.channel_from} handlerId={handlerId} />
                    <ChannelRenderer channel={data.channel_to} handlerId={handlerId} />
                    <ClientRenderer client={data.invoker} handlerId={handlerId} />
                </VariadicTranslatable>
            );

        case ViewReasonId.VREASON_USER_ACTION:
            return (
                <VariadicTranslatable text={"You switched from {1} to {2}"}>
                    <ClientRenderer client={data.client} handlerId={handlerId} />
                    <ChannelRenderer channel={data.channel_from} handlerId={handlerId} />
                    <ChannelRenderer channel={data.channel_to} handlerId={handlerId} />
                </VariadicTranslatable>
            );

        case ViewReasonId.VREASON_CHANNEL_KICK:
            return (
                <VariadicTranslatable text={"You got kicked out of the channel {1} to channel {2} by {3}{4}"}>
                    <ClientRenderer client={data.client} handlerId={handlerId} />
                    <ChannelRenderer channel={data.channel_from} handlerId={handlerId} />
                    <ChannelRenderer channel={data.channel_to} handlerId={handlerId} />
                    <ClientRenderer client={data.invoker} handlerId={handlerId} />
                    <>{data.message ? " (" + data.message + ")" : ""}</>
                </VariadicTranslatable>
            );

        default:
            return (
                <div className={cssStyleRenderer.errorMessage}>
                    <VariadicTranslatable text={"Having own move event with invalid reason: {0}"}>
                        <>{data.reason}</>
                    </VariadicTranslatable>
                </div>
            );
    }
});

registerDispatcher(EventType.CLIENT_VIEW_LEAVE, (data, handlerId) => {
    switch (data.reason) {
        case ViewReasonId.VREASON_USER_ACTION:
            return (
                <VariadicTranslatable text={"{0} disappeared from {1} to {2}"}>
                    <ClientRenderer client={data.client} handlerId={handlerId} />
                    <ChannelRenderer channel={data.channel_from} handlerId={handlerId} />
                    <ChannelRenderer channel={data.channel_to} handlerId={handlerId} />
                </VariadicTranslatable>
            );

        case ViewReasonId.VREASON_SERVER_LEFT:
            return (
                <VariadicTranslatable text={"{0} left the server{1}"}>
                    <ClientRenderer client={data.client} handlerId={handlerId} />
                    <>{data.message ? " (" + data.message + ")" : ""}</>
                </VariadicTranslatable>
            );

        case ViewReasonId.VREASON_SERVER_KICK:
            return (
                <VariadicTranslatable text={"{0} was kicked from the server by {1}.{2}"}>
                    <ClientRenderer client={data.client} handlerId={handlerId} />
                    <ClientRenderer client={data.invoker} handlerId={handlerId} />
                    <>{data.message ? " (" + data.message + ")" : ""}</>
                </VariadicTranslatable>
            );

        case ViewReasonId.VREASON_CHANNEL_KICK:
            return (
                <VariadicTranslatable text={"{0} was kicked from channel {1} by {2}.{3}"}>
                    <ClientRenderer client={data.client} handlerId={handlerId} />
                    <ChannelRenderer channel={data.channel_from} handlerId={handlerId} />
                    <ClientRenderer client={data.invoker} handlerId={handlerId} />
                    <>{data.message ? " (" + data.message + ")" : ""}</>
                </VariadicTranslatable>
            );

        case ViewReasonId.VREASON_BAN:
            let duration = <Translatable>permanently</Translatable>;
            if(data.ban_time)
                duration = <VariadicTranslatable text={"for"}><>{" " + formatDate(data.ban_time)}</></VariadicTranslatable>;

            return (
                <VariadicTranslatable text={"{0} was banned {1} by {2}.{3}"}>
                    <ClientRenderer client={data.client} handlerId={handlerId} />
                    {duration}
                    <ClientRenderer client={data.invoker} handlerId={handlerId} />
                    <>{data.message ? " (" + data.message + ")" : ""}</>
                </VariadicTranslatable>
            );

        case ViewReasonId.VREASON_TIMEOUT:
            return (
                <VariadicTranslatable text={"{0} timed out{1}"}>
                    <ClientRenderer client={data.client} handlerId={handlerId} />
                    <>{data.message ? " (" + data.message + ")" : ""}</>
                </VariadicTranslatable>
            );

        case ViewReasonId.VREASON_MOVED:
            return (
                <VariadicTranslatable text={"{0} disappeared from {1} to {2}, moved by {3}"}>
                    <ClientRenderer client={data.client} handlerId={handlerId} />
                    <ChannelRenderer channel={data.channel_from} handlerId={handlerId} />
                    <ChannelRenderer channel={data.channel_to} handlerId={handlerId} />
                    <ClientRenderer client={data.invoker} handlerId={handlerId} />
                </VariadicTranslatable>
            );

        default:
            return (
                <div className={cssStyleRenderer.errorMessage}>
                    <VariadicTranslatable text={"Having client leave event with invalid reason: {0}"}>
                        <>{data.reason}</>
                    </VariadicTranslatable>
                </div>
            );
    }
});

registerDispatcher(EventType.CLIENT_VIEW_LEAVE_OWN_CHANNEL, (data, handlerId) => {
    switch (data.reason) {
        case ViewReasonId.VREASON_USER_ACTION:
            return (
                <VariadicTranslatable text={"{0} disappeared from your channel {1} to {2}"}>
                    <ClientRenderer client={data.client} handlerId={handlerId} />
                    <ChannelRenderer channel={data.channel_from} handlerId={handlerId} />
                    <ChannelRenderer channel={data.channel_to} handlerId={handlerId} />
                </VariadicTranslatable>
            );

        case ViewReasonId.VREASON_MOVED:
            return (
                <VariadicTranslatable text={"{0} disappeared from your channel {1} to {2}, moved by {3}"}>
                    <ClientRenderer client={data.client} handlerId={handlerId} />
                    <ChannelRenderer channel={data.channel_from} handlerId={handlerId} />
                    <ChannelRenderer channel={data.channel_to} handlerId={handlerId} />
                    <ClientRenderer client={data.invoker} handlerId={handlerId} />
                </VariadicTranslatable>
            );

        default:
            return findLogDispatcher(EventType.CLIENT_VIEW_LEAVE)(data, handlerId, EventType.CLIENT_VIEW_LEAVE);
    }
});

registerDispatcher(EventType.SERVER_WELCOME_MESSAGE,data => (
    <BBCodeRenderer message={"[color=green]" + data.message + "[/color]"} settings={{convertSingleUrls: false}} />
));

registerDispatcher(EventType.SERVER_HOST_MESSAGE,data => (
    <BBCodeRenderer message={"[color=green]" + data.message + "[/color]"} settings={{convertSingleUrls: false}} />
));

registerDispatcher(EventType.SERVER_HOST_MESSAGE_DISCONNECT,data => (
    <BBCodeRenderer message={"[color=red]" + data.message + "[/color]"} settings={{convertSingleUrls: false}} />
));


registerDispatcher(EventType.CLIENT_NICKNAME_CHANGED,(data, handlerId) => (
    <VariadicTranslatable text={"{0} changed his nickname from \"{1}\" to \"{2}\""}>
        <ClientRenderer client={data.client} handlerId={handlerId} />
        <>{data.old_name}</>
        <>{data.new_name}</>
    </VariadicTranslatable>
));

registerDispatcher(EventType.CLIENT_NICKNAME_CHANGED_OWN,() => (
    <Translatable>Nickname successfully changed.</Translatable>
));

registerDispatcher(EventType.CLIENT_NICKNAME_CHANGE_FAILED,(data) => (
    <VariadicTranslatable text={"Failed to change nickname: {0}"}>
        <>{data.reason}</>
    </VariadicTranslatable>
));

registerDispatcher(EventType.GLOBAL_MESSAGE, (data, handlerId) => <>
    <VariadicTranslatable text={"{} send a server message: {1}"}>
        <ClientRenderer client={data.sender} handlerId={handlerId} />
        <XBBCodeRenderer>{data.message}</XBBCodeRenderer>
    </VariadicTranslatable>
</>);


registerDispatcher(EventType.DISCONNECTED,() => (
    <Translatable>Disconnected from server</Translatable>
));

registerDispatcher(EventType.RECONNECT_SCHEDULED,data => (
    <VariadicTranslatable text={"Reconnecting in {0}."}>
        <>{format_time(data.timeout, tr("now"))}</>
    </VariadicTranslatable>
));

registerDispatcher(EventType.RECONNECT_CANCELED,() => (
    <Translatable>Reconnect canceled.</Translatable>
));

registerDispatcher(EventType.RECONNECT_CANCELED,() => (
    <Translatable>Reconnecting...</Translatable>
));


registerDispatcher(EventType.SERVER_BANNED,(data, handlerId) => {
    const time = data.time === 0 ? <Translatable>ever</Translatable> : <>{format_time(data.time * 1000, tr("one second"))}</>;
    const reason = data.message ? <> <Translatable>Reason:</Translatable>&nbsp;{data.message}</> : undefined;

    if(data.invoker.client_id > 0)
        return (
            <div className={cssStyleRenderer.errorMessage}>
                <VariadicTranslatable text={"You've been banned from the server by {0} for {1}.{2}"}>
                    <ClientRenderer client={data.invoker} handlerId={handlerId} />
                    {time}
                    {reason}
                </VariadicTranslatable>
            </div>
        );
    else

        return (
            <div className={cssStyleRenderer.errorMessage}>
                <VariadicTranslatable text={"You've been banned from the server for {0}.{1}"}>
                    {time}
                    {reason}
                </VariadicTranslatable>
            </div>
        );
});

registerDispatcher(EventType.SERVER_REQUIRES_PASSWORD,() => (
    <Translatable>Server requires a password to connect.</Translatable>
));

registerDispatcher(EventType.SERVER_CLOSED,data => {
    if(data.message)
        return (
            <VariadicTranslatable text={"Server has been closed ({})."}>
                <>{data.message}</>
            </VariadicTranslatable>
        );
    return <Translatable>Server has been closed.</Translatable>;
});

registerDispatcher(EventType.CONNECTION_COMMAND_ERROR,data => {
    let message;
    if(typeof data.error === "string")
        message = data.error;
    else if(data.error instanceof CommandResult)
        message = data.error.formattedMessage();
    else
        message = data.error + "";

    return (
        <div className={cssStyleRenderer.errorMessage}>
            <VariadicTranslatable text={"Command execution resulted in: {}"}>
                <>{message}</>
            </VariadicTranslatable>
        </div>
    )
});

registerDispatcher(EventType.CHANNEL_CREATE,(data, handlerId) => {
    if(data.ownAction) {
        return (
            <VariadicTranslatable text={"Channel {} has been created."}>
                <ChannelRenderer channel={data.channel} handlerId={handlerId} />
            </VariadicTranslatable>
        );
    } else {
        return (
            <VariadicTranslatable text={"Channel {} has been created by {}."}>
                <ChannelRenderer channel={data.channel} handlerId={handlerId} />
                <ClientRenderer client={data.creator} handlerId={handlerId} />
            </VariadicTranslatable>
        );
    }
});

registerDispatcher("channel.show",(data, handlerId) => (
    <VariadicTranslatable text={"Channel {} has appeared."}>
        <ChannelRenderer channel={data.channel} handlerId={handlerId} />
    </VariadicTranslatable>
));

registerDispatcher(EventType.CHANNEL_DELETE,(data, handlerId) => {
    if(data.ownAction) {
        return (
            <VariadicTranslatable text={"Channel {} has been deleted."}>
                <ChannelRenderer channel={data.channel} handlerId={handlerId} />
            </VariadicTranslatable>
        );
    } else {
        return (
            <VariadicTranslatable text={"Channel {} has been deleted by {}."}>
                <ChannelRenderer channel={data.channel} handlerId={handlerId} />
                <ClientRenderer client={data.deleter} handlerId={handlerId} />
            </VariadicTranslatable>
        );
    }
});

registerDispatcher("channel.hide",(data, handlerId) => (
    <VariadicTranslatable text={"Channel {} has disappeared."}>
        <ChannelRenderer channel={data.channel} handlerId={handlerId} />
    </VariadicTranslatable>
));

registerDispatcher(EventType.CLIENT_POKE_SEND,(data, handlerId) => (
    <VariadicTranslatable text={"You poked {}."}>
        <ClientRenderer client={data.target} handlerId={handlerId} />
    </VariadicTranslatable>
));

registerDispatcher(EventType.CLIENT_POKE_RECEIVED,(data, handlerId) => {
    if(data.message) {
        return (
            <VariadicTranslatable text={"You received a poke from {}: {}"}>
                <ClientRenderer client={data.sender} handlerId={handlerId} />
                <BBCodeRenderer message={data.message} settings={{ convertSingleUrls: false }} />
            </VariadicTranslatable>
        );
    } else {
        return (
            <VariadicTranslatable text={"You received a poke from {}."}>
                <ClientRenderer client={data.sender} handlerId={handlerId} />
            </VariadicTranslatable>
        );
    }
});

registerDispatcher(EventType.PRIVATE_MESSAGE_RECEIVED, () => undefined);
registerDispatcher(EventType.PRIVATE_MESSAGE_SEND, () => undefined);

registerDispatcher(EventType.WEBRTC_FATAL_ERROR, (data) => {
    if(data.retryTimeout) {
        let time = Math.ceil(data.retryTimeout / 1000);
        let minutes = Math.floor(time / 60);
        let seconds = time % 60;

        return (
            <div className={cssStyleRenderer.errorMessage}>
                <VariadicTranslatable text={"WebRTC connection closed due to a fatal error:\n{}\nRetry scheduled in {}."}>
                    <>{data.message}</>
                    <>{(minutes > 0 ? minutes + "m" : "") + seconds + "s"}</>
                </VariadicTranslatable>
            </div>
        );
    } else {
        return (
            <div className={cssStyleRenderer.errorMessage}>
                <VariadicTranslatable text={"WebRTC connection closed due to a fatal error:\n{}\nNo retry scheduled."}>
                    <>{data.message}</>
                </VariadicTranslatable>
            </div>
        );
    }
});