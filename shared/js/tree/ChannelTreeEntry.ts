import {Registry} from "../events";

export interface ChannelTreeEntryEvents {
    notify_unread_state_change: { unread: boolean }
}

let treeEntryIdCounter = 0;
export abstract class ChannelTreeEntry<Events extends ChannelTreeEntryEvents> {
    readonly events: Registry<Events>;
    readonly uniqueEntryId: number;

    protected selected_: boolean = false;
    protected unread_: boolean = false;

    protected constructor() {
        this.uniqueEntryId = ++treeEntryIdCounter;
    }

    setUnread(flag: boolean) {
        if(this.unread_ === flag) return;
        this.unread_ = flag;

        this.events.fire("notify_unread_state_change", { unread: flag });
    }
    isUnread() { return this.unread_; }

    abstract showContextMenu(pageX: number, pageY: number, on_close?);
}