import {ClientIcon} from "svg-sprites/client-icons";
import * as React from "react";

export const ClientIconRenderer = (props: { icon: ClientIcon, size?: string | number, title?: string }) => (
    <div className={"icon_em " + props.icon} style={{ fontSize: props.size }} title={props.title} />
);