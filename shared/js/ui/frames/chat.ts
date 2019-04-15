enum ChatType {
    GENERAL,
    SERVER,
    CHANNEL,
    CLIENT
}

namespace MessageHelper {
    export function htmlEscape(message: string) : string[] {
        const div = document.createElement('div');
        div.innerText = message;
        message =  div.innerHTML;
        return message.replace(/ /g, '&nbsp;').split(/<br>/);
    }

    export function formatElement(object: any, escape_html: boolean = true) : JQuery[] {
        if($.isArray(object)) {
            let result = [];
            for(let element of object)
                result.push(...formatElement(element, escape_html));
            return result;
        } else if(typeof(object) == "string") {
            if(object.length == 0) return [];

            return escape_html ?
                htmlEscape(object).map((entry, idx, array) => $.spawn("a").css("display", (idx == 0 || idx + 1 == array.length ? "inline" : "") + "block").html(entry == "" && idx != 0 ? "&nbsp;" : entry)) :
                [$.spawn("div").css("display", "inline-block").html(object)];
        } else if(typeof(object) === "object") {
            if(object instanceof $)
                return [object as any];
            return formatElement("<unknwon object>");
        } else if(typeof(object) === "function") return formatElement(object(), escape_html);
        else if(typeof(object) === "undefined") return formatElement("<undefined>");
        else if(typeof(object) === "number") return [$.spawn("a").text(object)];
        return formatElement("<unknown object type " + typeof object + ">");
    }

    export function formatMessage(pattern: string, ...objects: any[]) : JQuery[] {
        let begin = 0, found = 0;

        let result: JQuery[] = [];
        do {
            found = pattern.indexOf('{', found);
            if(found == -1 || pattern.length <= found + 1) {
                result.push(...formatElement(pattern.substr(begin)));
                break;
            }

            if(found > 0 && pattern[found - 1] == '\\') {
                //TODO remove the escape!
                found++;
                continue;
            }

            result.push(...formatElement(pattern.substr(begin, found - begin))); //Append the text

            let offset = 0;
            if(pattern[found + 1] == ':') {
                offset++; /* the beginning : */
                while (pattern[found + 1 + offset] != ':') offset++;
                const tag = pattern.substr(found + 2, offset - 1);

                offset++; /* the ending : */
                if(pattern[found + offset + 1] != '}') {
                    found++;
                    continue;
                }

                result.push($.spawn(tag as any));
            } else {
                let number;
                while ("0123456789".includes(pattern[found + 1 + offset])) offset++;
                number = parseInt(offset > 0 ? pattern.substr(found + 1, offset) : "0");
                if(pattern[found + offset + 1] != '}') {
                    found++;
                    continue;
                }

                if(objects.length < number)
                    log.warn(LogCategory.GENERAL, tr("Message to format contains invalid index (%o)"), number);

                result.push(...formatElement(objects[number]));
            }

            found = found + 1 + offset;
            begin = found + 1;
        } while(found++);

        return result;
    }

    export function bbcode_chat(message: string) : JQuery[] {
        let result = XBBCODE.process({
            text: message,
            escapeHtml: true,
            addInLineBreaks: false,

            /* TODO make this configurable and allow IMG */
            tag_whitelist: [
                "b",
                "i",
                "u",
                "color",
                "url"
            ]
        });

        if(result.error) {
            log.error(LogCategory.GENERAL, tr("BBCode parse error: %o"), result.errorQueue);
            return formatElement(message);
        }

        return result.html.split("\n").map((entry, idx, array) => $.spawn("a").css("display", (idx == 0 ? "inline" : "") + "block").html(entry == "" && idx != 0 ? "&nbsp;" : entry));
    }
}

class ChatMessage {
    date: Date;
    message: JQuery[];
    private _html_tag: JQuery<HTMLElement>;

    constructor(message: JQuery[]) {
        this.date = new Date();
        this.message = message;
    }

    private num(num: number) : string {
        let str = num.toString();
        while(str.length < 2) str = '0' + str;
        return str;
    }

    get html_tag() {
        if(this._html_tag) return this._html_tag;

        let tag = $.spawn("div");
        tag.addClass("message");

        let dateTag = $.spawn("div");
        dateTag.text("<" + this.num(this.date.getUTCHours()) + ":" + this.num(this.date.getUTCMinutes()) + ":" + this.num(this.date.getUTCSeconds()) + "> ");
        dateTag.css("margin-right", "4px");
        dateTag.css("color", "dodgerblue");

        this._html_tag = tag;
        tag.append(dateTag);
        this.message.forEach(e => e.appendTo(tag));
        return tag;
    }
}

class ChatEntry {
    readonly handle: ChatBox;
    type: ChatType;
    key: string;
    history: ChatMessage[] = [];
    send_history: string[] = [];

    owner_unique_id?: string;

    private _name: string;
    private _html_tag: any;

    private _flag_closeable: boolean = true;
    private _flag_unread : boolean = false;
    private _flag_offline: boolean = false;

    onMessageSend: (text: string) => void;
    onClose: () => boolean = () => true;

    constructor(handle, type : ChatType, key) {
        this.handle = handle;
        this.type = type;
        this.key = key;
        this._name = key;
    }

    appendError(message: string, ...args) {
        let entries = MessageHelper.formatMessage(message, ...args);
        entries.forEach(e => e.css("color", "red"));
        this.pushChatMessage(new ChatMessage(entries));
    }

    appendMessage(message : string, fmt: boolean = true, ...args) {
       this.pushChatMessage(new ChatMessage(MessageHelper.formatMessage(message, ...args)));
    }

    private pushChatMessage(entry: ChatMessage) {
        this.history.push(entry);
        while(this.history.length > 100) {
            let elm = this.history.pop_front();
            elm.html_tag.animate({opacity: 0}, 200, function () {
                $(this).detach();
            });
        }
        if(this.handle.activeChat === this) {
            let box = $(this.handle.htmlTag).find(".messages");
            let mbox = $(this.handle.htmlTag).find(".message_box");
            let bottom : boolean = box.scrollTop() + box.height() + 1 >= mbox.height();
            mbox.append(entry.html_tag);
            entry.html_tag.css("opacity", "0").animate({opacity: 1}, 100);
            if(bottom) box.scrollTop(mbox.height());
        } else {
            this.flag_unread = true;
        }
    }

    displayHistory() {
        this.flag_unread = false;
        let box = this.handle.htmlTag.find(".messages");
        let mbox = box.find(".message_box").detach(); /* detach the message box to improve performance */
        mbox.empty();

        for(let e of this.history) {
            mbox.append(e.html_tag);
            /* TODO Is this really totally useless?
                    Because its at least a performance bottleneck because is(...) recalculates the page style
                if(e.htmlTag.is(":hidden"))
                    e.htmlTag.show();
             */
        }

        mbox.appendTo(box);
        box.scrollTop(mbox.height());
    }

    get html_tag() {
        if(this._html_tag)
            return this._html_tag;

        let tag = $.spawn("div");
        tag.addClass("chat");
        if(this._flag_unread)
            tag.addClass('unread');
        if(this._flag_offline)
            tag.addClass('offline');
        if(this._flag_closeable)
            tag.addClass('closeable');

        tag.append($.spawn("div").addClass("chat-type icon " + this.chat_icon()));
        tag.append($.spawn("a").addClass("name").text(this._name));

        let tag_close = $.spawn("div");
        tag_close.addClass("btn_close icon client-tab_close_button");
        if(!this._flag_closeable) tag_close.hide();
        tag.append(tag_close);

        tag.click(() => { this.handle.activeChat = this; });
        tag.on("contextmenu", (e) => {
            e.preventDefault();

            let actions: ContextMenuEntry[] = [];
            actions.push({
                type: MenuEntryType.ENTRY,
                icon: "",
                name: tr("Clear"),
                callback: () => {
                    this.history = [];
                    this.displayHistory();
                }
            });
            if(this.flag_closeable) {
                actions.push({
                    type: MenuEntryType.ENTRY,
                    icon: "client-tab_close_button",
                    name: tr("Close"),
                    callback: () => this.handle.deleteChat(this)
                });
            }

            actions.push({
                type: MenuEntryType.ENTRY,
                icon: "client-tab_close_button",
                name: tr("Close all private tabs"),
                callback: () => {
                    //TODO Implement this?
                },
                visible: false
            });
            spawn_context_menu(e.pageX, e.pageY, ...actions);
        });

        tag_close.click(() => {
            if($.isFunction(this.onClose) && !this.onClose())
                return;

            this.handle.deleteChat(this);
        });

        return this._html_tag = tag;
    }

    focus() {
        this.handle.activeChat = this;
        this.handle.htmlTag.find(".input_box").focus();
    }

    set name(newName : string) {
        this._name = newName;
        this.html_tag.find(".name").text(this._name);
    }

    set flag_closeable(flag : boolean) {
        if(this._flag_closeable == flag) return;

        this._flag_closeable = flag;

        this.html_tag.toggleClass('closeable', flag);
    }

    set flag_unread(flag : boolean) {
        if(this._flag_unread == flag) return;
        this._flag_unread = flag;
        this.html_tag.find(".chat-type").attr("class", "chat-type icon " + this.chat_icon());
        this.html_tag.toggleClass('unread', flag);
    }

    get flag_offline() { return this._flag_offline; }

    set flag_offline(flag: boolean) {
        if(flag == this._flag_offline)
            return;

        this._flag_offline = flag;
        this.html_tag.toggleClass('offline', flag);
    }

    private chat_icon() : string {
        if(this._flag_unread) {
            switch (this.type) {
                case ChatType.CLIENT:
                    return "client-new_chat";
            }
        }
        switch (this.type) {
            case ChatType.SERVER:
                return "client-server_log";
            case ChatType.CHANNEL:
                return "client-channel_chat";
            case ChatType.CLIENT:
                return "client-player_chat";
            case ChatType.GENERAL:
                return "client-channel_chat";
        }
        return "";
    }
}


class ChatBox {
    //https://regex101.com/r/YQbfcX/2
    //static readonly URL_REGEX = /^(?<hostname>([a-zA-Z0-9-]+\.)+[a-zA-Z0-9-]{2,63})(?:\/(?<path>(?:[^\s?]+)?)(?:\?(?<query>\S+))?)?$/gm;
    static readonly URL_REGEX = /^(([a-zA-Z0-9-]+\.)+[a-zA-Z0-9-]{2,63})(?:\/((?:[^\s?]+)?)(?:\?(\S+))?)?$/gm;

    readonly connection_handler: ConnectionHandler;
    htmlTag: JQuery;
    chats: ChatEntry[];
    private _activeChat: ChatEntry;
    private _history_index: number = 0;

    private _button_send: JQuery;
    private _input_message: JQuery;

    constructor(connection_handler: ConnectionHandler) {
        this.connection_handler = connection_handler;
    }

    initialize() {
        this.htmlTag = $("#tmpl_frame_chat").renderTag();
        this._button_send = this.htmlTag.find(".button-send");
        this._input_message = this.htmlTag.find(".input-message");

        this._button_send.click(this.onSend.bind(this));
        this._input_message.on('keypress',event => {
            if(!event.shiftKey) {
                console.log(event.keyCode);
                if(event.keyCode == JQuery.Key.Enter) {
                    this.onSend();
                    return false;
                } else if(event.keyCode == JQuery.Key.ArrowUp || event.keyCode == JQuery.Key.ArrowDown) {
                    if(this._activeChat) {
                        const message = (this._input_message.val() || "").toString();
                        const history = this._activeChat.send_history;

                        if(history.length == 0 || this._history_index > history.length)
                            return;

                        if(message.replace(/[ \n\r\t]/, "").length == 0 || this._history_index == 0 || (this._history_index > 0 && message == this._activeChat.send_history[this._history_index - 1])) {
                            if(event.keyCode == JQuery.Key.ArrowUp)
                                this._history_index = Math.min(history.length, this._history_index + 1);
                            else
                                this._history_index = Math.max(0, this._history_index - 1);

                            if(this._history_index > 0)
                                this._input_message.val(this._activeChat.send_history[this._history_index - 1]);
                            else
                                this._input_message.val("");
                        }
                    }
                }
            }
        }).on('input', (event) => {
            let text = $(event.target).val().toString();
            if(this.testMessage(text))
                this._button_send.removeAttr("disabled");
            else
                this._button_send.attr("disabled", "true");
        }).trigger("input");

        this.chats = [];
        this._activeChat = undefined;

        this.createChat("chat_server", ChatType.SERVER).onMessageSend = (text: string) => {
            if(!this.connection_handler.serverConnection) {
                this.serverChat().appendError(tr("Could not send chant message (Not connected)"));
                return;
            }

            this.connection_handler.serverConnection.command_helper.sendMessage(text, ChatType.SERVER).catch(error => {
                if(error instanceof CommandResult)
                    return;

                this.serverChat().appendMessage(tr("Failed to send text message."));
                log.error(LogCategory.GENERAL, tr("Failed to send server text message: %o"), error);
            });
        };
        this.serverChat().name = tr("Server chat");
        this.serverChat().flag_closeable = false;

        this.createChat("chat_channel", ChatType.CHANNEL).onMessageSend = (text: string) => {
            if(!this.connection_handler.serverConnection) {
                this.channelChat().appendError(tr("Could not send chant message (Not connected)"));
                return;
            }

            this.connection_handler.serverConnection.command_helper.sendMessage(text, ChatType.CHANNEL, this.connection_handler.getClient().currentChannel()).catch(error => {
                this.channelChat().appendMessage(tr("Failed to send text message."));
                log.error(LogCategory.GENERAL, tr("Failed to send channel text message: %o"), error);
            });
        };
        this.channelChat().name = tr("Channel chat");
        this.channelChat().flag_closeable = false;

        this.connection_handler.permissions.initializedListener.push(flag => {
            if(flag) this.activeChat0(this._activeChat);
        });
    }

    createChat(key, type : ChatType = ChatType.CLIENT) : ChatEntry {
        let chat = new ChatEntry(this, type, key);
        this.chats.push(chat);
        this.htmlTag.find(".chats").append(chat.html_tag);
        if(!this._activeChat) this.activeChat = chat;
        return chat;
    }

    open_chats() : ChatEntry[] {
        return this.chats;
    }

    findChat(key : string) : ChatEntry {
        for(let e of this.chats)
            if(e.key == key) return e;
        return undefined;
    }

    deleteChat(chat : ChatEntry) {
        this.chats.remove(chat);
        chat.html_tag.detach();
        if(this._activeChat === chat) {
            if(this.chats.length > 0)
                this.activeChat = this.chats.last();
            else
                this.activeChat = undefined;
        }
    }


    onSend() {
        let text = this._input_message.val().toString();
        if(!this.testMessage(text)) return;
        this._input_message.val("");
        this._input_message.trigger("input");

        /* preprocessing text */
        const words = text.split(/[ \n]/);
        for(let index = 0; index < words.length; index++) {
            const flag_escaped = words[index].startsWith('!');
            const unescaped = flag_escaped ? words[index].substr(1) : words[index];

            _try:
            try {
                const url = new URL(unescaped);
                log.debug(LogCategory.GENERAL, tr("Chat message contains URL: %o"), url);
                if(url.protocol !== 'http:' && url.protocol !== 'https:')
                    break _try;
                if(flag_escaped)
                    words[index] = unescaped;
                else {
                    text = undefined;
                    words[index] = "[url=" + url.toString() + "]" + url.toString() + "[/url]";
                }
            } catch(e) { /* word isn't an url */ }

            if(unescaped.match(ChatBox.URL_REGEX)) {
                if(flag_escaped)
                    words[index] = unescaped;
                else {
                    text = undefined;
                    words[index] = "[url=" + unescaped + "]" + unescaped + "[/url]";
                }
            }
        }

        text = text || words.join(" ");
        if(this._activeChat.send_history.length == 0 || this._activeChat.send_history[0] != text)
            this._activeChat.send_history.unshift(text);
        while(this._activeChat.send_history.length > 100)
            this._activeChat.send_history.pop();
        this._history_index = 0;
        if(this._activeChat && $.isFunction(this._activeChat.onMessageSend))
            this._activeChat.onMessageSend(text);
    }

    set activeChat(chat : ChatEntry) {
        if(this.chats.indexOf(chat) === -1) return;
        if(this._activeChat == chat) return;
        this.activeChat0(chat);
    }

    private activeChat0(chat: ChatEntry) {
        this._activeChat = chat;
        for(let e of this.chats)
            e.html_tag.removeClass("active");

        let disable_input = !chat;
        if(this._activeChat) {
            this._activeChat.html_tag.addClass("active");
            this._activeChat.displayHistory();

            if(!disable_input && this.connection_handler && this.connection_handler.permissions && this.connection_handler.permissions.initialized())
                switch (this._activeChat.type) {
                    case ChatType.CLIENT:
                        disable_input = false;
                        break;
                    case ChatType.SERVER:
                        disable_input = !this.connection_handler.permissions.neededPermission(PermissionType.B_CLIENT_SERVER_TEXTMESSAGE_SEND).granted(1);
                        break;
                    case ChatType.CHANNEL:
                        disable_input = !this.connection_handler.permissions.neededPermission(PermissionType.B_CLIENT_CHANNEL_TEXTMESSAGE_SEND).granted(1);
                        break;
                }
        }
        this._input_message.prop("disabled", disable_input);
    }

    get activeChat() : ChatEntry { return this._activeChat; }

    channelChat() : ChatEntry {
        return this.findChat("chat_channel");
    }

    serverChat() {
        return this.findChat("chat_server");
    }

    focus(){
        this._input_message.focus();
    }

    private testMessage(message: string) : boolean {
        message = message
            .replace(/ /gi, "")
            .replace(/<br>/gi, "")
            .replace(/\n/gi, "")
            .replace(/<br\/>/gi, "");
        return message.length > 0;
    }
}