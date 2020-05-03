import * as React from "react";
import {LocalIcon} from "tc-shared/file/FileManager";

export interface IconProperties {
    icon: string | LocalIcon;
    title?: string;
}

export class IconRenderer extends React.Component<IconProperties, {}> {
    render() {
        if(!this.props.icon)
            return <div className={"icon-container icon-empty"} title={this.props.title} />;
        else if(typeof this.props.icon === "string")
            return <div className={"icon " + this.props.icon} title={this.props.title} />;
        else if(this.props.icon instanceof LocalIcon)
            return <LocalIconRenderer icon={this.props.icon} title={this.props.title} />;
        else throw "JQuery icons are not longer supported";
    }
}

export interface LoadedIconRenderer {
    icon: LocalIcon;
    title?: string;
}

export class LocalIconRenderer extends React.Component<LoadedIconRenderer, {}> {
    private readonly callback_state_update;

    constructor(props) {
        super(props);

        this.callback_state_update = () => {
            const icon = this.props.icon;
            if(icon.status !== "destroyed")
                this.forceUpdate();
        };
    }

    render() {
        const icon = this.props.icon;
        if(!icon || icon.status === "empty" || icon.status === "destroyed")
            return <div className={"icon-container icon-empty"} title={this.props.title} />;
        else if(icon.status === "loaded") {
            if(icon.icon_id >= 0 && icon.icon_id <= 1000) {
                if(icon.icon_id === 0)
                    return <div className={"icon-container icon-empty"} title={this.props.title} />;
                return <div className={"icon_em client-group_" + icon.icon_id} />;
            }
            return <div key={"icon"} className={"icon-container"}><img src={icon.loaded_url} alt={this.props.title || ("icon " + icon.icon_id)} /></div>;
        } else if(icon.status === "loading")
            return <div key={"loading"} className={"icon-container"} title={this.props.title}><div className={"icon_loading"} /></div>;
        else if(icon.status === "error")
            return <div key={"error"} className={"icon client-warning"} title={icon.error_message || tr("Failed to load icon")} />;
    }

    componentDidMount(): void {
        this.props.icon?.status_change_callbacks.push(this.callback_state_update);
    }

    componentWillUnmount(): void {
        this.props.icon?.status_change_callbacks.remove(this.callback_state_update);
    }
}