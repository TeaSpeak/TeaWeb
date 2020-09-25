import * as React from "react";
import {ReactComponentBase} from "tc-shared/ui/react-elements/ReactComponentBase";
import {IconRenderer, RemoteIconRenderer} from "tc-shared/ui/react-elements/Icon";
import {getIconManager, RemoteIconInfo} from "tc-shared/file/Icons";
const cssStyle = require("./button.scss");

export interface DropdownEntryProperties {
    icon?: string | RemoteIconInfo;
    text: JSX.Element | string;

    onClick?: (event) => void;
    onContextMenu?: (event) => void;
}

export class DropdownEntry extends ReactComponentBase<DropdownEntryProperties, {}> {
    protected defaultState() { return {}; }

    render() {
        if(this.props.children) {
            return (
                <div className={cssStyle.dropdownEntry} onClick={this.props.onClick} onContextMenu={this.props.onContextMenu}>
                    {typeof this.props.icon === "string" ? <IconRenderer icon={this.props.icon} /> :
                        <RemoteIconRenderer icon={getIconManager().resolveIcon(this.props.icon.iconId, this.props.icon.serverUniqueId)} />
                    }
                    <a className={cssStyle.entryName}>{this.props.text}</a>
                    <div className={this.classList("arrow", "right")} />
                    <DropdownContainer>
                        {this.props.children}
                    </DropdownContainer>
                </div>
            );
        } else {
            return (
                <div className={cssStyle.dropdownEntry} onClick={this.props.onClick} onContextMenu={this.props.onContextMenu}>
                    {typeof this.props.icon === "string" ? <IconRenderer icon={this.props.icon} /> :
                        <RemoteIconRenderer icon={getIconManager().resolveIcon(this.props.icon.iconId, this.props.icon.serverUniqueId)} />
                    }
                    <a className={cssStyle.entryName}>{this.props.text}</a>
                </div>
            );
        }
    }
}

export interface DropdownContainerProperties { }
export interface DropdownContainerState { }

export class DropdownContainer extends ReactComponentBase<DropdownContainerProperties, DropdownContainerState> {
    protected defaultState() {
        return { };
    }

    render() {
        return (
            <div className={this.classList(cssStyle.dropdown)}>
                {this.props.children}
            </div>
        );
    }
}
