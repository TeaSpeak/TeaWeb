import * as React from "react";
import {ReactElement} from "react";
const cssStyle = require("./Checkbox.scss");

export interface CheckboxProperties {
    label?: ReactElement | string;
    disabled?: boolean;
    onChange?: (value: boolean) => void;

    value?: boolean;
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

        this.state = { };
    }

    render() {
        const disabled = typeof this.state.disabled === "boolean" ? this.state.disabled : this.props.disabled;
        const checked = typeof this.props.value === "boolean" ? this.props.value : typeof this.state.checked === "boolean" ? this.state.checked : this.props.initialValue;
        const disabledClass = disabled ? cssStyle.disabled : "";

        return (
            <label className={cssStyle.labelCheckbox + " " + disabledClass}>
                <div className={cssStyle.checkbox + " " + disabledClass}>
                    <input type={"checkbox"} checked={checked} disabled={disabled} onChange={event => this.onStateChange(event)} />
                    <div className={cssStyle.mark} />
                </div>
                {this.props.label ? <a>{this.props.label}</a> : undefined}
            </label>
        );
    }

    private onStateChange(event: React.ChangeEvent) {
        if(this.props.onChange)
            this.props.onChange((event.target as HTMLInputElement).checked);

        this.setState({ checked: !this.state.checked });
    }
}