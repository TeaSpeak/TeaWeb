import {ConnectionHandler} from "../../../ConnectionHandler";
import {Registry} from "../../../events";
import {
    FileTransfer,
    FileTransferDirection,
    FileTransferState,
    TransferProgress,
    TransferProperties
} from "../../../file/Transfer";
import {
    avatarsPathPrefix,
    channelPathPrefix,
    iconPathPrefix,
    TransferStatus
} from "../../../ui/modal/transfer/ModalFileTransfer";
import {Settings, settings} from "../../../settings";
import {TransferInfoData, TransferInfoEvents} from "../../../ui/modal/transfer/TransferInfo";

export const initializeTransferInfoController = (connection: ConnectionHandler, events: Registry<TransferInfoEvents>) => {
    const generateTransferPath = (properties: TransferProperties) => {
        let path;
        if (properties.channel_id !== 0) {
            path = "/" + channelPathPrefix + properties.channel_id + properties.path;
        } else if (properties.name.startsWith("/avatar_")) {
            path = "/" + avatarsPathPrefix + "/";
        } else {
            path = "/" + iconPathPrefix + "/";
        }
        return path;
    };

    const getTransferStatus = (transfer: FileTransfer): TransferStatus => {
        switch (transfer.transferState()) {
            case FileTransferState.INITIALIZING:
            case FileTransferState.PENDING:
            case FileTransferState.CONNECTING:
                return "pending";
            case FileTransferState.RUNNING:
                return "transferring";
            case FileTransferState.FINISHED:
            case FileTransferState.CANCELED:
                return "finished";
            case FileTransferState.ERRORED:
                return "errored";
        }
    };

    const generateTransferInfo = (transfer: FileTransfer): TransferInfoData => {
        return {
            id: transfer.clientTransferId,
            direction: transfer.direction === FileTransferDirection.UPLOAD ? "upload" : "download",
            progress: 0,
            name: transfer.properties.name,
            path: generateTransferPath(transfer.properties),
            status: getTransferStatus(transfer),
            error: transfer.currentErrorMessage(),
            timestampRegistered: transfer.timings.timestampScheduled,
            timestampBegin: transfer.timings.timestampTransferBegin,
            timestampEnd: transfer.timings.timestampEnd,
            transferredBytes: transfer.lastProgressInfo() ? transfer.lastProgressInfo().file_current_offset - transfer.lastProgressInfo().file_start_offset : 0
        };
    };

    events.on("action_toggle_finished_transfers", event => {
        settings.changeGlobal(Settings.KEY_TRANSFERS_SHOW_FINISHED, event.visible);
    });

    events.on("action_remove_finished", () => {
        connection.fileManager.finishedTransfers.splice(0, connection.fileManager.finishedTransfers.length);
    });

    events.on("query_transfers", () => {
        const transfers: TransferInfoData[] = connection.fileManager.registeredTransfers().map(generateTransferInfo);
        transfers.push(...connection.fileManager.finishedTransfers.map(e => {
            return {
                id: e.clientTransferId,
                direction: e.direction === FileTransferDirection.UPLOAD ? "upload" : "download",
                progress: 100,
                name: e.properties.name,
                path: generateTransferPath(e.properties),

                status: e.state === FileTransferState.FINISHED ? "finished" : "errored",
                error: e.transferErrorMessage,

                timestampRegistered: e.timings.timestampScheduled,
                timestampBegin: e.timings.timestampTransferBegin,
                timestampEnd: e.timings.timestampEnd,

                transferredBytes: e.bytesTransferred
            } as TransferInfoData;
        }));

        events.fire_async("query_transfer_result", {
            status: "success",
            transfers: transfers,
            showFinished: settings.global(Settings.KEY_TRANSFERS_SHOW_FINISHED)
        });
    });

    /* the active transfer listener */
    {
        const listenToTransfer = (transfer: FileTransfer) => {
            const fireProgress = (progress: TransferProgress) => events.fire("notify_transfer_progress", {
                id: transfer.clientTransferId,
                progress: progress,
                status: "transferring",
            });

            const progressListener = (event: { progress: TransferProgress }) => fireProgress(event.progress);

            transfer.events.on("notify_progress", progressListener);

            transfer.events.on("notify_state_updated", () => {
                const status = getTransferStatus(transfer);
                if (transfer.lastProgressInfo()) fireProgress(transfer.lastProgressInfo()); /* fire the progress info at least once */
                events.fire("notify_transfer_status", {
                    id: transfer.clientTransferId,
                    status: status,
                    error: transfer.currentErrorMessage()
                });

                if (transfer.isFinished()) {
                    unregisterEvents();
                    return;
                }
            });

            events.fire("notify_transfer_registered", {transfer: generateTransferInfo(transfer)});

            const closeListener = () => unregisterEvents();
            events.on("notify_modal_closed", closeListener);

            const unregisterEvents = () => {
                events.off("notify_modal_closed", closeListener);
                transfer.events.off("notify_progress", progressListener);
            };
        };


        const registeredListener = event => listenToTransfer(event.transfer);
        connection.fileManager.events.on("notify_transfer_registered", registeredListener);
        events.on("notify_modal_closed", () => connection.fileManager.events.off("notify_transfer_registered", registeredListener));

        connection.fileManager.registeredTransfers().forEach(transfer => listenToTransfer(transfer));
    }
};