/// <reference path="../../ConnectionHandler.ts" />
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
    readonly handle: ConnectionHandler;

    private current_selected?: AvailableTypes;

    private _tag: JQuery<HTMLElement>;
    private readonly _tag_info: JQuery<HTMLElement>;
    private readonly _tag_banner: JQuery<HTMLElement>;

    private _current_manager: InfoManagerBase = undefined;
    private managers: InfoManagerBase[] = [];
    private banner_manager: Hostbanner;

    constructor(client: ConnectionHandler) {
        this.handle = client;

        this._tag = $("#tmpl_select_info").renderTag();
        this._tag_info = this._tag.find(".container-select-info");
        this._tag_banner = this._tag.find(".container-banner");

        this.managers.push(new MusicInfoManager());
        this.managers.push(new ClientInfoManager());
        this.managers.push(new ChannelInfoManager());
        this.managers.push(new ServerInfoManager());

        this.banner_manager = new Hostbanner(client, this._tag_banner);

        this._tag.find("button.close").on('click', () => this.close_popover());
    }

    get_tag() : JQuery {
        return this._tag;
    }

    handle_resize() {
        /* test if the popover isn't a popover anymore */
        if(this._tag.parent().hasClass('shown')) {
            this._tag.parent().removeClass('shown');
            if(this.is_popover())
                this._tag.parent().addClass('shown');
        }

        this.banner_manager.handle_resize();
    }

    setCurrentSelected(entry: AvailableTypes) {
        if(this.current_selected == entry) return;

        if(this._current_manager) {
            (this._current_manager as InfoManager<AvailableTypes>).finalizeFrame(this.current_selected, this._tag_info);
            this._current_manager = null;
            this.current_selected = null;
        }
        this._tag_info.empty();

        this.current_selected = entry;
        for(let manager of this.managers) {
            if(manager.available(this.current_selected)) {
                this._current_manager = manager;
                break;
            }
        }

        console.log(tr("Using info manager: %o"), this._current_manager);
        if(this._current_manager)
            (this._current_manager as InfoManager<AvailableTypes>).createFrame(this, this.current_selected, this._tag_info);
    }

    get currentSelected() {
        return this.current_selected;
    }

    update(){
        if(this._current_manager && this.current_selected)
            (this._current_manager as InfoManager<AvailableTypes>).updateFrame(this.current_selected, this._tag_info);
    }

    update_banner() {
        this.banner_manager.update();
    }

    current_manager() { return this._current_manager; }

    is_popover() : boolean {
        return !this._tag.parent().is(':visible') || this._tag.parent().hasClass('shown');
    }

    open_popover() {
        this._tag.parent().toggleClass('shown', true);
        this.banner_manager.handle_resize();
    }

    close_popover() {
        this._tag.parent().toggleClass('shown', false);
    }

    rendered_tag() {
        return this._tag_info;
    }
}

interface Window {
    Image: typeof HTMLImageElement;
    HTMLImageElement: typeof HTMLImageElement;
}

class Hostbanner {
    readonly html_tag: JQuery<HTMLElement>;
    readonly client: ConnectionHandler;

    private updater: NodeJS.Timer;
    private _hostbanner_url: string;

    constructor(client: ConnectionHandler, htmlTag: JQuery<HTMLElement>) {
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
                const children = this.html_tag.children();
                this.html_tag.append(element).removeClass("disabled");

                /* allow the new image be loaded from cache URL */
                {
                    children
                        .css('z-index', '2')
                        .css('position', 'absolute')
                        .css('height', '100%')
                        .css('width', '100%');
                    setTimeout(() => {
                        children.detach();
                    }, 250);
                }
            }).catch(error => {
                console.warn(tr("Failed to load hostbanner: %o"), error);
                this.html_tag.empty().addClass("disabled");
            })
        } else {
            this.html_tag.empty().addClass("disabled");
        }
    }

    handle_resize() {
        this.html_tag.find("[x-divider-require-resize]").trigger('resize');
    }

    private generate_tag?() : Promise<JQuery<HTMLElement>> {
        if(!this.client.connected) return undefined;

        const server = this.client.channelTree.server;
        if(!server) return undefined;
        if(!server.properties.virtualserver_hostbanner_gfx_url) return undefined;

        let properties: any = {};
        for(let key in server.properties)
            properties["property_" + key] = server.properties[key];

        properties["hostbanner_gfx_url"] = server.properties.virtualserver_hostbanner_gfx_url;
        if(server.properties.virtualserver_hostbanner_gfx_interval > 0) {
            const update_interval = Math.max(server.properties.virtualserver_hostbanner_gfx_interval, 60);
            const update_timestamp = (Math.floor((Date.now() / 1000) / update_interval) * update_interval).toString();
            try {
                const url = new URL(server.properties.virtualserver_hostbanner_gfx_url);
                if(url.search.length == 0)
                    properties["hostbanner_gfx_url"] += "?_ts=" + update_timestamp;
                else
                    properties["hostbanner_gfx_url"] += "&_ts=" + update_timestamp;
            } catch(error) {
                console.warn(tr("Failed to parse banner URL: %o"), error);
                properties["hostbanner_gfx_url"] += "&_ts=" + update_timestamp;
            }

            this.updater = setTimeout(() => this.update(), update_interval * 1000);
        }

        const rendered = $("#tmpl_selected_hostbanner").renderTag(properties);

        /* ration watcher */
        if(server.properties.virtualserver_hostbanner_mode == 2) {
            const jimage = rendered.find(".meta-image");
            if(jimage.length == 0) {
                log.warn(LogCategory.SERVER, tr("Missing hostbanner meta image tag"));
            } else {
                const image = jimage[0];
                image.onload = event => {
                    const image: HTMLImageElement = jimage[0] as any;
                    rendered.on('resize', event => {
                        const container = rendered.parent();
                        container.css('height', null);
                        container.css('flex-grow', '1');

                        const max_height = rendered.visible_height();
                        const max_width = rendered.visible_width();
                        container.css('flex-grow', '0');


                        const original_height = image.naturalHeight;
                        const original_width = image.naturalWidth;

                        const ratio_height = max_height / original_height;
                        const ratio_width = max_width / original_width;

                        const ratio = Math.min(ratio_height, ratio_width);

                        if(ratio == 0)
                            return;
                        const hostbanner_height = ratio * original_height;
                        container.css('height', Math.ceil(hostbanner_height) + "px");
                        /* the width is ignorable*/
                    });
                    setTimeout(() => rendered.trigger('resize'), 100);
                };
            }
        }

        if(window.fetch) {
            return (async () => {
                const start = Date.now();

                const tag_image = rendered.find(".hostbanner-image");

                _fetch:
                try {
                    const result = await fetch(properties["hostbanner_gfx_url"]);

                    if(!result.ok) {
                        if(result.type === 'opaque' || result.type === 'opaqueredirect') {
                            log.warn(LogCategory.SERVER, tr("Could not load hostbanner because 'Access-Control-Allow-Origin' isnt valid!"));
                            break _fetch;
                        }
                    }

                    if(this._hostbanner_url) {
                        log.debug(LogCategory.SERVER, tr("Revoked old hostbanner url %s"), this._hostbanner_url);
                        URL.revokeObjectURL(this._hostbanner_url);
                    }
                    const url = (this._hostbanner_url = URL.createObjectURL(await result.blob()));
                    tag_image.css('background-image', 'url(' + url + ')');
                    tag_image.attr('src', url);
                    log.debug(LogCategory.SERVER, tr("Fetsched hostbanner successfully (%o, type: %o, url: %o)"), Date.now() - start, result.type, url);
                } catch(error) {
                    log.warn(LogCategory.SERVER, tr("Failed to fetch hostbanner image: %o"), error);
                }
                return rendered;
            })();
        } else {
            console.debug(tr("Hostbanner has been loaded"));
            return Promise.resolve(rendered);
        }
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
        properties["sound_volume"] = client.get_audio_handle() ? client.get_audio_handle().get_volume() * 100 : -1;
        properties["client_is_query"] = client.properties.client_type == ClientType.CLIENT_QUERY;
        properties["client_is_web"] = client.properties.client_type_exact == ClientType.CLIENT_WEB;

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
            properties["client_avatar"] = client.channelTree.client.fileManager.avatars.generate_client_tag(client);
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
        properties["hidden_clients"] = Math.max(0, server.properties.virtualserver_clientsonline - server.channelTree.clients.length);

        for(let key in server.properties)
            properties["property_" + key] = server.properties[key];

        let rendered = $("#tmpl_selected_server").renderTag([properties]);

        this.registerInterval(setInterval(() => {
            html_tag.find(".update_onlinetime").text(formatDate(server.calculateUptime()));
        }, 1000));


        {
            const disabled = !server.shouldUpdateProperties();
            let requestUpdate = rendered.find(".button-update");
            requestUpdate
                .prop("disabled", disabled)
                .toggleClass('btn-success', !disabled)
                .toggleClass('btn-danger', disabled);

            requestUpdate.click(() => {
                server.updateProperties();
                this.triggerUpdate();
            });

            this.registerTimer(setTimeout(function () {
                requestUpdate
                    .prop("disabled", false)
                    .toggleClass('btn-success', true)
                    .toggleClass('btn-danger', false);
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

        properties["channel_name"] = channel.generate_tag(false);
        properties["channel_type"] = ChannelType.normalize(channel.channelType());
        properties["channel_clients"] = channel.channelTree.clientsByChannel(channel).length;
        properties["channel_subscribed"] = true; //TODO
        properties["server_encryption"] = channel.channelTree.server.properties.virtualserver_codec_encryption_mode;

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

            tag_channel_description.html(result.html)
                .css("overflow-y", "auto")
                .css("flex-grow", "1");
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
    single_handler: connection.SingleCommandHandler;

    createFrame<_>(handle: InfoBar<_>, channel: MusicClientEntry, html_tag: JQuery<HTMLElement>) {
        super.createFrame(handle, channel, html_tag);
        this.updateFrame(channel, html_tag);
    }

    updateFrame(bot: MusicClientEntry, html_tag: JQuery<HTMLElement>) {
        if(this.single_handler) {
            this.handle.handle.serverConnection.command_handler_boss().remove_single_handler(this.single_handler);
            this.single_handler = undefined;
        }

        this.resetIntervals();
        html_tag.empty();

        let properties = super.buildProperties(bot);
        { //Render info frame
            if(bot.properties.player_state < MusicPlayerState.PLAYING) {
                properties["music_player"] =  $("#tmpl_music_frame_empty").renderTag().css("align-self", "center");
            } else {
                let frame = $.spawn("div").text(tr("loading...")) as JQuery<HTMLElement>;
                properties["music_player"] = frame;
                properties["song_url"] = $.spawn("a").text(tr("loading..."));

                bot.requestPlayerInfo().then(info => {
                    let timestamp = Date.now();

                    console.log(info);
                    let _frame = $("#tmpl_music_frame").renderTag({
                        song_name: info.player_title ? info.player_title :
                                    info.song_url ? info.song_url : tr("No title or url"),
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
                                this.handle.handle.serverConnection.send_command("musicbotplayeraction", {
                                    bot_id: bot.properties.client_database_id,
                                    action: 1
                                }).then(updated => this.triggerUpdate()).catch(error => {
                                    createErrorModal(tr("Failed to execute play"), MessageHelper.formatMessage(tr("Failed to execute play.<br>{}"), error)).open();
                                    this.triggerUpdate();
                                });
                            }
                            button_pause.show();
                            button_play.hide();
                        });
                        button_pause.click(handler => {
                            if(!button_pause.hasClass("active")) {
                                this.handle.handle.serverConnection.send_command("musicbotplayeraction", {
                                    bot_id: bot.properties.client_database_id,
                                    action: 2
                                }).then(updated => this.triggerUpdate()).catch(error => {
                                    createErrorModal(tr("Failed to execute pause"), MessageHelper.formatMessage(tr("Failed to execute pause.<br>{}"), error)).open();
                                    this.triggerUpdate();
                                });
                            }
                            button_play.show();
                            button_pause.hide();
                        });
                        button_stop.click(handler => {
                            this.handle.handle.serverConnection.send_command("musicbotplayeraction", {
                                bot_id: bot.properties.client_database_id,
                                action: 0
                            }).then(updated => this.triggerUpdate()).catch(error => {
                                createErrorModal(tr("Failed to execute stop"), MessageHelper.formatMessage(tr("Failed to execute stop.<br>{}"), error)).open();
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
                            this.handle.handle.serverConnection.send_command("musicbotplayeraction", {
                                bot_id: bot.properties.client_database_id,
                                action: 3
                            }).then(updated => this.triggerUpdate()).catch(error => {
                                createErrorModal(tr("Failed to execute forward"), tr("Failed to execute pause.<br>{}").format(error)).open();
                                this.triggerUpdate();
                            });
                        });
                        _frame.find(".btn-rewind").click(() => {
                            this.handle.handle.serverConnection.send_command("musicbotplayeraction", {
                                bot_id: bot.properties.client_database_id,
                                action: 4
                            }).then(updated => this.triggerUpdate()).catch(error => {
                                createErrorModal(tr("Failed to execute rewind"),tr( "Failed to execute pause.<br>{}").format(error)).open();
                                this.triggerUpdate();
                            });
                        });
                        _frame.find(".btn-settings").click(() => {
                            this.handle.handle.serverConnection.command_helper.request_playlist_list().then(lists => {
                                for(const entry of lists) {
                                    if(entry.playlist_id == bot.properties.client_playlist_id) {
                                        Modals.spawnPlaylistEdit(bot.channelTree.client, entry);
                                        return;
                                    }
                                }
                                createErrorModal(tr("Invalid permissions"), tr("You don't have to see the bots playlist.")).open();
                            }).catch(error => {
                                createErrorModal(tr("Failed to query playlist."), tr("Failed to query playlist info.")).open();
                            });
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
                                this.handle.handle.serverConnection.send_command("musicbotplayeraction", {
                                    bot_id: bot.properties.client_database_id,
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
                        let buffered_bar = timeline.find(".buffered");
                        let slider = timeline.find(".slider");

                        let player_time = _frame.find(".player_time");

                        let update_handler = (played?: number, buffered?: number) => {
                            let time_index = played || info.player_replay_index + (bot.properties.player_state == 2 ? Date.now() - timestamp : 0);
                            let buffered_index = buffered || 0;

                            time_bar.css("width", time_index / info.player_max_index * 100 + "%");
                            buffered_bar.css("width", buffered_index / info.player_max_index * 100 + "%");
                            if(!slider.prop("editing") && !slider.prop("edited")) {
                                player_time.text(format_time(Math.floor(time_index / 1000)));
                                slider.css("margin-left", time_index / info.player_max_index * 100 + "%");
                            }
                        };

                        let interval = setInterval(update_handler, 1000);
                        this.registerInterval(interval);
                        update_handler();

                        /* register subscription */
                        this.handle.handle.serverConnection.send_command("musicbotsetsubscription", {bot_id: bot.properties.client_database_id}).catch(error => {
                            console.error("Failed to subscribe to displayed music bot! Using pseudo timeline");
                        }).then(() => {
                            clearInterval(interval);
                        });

                        this.single_handler = {
                            command: "notifymusicstatusupdate",
                            function: command => {
                                const json = command.arguments[0];
                                update_handler(parseInt(json["player_replay_index"]), parseInt(json["player_buffered_index"]));

                                return false; /* do not unregister me! */
                            }
                        };

                        this.handle.handle.serverConnection.command_handler_boss().register_single_handler(this.single_handler);
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

            console.log(tr("Parents: %o | %o"), parent.width(), parent.height());
            console.log(tr("Player: %o | %o"), player_width, player_height);
            console.log(tr("Scale: %f => translate: %o | %o"), scale, translate_x, translate_y);
            player.css({
                transform:  transform
            });
            console.log("Transform: " + transform);
        }

        this.registerInterval(setInterval(() => {
            html_tag.find(".update_onlinetime").text(formatDate(bot.calculateOnlineTime()));
        }, 1000));
    }

    update_local_volume(volume: number) {
        this.handle.rendered_tag().find(".property-volume-local").text(Math.floor(volume * 100) + "%");
    }

    update_remote_volume(volume: number) {
        this.handle.rendered_tag().find(".property-volume-remote").text(Math.floor(volume * 100) + "%")
    }

    available<V>(object: V): boolean {
        return typeof object == "object" && object instanceof MusicClientEntry;
    }

    finalizeFrame(object: ClientEntry, frame: JQuery<HTMLElement>) {
        if(this.single_handler) {
            this.handle.handle.serverConnection.command_handler_boss().remove_single_handler(this.single_handler);
            this.single_handler = undefined;
        }

        super.finalizeFrame(object, frame);
    }

}