import {Settings, settings} from "tc-shared/settings";
import {helpers} from "tc-shared/ui/frames/side/chat_helper";

declare function setInterval(handler: TimerHandler, timeout?: number, ...arguments: any[]): number;
declare function setTimeout(handler: TimerHandler, timeout?: number, ...arguments: any[]): number;

export class ChatBox {
    private _html_tag: JQuery;
    private _html_input: JQuery<HTMLDivElement>;
    private _enabled: boolean;
    private __callback_text_changed;
    private __callback_key_down;
    private __callback_key_up;
    private __callback_paste;

    private _typing_timeout: number; /* ID when the next callback_typing will be called */
    private _typing_last_event: number; /* timestamp of the last typing event */

    private _message_history: string[] = [];
    private _message_history_length = 100;
    private _message_history_index = 0;

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
        if(event && event.defaultPrevented)
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
        return typeof(element.innerText) === "string" ? element.innerText : "";
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

        let data = this._text(nodes.body);

        /* fix prefix & suffix new lines */
        {
            let prefix_length = 0, suffix_length = 0;
            {
                for(let i = 0; i < raw_text.length; i++)
                    if(raw_text.charAt(i) === '\n')
                        prefix_length++;
                    else if(raw_text.charAt(i) !== '\r')
                        break;
                for(let i = raw_text.length - 1; i >= 0; i++)
                    if(raw_text.charAt(i) === '\n')
                        suffix_length++;
                    else if(raw_text.charAt(i) !== '\r')
                        break;
            }

            data = data.replace(/^[\n\r]+|[\n\r]+$/g, '');
            data = "\n".repeat(prefix_length) + data + "\n".repeat(suffix_length);
        }
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