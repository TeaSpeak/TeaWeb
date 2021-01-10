import * as React from "react";
import {ReactComponentBase} from "tc-shared/ui/react-elements/ReactComponentBase";
import {DropdownContainer} from "./DropDown";
import {ClientIcon} from "svg-sprites/client-icons";

const cssStyle = require("./Button.scss");

export interface ButtonState {
    switched: boolean;
    dropdownShowed: boolean;
    dropdownForceShow: boolean;
}

export interface ButtonProperties {
    colorTheme?: "red" | "default";

    autoSwitch: boolean;

    tooltip?: string;

    iconNormal: string | ClientIcon;
    iconSwitched?: string | ClientIcon;

    onToggle?: (state: boolean) => boolean | void;

    className?: string;

    switched?: boolean;
}

export class Button extends ReactComponentBase<ButtonProperties, ButtonState> {
    protected defaultState(): ButtonState {
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

        if(!this.hasChildren()) {
            return (
                <div className={buttonRootClass + " " + this.props.className} title={this.props.tooltip} onClick={this.onClick.bind(this)}>
                    <div className={this.classList("icon_em ", (switched ? this.props.iconSwitched : "") || this.props.iconNormal)} />
                </div>
            );
        }

        return (
            <div className={this.classList(cssStyle.buttonDropdown, this.state.dropdownShowed || this.state.dropdownForceShow ? cssStyle.dropdownDisplayed : "", this.props.className)} onMouseLeave={this.onMouseLeave.bind(this)}>
                <div className={cssStyle.buttons}>
                    <div className={buttonRootClass} title={this.props.tooltip} onClick={this.onClick.bind(this)}>
                        <div className={this.classList("icon_em ", (switched ? this.props.iconSwitched : "") || this.props.iconNormal)} />
                    </div>
                    <div className={cssStyle.dropdownArrow} onMouseEnter={this.onMouseEnter.bind(this)}>
                        <div className={cssStyle.arrow + " " + cssStyle.down} />
                    </div>
                </div>
                <DropdownContainer>
                    {this.props.children}
                </DropdownContainer>
            </div>
        );
    }

    private onMouseEnter() {
        this.setState({
            dropdownShowed: true
        });
    }

    private onMouseLeave() {
        this.setState({
            dropdownShowed: false
        });
    }

    private onClick() {
        const new_state = !(this.state.switched || this.props.switched);
        const result = this.props.onToggle?.call(undefined, new_state);
        if(this.props.autoSwitch)
            this.setState({ switched: typeof result === "boolean" ? result : new_state });
    }
}