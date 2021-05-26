import * as React from "react";
import {Settings, settings} from "tc-shared/settings";
import {LogCategory, logWarn} from "tc-shared/log";

const cssStyle = require("./ContextDivider.scss");

export interface ContextDividerProperties {
    id: string;
    direction: "vertical" | "horizontal";

    defaultValue: number; /* [0;100] */

    separatorClassName?: string;
    separatorActiveClassName?: string;

    children?: never;
}

export interface ContextDividerState {
    active: boolean;
}

export class ContextDivider extends React.PureComponent<ContextDividerProperties, ContextDividerState> {
    private readonly refSeparator = React.createRef<HTMLDivElement>();
    private readonly listenerMove;
    private readonly listenerUp;

    private observer: MutationObserver;
    private value;

    constructor(props) {
        super(props);

        this.state = {
            active: false
        };

        this.value = this.props.defaultValue;
        try {
            const config = JSON.parse(settings.getValue(Settings.FN_SEPARATOR_STATE(this.props.id), undefined));
            if(typeof config.value !== "number")
                throw "Invalid value";

            this.value = config.value;
        } catch (e) { }

        this.listenerMove = (event: MouseEvent | TouchEvent) => {
            const separator = this.refSeparator.current;
            if(!separator) {
                this.setState({ active: false });
                return;
            }

            const previousElement = separator.previousElementSibling as HTMLElement;
            const nextElement = separator.nextElementSibling as HTMLElement;

            const beforeBounds = previousElement.getBoundingClientRect();
            const afterBounds = nextElement.getBoundingClientRect();

            let min: number, max: number;

            if(this.props.direction === "horizontal") {
                min = Math.min(beforeBounds.left, afterBounds.left);
                if(min === beforeBounds.left) {
                    max = afterBounds.left + afterBounds.width;
                } else {
                    max = beforeBounds.left + beforeBounds.width;
                }
            } else {
                min = Math.min(beforeBounds.top, afterBounds.top);
                if(min === beforeBounds.top) {
                    max = afterBounds.top + afterBounds.height;
                } else {
                    max = beforeBounds.top + beforeBounds.height;
                }
            }

            const current = event instanceof MouseEvent ?
                (this.props.direction === "horizontal" ? event.pageX : event.pageY) :
                (this.props.direction === "horizontal" ? event.touches[event.touches.length - 1].clientX : event.touches[event.touches.length - 1].clientY);

            if(current < min) {
                this.value = 0;
            } else if(current < max) {
                const x_offset = current - min;
                const x_offset_max = max - min;

                this.value = x_offset * 100 / x_offset_max;
            } else {
                this.value = 100;
            }

            this.applySeparator(separator.previousElementSibling as HTMLElement, separator.nextElementSibling as HTMLElement);
        };

        this.listenerUp = () => this.stopMovement();
    }

    render() {
        let separatorClassNames = cssStyle.separator;

        if(this.props.direction === "vertical") {
            separatorClassNames += " " + cssStyle.vertical;
        } else {
            separatorClassNames += " " + cssStyle.horizontal;
        }

        if(this.props.separatorClassName) {
            separatorClassNames += " " + this.props.separatorClassName;
        }

        if(this.state.active && this.props.separatorClassName) {
            separatorClassNames += " " + this.props.separatorClassName;
        }

        return (
            <div key={"context-separator"} ref={this.refSeparator} className={separatorClassNames} onMouseDown={e => this.startMovement(e)} onTouchStart={e => this.startMovement(e)} />
        );
    }

    componentDidMount(): void {
        this.observer = new MutationObserver(() => {
            this.tryApplySeparator();
        });

        this.observer.observe(this.refSeparator.current.parentElement, {
            attributes: false,
            childList: true,
            subtree: false,
            characterData: false,
        });

        this.tryApplySeparator();
    }

    componentWillUnmount(): void {
        this.stopMovement();

        this.observer.disconnect();
        this.observer = undefined;
    }

    private startMovement(event: React.MouseEvent | React.TouchEvent) {
        this.setState({ active: true });

        document.addEventListener('mousemove', this.listenerMove);
        document.addEventListener('touchmove', this.listenerMove);

        document.addEventListener('mouseup', this.listenerUp);
        document.addEventListener('touchend', this.listenerUp);
        document.addEventListener('touchcancel', this.listenerUp);
        document.documentElement.classList.add(cssStyle.documentActiveClass);

        this.listenerMove(event.nativeEvent);
    }

    private stopMovement() {
        this.setState({ active: false });
        document.removeEventListener('mousemove', this.listenerMove);
        document.removeEventListener('touchmove', this.listenerMove);

        document.removeEventListener('mouseup', this.listenerUp);
        document.removeEventListener('touchend', this.listenerUp);
        document.removeEventListener('touchcancel', this.listenerUp);
        document.documentElement.classList.remove(cssStyle.documentActiveClass);

        settings.setValue(Settings.FN_SEPARATOR_STATE(this.props.id), JSON.stringify({
            value: this.value
        }));
    }

    private tryApplySeparator() {
        const separator = this.refSeparator.current;
        if(!separator) return;

        this.applySeparator(separator.previousSibling as HTMLElement, separator.nextSibling as HTMLElement);
    }

    private applySeparator(previousElement: HTMLElement, nextElement: HTMLElement) {
        if(!this.refSeparator.current || !previousElement || !nextElement) {
            return;
        }

        if(this.props.direction === "horizontal") {
            const center = this.refSeparator.current.clientWidth;
            previousElement.style.width = `calc(${this.value}% - ${center / 2}px)`;
            nextElement.style.width = `calc(${100 - this.value}% - ${center / 2}px)`;
        } else {
            const center = this.refSeparator.current.clientHeight;

            previousElement.style.height = `calc(${this.value}% - ${center / 2}px)`;
            nextElement.style.height = `calc(${100 - this.value}% - ${center / 2}px)`;
        }
    }
}