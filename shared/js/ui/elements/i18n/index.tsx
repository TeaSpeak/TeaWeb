import * as React from "react";

export class Translatable extends React.Component<{ message: string }, { translated: string }> {
    constructor(props) {
        super(props);
        this.state = {
            translated: /* @tr-ignore */ tr(props.message)
        }
    }

    render() {
        return this.state.translated;
    }
}