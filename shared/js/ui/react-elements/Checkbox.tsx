import * as React from "react";
const cssStyle = require("./Checkbox.scss");

export interface CheckboxProperties {
    label?: string;
    disabled?: boolean;
    onChange?: (value: boolean) => void;
    initialValue?: boolean;

    children?: never;
}

export interface CheckboxState {
    checked: boolean;
}

export class Checkbox extends React.Component<CheckboxProperties, CheckboxState> {
    constructor(props) {
        super(props);

        this.state = {
            checked: this.props.initialValue
        };
    }

    render() {
        const disabledClass = this.props.disabled ? cssStyle.disabled : "";

        return (
            <label className={cssStyle.labelCheckbox + " " + disabledClass}>
                <div className={cssStyle.checkbox + " " + disabledClass}>
                    <input type={"checkbox"} checked={this.state.checked} disabled={this.props.disabled} onChange={() => this.onStateChange()} />
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