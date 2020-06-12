import * as React from "react";
import {ReactElement} from "react";

const cssStyle = require("./InputField.scss");

export interface BoxedInputFieldProperties {
    prefix?: string;
    placeholder?: string;

    disabled?: boolean;
    editable?: boolean;

    defaultValue?: string;

    rightIcon?: () => ReactElement;
    leftIcon?: () => ReactElement;
    inputBox?: () => ReactElement; /* if set the onChange and onInput will not work anymore! */

    isInvalid?: boolean;

    className?: string;

    size?: "normal" | "large" | "small";

    onFocus?: () => void;
    onBlur?: () => void;

    onChange?: (newValue: string) => void;
    onInput?: (newValue: string) => void;
}

export interface BoxedInputFieldState {
    disabled?: boolean;
    defaultValue?: string;
    isInvalid?: boolean;
    value?: string;
}

export class BoxedInputField extends React.Component<BoxedInputFieldProperties, BoxedInputFieldState> {
    private refInput = React.createRef<HTMLInputElement>();
    private inputEdited = false;

    constructor(props) {
        super(props);

        this.state = {};
    }

    render() {
        return (
            <div
                draggable={false}
                className={
                    cssStyle.container + " " +
                    cssStyle["size-" + (this.props.size || "normal")] +
                    (this.state.disabled || this.props.disabled ? cssStyle.disabled : "") + " " +
                    (this.state.isInvalid || this.props.isInvalid ? cssStyle.isInvalid : "") + " " +
                    (this.props.leftIcon ? "" : cssStyle.noLeftIcon) + " " +
                    (this.props.rightIcon ? "" : cssStyle.noRightIcon) + " " +
                    this.props.className
                }

                onFocus={this.props.onFocus}
                onBlur={() => this.onInputBlur()}
            >
                {this.props.leftIcon ? this.props.leftIcon() : ""}
                {this.props.prefix ? <a key={"prefix"} className={cssStyle.prefix}>{this.props.prefix}</a> : undefined}
                {this.props.inputBox ?
                    <span key={"custom-input"} className={cssStyle.inputBox + " " + (this.props.editable ? cssStyle.editable : "")} onClick={this.props.onFocus}>{this.props.inputBox()}</span> :
                    <input key={"input"}
                        ref={this.refInput}
                        value={this.state.value}
                        defaultValue={this.state.defaultValue || this.props.defaultValue}
                        placeholder={this.props.placeholder}
                        readOnly={typeof this.props.editable === "boolean" ? this.props.editable : false}
                        disabled={this.state.disabled || this.props.disabled}
                        onInput={this.props.onInput && (event => this.props.onInput(event.currentTarget.value))}
                        onKeyDown={e => this.onKeyDown(e)}
                    />}
                {this.props.rightIcon ? this.props.rightIcon() : ""}
            </div>
        )
    }

    focusInput() {
        this.refInput.current?.focus();
    }

    private onKeyDown(event: React.KeyboardEvent) {
        this.inputEdited = true;

        if(event.key === "Enter")
            this.refInput.current?.blur();
    }

    private onInputBlur() {
        if(this.props.onChange && this.inputEdited) {
            this.inputEdited = false;
            this.props.onChange(this.refInput.current.value);
        }

        if(this.props.onBlur)
            this.props.onBlur();
    }
}