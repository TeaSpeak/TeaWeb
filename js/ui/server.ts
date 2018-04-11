/// <reference path="channel.ts" />

class ServerEntry {
    channelTree: ChannelTree;
    properties: any = {
        virtualserver_name: "",
        virtualserver_icon_id: 0,
        virtualserver_version: "unknown",
        virtualserver_platform: "unknown",
        virtualserver_unique_identifier: "",

        virtualserver_clientsonline: 0,
        virtualserver_queryclientsonline: 0,
        virtualserver_channelsonline: 0,
        virtualserver_uptime: 0,
        virtualserver_maxclients: 0
    };

    lastInfoRequest: number = 0;
    nextInfoRequest: number = 0;
    private _htmlTag: JQuery<HTMLElement>;

    constructor(tree, name) {
        this.channelTree = tree;
        this.properties.virtualserver_name = name;
    }

    get htmlTag() {
        if(this._htmlTag) return this._htmlTag;

        let tag = $.spawn("div");

        tag.attr("id", "server");
        tag.addClass("server");
        tag.append("<div class=\"icon client-server_green\"></div>");

        tag.append("<a class='name'>" + this.properties.virtualserver_name + "</a>");

        const serverIcon = $("<span/>");
        //we cant spawn an icon on creation :)
        serverIcon.append("<div class='icon_property icon_empty'></div>");
        tag.append(serverIcon);

        return this._htmlTag = tag;
    }

    initializeListener(){
        const _this = this;

        this._htmlTag.click(function () {
            _this.channelTree.onSelect(_this);
        });
        this.htmlTag.on("contextmenu", function (event) {
            _this.channelTree.onSelect(_this);
            event.preventDefault();
            _this.spawnContextMenue(event.pageY, event.pageY, () => { _this.channelTree.onSelect(undefined); });
        });
    }

    spawnContextMenue(x: number, y: number, on_close: () => void = () => {}) {
        spawnMenu(x, y, {
                type: MenuEntryType.ENTRY,
                icon: "",
                name: "test",
                callback: () => {}
            },
            MenuEntry.CLOSE(on_close)
        );
    }

    updateProperty(key, value) : void {
        console.trace("Updating property " + key + " => '" + value + "' for the server");
        this.properties[key] = value;
        if(key == "virtualserver_name") {
            this.htmlTag.find(".name").text(value);
        } else if(key == "virtualserver_icon_id") {
            if(this.channelTree.client.fileManager && this.channelTree.client.fileManager.icons)
                this.htmlTag.find(".icon_property").replaceWith(this.channelTree.client.fileManager.icons.generateTag(this.properties.virtualserver_icon_id).addClass("icon_property"));
        }
    }

    updateProperties() {
        this.lastInfoRequest = new Date().getTime();
        this.nextInfoRequest =  this.lastInfoRequest + 10 * 1000;
        this.channelTree.client.serverConnection.sendCommand("servergetvariables");
    }

    shouldUpdateProperties() : boolean {
        return this.nextInfoRequest < new Date().getTime();
    }

    calculateUptime() : number {
        if(this.properties.virtualserver_uptime == 0 || this.lastInfoRequest == 0) return Number.parseInt(this.properties.virtualserver_uptime);
        return Number.parseInt(this.properties.virtualserver_uptime) + (new Date().getTime() - this.lastInfoRequest) / 1000;
    }
}