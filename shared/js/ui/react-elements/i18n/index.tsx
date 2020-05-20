import * as React from "react";

export class Translatable extends React.Component<{ message: string, children?: never } | { children: string }, { translated: string }> {
    constructor(props) {
        super(props);

        this.state = {
            translated: /* @tr-ignore */ tr(props.message || props.children)
        }
    }

    render() {
        return this.state.translated || "";
    }
}