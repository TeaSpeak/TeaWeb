/* the bar on the right with the chats (Channel & Client) */
import {ClientEntry, MusicClientEntry} from "../../tree/Client";
import {ConnectionHandler} from "../../ConnectionHandler";
import {ChannelEntry} from "../../tree/Channel";
import {ServerEntry} from "../../tree/Server";
import {openMusicManage} from "../../ui/modal/ModalMusicManage";
import {formatMessage} from "../../ui/frames/chat";
import {ClientInfo} from "../../ui/frames/side/client_info";
import {MusicInfo} from "../../ui/frames/side/music_info";
import {ConversationManager} from "../../ui/frames/side/ConversationManager";
import {PrivateConversationManager} from "../../ui/frames/side/PrivateConversationManager";
import {generateIconJQueryTag, getIconManager} from "tc-shared/file/Icons";

export enum InfoFrameMode {
    NONE = "none",
    CHANNEL_CHAT = "channel_chat",
    PRIVATE_CHAT = "private_chat",
    CLIENT_INFO = "client_info",
    MUSIC_BOT = "music_bot"
}
export class InfoFrame {
    private readonly handle: Frame;
    private _html_tag: JQuery;
    private _mode: InfoFrameMode;

    private _value_ping: JQuery;
    private _ping_updater: number;

    private _channel_text: ChannelEntry;
    private _channel_voice: ChannelEntry;

    private _button_conversation: HTMLElement;

    private _button_bot_manage: JQuery;
    private _button_song_add: JQuery;

    constructor(handle: Frame) {
        this.handle = handle;
        this._build_html_tag();
        this.update_channel_talk();
        this.update_channel_text();
        this.set_mode(InfoFrameMode.CHANNEL_CHAT);
        this._ping_updater = setInterval(() => this.update_ping(), 2000);
        this.update_ping();
    }

    html_tag() : JQuery { return this._html_tag; }
    destroy() {
        clearInterval(this._ping_updater);

        this._html_tag && this._html_tag.remove();
        this._html_tag = undefined;
        this._value_ping = undefined;
    }

    private _build_html_tag() {
        this._html_tag = $("#tmpl_frame_chat_info").renderTag();
        this._html_tag.find(".button-switch-chat-channel").on('click', () => this.handle.show_channel_conversations());
        this._value_ping = this._html_tag.find(".value-ping");
        this._html_tag.find(".chat-counter").on('click', event => this.handle.show_private_conversations());
        this._button_conversation = this._html_tag.find(".button.open-conversation").on('click', event => {
            const selected_client = this.handle.client_info().current_client();
            if(!selected_client) return;

            const conversation = selected_client ? this.handle.private_conversations().findOrCreateConversation(selected_client) : undefined;
            if(!conversation) return;

            this.handle.private_conversations().setActiveConversation(conversation);
            this.handle.show_private_conversations();
        })[0];

        this._button_bot_manage = this._html_tag.find(".bot-manage").on('click', event => {
            const bot = this.handle.music_info().current_bot();
            if(!bot) return;

            openMusicManage(this.handle.handle, bot);
        });
        this._button_song_add = this._html_tag.find(".bot-add-song").on('click', event => {
            this.handle.music_info().events.fire("action_song_add");
        });
    }

    update_ping() {
        this._value_ping.removeClass("very-good good medium poor very-poor");
        const connection = this.handle.handle.serverConnection;
        if(!this.handle.handle.connected || !connection) {
            this._value_ping.text("Not connected");
            return;
        }

        const ping = connection.ping();
        if(!ping || typeof(ping.native) !== "number") {
            this._value_ping.text("Not available");
            return;
        }

        let value;
        if(typeof(ping.javascript) !== "undefined") {
            value = ping.javascript;
            this._value_ping.text(ping.javascript.toFixed(0) + "ms").attr('title', 'Native: ' + ping.native.toFixed(3) + "ms \nJavascript: " + ping.javascript.toFixed(3) + "ms");
        } else {
            value = ping.native;
            this._value_ping.text(ping.native.toFixed(0) + "ms").attr('title', "Ping: " + ping.native.toFixed(3) + "ms");
        }

        if(value <= 10)
            this._value_ping.addClass("very-good");
        else if(value <= 30)
            this._value_ping.addClass("good");
        else if(value <= 60)
            this._value_ping.addClass("medium");
        else if(value <= 150)
            this._value_ping.addClass("poor");
        else
            this._value_ping.addClass("very-poor");
    }

    update_channel_talk() {
        const client = this.handle.handle.getClient();
        const channel = client ? client.currentChannel() : undefined;
        this._channel_voice = channel;

        const html_tag =  this._html_tag.find(".value-voice-channel");
        const html_limit_tag = this._html_tag.find(".value-voice-limit");

        html_limit_tag.text("");
        html_tag.children().remove();

        if(channel) {
            if(channel.properties.channel_icon_id != 0) {
                const connection = channel.channelTree.client;
                generateIconJQueryTag(getIconManager().resolveIcon(channel.properties.channel_icon_id, connection.getCurrentServerUniqueId(), connection.handlerId)).appendTo(html_tag);
            }
            $.spawn("div").text(channel.formattedChannelName()).appendTo(html_tag);

            this.update_channel_limit(channel, html_limit_tag);
        } else {
            $.spawn("div").text("Not connected").appendTo(html_tag);
        }
    }

    update_channel_text() {
        const channel_tree = this.handle.handle.connected ? this.handle.handle.channelTree : undefined;
        const current_channel_id = channel_tree ? this.handle.channel_conversations().selectedConversation() : 0;
        const channel = channel_tree ? channel_tree.findChannel(current_channel_id) : undefined;
        this._channel_text = channel;

        const tag_container = this._html_tag.find(".mode-channel_chat.channel");
        const html_tag_title = tag_container.find(".title");
        const html_tag =  tag_container.find(".value-text-channel");
        const html_limit_tag = tag_container.find(".value-text-limit");

        /* reset */
        html_tag_title.text(tr("You're chatting in Channel"));
        html_limit_tag.text("");
        html_tag.children().detach();

        /* initialize */
        if(channel) {
            if(channel.properties.channel_icon_id != 0) {
                const connection = channel.channelTree.client;
                generateIconJQueryTag(getIconManager().resolveIcon(channel.properties.channel_icon_id, connection.getCurrentServerUniqueId(), connection.handlerId)).appendTo(html_tag);
            }
            $.spawn("div").text(channel.formattedChannelName()).appendTo(html_tag);

            this.update_channel_limit(channel, html_limit_tag);
        } else if(channel_tree && current_channel_id > 0) {
            html_tag.append(formatMessage(tr("Unknown channel id {}"), current_channel_id));
        } else if(channel_tree && current_channel_id == 0) {
            const server = this.handle.handle.channelTree.server;
            if(server.properties.virtualserver_icon_id != 0) {
                const connection = server.channelTree.client;
                generateIconJQueryTag(getIconManager().resolveIcon(server.properties.virtualserver_icon_id, connection.getCurrentServerUniqueId(), connection.handlerId)).appendTo(html_tag);
            }
            $.spawn("div").text(server.properties.virtualserver_name).appendTo(html_tag);
            html_tag_title.text(tr("You're chatting in Server"));

            this.update_server_limit(server, html_limit_tag);
        } else if(this.handle.handle.connected) {
            $.spawn("div").text("No channel selected").appendTo(html_tag);
        } else {
            $.spawn("div").text("Not connected").appendTo(html_tag);
        }
    }

    update_channel_client_count(channel: ChannelEntry) {
        if(channel === this._channel_text) {
            this.update_channel_limit(channel, this._html_tag.find(".value-text-limit"));
        }

        if(channel === this._channel_voice) {
            this.update_channel_limit(channel, this._html_tag.find(".value-voice-limit"));
        }
    }

    private update_channel_limit(channel: ChannelEntry, tag: JQuery) {
        let channel_limit = tr("Unlimited");
        if(!channel.properties.channel_flag_maxclients_unlimited)
            channel_limit = "" + channel.properties.channel_maxclients;
        else if(!channel.properties.channel_flag_maxfamilyclients_unlimited) {
            if(channel.properties.channel_maxfamilyclients >= 0)
                channel_limit = "" + channel.properties.channel_maxfamilyclients;
        }
        tag.text(channel.clients(false).length + " / " + channel_limit);
    }

    private update_server_limit(server: ServerEntry, tag: JQuery) {
        const fn = () => {
            let text = server.properties.virtualserver_clientsonline + " / " + server.properties.virtualserver_maxclients;
            if(server.properties.virtualserver_reserved_slots)
                text += " (" + server.properties.virtualserver_reserved_slots + " " + tr("Reserved") + ")";
            tag.text(text);
        };

        server.updateProperties().then(fn).catch(error => tag.text(tr("Failed to update info")));
        fn();
    }

    update_chat_counter() {
        const privateConversations = this.handle.private_conversations().getConversations();
        {
            const count = privateConversations.filter(e => e.hasUnreadMessages()).length;
            const count_container = this._html_tag.find(".container-indicator");
            const count_tag = count_container.find(".chat-unread-counter");
            count_container.toggle(count > 0);
            count_tag.text(count);
        }
        {
            const count_tag = this._html_tag.find(".chat-counter");
            if(privateConversations.length == 0)
                count_tag.text(tr("No conversations"));
            else if(privateConversations.length == 1)
                count_tag.text(tr("One conversation"));
            else
                count_tag.text(privateConversations.length + " " + tr("conversations"));
        }
    }

    current_mode() : InfoFrameMode {
        return this._mode;
    }

    set_mode(mode: InfoFrameMode) {
        for(const mode in InfoFrameMode)
            this._html_tag.removeClass("mode-" + InfoFrameMode[mode]);
        this._html_tag.addClass("mode-" + mode);

        if(mode === InfoFrameMode.CLIENT_INFO && this._button_conversation) {
            //Will be called every time a client is shown
            const selected_client = this.handle.client_info().current_client();
            const conversation = selected_client ? this.handle.private_conversations().findConversation(selected_client) : undefined;

            const visibility = (selected_client && selected_client.clientId() !== this.handle.handle.getClientId()) ? "visible" : "hidden";
            if(this._button_conversation.style.visibility !== visibility)
                this._button_conversation.style.visibility = visibility;
            if(conversation) {
                this._button_conversation.innerText = tr("Open conversation");
            } else {
                this._button_conversation.innerText = tr("Start a conversation");
            }
        } else if(mode === InfoFrameMode.MUSIC_BOT) {
            //TODO?
        }
    }
}

export enum FrameContent {
    NONE,
    PRIVATE_CHAT,
    CHANNEL_CHAT,
    CLIENT_INFO,
    MUSIC_BOT
}

export class Frame {
    readonly handle: ConnectionHandler;
    private _info_frame: InfoFrame;
    private _html_tag: JQuery;
    private _container_info: JQuery;
    private _container_chat: JQuery;
    private _content_type: FrameContent;

    private _client_info: ClientInfo;
    private _music_info: MusicInfo;
    private _channel_conversations: ConversationManager;
    private _private_conversations: PrivateConversationManager;

    constructor(handle: ConnectionHandler) {
        this.handle = handle;

        this._content_type = FrameContent.NONE;
        this._info_frame = new InfoFrame(this);
        this._private_conversations = new PrivateConversationManager(handle);
        this._channel_conversations = new ConversationManager(handle);
        this._client_info = new ClientInfo(this);
        this._music_info = new MusicInfo(this);

        this._build_html_tag();
        this.show_channel_conversations();
        this.info_frame().update_chat_counter();
    }

    html_tag() : JQuery { return this._html_tag; }
    info_frame() : InfoFrame { return this._info_frame; }

    content_type() : FrameContent { return this._content_type; }

    destroy() {
        this._html_tag && this._html_tag.remove();
        this._html_tag = undefined;

        this._info_frame && this._info_frame.destroy();
        this._info_frame = undefined;

        this._client_info && this._client_info.destroy();
        this._client_info = undefined;

        this._music_info && this._music_info.destroy();
        this._music_info = undefined;

        this._private_conversations && this._private_conversations.destroy();
        this._private_conversations = undefined;

        this._channel_conversations && this._channel_conversations.destroy();
        this._channel_conversations = undefined;

        this._container_info && this._container_info.remove();
        this._container_info = undefined;

        this._container_chat && this._container_chat.remove();
        this._container_chat = undefined;
    }

    private _build_html_tag() {
        this._html_tag = $("#tmpl_frame_chat").renderTag();
        this._container_info = this._html_tag.find(".container-info");
        this._container_chat = this._html_tag.find(".container-chat");

        this._info_frame.html_tag().appendTo(this._container_info);
    }


    private_conversations() : PrivateConversationManager {
        return this._private_conversations;
    }

    channel_conversations() : ConversationManager {
        return this._channel_conversations;
    }

    client_info() : ClientInfo {
        return this._client_info;
    }

    music_info() : MusicInfo {
        return this._music_info;
    }

    private _clear() {
        this._content_type = FrameContent.NONE;
        this._container_chat.children().detach();
    }

    show_private_conversations() {
        if(this._content_type === FrameContent.PRIVATE_CHAT)
            return;

        this._clear();
        this._content_type = FrameContent.PRIVATE_CHAT;
        this._container_chat.append(this._private_conversations.htmlTag);
        this._private_conversations.handlePanelShow();
        this._info_frame.set_mode(InfoFrameMode.PRIVATE_CHAT);
    }

    show_channel_conversations() {
        if(this._content_type === FrameContent.CHANNEL_CHAT)
            return;

        this._clear();
        this._content_type = FrameContent.CHANNEL_CHAT;
        this._container_chat.append(this._channel_conversations.htmlTag);
        this._channel_conversations.handlePanelShow();

        this._info_frame.set_mode(InfoFrameMode.CHANNEL_CHAT);
    }

    show_client_info(client: ClientEntry) {
        this._client_info.set_current_client(client);
        this._info_frame.set_mode(InfoFrameMode.CLIENT_INFO); /* specially needs an update here to update the conversation button */

        if(this._content_type === FrameContent.CLIENT_INFO)
            return;

        this._client_info.previous_frame_content = this._content_type;
        this._clear();
        this._content_type = FrameContent.CLIENT_INFO;
        this._container_chat.append(this._client_info.html_tag());
    }

    show_music_player(client: MusicClientEntry) {
        this._music_info.set_current_bot(client);

        if(this._content_type === FrameContent.MUSIC_BOT)
            return;

        this._info_frame.set_mode(InfoFrameMode.MUSIC_BOT);
        this._music_info.previous_frame_content = this._content_type;
        this._clear();
        this._content_type = FrameContent.MUSIC_BOT;
        this._container_chat.append(this._music_info.html_tag());
    }

    set_content(type: FrameContent) {
        if(this._content_type === type)
            return;

        if(type === FrameContent.CHANNEL_CHAT)
            this.show_channel_conversations();
        else if(type === FrameContent.PRIVATE_CHAT)
            this.show_private_conversations();
        else {
            this._clear();
            this._content_type = FrameContent.NONE;
            this._info_frame.set_mode(InfoFrameMode.NONE);
        }
    }
}