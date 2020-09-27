import {ReactComponentBase} from "tc-shared/ui/react-elements/ReactComponentBase";
import * as React from "react";
import * as ReactDOM from "react-dom";
import {LogCategory, logWarn} from "tc-shared/log";

const moveStyle = require("./TreeEntryMove.scss");

export interface TreeEntryMoveProps {
    onMoveEnd: (point: { x: number, y: number }) => void;
    onMoveCancel: () => void;
}

export interface TreeEntryMoveState {
    active: boolean;
    begin: { x: number, y: number };
    description: string;
}

export class RendererMove extends ReactComponentBase<TreeEntryMoveProps, TreeEntryMoveState> {
    private readonly domContainer;
    private readonly documentMouseOutListener;
    private readonly documentMouseListener;
    private readonly refContainer: React.RefObject<HTMLDivElement>;

    private current: { x: number, y: number };

    constructor(props) {
        super(props);

        this.refContainer = React.createRef();

        this.domContainer = document.createElement("div");
        this.documentMouseOutListener = (e: MouseEvent) => {
            if (e.type === "mouseup") {
                if (e.button !== 0) return;

                this.props.onMoveEnd({x: e.pageX, y: e.pageY});
            } else {
                this.props.onMoveCancel();
            }

            this.disableEntryMove();
        };

        this.documentMouseListener = (e: MouseEvent) => {
            this.current = {x: e.pageX, y: e.pageY};
            const container = this.refContainer.current;
            if (!container) return;

            container.style.top = e.pageY + "px";
            container.style.left = e.pageX + "px";
        };
    }

    componentDidMount() {
        document.body.append(this.domContainer);
    }

    componentWillUnmount() {
        this.domContainer.remove();
    }

    enableEntryMove(description: string, begin: { x: number, y: number }, current: { x: number, y: number }, callback_enabled?: () => void) {
        this.current = current;
        this.setState({
            active: true,
            begin: begin,
            description: description
        }, callback_enabled);

        document.addEventListener("mousemove", this.documentMouseListener);
        document.addEventListener("mouseleave", this.documentMouseOutListener);
        document.addEventListener("mouseup", this.documentMouseOutListener);
    }

    private disableEntryMove() {
        this.setState({
            active: false
        });
        document.removeEventListener("mousemove", this.documentMouseListener);
        document.removeEventListener("mouseleave", this.documentMouseOutListener);
        document.removeEventListener("mouseup", this.documentMouseOutListener);
    }

    protected defaultState(): TreeEntryMoveState {
        return {
            active: false,
            begin: { x: 0, y: 0 },
            description: ""
        }
    }

    isActive() {
        return this.state.active;
    }

    render() {
        if (!this.state.active)
            return null;

        return ReactDOM.createPortal(this.renderPortal(), this.domContainer);
    }

    private renderPortal() {
        if(!this.current) {
            logWarn(LogCategory.CHANNEL, tr("Tried to render the move container without a current position"));
            return null;
        }
        return (
            <div style={{ top: this.current.y, left: this.current.x }} className={moveStyle.moveContainer}
                 ref={this.refContainer}>
                {this.state.description}
            </div>
        );
    }
}