var ChatType;
(function (ChatType) {
    ChatType[ChatType["GENERAL"] = 0] = "GENERAL";
    ChatType[ChatType["SERVER"] = 1] = "SERVER";
    ChatType[ChatType["CHANNEL"] = 2] = "CHANNEL";
    ChatType[ChatType["CLIENT"] = 3] = "CLIENT";
})(ChatType || (ChatType = {}));
class ChatMessage {
    constructor(message) {
        this.date = new Date();
        this.message = message;
    }
    num(num) {
        let str = num.toString();
        while (str.length < 2)
            str = '0' + str;
        return str;
    }
    get htmlTag() {
        if (this._htmlTag)
            return this._htmlTag;
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
    static formatMessage(message) {
        /*
        message = message
                    .replace(/ /g, '&nbsp;')
                    .replace(/\n/g, "<br/>");
        */
        const div = document.createElement('div');
        div.innerText = message;
        message = div.innerHTML;
        console.log(message + "->" + div.innerHTML);
        return message;
    }
}
class ChatEntry {
    constructor(handle, type, key) {
        this.handle = handle;
        this.type = type;
        this.key = key;
        this._name = key;
        this.history = [];
        this.onClose = function () { return true; };
    }
    appendError(message, ...args) {
        this.appendMessage("<a style='color: red'>{0}</a>".format(ChatMessage.formatMessage(message).format(...args)), false);
    }
    appendMessage(message, fmt = true, ...args) {
        let parms = [];
        for (let index = 2; index < arguments.length; index++) {
            if (typeof arguments[index] == "string")
                arguments[index] = ChatMessage.formatMessage(arguments[index]);
            else if (arguments[index] instanceof jQuery)
                arguments[index] = arguments[index].html();
            else {
                console.error("Invalid type " + typeof arguments[index] + "|" + arguments[index].prototype);
                arguments[index] = arguments[index].toString();
            }
            parms.push(arguments[index]);
        }
        let msg = fmt ? ChatMessage.formatMessage(message) : message;
        msg = msg.format(parms);
        let elm = new ChatMessage(msg);
        this.history.push(elm);
        while (this.history.length > 100) {
            let elm = this.history.pop_front();
            elm.htmlTag.animate({ opacity: 0 }, 200, function () {
                $(this).detach();
            });
        }
        if (this.handle.activeChat === this) {
            let box = $(this.handle.htmlTag).find(".messages");
            let mbox = $(this.handle.htmlTag).find(".message_box");
            let bottom = box.scrollTop() + box.height() + 1 >= mbox.height();
            mbox.append(elm.htmlTag);
            elm.htmlTag.show().css("opacity", "0").animate({ opacity: 1 }, 100);
            if (bottom)
                box.scrollTop(mbox.height());
        }
        else {
            this.unread = true;
        }
    }
    displayHistory() {
        this.unread = false;
        let box = $(this.handle.htmlTag).find(".messages");
        let mbox = $(this.handle.htmlTag).find(".message_box");
        mbox.empty();
        for (let e of this.history) {
            mbox.append(e.htmlTag);
            if (e.htmlTag.is(":hidden"))
                e.htmlTag.show();
        }
        box.scrollTop(mbox.height());
    }
    get htmlTag() {
        if (this._htmlTag)
            return this._htmlTag;
        let tag = $.spawn("div");
        tag.addClass("chat");
        tag.append("<div class=\"chatIcon icon clicon " + this.chatIcon() + "\"></div>");
        tag.append("<a class='name'>" + this._name + "</a>");
        let closeTag = $.spawn("div");
        closeTag.addClass("btn_close icon client-tab_close_button");
        if (!this._closeable)
            closeTag.hide();
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
            if (_this.closeable) {
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
            if ($.isFunction(_this.onClose) && !_this.onClose())
                return;
            _this.handle.deleteChat(_this);
        });
        this._htmlTag = tag;
        return tag;
    }
    set name(newName) {
        console.log("Change name!");
        this._name = newName;
        this.htmlTag.find(".name").text(this._name);
    }
    set closeable(flag) {
        if (this._closeable == flag)
            return;
        this._closeable = flag;
        console.log("Set closeable: " + this._closeable);
        if (flag)
            this.htmlTag.find(".btn_close").show();
        else
            this.htmlTag.find(".btn_close").hide();
    }
    set unread(flag) {
        if (this._unread == flag)
            return;
        this._unread = flag;
        this.htmlTag.find(".chatIcon").attr("class", "chatIcon icon clicon " + this.chatIcon());
        if (flag) {
            this.htmlTag.find(".name").css("color", "blue");
        }
        else {
            this.htmlTag.find(".name").css("color", "black");
        }
    }
    chatIcon() {
        if (this._unread) {
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
    constructor(htmlTag) {
        this.htmlTag = htmlTag;
        this.htmlTag.find(".input button").click(this.onSend.bind(this));
        this.htmlTag.find(".input_box").keypress(event => {
            if (event.keyCode == 13 /* Enter */ && !event.shiftKey) {
                this.onSend();
                return false;
            }
        }).on('input', (event) => {
            let text = $(event.target).val().toString();
            if (this.testMessage(text))
                this.htmlTag.find(".input button").removeAttr("disabled");
            else
                this.htmlTag.find(".input button").attr("disabled", "true");
        }).trigger("input");
        this.chats = [];
        this._activeChat = undefined;
        this.createChat("chat_server", ChatType.SERVER).onMessageSend = (text) => {
            if (!globalClient.serverConnection) {
                chat.serverChat().appendError("Could not send chant message (Not connected)");
                return;
            }
            globalClient.serverConnection.sendMessage(text, ChatType.SERVER);
        };
        this.createChat("chat_channel", ChatType.CHANNEL).onMessageSend = (text) => {
            if (!globalClient.serverConnection) {
                chat.channelChat().appendError("Could not send chant message (Not connected)");
                return;
            }
            globalClient.serverConnection.sendMessage(text, ChatType.CHANNEL, globalClient.getClient().currentChannel());
        };
        globalClient.permissions.initializedListener.push(flag => {
            if (flag)
                this.activeChat0(this._activeChat);
        });
    }
    createChat(key, type = ChatType.CLIENT) {
        let chat = new ChatEntry(this, type, key);
        this.chats.push(chat);
        this.htmlTag.find(".chats").append(chat.htmlTag);
        if (!this._activeChat)
            this.activeChat = chat;
        return chat;
    }
    findChat(key) {
        for (let e of this.chats)
            if (e.key == key)
                return e;
        return undefined;
    }
    deleteChat(chat) {
        this.chats.remove(chat);
        chat.htmlTag.detach();
        if (this._activeChat === chat) {
            if (this.chats.length > 0)
                this.activeChat = this.chats.last();
            else
                this.activeChat = undefined;
        }
    }
    onSend() {
        let textBox = $(this.htmlTag).find(".input_box");
        let text = textBox.val().toString();
        if (!this.testMessage(text))
            return;
        textBox.val("");
        $(this.htmlTag).find(".input_box").trigger("input");
        if (this._activeChat && $.isFunction(this._activeChat.onMessageSend))
            this._activeChat.onMessageSend(text);
    }
    set activeChat(chat) {
        if (this.chats.indexOf(chat) === -1)
            return;
        if (this._activeChat == chat)
            return;
        this.activeChat0(chat);
    }
    activeChat0(chat) {
        this._activeChat = chat;
        for (let e of this.chats)
            e.htmlTag.removeClass("active");
        let flagAllowSend = false;
        if (this._activeChat) {
            this._activeChat.htmlTag.addClass("active");
            this._activeChat.displayHistory();
            if (globalClient && globalClient.permissions && globalClient.permissions.initialized())
                switch (this._activeChat.type) {
                    case ChatType.CLIENT:
                        flagAllowSend = true;
                        break;
                    case ChatType.SERVER:
                        flagAllowSend = globalClient.permissions.neededPermission(PermissionType.B_CLIENT_SERVER_TEXTMESSAGE_SEND).granted(1);
                        break;
                    case ChatType.CHANNEL:
                        flagAllowSend = globalClient.permissions.neededPermission(PermissionType.B_CLIENT_CHANNEL_TEXTMESSAGE_SEND).granted(1);
                        break;
                }
        }
        this.htmlTag.find(".input_box").prop("disabled", !flagAllowSend);
    }
    get activeChat() { return this._activeChat; }
    channelChat() {
        return this.findChat("chat_channel");
    }
    serverChat() {
        return this.findChat("chat_server");
    }
    focus() {
        $(this.htmlTag).find(".input_box").focus();
    }
    testMessage(message) {
        message = message
            .replace(/ /gi, "")
            .replace(/<br>/gi, "")
            .replace(/\n/gi, "")
            .replace(/<br\/>/gi, "");
        return message.length > 0;
    }
}
//# sourceMappingURL=chat.js.map