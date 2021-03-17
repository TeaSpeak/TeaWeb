import {LogCategory, logDebug, logWarn} from "../log";
import {ChannelEntry} from "../tree/Channel";
import {ClientEntry} from "../tree/Client";
import {htmlEscape} from "../ui/frames/chat";
import {guid} from "../crypto/uid";
import {server_connections} from "tc-shared/ConnectionManager";
import {tr} from "tc-shared/i18n/localize";

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
            logWarn(LogCategory.GENERAL, tr("Failed to generate client tag attribute 'client-unique-id': %o"), error);
        }
    }

    if(properties.client_name) {
        try {
            result = result + "client-name='" + encodeURIComponent(properties.client_name) + "' ";
        } catch(error) {
            logWarn(LogCategory.GENERAL, tr("Failed to generate client tag attribute 'client-name': %o"), error);
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


export namespace callbacks {
    export function callback_context_client(element: JQuery) {
        const client_id = parseInt(element.attr("client-id") || "0");
        const client_unique_id = decodeURIComponent(element.attr("client-unique-id") || "");
        /* we ignore the name, we cant find clients by name because the name is too volatile*/

        let client: ClientEntry;

        const current_connection = server_connections.getActiveConnectionHandler();
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
                    current_connection.channelTree.server.showContextMenu(mouse_coordinates.x, mouse_coordinates.y);
                    return;
                }
            }
        }
        if(!client) {

            /* we may should open a "offline" menu? */
            logDebug(LogCategory.GENERAL, "Failed to resolve client from html tag. Client id: %o, Client unique id: %o, Client name: %o",
                client_id,
                client_unique_id,
                decodeURIComponent(element.attr("client-name"))
            );
            return false;
        }

        client.showContextMenu(mouse_coordinates.x, mouse_coordinates.y);
        return false;
    }
}
window[callback_object_id] = callbacks;