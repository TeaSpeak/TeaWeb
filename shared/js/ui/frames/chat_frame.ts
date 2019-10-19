/* the bar on the right with the chats (Channel & Client) */
namespace chat {
    import Event = JQuery.Event;

    declare function setInterval(handler: TimerHandler, timeout?: number, ...arguments: any[]): number;
    declare function setTimeout(handler: TimerHandler, timeout?: number, ...arguments: any[]): number;

    export enum InfoFrameMode {
        NONE = "none",
        CHANNEL_CHAT = "channel_chat",
        PRIVATE_CHAT = "private_chat",
        CLIENT_INFO = "client_info"
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

                const conversation = selected_client ? this.handle.private_conversations().find_conversation({
                    name: selected_client.properties.client_nickname,
                    unique_id: selected_client.properties.client_unique_identifier,
                    client_id: selected_client.clientId()
                }, { create: true, attach: true }) : undefined;
                if(!conversation) return;

                this.handle.private_conversations().set_selected_conversation(conversation);
                this.handle.show_private_conversations();
            })[0];
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
                if(channel.properties.channel_icon_id != 0)
                    client.handle.fileManager.icons.generateTag(channel.properties.channel_icon_id).appendTo(html_tag);
                $.spawn("div").text(channel.channelName()).appendTo(html_tag);

                this.update_channel_limit(channel, html_limit_tag);
            } else {
                $.spawn("div").text("Not connected").appendTo(html_tag);
            }
        }

        update_channel_text() {
            const channel_tree = this.handle.handle.connected ? this.handle.handle.channelTree : undefined;
            const current_channel_id = channel_tree ? this.handle.channel_conversations().current_channel() : 0;
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
                if(channel.properties.channel_icon_id != 0)
                    this.handle.handle.fileManager.icons.generateTag(channel.properties.channel_icon_id).appendTo(html_tag);
                $.spawn("div").text(channel.channelName()).appendTo(html_tag);

                this.update_channel_limit(channel, html_limit_tag);
            } else if(channel_tree && current_channel_id > 0) {
                html_tag.append(MessageHelper.formatMessage(tr("Unknown channel id {}"), current_channel_id));
            } else if(channel_tree && current_channel_id == 0) {
                const server = this.handle.handle.channelTree.server;
                if(server.properties.virtualserver_icon_id != 0)
                    this.handle.handle.fileManager.icons.generateTag(server.properties.virtualserver_icon_id).appendTo(html_tag);
                $.spawn("div").text(server.properties.virtualserver_name).appendTo(html_tag);
                html_tag_title.text(tr("You're chatting in Server"));
            } else if(this.handle.handle.connected) {
                $.spawn("div").text("No channel selected").appendTo(html_tag);
            } else {
                $.spawn("div").text("Not connected").appendTo(html_tag);
            }
        }

        update_channel_client_count(channel: ChannelEntry) {
            if(channel === this._channel_text)
                this.update_channel_limit(channel, this._html_tag.find(".value-text-limit"));
            if(channel === this._channel_voice)
                this.update_channel_limit(channel, this._html_tag.find(".value-voice-limit"));
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

        update_chat_counter() {
            const conversations = this.handle.private_conversations().conversations();
            {
                const count = conversations.filter(e => e.is_unread()).length;
                const count_container = this._html_tag.find(".container-indicator");
                const count_tag = count_container.find(".chat-unread-counter");
                count_container.toggle(count > 0);
                count_tag.text(count);
            }
            {
                const count_tag = this._html_tag.find(".chat-counter");
                if(conversations.length == 0)
                    count_tag.text(tr("No conversations"));
                else if(conversations.length == 1)
                    count_tag.text(tr("One conversation"));
                else
                    count_tag.text(conversations.length + " " + tr("conversations"));
            }
        }

        current_mode() : InfoFrameMode {
            return this._mode;
        }

        set_mode(mode: InfoFrameMode) {
            if(this._mode !== mode) {
                this._mode = mode;
                this._html_tag.find(".mode-based").hide();
                this._html_tag.find(".mode-" + mode).show();
            }

            if(mode === InfoFrameMode.CLIENT_INFO && this._button_conversation) {
                //Will be called every time a client is shown
                const selected_client = this.handle.client_info().current_client();
                const conversation = selected_client ? this.handle.private_conversations().find_conversation({
                    name: selected_client.properties.client_nickname,
                    unique_id: selected_client.properties.client_unique_identifier,
                    client_id: selected_client.clientId()
                }, { create: false, attach: false }) : undefined;

                const visibility = (selected_client && selected_client.clientId() !== this.handle.handle.clientId) ? "visible" : "hidden";
                if(this._button_conversation.style.visibility !== visibility)
                    this._button_conversation.style.visibility = visibility;
                if(conversation) {
                    this._button_conversation.innerText = tr("Open conversation");
                } else {
                    this._button_conversation.innerText = tr("Start a conversation");
                }
            }
        }
    }

    class ChatBox {
        private _html_tag: JQuery;
        private _html_input: JQuery<HTMLDivElement>;
        private _enabled: boolean;
        private __callback_text_changed;
        private __callback_key_down
        private __callback_key_up;
        private __callback_paste;

        private _typing_timeout: number; /* ID when the next callback_typing will be called */
        private _typing_last_event: number; /* timestamp of the last typing event */

        private _message_history: string[] = [];
        private _message_history_length = 100;
        private _message_history_index = 1;

        typing_interval: number = 2000; /* update frequency */
        callback_typing: () => any;
        callback_text: (text: string) => any;

        constructor() {
            this._enabled = true;
            this.__callback_key_up = this._callback_key_up.bind(this);
            this.__callback_key_down = this._callback_key_down.bind(this);
            this.__callback_text_changed = this._callback_text_changed.bind(this);
            this.__callback_paste = event => this._callback_paste(event);

            this._build_html_tag();
            this._initialize_listener();
        }

        html_tag() : JQuery {
            return this._html_tag;
        }

        destroy() {
            this._html_tag && this._html_tag.remove();
            this._html_tag = undefined;
            this._html_input = undefined;

            clearTimeout(this._typing_timeout);

            this.__callback_text_changed = undefined;
            this.__callback_key_down = undefined;
            this.__callback_paste = undefined;

            this.callback_text = undefined;
            this.callback_typing = undefined;
        }

        private _initialize_listener() {
            this._html_input.on("cut paste drop keydown keyup", (event) => this.__callback_text_changed(event));
            this._html_input.on("change", this.__callback_text_changed);
            this._html_input.on("keydown", this.__callback_key_down);
            this._html_input.on("keyup", this.__callback_key_up);
            this._html_input.on("paste", this.__callback_paste);
        }

        private _build_html_tag() {
            this._html_tag = $("#tmpl_frame_chat_chatbox").renderTag({
                emojy_support: settings.static_global(Settings.KEY_CHAT_COLORED_EMOJIES)
            });
            this._html_input = this._html_tag.find(".textarea") as any;

            const tag: JQuery & { lsxEmojiPicker(args: any); } = this._html_tag.find('.button-emoji') as any;
            tag.lsxEmojiPicker({
                width: 300,
                height: 400,
                twemoji: typeof(window.twemoji) !== "undefined",
                onSelect: emoji => this._html_input.html(this._html_input.html() + emoji.value),
                closeOnSelect: false
            });
        }

        private _callback_text_changed(event: Event) {
            if(event && event.isDefaultPrevented())
                return;

            /* Auto resize */
            const text = this._html_input[0];
            text.style.height = "1em";
            text.style.height = text.scrollHeight + 'px';

            if(!event || (event.type !== "keydown" && event.type !== "keyup" && event.type !== "change"))
                return;

            this._typing_last_event = Date.now();
            if(this._typing_timeout)
                return;

            const _trigger_typing = (last_time: number) => {
                if(this._typing_last_event <= last_time) {
                    this._typing_timeout = 0;
                    return;
                }

                try {
                    if(this.callback_typing)
                        this.callback_typing();
                } finally {
                    this._typing_timeout = setTimeout(_trigger_typing, this.typing_interval, this._typing_last_event);
                }
            };
            _trigger_typing(0); /* We def want that*/
        }

        private _text(element: HTMLElement) {
            if(typeof(element) !== "object")
                return element;

            if(element instanceof HTMLImageElement)
                return element.alt || element.title;
            if(element instanceof HTMLBRElement) {
                return '\n';
            }

            if(element.childNodes.length > 0)
                return [...element.childNodes].map(e => this._text(e as HTMLElement)).join("");

            if(element.nodeType == Node.TEXT_NODE)
                return element.textContent;
            return element.innerText + "-";
        }

        private htmlEscape(message: string) : string {
            const div = document.createElement('div');
            div.innerText = message;
            message =  div.innerHTML;
            return message.replace(/ /g, '&nbsp;');
        }
        private _callback_paste(event: ClipboardEvent) {

            const _event = (<any>event).originalEvent as ClipboardEvent || event;
            const clipboard = _event.clipboardData || (<any>window).clipboardData;
            if(!clipboard) return;


            const raw_text = clipboard.getData('text/plain');
            const selection = window.getSelection();
            if (!selection.rangeCount)
                return false;

            let html_xml = clipboard.getData('text/html');
            if(!html_xml)
                html_xml = $.spawn("div").text(raw_text).html();

            const parser = new DOMParser();
            const nodes = parser.parseFromString(html_xml, "text/html");

            const data = this._text(nodes.body);
            event.preventDefault();

            selection.deleteFromDocument();
            document.execCommand('insertHTML', false, this.htmlEscape(data));
        }

        private test_message(message: string) : boolean {
            message = message
                .replace(/ /gi, "")
                .replace(/<br>/gi, "")
                .replace(/\n/gi, "")
                .replace(/<br\/>/gi, "");
            return message.length > 0;
        }

        private _callback_key_down(event: KeyboardEvent) {
            if(event.key.toLowerCase() === "enter" && !event.shiftKey) {
                event.preventDefault();

                /* deactivate chatbox when no callback? */
                let text = this._html_input[0].innerText as string;
                if(!this.test_message(text))
                    return;

                this._message_history.push(text);
                this._message_history_index = this._message_history.length;
                if(this._message_history.length > this._message_history_length)
                    this._message_history = this._message_history.slice(this._message_history.length - this._message_history_length);

                if(this.callback_text) {
                    this.callback_text(helpers.preprocess_chat_message(text));
                }

                if(this._typing_timeout)
                    clearTimeout(this._typing_timeout);
                this._typing_timeout = 1; /* enforce no typing update while sending */
                this._html_input.text("");
                setTimeout(() => {
                    this.__callback_text_changed();
                    this._typing_timeout = 0; /* enable text change listener again */
                });
            } else if(event.key.toLowerCase() === "arrowdown") {
                //TODO: Test for at the last line within the box
                if(this._message_history_index < 0) return;
                if(this._message_history_index >= this._message_history.length) return; /* OOB, even with the empty message */

                this._message_history_index++;
                this._html_input[0].innerText = this._message_history[this._message_history_index] || ""; /* OOB just returns "undefined" */
            } else if(event.key.toLowerCase() === "arrowup") {
                //TODO: Test for at the first line within the box
                if(this._message_history_index <= 0) return; /* we cant go "down" */
                this._message_history_index--;
                this._html_input[0].innerText = this._message_history[this._message_history_index];
            } else {
                if(this._message_history_index >= 0) {
                    if(this._message_history_index >= this._message_history.length) {
                        if("" !== this._html_input[0].innerText)
                            this._message_history_index = -1;
                    } else if(this._message_history[this._message_history_index] !== this._html_input[0].innerText)
                        this._message_history_index = -1;
                }
            }
        }

        private _callback_key_up(event: KeyboardEvent) {
            if("" === this._html_input[0].innerText)
                this._message_history_index = this._message_history.length;
        }

        private _context_task: number;
        set_enabled(flag: boolean) {
            if(this._enabled === flag)
                return;

            if(!this._context_task) {
                this._enabled = flag;
                /* Allow the browser to asynchronously recalculate everything */
                this._context_task = setTimeout(() => {
                    this._context_task = undefined;
                    this._html_input.each((_, e) => { e.contentEditable = this._enabled ? "true" : "false"; });
                });
                this._html_tag.find('.button-emoji').toggleClass("disabled", !flag);
            }
        }

        is_enabled() {
            return this._enabled;
        }

        focus_input() {
            this._html_input.focus();
        }
    }

    export namespace helpers {
        //https://regex101.com/r/YQbfcX/2
        //static readonly URL_REGEX = /^(?<hostname>([a-zA-Z0-9-]+\.)+[a-zA-Z0-9-]{2,63})(?:\/(?<path>(?:[^\s?]+)?)(?:\?(?<query>\S+))?)?$/gm;
        const URL_REGEX = /^(([a-zA-Z0-9-]+\.)+[a-zA-Z0-9-]{2,63})(?:\/((?:[^\s?]+)?)(?:\?(\S+))?)?$/gm;
        function process_urls(message: string) : string {
            const words = message.split(/[ \n]/);
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
                            message = undefined;
                            words[index] = "[url=" + url.toString() + "]" + url.toString() + "[/url]";
                        }
                    } catch(e) { /* word isn't an url */ }

                if(unescaped.match(URL_REGEX)) {
                    if(flag_escaped)
                        words[index] = unescaped;
                    else {
                        message = undefined;
                        words[index] = "[url=" + unescaped + "]" + unescaped + "[/url]";
                    }
                }
            }

            return message || words.join(" ");
        }

        namespace md2bbc {
            export type RemarkToken = {
                type: string;
                tight: boolean;
                lines: number[];
                level: number;

                /* img */
                alt?: string;
                src?: string;

                /* link */
                href?: string;

                /* table */
                align?: string;

                /* code  */
                params?: string;

                content?: string;
                hLevel?: number;
                children?: RemarkToken[];
            }

            export class Renderer {
                private static renderers = {
                    "text": (renderer: Renderer, token: RemarkToken) => renderer.options().process_url ? process_urls(renderer.maybe_escape_bb(token.content)) : renderer.maybe_escape_bb(token.content),
                    "softbreak": () => "\n",

                    "paragraph_open": () => "",
                    "paragraph_close": () => "\n",

                    "strong_open": (renderer: Renderer, token: RemarkToken) => "[b]",
                    "strong_close": (renderer: Renderer, token: RemarkToken) => "[/b]",

                    "em_open": (renderer: Renderer, token: RemarkToken) => "[i]",
                    "em_close": (renderer: Renderer, token: RemarkToken) => "[/i]",

                    "del_open": () => "[s]",
                    "del_close": () => "[/s]",

                    "sup": (renderer: Renderer, token: RemarkToken) => "[sup]" + renderer.maybe_escape_bb(token.content) + "[/sup]",
                    "sub": (renderer: Renderer, token: RemarkToken) => "[sub]" + renderer.maybe_escape_bb(token.content) + "[/sub]",

                    "bullet_list_open": () => "[ul]",
                    "bullet_list_close": () => "[/ul]",

                    "ordered_list_open": () => "[ol]",
                    "ordered_list_close": () => "[/ol]",

                    "list_item_open": () => "[li]",
                    "list_item_close": () => "[/li]",

                    "table_open": () => "[table]",
                    "table_close": () => "[/table]",

                    "thead_open": () => "",
                    "thead_close": () => "",

                    "tbody_open": () => "",
                    "tbody_close": () => "",

                    "tr_open": () => "[tr]",
                    "tr_close": () => "[/tr]",

                    "th_open": (renderer: Renderer, token: RemarkToken) => "[th" + (token.align ? ("=" + token.align) : "") + "]",
                    "th_close": () => "[/th]",

                    "td_open": () => "[td]",
                    "td_close": () => "[/td]",

                    "link_open": (renderer: Renderer, token: RemarkToken) => "[url" + (token.href ? ("=" + token.href) : "") + "]",
                    "link_close": () => "[/url]",

                    "image": (renderer: Renderer, token: RemarkToken) => "[img=" + (token.src) + "]" + (token.alt || token.src) + "[/img]",

                    //footnote_ref

                    //"content": "==Marked text==",
                    //mark_open
                    //mark_close

                    //++Inserted text++
                    "ins_open": () => "[u]",
                    "ins_close": () => "[/u]",

                    /*
```
test
[/code]
test
```
                     */

                    "code": (renderer: Renderer, token: RemarkToken) => "[i-code]" + xbbcode.escape(token.content) + "[/i-code]",
                    "fence": (renderer: Renderer, token: RemarkToken) => "[code" + (token.params ? ("=" + token.params) : "") + "]" + xbbcode.escape(token.content) + "[/code]",

                    "heading_open": (renderer: Renderer, token: RemarkToken) => "[h" + Math.min(3, token.hLevel) + "]",
                    "heading_close": (renderer: Renderer, token: RemarkToken) => "[/h" + Math.min(3, token.hLevel) + "]",

                    "hr": () => "[hr]",

                    //> Experience real-time editing with Remarkable!
                    //blockquote_open,
                    //blockquote_close
                };

                private _options;

                render(tokens: RemarkToken[], options: any, env: any) {
                    this._options = options;
                    let result = '';

                    //TODO: Escape BB-Codes
                    for(let index = 0; index < tokens.length; index++) {
                        if (tokens[index].type === 'inline') {
                            result += this.render_inline(tokens[index].children, index);
                        } else {
                            result += this.render_token(tokens[index], index);
                        }
                    }

                    this._options = undefined;
                    return result;
                }

                private render_token(token: RemarkToken, index: number) {
                    log.debug(LogCategory.GENERAL, tr("Render Markdown token: %o"), token);
                    const renderer = Renderer.renderers[token.type];
                    if(typeof(renderer) === "undefined") {
                        log.warn(LogCategory.CHAT, tr("Missing markdown to bbcode renderer for token %s: %o"), token.type, token);
                        return token.content || "";
                    }

                    return renderer(this, token, index);
                }

                private render_inline(tokens: RemarkToken[], index: number) {
                    let result = '';

                    for(let index = 0; index < tokens.length; index++) {
                        result += this.render_token(tokens[index], index);
                    }

                    return result;
                }

                options() : any {
                    return this._options;
                }

                maybe_escape_bb(text: string) {
                    if(this._options.escape_bb)
                        return xbbcode.escape(text);
                    return text;
                }
            }
        }

        let _renderer: any;
        function process_markdown(message: string, options: {
            process_url?: boolean,
            escape_bb?: boolean
        }) : string {
            if(typeof(window.remarkable) === "undefined")
                return (options.process_url ? process_urls(message) : message);

            if(!_renderer) {
                _renderer = new window.remarkable.Remarkable('full');
                _renderer.set({
                    typographer: true
                });
                _renderer.renderer = new md2bbc.Renderer();
            }
            _renderer.set({
                process_url: !!options.process_url,
                escape_bb: !!options.escape_bb
            });
            let result: string = _renderer.render(message);
            if(result.endsWith("\n"))
                result = result.substr(0, result.length - 1);
            return result;
        }

        export function preprocess_chat_message(message: string) : string {
            const process_url = settings.static_global(Settings.KEY_CHAT_TAG_URLS);
            const parse_markdown = settings.static_global(Settings.KEY_CHAT_ENABLE_MARKDOWN);
            const escape_bb = !settings.static_global(Settings.KEY_CHAT_ENABLE_BBCODE);

            if(parse_markdown)
                return process_markdown(message, {
                    process_url: process_url,
                    escape_bb: escape_bb
                });

            if(escape_bb)
                message = xbbcode.escape(message);
            return process_url ? process_urls(message) : message;
        }

        export namespace history {
            let _local_cache: Cache;

            async function get_cache() {
                if(_local_cache)
                    return _local_cache;

                if(!('caches' in window))
                    throw "missing cache extension!";

                return (_local_cache = await caches.open('chat_history'));
            }

            export async function load_history(key: string) : Promise<any | undefined> {
                const cache = await get_cache();
                const request = new Request("https://_local_cache/cache_request_" + key);
                const cached_response = await cache.match(request);
                if(!cached_response)
                    return undefined;

                return await cached_response.json();
            }

            export async function save_history(key: string, value: any) {
                const cache = await get_cache();
                const request = new Request("https://_local_cache/cache_request_" + key);
                const data = JSON.stringify(value);

                const new_headers = new Headers();
                new_headers.set("Content-type", "application/json");
                new_headers.set("Content-length", data.length.toString());


                await cache.put(request, new Response(data, {
                    headers: new_headers
                }));
            }
        }

        export namespace date {
            export function same_day(a: number | Date, b: number | Date) {
                a = a instanceof Date ? a : new Date(a);
                b = b instanceof Date ? b : new Date(b);

                if(a.getDate() !== b.getDate())
                    return false;
                if(a.getMonth() !== b.getMonth())
                    return false;
                return a.getFullYear() === b.getFullYear();
            }
        }
    }

    export namespace format {
        export namespace date {
            export enum ColloquialFormat {
                YESTERDAY,
                TODAY,
                GENERAL
            }

            export function date_format(date: Date, now: Date, ignore_settings?: boolean) : ColloquialFormat {
                if(!ignore_settings && !settings.static_global(Settings.KEY_CHAT_COLLOQUIAL_TIMESTAMPS))
                    return ColloquialFormat.GENERAL;

                let delta_day = now.getDate() - date.getDate();
                if(delta_day < 1)   /* month change? */
                    delta_day = date.getDate() - now.getDate();
                if(delta_day == 0)
                    return ColloquialFormat.TODAY;
                else if(delta_day == 1)
                    return ColloquialFormat.YESTERDAY;
                return ColloquialFormat.GENERAL;
            }

            export function format_date_general(date: Date, hours?: boolean) : string {
                return ('00' + date.getDate()).substr(-2) + "."
                    + ('00' + date.getMonth()).substr(-2) + "."
                    + date.getFullYear() +
                    (typeof(hours) === "undefined" || hours ? " at "
                        + ('00' + date.getHours()).substr(-2) + ":"
                        + ('00' + date.getMinutes()).substr(-2)
                            : "");
            }

            export function format_date_colloquial(date: Date, current_timestamp: Date) : { result: string; format: ColloquialFormat } {
                const format = date_format(date, current_timestamp);
                if(format == ColloquialFormat.GENERAL) {
                    return {
                        result: format_date_general(date),
                        format: format
                    };
                } else {
                    let hrs = date.getHours();
                    let time = "AM";
                    if(hrs > 12) {
                        hrs -= 12;
                        time = "PM";
                    }
                    return {
                        result: (format == ColloquialFormat.YESTERDAY ? tr("Yesterday at") : tr("Today at")) + " " + hrs + ":" + date.getMinutes() + " " + time,
                        format: format
                    };
                }
            }

            export function format_chat_time(date: Date) : {
                result: string,
                next_update: number /* in MS */
            } {
                const timestamp = date.getTime();
                const current_timestamp = new Date();

                const result = {
                    result: "",
                    next_update: 0
                };

                if(settings.static_global(Settings.KEY_CHAT_FIXED_TIMESTAMPS)) {
                    const format = format_date_colloquial(date, current_timestamp);
                    result.result = format.result;
                    result.next_update = 0; /* TODO: Update on day change? */
                } else {
                    const delta = current_timestamp.getTime() - timestamp;
                    if(delta < 2000) {
                        result.result = "now";
                        result.next_update = 2500 - delta; /* update after two seconds */
                    } else if(delta < 30000) { /* 30 seconds */
                        result.result = Math.floor(delta / 1000) + " " + tr("seconds ago");
                        result.next_update = 1000; /* update every second */
                    } else if(delta < 30 * 60 * 1000) { /* 30 minutes */
                        if(delta < 120 * 1000)
                            result.result = tr("one minute ago");
                        else
                            result.result = Math.floor(delta / (1000 * 60)) + " " + tr("minutes ago");
                        result.next_update = 60000; /* updater after a minute */
                    } else {
                        result.result = format_date_colloquial(date, current_timestamp).result;
                        result.next_update = 0; /* TODO: Update on day change? */
                    }
                }

                return result;
            }
        }
        export namespace time {
            export function format_online_time(secs: number) : string {
                let years   = Math.floor(secs  / (60 * 60 * 24 * 365));
                let days    = Math.floor(secs  / (60 * 60 * 24)) % 365;
                let hours   = Math.floor(secs / (60 * 60)) % 24;
                let minutes = Math.floor(secs / 60) % 60;
                let seconds = Math.floor(secs % 60);

                let result = "";
                if(years > 0)
                    result += years + " " + tr("years") + " ";
                if(years > 0 || days > 0)
                    result += days + " " + tr("days") + " ";
                if(years > 0 || days > 0 || hours > 0)
                    result += hours + " " + tr("hours") + " ";
                if(years > 0 || days > 0 || hours > 0 || minutes > 0)
                    result += minutes + " " + tr("minutes") + " ";
                if(years > 0 || days > 0 || hours > 0 || minutes > 0 || seconds > 0)
                    result += seconds + " " + tr("seconds") + " ";
                else
                    result = tr("now") + " ";

                return result.substr(0, result.length - 1);
            }
        }
    }

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
                message: MessageHelper.bbcode_chat(message.message),
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
                            log.error(LogCategory.CHAT, tr("Failed to send conversation message: %o", error));
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

            this._container_conversation_messages = this._container_conversation.find(".messages");
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
        }

        try_input_focus() {
            this._chat_box.focus_input();
        }

        on_show() {
            if(this._current_conversation)
                this._current_conversation.fix_scroll(false);
        }
    }

    export namespace channel {
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
                    message: MessageHelper.bbcode_chat(data.message),
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
                    createErrorModal(tr("Failed to delete message"), MessageHelper.formatMessage(tr("Failed to delete conversation message{:br:}Error: {}"), error)).open();
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
        }
    }

    export class ClientInfo {
        readonly handle: Frame;
        private _html_tag: JQuery;
        private _current_client: ClientEntry | undefined;
        private _online_time_updater: number;
        previous_frame_content: FrameContent;

        constructor(handle: Frame) {
            this.handle = handle;
            this._build_html_tag();
        }

        html_tag() : JQuery {
            return this._html_tag;
        }

        destroy() {
            clearInterval(this._online_time_updater);

            this._html_tag && this._html_tag.remove();
            this._html_tag = undefined;

            this._current_client = undefined;
            this.previous_frame_content = undefined;
        }

        private _build_html_tag() {
            this._html_tag = $("#tmpl_frame_chat_client_info").renderTag();
            this._html_tag.find(".button-close").on('click', () => {
                if(this.previous_frame_content === FrameContent.CLIENT_INFO)
                    this.previous_frame_content = FrameContent.NONE;

                this.handle.set_content(this.previous_frame_content);
            });
            this._html_tag.find(".button-more").on('click', () => {
                if(!this._current_client)
                    return;

                Modals.openClientInfo(this._current_client);
            });
            this._html_tag.find('.container-avatar-edit').on('click', () => this.handle.handle.update_avatar());
        }

        current_client() : ClientEntry {
            return this._current_client;
        }

        set_current_client(client: ClientEntry | undefined, enforce?: boolean) {
            if(client) client.updateClientVariables(); /* just to ensure */
            if(client === this._current_client && (typeof(enforce) === "undefined" || !enforce))
                return;

            this._current_client = client;

            /* updating the header */
            {
                const client_name = this._html_tag.find(".client-name");
                client_name.children().remove();
                htmltags.generate_client_object({
                    add_braces: false,
                    client_name: client ? client.clientNickName() : "undefined",
                    client_unique_id: client ? client.clientUid() : "",
                    client_id: client ? client.clientId() : 0
                }).appendTo(client_name);

                const client_description = this._html_tag.find(".client-description");
                client_description.text(client ? client.properties.client_description : "").toggle(!!client.properties.client_description);

                const container_avatar = this._html_tag.find(".container-avatar");
                container_avatar.find(".avatar").remove();
                if(client)
                    this.handle.handle.fileManager.avatars.generate_chat_tag({id: client.clientId()}, client.clientUid()).appendTo(container_avatar);
                else
                    this.handle.handle.fileManager.avatars.generate_chat_tag(undefined, undefined).appendTo(container_avatar);

                container_avatar.toggleClass("editable", client instanceof LocalClientEntry);
            }
            /* updating the info fields */
            {
                const online_time = this._html_tag.find(".client-online-time");
                online_time.text(format.time.format_online_time(client ? client.calculateOnlineTime() : 0));
                if(this._online_time_updater) {
                    clearInterval(this._online_time_updater);
                    this._online_time_updater = 0;
                }
                if(client) {
                    this._online_time_updater = setInterval(() => {
                        const client = this._current_client;
                        if(!client) {
                            clearInterval(this._online_time_updater);
                            this._online_time_updater = undefined;
                            return;
                        }
                        online_time.text(format.time.format_online_time(client.calculateOnlineTime()));
                    }, 1000);
                }

                const country = this._html_tag.find(".client-country");
                country.children().detach();
                const country_code = (client ? client.properties.client_country : undefined) || "xx";
                $.spawn("div").addClass("country flag-" + country_code.toLowerCase()).appendTo(country);
                $.spawn("a").text(i18n.country_name(country_code.toUpperCase())).appendTo(country);


                const version = this._html_tag.find(".client-version");
                version.children().detach();
                if(client) {
                    $.spawn("a").attr("title", client.properties.client_version).text(
                        client.properties.client_version.split(" ")[0] + " on " + client.properties.client_platform
                    ).appendTo(version);
                }

                const volume = this._html_tag.find(".client-local-volume");
                volume.text((client && client.get_audio_handle() ? (client.get_audio_handle().get_volume() * 100) : -1).toFixed(0) + "%");
            }

            /* teaspeak forum */
            {
                const container_forum = this._html_tag.find(".container-teaforo");
                if(client && client.properties.client_teaforo_id) {
                    container_forum.show();

                    const container_data = container_forum.find(".client-teaforo-account");
                    container_data.children().remove();

                    let text = client.properties.client_teaforo_name;
                    if((client.properties.client_teaforo_flags & 0x01) > 0)
                        text += " (" + tr("Banned") + ")";
                    if((client.properties.client_teaforo_flags & 0x02) > 0)
                        text += " (" + tr("Stuff") + ")";
                    if((client.properties.client_teaforo_flags & 0x04) > 0)
                        text += " (" + tr("Premium") + ")";

                    $.spawn("a")
                        .attr("href", "https://forum.teaspeak.de/index.php?members/" + client.properties.client_teaforo_id)
                        .attr("target", "_blank")
                        .text(text)
                        .appendTo(container_data);
                } else {
                    container_forum.hide();
                }
            }

            /* update the client status */
            {
                //TODO Implement client status!
                const container_status = this._html_tag.find(".container-client-status");
                const container_status_entries = container_status.find(".client-status");
                container_status_entries.children().detach();
                if(client) {
                    if(client.properties.client_away) {
                        container_status_entries.append(
                            $.spawn("div").addClass("status-entry").append(
                                $.spawn("div").addClass("icon_em client-away"),
                                $.spawn("a").text(tr("Away")),
                                client.properties.client_away_message ?
                                    $.spawn("a").addClass("away-message").text("(" + client.properties.client_away_message + ")") :
                                    undefined
                            )
                        )
                    }
                    if(client.is_muted()) {
                        container_status_entries.append(
                            $.spawn("div").addClass("status-entry").append(
                                $.spawn("div").addClass("icon_em client-input_muted_local"),
                                $.spawn("a").text(tr("Client local muted"))
                            )
                        )
                    }
                    if(!client.properties.client_output_hardware) {
                        container_status_entries.append(
                            $.spawn("div").addClass("status-entry").append(
                                $.spawn("div").addClass("icon_em client-hardware_output_muted"),
                                $.spawn("a").text(tr("Speakers/Headphones disabled"))
                            )
                        )
                    }
                    if(!client.properties.client_input_hardware) {
                        container_status_entries.append(
                            $.spawn("div").addClass("status-entry").append(
                                $.spawn("div").addClass("icon_em client-hardware_input_muted"),
                                $.spawn("a").text(tr("Microphone disabled"))
                            )
                        )
                    }
                    if(client.properties.client_output_muted) {
                        container_status_entries.append(
                            $.spawn("div").addClass("status-entry").append(
                                $.spawn("div").addClass("icon_em client-output_muted"),
                                $.spawn("a").text(tr("Speakers/Headphones Muted"))
                            )
                        )
                    }
                    if(client.properties.client_input_muted) {
                        container_status_entries.append(
                            $.spawn("div").addClass("status-entry").append(
                                $.spawn("div").addClass("icon_em client-input_muted"),
                                $.spawn("a").text(tr("Microphone Muted"))
                            )
                        )
                    }
                }
                container_status.toggle(container_status_entries.children().length > 0);
            }
            /* update client server groups */
            {
                const container_groups = this._html_tag.find(".client-group-server");
                container_groups.children().detach();
                if(client) {
                    const invalid_groups = [];
                    const groups = client.assignedServerGroupIds().map(group_id => {
                        const result = this.handle.handle.groups.serverGroup(group_id);
                        if(!result)
                            invalid_groups.push(group_id);
                        return result;
                    }).filter(e => !!e).sort(GroupManager.sorter());
                    for(const invalid_id of invalid_groups) {
                        container_groups.append($.spawn("a").text("{" + tr("server group ") + invalid_groups + "}").attr("title", tr("Missing server group id!") + " (" + invalid_groups + ")"));
                    }
                    for(let group of groups) {
                        container_groups.append(
                            $.spawn("div").addClass("group-container")
                                .append(
                                    this.handle.handle.fileManager.icons.generateTag(group.properties.iconid)
                                ).append(
                                    $.spawn("a").text(group.name).attr("title", tr("Group id: ") + group.id)
                                )
                        );
                    }
                }
            }
            /* update client channel group */
            {
                const container_group =  this._html_tag.find(".client-group-channel");
                container_group.children().detach();
                if(client) {
                    const group_id = client.assignedChannelGroup();
                    let group = this.handle.handle.groups.channelGroup(group_id);
                    if(group) {
                        container_group.append(
                            $.spawn("div").addClass("group-container")
                                .append(
                                    this.handle.handle.fileManager.icons.generateTag(group.properties.iconid)
                                ).append(
                                $.spawn("a").text(group.name).attr("title", tr("Group id: ") + group_id)
                            )
                        );
                    } else {
                        container_group.append($.spawn("a").text(tr("Invalid channel group!")).attr("title", tr("Missing channel group id!") + " (" + group_id + ")"));
                    }
                }
            }
        }
    }

    export enum FrameContent {
        NONE,
        PRIVATE_CHAT,
        CHANNEL_CHAT,
        CLIENT_INFO
    }

    export class Frame {
        readonly handle: ConnectionHandler;
        private _info_frame: InfoFrame;
        private _html_tag: JQuery;
        private _container_info: JQuery;
        private _container_chat: JQuery;
        private _content_type: FrameContent;

        private _conversations: PrivateConverations;
        private _client_info: ClientInfo;
        private _channel_conversations: channel.ConversationManager;

        constructor(handle: ConnectionHandler) {
            this.handle = handle;

            this._content_type = FrameContent.NONE;
            this._info_frame = new InfoFrame(this);
            this._conversations = new PrivateConverations(this);
            this._channel_conversations = new channel.ConversationManager(this);
            this._client_info = new ClientInfo(this);

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

            this._conversations && this._conversations.destroy();
            this._conversations = undefined;

            this._client_info && this._client_info.destroy();
            this._client_info = undefined;

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


        private_conversations() : PrivateConverations {
            return this._conversations;
        }

        channel_conversations() : channel.ConversationManager {
            return this._channel_conversations;
        }

        client_info() : ClientInfo {
            return this._client_info;
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
            this._container_chat.append(this._conversations.html_tag());
            this._conversations.on_show();
            this._info_frame.set_mode(InfoFrameMode.PRIVATE_CHAT);
        }

        show_channel_conversations() {
            if(this._content_type === FrameContent.CHANNEL_CHAT)
                return;

            this._clear();
            this._content_type = FrameContent.CHANNEL_CHAT;
            this._container_chat.append(this._channel_conversations.html_tag());
            this._channel_conversations.on_show();
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
}