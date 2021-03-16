import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import {
    ModalBookmarksAddServerEvents,
    ModalBookmarksAddServerVariables, TargetBookmarkInfo
} from "tc-shared/ui/modal/bookmarks-add-server/Definitions";
import {Registry} from "tc-events";
import {createIpcUiVariableProvider, IpcUiVariableProvider} from "tc-shared/ui/utils/IpcVariable";
import {spawnModal} from "tc-shared/ui/react-elements/modal";
import {stringifyServerAddress} from "tc-shared/tree/Server";
import {bookmarks} from "tc-shared/Bookmarks";

class Controller {
    readonly handler: ConnectionHandler;
    readonly variables: IpcUiVariableProvider<ModalBookmarksAddServerVariables>;
    readonly events: Registry<ModalBookmarksAddServerEvents>;

    private readonly serverInfo: TargetBookmarkInfo;

    private readonly targetChannelId: number;
    private readonly targetChannelPassword: string;

    private readonly targetServerAddress: string;
    private readonly targetServerPassword: string;

    private readonly connectProfile: string;

    private bookmarkName: string;
    private useCurrentChannel: boolean;

    constructor(handler: ConnectionHandler) {
        this.handler = handler;

        this.variables = createIpcUiVariableProvider();
        this.events = new Registry<ModalBookmarksAddServerEvents>();

        if(handler.connected && handler.getClient().currentChannel()) {
            const currentChannel = handler.getClient().currentChannel();
            const handshakeHandler = handler.serverConnection.handshake_handler();

            this.targetServerAddress = stringifyServerAddress(handler.channelTree.server.remote_address);
            /* Password will be hashed since we're already connected to the server */
            this.targetServerPassword = handshakeHandler.parameters.serverPassword;
            this.connectProfile = handshakeHandler.parameters.profile.id;

            this.targetChannelId = currentChannel.channelId;
            this.targetChannelPassword = currentChannel.getCachedPasswordHash();

            this.serverInfo = {
                type: "success",

                handlerId: handler.handlerId,

                serverName: handler.channelTree.server.properties.virtualserver_name,
                serverUniqueId: handler.getCurrentServerUniqueId(),

                currentChannelName: currentChannel.channelName(),
                currentChannelId: currentChannel.channelId
            };

            this.bookmarkName = this.serverInfo.serverName;
        } else {
            this.serverInfo = { type: "not-connected" };
        }

        this.useCurrentChannel = false;

        this.variables.setVariableProvider("serverInfo", () => this.serverInfo);
        this.variables.setVariableProvider("bookmarkNameValid", () => {
            if(!this.bookmarkName) {
                return false;
            }

            return this.bookmarkName.length > 0 && this.bookmarkName.length < 40;
        });

        this.variables.setVariableProvider("bookmarkName", () => this.bookmarkName);
        this.variables.setVariableEditor("bookmarkName", newValue => {
            this.bookmarkName = newValue;
            this.variables.sendVariable("bookmarkNameValid");
        });

        this.variables.setVariableProvider("saveCurrentChannel", () => this.useCurrentChannel);
        this.variables.setVariableEditor("saveCurrentChannel", newValue => {
            this.useCurrentChannel = newValue;
        });

        this.events.on("action_add_bookmark", () => {
            if(this.serverInfo.type !== "success") {
                return;
            }

            if(!this.variables.getVariableSync("bookmarkNameValid")) {
                return;
            }

            bookmarks.createBookmark({
                displayName: this.bookmarkName || this.serverInfo.serverName,
                connectProfile: this.connectProfile,
                connectOnStartup: false,

                defaultChannelPasswordHash: this.targetChannelPassword,
                defaultChannel: this.useCurrentChannel ? ("/" + this.targetChannelId) : undefined,

                serverPasswordHash: this.targetServerPassword,
                serverAddress: this.targetServerAddress,

                previousEntry: undefined,
                parentEntry: undefined
            });

            this.events.fire("notify_bookmark_added");
        });
    }

    destroy() {
        this.events.destroy();
        this.variables.destroy();
    }
}

export function spawnModalAddCurrentServerToBookmarks(handler: ConnectionHandler) {
    const controller = new Controller(handler);
    const modal = spawnModal("modal-bookmark-add-server", [
        controller.events.generateIpcDescription(),
        controller.variables.generateConsumerDescription()
    ], {
        popoutable: true,
        popedOut: false
    });

    controller.events.on(["action_cancel", "notify_bookmark_added"], () => modal.destroy());
    modal.getEvents().on("destroy", () => controller.destroy());
    modal.show().then(undefined);
}