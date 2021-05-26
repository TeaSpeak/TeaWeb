import {ReactComponentBase} from "tc-shared/ui/react-elements/ReactComponentBase";
import * as React from "react";
import {joinClassList} from "tc-shared/ui/react-elements/Helper";

const cssStyle = require("./Button.scss");

export interface ButtonProperties {
    color?: "green" | "blue" | "red" | "purple" | "brown" | "yellow" | "default" | "none";
    type?: "normal" | "small" | "extra-small";

    className?: string;
    onClick?: (event: React.MouseEvent) => void;

    hidden?: boolean;
    disabled?: boolean;

    title?: string;
    transparency?: boolean;
}

export interface ButtonState {
    disabled?: boolean
}

export class Button extends React.Component<ButtonProperties, ButtonState> {
    constructor(props) {
        super(props);

        this.state = {
            disabled: undefined
        }
    };

    render() {
        if(this.props.hidden)
            return null;

        return (
            <button
                className={joinClassList(
                    cssStyle.button,
                    cssStyle["color-" + this.props.color] || cssStyle["color-default"],
                    cssStyle["type-" + this.props.type] || cssStyle["type-normal"],
                    typeof this.props.transparency === "boolean" && !this.props.transparency ? cssStyle.nonTransparent : undefined,
                    this.props.className
                )}
                title={this.props.title}
                disabled={typeof this.state.disabled === "boolean" ? this.state.disabled : this.props.disabled}
                onClick={this.props.onClick}
            >
                {this.props.children}
            </button>
        )
    }
}