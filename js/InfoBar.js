/// <reference path="client.ts" />
class InfoBar {
    constructor(client, htmlTag) {
        this.timers = [];
        this.intervals = [];
        this.handle = client;
        this._htmlTag = htmlTag;
    }
    createInfoTable(infos) {
        let table = $("<table/>");
        for (let e in infos) {
            console.log("Display info " + e);
            let entry = $("<tr/>");
            entry.append("<td class='info_key'>" + e + ":</td>");
            entry.append("<td>" + infos[e] + "</td>");
            table.append(entry);
        }
        return table;
    }
    set currentSelected(entry) {
        if (this._currentSelected == entry)
            return;
        this._currentSelected = entry;
        this.buildBar();
    }
    get currentSelected() {
        return this._currentSelected;
    }
    update() {
        this.buildBar();
    }
    updateServerTimings() {
        this._htmlTag.find(".uptime").text(formatDate(this._currentSelected.calculateUptime()));
    }
    updateClientTimings() {
        this._htmlTag.find(".online").text(formatDate(this._currentSelected.calculateOnlineTime()));
    }
    buildBar() {
        this._htmlTag.empty();
        if (!this._currentSelected)
            return;
        for (let timer of this.timers)
            clearTimeout(timer);
        for (let timer of this.intervals)
            clearInterval(timer);
        if (this._currentSelected instanceof ServerEntry) {
            if (this._currentSelected.shouldUpdateProperties())
                this._currentSelected.updateProperties();
            let version = this._currentSelected.properties.virtualserver_version;
            if (version.startsWith("TeaSpeak "))
                version = version.substr("TeaSpeak ".length);
            this._htmlTag.append(this.createInfoTable({
                "Name": this._currentSelected.properties.virtualserver_name,
                "Address": "unknown",
                "Type": "TeaSpeak",
                "Version": version + " on " + this._currentSelected.properties.virtualserver_platform,
                "Uptime": "<a class='uptime'>" + formatDate(this._currentSelected.calculateUptime()) + "</a>",
                "Current Channels": this._currentSelected.properties.virtualserver_channelsonline,
                "Current Clients": this._currentSelected.properties.virtualserver_clientsonline,
                "Current Queries": this._currentSelected.properties.virtualserver_queryclientsonline
            }));
            this._htmlTag.append($.spawn("div").css("height", "100%"));
            let requestUpdate = $.spawn("button");
            requestUpdate.css("min-height", "16px");
            requestUpdate.css("bottom", 0);
            requestUpdate.text("update info");
            if (this._currentSelected.shouldUpdateProperties())
                requestUpdate.css("color", "green");
            else {
                requestUpdate.attr("disabled", "true");
                requestUpdate.css("color", "red");
            }
            this._htmlTag.append(requestUpdate);
            const _server = this._currentSelected;
            const _this = this;
            requestUpdate.click(function () {
                _server.updateProperties();
                _this.buildBar();
            });
            this.timers.push(setTimeout(function () {
                requestUpdate.css("color", "green");
                requestUpdate.removeAttr("disabled");
            }, _server.nextInfoRequest - new Date().getTime()));
            this.intervals.push(setInterval(this.updateServerTimings.bind(this), 1000));
        }
        else if (this._currentSelected instanceof ChannelEntry) {
            let props = this._currentSelected.properties;
            this._htmlTag.append(this.createInfoTable({
                "Name": this._currentSelected.createChatTag(),
                "Topic": this._currentSelected.properties.channel_topic,
                "Codec": this._currentSelected.properties.channel_codec,
                "Codec Quality": this._currentSelected.properties.channel_codec_quality,
                "Type": ChannelType.normalize(this._currentSelected.channelType()),
                "Current clients": this._currentSelected.channelTree.clientsByChannel(this._currentSelected).length + " / " + (props.channel_maxclients == -1 ? "Unlimited" : props.channel_maxclients),
                "Subscription Status": "unknown",
                "Voice Data Encryption": "unknown"
            }));
        }
        else if (this._currentSelected instanceof ClientEntry) {
            this._currentSelected.updateVariables();
            this._htmlTag.append(this.createInfoTable({
                "Name": this._currentSelected.createChatTag(),
                "Description": this._currentSelected.properties.client_description,
                "Version": this._currentSelected.properties.client_version + " on " + this._currentSelected.properties.client_platform,
                "Online since": "<a class='online'>" + formatDate(this._currentSelected.calculateOnlineTime()) + "</a>"
            }));
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
                for (let groupId of this._currentSelected.assignedServerGroupIds()) {
                    let group = this.handle.groups.serverGroup(groupId);
                    if (!group)
                        continue;
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
                    .css("flex-direction", "column");
                let header = $.spawn("div");
                header
                    .css("display", "flex")
                    .css("margin-top", "10px")
                    .css("align-items", "center");
                $.spawn("div").addClass("icon client-permission_channel").appendTo(header);
                $.spawn("div").text("Channel group:").css("margin-left", "3px").css("font-weight", "bold").appendTo(header);
                header.appendTo(channelGroup);
                let group = this.handle.groups.channelGroup(this._currentSelected.assignedChannelGroup());
                if (group) {
                    let groupTag = $.spawn("div");
                    groupTag
                        .css("display", "flex")
                        .css("margin-top", "1px")
                        .css("margin-left", "10px")
                        .css("align-items", "center");
                    this.handle.fileManager.icons.generateTag(group.properties.iconid).appendTo(groupTag);
                    $.spawn("div").text(group.name).css("margin-left", "3px").appendTo(groupTag);
                    groupTag.appendTo(channelGroup);
                }
                this._htmlTag.append(channelGroup);
            }
            const _this = this;
            this.intervals.push(setInterval(this.updateClientTimings.bind(this), 1000));
        }
    }
}
//# sourceMappingURL=InfoBar.js.map