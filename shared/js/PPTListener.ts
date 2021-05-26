import { tr } from "./i18n/localize";

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