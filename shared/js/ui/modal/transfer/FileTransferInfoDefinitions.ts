import {TransferStatus} from "tc-shared/ui/modal/transfer/FileDefinitions";
import {TransferProgress} from "tc-shared/file/Transfer";

export interface TransferInfoEvents {
    query_transfers: {},
    query_transfer_result: {
        status: "success" | "error" | "timeout";

        error?: string;
        transfers?: TransferInfoData[],
        showFinished?: boolean
    }

    action_toggle_expansion: { visible: boolean },
    action_toggle_finished_transfers: { visible: boolean },
    action_remove_finished: {},

    notify_transfer_registered: { transfer: TransferInfoData },
    notify_transfer_status: {
        id: number,
        status: TransferStatus,
        error?: string
    },
    notify_transfer_progress: {
        id: number;
        status: TransferStatus,
        progress: TransferProgress
    },

    notify_destroy: {}
}

export interface TransferInfoData {
    id: number;

    direction: "upload" | "download";
    status: TransferStatus;

    name: string;
    path: string;

    progress: number;
    error?: string;

    timestampRegistered: number;
    timestampBegin: number;
    timestampEnd: number;

    transferredBytes: number;
}