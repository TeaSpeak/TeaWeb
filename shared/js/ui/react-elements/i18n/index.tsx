import * as React from "react";

let instances = [];
export class Translatable extends React.Component<{ message: string, children?: never } | { children: string }, { translated: string }> {
    constructor(props) {
        super(props);

        this.state = {
            translated: /* @tr-ignore */ tr(typeof this.props.children === "string" ? this.props.children : (this.props as any).message)
        }
    }

    render() {
        return this.state.translated;
    }

    componentDidMount(): void {
        instances.push(this);
    }

    componentWillUnmount(): void {
        const index = instances.indexOf(this);
        if(index === -1) {
            /* TODO: Log warning */
            return;
        }

        instances.splice(index, 1);
    }
}


declare global {
    interface Window {
        i18nInstances: Translatable[];
    }
}

window.i18nInstances = instances;