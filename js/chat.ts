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

    export function formatElement(object: any) : JQuery[] {
        if($.isArray(object)) {
            let result = [];
            for(let element of object)
                result.push(...this.formatElement(element));
            return result;
        } else if(typeof(object) == "string") {
            if(object.length == 0) return [];

            return this.htmlEscape(object).map((entry, idx, array) => $.spawn("a").css("display", (idx == 0 || idx + 1 == array.length ? "inline" : "") + "block").html(entry));
        } else if(typeof(object) === "object") {
            if(object instanceof jQuery)
                return [object];
            return this.formatElement("<unknwon object>");
        } else if(typeof(object) === "function") return this.formatElement(object());
        else if(typeof(object) === "undefined") return this.formatElement("<undefined>");
        return this.formatElement("<unknown object type " + typeof object + ">");
    }

    export function formatMessage(pattern: string, ...objects: any[]) : JQuery[] {
        let begin = 0, found = 0;

        let result: JQuery[] = [];
        do {
            found = pattern.indexOf('{', found);
            if(found == -1 || pattern.length <= found + 1) {
                result.push(...this.formatElement(pattern.substr(begin)));
                break;
            }

            if(found > 0 && pattern[found - 1] == '\\') {
                //TODO remove the escape!
                found++;
                continue;
            }

            result.push(...this.formatElement(pattern.substr(begin, found - begin))); //Append the text

            let number;
            let offset = 0;
            while ("0123456789".includes(pattern[found + 1 + offset])) offset++;
            number = parseInt(offset > 0 ? pattern.substr(found + 1, offset) : "0");

            if(pattern[found + offset + 1] != '}') {
                found++;
                continue;
            }

            if(objects.length < number)
                console.warn("Message to format contains invalid index (" + number + ")");

            result.push(...this.formatElement(objects[number]));
            begin = found = found + 2 + offset;
            console.log("Offset: " + offset + " Number: " + number);
        } while(found++);

        return result;
    }
}

class ChatMessage {
    date: Date;
    message: JQuery[];
    private _htmlTag: JQuery<HTMLElement>;

    constructor(message: JQuery[]) {
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

        this._htmlTag = tag;
        tag.append(dateTag);
        this.message.forEach(e => e.appendTo(tag));
        tag.hide();
        return tag;
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
            elm.htmlTag.animate({opacity: 0}, 200, function () {
                $(this).detach();
            });
        }
        if(this.handle.activeChat === this) {
            let box = $(this.handle.htmlTag).find(".messages");
            let mbox = $(this.handle.htmlTag).find(".message_box");
            let bottom : boolean = box.scrollTop() + box.height() + 1 >= mbox.height();
            mbox.append(entry.htmlTag);
            entry.htmlTag.show().css("opacity", "0").animate({opacity: 1}, 100);
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
    htmlTag: JQuery;
    chats: ChatEntry[];
    private _activeChat: ChatEntry;

    constructor(htmlTag: JQuery) {
        this.htmlTag = htmlTag;

        this.htmlTag.find(".input button").click(this.onSend.bind(this));
        this.htmlTag.find(".input_box").keypress(event => {
            if(event.keyCode == JQuery.Key.Enter && !event.shiftKey) {
                this.onSend();
                return false;
            }
        }).on('input', (event) => {
            let text = $(event.target).val().toString();
            if(this.testMessage(text))
                this.htmlTag.find(".input button").removeAttr("disabled");
            else
                this.htmlTag.find(".input button").attr("disabled", "true");
        }).trigger("input");

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

        globalClient.permissions.initializedListener.push(flag => {
            if(flag) this.activeChat0(this._activeChat);
        });
    }

    createChat(key, type : ChatType = ChatType.CLIENT) : ChatEntry {
        let chat = new ChatEntry(this, type, key);
        this.chats.push(chat);
        this.htmlTag.find(".chats").append(chat.htmlTag);
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
        this.activeChat0(chat);
    }

    private activeChat0(chat: ChatEntry) {
        this._activeChat = chat;
        for(let e of this.chats)
            e.htmlTag.removeClass("active");

        let flagAllowSend = false;
        if(this._activeChat) {
            this._activeChat.htmlTag.addClass("active");
            this._activeChat.displayHistory();

            if(globalClient && globalClient.permissions && globalClient.permissions.initialized())
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