import * as React from "react";
import {useEffect, useRef, useState} from "react";
import {Registry} from "tc-shared/events";

import '!style-loader!css-loader!emoji-mart/css/emoji-mart.css'
import {Picker, emojiIndex} from 'emoji-mart'
import {settings, Settings} from "tc-shared/settings";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {getTwenmojiHashFromNativeEmoji} from "tc-shared/text/bbcode/EmojiUtil";
import {BaseEmoji} from "emoji-mart";
import {useGlobalSetting} from "tc-shared/ui/react-elements/Helper";

const cssStyle = require("./ChatBox.scss");

interface ChatBoxEvents {
    action_set_enabled: { enabled: boolean },

    action_request_focus: {},
    action_submit_message: {
        message: string
    },
    action_insert_text: {
        text: string,
        focus?: boolean
    },

    notify_typing: {}
}

const LastUsedEmoji = () => {
    const settingValue = useGlobalSetting(Settings.KEY_CHAT_LAST_USED_EMOJI);
    const lastEmoji: BaseEmoji = (emojiIndex.emojis[settingValue] || emojiIndex.emojis["joy"]) as any;
    if(!lastEmoji?.native) {
        return <img key={"fallback"} alt={""} src={"img/smiley-smile.svg"} />;
    }

    return (
        <img draggable={false} src={"https://twemoji.maxcdn.com/v/12.1.2/72x72/" + getTwenmojiHashFromNativeEmoji(lastEmoji.native) + ".png"} alt={lastEmoji.native} className={cssStyle.emoji} />
    )
}

const EmojiButton = (props: { events: Registry<ChatBoxEvents> }) => {
    const [ shown, setShown ] = useState(false);
    const [ enabled, setEnabled ] = useState(false);

    const refContainer = useRef();

    useEffect(() => {
        if(!shown) {
            return;
        }

        const clickListener = (event: MouseEvent) => {
            let target = event.target as HTMLElement;
            while(target && target !== refContainer.current)
                target = target.parentElement;

            if(target === refContainer.current && target)
                return;

            setShown(false);
        };

        document.addEventListener("click", clickListener);
        return () => document.removeEventListener("click", clickListener);
    });

    props.events.reactUse("action_set_enabled", event => setEnabled(event.enabled));
    props.events.reactUse("action_submit_message", () => setShown(false));

    return (
        <div className={cssStyle.containerEmojis} ref={refContainer}>
            <div className={cssStyle.button} onClick={() => enabled && setShown(true)}>
                <LastUsedEmoji />
            </div>
            <div className={cssStyle.picker} style={{ display: shown ? undefined : "none" }}>
                {!shown ? undefined :
                    <Picker
                        key={"picker"}
                        set={"twitter"}
                        theme={"light"}
                        showPreview={true}
                        title={""}
                        showSkinTones={true}
                        useButton={false}
                        native={false}

                        onSelect={(emoji: any) => {
                            if(enabled) {
                                settings.setValue(Settings.KEY_CHAT_LAST_USED_EMOJI, emoji.id as string);
                                props.events.fire("action_insert_text", { text: emoji.native, focus: true });
                            }
                        }}
                    />
                }
            </div>
        </div>
    );
};

const pasteTextTransformElement = document.createElement("div");

const nodeToText = (element: Node) => {
    if(element instanceof Text) {
        return element.textContent;
    } else if(element instanceof HTMLElement) {
        if(element instanceof HTMLImageElement) {
            return element.alt || element.title;
        } else if(element instanceof HTMLBRElement) {
            return '\n';
        } else if(element instanceof HTMLAnchorElement) {
            const content = [...element.childNodes].map(nodeToText).join("");

            if(element.href) {
                if(settings.getValue(Settings.KEY_CHAT_ENABLE_MARKDOWN)) {
                    if(content && element.title) {
                        return `[${content}](${element.href} "${element.title}")`;
                    } else if(content) {
                        return `[${content}](${element.href})`;
                    } else {
                        return `[${element.href}](${element.href})`;
                    }
                } else if(settings.getValue(Settings.KEY_CHAT_ENABLE_BBCODE)) {
                    if(content) {
                        return `[url=${element.href}]${content}"[/url]`;
                    } else {
                        return `[url]${element.href}"[/url]`;
                    }
                } else {
                    return element.href;
                }
            } else {
                return content;
            }
        }

        if(element.children.length > 0) {
            return [...element.childNodes].map(nodeToText).join("");
        }

        return typeof(element.innerText) === "string" ? element.innerText : "";
    } else {
        return "";
    }
};

const htmlEscape = (message: string) => {
    pasteTextTransformElement.innerText = message;
    message =  pasteTextTransformElement.innerHTML;
    return message.replace(/ /g, '&nbsp;');
};

const TextInput = (props: { events: Registry<ChatBoxEvents>, enabled?: boolean, placeholder?: string }) => {
    const [ enabled, setEnabled ] = useState(!!props.enabled);
    const [ historyIndex, setHistoryIndex ] = useState(-1);
    const history = useRef([]);
    const refInput = useRef<HTMLInputElement>();
    const typingTimeout = useRef(undefined);

    const triggerTyping = () => {
        if(typeof typingTimeout.current === "number")
            return;

        props.events.fire("notify_typing");
    };

    const setHistory = index => {
        setHistoryIndex(index);
        refInput.current.innerText = history.current[index] || "";

        const range = document.createRange();
        range.selectNodeContents(refInput.current);
        range.collapse(false);

        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    };

    const pasteHandler = (event: React.ClipboardEvent) => {
        triggerTyping();
        event.preventDefault();

        const clipboard = event.clipboardData || (window as any).clipboardData;
        if(!clipboard) return;

        const rawText = clipboard.getData('text/plain');
        const selection = window.getSelection();
        if (!selection.rangeCount) {
            return false;
        }

        let htmlXML = clipboard.getData('text/html');
        if(!htmlXML) {
            pasteTextTransformElement.textContent = rawText;
            htmlXML = pasteTextTransformElement.innerHTML;
        }

        const parser = new DOMParser();
        const nodes = parser.parseFromString(htmlXML, "text/html");

        let data = nodeToText(nodes.body);

        /* fix prefix & suffix new lines */
        {
            let prefix_length = 0, suffix_length = 0;
            {
                for (let i = 0; i < rawText.length; i++) {
                    if (rawText.charAt(i) === '\n') {
                        prefix_length++;
                    } else if (rawText.charAt(i) !== '\r') {
                        break;
                    }
                }

                for (let i = rawText.length - 1; i >= 0; i++) {
                    if (rawText.charAt(i) === '\n') {
                        suffix_length++;
                    } else if (rawText.charAt(i) !== '\r') {
                        break;
                    }
                }
            }

            data = data.replace(/^[\n\r]+|[\n\r]+$/g, '');
            data = "\n".repeat(prefix_length) + data + "\n".repeat(suffix_length);
        }
        event.preventDefault();

        selection.deleteFromDocument();
        document.execCommand('insertHTML', false, htmlEscape(data));
    };

    const keyDownHandler = (event: React.KeyboardEvent) => {
        triggerTyping();

        const inputEmpty = refInput.current.innerText.trim().length === 0;
        if(event.key === "Enter" && !event.shiftKey) {
            if(inputEmpty) {
                return;
            }

            const text = refInput.current.innerText;
            props.events.fire("action_submit_message", { message: text });
            history.current.push(text);
            while(history.current.length > 10) {
                history.current.pop_front();
            }

            refInput.current.innerText = "";
            setHistoryIndex(-1);
            event.preventDefault();
        } else if(event.key === "ArrowUp") {
            const inputOriginal = history.current[historyIndex] === refInput.current.innerText;
            if(inputEmpty && (historyIndex === -1 || !inputOriginal)) {
                setHistory(history.current.length - 1);
                event.preventDefault();
            } else if(historyIndex > 0 && inputOriginal) {
                setHistory(historyIndex - 1);
                event.preventDefault();
            }
        } else if(event.key === "ArrowDown") {
            if(history.current[historyIndex] === refInput.current.innerText) {
                if(historyIndex < history.current.length - 1) {
                    setHistory(historyIndex + 1);
                } else {
                    setHistory(-1);
                }
                event.preventDefault();
            }
        }
    };

    props.events.reactUse("action_request_focus", () => refInput.current?.focus());
    props.events.reactUse("notify_typing", () => {
        if(typeof typingTimeout.current === "number") {
            return;
        }

        typingTimeout.current = setTimeout(() => typingTimeout.current = undefined, 1000);
    });
    props.events.reactUse("action_insert_text", event => {
        refInput.current.innerHTML = refInput.current.innerHTML + event.text;
        if(event.focus) {
            refInput.current.focus();
        }
    });
    props.events.reactUse("action_set_enabled", event => {
        setEnabled(event.enabled);
        if(!event.enabled) {
            const text = refInput.current.innerText;
            if(text.trim().length !== 0)
                history.current.push(text);
            refInput.current.innerText = "";
        }
    });

    return (
        <div className={cssStyle.containerInput + " " + (!enabled ? cssStyle.disabled : "")}>
            <div
                ref={refInput}
                className={cssStyle.textarea}
                contentEditable={enabled}

                placeholder={enabled ? props.placeholder : tr("You can not write here.")}

                onPaste={pasteHandler}
                onKeyDown={keyDownHandler}

                defaultValue={historyIndex < 0 ? undefined : history[historyIndex]}
            />
        </div>
    );
};

export interface ChatBoxProperties {
    className?: string;
    onSubmit?: (text: string) => void;
    onType?: () => void;
}

export interface ChatBoxState {
    enabled: boolean;
}

const MarkdownFormatHelper = () => {
    const [ visible, setVisible ] = useState(settings.getValue(Settings.KEY_CHAT_ENABLE_MARKDOWN));

    settings.events.reactUse("notify_setting_changed", event => {
        if(event.setting !== Settings.KEY_CHAT_ENABLE_MARKDOWN.key) {
            return;
        }

        setVisible(settings.getValue(Settings.KEY_CHAT_ENABLE_MARKDOWN));
    });

    if(visible) {
        return (
            <div key={"help"} className={cssStyle.containerHelp}>*italic*, **bold**, ~~strikethrough~~, `code`, <Translatable>and more</Translatable>...</div>
        );
    } else {
        return (
            <div key={"placeholder"} className={cssStyle.containerHelp}>&nbsp;</div>
        );
    }
};

export class ChatBox extends React.Component<ChatBoxProperties, ChatBoxState> {
    readonly events = new Registry<ChatBoxEvents>();
    private callbackSubmit = event => this.props.onSubmit(event.message);
    private callbackType = () => this.props.onType && this.props.onType();

    constructor(props) {
        super(props);

        this.state = { enabled: false };
        this.events.enableDebug("chat-box");
    }

    componentDidMount(): void {
        this.events.on("action_submit_message", this.callbackSubmit);
        this.events.on("notify_typing", this.callbackType);
    }

    componentWillUnmount(): void {
        this.events.off("action_submit_message", this.callbackSubmit);
        this.events.off("notify_typing", this.callbackType);
    }

    render() {
        return (
            <div className={cssStyle.container + " " + this.props.className}>
                <div className={cssStyle.chatbox}>
                    <EmojiButton events={this.events} />
                    <TextInput events={this.events} placeholder={tr("Type your message here...")} />
                </div>
                <MarkdownFormatHelper />
            </div>
        )
    }

    componentDidUpdate(prevProps: Readonly<ChatBoxProperties>, prevState: Readonly<ChatBoxState>, snapshot?: any): void {
        if(prevState.enabled !== this.state.enabled) {
            this.events.fire_react("action_set_enabled", { enabled: this.state.enabled });
        }
    }
}