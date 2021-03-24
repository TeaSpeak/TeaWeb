import { tr } from "./i18n/localize";
import {LogCategory, logTrace} from "tc-shared/log";

export enum KeyCode {
    KEY_CANCEL = 3,
    KEY_HELP = 6,
    KEY_BACK_SPACE = 8,
    KEY_TAB = 9,
    KEY_CLEAR = 12,
    KEY_RETURN = 13,
    KEY_ENTER = 14,
    KEY_SHIFT = 16,
    KEY_CONTROL = 17,
    KEY_ALT = 18,
    KEY_PAUSE = 19,
    KEY_CAPS_LOCK = 20,
    KEY_ESCAPE = 27,
    KEY_SPACE = 32,
    KEY_PAGE_UP = 33,
    KEY_PAGE_DOWN = 34,
    KEY_END = 35,
    KEY_HOME = 36,
    KEY_LEFT = 37,
    KEY_UP = 38,
    KEY_RIGHT = 39,
    KEY_DOWN = 40,
    KEY_PRINTSCREEN = 44,
    KEY_INSERT = 45,
    KEY_DELETE = 46,
    KEY_0 = 48,
    KEY_1 = 49,
    KEY_2 = 50,
    KEY_3 = 51,
    KEY_4 = 52,
    KEY_5 = 53,
    KEY_6 = 54,
    KEY_7 = 55,
    KEY_8 = 56,
    KEY_9 = 57,
    KEY_SEMICOLON = 59,
    KEY_EQUALS = 61,
    KEY_A = 65,
    KEY_B = 66,
    KEY_C = 67,
    KEY_D = 68,
    KEY_E = 69,
    KEY_F = 70,
    KEY_G = 71,
    KEY_H = 72,
    KEY_I = 73,
    KEY_J = 74,
    KEY_K = 75,
    KEY_L = 76,
    KEY_M = 77,
    KEY_N = 78,
    KEY_O = 79,
    KEY_P = 80,
    KEY_Q = 81,
    KEY_R = 82,
    KEY_S = 83,
    KEY_T = 84,
    KEY_U = 85,
    KEY_V = 86,
    KEY_W = 87,
    KEY_X = 88,
    KEY_Y = 89,
    KEY_Z = 90,
    KEY_LEFT_CMD = 91,
    KEY_RIGHT_CMD = 93,
    KEY_CONTEXT_MENU = 93,
    KEY_NUMPAD0 = 96,
    KEY_NUMPAD1 = 97,
    KEY_NUMPAD2 = 98,
    KEY_NUMPAD3 = 99,
    KEY_NUMPAD4 = 100,
    KEY_NUMPAD5 = 101,
    KEY_NUMPAD6 = 102,
    KEY_NUMPAD7 = 103,
    KEY_NUMPAD8 = 104,
    KEY_NUMPAD9 = 105,
    KEY_MULTIPLY = 106,
    KEY_ADD = 107,
    KEY_SEPARATOR = 108,
    KEY_SUBTRACT = 109,
    KEY_DECIMAL = 110,
    KEY_DIVIDE = 111,
    KEY_F1 = 112,
    KEY_F2 = 113,
    KEY_F3 = 114,
    KEY_F4 = 115,
    KEY_F5 = 116,
    KEY_F6 = 117,
    KEY_F7 = 118,
    KEY_F8 = 119,
    KEY_F9 = 120,
    KEY_F10 = 121,
    KEY_F11 = 122,
    KEY_F12 = 123,
    KEY_F13 = 124,
    KEY_F14 = 125,
    KEY_F15 = 126,
    KEY_F16 = 127,
    KEY_F17 = 128,
    KEY_F18 = 129,
    KEY_F19 = 130,
    KEY_F20 = 131,
    KEY_F21 = 132,
    KEY_F22 = 133,
    KEY_F23 = 134,
    KEY_F24 = 135,
    KEY_NUM_LOCK = 144,
    KEY_SCROLL_LOCK = 145,
    KEY_COMMA = 188,
    KEY_PERIOD = 190,
    KEY_SLASH = 191,
    KEY_BACK_QUOTE = 192,
    KEY_OPEN_BRACKET = 219,
    KEY_BACK_SLASH = 220,
    KEY_CLOSE_BRACKET = 221,
    KEY_QUOTE = 222,
    KEY_META = 224
}

export enum EventType {
    KEY_PRESS,
    KEY_RELEASE,
    KEY_TYPED
}

export enum SpecialKey {
    CTRL,
    WINDOWS,
    SHIFT,
    ALT
}

export interface KeyDescriptor {
    keyCode: string;

    keyCtrl: boolean;
    keyWindows: boolean;
    keyShift: boolean;
    keyAlt: boolean;
}

export interface KeyEvent extends KeyDescriptor {
    readonly type: EventType;
    readonly key: string;
}

export interface KeyHook extends Partial<KeyDescriptor> {
    callbackPress: () => any;
    callbackRelease: () => any;
}

interface RegisteredKeyHook extends KeyHook {
    triggered: boolean
}

export interface KeyBoardBackend {
    registerListener(listener: (event: KeyEvent) => void);
    unregisterListener(listener: (event: KeyEvent) => void);

    registerHook(hook: KeyHook) : () => void;
    unregisterHook(hook: KeyHook);

    isKeyPressed(key: string | SpecialKey) : boolean;
}

export class AbstractKeyBoard implements KeyBoardBackend {
    protected readonly registeredListener: ((event: KeyEvent) => void)[];
    protected readonly activeSpecialKeys: { [key: number] : boolean };
    protected readonly activeKeys;

    protected registeredKeyHooks: RegisteredKeyHook[] = [];

    constructor() {
        this.activeSpecialKeys = {};
        this.activeKeys = {};
        this.registeredListener = [];
    }

    protected destroy() {}

    isKeyPressed(key: string | SpecialKey): boolean {
        if(typeof(key) === 'string') {
            return typeof this.activeKeys[key] !== "undefined";
        }

        return this.activeSpecialKeys[key];
    }

    registerHook(hook: KeyHook) {
        const registeredHook: RegisteredKeyHook = {
            triggered: false,
            ...hook
        };

        this.registeredKeyHooks.push(registeredHook);
        if(this.shouldHookBeActive(registeredHook)) {
            registeredHook.triggered = true;
            registeredHook.callbackPress();
        }

        return () => this.unregisterHook(hook);
    }

    unregisterHook(hook: KeyHook) {
        if(!("triggered" in hook)) {
            return;
        }

        this.registeredKeyHooks.remove(hook);
    }

    registerListener(listener: (event: KeyEvent) => void) {
        this.registeredListener.push(listener);
    }

    unregisterListener(listener: (event: KeyEvent) => void) {
        this.registeredListener.remove(listener);
    }

    private shouldHookBeActive(hook: KeyHook) {
        if(typeof hook.keyAlt !== "undefined" && hook.keyAlt != this.activeSpecialKeys[SpecialKey.ALT]) {
            return false;
        }

        if(typeof hook.keyCtrl !== "undefined" && hook.keyCtrl != this.activeSpecialKeys[SpecialKey.CTRL]) {
            return false;
        }

        if(typeof hook.keyShift !== "undefined" && hook.keyShift != this.activeSpecialKeys[SpecialKey.SHIFT]) {
            return false;
        }

        if(typeof hook.keyWindows !== "undefined" && hook.keyWindows != this.activeSpecialKeys[SpecialKey.WINDOWS]) {
            return false;
        }

        return typeof hook.keyCode === "undefined" || typeof this.activeKeys[hook.keyCode] !== "undefined";
    }

    protected fireKeyEvent(event: KeyEvent) {
        //console.debug("Trigger key event %o", key_event);
        for(const listener of this.registeredListener) {
            listener(event);
        }

        if(event.type == EventType.KEY_TYPED) {
            return;
        }

        this.activeSpecialKeys[SpecialKey.ALT] = event.keyAlt;
        this.activeSpecialKeys[SpecialKey.CTRL] = event.keyCtrl;
        this.activeSpecialKeys[SpecialKey.SHIFT] = event.keyShift;
        this.activeSpecialKeys[SpecialKey.WINDOWS] = event.keyWindows;
        if(event.type == EventType.KEY_PRESS) {
            this.activeKeys[event.keyCode] = event;
        } else {
            delete this.activeKeys[event.keyCode];
        }


        for(const hook of this.registeredKeyHooks) {
            const hookActive = this.shouldHookBeActive(hook);
            if(hookActive === hook.triggered) {
                continue;
            }

            hook.triggered = hookActive;
            if(hookActive) {
                if(hook.callbackPress) {
                    hook.callbackPress();
                }
            } else {
                if(hook.callbackRelease) {
                    hook.callbackRelease();
                }
            }
        }
    }

    protected resetKeyboardState() {
        this.activeSpecialKeys[SpecialKey.ALT] = false;
        this.activeSpecialKeys[SpecialKey.CTRL] = false;
        this.activeSpecialKeys[SpecialKey.SHIFT] = false;
        this.activeSpecialKeys[SpecialKey.WINDOWS] = false;

        for(const code of Object.keys(this.activeKeys)) {
            delete this.activeKeys[code];
        }

        for(const hook of this.registeredKeyHooks) {
            if(hook.triggered) {
                if(hook.callbackRelease) {
                    hook.callbackRelease();
                }

                hook.triggered = false;
            }
        }
    }
}

let keyBoardBackend: KeyBoardBackend;
export function getKeyBoard() : KeyBoardBackend {
    return keyBoardBackend;
}

export function setKeyBoardBackend(newBackend: KeyBoardBackend) {
    keyBoardBackend = newBackend;
}

export function getKeyDescription(key: KeyDescriptor) {
    let result = "";
    if(key.keyShift) {
        result += " + " + tr("Shift");
    }

    if(key.keyAlt) {
        result += " + " + tr("Alt");
    }

    if(key.keyCtrl) {
        result += " + " + tr("CTRL");
    }

    if(key.keyWindows) {
        result += " + " + tr("Win");
    }

    if(key.keyCode) {
        let keyName;
        if(key.keyCode.startsWith("Key")) {
            keyName = key.keyCode.substr(3);
        } else if(key.keyCode.startsWith("Digit")) {
            keyName = key.keyCode.substr(5);
        } else if(key.keyCode.startsWith("Numpad")) {
            keyName = "Numpad " + key.keyCode.substr(6);
        } else {
            keyName = key.keyCode;
        }
        result += " + " + keyName;
    }
    return result ? result.substr(3) : tr("unset");
}