import {ReactComponentBase} from "tc-shared/ui/react-elements/ReactComponentBase";
import * as React from "react";
import * as ReactDOM from "react-dom";
import {ChannelTreeView} from "tc-shared/ui/tree/RendererView";

const moveStyle = require("./TreeEntryMove.scss");

export interface TreeEntryMoveProps {
    onMoveEnd: (point: { x: number, y: number }) => void;
}

export interface TreeEntryMoveState {
    tree_view: ChannelTreeView;

    begin: { x: number, y: number };
    description: string;
}

export class TreeEntryMove extends ReactComponentBase<TreeEntryMoveProps, TreeEntryMoveState> {
    private readonly domContainer;
    private readonly document_mouse_out_listener;
    private readonly document_mouse_listener;
    private readonly ref_container: React.RefObject<HTMLDivElement>;

    private current: { x: number, y: number };

    constructor(props) {
        super(props);

        this.ref_container = React.createRef();
        this.domContainer = document.getElementById("mouse-move");
        this.document_mouse_out_listener = (e: MouseEvent) => {
            if (e.type === "mouseup") {
                if (e.button !== 0) return;

                this.props.onMoveEnd({x: e.pageX, y: e.pageY});
            }

            this.disableEntryMove();
        };

        this.document_mouse_listener = (e: MouseEvent) => {
            this.current = {x: e.pageX, y: e.pageY};
            const container = this.ref_container.current;
            if (!container) return;

            container.style.top = e.pageY + "px";
            container.style.left = e.pageX + "px";
        };
    }

    enableEntryMove(view: ChannelTreeView, description: string, begin: { x: number, y: null }, current: { x: number, y: null }, callback_enabled?: () => void) {
        this.setState({
            tree_view: view,
            begin: begin,
            description: description
        }, callback_enabled);

        this.current = current;
        document.addEventListener("mousemove", this.document_mouse_listener);
        document.addEventListener("mouseleave", this.document_mouse_out_listener);
        document.addEventListener("mouseup", this.document_mouse_out_listener);
    }

    private disableEntryMove() {
        this.setState({
            tree_view: null
        });
        document.removeEventListener("mousemove", this.document_mouse_listener);
        document.removeEventListener("mouseleave", this.document_mouse_out_listener);
        document.removeEventListener("mouseup", this.document_mouse_out_listener);
    }

    protected defaultState(): TreeEntryMoveState {
        return {
            tree_view: null,
            begin: {x: 0, y: 0},
            description: ""
        }
    }

    isActive() {
        return !!this.state.tree_view;
    }

    render() {
        if (!this.state.tree_view)
            return null;

        return ReactDOM.createPortal(this.renderPortal(), this.domContainer);
    }

    private renderPortal() {
        return <div style={{top: this.current.y, left: this.current.x}} className={moveStyle.moveContainer}
                    ref={this.ref_container}>
            {this.state.description}
        </div>;
    }
}