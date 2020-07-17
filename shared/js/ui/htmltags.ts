import * as log from "tc-shared/log";
import {LogCategory} from "tc-shared/log";
import {ChannelEntry} from "tc-shared/ui/channel";
import {ClientEntry} from "tc-shared/ui/client";
import {htmlEscape} from "tc-shared/ui/frames/chat";
import {server_connections} from "tc-shared/ui/frames/connection_handlers";
import {guid} from "tc-shared/crypto/uid";

let mouse_coordinates: {x: number, y: number} = {x: 0, y: 0};

function initialize() {
    document.addEventListener('mousemove', event => {
        mouse_coordinates.x = event.pageX;
        mouse_coordinates.y = event.pageY;
    });
}
initialize();

export interface ClientProperties {
    client_id: number,
    client_unique_id: string,
    client_name: string,
    add_braces?: boolean,
    client_database_id?: number; /* not yet used */
}

export interface ChannelProperties {
    channel_id: number,
    channel_name: string,
    channel_display_name?: string,
    add_braces?: boolean
}

const callback_object_id = guid();
/* required for the bbcodes */
function generate_client_open(properties: ClientProperties) : string {
    let result = "";

    /* build the opening tag: <div ...> */
    result = result + "<div class='htmltag-client' ";

    if(properties.client_id)
        result = result + "client-id='" + properties.client_id + "' ";

    if(properties.client_unique_id && properties.client_unique_id != "unknown") {
        try {
            result = result + "client-unique-id='" + encodeURIComponent(properties.client_unique_id) + "' ";
        } catch(error) {
            console.warn(tr("Failed to generate client tag attribute 'client-unique-id': %o"), error);
        }
    }

    if(properties.client_name) {
        try {
            result = result + "client-name='" + encodeURIComponent(properties.client_name) + "' ";
        } catch(error) {
            console.warn(tr("Failed to generate client tag attribute 'client-name': %o"), error);
        }
    }

    /* add the click handler */
    result += "oncontextmenu='return window[\"" + callback_object_id + "\"].callback_context_client($(this));'";

    result = result + ">";
    return result;
}

export function generate_client(properties: ClientProperties) : string {
    let result = generate_client_open(properties);
    /* content */
    {
        if(properties.add_braces)
            result = result + "\"";

        result = result + htmlEscape(properties.client_name || "undefined").join(" ");
        if(properties.add_braces)
            result = result + "\"";
    }

    /* close tag */
    {
        result += "</div>";
    }
    return result;
}

export function generate_client_object(properties: ClientProperties) : JQuery {
    return $(this.generate_client(properties));
}

/* required for the bbcodes */
function generate_channel_open(properties: ChannelProperties) : string {
    let result = "";

    /* build the opening tag: <div ...> */
    result = result + "<div class='htmltag-channel' ";

    if(properties.channel_id)
        result = result + "channel-id='" + properties.channel_id + "' ";

    if(properties.channel_name)
        result = result + "channel-name='" + encodeURIComponent(properties.channel_name) + "' ";

    /* add the click handler */
    result += "oncontextmenu='return window[\"" + callback_object_id + "\"].callback_context_channel($(this));'";

    result = result + ">";
    return result;
}

export function generate_channel(properties: ChannelProperties) : string {
    let result = generate_channel_open(properties);
    /* content */
    {
        if(properties.add_braces)
            result = result + "\"";
        result = result + htmlEscape(properties.channel_display_name || properties.channel_name || "undefined").join(" ");
        if(properties.add_braces)
            result = result + "\"";
    }

    /* close tag */
    {
        result += "</div>";
    }
    return result;
}

export function generate_channel_object(properties: ChannelProperties) : JQuery {
    return $(this.generate_channel(properties));
}


export namespace callbacks {
    export function callback_context_client(element: JQuery) {
        const client_id = parseInt(element.attr("client-id") || "0");
        const client_unique_id = decodeURIComponent(element.attr("client-unique-id") || "");
        /* we ignore the name, we cant find clients by name because the name is too volatile*/

        let client: ClientEntry;

        const current_connection = server_connections.active_connection();
        if(current_connection && current_connection.channelTree) {
            if(!client && client_id) {
                client = current_connection.channelTree.findClient(client_id);
                if(client && (client_unique_id && client.properties.client_unique_identifier != client_unique_id)) {
                    client = undefined; /* client id dosn't match anymore, lets search for the unique id */
                }
            }
            if(!client && client_unique_id)
                client = current_connection.channelTree.find_client_by_unique_id(client_unique_id);

            if(!client) {
                if(current_connection.channelTree.server.properties.virtualserver_unique_identifier === client_unique_id) {
                    current_connection.channelTree.server.spawnContextMenu(mouse_coordinates.x, mouse_coordinates.y);
                    return;
                }
            }
        }
        if(!client) {

            /* we may should open a "offline" menu? */
            log.debug(LogCategory.GENERAL, "Failed to resolve client from html tag. Client id: %o, Client unique id: %o, Client name: %o",
                client_id,
                client_unique_id,
                decodeURIComponent(element.attr("client-name"))
            );
            return false;
        }

        client.showContextMenu(mouse_coordinates.x, mouse_coordinates.y);
        return false;
    }

    export function callback_context_channel(element: JQuery) {
        const channel_id = parseInt(element.attr("channel-id") || "0");

        const current_connection = server_connections.active_connection();
        let channel: ChannelEntry;
        if(current_connection && current_connection.channelTree) {
            channel = current_connection.channelTree.findChannel(channel_id);
        }

        if(!channel)
            return false;

        channel.showContextMenu(mouse_coordinates.x, mouse_coordinates.y);
        return false;
    }
}
window[callback_object_id] = callbacks;

namespace bbcodes {
    /* the = because we sometimes get that */
    //const url_client_regex = /?client:\/\/(?<client_id>[0-9]+)\/(?<client_unique_id>[a-zA-Z0-9+=#]+)~(?<client_name>(?:[^%]|%[0-9A-Fa-f]{2})+)$/g;
    const url_client_regex = /client:\/\/([0-9]+)\/([a-zA-Z0-9+=/#]+)~((?:[^%]|%[0-9A-Fa-f]{2})+)$/g; /* IDK which browsers already support group naming */
    const url_channel_regex = /channel:\/\/([0-9]+)~((?:[^%]|%[0-9A-Fa-f]{2})+)$/g;

    function initialize() {
        /* FIXME: Reimplement client BB codes */
        /*
        const origin_url = xbbcode.register.find_parser('url');
        xbbcode.register.register_parser({
            tag: 'url',
            build_html_tag_open(layer): string {
                if(layer.options) {
                    if(layer.options.match(url_channel_regex)) {
                        const groups = url_channel_regex.exec(layer.options);

                        return generate_channel_open({
                            add_braces: false,
                            channel_id: parseInt(groups[1]),
                            channel_name: decodeURIComponent(groups[2])
                        });
                    } else if(layer.options.match(url_client_regex)) {
                        const groups = url_client_regex.exec(layer.options);

                        return generate_client_open({
                            add_braces: false,
                            client_id: parseInt(groups[1]),
                            client_unique_id: groups[2],
                            client_name: decodeURIComponent(groups[3])
                        });
                    }
                }
                return origin_url.build_html_tag_open(layer);
            },
            build_html_tag_close(layer): string {
                if(layer.options) {
                    if(layer.options.match(url_client_regex))
                        return "</div>";
                    if(layer.options.match(url_channel_regex))
                        return "</div>";
                }
                return origin_url.build_html_tag_close(layer);
            }
        });
         */
    }
    initialize();
}