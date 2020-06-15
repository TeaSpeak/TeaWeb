import * as React from "react";
const cssStyle = require("./Switch.scss");

export interface SwitchProperties {
    initialState: boolean;

    className?: string;

    label?: string | React.ReactElement;
    labelSide?: "right" | "left";

    disabled?: boolean;

    onChange?: (value: boolean) => void;
    onBlur?: () => void;
}

export interface SwitchState {
    checked: boolean;
    disabled?: boolean;
}

export class Switch extends React.Component<SwitchProperties, SwitchState> {
    private readonly ref = React.createRef<HTMLLabelElement>();

    constructor(props) {
        super(props);

        this.state = {
            checked: this.props.initialState,
        }
    }

    render() {
        const disabled = typeof this.state.disabled === "boolean" ? this.state.disabled : !!this.props.disabled;
        return (
            <label ref={this.ref} className={cssStyle.container + " " + (this.props.className || "") + " " + (disabled ? cssStyle.disabled : "")} onBlur={this.props.onBlur}>
                <div className={cssStyle.switch}>
                    <input type="checkbox" onChange={e => {
                        this.setState({ checked: e.currentTarget.checked });
                        this.props.onChange && this.props.onChange(e.currentTarget.checked);
                    }} disabled={disabled} checked={this.state.checked} />
                    <span className={cssStyle.slider}>
                        <span className={cssStyle.dot} />
                    </span>
                </div>
                {this.props.label ? <a className={cssStyle.label}>{this.props.label}</a> : undefined}
            </label>
        )
    }

    focus() {
        this.ref.current?.focus();
    }
}