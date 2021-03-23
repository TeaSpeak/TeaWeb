import {joinClassList} from "tc-shared/ui/react-elements/Helper";
import React from "react";

const cssStyle = require("./Arrow.scss");

export const Arrow = (props: {
    direction: "up" | "down" | "left" | "right",
    className?: string,
    onClick?: () => void
}) => (
    <div
        className={joinClassList(
            cssStyle.arrow,
            cssStyle[props.direction],
            props.className
        )}
        onClick={props.onClick}
    />
)