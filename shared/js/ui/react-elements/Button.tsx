import {ReactComponentBase} from "tc-shared/ui/react-elements/ReactComponentBase";
import * as React from "react";
const cssStyle = require("./Button.scss");

export interface ButtonProperties {
    color?: "green" | "blue" | "red" | "purple" | "brown" | "yellow" | "default" | "none";
    type?: "normal" | "small" | "extra-small";

    className?: string;
    onClick?: () => void;

    hidden?: boolean;
    disabled?: boolean;
}

export interface ButtonState {
    disabled?: boolean
}

export class Button extends ReactComponentBase<ButtonProperties, ButtonState> {
    protected defaultState(): ButtonState {
        return {
            disabled: undefined
        };
    }

    render() {
        if(this.props.hidden)
            return null;

        return (
            <button
                className={this.classList(
                    cssStyle.button,
                    cssStyle["color-" + this.props.color] || cssStyle["color-default"],
                    cssStyle["type-" + this.props.type] || cssStyle["type-normal"],
                    this.props.className
                )}
                disabled={typeof this.state.disabled === "boolean" ? this.state.disabled : this.props.disabled}
                onClick={this.props.onClick}
            >
                {this.props.children}
            </button>
        )
    }
}