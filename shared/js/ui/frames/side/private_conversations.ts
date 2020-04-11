/* the bar on the right with the chats (Channel & Client) */
import {settings, Settings} from "tc-shared/settings";
import {LogCategory} from "tc-shared/log";
import {format, helpers} from "tc-shared/ui/frames/side/chat_helper";
import {bbcode_chat} from "tc-shared/ui/frames/chat";
import {Frame} from "tc-shared/ui/frames/chat_frame";
import {ChatBox} from "tc-shared/ui/frames/side/chat_box";
import {CommandResult, ErrorID} from "tc-shared/connection/ServerConnectionDeclaration";
import * as log from "tc-shared/log";
import * as htmltags from "tc-shared/ui/htmltags";

declare function setInterval(handler: TimerHandler, timeout?: number, ...arguments: any[]): number;
declare function setTimeout(handler: TimerHandler, timeout?: number, ...arguments: any[]): number;

export type PrivateConversationViewEntry = {
    html_tag: JQuery;
}

export type PrivateConversationMessageData = {
    message_id: string;
    message: string;
    sender: "self" | "partner";

    sender_name: string;
    sender_unique_id: string;
    sender_client_id: number;

    timestamp: number;
};

export type PrivateConversationViewMessage = PrivateConversationMessageData & PrivateConversationViewEntry & {
    time_update_id: number;
};
export type PrivateConversationViewSpacer = PrivateConversationViewEntry;

export enum PrivateConversationState {
    OPEN,
    CLOSED,
    DISCONNECTED,
    DISCONNECTED_SELF,
}

export type DisplayedMessage = {
    timestamp: number;

    message: PrivateConversationViewMessage | PrivateConversationViewEntry;
    message_type: "spacer" | "message";

    /* structure as following
        1. time pointer
        2. unread
        3. message
     */
    tag_message: JQuery;
    tag_unread: PrivateConversationViewSpacer | undefined;
    tag_timepointer: PrivateConversationViewSpacer | undefined;
}

export class PrivateConveration {
    readonly handle: PrivateConverations;
    private _html_entry_tag: JQuery;
    private _message_history: PrivateConversationMessageData[] = [];

    private _callback_message: (text: string) => any;

    private _state: PrivateConversationState;

    private _last_message_updater_id: number;
    private _last_typing: number = 0;
    private _typing_timeout: number = 4000;
    private _typing_timeout_task: number;

    _scroll_position: number | undefined; /* undefined to follow bottom | position for special stuff */
    _html_message_container: JQuery; /* only set when this chat is selected! */

    client_unique_id: string;
    client_id: number;
    client_name: string;

    private _displayed_messages: DisplayedMessage[] = [];
    private _displayed_messages_length: number = 500;
    private _spacer_unread_message: DisplayedMessage;

    constructor(handle: PrivateConverations, client_unique_id: string, client_name: string, client_id: number) {
        this.handle = handle;
        this.client_name = client_name;
        this.client_unique_id = client_unique_id;
        this.client_id = client_id;
        this._state = PrivateConversationState.OPEN;

        this._build_entry_tag();
        this.set_unread_flag(false);

        this.load_history();
    }

    private history_key() { return this.handle.handle.handle.channelTree.server.properties.virtualserver_unique_identifier + "_" + this.client_unique_id; }
    private load_history() {
        helpers.history.load_history(this.history_key()).then((data: PrivateConversationMessageData[]) => {
            if(!data) return;

            const flag_unread = !!this._spacer_unread_message;
            for(const message of data.slice(data.length > this._displayed_messages_length ? data.length - this._displayed_messages_length : 0)) {
                this.append_message(message.message, {
                    type: message.sender,
                    name: message.sender_name,
                    unique_id: message.sender_unique_id,
                    client_id: message.sender_client_id
                }, new Date(message.timestamp), false);
            }

            if(!flag_unread)
                this.set_unread_flag(false);

            this.fix_scroll(false);
            this.save_history();
        }).catch(error => {
            log.warn(LogCategory.CHAT, tr("Failed to load private conversation history for user %s on server %s: %o"),
                this.client_unique_id, this.handle.handle.handle.channelTree.server.properties.virtualserver_unique_identifier, error);
        })
    }

    private save_history() {
        helpers.history.save_history(this.history_key(), this._message_history).catch(error => {
            log.warn(LogCategory.CHAT, tr("Failed to save private conversation history for user %s on server %s: %o"),
                this.client_unique_id, this.handle.handle.handle.channelTree.server.properties.virtualserver_unique_identifier, error);
        });
    }

    entry_tag() : JQuery {
        return this._html_entry_tag;
    }

    destroy() {
        this._html_message_container = undefined; /* we do not own this container */

        this.clear_messages(false);

        this._html_entry_tag && this._html_entry_tag.remove();
        this._html_entry_tag = undefined;

        this._message_history = undefined;
        if(this._typing_timeout_task)
            clearTimeout(this._typing_timeout_task);
    }

    private _2d_flat<T>(array: T[][]) : T[] {
        const result = [];
        for(const a of array)
            result.push(...a.filter(e => typeof(e) !== "undefined"));
        return result;
    }

    messages_tags() : JQuery[] {
        return this._2d_flat(this._displayed_messages.slice().reverse().map(e => [
            e.tag_timepointer ? e.tag_timepointer.html_tag : undefined,
            e.tag_unread ? e.tag_unread.html_tag : undefined,
            e.tag_message
        ]));
    }

    append_message(message: string, sender: {
        type: "self" | "partner";
        name: string;
        unique_id: string;
        client_id: number;
    }, timestamp?: Date, save_history?: boolean) {
        const message_date = timestamp || new Date();
        const message_timestamp = message_date.getTime();

        const packed_message = {
            message: message,
            sender: sender.type,
            sender_name: sender.name,
            sender_client_id: sender.client_id,
            sender_unique_id: sender.unique_id,
            timestamp: message_date.getTime(),
            message_id: 'undefined'
        };

        /* first of all register message in message history */
        {
            let index = 0;
            for(;index < this._message_history.length; index++) {
                if(this._message_history[index].timestamp > message_timestamp)
                    continue;
                this._message_history.splice(index, 0, packed_message);
                break;
            }

            if(index > 100)
                return; /* message is too old to be displayed */

            if(index >= this._message_history.length)
                this._message_history.push(packed_message);

            while(this._message_history.length > 100)
                this._message_history.pop();
        }

        if(sender.type === "partner") {
            clearTimeout(this._typing_timeout_task);
            this._typing_timeout_task = 0;

            if(this.typing_active()) {
                this._last_typing = 0;
                this.typing_expired();
            } else {
                this._update_message_timestamp();
            }
        } else {
            this._update_message_timestamp();
        }

        if(typeof(save_history) !== "boolean" || save_history)
            this.save_history();

        /* insert in view */
        {
            const basic_view_entry = this._build_message(packed_message);

            this._register_displayed_message({
                timestamp: basic_view_entry.timestamp,
                message: basic_view_entry,
                message_type: "message",
                tag_message: basic_view_entry.html_tag,
                tag_timepointer: undefined,
                tag_unread: undefined
            }, true);
        }
    }

    private _displayed_message_first_tag(message: DisplayedMessage) {
        const tp = message.tag_timepointer ? message.tag_timepointer.html_tag : undefined;
        const tu = message.tag_unread ? message.tag_unread.html_tag : undefined;
        return tp || tu || message.tag_message;
    }

    private _destroy_displayed_message(message: DisplayedMessage, update_pointers: boolean) {
        if(update_pointers) {
            const index = this._displayed_messages.indexOf(message);
            if(index != -1 && index > 0) {
                const next = this._displayed_messages[index - 1];
                if(!next.tag_timepointer && message.tag_timepointer) {
                    next.tag_timepointer = message.tag_timepointer;
                    message.tag_timepointer = undefined;
                }
                if(!next.tag_unread && message.tag_unread) {
                    this._spacer_unread_message = next;
                    next.tag_unread = message.tag_unread;
                    message.tag_unread = undefined;
                }
            }

            if(message == this._spacer_unread_message)
                this._spacer_unread_message = undefined;
        }

        this._displayed_messages.remove(message);
        if(message.tag_timepointer)
            this._destroy_view_entry(message.tag_timepointer);

        if(message.tag_unread)
            this._destroy_view_entry(message.tag_unread);

        this._destroy_view_entry(message.message);
    }

    clear_messages(save?: boolean) {
        this._message_history = [];
        while(this._displayed_messages.length > 0) {
            this._destroy_displayed_message(this._displayed_messages[0], false);
        }

        this._spacer_unread_message = undefined;

        this._update_message_timestamp();
        if(save)
            this.save_history();
    }

    fix_scroll(animate: boolean) {
        if(!this._html_message_container)
            return;

        let offset;
        if(this._spacer_unread_message) {
            offset = this._displayed_message_first_tag(this._spacer_unread_message)[0].offsetTop;
        } else if(typeof(this._scroll_position) !== "undefined") {
            offset = this._scroll_position;
        } else {
            offset = this._html_message_container[0].scrollHeight;
        }
        if(animate) {
            this._html_message_container.stop(true).animate({
                scrollTop: offset
            }, 'slow');
        } else {
            this._html_message_container.stop(true).scrollTop(offset);
        }
    }

    private _update_message_timestamp() {
        if(this._last_message_updater_id)
            clearTimeout(this._last_message_updater_id);

        if(!this._html_entry_tag)
            return; /* we got deleted, not need for updates */

        if(this.typing_active()) {
            this._html_entry_tag.find(".last-message").text(tr("currently typing..."));
            return;
        }

        const last_message = this._message_history[0];
        if(!last_message) {
            this._html_entry_tag.find(".last-message").text(tr("no history"));
            return;
        }

        const timestamp = new Date(last_message.timestamp);
        let time = format.date.format_chat_time(timestamp);
        this._html_entry_tag.find(".last-message").text(time.result);

        if(time.next_update > 0) {
            this._last_message_updater_id = setTimeout(() => this._update_message_timestamp(), time.next_update);
        } else {
            this._last_message_updater_id = 0;
        }
    }

    private _destroy_message(message: PrivateConversationViewMessage) {
        if(message.time_update_id)
            clearTimeout(message.time_update_id);
    }

    private _build_message(message: PrivateConversationMessageData) : PrivateConversationViewMessage {
        const result = message as PrivateConversationViewMessage;
        if(result.html_tag)
            return result;

        const timestamp = new Date(message.timestamp);
        let time = format.date.format_chat_time(timestamp);
        result.html_tag = $("#tmpl_frame_chat_private_message").renderTag({
            timestamp: time.result,
            message_id: message.message_id,
            client_name: htmltags.generate_client_object({
                add_braces: false,
                client_name: message.sender_name,
                client_unique_id: message.sender_unique_id,
                client_id: message.sender_client_id
            }),
            message: bbcode_chat(message.message),
            avatar: this.handle.handle.handle.fileManager.avatars.generate_chat_tag({id: message.sender_client_id}, message.sender_unique_id)
        });
        if(time.next_update > 0) {
            const _updater = () => {
                time = format.date.format_chat_time(timestamp);
                result.html_tag.find(".info .timestamp").text(time.result);
                if(time.next_update > 0)
                    result.time_update_id = setTimeout(_updater, time.next_update);
                else
                    result.time_update_id = 0;
            };
            result.time_update_id = setTimeout(_updater, time.next_update);
        } else {
            result.time_update_id = 0;
        }

        return result;
    }

    private _build_spacer(message: string, type: "date" | "new" | "disconnect" | "disconnect_self" | "reconnect" | "closed" | "error") : PrivateConversationViewSpacer {
        const tag = $("#tmpl_frame_chat_private_spacer").renderTag({
            message: message
        }).addClass("type-" + type);
        return {
            html_tag: tag
        }
    }

    private _register_displayed_message(message: DisplayedMessage, update_new: boolean) {
        const message_date = new Date(message.timestamp);

        /* before := older message; after := newer message */
        let entry_before: DisplayedMessage, entry_after: DisplayedMessage;
        let index = 0;
        for(;index < this._displayed_messages.length; index++) {
            if(this._displayed_messages[index].timestamp > message.timestamp)
                continue;

            entry_after = index > 0 ? this._displayed_messages[index - 1] : undefined;
            entry_before = this._displayed_messages[index];
            this._displayed_messages.splice(index, 0, message);
            break;
        }
        if(index >= this._displayed_messages_length) {
            return; /* message is out of view region */
        }

        if(index >= this._displayed_messages.length) {
            entry_before = undefined;
            entry_after = this._displayed_messages.last();
            this._displayed_messages.push(message);
        }

        while(this._displayed_messages.length > this._displayed_messages_length)
            this._destroy_displayed_message(this._displayed_messages.last(), true);

        const flag_new_message = update_new && index == 0 && (message.message_type === "spacer" || (<PrivateConversationViewMessage>message.message).sender === "partner");

        /* Timeline for before - now */
        {
            let append_pointer = false;

            if(entry_before) {
                if(!helpers.date.same_day(message.timestamp, entry_before.timestamp)) {
                    append_pointer = true;
                }
            } else {
                append_pointer = true;
            }
            if(append_pointer) {
                const diff = format.date.date_format(message_date, new Date());
                if(diff == format.date.ColloquialFormat.YESTERDAY)
                    message.tag_timepointer = this._build_spacer(tr("Yesterday"), "date");
                else if(diff == format.date.ColloquialFormat.TODAY)
                    message.tag_timepointer = this._build_spacer(tr("Today"), "date");
                else if(diff == format.date.ColloquialFormat.GENERAL)
                    message.tag_timepointer = this._build_spacer(format.date.format_date_general(message_date, false), "date");
            }
        }

        /* Timeline not and after */
        {
            if(entry_after) {
                if(helpers.date.same_day(message_date, entry_after.timestamp)) {
                    if(entry_after.tag_timepointer) {
                        this._destroy_view_entry(entry_after.tag_timepointer);
                        entry_after.tag_timepointer = undefined;
                    }
                } else if(!entry_after.tag_timepointer) {
                    const diff = format.date.date_format(new Date(entry_after.timestamp), new Date());
                    if(diff == format.date.ColloquialFormat.YESTERDAY)
                        entry_after.tag_timepointer = this._build_spacer(tr("Yesterday"), "date");
                    else if(diff == format.date.ColloquialFormat.TODAY)
                        entry_after.tag_timepointer = this._build_spacer(tr("Today"), "date");
                    else if(diff == format.date.ColloquialFormat.GENERAL)
                        entry_after.tag_timepointer = this._build_spacer(format.date.format_date_general(message_date, false), "date");

                    entry_after.tag_timepointer.html_tag.insertBefore(entry_after.tag_message);
                }
            }
        }

        /* new message flag */
        if(flag_new_message) {
            if(!this._spacer_unread_message) {
                this._spacer_unread_message = message;
                message.tag_unread = this._build_spacer(tr("Unread messages"), "new");

                this.set_unread_flag(true);
            }
        }

        if(this._html_message_container) {
            if(entry_before) {
                message.tag_message.insertAfter(entry_before.tag_message);
            } else if(entry_after) {
                message.tag_message.insertBefore(this._displayed_message_first_tag(entry_after));
            } else {
                this._html_message_container.append(message.tag_message);
            }

            /* first time pointer */
            if(message.tag_timepointer)
                message.tag_timepointer.html_tag.insertBefore(message.tag_message);

            /* the unread */
            if(message.tag_unread)
                message.tag_unread.html_tag.insertBefore(message.tag_message);
        }

        this.fix_scroll(true);
    }

    private _destroy_view_entry(entry: PrivateConversationViewEntry) {
        if(!entry.html_tag)
            return;
        entry.html_tag.remove();
        if('sender' in entry)
            this._destroy_message(entry);
    }

    private _build_entry_tag() {
        this._html_entry_tag = $("#tmpl_frame_chat_private_entry").renderTag({
            client_name: this.client_name,
            last_time: tr("error no timestamp"),
            avatar: this.handle.handle.handle.fileManager.avatars.generate_chat_tag({id: this.client_id}, this.client_unique_id)
        });
        this._html_entry_tag.on('click', event => {
            if(event.isDefaultPrevented())
                return;

            this.handle.set_selected_conversation(this);
        });
        this._html_entry_tag.find('.button-close').on('click', event => {
            event.preventDefault();
            this.close_conversation();
        });
        this._update_message_timestamp();
    }

    update_avatar() {
        const container = this._html_entry_tag.find(".container-avatar");
        container.find(".avatar").remove();
        container.append(this.handle.handle.handle.fileManager.avatars.generate_chat_tag({id: this.client_id}, this.client_unique_id));
    }

    close_conversation() {
        this.handle.delete_conversation(this, true);
    }

    set_client_name(name: string) {
        if(this.client_name === name)
            return;
        this.client_name = name;
        this._html_entry_tag.find(".client-name").text(name);
    }

    set_unread_flag(flag: boolean, update_chat_counter?: boolean) {
        /* unread message pointer */
        if(flag != (typeof(this._spacer_unread_message) !== "undefined")) {
            if(flag) {
                if(this._displayed_messages.length > 0) /* without messages we cant be unread */
                    return;

                if(!this._spacer_unread_message) {
                    this._spacer_unread_message = this._displayed_messages[0];
                    this._spacer_unread_message.tag_unread = this._build_spacer(tr("Unread messages"), "new");
                    this._spacer_unread_message.tag_unread.html_tag.insertBefore(this._spacer_unread_message.tag_message);
                }
            } else {
                const ctree = this.handle.handle.handle.channelTree;
                if(ctree && ctree.tag_tree() && this.client_id)
                    ctree.tag_tree().find(".marker-text-unread[private-conversation='" + this.client_id + "']").addClass("hidden");

                if(this._spacer_unread_message) {
                    this._destroy_view_entry(this._spacer_unread_message.tag_unread);
                    this._spacer_unread_message.tag_unread = undefined;
                    this._spacer_unread_message = undefined;
                }
            }
        }

        /* general notify */
        this._html_entry_tag.toggleClass("unread", flag);
        if(typeof(update_chat_counter) !== "boolean" || update_chat_counter)
            this.handle.handle.info_frame().update_chat_counter();
    }

    is_unread() : boolean { return !!this._spacer_unread_message; }

    private _append_state_change(state: "disconnect" | "disconnect_self" | "reconnect" | "closed") {
        let message;
        if(state == "closed")
            message = tr("Your chat partner has closed the conversation");
        else if(state == "reconnect")
            message = this._state === PrivateConversationState.DISCONNECTED_SELF ?tr("You've reconnected to the server") :  tr("Your chat partner has reconnected");
        else if(state === "disconnect")
            message = tr("Your chat partner has disconnected");
        else
            message = tr("You've disconnected from the server");

        const spacer = this._build_spacer(message, state);
        this._register_displayed_message({
            timestamp: Date.now(),
            message: spacer,
            message_type: "spacer",
            tag_message: spacer.html_tag,
            tag_timepointer: undefined,
            tag_unread: undefined
        }, state === "disconnect");
    }

    state() : PrivateConversationState {
        return this._state;
    }

    set_state(state: PrivateConversationState) {
        if(this._state == state)
            return;

        if(state == PrivateConversationState.DISCONNECTED) {
            this._append_state_change("disconnect");
            this.client_id = 0;
        } else if(state == PrivateConversationState.OPEN && this._state != PrivateConversationState.CLOSED)
            this._append_state_change("reconnect");
        else if(state == PrivateConversationState.CLOSED)
            this._append_state_change("closed");
        else if(state == PrivateConversationState.DISCONNECTED_SELF)
            this._append_state_change("disconnect_self");

        this._state = state;
    }

    set_text_callback(callback: (text: string) => any, update_enabled_state?: boolean) {
        this._callback_message = callback;
        if(typeof (update_enabled_state) !== "boolean" || update_enabled_state)
            this.handle.update_chatbox_state();
    }

    chat_enabled() {
        return typeof(this._callback_message) !== "undefined" && (this._state == PrivateConversationState.OPEN || this._state == PrivateConversationState.CLOSED);
    }

    append_error(message: string, date?: number) {
        const spacer = this._build_spacer(message, "error");
        this._register_displayed_message({
            timestamp: date || Date.now(),
            message: spacer,
            message_type: "spacer",
            tag_message: spacer.html_tag,
            tag_timepointer: undefined,
            tag_unread: undefined
        }, true);
    }

    call_message(message: string) {
        if(this._callback_message)
            this._callback_message(message);
        else {
            log.warn(LogCategory.CHAT, tr("Dropping conversation message for client %o because of no message callback."), {
                client_name: this.client_name,
                client_id: this.client_id,
                client_unique_id: this.client_unique_id
            });
        }
    }

    private typing_expired() {
        this._update_message_timestamp();
        if(this.handle.current_conversation() === this)
            this.handle.update_typing_state();
    }

    trigger_typing() {
        let _new = Date.now() - this._last_typing > this._typing_timeout;
        this._last_typing = Date.now();

        if(this._typing_timeout_task)
            clearTimeout(this._typing_timeout_task);

        if(_new)
            this._update_message_timestamp();
        if(this.handle.current_conversation() === this)
            this.handle.update_typing_state();

        this._typing_timeout_task = setTimeout(() => this.typing_expired(), this._typing_timeout);
    }

    typing_active() {
        return Date.now() - this._last_typing < this._typing_timeout;
    }
}

export class PrivateConverations {
    readonly handle: Frame;
    private _chat_box: ChatBox;
    private _html_tag: JQuery;

    private _container_conversation: JQuery;
    private _container_conversation_messages: JQuery;
    private _container_conversation_list: JQuery;
    private _container_typing: JQuery;

    private _html_no_chats: JQuery;
    private _conversations: PrivateConveration[] = [];

    private _current_conversation: PrivateConveration = undefined;
    private _select_read_timer: number;

    constructor(handle: Frame) {
        this.handle = handle;
        this._chat_box = new ChatBox();
        this._build_html_tag();

        this.update_chatbox_state();
        this.update_typing_state();
        this._chat_box.callback_text = message => {
            if(!this._current_conversation) {
                log.warn(LogCategory.CHAT, tr("Dropping conversation message because of no active conversation."));
                return;
            }
            this._current_conversation.call_message(message);
        };

        this._chat_box.callback_typing = () => {
            if(!this._current_conversation) {
                log.warn(LogCategory.CHAT, tr("Dropping conversation typing action because of no active conversation."));
                return;
            }

            const connection = this.handle.handle.serverConnection;
            if(!connection || !connection.connected())
                return;

            connection.send_command("clientchatcomposing", {
                clid: this._current_conversation.client_id
            });
        }
    }

    clear_client_ids() {
        this._conversations.forEach(e => {
            e.client_id = 0;
            e.set_state(PrivateConversationState.DISCONNECTED_SELF);
        });
    }

    html_tag() : JQuery { return this._html_tag; }
    destroy() {
        this._chat_box && this._chat_box.destroy();
        this._chat_box = undefined;

        for(const conversation of this._conversations)
            conversation.destroy();
        this._conversations = [];
        this._current_conversation = undefined;

        clearTimeout(this._select_read_timer);

        this._html_tag && this._html_tag.remove();
        this._html_tag = undefined;

    }

    current_conversation() : PrivateConveration | undefined { return this._current_conversation; }

    conversations() : PrivateConveration[] { return this._conversations; }
    create_conversation(client_uid: string, client_name: string, client_id: number) : PrivateConveration {
        const conv = new PrivateConveration(this, client_uid, client_name, client_id);
        this._conversations.push(conv);
        this._html_no_chats.hide();

        this._container_conversation_list.append(conv.entry_tag());
        this.handle.info_frame().update_chat_counter();
        return conv;
    }
    delete_conversation(conv: PrivateConveration, update_chat_couner?: boolean) {
        if(!this._conversations.remove(conv))
            return;
        //TODO: May animate?
        conv.destroy();
        conv.clear_messages(false);
        this._html_no_chats.toggle(this._conversations.length == 0);
        if(conv === this._current_conversation)
            this.set_selected_conversation(undefined);
        if(update_chat_couner || typeof(update_chat_couner) !== "boolean")
            this.handle.info_frame().update_chat_counter();
    }
    find_conversation(partner: { name: string; unique_id: string; client_id: number }, mode: { create: boolean, attach: boolean }) : PrivateConveration | undefined {
        for(const conversation of this.conversations())
            if(conversation.client_id == partner.client_id && (!partner.unique_id || conversation.client_unique_id == partner.unique_id)) {
                if(conversation.state() != PrivateConversationState.OPEN)
                    conversation.set_state(PrivateConversationState.OPEN);
                return conversation;
            }

        let conv: PrivateConveration;
        if(mode.attach) {
            for(const conversation of this.conversations())
                if(conversation.client_unique_id == partner.unique_id && conversation.state() != PrivateConversationState.OPEN) {
                    conversation.set_state(PrivateConversationState.OPEN);
                    conversation.client_id = partner.client_id;
                    conversation.set_client_name(partner.name);

                    conv = conversation;
                    break;
                }
        }

        if(mode.create && !conv) {
            conv = this.create_conversation(partner.unique_id, partner.name, partner.client_id);
            conv.client_id = partner.client_id;
            conv.set_client_name(partner.name);
        }

        if(conv) {
            conv.set_text_callback(message => {
                log.debug(LogCategory.CLIENT, tr("Sending text message %s to %o"), message, partner);
                this.handle.handle.serverConnection.send_command("sendtextmessage", {"targetmode": 1, "target": partner.client_id, "msg": message}).catch(error => {
                    if(error instanceof CommandResult) {
                        if(error.id == ErrorID.CLIENT_INVALID_ID) {
                            conv.set_state(PrivateConversationState.DISCONNECTED);
                            conv.set_text_callback(undefined);
                        } else if(error.id == ErrorID.PERMISSION_ERROR) {
                            /* may notify for no permissions? */
                        } else {
                            conv.append_error(tr("Failed to send message: ") + (error.extra_message || error.message));
                        }
                    } else {
                        conv.append_error(tr("Failed to send message. Lookup the console for more details"));
                        log.error(LogCategory.CHAT, tr("Failed to send conversation message: %o"), error);
                    }
                });
            });
        }
        return conv;
    }

    clear_conversations() {
        while(this._conversations.length > 0)
            this.delete_conversation(this._conversations[0], false);
        this.handle.info_frame().update_chat_counter();
    }

    set_selected_conversation(conv: PrivateConveration | undefined) {
        if(conv === this._current_conversation)
            return;

        if(this._select_read_timer)
            clearTimeout(this._select_read_timer);

        if(this._current_conversation)
            this._current_conversation._html_message_container = undefined;

        this._container_conversation_list.find(".selected").removeClass("selected");
        this._container_conversation_messages.children().detach();
        this._current_conversation = conv;
        if(!this._current_conversation) {
            this.update_chatbox_state();
            return;
        }

        this._current_conversation._html_message_container = this._container_conversation_messages;
        const messages = this._current_conversation.messages_tags();
        /* TODO: Check if the messages are empty and display "No messages" */
        this._container_conversation_messages.append(...messages);

        if(this._current_conversation.is_unread() && false) {
            this._select_read_timer = setTimeout(() => {
                this._current_conversation.set_unread_flag(false, true);
            }, 20 * 1000); /* Lets guess you've read the new messages within 5 seconds */
        }
        this._current_conversation.fix_scroll(false);
        this._current_conversation.entry_tag().addClass("selected");
        this.update_chatbox_state();
    }

    update_chatbox_state() {
        this._chat_box.set_enabled(!!this._current_conversation && this._current_conversation.chat_enabled());
    }

    update_typing_state() {
        this._container_typing.toggleClass("hidden", !this._current_conversation || !this._current_conversation.typing_active());
    }

    private _build_html_tag() {
        this._html_tag = $("#tmpl_frame_chat_private").renderTag({
            chatbox: this._chat_box.html_tag()
        }).dividerfy();
        this._container_conversation = this._html_tag.find(".conversation");
        this._container_conversation.on('click', event => { /* lets think if a user clicks within that field that he has read the messages */
            if(this._current_conversation)
                this._current_conversation.set_unread_flag(false, true); /* only updates everything if the state changes */
        });

        this._container_conversation_messages = this._container_conversation.find(".container-messages");
        this._container_conversation_messages.on('scroll', event => {
            if(!this._current_conversation)
                return;

            const current_view = this._container_conversation_messages[0].scrollTop + this._container_conversation_messages[0].clientHeight + this._container_conversation_messages[0].clientHeight * .125;
            if(current_view > this._container_conversation_messages[0].scrollHeight)
                this._current_conversation._scroll_position = undefined;
            else
                this._current_conversation._scroll_position = this._container_conversation_messages[0].scrollTop;
        });

        this._container_conversation_list = this._html_tag.find(".conversation-list");
        this._html_no_chats = this._container_conversation_list.find(".no-chats");
        this._container_typing = this._html_tag.find(".container-typing");
        this.update_input_format_helper();
    }

    try_input_focus() {
        this._chat_box.focus_input();
    }

    on_show() {
        if(this._current_conversation)
            this._current_conversation.fix_scroll(false);
    }

    update_input_format_helper() {
        const tag = this._html_tag.find(".container-format-helper");
        if(settings.static_global(Settings.KEY_CHAT_ENABLE_MARKDOWN)) {
            tag.removeClass("hidden").text(tr("*italic*, **bold**, ~~strikethrough~~, `code`, and more..."));
        } else {
            tag.addClass("hidden");
        }
    }
}