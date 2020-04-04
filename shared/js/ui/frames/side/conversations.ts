import {settings, Settings} from "tc-shared/settings";
import {format} from "tc-shared/ui/frames/side/chat_helper";
import {bbcode_chat, formatMessage} from "tc-shared/ui/frames/chat";
import {CommandResult, ErrorID} from "tc-shared/connection/ServerConnectionDeclaration";
import {LogCategory} from "tc-shared/log";
import {PermissionType} from "tc-shared/permission/PermissionType";
import {ChatBox} from "tc-shared/ui/frames/side/chat_box";
import {Frame, FrameContent} from "tc-shared/ui/frames/chat_frame";
import {createErrorModal} from "tc-shared/ui/elements/Modal";
import * as log from "tc-shared/log";
import * as htmltags from "tc-shared/ui/htmltags";

declare function setInterval(handler: TimerHandler, timeout?: number, ...arguments: any[]): number;
declare function setTimeout(handler: TimerHandler, timeout?: number, ...arguments: any[]): number;

export type ViewEntry = {
    html_element: JQuery;
    update_timer?: number;
}
export type MessageData = {
    timestamp: number;

    message: string;

    sender_name: string;
    sender_unique_id: string;
    sender_database_id: number;
}
export type Message = MessageData & ViewEntry;

export class Conversation {
    readonly handle: ConversationManager;
    readonly channel_id: number;

    private _flag_private: boolean;

    private _html_tag: JQuery;
    private _container_messages: JQuery;
    private _container_new_message: JQuery;

    private _container_no_permissions: JQuery;
    private _container_no_permissions_shown: boolean = false;

    private _container_is_private: JQuery;
    private _container_is_private_shown: boolean = false;

    private _container_no_support: JQuery;
    private _container_no_support_shown: boolean = false;

    private _view_max_messages = 40; /* reset to 40 again as soon we tab out :) */
    private _view_older_messages: ViewEntry;
    private _has_older_messages: boolean; /* undefined := not known | else flag */

    private _view_entries: ViewEntry[] = [];

    private _last_messages: MessageData[] = [];
    private _last_messages_timestamp: number = 0;
    private _first_unread_message: Message;
    private _first_unread_message_pointer: ViewEntry;

    private _scroll_position: number | undefined; /* undefined to follow bottom | position for special stuff */

    constructor(handle: ConversationManager, channel_id: number) {
        this.handle = handle;
        this.channel_id = channel_id;

        this._build_html_tag();
    }

    html_tag() : JQuery { return this._html_tag; }
    destroy() {
        this._first_unread_message_pointer.html_element.detach();
        this._first_unread_message_pointer = undefined;

        this._view_older_messages.html_element.detach();
        this._view_older_messages = undefined;

        for(const view_entry of this._view_entries) {
            view_entry.html_element.detach();
            clearTimeout(view_entry.update_timer);
        }
        this._view_entries = [];
    }

    private _build_html_tag() {
        this._html_tag = $("#tmpl_frame_chat_channel_messages").renderTag();

        this._container_new_message = this._html_tag.find(".new-message");
        this._container_no_permissions = this._html_tag.find(".no-permissions").hide();
        this._container_is_private = this._html_tag.find(".private-conversation").hide();
        this._container_no_support = this._html_tag.find(".not-supported").hide();

        this._container_messages = this._html_tag.find(".container-messages");
        this._container_messages.on('scroll', event => {
            const exact_position = this._container_messages[0].scrollTop + this._container_messages[0].clientHeight;
            const current_view = exact_position + this._container_messages[0].clientHeight * .125;
            if(current_view > this._container_messages[0].scrollHeight) {
                this._scroll_position = undefined;
            } else {
                this._scroll_position = this._container_messages[0].scrollTop;
            }

            const will_visible = !!this._first_unread_message && this._first_unread_message_pointer.html_element[0].offsetTop > exact_position;
            const is_visible = this._container_new_message[0].classList.contains("shown");
            if(!is_visible && will_visible)
                this._container_new_message[0].classList.add("shown");

            if(is_visible && !will_visible)
                this._container_new_message[0].classList.remove("shown");

            //This causes a Layout recalc (Forced reflow)
            //this._container_new_message.toggleClass("shown",!!this._first_unread_message && this._first_unread_message_pointer.html_element[0].offsetTop > exact_position);
        });

        this._view_older_messages = this._generate_view_spacer(tr("Load older messages"), "old");
        this._first_unread_message_pointer = this._generate_view_spacer(tr("Unread messages"), "new");
        this._view_older_messages.html_element.appendTo(this._container_messages).on('click', event => {
            this.fetch_older_messages();
        });

        this._container_new_message.on('click', event => {
            if(!this._first_unread_message)
                return;
            this._scroll_position = this._first_unread_message_pointer.html_element[0].offsetTop;
            this.fix_scroll(true);
        });
        this._container_messages.on('click', event => {
            if(this._container_new_message.hasClass('shown'))
                return; /* we have clicked, but no chance to see the unread message pointer */
            this._mark_read();
        });
        this.set_flag_private(false);
    }

    is_unread() { return !!this._first_unread_message; }

    mark_read() { this._mark_read(); }
    private _mark_read() {
        if(this._first_unread_message) {
            this._first_unread_message = undefined;

            const ctree = this.handle.handle.handle.channelTree;
            if(ctree && ctree.tag_tree())
                ctree.tag_tree().find(".marker-text-unread[conversation='" + this.channel_id + "']").addClass("hidden");
        }
        this._first_unread_message_pointer.html_element.detach();
    }

    private _generate_view_message(data: MessageData) : Message {
        const response = data as Message;
        if(response.html_element)
            return response;

        const timestamp = new Date(data.timestamp);
        let time = format.date.format_chat_time(timestamp);
        response.html_element = $("#tmpl_frame_chat_channel_message").renderTag({
            timestamp: time.result,
            client_name: htmltags.generate_client_object({
                add_braces: false,
                client_name: data.sender_name,
                client_unique_id: data.sender_unique_id,
                client_id: 0
            }),
            message: bbcode_chat(data.message),
            avatar: this.handle.handle.handle.fileManager.avatars.generate_chat_tag({database_id: data.sender_database_id}, data.sender_unique_id)
        });

        response.html_element.find(".button-delete").on('click', () => this.delete_message(data));

        if(time.next_update > 0) {
            const _updater = () => {
                time = format.date.format_chat_time(timestamp);
                response.html_element.find(".info .timestamp").text(time.result);
                if(time.next_update > 0)
                    response.update_timer = setTimeout(_updater, time.next_update);
                else
                    response.update_timer = 0;
            };
            response.update_timer = setTimeout(_updater, time.next_update);
        } else {
            response.update_timer = 0;
        }

        return response;
    }

    private _generate_view_spacer(message: string, type: "date" | "new" | "old" | "error") : ViewEntry {
        const tag = $("#tmpl_frame_chat_private_spacer").renderTag({
            message: message
        }).addClass("type-" + type);
        return {
            html_element: tag,
            update_timer: 0
        }
    }

    last_messages_timestamp() : number {
        return this._last_messages_timestamp;
    }

    fetch_last_messages() {
        const fetch_count = this._view_max_messages - this._last_messages.length;
        const fetch_timestamp_end = this._last_messages_timestamp + 1; /* we want newer messages then the last message we have */

        //conversationhistory cid=1 [cpw=xxx] [timestamp_begin] [timestamp_end (0 := no end)] [message_count (default 25| max 100)] [-merge]
        this.handle.handle.handle.serverConnection.send_command("conversationhistory", {
            cid: this.channel_id,
            timestamp_end: fetch_timestamp_end,
            message_count: fetch_count
        }, {flagset: ["merge"], process_result: false }).catch(error => {
            this._view_older_messages.html_element.toggleClass('shown', false);
            if(error instanceof CommandResult) {
                if(error.id == ErrorID.CONVERSATION_MORE_DATA) {
                    if(typeof(this._has_older_messages) === "undefined")
                        this._has_older_messages = true;
                    this._view_older_messages.html_element.toggleClass('shown', true);
                    return;
                } else if(error.id == ErrorID.PERMISSION_ERROR) {
                    this._container_no_permissions.show();
                    this._container_no_permissions_shown = true;
                } else if(error.id == ErrorID.CONVERSATION_IS_PRIVATE) {
                    this.set_flag_private(true);
                }
                /*
                else if(error.id == ErrorID.NOT_IMPLEMENTED || error.id == ErrorID.COMMAND_NOT_FOUND) {
                    this._container_no_support.show();
                    this._container_no_support_shown = true;
                }
                */
            }
            //TODO log and handle!
            log.error(LogCategory.CHAT, tr("Failed to fetch conversation history. %o"), error);
        }).then(() => {
            this.fix_scroll(true);
            this.handle.update_chat_box();
        });
    }

    fetch_older_messages() {
        this._view_older_messages.html_element.toggleClass('shown', false);

        const entry = this._view_entries.slice().reverse().find(e => 'timestamp' in e) as any as {timestamp: number};
        //conversationhistory cid=1 [cpw=xxx] [timestamp_begin] [timestamp_end (0 := no end)] [message_count (default 25| max 100)] [-merge]
        this.handle.handle.handle.serverConnection.send_command("conversationhistory", {
            cid: this.channel_id,
            timestamp_begin: entry.timestamp - 1,
            message_count: this._view_max_messages
        }, {flagset: ["merge"]}).catch(error => {
            this._view_older_messages.html_element.toggleClass('shown', false);
            if(error instanceof CommandResult) {
                if(error.id == ErrorID.CONVERSATION_MORE_DATA) {
                    this._view_older_messages.html_element.toggleClass('shown', true);
                    this.handle.update_chat_box();
                    return;
                }
            }
            //TODO log and handle!
            log.error(LogCategory.CHAT, tr("Failed to fetch conversation history. %o"), error);
        }).then(() => {
            this.fix_scroll(true);
        });
    }

    register_new_message(message: MessageData, update_view?: boolean) {
        /* lets insert the message at the right index */
        let _new_message = false;
        {
            let spliced = false;
            for(let index = 0; index < this._last_messages.length; index++) {
                if(this._last_messages[index].timestamp < message.timestamp) {
                    this._last_messages.splice(index, 0, message);
                    spliced = true;
                    _new_message = index == 0; /* only set flag if this has been inserted at the front */
                    break;
                } else if(this._last_messages[index].timestamp == message.timestamp && this._last_messages[index].sender_database_id == message.sender_database_id) {
                    return; /* we already have that message */
                }
            }
            if(!spliced && this._last_messages.length < this._view_max_messages) {
                this._last_messages.push(message);
            }
            this._last_messages_timestamp = this._last_messages[0].timestamp;

            while(this._last_messages.length > this._view_max_messages) {
                if(this._last_messages[this._last_messages.length - 1] == this._first_unread_message)
                    break;
                this._last_messages.pop();
            }
        }

        /* message is within view */
        {
            const entry = this._generate_view_message(message);

            let previous: ViewEntry;
            for(let index = 0; index < this._view_entries.length; index++) {
                const current_entry = this._view_entries[index];
                if(!('timestamp' in current_entry))
                    continue;

                if((current_entry as Message).timestamp < message.timestamp) {
                    this._view_entries.splice(index, 0, entry);
                    previous = current_entry;
                    break;
                }
            }
            if(!previous)
                this._view_entries.push(entry);

            if(previous)
                entry.html_element.insertAfter(previous.html_element);
            else
                entry.html_element.insertAfter(this._view_older_messages.html_element); /* last element is already the current element */

            if(_new_message && (typeof(this._scroll_position) === "number" || this.handle.current_channel() !== this.channel_id || this.handle.handle.content_type() !== FrameContent.CHANNEL_CHAT)) {
                if(typeof(this._first_unread_message) === "undefined")
                    this._first_unread_message = entry;

                this._first_unread_message_pointer.html_element.insertBefore(entry.html_element);
                this._container_messages.trigger('scroll'); /* updates the new message stuff */
            }
            if(typeof(update_view) !== "boolean" || update_view)
                this.fix_scroll(true);
        }

        /* update chat state */
        this._container_no_permissions.hide();
        this._container_no_permissions_shown = false;
        if(update_view) this.handle.update_chat_box();
    }

    /* using a timeout here to not cause a force style recalculation */
    private _scroll_fix_timer: number;
    private _scroll_animate: boolean;

    fix_scroll(animate: boolean) {
        if(this._scroll_fix_timer) {
            this._scroll_animate = this._scroll_animate && animate;
            return;
        }

        this._scroll_fix_timer = setTimeout(() => {
            this._scroll_fix_timer = undefined;

            let offset;
            if(this._first_unread_message) {
                offset = this._first_unread_message.html_element[0].offsetTop;
            } else if(typeof(this._scroll_position) !== "undefined") {
                offset = this._scroll_position;
            } else {
                offset = this._container_messages[0].scrollHeight;
            }

            if(this._scroll_animate) {
                this._container_messages.stop(true).animate({
                    scrollTop: offset
                }, 'slow');
            } else {
                this._container_messages.stop(true).scrollTop(offset);
            }
        }, 5);
    }

    fix_view_size() {
        this._view_older_messages.html_element.toggleClass('shown', !!this._has_older_messages);

        let count = 0;
        for(let index = 0; index < this._view_entries.length; index++) {
            if('timestamp' in this._view_entries[index])
                count++;

            if(count > this._view_max_messages) {
                this._view_entries.splice(index, this._view_entries.length - index).forEach(e => {
                    clearTimeout(e.update_timer);
                    e.html_element.remove();
                });
                this._has_older_messages = true;
                this._view_older_messages.html_element.toggleClass('shown', true);
                break;
            }
        }
    }

    chat_available() : boolean {
        return !this._container_no_permissions_shown && !this._container_is_private_shown && !this._container_no_support_shown;
    }

    text_send_failed(error: CommandResult | any) {
        log.warn(LogCategory.CHAT, "Failed to send text message! (%o)", error);
        //TODO: Log if message send failed?
        if(error instanceof CommandResult) {
            if(error.id == ErrorID.PERMISSION_ERROR) {
                //TODO: Split up between channel_text_message_send permission and no view permission
                if(error.json["failed_permid"] == 0) {
                    this._container_no_permissions_shown = true;
                    this._container_no_permissions.show();
                    this.handle.update_chat_box();
                }
            }
        }
    }

    set_flag_private(flag: boolean) {
        if(this._flag_private === flag)
            return;

        this._flag_private = flag;
        this.update_private_state();
        if(!flag)
            this.fetch_last_messages();
    }

    update_private_state() {
        if(!this._flag_private) {
            this._container_is_private.hide();
            this._container_is_private_shown = false;
        } else {
            const client = this.handle.handle.handle.getClient();
            if(client && client.currentChannel() && client.currentChannel().channelId === this.channel_id) {
                this._container_is_private_shown = false;
                this._container_is_private.hide();
            } else {
                this._container_is_private.show();
                this._container_is_private_shown = true;
            }
        }
    }

    delete_message(message: MessageData) {
        //TODO A lot of checks!
        //conversationmessagedelete cid=2 timestamp_begin= timestamp_end= cldbid= limit=1
        this.handle.handle.handle.serverConnection.send_command('conversationmessagedelete', {
            cid: this.channel_id,
            cldbid: message.sender_database_id,

            timestamp_begin: message.timestamp - 1,
            timestamp_end: message.timestamp + 1,

            limit: 1
        }).then(() => {
            return; /* in general it gets deleted via notify */
        }).catch(error => {
            log.error(LogCategory.CHAT, tr("Failed to delete conversation message for conversation %o: %o"), this.channel_id, error);
            if(error instanceof CommandResult)
                error = error.extra_message || error.message;
            createErrorModal(tr("Failed to delete message"), formatMessage(tr("Failed to delete conversation message{:br:}Error: {}"), error)).open();
        });
        log.debug(LogCategory.CLIENT, tr("Deleting text message %o"), message);
    }

    delete_messages(begin: number, end: number, sender: number, limit: number) {
        let count = 0;
        for(const message of this._view_entries.slice()) {
            if(!('sender_database_id' in message))
                continue;

            const cmsg = message as Message;
            if(end != 0 && cmsg.timestamp > end)
                continue;
            if(begin != 0 && cmsg.timestamp < begin)
                break;

            if(cmsg.sender_database_id !== sender)
                continue;

            this._delete_message(message);
            if(--count >= limit)
                return;
        }

        //TODO remove in cache? (_last_messages)
    }

    private _delete_message(message: Message) {
        if('html_element' in message) {
            const cmessage = message as Message;
            cmessage.html_element.remove();
            clearTimeout(cmessage.update_timer);
            this._view_entries.remove(message as any);
        }

        this._last_messages.remove(message);
    }
}

export class ConversationManager {
    readonly handle: Frame;

    private _html_tag: JQuery;
    private _chat_box: ChatBox;

    private _container_conversation: JQuery;

    private _conversations: Conversation[] = [];
    private _current_conversation: Conversation | undefined;

    private _needed_listener = () => this.update_chat_box();

    constructor(handle: Frame) {
        this.handle = handle;

        this._chat_box = new ChatBox();
        this._build_html_tag();

        this._chat_box.callback_text = text => {
            if(!this._current_conversation)
                return;

            const conv = this._current_conversation;
            this.handle.handle.serverConnection.send_command("sendtextmessage", {targetmode: conv.channel_id == 0 ? 3 : 2, cid: conv.channel_id, msg: text}, {process_result: false}).catch(error => {
                conv.text_send_failed(error);
            });
        };
        this.update_chat_box();
    }

    initialize_needed_listener() {
        this.handle.handle.permissions.register_needed_permission(PermissionType.B_CLIENT_CHANNEL_TEXTMESSAGE_SEND, this._needed_listener);
        this.handle.handle.permissions.register_needed_permission(PermissionType.B_CLIENT_SERVER_TEXTMESSAGE_SEND, this._needed_listener);
    }

    html_tag() : JQuery { return this._html_tag; }
    destroy() {
        if(this.handle.handle.permissions)
            this.handle.handle.permissions.unregister_needed_permission(PermissionType.B_CLIENT_CHANNEL_TEXTMESSAGE_SEND, this._needed_listener);
        this.handle.handle.permissions.unregister_needed_permission(PermissionType.B_CLIENT_SERVER_TEXTMESSAGE_SEND, this._needed_listener);
        this._needed_listener = undefined;

        this._chat_box && this._chat_box.destroy();
        this._chat_box = undefined;

        this._html_tag && this._html_tag.remove();
        this._html_tag = undefined;
        this._container_conversation = undefined;

        for(const conversation of this._conversations)
            conversation.destroy();
        this._conversations = [];
        this._current_conversation = undefined;
    }

    update_chat_box() {
        let flag = true;
        flag = flag && !!this._current_conversation; /* test if we have a conversation */
        flag = flag && !!this.handle.handle.permissions; /* test if we got permissions to test with */
        flag = flag && this.handle.handle.permissions.neededPermission(this._current_conversation.channel_id == 0 ? PermissionType.B_CLIENT_SERVER_TEXTMESSAGE_SEND : PermissionType.B_CLIENT_CHANNEL_TEXTMESSAGE_SEND).granted(1);
        flag = flag && this._current_conversation.chat_available();
        this._chat_box.set_enabled(flag);
    }

    private _build_html_tag() {
        this._html_tag = $("#tmpl_frame_chat_channel").renderTag({
            chatbox: this._chat_box.html_tag()
        });
        this._container_conversation = this._html_tag.find(".container-chat");
        this._chat_box.html_tag().on('focus', event => {
            if(this._current_conversation)
                this._current_conversation.mark_read();
        });
        this.update_input_format_helper();
    }

    set_current_channel(channel_id: number, update_info_frame?: boolean) {
        if(this._current_conversation && this._current_conversation.channel_id === channel_id)
            return;

        let conversation = this.conversation(channel_id);
        this._current_conversation = conversation;

        if(this._current_conversation) {
            this._container_conversation.children().detach();
            this._container_conversation.append(conversation.html_tag());
            this._current_conversation.fix_view_size();
            this._current_conversation.fix_scroll(false);
            this.update_chat_box();
        }
        if(typeof(update_info_frame) === "undefined" || update_info_frame)
            this.handle.info_frame().update_channel_text();
    }

    current_channel() : number { return this._current_conversation ? this._current_conversation.channel_id : 0; }

    /* Used by notifychanneldeleted */
    delete_conversation(channel_id: number) {
        const entry = this._conversations.find(e => e.channel_id === channel_id);
        if(!entry)
            return;

        this._conversations.remove(entry);
        entry.html_tag().detach();
        entry.destroy();
    }

    reset() {
        while(this._conversations.length > 0)
            this.delete_conversation(this._conversations[0].channel_id);
    }

    conversation(channel_id: number, create?: boolean) : Conversation {
        let conversation = this._conversations.find(e => e.channel_id === channel_id);

        if(!conversation && channel_id >= 0 && (typeof (create) === "undefined" || create)) {
            conversation = new Conversation(this, channel_id);
            this._conversations.push(conversation);
            conversation.fetch_last_messages();
        }
        return conversation;
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