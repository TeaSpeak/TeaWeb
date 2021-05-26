import * as React from "react";
import {ClientIconRenderer} from "tc-shared/ui/react-elements/Icons";
import {ClientIcon} from "svg-sprites/client-icons";
import {joinClassList} from "tc-shared/ui/react-elements/Helper";
const cssStyle = require("./DetachButtons.scss");

export const DetachButton = React.memo((props: {
    detached: boolean,
    callbackToggle: () => void,

    detachText?: string,
    attachText?: string,

    disabled?: boolean,
    className?: string,
    children,
}) => {
    return (
        <div className={joinClassList(cssStyle.container, props.className)}>
            <div className={joinClassList(cssStyle.containerButton, props.disabled && cssStyle.disabled)} onClick={props.callbackToggle} key={"overlay"}>
                <div className={cssStyle.button} title={props.detached ? props.attachText || tr("Attach element") : props.detachText || tr("Detach element")}>
                    <ClientIconRenderer icon={props.detached ? ClientIcon.ChannelPopin : ClientIcon.ChannelPopout} />
                </div>
            </div>
            {props.children}
        </div>
    );
});