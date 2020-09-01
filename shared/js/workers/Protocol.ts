type WorkerMessageCommandResponseBase = {
    type: "response";
    token: string;

    timestampReceived: number;
    timestampSend: number;
}

export type WorkerMessageCommandResponseSuccess = WorkerMessageCommandResponseBase & {
    status: "success";
    result: any;
}

export type WorkerMessageCommandResponseError = WorkerMessageCommandResponseBase & {
    status: "error";
    error: string;
}

export type WorkerMessageCommandResponse = WorkerMessageCommandResponseError | WorkerMessageCommandResponseSuccess;

export type WorkerMessageCommand<Commands = {[key: string]: any}> = {
    type: "command";
    token: string;

    command: keyof Commands;
    payload: any;
}

export type WorkerMessageNotify = {
    type: "notify",

    notify: string,
    payload: any
}

export type WorkerMessage<Commands> = WorkerMessageCommand<Commands> | WorkerMessageCommandResponse | WorkerMessageNotify;

export type MessageHandler<Payload, Response> = (payload: Payload, context: MessageContext) => Response | Promise<Response>;
export type MessageContext = {
    transferObjects: Transferable[]
};

export type NotifyHandler<Payload> = (payload: Payload) => void;