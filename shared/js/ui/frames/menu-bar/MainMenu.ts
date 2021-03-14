import * as loader from "tc-loader";
import {Stage} from "tc-loader";
import {getMenuBarDriver, MenuBarEntry} from "tc-shared/ui/frames/menu-bar/index";
import {ClientIcon} from "svg-sprites/client-icons";
import {global_client_actions} from "tc-shared/events/GlobalEvents";
import {server_connections} from "tc-shared/ConnectionManager";
import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import {getBackend} from "tc-shared/backend";
import {tr} from "tc-shared/i18n/localize";
import {bookmarks} from "tc-shared/Bookmarks";
import {RemoteIconInfo} from "tc-shared/file/Icons";
import {connectionHistory} from "tc-shared/connectionlog/History";
import {spawnModalAddCurrentServerToBookmarks} from "tc-shared/ui/modal/bookmarks-add-server/Controller";

function renderConnectionItems() {
    const items: MenuBarEntry[] = [];

    const currentConnectionConnected = !!server_connections.getActiveConnectionHandler()?.connected;
    items.push({
        type: "normal",
        label: tr("Connect to a server"),
        icon: ClientIcon.Connect,
        click: () => global_client_actions.fire("action_open_window_connect", { newTab: currentConnectionConnected })
    });

    items.push({
        type: "normal",
        label: tr("Disconnect from current server"),
        icon: ClientIcon.Disconnect,
        disabled: !currentConnectionConnected,
        click: () => server_connections.getActiveConnectionHandler()?.disconnectFromServer()
    });

    items.push({
        type: "normal",
        label: tr("Disconnect from all servers"),
        icon: ClientIcon.Disconnect,
        disabled: server_connections.getAllConnectionHandlers().findIndex(e => e.connected) === -1,
        click: () => server_connections.getAllConnectionHandlers().forEach(connection => connection.disconnectFromServer())
    });

    if(__build.target === "client") {
        items.push({ type: "separator" });
        items.push({
            type: "normal",
            label: tr("Quit"),
            icon: ClientIcon.CloseButton,
            click: () => getBackend("native").quit()
        });
    }

    return items;
}

async function renderBookmarkItems() {
    const bookmarkList = bookmarks.getOrderedRegisteredBookmarks();

    const bookmarkItems: MenuBarEntry[] = [];
    const parentStack: MenuBarEntry[][] = [];

    while(bookmarkList.length > 0) {
        const bookmark = bookmarkList.pop_front();
        const parentList = parentStack.pop() || bookmarkItems;

        if(bookmark.entry.type === "entry") {
            let icon: RemoteIconInfo;

            try {
                const connectInfo = await connectionHistory.lastConnectInfo(bookmark.entry.serverAddress, "address");
                if(connectInfo) {
                    const info = await connectionHistory.queryServerInfo(connectInfo.serverUniqueId);
                    if(info && info.iconId > 0) {
                        icon = { iconId: info.iconId, serverUniqueId: connectInfo.serverUniqueId };
                    }
                }
            } catch (_) {
                /* no need for any error handling */
            }

            parentList.push({
                type: "normal",
                label: bookmark.entry.displayName,
                icon: icon,
                click: () => bookmarks.executeConnect(bookmark.entry.uniqueId, false),
            });
        } else if(bookmark.entry.type === "directory") {
            const children = [];

            parentList.push({
                type: "normal",
                label: bookmark.entry.displayName,
                children: children,
                icon: ClientIcon.Folder,
            });

            for(let i = 0; i < bookmark.childCount; i++) {
                parentStack.push(children);
            }
        }
    }

    const items: MenuBarEntry[] = [];
    items.push({
        type: "normal",
        icon: ClientIcon.BookmarkManager,
        label: tr("Manage bookmarks"),
        click: () => global_client_actions.fire("action_open_window", { window: "bookmark-manage" })
    });

    items.push({
        type: "normal",
        icon: ClientIcon.BookmarkAdd,
        label: tr("Add current server to bookmarks"),
        disabled: !server_connections.getActiveConnectionHandler()?.connected,
        click: () => spawnModalAddCurrentServerToBookmarks(server_connections.getActiveConnectionHandler())
    });

    if(bookmarkItems.length !== 0) {
        items.push({ type: "separator" });
        items.push(...bookmarkItems);
    }

    return items;
}

function renderPermissionItems() : MenuBarEntry[] {
    const items: MenuBarEntry[] = [];

    const currentConnectionConnected = !!server_connections.getActiveConnectionHandler()?.connected;
    items.push({
        type: "normal",
        label: tr("Server Groups"),
        icon: ClientIcon.PermissionServerGroups,
        click: () => global_client_actions.fire("action_open_window_permissions", { defaultTab: "groups-server" }),
        disabled: !currentConnectionConnected
    });

    items.push({
        type: "normal",
        label: tr("Client Permissions"),
        icon: ClientIcon.PermissionClient,
        click: () => global_client_actions.fire("action_open_window_permissions", { defaultTab: "client" }),
        disabled: !currentConnectionConnected
    });

    items.push({
        type: "normal",
        label: tr("Channel Client Permissions"),
        icon: ClientIcon.PermissionClient,
        click: () => global_client_actions.fire("action_open_window_permissions", { defaultTab: "client-channel" }),
        disabled: !currentConnectionConnected
    });

    items.push({
        type: "normal",
        label: tr("Channel Groups"),
        icon: ClientIcon.PermissionChannel,
        click: () => global_client_actions.fire("action_open_window_permissions", { defaultTab: "groups-channel" }),
        disabled: !currentConnectionConnected
    });

    items.push({
        type: "normal",
        label: tr("Channel Permissions"),
        icon: ClientIcon.PermissionChannel,
        click: () => global_client_actions.fire("action_open_window_permissions", { defaultTab: "channel" }),
        disabled: !currentConnectionConnected
    });

    items.push({ type: "separator" });

    items.push({
        type: "normal",
        label: tr("List Privilege Keys"),
        icon: ClientIcon.Token,
        click: () => global_client_actions.fire("action_open_window", { window: "token-list" }),
        disabled: !currentConnectionConnected
    });

    items.push({
        type: "normal",
        label: tr("Use Privilege Key"),
        icon: ClientIcon.TokenUse,
        click: () => global_client_actions.fire("action_open_window", { window: "token-use" }),
        disabled: !currentConnectionConnected
    });

    return items;
}

function renderToolItems() : MenuBarEntry[] {
    const items: MenuBarEntry[] = [];

    const currentConnectionConnected = !!server_connections.getActiveConnectionHandler()?.connected;
    if(__build.target === "web") {
        items.push({
            type: "normal",
            label: tr("Echo Test"),
            icon: ClientIcon.ActivateMicrophone,
            click: () => global_client_actions.fire("action_open_window", { window: "server-echo-test" }),
            disabled: !currentConnectionConnected
        });
    }

    items.push({
        type: "normal",
        label: tr("Ban List"),
        icon: ClientIcon.BanList,
        click: () => global_client_actions.fire("action_open_window", { window: "ban-list" }),
        disabled: !currentConnectionConnected
    });

    items.push({
        type: "normal",
        label: tr("Query List"),
        icon: ClientIcon.ServerQuery,
        click: () => global_client_actions.fire("action_open_window", { window: "query-manage" }),
        disabled: !currentConnectionConnected
    });

    items.push({
        type: "normal",
        label: tr("Query Create"),
        icon: ClientIcon.ServerQuery,
        click: () => global_client_actions.fire("action_open_window", { window: "query-create" }),
        disabled: !currentConnectionConnected
    });

    items.push({ type: "separator" });

    items.push({
        type: "normal",
        label: tr("Modify CSS variables"),
        click: () => global_client_actions.fire("action_open_window", { window: "css-variable-editor" })
    });

    items.push({
        type: "normal",
        label: tr("Open Registry"),
        click: () => global_client_actions.fire("action_open_window", { window: "settings-registry" })
    });

    items.push({ type: "separator" });

    items.push({
        type: "normal",
        label: tr("Settings"),
        click: () => global_client_actions.fire("action_open_window_settings")
    });

    return items;
}

function renderHelpItems() : MenuBarEntry[] {
    const items: MenuBarEntry[] = [];

    if(__build.target === "client") {
        items.push({
            type: "normal",
            label: tr("Check for updates"),
            icon: ClientIcon.CheckUpdate,
            click: () => getBackend("native").openClientUpdater()
        });

        items.push({
            type: "normal",
            label: tr("Open client changelog"),
            click: () => getBackend("native").openChangeLog()
        });
    }

    items.push({
        type: "normal",
        label: tr("Visit TeaSpeak.de"),
        click: () => window.open('https://teaspeak.de/', '_blank')
    });

    items.push({
        type: "normal",
        label: tr("Visit TeaSpeak forum"),
        click: () => window.open('https://forum.teaspeak.de/', '_blank')
    });

    if(__build.target === "client" && getBackend("native").showDeveloperOptions()) {
        items.push({ type: "separator" });
        items.push({
            type: "normal",
            label: tr("Open developer tools"),
            click: () => getBackend("native").openDeveloperTools()
        });

        items.push({
            type: "normal",
            label: tr("Reload UI"),
            click: () => getBackend("native").reloadWindow()
        });
    }
    items.push({ type: "separator" });

    items.push({
        type: "normal",
        label: __build.target === "web" ? tr("About TeaWeb") : tr("About TeaClient"),
        click: () => global_client_actions.fire("action_open_window", { window: "about" })
    });

    return items;
}

function updateMenuBar() {
    /* TODO: Only run one update per time */
    doUpdateMenuBar().then(undefined);
}

async function doUpdateMenuBar() {
    const items: MenuBarEntry[] = [];

    items.push({
        type: "normal",
        label: tr("Connection"),
        children: renderConnectionItems()
    });

    items.push({
        type: "normal",
        label: tr("Favorites"),
        children: await renderBookmarkItems()
    });

    items.push({
        type: "normal",
        label: tr("Permissions"),
        children: renderPermissionItems()
    });

    items.push({
        type: "normal",
        label: tr("Tools"),
        children: renderToolItems()
    });

    items.push({
        type: "normal",
        label: tr("Help"),
        children: renderHelpItems()
    });

    /* TODO: Check if it's not exactly the same menu bar */
    getMenuBarDriver().setEntries(items);
}

let updateListener: MenuBarUpdateListener;
class MenuBarUpdateListener {
    private generalHandlerEvents: (() => void)[] = [];
    private registeredHandlerEvents: {[key: string]: (() => void)[]} = {};

    initializeListeners() {
        this.generalHandlerEvents.push(server_connections.events().on("notify_handler_created", event => {
            this.registerHandlerEvents(event.handler);
        }));
        this.generalHandlerEvents.push(server_connections.events().on("notify_handler_deleted", event => {
            this.registeredHandlerEvents[event.handlerId]?.forEach(callback => callback());
            delete this.registeredHandlerEvents[event.handlerId];
        }));
        this.generalHandlerEvents.push(server_connections.events().on("notify_active_handler_changed", () => updateMenuBar()));
        this.generalHandlerEvents.push(bookmarks.events.on(["notify_bookmark_deleted", "notify_bookmark_created", "notify_bookmark_edited", "notify_bookmarks_imported"], () => updateMenuBar()));
        server_connections.getAllConnectionHandlers().forEach(handler => this.registerHandlerEvents(handler));
    }

    destroy() {
        this.generalHandlerEvents.forEach(callback => callback());
        Object.keys(this.registeredHandlerEvents).forEach(id => this.registeredHandlerEvents[id].forEach(callback => callback()));

        this.registeredHandlerEvents = {};
        this.generalHandlerEvents = [];
    }

    private registerHandlerEvents(handler: ConnectionHandler) {
        const events = this.registeredHandlerEvents[handler.handlerId] = [];
        events.push(handler.events().on("notify_connection_state_changed", () => {
            updateMenuBar();
        }));
    }
}

loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    name: "menu bar init",
    function: async () => {
        updateMenuBar();

        updateListener = new MenuBarUpdateListener();
        updateListener.initializeListeners();
    },

    /* initialize after all other systems have been initialized */
    priority: 0
});