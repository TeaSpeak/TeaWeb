import {SideBarType} from "tc-shared/ui/frames/SideBarDefinitions";
import {Registry} from "tc-shared/events";
import {ClientEntry, MusicClientEntry} from "tc-shared/tree/Client";
import {ConnectionHandler} from "tc-shared/ConnectionHandler";

export interface SideBarManagerEvents {
    notify_content_type_changed: { newContent: SideBarType }
}

export class SideBarManager {
    readonly events: Registry<SideBarManagerEvents>;
    private readonly connection: ConnectionHandler;
    private currentType: SideBarType;


    constructor(connection: ConnectionHandler) {
        this.events = new Registry<SideBarManagerEvents>();
        this.connection = connection;
        this.currentType = "channel";
    }

    destroy() {}

    getSideBarContent() : SideBarType {
        return this.currentType;
    }

    setSideBarContent(content: SideBarType) {
        if(this.currentType === content) {
            return;
        }

        this.currentType = content;
        this.events.fire("notify_content_type_changed", { newContent: content });
    }

    showPrivateConversations() {
        this.setSideBarContent("private-chat");
    }

    showChannel() {
        this.setSideBarContent("channel");
    }

    showServer() {
        this.setSideBarContent("server");
    }

    showClientInfo(client: ClientEntry) {
        this.connection.getSelectedClientInfo().setClient(client);
        this.setSideBarContent("client-info");
    }

    showMusicPlayer(_client: MusicClientEntry) {
        /* FIXME: TODO! */
        this.setSideBarContent("music-manage");
    }

    clearSideBar() {
        this.setSideBarContent("none");
    }
}