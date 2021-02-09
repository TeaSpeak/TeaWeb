import {spawnReactModal} from "tc-shared/ui/react-elements/modal";
import * as React from "react";
import {Registry} from "tc-shared/events";
import {FileBrowserRenderer, NavigationBar} from "./FileBrowserRenderer";
import {FileTransferInfo} from "./FileTransferInfo";
import {initializeRemoteFileBrowserController} from "./FileBrowserControllerRemote";
import {initializeTransferInfoController} from "./FileTransferInfoController";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {InternalModal} from "tc-shared/ui/react-elements/internal-modal/Controller";
import {server_connections} from "tc-shared/ConnectionManager";
import {channelPathPrefix, FileBrowserEvents} from "tc-shared/ui/modal/transfer/FileDefinitions";
import {TransferInfoEvents} from "tc-shared/ui/modal/transfer/FileTransferInfoDefinitions";

const cssStyle = require("./FileBrowserRenderer.scss");

class FileTransferModal extends InternalModal {
    readonly remoteBrowseEvents = new Registry<FileBrowserEvents>();
    readonly transferInfoEvents = new Registry<TransferInfoEvents>();

    private readonly defaultChannelId;

    constructor(defaultChannelId: number) {
        super();

        this.defaultChannelId = defaultChannelId;

        this.remoteBrowseEvents.enableDebug("remote-file-browser");
        this.transferInfoEvents.enableDebug("transfer-info");

        initializeRemoteFileBrowserController(server_connections.getActiveConnectionHandler(), this.remoteBrowseEvents);
        initializeTransferInfoController(server_connections.getActiveConnectionHandler(), this.transferInfoEvents);
    }

    protected onInitialize() {
        const path = this.defaultChannelId ? "/" + channelPathPrefix + this.defaultChannelId + "/" : "/";
        this.remoteBrowseEvents.fire("action_navigate_to", { path: path });
    }

    protected onDestroy() {
        this.remoteBrowseEvents.fire("notify_destroy");
        this.transferInfoEvents.fire("notify_destroy");
    }

    renderTitle() {
        return <Translatable>File Browser</Translatable>;
    }

    renderBody() {
        const path = this.defaultChannelId ? "/" + channelPathPrefix + this.defaultChannelId + "/" : "/";
        return (
            <div className={cssStyle.container}>
                <NavigationBar events={this.remoteBrowseEvents} initialPath={path} />
                <FileBrowserRenderer events={this.remoteBrowseEvents} initialPath={path} />
                <FileTransferInfo events={this.transferInfoEvents} />
            </div>
        )
    }
}

export function spawnFileTransferModal(channel: number) {
    const modal = spawnReactModal(FileTransferModal, channel);
    modal.show();
}