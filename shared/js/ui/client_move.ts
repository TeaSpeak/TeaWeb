/// <reference path="client.ts" />

class ClientMover {
    static readonly listener_root = $(document);
    static readonly move_element = $("#mouse-move");
    readonly channel_tree: ChannelTree;

    selected_client: ClientEntry | ClientEntry[];

    hovered_channel: HTMLDivElement;
    callback: (channel?: ChannelEntry) => any;

    enabled: boolean = true;

    private _bound_finish;
    private _bound_move;
    private _active: boolean = false;

    private origin_point: {x: number, y: number} = undefined;

    constructor(tree: ChannelTree) {
        this.channel_tree = tree;
    }

    is_active() { return this._active; }

    private hover_text() {
        if($.isArray(this.selected_client)) {
            return this.selected_client.filter(client => !!client).map(client => client.clientNickName()).join(", ");
        } else if(this.selected_client) {
            return (<ClientEntry>this.selected_client).clientNickName();
        } else
            return "";
    }

    private bbcode_text() {
        if($.isArray(this.selected_client)) {
            return this.selected_client.filter(client => !!client).map(client => client.create_bbcode()).join(", ");
        } else if(this.selected_client) {
            return (<ClientEntry>this.selected_client).create_bbcode();
        } else
            return "";
    }

    activate(client: ClientEntry | ClientEntry[], callback: (channel?: ChannelEntry) => any, event: any) {
        this.finish_listener(undefined);

        if(!this.enabled)
            return false;

        this.selected_client = client;
        this.callback = callback;
        log.debug(LogCategory.GENERAL, tr("Starting mouse move"));

        ClientMover.listener_root.on('mouseup', this._bound_finish = this.finish_listener.bind(this)).on('mousemove', this._bound_move = this.move_listener.bind(this));

        {
            const content = ClientMover.move_element.find(".container");
            content.empty();
            content.append($.spawn("a").text(this.hover_text()));
        }
        this.move_listener(event);
    }

    private move_listener(event) {
        if(!this.enabled)
            return;

        //console.log("Mouse move: " + event.pageX + " - " + event.pageY);
        if(!event.pageX || !event.pageY) return;
        if(!this.origin_point)
            this.origin_point = {x: event.pageX, y: event.pageY};

        ClientMover.move_element.css({
            "top": (event.pageY - 1) + "px",
            "left": (event.pageX + 10) + "px"
        });

        if(!this._active) {
            const d_x = this.origin_point.x - event.pageX;
            const d_y = this.origin_point.y - event.pageY;
            this._active = Math.sqrt(d_x * d_x + d_y * d_y) > 5 * 5;

            if(this._active) {
                if($.isArray(this.selected_client)) {
                    this.channel_tree.onSelect(this.selected_client[0], true);
                    for(const client of this.selected_client.slice(1))
                        this.channel_tree.onSelect(client, false, true);
                } else {
                    this.channel_tree.onSelect(this.selected_client, true);
                }

                ClientMover.move_element.show();
            }
        }

        const elements = document.elementsFromPoint(event.pageX, event.pageY);
        while(elements.length > 0) {
            if(elements[0].classList.contains("container-channel")) break;
            elements.pop_front();
        }

        if(this.hovered_channel) {
            this.hovered_channel.classList.remove("move-selected");
            this.hovered_channel = undefined;
        }
        if(elements.length > 0) {
            elements[0].classList.add("move-selected");
            this.hovered_channel = elements[0] as HTMLDivElement;
        }
    }

    private finish_listener(event) {
        ClientMover.move_element.hide();
        log.debug(LogCategory.GENERAL, tr("Finishing mouse move"));

        const channel_id = this.hovered_channel ? parseInt(this.hovered_channel.getAttribute("channel-id")) : 0;
        ClientMover.listener_root.unbind('mouseleave', this._bound_finish);
        ClientMover.listener_root.unbind('mouseup', this._bound_finish);
        ClientMover.listener_root.unbind('mousemove', this._bound_move);
        if(this.hovered_channel) {
            this.hovered_channel.classList.remove("move-selected");
            this.hovered_channel = undefined;
        }

        this.origin_point = undefined;
        if(!this._active) {
            this.selected_client = undefined;
            this.callback = undefined;
            return;
        }

        this._active = false;
        if(this.callback) {
            if(!channel_id)
                this.callback(undefined);
            else {
                this.callback(this.channel_tree.findChannel(channel_id));
            }
            this.callback = undefined;
        }

        /* test for the chat box */
        {
            const elements = document.elementsFromPoint(event.pageX, event.pageY);
            console.error(elements);
            while(elements.length > 0) {
                if(elements[0].classList.contains("client-chat-box-field")) break;
                elements.pop_front();
            }

            if(elements.length > 0) {
                const element = $(<HTMLTextAreaElement>elements[0]);
                element.val((element.val() || "") + this.bbcode_text());
            }
        }
    }

    deactivate() {
        this.callback = undefined;
        this.finish_listener(undefined);
    }
}