import {ClientIcon} from "svg-sprites/client-icons";
import {VideoBroadcastType} from "tc-shared/connection/VideoConnection";

export type VideoViewerInfo = {
    handlerId: string,
    clientName: string,
    clientUniqueId: string,
    /* If undefined we don't know the client status */
    clientStatus: ClientIcon | undefined,
}

export type VideoViewerList = {
    [T in VideoBroadcastType ]?: number[]
} & {
    __internal_client_order: number[]
};

export interface ModalVideoViewersVariables {
    viewerInfo: VideoViewerInfo | undefined,
    videoViewers: VideoViewerList,
}

export interface ModalVideoViewersEvents {

}