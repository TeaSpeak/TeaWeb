/* the bar on the right with the chats (Channel & Client) */
namespace chat {
    export class InfoFrame {
        private readonly handle: Frame;
        private _html_tag: JQuery;

        constructor(handle: Frame) {
            this.handle = handle;
            this._build_html_tag();
            this.update_channel_talk();
        }

        html_tag() : JQuery { return this._html_tag; }

        private _build_html_tag() {
            this._html_tag = $("#tmpl_frame_chat_info").renderTag();
        }

        update_channel_talk() {
            const client = this.handle.handle.connected ? this.handle.handle.getClient() : undefined;
            const channel = client ? client.currentChannel() : undefined;

            const html_tag =  this._html_tag.find(".value-voice-channel");
            const html_limit_tag = this._html_tag.find(".value-voice-limit");
            html_limit_tag.text("");
            html_tag.children().detach();

            if(channel) {
                if(channel.properties.channel_icon_id != 0)
                    client.handle.fileManager.icons.generateTag(channel.properties.channel_icon_id).appendTo(html_tag);
                $.spawn("div").text(channel.channelName()).appendTo(html_tag);

                //channel.properties.channel_maxclients
                let channel_limit = tr("Unlimited");
                if(!channel.properties.channel_flag_maxclients_unlimited)
                    channel_limit = "" + channel.properties.channel_maxclients;
                else if(!channel.properties.channel_flag_maxfamilyclients_unlimited) {
                    if(channel.properties.channel_maxfamilyclients >= 0)
                        channel_limit = "" + channel.properties.channel_maxfamilyclients;
                }
                html_limit_tag.text(channel.clients(false).length + " / " + channel_limit);
            } else {
                $.spawn("div").text("Not connected").appendTo(html_tag);
            }
        }

        update_chat_counter() {
            const count = this.handle.private_conversations().conversations().filter(e => e.is_unread()).length;
            const count_container = this._html_tag.find(".container-indicator");
            const count_tag = count_container.find(".chat-counter");
            count_container.toggle(count > 0);
            count_tag.text(count);
        }
    }

    export enum ConversationState {
        ACTIVE,
        CLOSED,
        OFFLINE
    }

    class ChatBox {
        private _html_tag: JQuery;
        private _html_input: JQuery<HTMLTextAreaElement>;
        private __callback_text_changed;
        private __callback_key_down;

        constructor() {
            this.__callback_key_down = this._callback_key_down.bind(this);
            this.__callback_text_changed = this._callback_text_changed.bind(this);

            this._build_html_tag();
            this._initialize_listener();
        }

        html_tag() : JQuery {
            return this._html_tag;
        }

        private _initialize_listener() {
            this._html_input.on("cut paste drop keydown", (event) => setTimeout(() => this.__callback_text_changed(event), 0));
            this._html_input.on("change", this.__callback_text_changed);
            this._html_input.on("keydown", this.__callback_key_down);
        }

        private _build_html_tag() {
            this._html_tag = $("#tmpl_frame_chat_chatbox").renderTag({
                emojy_support: true
            });
            this._html_input = this._html_tag.find("textarea") as any;
        }

        private _callback_text_changed(event) {
            if(event && event.isDefaultPrevented())
                return;

            /* Auto resize */
            const text = this._html_input[0];
            text.style.height = "1em";
            text.style.height = text.scrollHeight + 'px';
        }

        private _callback_key_down(event: KeyboardEvent) {
            if(event.shiftKey)
                return;

            if(event.key.toLowerCase() === "enter") {
                event.preventDefault();

                //TODO Notify text!
                console.log("Sending text: %s", this._html_input.val());
                this._html_input.val(undefined);
                setTimeout(() => this.__callback_text_changed());
            }
        }
    }

    export class PrivateConveration {
        readonly handle: PrivateConverations;
        private _flag_unread: boolean;
        private _html_entry_tag: JQuery;
        private _html_messages_tag: JQuery; /* TODO: Consider to create them every time on the fly? */
        private _message_history: {
            message: string;
            sender: "self" | "partner";
        }[] = [];

        client_unique_id: string;
        client_id: string;
        client_name: string;

        state: ConversationState = ConversationState.ACTIVE;


        constructor(handle: PrivateConverations, client_unique_id: string, client_name: string) {
            this.handle = handle;
            this.client_name = client_name;
            this.client_unique_id = client_unique_id;

            this._flag_unread = false;
            this._build_entry_tag();
            this.set_unread_flag(false);
        }

        entry_tag() : JQuery {
            return this._html_entry_tag;
        }

        append_message(message: string, sender: "self" | "partner") {
            this._message_history.push({
                message: message,
                sender: sender
            });
        }

        private _build_entry_tag() {
            this._html_entry_tag = $("#tmpl_frame_chat_private_entry").renderTag({
                client_name: this.client_name
            });
            this._html_entry_tag.on('click', event => this.handle.set_selected_conversation(this));
        }

        set_client_name(name: string) {
            if(this.client_name === name)
                return;
            this.client_name = name;
            this._html_entry_tag.find(".client-name").text(name);
        }

        set_unread_flag(flag: boolean, update_chat_counter?: boolean) {
            if(flag === this._flag_unread)
                return;
            this._flag_unread = flag;
            this._html_entry_tag.toggleClass("unread", flag);
            if(typeof(update_chat_counter) !== "boolean" || update_chat_counter)
                this.handle.handle.info_frame().update_chat_counter();
        }

        is_unread() : boolean { return this._flag_unread; }
    }

    export class PrivateConverations {
        readonly handle: Frame;
        private _chat_box: ChatBox;
        private _html_tag: JQuery;

        private _container_conversation: JQuery;
        private _container_conversation_messages: JQuery;
        private _container_conversation_list: JQuery;

        private _html_no_chats: JQuery;
        private _conversations: PrivateConveration[] = [];

        private _current_conversation: PrivateConveration = undefined;

        constructor(handle: Frame) {
            this.handle = handle;
            this._chat_box = new ChatBox();
            this._build_html_tag();
        }

        html_tag() : JQuery { return this._html_tag; }

        conversations() : PrivateConveration[] { return this._conversations; }
        create_conversation(client_uid: string, client_name: string) : PrivateConveration {
            const conv = new PrivateConveration(this, client_uid, client_name);
            this._conversations.push(conv);
            this._html_no_chats.hide();

            this._container_conversation_list.append(conv.entry_tag());
            return conv;
        }
        delete_conversation(conv: PrivateConveration) {
            if(!this._conversations.remove(conv))
                return;
            //TODO: May animate?
            conv.entry_tag().detach();
            this._html_no_chats.toggle(this._conversations.length == 0);
            if(conv === this._current_conversation)
                this.set_selected_conversation(undefined);
        }
        clear_conversations() {
            while(this._conversations.length > 0)
                this.delete_conversation(this._conversations[0]);
            this.handle.info_frame().update_chat_counter();
        }

        set_selected_conversation(conv: PrivateConveration | undefined) {
            if(conv === this._current_conversation)
                return;

            this._container_conversation_list.find(".selected").removeClass("selected");
            this._container_conversation_messages.children().detach();
            this._current_conversation = conv;
            if(!this._current_conversation)
                return;

            this._current_conversation.entry_tag().addClass("selected");
        }

        private _build_html_tag() {
            this._html_tag = $("#tmpl_frame_chat_private").renderTag().dividerfy();
            this._container_conversation = this._html_tag.find(".conversation");
            this._container_conversation_messages = this._container_conversation.find(".messages");
            this._container_conversation.find(".chatbox").append(this._chat_box.html_tag());

            this._container_conversation_list = this._html_tag.find(".conversation-list");
            this._html_no_chats = this._container_conversation_list.find(".no-chats");
        }
    }

    export class Frame {
        readonly handle: ConnectionHandler;
        private _info_frame: InfoFrame;
        private _html_tag: JQuery;
        private _container_info: JQuery;
        private _container_chat: JQuery;

        private _conversations: PrivateConverations;

        constructor(handle: ConnectionHandler) {
            this.handle = handle;

            this._info_frame = new InfoFrame(this);
            this._conversations = new PrivateConverations(this);

            this._build_html_tag();
            this.show_private_conversations();
        }

        html_tag() : JQuery { return this._html_tag; }
        info_frame() : InfoFrame { return this._info_frame; }

        private _build_html_tag() {
            this._html_tag = $("#tmpl_frame_chat").renderTag();
            this._container_info =this._html_tag.find(".container-info");
            this._container_chat =this._html_tag.find(".container-chat");

            this._info_frame.html_tag().appendTo(this._container_info);
        }


        private_conversations() : PrivateConverations {
            return this._conversations;
        }

        show_private_conversations() {
            this._container_chat.children().detach();
            this._container_chat.append(this._conversations.html_tag());
        }
    }
}