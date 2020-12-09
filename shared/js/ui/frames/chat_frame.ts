import {ClientEntry, MusicClientEntry} from "../../tree/Client";
import {ConnectionHandler} from "../../ConnectionHandler";
import {MusicInfo} from "../../ui/frames/side/music_info";
import {ChannelConversationController} from "./side/ChannelConversationController";
import {PrivateConversationController} from "./side/PrivateConversationController";
import {ClientInfoController} from "tc-shared/ui/frames/side/ClientInfoController";
import {SideHeader} from "tc-shared/ui/frames/side/HeaderController";
import * as ReactDOM from "react-dom";
import {SideBarRenderer} from "tc-shared/ui/frames/SideBarRenderer";
import * as React from "react";
import {SideBarEvents, SideBarType} from "tc-shared/ui/frames/SideBarDefinitions";
import {Registry} from "tc-shared/events";

const cssStyle = require("./SideBar.scss");

export class Frame {
    readonly handle: ConnectionHandler;
    private htmlTag: HTMLDivElement;

    private currentType: SideBarType;

    private uiEvents: Registry<SideBarEvents>;
    private header: SideHeader;

    private musicInfo: MusicInfo;
    private clientInfo: ClientInfoController;
    private channelConversations: ChannelConversationController;
    private privateConversations: PrivateConversationController;

    constructor(handle: ConnectionHandler) {
        this.handle = handle;

        this.currentType = "none";
        this.uiEvents = new Registry<SideBarEvents>();
        this.uiEvents.on("query_content", () => this.uiEvents.fire_react("notify_content", { content: this.currentType }));
        this.uiEvents.on("query_content_data", event => this.sendContentData(event.content));

        this.privateConversations = new PrivateConversationController(handle);
        this.channelConversations = new ChannelConversationController(handle);
        this.clientInfo = new ClientInfoController(handle);
        this.musicInfo = new MusicInfo(this);
        this.header = new SideHeader();

        this.handle.events().one("notify_handler_initialized", () => this.header.setConnectionHandler(handle));

        this.createHtmlTag();
        this.showChannelConversations();
    }

    html_tag() : HTMLDivElement { return this.htmlTag; }

    destroy() {
        this.header?.destroy();
        this.header = undefined;

        this.htmlTag && this.htmlTag.remove();
        this.htmlTag = undefined;

        this.clientInfo?.destroy();
        this.clientInfo = undefined;

        this.privateConversations?.destroy();
        this.privateConversations = undefined;

        this.channelConversations?.destroy();
        this.channelConversations = undefined;

        this.musicInfo && this.musicInfo.destroy();
        this.musicInfo = undefined;

        this.privateConversations && this.privateConversations.destroy();
        this.privateConversations = undefined;

        this.channelConversations && this.channelConversations.destroy();
        this.channelConversations = undefined;
    }

    renderInto(container: HTMLDivElement) {
        ReactDOM.render(React.createElement(SideBarRenderer, {
            key: this.handle.handlerId,
            handlerId: this.handle.handlerId,
            events: this.uiEvents,
            eventsHeader: this.header["uiEvents"],
        }), container);
    }

    private createHtmlTag() {
        this.htmlTag = document.createElement("div");
        this.htmlTag.classList.add(cssStyle.container);
    }


    privateConversationsController() : PrivateConversationController {
        return this.privateConversations;
    }

    getClientInfo() : ClientInfoController {
        return this.clientInfo;
    }

    music_info() : MusicInfo {
        return this.musicInfo;
    }

    private setCurrentContent(type: SideBarType) {
        if(this.currentType === type) {
            return;
        }

        this.currentType = type;
        this.uiEvents.fire_react("notify_content", { content: this.currentType });
    }

    private sendContentData(content: SideBarType) {
        switch (content) {
            case "none":
                this.uiEvents.fire_react("notify_content_data", {
                    content: "none",
                    data: {}
                });
                break;

            case "channel-chat":
                this.uiEvents.fire_react("notify_content_data", {
                    content: "channel-chat",
                    data: {
                        events: this.channelConversations["uiEvents"],
                        handlerId: this.handle.handlerId
                    }
                });
                break;

            case "private-chat":
                this.uiEvents.fire_react("notify_content_data", {
                    content: "private-chat",
                    data: {
                        events: this.privateConversations["uiEvents"],
                        handlerId: this.handle.handlerId
                    }
                });
                break;

            case "client-info":
                this.uiEvents.fire_react("notify_content_data", {
                    content: "client-info",
                    data: {
                        events: this.clientInfo["uiEvents"],
                    }
                });
                break;

            case "music-manage":
                this.uiEvents.fire_react("notify_content_data", {
                    content: "music-manage",
                    data: { }
                });
                break;
        }
    }

    showPrivateConversations() {
        this.setCurrentContent("private-chat");
    }

    showChannelConversations() {
        this.setCurrentContent("channel-chat");
    }

    showClientInfo(client: ClientEntry) {
        this.clientInfo.setClient(client);
        this.setCurrentContent("client-info");
    }

    showMusicPlayer(client: MusicClientEntry) {
        this.musicInfo.set_current_bot(client);
        this.setCurrentContent("music-manage");
    }

    clearSideBar() {
        this.setCurrentContent("none");
    }
}