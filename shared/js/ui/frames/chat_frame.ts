import {ClientEntry, LocalClientEntry, MusicClientEntry} from "../../tree/Client";
import {ConnectionHandler} from "../../ConnectionHandler";
import {MusicInfo} from "../../ui/frames/side/music_info";
import {ChannelConversationController} from "./side/ChannelConversationController";
import {PrivateConversationController} from "./side/PrivateConversationController";
import {ClientInfoController} from "tc-shared/ui/frames/side/ClientInfoController";
import {SideHeader} from "tc-shared/ui/frames/side/HeaderController";

export enum FrameContent {
    NONE,
    PRIVATE_CHAT,
    CHANNEL_CHAT,
    CLIENT_INFO,
    MUSIC_BOT
}

export class Frame {
    readonly handle: ConnectionHandler;
    private htmlTag: JQuery;
    private containerChannelChat: JQuery;
    private _content_type: FrameContent;

    private header: SideHeader;
    private clientInfo: ClientInfoController;
    private musicInfo: MusicInfo;
    private channelConversations: ChannelConversationController;
    private privateConversations: PrivateConversationController;

    constructor(handle: ConnectionHandler) {
        this.handle = handle;

        this._content_type = FrameContent.NONE;
        this.privateConversations = new PrivateConversationController(handle);
        this.channelConversations = new ChannelConversationController(handle);
        this.clientInfo = new ClientInfoController(handle);
        this.musicInfo = new MusicInfo(this);
        this.header = new SideHeader();

        this.handle.events().one("notify_handler_initialized", () => this.header.setConnectionHandler(handle));

        this.createHtmlTag();
        this.showChannelConversations();
    }

    html_tag() : JQuery { return this.htmlTag; }

    content_type() : FrameContent { return this._content_type; }

    destroy() {
        this.header?.destroy();
        this.header = undefined;

        this.htmlTag && this.htmlTag.remove();
        this.htmlTag = undefined;

        this.clientInfo?.destroy();
        this.clientInfo = undefined;

        this.musicInfo && this.musicInfo.destroy();
        this.musicInfo = undefined;

        this.privateConversations && this.privateConversations.destroy();
        this.privateConversations = undefined;

        this.channelConversations && this.channelConversations.destroy();
        this.channelConversations = undefined;

        this.containerChannelChat && this.containerChannelChat.remove();
        this.containerChannelChat = undefined;
    }

    private createHtmlTag() {
        this.htmlTag = $("#tmpl_frame_chat").renderTag();
        this.htmlTag.find(".container-info").replaceWith(this.header.getHtmlTag());
        this.containerChannelChat = this.htmlTag.find(".container-chat");
    }


    private_conversations() : PrivateConversationController {
        return this.privateConversations;
    }

    getClientInfo() : ClientInfoController {
        return this.clientInfo;
    }

    music_info() : MusicInfo {
        return this.musicInfo;
    }

    private clearSideBar() {
        this._content_type = FrameContent.NONE;
        this.containerChannelChat.children().detach();
    }

    showPrivateConversations() {
        if(this._content_type === FrameContent.PRIVATE_CHAT)
            return;

        this.header.setState({ state: "conversation", mode: "private" });

        this.clearSideBar();
        this._content_type = FrameContent.PRIVATE_CHAT;
        this.containerChannelChat.append(this.privateConversations.htmlTag);
        this.privateConversations.handlePanelShow();
    }

    showChannelConversations() {
        if(this._content_type === FrameContent.CHANNEL_CHAT)
            return;

        this.header.setState({ state: "conversation", mode: "channel" });

        this.clearSideBar();
        this._content_type = FrameContent.CHANNEL_CHAT;
        this.containerChannelChat.append(this.channelConversations.htmlTag);
        this.channelConversations.handlePanelShow();
    }

    showClientInfo(client: ClientEntry) {
        this.clientInfo.setClient(client);
        this.header.setState({ state: "client", ownClient: client instanceof LocalClientEntry });

        if(this._content_type === FrameContent.CLIENT_INFO)
            return;

        this.clearSideBar();
        this._content_type = FrameContent.CLIENT_INFO;
        this.containerChannelChat.append(this.clientInfo.getHtmlTag());
    }

    showMusicPlayer(client: MusicClientEntry) {
        this.musicInfo.set_current_bot(client);

        if(this._content_type === FrameContent.MUSIC_BOT)
            return;

        this.header.setState({ state: "music-bot" });
        this.musicInfo.previous_frame_content = this._content_type;
        this.clearSideBar();
        this._content_type = FrameContent.MUSIC_BOT;
        this.containerChannelChat.append(this.musicInfo.html_tag());
    }

    set_content(type: FrameContent) {
        if(this._content_type === type) {
            return;
        }

        if(type === FrameContent.CHANNEL_CHAT) {
            this.showChannelConversations();
        } else if(type === FrameContent.PRIVATE_CHAT) {
            this.showPrivateConversations();
        } else {
            this.header.setState({ state: "none" });
            this.clearSideBar();
            this._content_type = FrameContent.NONE;
        }
    }
}