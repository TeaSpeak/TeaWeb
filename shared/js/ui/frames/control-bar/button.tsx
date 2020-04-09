import * as React from "react";
import {ReactComponentBase} from "tc-shared/ui/elements/ReactComponentBase";
import {DropdownContainer} from "tc-shared/ui/frames/control-bar/dropdown";
const cssStyle = require("./button.scss");

export interface ButtonState {
    switched: boolean;
    dropdownShowed: boolean;
    dropdownForceShow: boolean;
}

export interface ButtonProperties {
    colorTheme?: "red" | "default";

    autoSwitch: boolean;

    tooltip?: string;

    iconNormal: string;
    iconSwitched?: string;

    onToggle?: (state: boolean) => boolean | void;

    dropdownButtonExtraClass?: string;

    switched?: boolean;
}

export class Button extends ReactComponentBase<ButtonProperties, ButtonState> {
    protected default_state(): ButtonState {
        return {
            switched: false,
            dropdownShowed: false,
            dropdownForceShow: false
        }
    }

    render() {
        const switched = this.props.switched || this.state.switched;
        const buttonRootClass = this.classList(
            cssStyle.button,
            switched ? cssStyle.activated : "",
            typeof this.props.colorTheme === "string" ? cssStyle["theme-" + this.props.colorTheme] : "");
        const button = (
            <div className={buttonRootClass} title={this.props.tooltip} onClick={this.onClick.bind(this)}>
                <div className={this.classList("icon_em ", (switched ? this.props.iconSwitched : "") || this.props.iconNormal)} />
            </div>
        );

        if(!this.hasChildren())
            return button;

        return (
            <div className={this.classList(cssStyle.buttonDropdown, this.state.dropdownShowed || this.state.dropdownForceShow ? cssStyle.dropdownDisplayed : "", this.props.dropdownButtonExtraClass)} onMouseLeave={this.onMouseLeave.bind(this)}>
                <div className={cssStyle.buttons}>
                    {button}
                    <div className={cssStyle.dropdownArrow} onMouseEnter={this.onMouseEnter.bind(this)}>
                        <div className={this.classList("arrow", "down")} />
                    </div>
                </div>
                <DropdownContainer>
                    {this.props.children}
                </DropdownContainer>
            </div>
        );
    }

    private onMouseEnter() {
        this.updateState({
            dropdownShowed: true
        });
    }

    private onMouseLeave() {
        this.updateState({
            dropdownShowed: false
        });
    }

    private onClick() {
        const new_state = !(this.state.switched || this.props.switched);
        const result = this.props.onToggle?.call(undefined, new_state);
        if(this.props.autoSwitch)
            this.updateState({ switched: typeof result === "boolean" ? result : new_state });
    }
}