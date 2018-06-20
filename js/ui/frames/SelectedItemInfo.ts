/// <reference path="../../client.ts" />

abstract class InfoManagerBase {
    private timers: NodeJS.Timer[] = [];
    private intervals: number[] = [];

    protected resetTimers() {
        for(let timer of this.timers)
            clearTimeout(timer);
    }

    protected resetIntervals() {
        for(let interval of this.intervals)
            clearInterval(interval);
    }

    protected registerTimer(timer: NodeJS.Timer) {
        this.timers.push(timer);
    }

    protected registerInterval<T extends number | NodeJS.Timer>(interval: T) {
        this.intervals.push(interval as number);
    }

    abstract available<V>(object: V) : boolean;
}

abstract class InfoManager<T> extends InfoManagerBase {
    abstract createFrame(object: T, html_tag: JQuery<HTMLElement>);
    abstract updateFrame(object: T, html_tag: JQuery<HTMLElement>);

    finalizeFrame(object: T, frame: JQuery<HTMLElement>) {
        this.resetIntervals();
        this.resetTimers();
    }
}

class InfoBar {
    readonly handle: TSClient;

    private current_selected?: ServerEntry | ChannelEntry | ClientEntry;
    private _htmlTag: JQuery<HTMLElement>;

    private current_manager: InfoManagerBase = undefined;
    private managers: InfoManagerBase[] = [];

    constructor(client: TSClient, htmlTag: JQuery<HTMLElement>) {
        this.handle = client;
        this._htmlTag = htmlTag;

        this.managers.push(new ClientInfoManager());
        this.managers.push(new ChannelInfoManager());
        this.managers.push(new ServerInfoManager());

        //TODO music client
        /*
       this._htmlTag.append("Im a music bot!");
            let frame = $("#tmpl_music_frame" + (this.current_selected.properties.music_track_id == 0 ? "_empty" : "")).tmpl({
                thumbnail: "img/loading_image.svg"
            }).css("align-self", "center");

            if(this.current_selected.properties.music_track_id == 0) {

            } else {

            }

            this._htmlTag.append(frame);
         */
    }

    setCurrentSelected<T extends ServerEntry | ChannelEntry | ClientEntry | undefined>(entry: T) {
        if(this.current_selected == entry) return;
        if(this.current_manager) {
            (this.current_manager as InfoManager<undefined>).finalizeFrame.call(this.current_manager, this.current_selected, this._htmlTag);
            this.current_manager = null;
            this.current_selected = null;
        }
        this._htmlTag.empty();

        this.current_selected = entry;
        for(let manager of this.managers) {
            if(manager.available(this.current_selected)) {
                this.current_manager = manager;
                break;
            }
        }

        console.log("Using info manager: %o", this.current_manager);
        if(this.current_manager)
            (this.current_manager as InfoManager<undefined>).createFrame.call(this.current_manager, this.current_selected, this._htmlTag);
    }

    get currentSelected() {
        return this.current_selected;
    }

    update(){
        if(this.current_manager && this.current_selected)
            (this.current_manager as InfoManager<undefined>).updateFrame.call(this.current_manager, this.current_selected, this._htmlTag);
    }
}

class ClientInfoManager extends InfoManager<ClientEntry> {
    available<V>(object: V): boolean {
        return typeof object == "object" && object instanceof ClientEntry;
    }

    createFrame(client: ClientEntry, html_tag: JQuery<HTMLElement>) {
        client.updateClientVariables();
        this.updateFrame(client, html_tag);
    }

    updateFrame(client: ClientEntry, html_tag: JQuery<HTMLElement>) {
        this.resetIntervals();
        html_tag.empty();
        let properties: any = {};

        properties["client_name"] = client.createChatTag()[0];
        properties["client_onlinetime"] = formatDate(client.calculateOnlineTime());
        properties["sound_volume"] = client.audioController.volume * 100;

        properties["group_server"] = [];
        for(let groupId of client.assignedServerGroupIds()) {
            let group = client.channelTree.client.groups.serverGroup(groupId);
            if(!group) continue;

            let group_property = {};

            group_property["group_id"] = groupId;
            group_property["group_name"] = group.name;
            properties["group_server"].push(group_property);
            properties["group_" + groupId + "_icon"] = client.channelTree.client.fileManager.icons.generateTag(group.properties.iconid);
        }

        let group = client.channelTree.client.groups.channelGroup(client.assignedChannelGroup());
        if(group) {
            properties["group_channel"] = group.id;
            properties["group_" + group.id + "_name"] = group.name;
            properties["group_" + group.id + "_icon"] = client.channelTree.client.fileManager.icons.generateTag(group.properties.iconid);
        }

        for(let key in client.properties)
            properties["property_" + key] = client.properties[key];

        if(client.properties.client_teaforum_id > 0) {
            properties["teaspeak_forum"] = $.spawn("a")
                .attr("href", "//forum.teaspeak.de/index.php?members/" + client.properties.client_teaforum_id)
                .attr("target", "_blank")
                .text(client.properties.client_teaforum_id);
        }

        let rendered = $("#tmpl_selected_client").renderTag([properties]);
        rendered.find("node").each((index, element) => { $(element).replaceWith(properties[$(element).attr("key")]); });
        html_tag.append(rendered);

        this.registerInterval(setInterval(() => {
            html_tag.find(".update_onlinetime").text(formatDate(client.calculateOnlineTime()));
        }, 1000));
    }
}

class ServerInfoManager extends InfoManager<ServerEntry> {
    createFrame(server: ServerEntry, html_tag: JQuery<HTMLElement>) {
        if(server.shouldUpdateProperties()) server.updateProperties();
        this.updateFrame(server, html_tag);
    }

    updateFrame(server: ServerEntry, html_tag: JQuery<HTMLElement>) {
        this.resetIntervals();
        html_tag.empty();
        let properties: any = {};

        properties["server_name"] = $.spawn("a").text(server.properties.virtualserver_name);
        properties["server_onlinetime"] = formatDate(server.calculateUptime());
        properties["server_address"] = server.remote_address.host + ":" + server.remote_address.port;

        for(let key in server.properties)
            properties["property_" + key] = server.properties[key];

        let rendered = $("#tmpl_selected_server").renderTag([properties]);
        rendered.find("node").each((index, element) => { $(element).replaceWith(properties[$(element).attr("key")]); });
        html_tag.append(rendered);

        this.registerInterval(setInterval(() => {
            html_tag.find(".update_onlinetime").text(formatDate(server.calculateUptime()));
        }, 1000));


        //TODO update button
        /*
        let requestUpdate = $.spawn("button");
            requestUpdate.css("min-height", "16px");
            requestUpdate.css("bottom", 0);
            requestUpdate.text("update info");
            if(this.current_selected.shouldUpdateProperties())
                requestUpdate.css("color", "green");
            else {
                requestUpdate.attr("disabled", "true");
                requestUpdate.css("color", "red");
            }
            this._htmlTag.append(requestUpdate);

            const _server : ServerEntry = this.current_selected;
            const _this = this;
            requestUpdate.click(function () {
                _server.updateProperties();
                _this.buildBar();
            });
            this.timers.push(setTimeout(function () {
                requestUpdate.css("color", "green");
                requestUpdate.removeAttr("disabled");
            }, _server.nextInfoRequest - new Date().getTime()));
         */
    }

    available<V>(object: V): boolean {
        return typeof object == "object" && object instanceof ServerEntry;
    }
}

class ChannelInfoManager extends InfoManager<ChannelEntry> {
    createFrame(channel: ChannelEntry, html_tag: JQuery<HTMLElement>) {
        this.updateFrame(channel, html_tag);
    }

    updateFrame(channel: ChannelEntry, html_tag: JQuery<HTMLElement>) {
        this.resetIntervals();
        html_tag.empty();
        let properties: any = {};

        properties["channel_name"] = channel.createChatTag();
        properties["channel_type"] = ChannelType.normalize(channel.channelType());
        properties["channel_clients"] = channel.channelTree.clientsByChannel(channel).length;
        properties["channel_subscribed"] = true; //TODO

        for(let key in channel.properties)
            properties["property_" + key] = channel.properties[key];

        let rendered = $("#tmpl_selected_channel").renderTag([properties]);
        rendered.find("node").each((index, element) => { $(element).replaceWith(properties[$(element).attr("key")]); });
        html_tag.append(rendered);
    }

    available<V>(object: V): boolean {
        return typeof object == "object" && object instanceof ChannelEntry;
    }

}