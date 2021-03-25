import * as React from "react";
import {ReactComponentBase} from "tc-shared/ui/react-elements/ReactComponentBase";
import {IconRenderer, RemoteIconRenderer} from "tc-shared/ui/react-elements/Icon";
import {getIconManager, RemoteIconInfo} from "tc-shared/file/Icons";
import {joinClassList} from "tc-shared/ui/react-elements/Helper";

const cssStyle = require("./Button.scss");

export interface DropdownEntryProperties {
    icon?: string | RemoteIconInfo;
    text: JSX.Element | string;

    onClick?: (event: React.MouseEvent) => void;
    onAuxClick?: (event: React.MouseEvent) => void;
    onContextMenu?: (event: React.MouseEvent) => void;

    children?: React.ReactElement<DropdownEntry | DropdownTitleEntry>[]
}

const LocalIconRenderer = (props: { icon?: string | RemoteIconInfo, className?: string }) => {
    if(!props.icon || typeof props.icon === "string") {
        return <IconRenderer icon={props.icon as any} key={"fixed-icon"} className={props.className} />
    } else {
        return <RemoteIconRenderer icon={getIconManager().resolveIcon(props.icon.iconId, props.icon.serverUniqueId)} key={"remote-icon"} className={props.className} />;
    }
}

export class DropdownEntry extends React.PureComponent<DropdownEntryProperties> {
    render() {
        if(this.props.children) {
            return (
                <div className={cssStyle.dropdownEntry} onClick={this.props.onClick} onAuxClick={this.props.onAuxClick} onContextMenu={this.props.onContextMenu}>
                    <LocalIconRenderer icon={this.props.icon} className={cssStyle.iconContainer} />
                    <a className={cssStyle.entryName}>{this.props.text}</a>
                    <div className={cssStyle.arrow + " " + cssStyle.right} />
                    <DropdownContainer>
                        {this.props.children}
                    </DropdownContainer>
                </div>
            );
        } else {
            return (
                <div className={cssStyle.dropdownEntry} onClick={this.props.onClick} onAuxClick={this.props.onAuxClick} onContextMenu={this.props.onContextMenu}>
                    <LocalIconRenderer icon={this.props.icon} className={cssStyle.iconContainer} />
                    <a className={cssStyle.entryName}>{this.props.text}</a>
                </div>
            );
        }
    }
}

export class DropdownTitleEntry extends React.PureComponent<{
    children
}> {
    render() {
        return (
            <div className={joinClassList(cssStyle.dropdownEntry, cssStyle.title)}>
                <a className={cssStyle.entryName}>{this.props.children}</a>
            </div>
        );
    }
}

export const DropdownContainer = (props: { children: any }) => (
    <div className={cssStyle.dropdown}>
        {props.children}
    </div>
);