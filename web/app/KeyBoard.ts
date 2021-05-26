import {AbstractKeyBoard, EventType, KeyEvent} from "tc-shared/PPTListener";

export class WebKeyBoard extends AbstractKeyBoard {
    private readonly listenerBlur;
    private readonly listenerKeyPress;
    private readonly listenerKeyDown;
    private readonly listenerKeyUp;

    constructor() {
        super();

        this.listenerBlur = () => this.handleBlurEvent();
        this.listenerKeyPress = event => this.handleNativeKeyEvent(EventType.KEY_TYPED, event);
        this.listenerKeyDown = event => this.handleNativeKeyEvent(EventType.KEY_PRESS, event);
        this.listenerKeyUp = event => this.handleNativeKeyEvent(EventType.KEY_RELEASE, event);

        window.addEventListener("blur", () => this.handleBlurEvent());
        document.addEventListener('keypress', this.listenerKeyPress);
        document.addEventListener('keydown', this.listenerKeyDown);
        document.addEventListener('keyup', this.listenerKeyUp);
    }

    destroy() {
        window.removeEventListener("blur", () => this.handleBlurEvent());
        document.removeEventListener('keypress', this.listenerKeyPress);
        document.removeEventListener('keydown', this.listenerKeyDown);
        document.removeEventListener('keyup', this.listenerKeyUp);
    }

    private handleNativeKeyEvent(type: EventType, nativeEvent: KeyboardEvent) {
        const event: KeyEvent = {
            type: type,

            key: nativeEvent.key,
            keyCode: nativeEvent.code,

            keyCtrl: nativeEvent.ctrlKey,
            keyShift: nativeEvent.shiftKey,
            keyAlt: nativeEvent.altKey,
            keyWindows: nativeEvent.metaKey,
        };

        this.fireKeyEvent(event);
    }

    private handleBlurEvent() {
        this.resetKeyboardState();
    }
}