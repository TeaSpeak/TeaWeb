import * as React from "react";
import {Tooltip} from "tc-shared/ui/react-elements/Tooltip";
import {ReactElement} from "react";
const cssStyle = require("./Slider.scss");

export interface SliderProperties {
    minValue: number;
    maxValue: number;
    stepSize: number;

    value: number;

    disabled?: boolean;
    className?: string;

    unit?: string;
    tooltip?: (value: number) => ReactElement | string;

    onInput?: (value: number) => void;
    onChange?: (value: number) => void;

    children?: never;
}

export interface SliderState {
    value: number;
    active: boolean;

    disabled?: boolean;
}

export class Slider extends React.Component<SliderProperties, SliderState> {
    private documentListenersRegistered = false;
    private lastValue: number;

    private readonly mouseListener;
    private readonly mouseUpListener;

    private readonly refTooltip = React.createRef<Tooltip>();
    private readonly refSlider = React.createRef<HTMLDivElement>();

    constructor(props) {
        super(props);

        this.state = {
            value: this.props.value,
            active: false
        };

        this.mouseListener = (event: MouseEvent | TouchEvent) => {
            if(!this.refSlider.current) return;

            const container = this.refSlider.current;

            const bounds = container.getBoundingClientRect();
            const min = bounds.left;
            const max = bounds.left + container.clientWidth;
            const current = ('touches' in event && Array.isArray(event.touches) && event.touches.length > 0) ? event.touches[event.touches.length - 1].clientX : (event as MouseEvent).pageX;

            const range = this.props.maxValue - this.props.minValue;
            let offset = Math.round(((current - min) * (range / this.props.stepSize)) / (max - min)) * this.props.stepSize;
            if(offset < 0)
                offset = 0;
            else if(offset > range)
                offset = range;

            this.refTooltip.current.setState({
                pageX: bounds.left + offset * bounds.width / range,
            });

            //console.log("Min: %o | Max: %o | %o (%o)", min, max, current, offset);
            this.setState({ value: this.lastValue = (this.props.minValue + offset) });
            if(this.props.onInput) this.props.onInput(this.lastValue);
        };

        this.mouseUpListener = event => {
            event.preventDefault();

            this.setState({ active: false });
            this.unregisterDocumentListener();
            if(this.props.onChange) this.props.onChange(this.lastValue);
            this.refTooltip.current?.setState({ forceShow: false });
        };
    }

    private unregisterDocumentListener() {
        if(!this.documentListenersRegistered) return;
        this.documentListenersRegistered = false;

        document.removeEventListener('mousemove', this.mouseListener);
        document.removeEventListener('touchmove', this.mouseListener);

        document.removeEventListener('mouseup', this.mouseUpListener);
        document.removeEventListener('mouseleave', this.mouseUpListener);
        document.removeEventListener('touchend', this.mouseUpListener);
        document.removeEventListener('touchcancel', this.mouseUpListener);
    }

    private registerDocumentListener() {
        if(this.documentListenersRegistered) return;
        this.documentListenersRegistered = true;

        document.addEventListener('mousemove', this.mouseListener);
        document.addEventListener('touchmove', this.mouseListener);

        document.addEventListener('mouseup', this.mouseUpListener);
        document.addEventListener('mouseleave', this.mouseUpListener);
        document.addEventListener('touchend', this.mouseUpListener);
        document.addEventListener('touchcancel', this.mouseUpListener);
    }

    componentWillUnmount(): void {
        this.unregisterDocumentListener();
    }

    render() {
        const disabled = typeof this.state.disabled === "boolean" ? this.state.disabled : this.props.disabled;
        const offset = (this.state.value - this.props.minValue) * 100 / (this.props.maxValue - this.props.minValue);
        return (
            <div
                className={cssStyle.container + " " + (this.props.className || " ") + " " + (disabled ? cssStyle.disabled : "")}
                ref={this.refSlider}

                onMouseDown={e => this.enableSliderMode(e)}
                onTouchStart={e => this.enableSliderMode(e)}
            >
                <div className={cssStyle.filler} style={{right: (100 - offset) + "%"}} />
                <Tooltip ref={this.refTooltip} tooltip={() => this.props.tooltip ? this.props.tooltip(this.state.value) : this.renderTooltip()}>
                    <div className={cssStyle.thumb} style={{left: offset + "%"}} />
                </Tooltip>
            </div>
        );
    }

    private enableSliderMode(event: React.MouseEvent | React.TouchEvent) {
        this.setState({ active: true });
        this.registerDocumentListener();
        this.mouseListener(event);
        this.refTooltip.current?.setState({ forceShow: true });
    }

    private renderTooltip() {
        return <a>{this.state.value + (this.props.unit || "")}</a>;
    }

    componentDidUpdate(prevProps: Readonly<SliderProperties>, prevState: Readonly<SliderState>, snapshot?: any): void {
        if(this.state.disabled !== prevState.disabled) {
            if(this.state.disabled) {
                this.unregisterDocumentListener();
            }
        }
    }
}