import * as React from "react";
import {ReactComponentBase} from "tc-shared/ui/elements/ReactComponentBase";
const cssStyle = require("./button.scss");

export interface DropdownEntryProperties {
    icon?: string | JQuery<HTMLDivElement>;
    text: JSX.Element | string;

    onClick?: (event) => void;
    onContextMenu?: (event) => void;
}

class IconRenderer extends React.Component<{ icon: string | JQuery<HTMLDivElement> }, {}> {
    private readonly icon_ref: React.RefObject<HTMLDivElement>;

    constructor(props) {
        super(props);

        if(typeof this.props.icon === "object")
            this.icon_ref = React.createRef();
    }

    render() {
        if(!this.props.icon)
            return <div className={"icon-container icon-empty"} />;
        else if(typeof this.props.icon === "string")
            return <div className={"icon " + this.props.icon} />;


        return <div ref={this.icon_ref} />;
    }

    componentDidMount(): void {
        if(this.icon_ref)
            $(this.icon_ref.current).replaceWith(this.props.icon);
    }
    componentWillUnmount(): void {
        if(this.icon_ref)
            $(this.icon_ref.current).empty();
    }
}

export class DropdownEntry extends ReactComponentBase<DropdownEntryProperties, {}> {
    protected default_state() { return {}; }

    render() {
        if(this.props.children) {
            return (
                <div className={cssStyle.dropdownEntry} onClick={this.props.onClick} onContextMenu={this.props.onContextMenu}>
                    <IconRenderer icon={this.props.icon} />
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
                    <IconRenderer icon={this.props.icon} />
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
