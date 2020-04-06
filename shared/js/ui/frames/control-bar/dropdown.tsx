import * as React from "react";
import {ReactComponentBase} from "tc-shared/ui/elements/ReactComponentBase";
const cssStyle = require("./button.scss");

export interface DropdownEntryProperties {
    icon?: string;
    text: JSX.Element;

    onClick?: () => void;
}

export class DropdownEntry extends ReactComponentBase<DropdownEntryProperties, {}> {
    protected default_state() { return {}; }

    render() {
        const icon = this.props.icon ? this.classList("icon", this.props.icon) : this.classList("icon-container", "icon-empty");
        if(this.props.children) {
            return (
                <div className={cssStyle.dropdownEntry} onClick={this.props.onClick}>
                    <div className={icon} />
                    <a className={cssStyle.entryName}>{this.props.text}</a>
                    <div className={this.classList("arrow", "right")} />
                    <DropdownContainer>
                        {this.props.children}
                    </DropdownContainer>
                </div>
            );
        } else {
            return (
                <div className={cssStyle.dropdownEntry} onClick={this.props.onClick}>
                    <div className={icon} />
                    <a className={cssStyle.entryName}>{this.props.text}</a>
                </div>
            );
        }
    }
}

export interface DropdownContainerProperties { }
export interface DropdownContainerState { }

export class DropdownContainer extends ReactComponentBase<DropdownContainerProperties, DropdownContainerState> {
    protected default_state() {
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
