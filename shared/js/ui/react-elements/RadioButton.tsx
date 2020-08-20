import * as React from "react";

const cssStyle = require("./RadioButton.scss");
export const RadioButton = (props: {
    children?: React.ReactNode | React.ReactNode[],

    name: string,
    selected: boolean,

    disabled?: boolean

    onChange: (checked: boolean) => void,
}) => {
    return (
        <label>
            <div className={cssStyle.container + " " + (props.disabled ? cssStyle.disabled : "")}>
                <input
                    disabled={props.disabled}
                    type={"radio"}
                    name={props.name}
                    onChange={event => props.onChange(event.target.checked)}
                    checked={props.selected} />
                <div className={cssStyle.mark} />
            </div>
            {props.children}
        </label>
    )
}