/// <reference path="../../client.ts" />
/// <reference path="../../../../vendor/bbcode/xbbcode.ts" />

abstract class InfoManagerBase {
    private timers: NodeJS.Timer[] = [];
    private intervals: number[] = [];

    protected resetTimers() {
        for(let timer of this.timers)
            clearTimeout(timer);
        this.timers = [];
    }

    protected resetIntervals() {
        for(let interval of this.intervals)
            clearInterval(interval);
        this.intervals = [];
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
    protected handle?: InfoBar<undefined>;

    createFrame<_>(handle: InfoBar<_>, object: T, html_tag: JQuery<HTMLElement>) {
        this.handle = handle as InfoBar<undefined>;
    }

    abstract updateFrame(object: T, html_tag: JQuery<HTMLElement>);

    finalizeFrame(object: T, frame: JQuery<HTMLElement>) {
        this.resetIntervals();
        this.resetTimers();
        this.handle = undefined;
    }

    protected triggerUpdate() {
        if(this.handle)
            this.handle.update();
    }
}

class InfoBar<AvailableTypes = ServerEntry | ChannelEntry | ClientEntry | undefined> {
    readonly handle: TSClient;

    private current_selected?: AvailableTypes;
    private _htmlTag: JQuery<HTMLElement>;
    private _tag_info: JQuery<HTMLElement>;
    private _tag_banner: JQuery<HTMLElement>;

    private current_manager: InfoManagerBase = undefined;
    private managers: InfoManagerBase[] = [];
    private banner_manager: Hostbanner;

    constructor(client: TSClient, htmlTag: JQuery<HTMLElement>) {
        this.handle = client;
        this._htmlTag = htmlTag;
        this._tag_info = htmlTag.find(".container-select-info");
        this._tag_banner = htmlTag.find(".container-banner");

        this.managers.push(new MusicInfoManager());
        this.managers.push(new ClientInfoManager());
        this.managers.push(new ChannelInfoManager());
        this.managers.push(new ServerInfoManager());

        this.banner_manager = new Hostbanner(client, this._tag_banner);
    }

    setCurrentSelected(entry: AvailableTypes) {
        if(this.current_selected == entry) return;
        if(this.current_manager) {
            (this.current_manager as InfoManager<AvailableTypes>).finalizeFrame(this.current_selected, this._tag_info);
            this.current_manager = null;
            this.current_selected = null;
        }
        this._tag_info.empty();

        this.current_selected = entry;
        for(let manager of this.managers) {
            if(manager.available(this.current_selected)) {
                this.current_manager = manager;
                break;
            }
        }

        console.log("Using info manager: %o", this.current_manager);
        if(this.current_manager)
            (this.current_manager as InfoManager<AvailableTypes>).createFrame(this, this.current_selected, this._tag_info);
    }

    get currentSelected() {
        return this.current_selected;
    }

    update(){
        if(this.current_manager && this.current_selected)
            (this.current_manager as InfoManager<AvailableTypes>).updateFrame(this.current_selected, this._tag_info);
    }

    update_banner() {
        this.banner_manager.update();
    }
}

class Hostbanner {
    readonly html_tag: JQuery<HTMLElement>;
    readonly client: TSClient;

    private updater: NodeJS.Timer;

    constructor(client: TSClient, htmlTag: JQuery<HTMLElement>) {
        this.client = client;
        this.html_tag = htmlTag;
    }

    update() {
        if(this.updater) {
            clearTimeout(this.updater);
            this.updater = undefined;
        }

        const tag = this.generate_tag();

        if(tag) {
            tag.then(element => {
                this.html_tag.empty();
                this.html_tag.append(element);
                this.html_tag.prop("disabled", false);
            }).catch(error => {
                console.warn("Failed to load hostbanner: %o", error);
                this.html_tag.empty();
                this.html_tag.prop("disabled", true);
            })
        } else {
            this.html_tag.empty();
            this.html_tag.prop("disabled", true);
        }
    }

    private generate_tag?() : Promise<JQuery<HTMLElement>> {
        if(!this.client.connected) return undefined;

        const server = this.client.channelTree.server;
        if(!server) return undefined;
        if(!server.properties.virtualserver_hostbanner_gfx_url) return undefined;

        let properties: any = {};
        for(let key in server.properties)
            properties["property_" + key] = server.properties[key];

        const rendered = $("#tmpl_selected_hostbanner").renderTag(properties);
        const image = rendered.find("img");
        return new Promise<JQuery<HTMLElement>>((resolve, reject) => {
            const node_image = image[0] as HTMLImageElement;
            node_image.onload = () => {
                console.debug("Hostbanner has been loaded");
                if(server.properties.virtualserver_hostbanner_gfx_interval > 0)
                    this.updater = setTimeout(() => this.update(), Math.min(server.properties.virtualserver_hostbanner_gfx_interval, 60) * 1000);
                resolve(rendered);
            };
            node_image.onerror = event => {
                reject(event);
            }
        });
    }
}

class ClientInfoManager extends InfoManager<ClientEntry> {
    available<V>(object: V): boolean {
        return typeof object == "object" && object instanceof ClientEntry;
    }

    createFrame<_>(handle: InfoBar<_>, client: ClientEntry, html_tag: JQuery<HTMLElement>) {
        super.createFrame(handle, client, html_tag);

        client.updateClientVariables();
        this.updateFrame(client, html_tag);
    }

    updateFrame(client: ClientEntry, html_tag: JQuery<HTMLElement>) {
        this.resetIntervals();
        html_tag.empty();

        let properties = this.buildProperties(client);

        let rendered = $("#tmpl_selected_client").renderTag(properties);
        html_tag.append(rendered);

        this.registerInterval(setInterval(() => {
            html_tag.find(".update_onlinetime").text(formatDate(client.calculateOnlineTime()));
        }, 1000));
    }

    buildProperties(client: ClientEntry) : any  {
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

        if(client.properties.client_flag_avatar && client.properties.client_flag_avatar.length > 0) {
            properties["client_avatar"] = client.channelTree.client.fileManager.avatars.generateTag(client);
        }
        return properties;
    }
}

class ServerInfoManager extends InfoManager<ServerEntry> {
    createFrame<_>(handle: InfoBar<_>, server: ServerEntry, html_tag: JQuery<HTMLElement>) {
        super.createFrame(handle, server, html_tag);

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

        this.registerInterval(setInterval(() => {
            html_tag.find(".update_onlinetime").text(formatDate(server.calculateUptime()));
        }, 1000));


        {
            let requestUpdate = rendered.find(".btn_update");
            requestUpdate.prop("disabled", !server.shouldUpdateProperties());

            requestUpdate.click(() => {
                server.updateProperties();
                this.triggerUpdate();
            });

            this.registerTimer(setTimeout(function () {
                requestUpdate.prop("disabled", false);
            }, server.nextInfoRequest - Date.now()));
        }

        html_tag.append(rendered);
    }

    available<V>(object: V): boolean {
        return typeof object == "object" && object instanceof ServerEntry;
    }
}

class ChannelInfoManager extends InfoManager<ChannelEntry> {
    createFrame<_>(handle: InfoBar<_>, channel: ChannelEntry, html_tag: JQuery<HTMLElement>) {
        super.createFrame(handle, channel, html_tag);
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

        let tag_channel_description = $.spawn("div");
        properties["bbcode_channel_description"] = tag_channel_description;

        channel.getChannelDescription().then(description => {
            let result = XBBCODE.process({
                text: description,
                escapeHtml: true,
                addInLineBreaks: true
            });
            if(result.error) {
                console.log("BBCode parse error: %o", result.errorQueue);
            }

            tag_channel_description.html(result.html);
        });

        let rendered = $("#tmpl_selected_channel").renderTag([properties]);
        html_tag.append(rendered);
    }

    available<V>(object: V): boolean {
        return typeof object == "object" && object instanceof ChannelEntry;
    }
}

function format_time(time: number) {
    let hours: any = 0, minutes: any = 0, seconds: any = 0;
    if(time >= 60 * 60) {
        hours = Math.floor(time / (60 * 60));
        time -= hours * 60 * 60;
    }
    if(time >= 60) {
        minutes = Math.floor(time / 60);
        time -= minutes * 60;
    }
    seconds = time;

    if(hours > 9)
        hours = hours.toString();
    else if(hours > 0)
        hours = '0' + hours.toString();
    else hours = '';

    if(minutes > 9)
        minutes = minutes.toString();
    else if(minutes > 0)
        minutes = '0' + minutes.toString();
    else
        minutes = '00';

    if(seconds > 9)
        seconds = seconds.toString();
    else if(seconds > 0)
        seconds = '0' + seconds.toString();
    else
        seconds = '00';

    return (hours ? hours + ":" : "") + minutes + ':' + seconds;
}

enum MusicPlayerState {
    SLEEPING,
    LOADING,

    PLAYING,
    PAUSED,
    STOPPED
}

class MusicInfoManager extends ClientInfoManager {
    createFrame<_>(handle: InfoBar<_>, channel: MusicClientEntry, html_tag: JQuery<HTMLElement>) {
        super.createFrame(handle, channel, html_tag);
        this.updateFrame(channel, html_tag);
    }

    updateFrame(bot: MusicClientEntry, html_tag: JQuery<HTMLElement>) {
        this.resetIntervals();
        html_tag.empty();

        let properties = super.buildProperties(bot);
        { //Render info frame
            if(bot.properties.player_state < MusicPlayerState.PLAYING) {
                properties["music_player"] =  $("#tmpl_music_frame_empty").renderTag().css("align-self", "center");
            } else {
                let frame = $.spawn("div").text("loading...") as JQuery<HTMLElement>;
                properties["music_player"] = frame;
                properties["song_url"] = $.spawn("a").text("loading...");

                bot.requestPlayerInfo().then(info => {
                    let timestamp = Date.now();

                    console.log(info);
                    let _frame = $("#tmpl_music_frame").renderTag({
                        song_name: info.player_title ? info.player_title :
                                    info.song_url ? info.song_url : "No title or url",
                        song_url: info.song_url,
                        thumbnail: info.song_thumbnail && info.song_thumbnail.length > 0 ? info.song_thumbnail : undefined
                    }).css("align-self", "center");
                    properties["song_url"].text(info.song_url);

                    frame.replaceWith(_frame);
                    frame = _frame;

                    /* Play/Pause logic */
                    {
                        let button_play = frame.find(".button_play");
                        let button_pause = frame.find(".button_pause");
                        let button_stop = frame.find('.button_stop');
                        button_play.click(handler => {
                            if(!button_play.hasClass("active")) {
                                this.handle.handle.serverConnection.sendCommand("musicbotplayeraction", {
                                    botid: bot.properties.client_database_id,
                                    action: 1
                                }).then(updated => this.triggerUpdate()).catch(error => {
                                    createErrorModal("Failed to execute play", MessageHelper.formatMessage("Failed to execute play.<br>{}", error)).open();
                                    this.triggerUpdate();
                                });
                            }
                            button_pause.show();
                            button_play.hide();
                        });
                        button_pause.click(handler => {
                            if(!button_pause.hasClass("active")) {
                                this.handle.handle.serverConnection.sendCommand("musicbotplayeraction", {
                                    botid: bot.properties.client_database_id,
                                    action: 2
                                }).then(updated => this.triggerUpdate()).catch(error => {
                                    createErrorModal("Failed to execute pause", MessageHelper.formatMessage("Failed to execute pause.<br>{}", error)).open();
                                    this.triggerUpdate();
                                });
                            }
                            button_play.show();
                            button_pause.hide();
                        });
                        button_stop.click(handler => {
                            this.handle.handle.serverConnection.sendCommand("musicbotplayeraction", {
                                botid: bot.properties.client_database_id,
                                action: 0
                            }).then(updated => this.triggerUpdate()).catch(error => {
                                createErrorModal("Failed to execute stop", MessageHelper.formatMessage("Failed to execute stop.<br>{}", error)).open();
                                this.triggerUpdate();
                            });
                        });

                        if(bot.properties.player_state == 2) {
                            button_play.hide();
                            button_pause.show();
                        } else if(bot.properties.player_state == 3) {
                            button_pause.hide();
                            button_play.show();
                        }  else if(bot.properties.player_state == 4) {
                            button_pause.hide();
                            button_play.show();
                        }
                    }

                    { /* Button functions */
                        _frame.find(".btn-forward").click(() => {
                            this.handle.handle.serverConnection.sendCommand("musicbotplayeraction", {
                                botid: bot.properties.client_database_id,
                                action: 3
                            }).then(updated => this.triggerUpdate()).catch(error => {
                                createErrorModal("Failed to execute forward", "Failed to execute pause.<br>{}".format(error)).open();
                                this.triggerUpdate();
                            });
                        });
                        _frame.find(".btn-rewind").click(() => {
                            this.handle.handle.serverConnection.sendCommand("musicbotplayeraction", {
                                botid: bot.properties.client_database_id,
                                action: 4
                            }).then(updated => this.triggerUpdate()).catch(error => {
                                createErrorModal("Failed to execute rewind", "Failed to execute pause.<br>{}".format(error)).open();
                                this.triggerUpdate();
                            });
                        });
                        _frame.find(".btn-settings").click(() => {
                            createErrorModal("Not implemented", "This function is not implemented yet!").open();
                        });
                    }


                    /* Required flip card javascript */
                    frame.find(".right").mouseenter(() => {
                        frame.find(".controls-overlay").addClass("flipped");
                    });
                    frame.find(".right").mouseleave(() => {
                        frame.find(".controls-overlay").removeClass("flipped");
                    });

                    /* Slider */
                    frame.find(".timeline .slider").on('mousedown', ev => {
                        let timeline = frame.find(".timeline");
                        let time = frame.find(".time");
                        let slider = timeline.find(".slider");
                        let slider_old = slider.css("margin-left");

                        let time_max = parseInt(timeline.attr("time-max"));
                        slider.prop("editing", true);

                        let target_timestamp = 0;
                        let move_handler = (event: MouseEvent) => {
                            let max = timeline.width();
                            let current = event.pageX - timeline.offset().left - slider.width() / 2;
                            if(current < 0) current = 0;
                            else if(current > max) current = max;

                            target_timestamp = current / max * time_max;
                            time.text(format_time(Math.floor(target_timestamp / 1000)));
                            slider.css("margin-left", current / max * 100 + "%");
                        };

                        let finish_handler = event => {
                            console.log("Event (%i | %s): %o", event.button, event.type, event);
                            if(event.type == "mousedown" && event.button != 2) return;
                            $(document).unbind("mousemove", move_handler as any);
                            $(document).unbind("mouseup mouseleave mousedown", finish_handler as any);

                            if(event.type != "mousedown") {
                                slider.prop("editing", false);
                                slider.prop("edited", true);

                                let current_timestamp = info.player_replay_index + Date.now() - timestamp;
                                this.handle.handle.serverConnection.sendCommand("musicbotplayeraction", {
                                    botid: bot.properties.client_database_id,
                                    action: current_timestamp > target_timestamp ? 6 : 5,
                                    units: current_timestamp < target_timestamp ? target_timestamp - current_timestamp : current_timestamp - target_timestamp
                                }).then(() => this.triggerUpdate()).catch(error => {
                                    slider.prop("edited", false);
                                });
                            } else { //Restore old
                                event.preventDefault();
                                slider.css("margin-left", slider_old + "%");
                            }
                        };

                        $(document).on('mousemove', move_handler as any);
                        $(document).on('mouseup mouseleave mousedown', finish_handler as any);

                        ev.preventDefault();
                        return false;
                    });

                    {
                        frame.find(".timeline").attr("time-max", info.player_max_index);
                        let timeline = frame.find(".timeline");
                        let time_bar = timeline.find(".played");
                        let slider = timeline.find(".slider");

                        let player_time = _frame.find(".player_time");
                        let update_handler = () => {
                            let time_index = info.player_replay_index + (bot.properties.player_state == 2 ? Date.now() - timestamp : 0);

                            time_bar.css("width", time_index / info.player_max_index * 100 + "%");
                            if(!slider.prop("editing") && !slider.prop("edited")) {
                                player_time.text(format_time(Math.floor(time_index / 1000)));
                                slider.css("margin-left", time_index / info.player_max_index * 100 + "%");
                            }
                       };
                        this.registerInterval(setInterval(update_handler, 1000));
                        update_handler();
                    }
                });
            }

            const player = properties["music_player"];
            const player_transformer = $.spawn("div").append(player);
            player_transformer.css({
                'display': 'block',
                //'width': "100%",
                'height': '100%'
            });
            properties["music_player"] = player_transformer;
        }

        let rendered = $("#tmpl_selected_music").renderTag([properties]);
        html_tag.append(rendered);

        {
            const player = properties["music_player"] as JQuery;
            const player_width = 400; //player.width();
            const player_height = 400; //player.height();

            const parent = player.parent();
            parent.css({
                'flex-grow': 1,
                'display': 'flex',
                'flex-direction': 'row',
                'justify-content': 'space-around',
            });

            const padding = 14;
            const scale_x = Math.min((parent.width() - padding) / player_width, 1.5);
            const scale_y = Math.min((parent.height() - padding) / player_height, 1.5);
            let scale = Math.min(scale_x, scale_y);

            let translate_x = 50, translate_y = 50;
            if(scale_x == scale_y && scale_x == scale) {
                //Equal scale
            } else if(scale_x == scale) {
                //We scale on the x-Axis
                //We have to adjust the y-Axis
            } else {
                //We scale on the y-Axis
                //We have to adjust the x-Axis

            }
            //1 => 0 | 0
            //1.5 => 0 | 25
            //0.5 => 0 | -25
            //const translate_x = scale_x != scale ? 0 : undefined || 50 - (50 * ((parent.width() - padding) / player_width));
            //const translate_y = scale_y != scale || scale_y > 1 ? 0 : undefined || 50 - (50 * ((parent.height() - padding) / player_height));
            const transform = ("translate(0%, " + (scale * 50 - 50)  + "%) scale(" + scale.toPrecision(2)  + ")");

            console.log("Parents: %o | %o", parent.width(), parent.height());
            console.log("Player: %o | %o", player_width, player_height);
            console.log("Scale: %f => translate: %o | %o", scale, translate_x, translate_y);
            player.css({
                transform:  transform
            });
            console.log("Transform: " + transform);
        }
    }

    available<V>(object: V): boolean {
        return typeof object == "object" && object instanceof MusicClientEntry;
    }

}