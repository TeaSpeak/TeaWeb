import Key = JQuery.Key;

enum ChatType {
    GENERAL,
    SERVER,
    CHANNEL,
    CLIENT
}

class ChatMessage {
    date: Date;
    message: string;
    private _htmlTag: JQuery<HTMLElement>;

    constructor(message) {
        this.date = new Date();
        this.message = message;
    }

    private num(num: number) : string {
        let str = num.toString();
        while(str.length < 2) str = '0' + str;
        return str;
    }

    get htmlTag() {
        if(this._htmlTag) return this._htmlTag;

        let tag = $.spawn("div");
        tag.addClass("message");

        let dateTag = $.spawn("div");
        dateTag.text("<" + this.num(this.date.getUTCHours()) + ":" + this.num(this.date.getUTCMinutes()) + ":" + this.num(this.date.getUTCSeconds()) + "> ");
        dateTag.css("margin-right", "4px");
        dateTag.css("color", "dodgerblue");

        let messageTag = $.spawn("div");
        messageTag.html(this.message);
        messageTag.css("color", "blue");

        this._htmlTag = tag;
        tag.append(dateTag);
        tag.append(messageTag);
        tag.hide();
        return tag;
    }

    static formatMessage(message: string) : string {
        /*
        message = message
                    .replace(/ /g, '&nbsp;')
                    .replace(/\n/g, "<br/>");
        */
        const div = document.createElement('div');
        div.innerText = message;
        message =  div.innerHTML;
        console.log(message + "->" + div.innerHTML);
        return message;
    }
}

class ChatEntry {
    handle: ChatBox;
    type: ChatType;
    key: string;
    history: ChatMessage[];

    private _name: string;
    private _htmlTag: any;
    private _closeable: boolean;
    private _unread : boolean;
    onMessageSend: (text: string) => void;
    onClose: () => boolean;

    constructor(handle, type : ChatType, key) {
        this.handle = handle;
        this.type = type;
        this.key = key;
        this._name = key;
        this.history = [];

        this.onClose = function () { return true; }
    }

    static tagify(message: string, ...args) {

    }

    appendError(message: string, ...args) {
        this.appendMessage("<a style='color: red'>{0}</a>".format(ChatMessage.formatMessage(message).format(...args)), false);
    }

    appendMessage(message : string, fmt: boolean = true, ...args) {
        let parms: any[] = [];
        for(let index = 2; index < arguments.length; index++) {
            if(typeof arguments[index] == "string") arguments[index] = ChatMessage.formatMessage(arguments[index]);
            else if(arguments[index] instanceof jQuery) arguments[index] = arguments[index].html();
            else {
                console.error("Invalid type " + typeof arguments[index] + "|" + arguments[index].prototype);
                arguments[index] = arguments[index].toString();
            }
            parms.push(arguments[index]);
        }
        let msg : string = fmt ? ChatMessage.formatMessage(message) : message;
        msg = msg.format(parms);
        let elm = new ChatMessage(msg);
        this.history.push(elm);
        while(this.history.length > 100) {
            let elm = this.history.pop_front();
            elm.htmlTag.animate({opacity: 0}, 200, function () {
                $(this).detach();
            });
        }
        if(this.handle.activeChat === this) {
            let box = $(this.handle.htmlTag).find(".messages");
            let mbox = $(this.handle.htmlTag).find(".message_box");
            let bottom : boolean = box.scrollTop() + box.height() + 1 >= mbox.height();
            mbox.append(elm.htmlTag);
            elm.htmlTag.show().css("opacity", "0").animate({opacity: 1}, 100);
            if(bottom) box.scrollTop(mbox.height());
        } else {
            this.unread = true;
        }
    }

    displayHistory() {
        this.unread = false;
        let box = $(this.handle.htmlTag).find(".messages");
        let mbox = $(this.handle.htmlTag).find(".message_box");
        mbox.empty();

        for(let e of this.history) {
            mbox.append(e.htmlTag);
            if(e.htmlTag.is(":hidden")) e.htmlTag.show();
        }

        box.scrollTop(mbox.height());
    }

    get htmlTag() {
        if(this._htmlTag) return this._htmlTag;

        let tag = $.spawn("div");
        tag.addClass("chat");

        tag.append("<div class=\"chatIcon icon clicon " + this.chatIcon() + "\"></div>");
        tag.append("<a class='name'>" + this._name + "</a>");

        let closeTag = $.spawn("div");
        closeTag.addClass("btn_close icon client-tab_close_button");
        if(!this._closeable) closeTag.hide();
        tag.append(closeTag);

        const _this = this;
        tag.click(function () {
            _this.handle.activeChat = _this;
        });
        tag.on("contextmenu", function (e) {
            e.preventDefault();

            let actions = [];
            actions.push({
                type: MenuEntryType.ENTRY,
                icon: "",
                name: "Clear",
                callback: () => {
                    _this.history = [];
                    _this.displayHistory();
                }
            });
            if(_this.closeable) {
                actions.push({
                    type: MenuEntryType.ENTRY,
                    icon: "client-tab_close_button",
                    name: "Close",
                    callback: () => {
                        chat.deleteChat(_this);
                    }
                });
            }

            actions.push({
                type: MenuEntryType.ENTRY,
                icon: "client-tab_close_button",
                name: "Close all private tabs",
                callback: () => {
                    //TODO Implement this?
                }
            });
            spawnMenu(e.pageX, e.pageY, ...actions);
        });

        closeTag.click(function () {
            if($.isFunction(_this.onClose) && !_this.onClose()) return;
            _this.handle.deleteChat(_this);
        });

        this._htmlTag = tag;
        return tag;
    }

    set name(newName : string) {
        console.log("Change name!");
        this._name = newName;
        this.htmlTag.find(".name").text(this._name);
    }

    set closeable(flag : boolean) {
        if(this._closeable == flag) return;

        this._closeable = flag;
        console.log("Set closeable: " + this._closeable);
        if(flag) this.htmlTag.find(".btn_close").show();
        else this.htmlTag.find(".btn_close").hide();
    }

    set unread(flag : boolean) {
        if(this._unread == flag) return;
        this._unread = flag;
        this.htmlTag.find(".chatIcon").attr("class", "chatIcon icon clicon " + this.chatIcon());
        if(flag) {
            this.htmlTag.find(".name").css("color", "blue");
        } else {
            this.htmlTag.find(".name").css("color", "black");
        }
    }

    private chatIcon() : string {
        if(this._unread) {
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
    htmlTag: any;
    chats: ChatEntry[];
    private _activeChat: ChatEntry;

    constructor(htmlTag) {
        this.htmlTag = htmlTag;

        const _this = this;
        $(this.htmlTag).find(".input button").click(this.onSend.bind(this));
        let chatBox = $(this.htmlTag).find(".input_box");
        chatBox.keypress(function (e) {
            if(e.keyCode == Key.Enter && !e.shiftKey) {
                _this.onSend();
                return false;
            }
        });
        chatBox.on('input', function (e) {
            let text = $(this).val().toString();
            if(_this.testMessage(text))
                $(_this.htmlTag).find(".input button").removeAttr("disabled");
            else
                $(_this.htmlTag).find(".input button").attr("disabled", "true");
        });
        chatBox.trigger("input");

        this.chats = [];
        this._activeChat = undefined;

        this.createChat("chat_server", ChatType.SERVER).onMessageSend = (text: string) => {
            if(!globalClient.serverConnection) {
                chat.serverChat().appendError("Could not send chant message (Not connected)");
                return;
            }
            globalClient.serverConnection.sendMessage(text, ChatType.SERVER);
        };
        this.createChat("chat_channel", ChatType.CHANNEL).onMessageSend = (text: string) => {
            if(!globalClient.serverConnection) {
                chat.channelChat().appendError("Could not send chant message (Not connected)");
                return;
            }

            globalClient.serverConnection.sendMessage(text, ChatType.CHANNEL, globalClient.getClient().currentChannel());
        };
    }

    createChat(key, type : ChatType = ChatType.CLIENT) : ChatEntry {
        let chat = new ChatEntry(this, type, key);
        this.chats.push(chat);
        $(this.htmlTag).find(".chats").append(chat.htmlTag);
        if(!this._activeChat) this.activeChat = chat;
        return chat;
    }

    findChat(key : string) : ChatEntry {
        for(let e of this.chats)
            if(e.key == key) return e;
        return undefined;
    }

    deleteChat(chat : ChatEntry) {
        this.chats.remove(chat);
        chat.htmlTag.detach();
        if(this._activeChat === chat) {
            if(this.chats.length > 0)
                this.activeChat = this.chats.last();
            else
                this.activeChat = undefined;
        }
    }


    onSend() {
        let textBox = $(this.htmlTag).find(".input_box");
        let text = textBox.val().toString();
        if(!this.testMessage(text)) return;
        textBox.val("");
        $(this.htmlTag).find(".input_box").trigger("input");

        if(this._activeChat && $.isFunction(this._activeChat.onMessageSend))
            this._activeChat.onMessageSend(text);
    }

    set activeChat(chat : ChatEntry) {
        if(this.chats.indexOf(chat) === -1) return;
        if(this._activeChat == chat) return;

        this._activeChat = chat;
        for(let e of this.chats)
            e.htmlTag.removeClass("active");
        if(this._activeChat) {
            this._activeChat.htmlTag.addClass("active");
            this._activeChat.displayHistory();
        }
    }

    get activeChat(){ return this._activeChat; }

    channelChat() : ChatEntry {
        return this.findChat("chat_channel");
    }

    serverChat() {
        return this.findChat("chat_server");
    }

    focus(){
        $(this.htmlTag).find(".input_box").focus();
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