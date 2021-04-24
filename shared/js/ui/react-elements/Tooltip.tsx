import * as React from "react";
import * as ReactDOM from "react-dom";
import {ReactElement, ReactNode} from "react";
import {guid} from "tc-shared/crypto/uid";

const cssStyle = require("./Tooltip.scss");

interface GlobalTooltipState {
    pageX: number;
    pageY: number;
    tooltipId: string;
}

const globalTooltipRef = React.createRef<GlobalTooltip>();
class GlobalTooltip extends React.Component<{}, GlobalTooltipState> {
    private currentTooltip_: Tooltip;
    private isUnmount: boolean;

    constructor(props) {
        super(props);

        this.state = {
            pageX: 0,
            pageY: 0,
            tooltipId: "unset"
        };
    }

    currentTooltip() {
        return this.currentTooltip_;
    }

    updateTooltip(provider?: Tooltip) {
        this.currentTooltip_ = provider;
        this.forceUpdate();
        this.isUnmount = false;
    }

    unmountTooltip(element: Tooltip) {
        if(element !== this.currentTooltip_)
            return;

        this.isUnmount = true;
        this.forceUpdate(() => {
            if(this.currentTooltip_ === element)
                this.currentTooltip_ = undefined;
        });
    }

    render() {
        if(!this.currentTooltip_ || this.isUnmount) {
            return (
                <div className={cssStyle.container} style={{ top: this.state.pageY, left: this.state.pageX }}>
                    <React.Fragment key={this.state.tooltipId}>{this.currentTooltip_?.props.tooltip()}</React.Fragment>
                </div>
            );
        }

        return (
            <div className={cssStyle.container + " " + cssStyle.shown} style={{ top: this.state.pageY, left: this.state.pageX }}>
                {this.currentTooltip_.props.tooltip()}
            </div>
        )
    }
}

export interface TooltipState {
    forceShow: boolean;
    hovered: boolean;

    pageX: number;
    pageY: number;
}

export interface TooltipProperties {
    tooltip: () => ReactNode | ReactNode[] | string;
    className?: string;

    /**
     * Enable the tooltip already when the span is hovered
     */
    spawnHover?: boolean,
}

export class Tooltip extends React.PureComponent<TooltipProperties, TooltipState> {
    readonly tooltipId = guid();
    private refContainer = React.createRef<HTMLSpanElement>();
    private currentContainer: HTMLElement;

    constructor(props) {
        super(props);

        this.state = {
            forceShow: false,
            hovered: false,
            pageX: 0,
            pageY: 0
        };
    };

    componentWillUnmount(): void {
        globalTooltipRef.current?.unmountTooltip(this);
    }

    render() {
        return (
            <span
                ref={this.refContainer}
                onMouseEnter={event => this.onMouseEnter(event)}
                onMouseLeave={() => this.setState({ hovered: false })}
                onClick={() => this.setState({ hovered: !this.state.hovered })}
                style={{ cursor: "pointer" }}
                className={this.props.className}
            >
                {this.props.children}
            </span>
        );
    }

    componentDidUpdate(prevProps: Readonly<TooltipProperties>, prevState: Readonly<TooltipState>, snapshot?: any): void {
        if(this.state.forceShow || this.state.hovered) {
            globalTooltipRef.current?.setState({
                pageY: this.state.pageY,
                pageX: this.state.pageX,
                tooltipId: this.tooltipId
            });
            globalTooltipRef.current?.updateTooltip(this);
        } else if(prevState.forceShow || prevState.hovered) {
            globalTooltipRef.current?.unmountTooltip(this);
        }
    }

    private onMouseEnter(event: React.MouseEvent) {
        if(typeof this.props.spawnHover !== "boolean" || !this.props.spawnHover) {
            /* check if may only the span has been hovered, should not be the case! */
            if(event.target === this.refContainer.current) {
                return;
            }

            let container = event.target as HTMLElement;
            while(container.parentElement !== this.refContainer.current) {
                container = container.parentElement;
            }
            this.currentContainer = container;
        } else {
            this.currentContainer = this.refContainer.current;
        }

        this.setState({ hovered: true });
        this.updatePosition();
    }

    updatePosition() {
        const container = this.currentContainer || this.refContainer.current?.children.item(0) || this.refContainer.current;
        if(!container) {
            return;
        }

        const rect = container.getBoundingClientRect();
        this.setState({
            pageY: rect.top,
            pageX: rect.left + rect.width / 2
        });
    }
}

export const IconTooltip = (props: { children?: React.ReactNode | React.ReactNode[], className?: string, outerClassName?: string }) => (
    <Tooltip tooltip={() => props.children} className={props.outerClassName}>
        <div className={cssStyle.iconTooltip + " " + props.className}>
            <img src="img/icon_tooltip.svg" alt={""} />
        </div>
    </Tooltip>
);

export const TooltipHook = React.memo(() => <GlobalTooltip ref={globalTooltipRef} />);