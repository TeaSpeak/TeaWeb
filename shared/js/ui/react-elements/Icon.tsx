import * as React from "react";

export interface IconProperties {
    icon: string | JQuery<HTMLDivElement>;
}

export class IconRenderer extends React.Component<IconProperties, {}> {
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