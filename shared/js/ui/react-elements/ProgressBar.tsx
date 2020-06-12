import * as React from "react";
import {ReactElement} from "react";
const cssStyle = require("./ProgressBar.scss");

export interface ProgressBarState {
    value?: number; /* [0;100] */
    text?: ReactElement | string;
    type?: "normal" | "error" | "success";
}

export interface ProgressBarProperties {
    value: number; /* [0;100] */
    text?: ReactElement | string;
    type: "normal" | "error" | "success";

    className?: string;
}

export class ProgressBar extends React.Component<ProgressBarProperties, ProgressBarState> {
    constructor(props) {
        super(props);

        this.state = {};
    }

    render() {
        return (
            <div className={cssStyle.container + " " + cssStyle["type-" + (typeof this.state.type === "undefined" ? this.props.type : this.state.type)] + " " + (this.props.className || "")}>
                <div className={cssStyle.filler} style={{width: (typeof this.state.value === "number" ? this.state.value : this.props.value) + "%"}} />
                <div className={cssStyle.text}>
                    {typeof this.state.text !== "undefined" ? this.state.text : this.props.text}
                </div>
            </div>
        )
    }
}