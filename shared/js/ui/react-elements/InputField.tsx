import * as React from "react";
import {ReactElement} from "react";
import {joinClassList} from "tc-shared/ui/react-elements/Helper";

const cssStyle = require("./InputField.scss");

export const ControlledBoxedInputField = (props: {
    prefix?: string;
    suffix?: string;

    placeholder?: string;

    disabled?: boolean;
    editable?: boolean;

    value?: string;

    rightIcon?: () => ReactElement;
    leftIcon?: () => ReactElement;
    inputBox?: () => ReactElement; /* if set the onChange and onInput will not work anymore! */

    isInvalid?: boolean;

    className?: string;
    maxLength?: number,

    size?: "normal" | "large" | "small";
    type?: "text" | "password" | "number";

    onChange: (newValue?: string) => void,
    onEnter?: () => void,

    onFocus?: () => void,
    onBlur?: () => void,

    finishOnEnter?: boolean,
}) => {

    return (
        <div
            draggable={false}
            className={
                cssStyle.containerBoxed + " " +
                cssStyle["size-" + (props.size || "normal")] + " " +
                (props.disabled ? cssStyle.disabled : "") + " " +
                (props.isInvalid ? cssStyle.isInvalid : "") + " " +
                (typeof props.editable !== "boolean" || props.editable ? cssStyle.editable : "") + " " +
                (props.leftIcon ? "" : cssStyle.noLeftIcon) + " " +
                (props.rightIcon ? "" : cssStyle.noRightIcon) + " " +
                props.className
            }
            onFocus={props.onFocus}
            onBlur={() => props.onBlur()}
        >
            {props.leftIcon ? props.leftIcon() : ""}
            {props.prefix ? <a key={"prefix"} className={cssStyle.prefix}>{props.prefix}</a> : undefined}
            {props.inputBox ?
                <span key={"custom-input"}
                      className={cssStyle.inputBox + " " + (props.editable ? cssStyle.editable : "")}
                      onClick={props.onFocus}>{props.inputBox()}</span> :

                <input key={"input"}

                       value={props.value || ""}
                       placeholder={props.placeholder}

                       readOnly={typeof props.editable === "boolean" ? !props.editable : false}
                       disabled={typeof props.disabled === "boolean" ? props.disabled : false}

                       onChange={event => props.onChange(event.currentTarget.value)}
                       onKeyPress={event => {
                           if(event.key === "Enter") {
                               if(props.finishOnEnter) {
                                   event.currentTarget.blur();
                               }

                               if(props.onEnter) {
                                   props.onEnter();
                               }
                           }
                       }}
                />
            }
            {props.suffix ? <a key={"suffix"} className={cssStyle.suffix}>{props.suffix}</a> : undefined}
            {props.rightIcon ? props.rightIcon() : ""}
        </div>
    );
}

export interface BoxedInputFieldProperties {
    prefix?: string;
    suffix?: string;

    placeholder?: string;

    disabled?: boolean;
    editable?: boolean;

    value?: string;
    defaultValue?: string;

    rightIcon?: () => ReactElement;
    leftIcon?: () => ReactElement;
    inputBox?: () => ReactElement; /* if set the onChange and onInput will not work anymore! */

    isInvalid?: boolean;

    className?: string;
    maxLength?: number,

    size?: "normal" | "large" | "small";
    type?: "text" | "password" | "number";

    onFocus?: (event: React.FocusEvent | React.MouseEvent) => void;
    onBlur?: () => void;

    onChange?: (newValue: string) => void;
    onInput?: (newValue: string) => void;

    finishOnEnter?: boolean,
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
                    cssStyle["size-" + (this.props.size || "normal")] + " " +
                    (this.state.disabled || this.props.disabled ? cssStyle.disabled : "") + " " +
                    (this.state.isInvalid || this.props.isInvalid ? cssStyle.isInvalid : "") + " " +
                    (typeof this.props.editable !== "boolean" || this.props.editable ? cssStyle.editable : "") + " " +
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
                    <span key={"custom-input"}
                          className={cssStyle.inputBox + " " + (this.props.editable ? cssStyle.editable : "")}
                          onClick={this.props.onFocus}>{this.props.inputBox()}</span> :

                    <input key={"input"}
                           type={this.props.type || "text"}
                           ref={this.refInput}
                           value={typeof this.props.value === "undefined" ? this.state.value : this.props.value}
                           defaultValue={this.state.defaultValue || this.props.defaultValue}
                           placeholder={this.props.placeholder}
                           readOnly={typeof this.props.editable === "boolean" ? !this.props.editable : false}
                           disabled={this.state.disabled || this.props.disabled}
                           onInput={this.props.onInput && (event => this.props.onInput(event.currentTarget.value))}
                           onKeyDown={e => this.onKeyDown(e)}
                           maxLength={this.props.maxLength}
                    />
                }
                {this.props.suffix ? <a key={"suffix"} className={cssStyle.suffix}>{this.props.suffix}</a> : undefined}
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

export const ControlledFlatInputField = (props: {
    type?: "text" | "password" | "number",

    value: string,
    placeholder?: string,

    className?: string,

    label?: React.ReactNode,
    labelType?: "static" | "floating",
    labelClassName?: string,
    labelFloatingClassName?: string,

    help?: React.ReactNode,
    helpClassName?: string,

    invalid?: React.ReactNode,
    invalidClassName?: string,

    disabled?: boolean,
    editable?: boolean,

    onFocus?: () => void,
    onBlur?: () => void,

    onChange?: (newValue?: string) => void,
    onInput?: (newValue?: string) => void,
    onEnter?: () => void,

    finishOnEnter?: boolean,
}) => {
    const filled = props.value.length > 0;
    return (
        <div
            className={joinClassList(
                cssStyle.containerFlat,
                props.invalid && cssStyle.isInvalid,
                filled && cssStyle.isFilled,
                props.className
            )}
        >
            {props.label ? (
                <label
                    className={joinClassList(
                        cssStyle["type-" + (props.labelType || "static")],
                        props.labelClassName,
                        filled && props.labelFloatingClassName
                    )}
                    key={"label"}
                >
                    {props.label}
                </label>
            ) : undefined}
            <input
                key={"input"}
                type={props.type || "text"}

                value={props.value}
                placeholder={props.placeholder}

                readOnly={typeof props.editable === "boolean" ? !props.editable : false}
                disabled={typeof props.disabled === "boolean" ? props.disabled : false}

                onFocus={props.onFocus}
                onBlur={props.onBlur}
                onChange={event => props.onChange && props.onChange(event.currentTarget.value)}
                onInput={event => props.onInput && props.onInput(event.currentTarget.value)}
                onKeyPress={event => {
                    if(event.key === "Enter") {
                        if(props.finishOnEnter) {
                            event.currentTarget.blur();
                        }

                        if(props.onEnter) {
                            props.onEnter();
                        }
                    }
                }}
            />
            {props.invalid ? (
                <small
                    className={joinClassList(cssStyle.invalidFeedback, props.invalidClassName)}
                    key={"invalid"}
                >
                    {props.invalid}
                </small>
            ) : undefined}
            {props.help ? (
                <small
                    className={joinClassList(cssStyle.invalidFeedback, props.helpClassName)}
                    key={"help"}
                >
                    {props.help}
                </small>
            ) : undefined}
        </div>
    );
}

export interface FlatInputFieldProperties {
    defaultValue?: string;
    value?: string;

    placeholder?: string;

    className?: string;

    label?: string | React.ReactElement;
    labelType?: "static" | "floating";
    labelClassName?: string;
    labelFloatingClassName?: string;

    type?: "text" | "password" | "number";

    help?: string | React.ReactElement;
    helpClassName?: string;

    invalidClassName?: string;

    disabled?: boolean;
    editable?: boolean;

    onFocus?: () => void;
    onBlur?: () => void;

    onChange?: (newValue?: string) => void;
    onInput?: (newValue?: string) => void;
    onEnter?: () => void;

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
    private readonly refInput = React.createRef<HTMLInputElement>();

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
        const filled = this.state.filled || this.props.value?.length > 0;

        return (
            <div className={cssStyle.containerFlat + " " + (this.state.isInvalid ? cssStyle.isInvalid : "") + " " + (filled ? cssStyle.isFilled : "") + " " + (this.props.className || "")}>
                {this.props.label ?
                    <label className={
                        cssStyle["type-" + (this.props.labelType || "static")] + " " +
                        (this.props.labelClassName || "") + " " +
                        (this.props.labelFloatingClassName && filled ? this.props.labelFloatingClassName : "")}>{this.props.label}</label> : undefined}
                <input
                    defaultValue={this.props.defaultValue}
                    value={this.props.value}

                    type={this.props.type || "text"}
                    ref={this.refInput}
                    readOnly={readOnly}
                    disabled={disabled}
                    placeholder={placeholder}

                    onFocus={this.props.onFocus}
                    onBlur={this.props.onBlur}
                    onChange={() => this.onChange()}
                    onInput={e => this.props.onInput && this.props.onInput(e.currentTarget.value)}
                    onKeyPress={e => {
                        if(e.key === "Enter") {
                            if(this.props.finishOnEnter) {
                                this.refInput.current?.blur();
                            }
                            if(this.props.onEnter) {
                                this.props.onEnter();
                            }
                        }
                    }}
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

export const ControlledSelect = (props: {
    type?: "flat" | "boxed",
    className?: string,

    value: string,
    placeHolder?: string,

    label?: React.ReactNode,
    labelClassName?: string,

    help?: React.ReactNode,
    helpClassName?: string,

    invalid?: React.ReactNode,
    invalidClassName?: string,

    disabled?: boolean,

    onFocus?: () => void,
    onBlur?: () => void,

    onChange?: (event?: React.ChangeEvent<HTMLSelectElement>) => void,

    children: React.ReactElement<HTMLOptionElement | HTMLOptGroupElement> | React.ReactElement<HTMLOptionElement | HTMLOptGroupElement>[]
}) => {
    const disabled = typeof props.disabled === "boolean" ? props.disabled : false;

    return (
        <div
            className={joinClassList(
                props.type === "boxed" ? cssStyle.containerBoxed : cssStyle.containerFlat,
                cssStyle["size-normal"],
                props.invalid ? cssStyle.isInvalid : undefined,
                props.className,
                cssStyle.noLeftIcon, cssStyle.noRightIcon
            )}
        >
            {!props.label ? undefined :
                <label className={joinClassList(cssStyle["type-static"], props.labelClassName)} key={"label"}>{props.label}</label>
            }
            <select
                value={props.value}
                disabled={disabled}

                onFocus={props.onFocus}
                onBlur={props.onBlur}
                onChange={props.onChange}
            >
                {props.children}
            </select>
            {props.invalid ? <small className={joinClassList(cssStyle.invalidFeedback, props.invalidClassName)} key={"invalid"}>{props.invalid}</small> : undefined}
            {props.help ? <small className={joinClassList(cssStyle.invalidFeedback, props.help)} key={"help"}>{props.help}</small> : undefined}
        </div>
    );
}

export interface SelectProperties {
    type?: "flat" | "boxed";
    refSelect?: React.RefObject<HTMLSelectElement>,

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

    title?: string,

    onFocus?: () => void;
    onBlur?: () => void;

    onChange?: (event?: React.ChangeEvent<HTMLSelectElement>) => void;
}

export interface SelectFieldState {
    disabled?: boolean;

    isInvalid: boolean;
    invalidMessage: string | React.ReactElement;
}

export class Select extends React.Component<SelectProperties, SelectFieldState> {
    private refSelect;

    constructor(props) {
        super(props);

        this.refSelect = this.props.refSelect || React.createRef<HTMLSelectElement>();

        this.state = {
            isInvalid: false,
            invalidMessage: ""
        }
    }

    render() {
        const disabled = typeof this.state.disabled === "boolean" ? this.state.disabled : typeof this.props.disabled === "boolean" ? this.props.disabled : false;
        return (
            <div className={
                (this.props.type === "boxed" ? cssStyle.containerBoxed : cssStyle.containerFlat) + " " +
                cssStyle["size-normal"] + " " + (this.state.isInvalid ? cssStyle.isInvalid : "") + " " +
                (this.props.className || "") + " " + cssStyle.noLeftIcon + " " + cssStyle.noRightIcon + " " +
                (this.props.disabled ? cssStyle.disabled : "")
            }>
                {this.props.label ?
                    <label className={cssStyle["type-static"] + " " + (this.props.labelClassName || "")}>{this.props.label}</label> : undefined}
                <select
                    ref={this.refSelect}

                    value={this.props.value}
                    defaultValue={this.props.defaultValue}
                    disabled={disabled}
                    title={this.props.title}

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



















