import * as React from "react";
import * as ReactDOM from "react-dom";

export enum BatchUpdateType {
    UNSET = -1,
    GENERAL = 0,
    CHANNEL_TREE = 1
}

interface UpdateBatch {
    enabled: boolean;
    enable_count: number;

    update: {
        c: any;
        s: any;
        b: () => void;
    }[];

    force: {
        c: any;
        b: () => void;
    }[];
}

const generate_batch = () => { return { enabled: false, enable_count: 0, update: [], force: [] }};
let update_batches: {[key: number]:UpdateBatch} = {
    0: generate_batch(),
    1: generate_batch()
};

export function BatchUpdateAssignment(type: BatchUpdateType) {
    return function (constructor: Function) {
        if(!ReactComponentBase.prototype.isPrototypeOf(constructor.prototype))
            throw "Class/object isn't an instance of ReactComponentBase";

        const didMount = constructor.prototype.componentDidMount;
        constructor.prototype.componentDidMount = function() {
            if(typeof this.update_batch === "undefined")
                this.update_batch = update_batches[type];

            if(typeof didMount === "function")
                didMount.call(this, arguments);
        };
    }
}

export abstract class ReactComponentBase<Properties, State> extends React.Component<Properties, State> {
    private update_batch: UpdateBatch;

    private batch_component_id: number;
    private batch_component_force_id: number;

    constructor(props: Properties) {
        super(props);
        this.batch_component_id = -1;
        this.batch_component_force_id = -1;

        this.state = this.defaultState();
        this.initialize();
    }

    protected initialize() { }
    protected defaultState() : State { return {} as State; }

    setState<K extends keyof State>(
        state: ((prevState: Readonly<State>, props: Readonly<Properties>) => (Pick<State, K> | State | null)) | (Pick<State, K> | State | null),
        callback?: () => void
    ): void {
        if(typeof this.update_batch !== "undefined" && this.update_batch.enabled) {
            const obj = {
                c: this,
                s: Object.assign(this.update_batch.update[this.batch_component_id]?.s || {}, state),
                b: callback
            };
            if(this.batch_component_id === -1)
                this.batch_component_id = this.update_batch.update.push(obj) - 1;
            else
                this.update_batch.update[this.batch_component_id] = obj;
        } else {
            super.setState(state, callback);
        }
    }

    forceUpdate(callback?: () => void): void {
        if(typeof this.update_batch !== "undefined" && this.update_batch.enabled) {
            const obj = {
                c: this,
                b: callback
            };
            if(this.batch_component_force_id === -1)
                this.batch_component_force_id = this.update_batch.force.push(obj) - 1;
            else
                this.update_batch.force[this.batch_component_force_id] = obj;
        } else {
            super.forceUpdate(callback);
        }
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

export function batch_updates(type: BatchUpdateType) {
    const batch = update_batches[type];
    if(typeof batch === "undefined") throw "unknown batch type";

    batch.enabled = true;
    batch.enable_count++;
}

export function flush_batched_updates(type: BatchUpdateType, force?: boolean) {
    const batch = update_batches[type];
    if(typeof batch === "undefined") throw "unknown batch type";
    if(--batch.enable_count > 0 && !force) return;
    if(batch.enable_count < 0) throw "flush_batched_updates called more than batch_updates!";

    const updates = batch.update;
    const forces = batch.force;

    batch.update = [];
    batch.force = [];
    batch.enabled = batch.enable_count > 0;

    ReactDOM.unstable_batchedUpdates(() => {
        {
            let index = updates.length;
            while(index--) { /* fastest way to iterate */
                const update = updates[index];
                update.c.batch_component_id = -1;
                update.c.setState(update.s, update.b);
            }
        }
        {
            let index = forces.length;
            while(index--) { /* fastest way to iterate */
                const update = forces[index];
                update.c.batch_component_force_id = -1;
                update.c.forceUpdate(update.b);
            }
        }
    });
}