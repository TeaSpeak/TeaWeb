import {ServerConnectionInfoResult} from "tc-shared/tree/ServerDefinitions";

export interface ModalServerBandwidthEvents {
    notify_connection_info: { info: ServerConnectionInfoResult },
}