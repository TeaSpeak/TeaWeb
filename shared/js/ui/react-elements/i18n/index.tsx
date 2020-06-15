import * as React from "react";

export class Translatable extends React.Component<{ message: string, children?: never } | { children: string }, any> {
    constructor(props) {
        super(props);
    }

    render() {
        return /* @tr-ignore */ tr(typeof this.props.children === "string" ? this.props.children : (this.props as any).message);
    }
}