import {ClientIcon} from "svg-sprites/client-icons";
import * as React from "react";

export const ClientIconRenderer = (props: { icon: ClientIcon, size?: string | number, title?: string, className?: string }) => (
    <div className={"icon_em " + props.icon + " " + props.className} style={{ fontSize: props.size }} title={props.title} />
);