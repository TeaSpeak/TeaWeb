import * as React from "react";
import {IpcInviteInfo, IpcInviteInfoLoaded} from "tc-shared/text/bbcode/InviteDefinitions";
import {ChannelMessage, getIpcInstance, IPCChannel} from "tc-shared/ipc/BrowserIPC";
import * as loader from "tc-loader";
import {AppParameters} from "tc-shared/settings";
import {useEffect, useState} from "react";
import _ = require("lodash");
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {Button} from "tc-shared/ui/react-elements/Button";
import {SimpleUrlRenderer} from "tc-shared/text/bbcode/url";
import {LoadingDots} from "tc-shared/ui/react-elements/LoadingDots";
import {ClientIconRenderer} from "tc-shared/ui/react-elements/Icons";
import {ClientIcon} from "svg-sprites/client-icons";

const cssStyle = require("./InviteRenderer.scss");
const kInviteUrlRegex = /^(https:\/\/)?(teaspeak.de\/|join.teaspeak.de\/(invite\/)?)([a-zA-Z0-9]{4})$/gm;

export function isInviteLink(url: string) : boolean {
    kInviteUrlRegex.lastIndex = 0;
    return !!url.match(kInviteUrlRegex);
}

type LocalInviteInfo = IpcInviteInfo | { status: "loading" };
type InviteCacheEntry = { status: LocalInviteInfo, timeout: number };

const localInviteCache: { [key: string]: InviteCacheEntry } = {};
const localInviteCallbacks: { [key: string]: (() => void)[] } = {};

const useInviteLink = (linkId: string): LocalInviteInfo => {
    if(!localInviteCache[linkId]) {
        localInviteCache[linkId] = { status: { status: "loading" }, timeout: setTimeout(() => delete localInviteCache[linkId], 60 * 1000) };
        ipcChannel?.sendMessage("query", { linkId });
    }

    const [ value, setValue ] = useState(localInviteCache[linkId].status);

    useEffect(() => {
        if(typeof localInviteCache[linkId]?.status === "undefined") {
            return;
        }

        if(!_.isEqual(value, localInviteCache[linkId].status)) {
            setValue(localInviteCache[linkId].status);
        }

        const callback = () => setValue(localInviteCache[linkId].status);
        (localInviteCallbacks[linkId] || (localInviteCallbacks[linkId] = [])).push(callback);
        return () => localInviteCallbacks[linkId]?.remove(callback);
    }, [linkId]);

    return value;
}

const LoadedInviteRenderer = React.memo((props: { info: IpcInviteInfoLoaded }) => {
    let joinButton = (
        <div className={cssStyle.right}>
            <Button
                color={"green"}
                type={"small"}
                onClick={() => {
                    ipcChannel?.sendMessage("connect", {
                        connectParameters: props.info.connectParameters,
                        serverAddress: props.info.serverAddress,
                        serverUniqueId: props.info.serverUniqueId,
                    });
                }}
            >
                <Translatable>Join Now!</Translatable>
            </Button>
        </div>
    );

    const [, setRevision ] = useState(0);
    useEffect(() => {
        if(props.info.expireTimestamp === 0) {
            return;
        }

        const timeout = props.info.expireTimestamp - (Date.now() / 1000);
        if(timeout <= 0) {
            return;
        }

        const timeoutId = setTimeout(() => setRevision(Date.now()));
        return () => clearTimeout(timeoutId);
    });

    if(props.info.expireTimestamp > 0 && Date.now() / 1000 >= props.info.expireTimestamp) {
        return (
            <InviteErrorRenderer noTitle={true} key={"expired"}>
                <Translatable>Link expired</Translatable>
            </InviteErrorRenderer>
        );
    }

    if(props.info.channelName) {
        return (
            <div className={cssStyle.container + " " + cssStyle.info} key={"with-channel"}>
                <div className={cssStyle.left}>
                    <div className={cssStyle.channelName} title={props.info.channelName}>
                        <ClientIconRenderer icon={ClientIcon.ChannelGreenSubscribed} />
                        <div className={cssStyle.name}>{props.info.channelName}</div>
                    </div>
                    <div className={cssStyle.serverName + " " + cssStyle.short} title={props.info.serverName}>{props.info.serverName}</div>
                </div>
                {joinButton}
            </div>
        );
    } else {
        return (
            <div className={cssStyle.container + " " + cssStyle.info} key={"without-channel"}>
                <div className={cssStyle.left}>
                    <div className={cssStyle.joinServer}><Translatable>Join server</Translatable></div>
                    <div className={cssStyle.serverName + " " + cssStyle.large} title={props.info.serverName}>{props.info.serverName}</div>
                </div>
                {joinButton}
            </div>
        );
    }
});

const InviteErrorRenderer = (props: { children, noTitle?: boolean }) => {
    return (
        <div className={cssStyle.container + " " + cssStyle.error}>
            <div className={cssStyle.containerError + " " + (props.noTitle ? cssStyle.noTitle : "")}>
                <div className={cssStyle.title}>
                    <Translatable>Failed to load invite key:</Translatable>
                </div>
                <div className={cssStyle.message}>
                    {props.children}
                </div>
            </div>
        </div>
    );
}

const InviteLoadingRenderer = () => {
    return (
        <div className={cssStyle.container + " " + cssStyle.loading}>
            <div className={cssStyle.left}>
                <div className={cssStyle.loading}>
                    <Translatable>Loading,<br /> please wait</Translatable> <LoadingDots />
                </div>
            </div>
            <div className={cssStyle.right}>
                <Button
                    color={"green"}
                    type={"small"}
                    disabled={true}
                >
                    <Translatable>Join now!</Translatable>
                </Button>
            </div>
        </div>
    );
}

export const InviteLinkRenderer = (props: { url: string, handlerId: string }) => {
    kInviteUrlRegex.lastIndex = 0;
    const inviteLinkId = kInviteUrlRegex.exec(props.url)[4];

    const linkInfo = useInviteLink(inviteLinkId);

    let body;
    switch (linkInfo.status) {
        case "success":
            body = <LoadedInviteRenderer info={linkInfo} key={"loaded"} />;
            break;

        case "loading":
            body = <InviteLoadingRenderer key={"loading"} />;
            break;

        case "error":
            body = (
                <InviteErrorRenderer key={"error"}>
                    {linkInfo.message}
                </InviteErrorRenderer>
            );
            break;

        case "expired":
            body = (
                <InviteErrorRenderer key={"expired"} noTitle={true}>
                    <Translatable>Invite link expired</Translatable>
                </InviteErrorRenderer>
            );
            break;

        case "not-found":
            body = (
                <InviteErrorRenderer key={"expired"} noTitle={true}>
                    <Translatable>Unknown invite link</Translatable>
                </InviteErrorRenderer>
            );
            break;
    }

    return (
        <React.Fragment>
            <SimpleUrlRenderer target={props.url}>{props.url}</SimpleUrlRenderer>
            {body}
        </React.Fragment>
    );
}

let ipcChannel: IPCChannel;
loader.register_task(loader.Stage.JAVASCRIPT_INITIALIZING, {
    name: "Invite controller init",
    function: async () => {
        ipcChannel = getIpcInstance().createCoreControlChannel("invite-info");
        ipcChannel.messageHandler = handleIpcMessage;
    },
    priority: 10
});


function handleIpcMessage(remoteId: string, broadcast: boolean, message: ChannelMessage) {
    if(message.type === "query-result") {
        if(!localInviteCache[message.data.linkId]) {
            return;
        }

        localInviteCache[message.data.linkId].status = message.data.result;
        localInviteCallbacks[message.data.linkId]?.forEach(callback => callback());
    }
}