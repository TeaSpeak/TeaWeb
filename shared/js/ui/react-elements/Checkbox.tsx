import * as React from "react";
import {ReactElement} from "react";
const cssStyle = require("./Checkbox.scss");

export interface CheckboxProperties {
    label?: ReactElement | string;
    disabled?: boolean;
    onChange?: (value: boolean) => void;
    initialValue?: boolean;

    children?: never;
}

export interface CheckboxState {
    checked?: boolean;
    disabled?: boolean;
}

export class Checkbox extends React.Component<CheckboxProperties, CheckboxState> {
    constructor(props) {
        super(props);

        this.state = {
            checked: this.props.initialValue,
            disabled: this.props.disabled
        };
    }

    render() {
        const disabled = typeof this.state.disabled === "boolean" ? this.state.disabled : this.props.disabled;
        const checked = typeof this.state.checked === "boolean" ? this.state.checked : this.props.initialValue;
        const disabledClass = disabled ? cssStyle.disabled : "";

        return (
            <label className={cssStyle.labelCheckbox + " " + disabledClass}>
                <div className={cssStyle.checkbox + " " + disabledClass}>
                    <input type={"checkbox"} checked={checked} disabled={disabled} onChange={() => this.onStateChange()} />
                    <div className={cssStyle.mark} />
                </div>
                {this.props.label ? <a>{this.props.label}</a> : undefined}
            </label>
        );
    }

    private onStateChange() {
        if(this.props.onChange)
            this.props.onChange(!this.state.checked);

        this.setState({ checked: !this.state.checked });
    }
}