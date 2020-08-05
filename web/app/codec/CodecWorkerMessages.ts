import {CodecType} from "tc-backend/web/codec/Codec";

export type CWMessageResponse = {
    type: "success";
    token: string;

    response: any;

    timestampReceived: number;
    timestampSend: number;
};

export type CWMessageErrorResponse = {
    type: "error";
    token: string;

    error: string;

    timestampReceived: number;
    timestampSend: number;
}

export type CWMessageCommand<T = CWCommand | CWCommandResponse> = {
    type: "command";
    token: string;

    command: keyof T;
    payload: any;
}

export type CWMessageNotify = {
    type: "notify";
}

export type CWMessage = CWMessageCommand | CWMessageErrorResponse | CWMessageResponse | CWMessageNotify;

/* from handle to worker */
export interface CWCommand {
    "global-initialize": {},


    "initialise": {
        type: CodecType,
        channelCount: number
    },
    "reset": {}
    "finalize": {},

    "decode-payload": {
        buffer: ArrayBuffer;
        byteLength: number;
        byteOffset: number;
        maxByteLength: number;
    },

    "encode-payload": {
        buffer: ArrayBuffer;
        byteLength: number;
        byteOffset: number;
        maxByteLength: number;
    },
}

/* from worker to handle */
export interface CWCommandResponse {
    "decode-payload-result": {
        buffer: ArrayBuffer;
        byteLength: number;
        byteOffset: number;
    },

    "encode-payload-result": {
        buffer: ArrayBuffer;
        byteLength: number;
        byteOffset: number;
    }
}

export interface CWMessageRelations {
    "decode-payload": "decode-payload-result",
    "decode-payload-result": never,

    "encode-payload": "encode-payload-result",
    "encode-payload-result": never,

    "global-initialize": void,
    "initialise": void,
    "reset": void,
    "finalize": void
}

export type CWCommandResponseType<T extends keyof CWCommand | keyof CWCommandResponse> = CWMessageRelations[T] extends string ? CWCommandResponse[CWMessageRelations[T]] : CWMessageRelations[T];