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
                    cssStyle.containerBoxed + " " +
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

export interface FlatInputFieldProperties {
    defaultValue?: string;
    placeholder?: string;

    className?: string;

    label?: string | React.ReactElement;
    labelType?: "static" | "floating";
    labelClassName?: string;
    labelFloatingClassName?: string;

    help?: string | React.ReactElement;
    helpClassName?: string;

    invalidClassName?: string;

    disabled?: boolean;
    editable?: boolean;

    onFocus?: () => void;
    onBlur?: () => void;

    onChange?: (newValue?: string) => void;
    onInput?: (newValue?: string) => void;

    finishOnEnter?: boolean;
}

export interface FlatInputFieldState {
    filled: boolean;

    placeholder?: string;
    disabled?: boolean;
    editable?: boolean;

    isInvalid: boolean;
    invalidMessage: string | React.ReactElement;
}

export class FlatInputField extends React.Component<FlatInputFieldProperties, FlatInputFieldState> {
    private refInput = React.createRef<HTMLInputElement>();

    constructor(props) {
        super(props);

        this.state = {
            isInvalid: false,
            filled: !!this.props.defaultValue,
            invalidMessage: ""
        }
    }

    render() {
        const disabled = typeof this.state.disabled === "boolean" ? this.state.disabled : typeof this.props.disabled === "boolean" ? this.props.disabled : false;
        const readOnly = typeof this.state.editable === "boolean" ? !this.state.editable : typeof this.props.editable === "boolean" ? !this.props.editable : false;
        const placeholder = typeof this.state.placeholder === "string" ? this.state.placeholder : typeof this.props.placeholder === "string" ? this.props.placeholder : undefined;
        return (
            <div className={cssStyle.containerFlat + " " + (this.state.isInvalid ? cssStyle.isInvalid : "") + " " + (this.state.filled ? cssStyle.isFilled : "") + " " + (this.props.className || "")}>
                {this.props.label ?
                    <label className={
                        cssStyle["type-" + (this.props.labelType || "static")] + " " +
                        (this.props.labelClassName || "") + " " +
                        (this.props.labelFloatingClassName && this.state.filled ? this.props.labelFloatingClassName : "")}>{this.props.label}</label> : undefined}
                <input
                    defaultValue={this.props.defaultValue}
                    type={"text"}
                    ref={this.refInput}
                    readOnly={readOnly}
                    disabled={disabled}
                    placeholder={placeholder}

                    onFocus={this.props.onFocus}
                    onBlur={this.props.onBlur}
                    onChange={() => this.onChange()}
                    onInput={e => this.props.onInput && this.props.onInput(e.currentTarget.value)}
                    onKeyPress={e => this.props.finishOnEnter && e.key === "Enter" && this.refInput.current?.blur()}
                />
                {this.state.invalidMessage ? <small className={cssStyle.invalidFeedback + " " + (this.props.invalidClassName || "")}>{this.state.invalidMessage}</small> : undefined}
                {this.props.help ? <small className={cssStyle.help + " " + (this.props.helpClassName || "")}>{this.props.help}</small> : undefined}
            </div>
        );
    }

    private onChange() {
        const value = this.refInput.current?.value;
        this.setState({ filled: !!value});

        this.props.onChange && this.props.onChange(value);
    }

    value() {
        return this.refInput.current?.value;
    }

    setValue(value: string | undefined) {
        this.refInput.current.value = typeof value === "undefined" ? "" : value;
        this.setState({ filled: !!value });
    }

    inputElement() : HTMLInputElement | undefined {
        return this.refInput.current;
    }

    focus() {
        this.refInput.current?.focus();
    }
}


export interface FlatSelectProperties {
    defaultValue?: string;
    value?: string;

    className?: string;

    label?: string | React.ReactElement;
    labelClassName?: string;

    help?: string | React.ReactElement;
    helpClassName?: string;

    invalidClassName?: string;

    disabled?: boolean;
    editable?: boolean;

    onFocus?: () => void;
    onBlur?: () => void;

    onChange?: (event?: React.ChangeEvent<HTMLSelectElement>) => void;
}

export interface FlatSelectFieldState {
    disabled?: boolean;

    isInvalid: boolean;
    invalidMessage: string | React.ReactElement;
}

export class FlatSelect extends React.Component<FlatSelectProperties, FlatSelectFieldState> {
    private refSelect = React.createRef<HTMLSelectElement>();

    constructor(props) {
        super(props);

        this.state = {
            isInvalid: false,
            invalidMessage: ""
        }
    }

    render() {
        const disabled = typeof this.state.disabled === "boolean" ? this.state.disabled : typeof this.props.disabled === "boolean" ? this.props.disabled : false;
        return (
            <div className={cssStyle.containerFlat + " " + (this.state.isInvalid ? cssStyle.isInvalid : "") + " " + (this.props.className || "")}>
                {this.props.label ?
                    <label className={cssStyle["type-static"] + " " + (this.props.labelClassName || "")}>{this.props.label}</label> : undefined}
                <select
                    ref={this.refSelect}

                    value={this.props.value}
                    defaultValue={this.props.defaultValue}
                    disabled={disabled}

                    onFocus={this.props.onFocus}
                    onBlur={this.props.onBlur}
                    onChange={e => this.props.onChange && this.props.onChange(e)}
                >
                    {this.props.children}
                </select>
                {this.state.invalidMessage ? <small className={cssStyle.invalidFeedback + " " + (this.props.invalidClassName || "")}>{this.state.invalidMessage}</small> : undefined}
                {this.props.help ? <small className={cssStyle.help + " " + (this.props.helpClassName || "")}>{this.props.help}</small> : undefined}
            </div>
        );
    }

    selectElement() : HTMLSelectElement | undefined {
        return this.refSelect.current;
    }

    focus() {
        this.refSelect.current?.focus();
    }
}





























