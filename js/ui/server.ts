/// <reference path="channel.ts" />
/// <reference path="modal/ModalServerEdit.ts" />

class ServerProperties {
    virtualserver_host: string = "";
    virtualserver_port: number = 0;

    virtualserver_name: string = "";
    virtualserver_icon_id: number = 0;
    virtualserver_version: string = "unknown";
    virtualserver_platform: string = "unknown";
    virtualserver_unique_identifier: string = "";

    virtualserver_clientsonline: number = 0;
    virtualserver_queryclientsonline: number = 0;
    virtualserver_channelsonline: number = 0;
    virtualserver_uptime: number = 0;
    virtualserver_maxclients: number = 0;
    virtualserver_reserved_slots: number = 0;

    virtualserver_password: string = "";
    virtualserver_flag_password: boolean = false;

    virtualserver_welcomemessage: string = "";

    virtualserver_hostmessage: string = "";
    virtualserver_hostmessage_mode: number = 0;

    virtualserver_hostbanner_url: string = "";
    virtualserver_hostbanner_gfx_url: string = "";
    virtualserver_hostbanner_gfx_interval: number = 0;
    virtualserver_hostbanner_mode: number = 0;

    virtualserver_hostbutton_tooltip: string = "";
    virtualserver_hostbutton_url: string = "";
    virtualserver_hostbutton_gfx_url: string = "";
}

interface ServerAddress {
    host: string;
    port: number;
}

class ServerEntry {
    remote_address: ServerAddress;
    channelTree: ChannelTree;
    properties: ServerProperties;

    lastInfoRequest: number = 0;
    nextInfoRequest: number = 0;
    private _htmlTag: JQuery<HTMLElement>;

    constructor(tree, name, address: ServerAddress) {
        this.properties = new ServerProperties();
        this.channelTree = tree;
        this.remote_address = address;
        this.properties.virtualserver_name = name;
    }

    get htmlTag() {
        if(this._htmlTag) return this._htmlTag;

        let tag = $.spawn("div");

        tag.attr("id", "server");
        tag.addClass("server");
        tag.append($.spawn("div").addClass("server_type icon client-server_green"));
        tag.append($.spawn("a").addClass("name").text(this.properties.virtualserver_name));

        const serverIcon = $("<span/>");
        //we cant spawn an icon on creation :)
        serverIcon.append($.spawn("div").addClass("icon_property icon_empty"));
        tag.append(serverIcon);

        return this._htmlTag = tag;
    }

    initializeListener(){
        const _this = this;

        this._htmlTag.click(function () {
            _this.channelTree.onSelect(_this);
        });

        if(!settings.static(Settings.KEY_DISABLE_CONTEXT_MENU, false)) {
            this.htmlTag.on("contextmenu", function (event) {
                event.preventDefault();
                _this.channelTree.onSelect(_this);
                _this.spawnContextMenu(event.pageX, event.pageY, () => { _this.channelTree.onSelect(undefined); });
            });
        }
    }

    spawnContextMenu(x: number, y: number, on_close: () => void = () => {}) {
        spawnMenu(x, y, {
                type: MenuEntryType.ENTRY,
                icon: "virtualserver_edit",
                name: "Edit",
                callback: () => {
                    Modals.createServerModal(this, properties => {
                        log.info(LogCategory.SERVER, "Changing server properties %o", properties);
                        console.log("Changed properties: %o", properties);
                        if (properties)
                            this.channelTree.client.serverConnection.sendCommand("serveredit", properties);
                    });
                }
            },
            MenuEntry.CLOSE(on_close)
        );
    }

    updateVariables(...variables: {key: string, value: string}[]) {
        let group = log.group(log.LogType.DEBUG, LogCategory.SERVER, "Update properties (%i)", variables.length);

        for(let variable of variables) {
            JSON.map_field_to(this.properties, variable.value, variable.key);

            group.log("Updating server " + this.properties.virtualserver_name + ". Key " + variable.key + " Value: '" + variable.value + "' (" + typeof (this.properties[variable.key]) + ")");
            if(variable.key == "virtualserver_name") {
                this.htmlTag.find(".name").text(variable.value);
            } else if(variable.key == "virtualserver_icon_id") {
                if(this.channelTree.client.fileManager && this.channelTree.client.fileManager.icons)
                    this.htmlTag.find(".icon_property").replaceWith(this.channelTree.client.fileManager.icons.generateTag(this.properties.virtualserver_icon_id).addClass("icon_property"));
            }
        }

        group.end();
    }

    updateProperties() {
        this.lastInfoRequest = new Date().getTime();
        this.nextInfoRequest =  this.lastInfoRequest + 10 * 1000;
        this.channelTree.client.serverConnection.sendCommand("servergetvariables");
    }

    shouldUpdateProperties() : boolean {
        return this.nextInfoRequest < Date.now();
    }

    calculateUptime() : number {
        if(this.properties.virtualserver_uptime == 0 || this.lastInfoRequest == 0) return this.properties.virtualserver_uptime;
        return this.properties.virtualserver_uptime + (new Date().getTime() - this.lastInfoRequest) / 1000;
    }
}