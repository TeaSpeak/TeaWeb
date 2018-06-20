/// <reference path="../../client.ts" />

abstract class InfoManagerBase {
    private timers: NodeJS.Timer[] = [];
    private intervals: number[] = [];

    protected resetTimers() {
        for(let interval of this.intervals)
            clearInterval(interval);
    }

    protected resetIntervals() {
        for(let timer of this.timers)
            clearTimeout(timer);
    }

    protected registerTimer(timer: NodeJS.Timer) {
        this.timers.push(timer);
    }

    protected registerInterval(interval: number) {
        this.intervals.push(interval);
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

    private timers: NodeJS.Timer[] = [];
    private intervals: number[] = [];

    private current_manager: InfoManagerBase = undefined;
    private managers: InfoManagerBase[] = [];

    constructor(client: TSClient, htmlTag: JQuery<HTMLElement>) {
        this.handle = client;
        this._htmlTag = htmlTag;

        this.managers.push(new ClientInfoManager());
    }


    private createInfoTable(infos: any) : JQuery<HTMLElement> {
        let table = $.spawn("table");

        for(let key in infos) {
            console.log("Display info " + key);
            let entry = $.spawn("tr");
            entry.append($.spawn("td").addClass("info_key").html(key + ":"));
            let value = $.spawn("td");
            console.log(infos[key]);
            console.log( MessageHelper.formatElement(infos[key]));
            MessageHelper.formatElement(infos[key]).forEach(e => e.appendTo(value));
            entry.append(value);
            table.append(entry);
        }

        return table;
    }

    setCurrentSelected<T extends ServerEntry | ChannelEntry | ClientEntry | undefined>(entry: T) {
        if(this.current_selected == entry) return;
        if(this.current_manager) {
            this.current_manager.finalizeFrame.call(this.current_manager, this.current_selected, this._htmlTag);
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

        console.log("Got info manager: %o", this.current_manager);
        if(this.current_manager) {
            this.current_manager.createFrame.call(this.current_manager, this.current_selected, this._htmlTag);
        } else this.buildBar(); //FIXME Remove that this is just for now (because not all types are implemented)
    }

    get currentSelected() {
        return this.current_selected;
    }

    update(){
        if(this.current_manager && this.current_selected)
            this.current_manager.updateFrame.call(this.current_manager, this.current_selected, this._htmlTag);
    }

    private updateServerTimings() {
        this._htmlTag.find(".uptime").text(formatDate((this.current_selected as ServerEntry).calculateUptime()));
    }

    private updateClientTimings() {
        this._htmlTag.find(".online").text(formatDate((this.current_selected as ClientEntry).calculateOnlineTime()));
    }

    private buildBar() {
        this._htmlTag.empty();
        if(!this.current_selected) return;


        if(this.current_selected instanceof ServerEntry) {
            if(this.current_selected.shouldUpdateProperties()) this.current_selected.updateProperties();

            let version = this.current_selected.properties.virtualserver_version;
            if(version.startsWith("TeaSpeak ")) version = version.substr("TeaSpeak ".length);

            this._htmlTag.append(this.createInfoTable({
                "Name": this.current_selected.properties.virtualserver_name,
                "Address": "unknown",
                "Type": "TeaSpeak",
                "Version": version + " on " + this.current_selected.properties.virtualserver_platform,
                "Uptime": "<a class='uptime'>" + formatDate(this.current_selected.calculateUptime()) + "</a>",
                "Current Channels": this.current_selected.properties.virtualserver_channelsonline,
                "Current Clients": this.current_selected.properties.virtualserver_clientsonline,
                "Current Queries": this.current_selected.properties.virtualserver_queryclientsonline
            }));

            this._htmlTag.append($.spawn("div").css("height", "100%"));
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
            this.intervals.push(setInterval(this.updateServerTimings.bind(this),1000));
        } else if(this.current_selected instanceof ChannelEntry) {
            let props = this.current_selected.properties;
            this._htmlTag.append(this.createInfoTable({
                "Name": this.current_selected.createChatTag(),
                "Topic": this.current_selected.properties.channel_topic,
                "Codec": this.current_selected.properties.channel_codec,
                "Codec Quality": this.current_selected.properties.channel_codec_quality,
                "Type": ChannelType.normalize(this.current_selected.channelType()),
                "Current clients": this.current_selected.channelTree.clientsByChannel(this.current_selected).length + " / " + (props.channel_maxclients == -1 ? "Unlimited" : props.channel_maxclients),
                "Subscription Status": "unknown",
                "Voice Data Encryption": "unknown"
            }));
        } else if(this.current_selected instanceof MusicClientEntry) {
            this._htmlTag.append("Im a music bot!");
            let frame = $("#tmpl_music_frame" + (this.current_selected.properties.music_track_id == 0 ? "_empty" : "")).tmpl({
                thumbnail: "img/loading_image.svg"
            }).css("align-self", "center");

            if(this.current_selected.properties.music_track_id == 0) {

            } else {

            }

            this._htmlTag.append(frame);
            //TODO
        } else if(this.current_selected instanceof ClientEntry) {
            this.current_selected.updateClientVariables();
            let version: string = this.current_selected.properties.client_version;
            if(!version) version = "";
            let infos = {
                "Name": this.current_selected.createChatTag(),
                "Description": this.current_selected.properties.client_description,
                "Version": MessageHelper.formatMessage("{0} on {1}", $.spawn("a").attr("title", version).text(version.split(" ")[0]), this.current_selected.properties.client_platform),
                "Online since": $.spawn("a").addClass("online").text(formatDate(this.current_selected.calculateOnlineTime())),
                "Volume": this.current_selected.audioController.volume * 100 + " %"
            };
            if(this.current_selected.properties.client_teaforum_id > 0) {
                infos["TeaSpeak Account"] = $.spawn("a")
                    .attr("href", "//forum.teaspeak.de/index.php?members/" + this.current_selected.properties.client_teaforum_id)
                    .attr("target", "_blank")
                    .text(this.current_selected.properties.client_teaforum_id);
            }
            this._htmlTag.append(this.createInfoTable(infos));

            {
                let serverGroups = $.spawn("div");
                serverGroups
                    .css("display", "flex")
                    .css("flex-direction", "column");

                let header = $.spawn("div");
                header
                    .css("display", "flex")
                    .css("margin-top", "5px")
                    .css("align-items", "center");
                $.spawn("div").addClass("icon client-permission_server_groups").appendTo(header);
                $.spawn("div").text("Server groups:").css("margin-left", "3px").css("font-weight", "bold").appendTo(header);
                header.appendTo(serverGroups);

                for(let groupId of this.current_selected.assignedServerGroupIds()) {
                    let group = this.handle.groups.serverGroup(groupId);
                    if(!group) continue;

                    let groupTag = $.spawn("div");
                    groupTag
                        .css("display", "flex")
                        .css("margin-top", "1px")
                        .css("margin-left", "10px")
                        .css("align-items", "center");
                    this.handle.fileManager.icons.generateTag(group.properties.iconid).appendTo(groupTag);
                    $.spawn("div").text(group.name).css("margin-left", "3px").appendTo(groupTag);
                    groupTag.appendTo(serverGroups);
                }

                this._htmlTag.append(serverGroups);
            }

            {
                let channelGroup = $.spawn("div");
                channelGroup
                    .css("display", "flex")
                    .css("flex-direction", "column")
                    .css("margin-bottom", "20px");

                let header = $.spawn("div");
                header
                    .css("display", "flex")
                    .css("margin-top", "10px")
                    .css("align-items", "center");
                $.spawn("div").addClass("icon client-permission_channel").appendTo(header);
                $.spawn("div").text("Channel group:").css("margin-left", "3px").css("font-weight", "bold").appendTo(header);
                header.appendTo(channelGroup);

                let group = this.handle.groups.channelGroup(this.current_selected.assignedChannelGroup());
                if(group) {
                    let groupTag = $.spawn("div");
                    groupTag
                        .css("display", "flex")
                        .css("margin-top", "1px")
                        .css("margin-left", "10px")
                        .css("align-items", "center");
                    this.handle.fileManager.icons.generateTag(group.properties.iconid).appendTo(groupTag);
                    $.spawn("div").text(group.name)
                        .css("margin-left", "3px").appendTo(groupTag);
                    groupTag.appendTo(channelGroup);

                }
                this._htmlTag.append(channelGroup);
            }

            {
                if(this.current_selected.properties.client_flag_avatar.length > 0)
                    this.handle.fileManager.avatars.generateTag(this.current_selected)
                        .css("max-height", "90%")
                        .css("max-width", "100%").appendTo(this._htmlTag);
            }

            {
                let spawnTag = (type: string, description: string) : JQuery => {
                    return $.spawn("div").css("display", "inline-flex")
                        .append($.spawn("div").addClass("icon_x32 client-" + type).css("margin-right", "5px"))
                        .append($.spawn("a").text(description).css("align-self", "center"));
                };

                if(!this.current_selected.properties.client_output_hardware)
                    spawnTag("hardware_output_muted", "Speakers/Headphones disabled").appendTo(this._htmlTag);


                if(!this.current_selected.properties.client_input_hardware)
                    spawnTag("hardware_input_muted", "Microphone disabled").appendTo(this._htmlTag);

                if(this.current_selected.properties.client_output_muted)
                    spawnTag("output_muted", "Speakers/Headphones Muted").appendTo(this._htmlTag);

                if(this.current_selected.properties.client_input_muted)
                    spawnTag("input_muted", "Microphone Muted").appendTo(this._htmlTag);
            }

            this.intervals.push(setInterval(this.updateClientTimings.bind(this),1000));
        }
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
        html_tag.empty();

        let properties: any = {};

        let version: string = client.properties.client_version;
        if(!version) version = "";

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

        let rendered = $($("#tmpl_selected_client").render([properties]));
        rendered.find("node").each((index, element) => { $(element).replaceWith(properties[$(element).attr("key")]); });
        html_tag.append(rendered);
        console.log(properties);
    }
}