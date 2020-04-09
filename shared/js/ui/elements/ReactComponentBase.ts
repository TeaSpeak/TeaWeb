import * as React from "react";

export abstract class ReactComponentBase<Properties, State> extends React.Component<Properties, State> {
    constructor(props: Properties) {
        super(props);

        this.state = this.default_state();
        this.initialize();
    }

    protected initialize() { }
    protected abstract default_state() : State;

    updateState(updates: {[key in keyof State]?: State[key]}) {
        if(Object.keys(updates).findIndex(e => updates[e] !== this.state[e]) === -1)
            return; /* no state has been changed */
        this.setState(Object.assign(this.state, updates));
    }

    protected classList(...classes: (string | undefined)[]) {
        return [...classes].filter(e => typeof e === "string" && e.length > 0).join(" ");
    }

    protected hasChildren() {
        const type = typeof this.props.children;
        if(type === "undefined") return false;

        return Array.isArray(this.props.children) ? this.props.children.length > 0 : true;
    }
}