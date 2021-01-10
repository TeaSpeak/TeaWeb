import * as React from "react";
import {ClientIcon} from "svg-sprites/client-icons";
import {IconRenderer, RemoteIconRenderer} from "tc-shared/ui/react-elements/Icon";
import {ClientIconRenderer} from "tc-shared/ui/react-elements/Icons";
import {getIconManager} from "tc-shared/file/Icons";
import {Settings, settings} from "tc-shared/settings";
import {UnreadMarkerRenderer} from "tc-shared/ui/tree/RendererTreeEntry";
import {RDPClient} from "tc-shared/ui/tree/RendererDataProvider";
import * as DOMPurify from "dompurify";
import {ChannelTreeView} from "tc-shared/ui/tree/RendererView";

const clientStyle = require("./Client.scss");
const viewStyle = require("./View.scss");

/* TODO: Render a talk power request */
export class ClientStatus extends React.Component<{ client: RDPClient }, {}> {
    render() {
        return <IconRenderer icon={this.props.client.status} className={clientStyle.statusIcon} />
    }
}

export class ClientName extends React.Component<{ client: RDPClient }, {}> {
    render() {
        const name = this.props.client.name;

        if(!name) {
            return null;
        } else {
            let prefixString = "";
            let suffixString = "";
            let awayMessage = "";

            if(name.prefix.length > 0) {
                prefixString = `[${name.prefix.join(" ")}] `;
            }

            if(name.suffix.length > 0) {
                suffixString = ` [${name.suffix.join(" ")}]`;
            }

            if(name.awayMessage) {
                awayMessage = " " + name.awayMessage;
            }

            return (
                <div
                    className={clientStyle.clientName + " " + (this.props.client.localClient ? clientStyle.clientNameOwn : "")}>
                    {prefixString + name.name + suffixString + awayMessage}
                </div>
            );
        }
    }
}

export class ClientTalkStatusIcon extends React.Component<{ client: RDPClient }, {}> {
    render() {
        switch (this.props.client.talkStatus) {
            case "prohibited":
            case "requested":
                return <ClientIconRenderer icon={ClientIcon.InputMuted} key={"not-granted"} />;

            case "granted":
                return <ClientIconRenderer icon={ClientIcon.IsTalker} key={"talker"} />;

            default:
                return null;
        }
    }
}

export class ClientIconsRenderer extends React.Component<{ client: RDPClient }, {}> {
    render() {
        const iconInfo = this.props.client.icons;
        const handlerId = this.props.client.getHandlerId();

        let icons = [ <ClientTalkStatusIcon client={this.props.client} key={"talk-icon"} ref={this.props.client.refTalkStatus} /> ];

        if(iconInfo) {
            icons.push(...iconInfo.serverGroupIcons
                .map(icon => (
                    <RemoteIconRenderer
                        icon={getIconManager().resolveIcon(icon.iconId, icon.serverUniqueId, handlerId)}
                        title={`${icon.groupName} (${icon.groupId})`}
                        key={"icon-sg-" + icon.groupId}
                    />
                )));
            icons.push(...[iconInfo.channelGroupIcon].filter(e => !!e)
                .map(icon => (
                    <RemoteIconRenderer
                        icon={getIconManager().resolveIcon(icon.iconId, icon.serverUniqueId, handlerId)}
                        title={`${icon.groupName} (${icon.groupId})`}
                        key={"icon-cg-" + icon.groupId}
                    />
                )));
            if(iconInfo.clientIcon) {
                icons.push(
                    <RemoteIconRenderer
                        icon={getIconManager().resolveIcon(iconInfo.clientIcon.iconId, iconInfo.clientIcon.serverUniqueId, handlerId)}
                        title={tr("Client icon")}
                        key={"icon-client"}
                    />
                );
            }
        }

        return (
            <div className={clientStyle.containerIcons}>
                {icons}
            </div>
        );
    }
}

interface ClientNameEditProps {
    editFinished: (new_name?: string) => void;
    initialName: string;
}

declare global{
    interface HTMLElement {
        createTextRange;
    }
}
function selectText(node: HTMLElement) {
    if (document.body.createTextRange) {
        const range = document.body.createTextRange();
        range.moveToElementText(node);
        range.select();
    } else if (window.getSelection) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(node);
        selection.removeAllRanges();
        selection.addRange(range);
    } else {
        console.warn("Could not select text in node: Unsupported browser.");
    }
}


class ClientNameEdit extends React.Component<ClientNameEditProps, {}> {
    private readonly refDiv: React.RefObject<HTMLDivElement> = React.createRef();

    componentDidMount(): void {
        this.refDiv.current.focus();
        selectText(this.refDiv.current);
    }

    render() {
        return <div
            className={clientStyle.clientName + " " + clientStyle.edit}
            contentEditable={true}
            ref={this.refDiv}
            dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(this.props.initialName)}}
            onBlur={() => this.onBlur()}
            onKeyPress={e => this.onKeyPress(e)}
        />
    }

    private onBlur() {
        this.props.editFinished(this.refDiv.current.textContent);
    }

    private onKeyPress(event: React.KeyboardEvent) {
        if (event.key === "Enter") {
            event.preventDefault();
            this.onBlur();
        }
    }
}

export class RendererClient extends React.Component<{ client: RDPClient }, {}> {
    render() {
        const client = this.props.client;
        const selected = this.props.client.selected;
        const events = this.props.client.getEvents();

        return (
            <div className={clientStyle.clientEntry + " " + viewStyle.treeEntry + " " + (selected ? viewStyle.selected : "")}
                 style={{ top: (client.offsetTop * ChannelTreeView.EntryHeightEm) + "em" }}
                 onContextMenu={event => {
                     if (settings.getValue(Settings.KEY_DISABLE_CONTEXT_MENU)) {
                         return;
                     }

                     event.preventDefault();
                     this.props.client.handleUiContextMenu(event.pageX, event.pageY);
                 }}
                 onMouseUp={event => {
                     if (event.button !== 0) {
                         return; /* only left mouse clicks */
                     }

                     this.props.client.select("auto");
                 }}
                 onDoubleClick={() => this.props.client.handleUiDoubleClicked()}
                 draggable={!client.rename}
                 onDragStart={event => this.props.client.handleUiDragStart(event.nativeEvent)}
                 onDragOver={event => this.props.client.handleUiDragOver(event.nativeEvent)}
                 onDrop={event => this.props.client.handleUiDrop(event.nativeEvent)}
            >
                <div className={viewStyle.leftPadding} style={{ paddingLeft: client.offsetLeft + "em" }} />
                <UnreadMarkerRenderer entry={client} ref={client.refUnread} />
                <ClientStatus client={client} ref={client.refStatus} />
                {...(client.rename ? [
                    <ClientNameEdit initialName={client.renameDefault} editFinished={value => {
                        events.fire("action_client_name_submit", { treeEntryId: client.entryId, name: value });
                    }} key={"rename"} />
                ] : [
                    <ClientName client={client} ref={client.refName} key={"name"} />,
                    <ClientIconsRenderer client={client} ref={client.refIcons} key={"icons"} />
                ])}
            </div>
        );
    }
}