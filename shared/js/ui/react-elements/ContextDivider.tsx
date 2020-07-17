import * as React from "react";
import {settings} from "tc-shared/settings";
const cssStyle = require("./ContextDivider.scss");

export interface ContextDividerProperties {
    id: string;
    direction: "vertical" | "horizontal";

    defaultValue: number; /* [0;100] */

    separatorClassName?: string;
    separatorActiveClassName?: string;

    children: [React.ReactElement, React.ReactElement];
}

export interface ContextDividerState {
    active: boolean;
}

export class ContextDivider extends React.Component<ContextDividerProperties, ContextDividerState> {
    private readonly refSeparator = React.createRef<HTMLDivElement>();
    private readonly listenerMove;
    private readonly listenerUp;

    private value;

    constructor(props) {
        super(props);

        this.state = {
            active: false
        };

        this.value = this.props.defaultValue;
        try {
            const config = JSON.parse(settings.global("separator-settings-" + this.props.id));
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
            const parentBounds = separator.parentElement.getBoundingClientRect();

            const min = this.props.direction === "horizontal" ? parentBounds.left : parentBounds.top;
            const max = this.props.direction === "horizontal" ? parentBounds.left + parentBounds.width : parentBounds.top + parentBounds.height;
            const current = event instanceof MouseEvent ?
                (this.props.direction === "horizontal" ? event.pageX : event.pageY) :
                (this.props.direction === "horizontal" ? event.touches[event.touches.length - 1].clientX : event.touches[event.touches.length - 1].clientY);

            /*
            const previous_offset = previous_element.offset();
            const next_offset = next_element.offset();

            const min = vertical ? Math.min(previous_offset.left, next_offset.left) : Math.min(previous_offset.top, next_offset.top);
            const max = vertical ?
                Math.max(previous_offset.left + previous_element.width(), next_offset.left + next_element.width()) :
                Math.max(previous_offset.top + previous_element.height(), next_offset.top + next_element.height());
            */

            if(current < min) {
                this.value = 0;
            } else if(current < max) {
                const x_offset = current - min;
                const x_offset_max = max - min;

                this.value = x_offset * 100 / x_offset_max;
            } else {
                this.value = 100;
            }

            settings.changeGlobal("separator-settings-" + this.props.id, JSON.stringify({
                value: this.value
            }));
            this.applySeparator(separator.previousSibling as HTMLElement, separator.nextSibling as HTMLElement);
        };

        this.listenerUp = () => this.stopMovement();
    }

    render() {
        let separatorClassNames = cssStyle.separator;

        if(this.props.direction === "vertical")
            separatorClassNames += " " + cssStyle.vertical;
        else
            separatorClassNames += " " + cssStyle.horizontal;

        if(this.props.separatorClassName)
            separatorClassNames += " " + this.props.separatorClassName;

        if(this.state.active && this.props.separatorClassName)
            separatorClassNames += " " + this.props.separatorClassName;

        return [
            this.props.children[0],
            <div key={"context-separator"} ref={this.refSeparator} className={separatorClassNames} onMouseDown={e => this.startMovement(e)} onTouchStart={e => this.startMovement(e)} />,
            this.props.children[1]
        ];
    }

    componentDidMount(): void {
        const separator = this.refSeparator.current;
        if(!separator) return;

        this.applySeparator(separator.previousSibling as HTMLElement, separator.nextSibling as HTMLElement);
    }

    componentWillUnmount(): void {
        this.stopMovement();
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
    }

    private applySeparator(previousElement: HTMLElement, nextElement: HTMLElement) {
        if(!this.refSeparator.current || !previousElement || !nextElement)
            return;

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