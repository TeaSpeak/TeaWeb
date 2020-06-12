import {CodecType} from "tc-backend/web/codec/Codec";
import {
    CWMessageCommand,
    CWCommand,
    CWMessage,
    CWMessageResponse,
    CWMessageErrorResponse, CWCommandResponseType
} from "tc-backend/web/codec/CodecWorkerMessages";

const prefix = "[CodecWorker] ";

export interface CodecWorker {
    name();
    initialise?() : string;
    deinitialise();
    decode(buffer: Uint8Array, responseBuffer: (length: number) => Uint8Array) : number | string;
    encode(buffer: Uint8Array, responseBuffer: (length: number) => Uint8Array) : number | string;

    reset();
}

let supported_types = {};
export function register_codec(type: CodecType, allocator: (options?: any) => Promise<CodecWorker>) {
    supported_types[type] = allocator;
}

let initialize_callback: () => Promise<true | string>;
export function set_initialize_callback(callback: () => Promise<true | string>) {
    initialize_callback = callback;
}

export let codec_instance: CodecWorker;
let globally_initialized = false;
let global_initialize_result;
let commandTransferableResponse: Transferable[];

let messageHandlers: { [T in keyof CWCommand]: (message: CWCommand[T]) => Promise<CWCommandResponseType<T>> } = {} as any;

function registerCommandHandler<T extends keyof CWCommand>(command: T, callback: (message: CWCommand[T]) => Promise<CWCommandResponseType<T>>) {
    messageHandlers[command as any] = callback;
}

const handleOwnerMessage = (e: MessageEvent) => {
    const timestampReceived = Date.now();
    const message = e.data as CWMessage;

    if(message.type === "error" || message.type === "success") {
        console.warn("%sReceived a command response within the worker. We're not sending any commands so this should not happen!", prefix);
        return;
    } else if(message.type === "notify") {
        console.warn("%sReceived a notify within the worker. This should not happen!", prefix);
        return;
    } else if(message.type === "command") {
        const command = message as CWMessageCommand;

        const sendExecuteError = error => {
            let errorMessage;
            if(typeof error === "string") {
                errorMessage = error;
            } else if(error instanceof Error) {
                console.error("%sMessage handle error: %o", prefix, error);
                errorMessage = error.message;
            } else {
                console.error("%sMessage handle error: %o", prefix, error);
                errorMessage = "lookup the console";
            }

            postMessage({
                type: "error",
                error: errorMessage,

                timestampReceived: timestampReceived,
                timestampSend: Date.now(),

                token: command.token
            } as CWMessageErrorResponse, undefined, commandTransferableResponse);
        };

        const sendExecuteResult = result => {
            postMessage({
                type: "success",
                response: result,

                timestampReceived: timestampReceived,
                timestampSend: Date.now(),

                token: command.token
            } as CWMessageResponse, undefined);
        };

        const handler = messageHandlers[message.command as any];
        if(!handler) {
            sendExecuteError("unknown command");
            return;
        }

        handler(command.payload).then(sendExecuteResult).catch(sendExecuteError);
    }
};
addEventListener("message", handleOwnerMessage);


/* command handlers */
registerCommandHandler("global-initialize", async () => {
    const init_result = globally_initialized ? global_initialize_result : await initialize_callback();
    globally_initialized = true;

    if(typeof init_result === "string")
        throw init_result;
});

registerCommandHandler("initialise", async data => {
    console.log(prefix + "Initialize for codec %s", CodecType[data.type as CodecType]);
    if(!supported_types[data.type])
        throw "type unsupported";

    try {
        codec_instance = await supported_types[data.type](data);
    } catch(ex) {
        console.error("%sFailed to allocate codec: %o", prefix, ex);
        throw typeof ex === "string" ? ex : "failed to allocate codec";
    }

    const error = codec_instance.initialise();
    if(error)
        throw error;
});

registerCommandHandler("reset", async () => {
    codec_instance.reset();
});

registerCommandHandler("finalize", async () => {
    /* memory will be cleaned up by its own */
});

let responseBuffer: Uint8Array;
const popResponseBuffer = () => { const temp = responseBuffer; responseBuffer = undefined; return temp; }
registerCommandHandler("decode-payload", async data => {
    if(!codec_instance)
        throw "codec not initialized/initialize failed";

    const byteLength = codec_instance.decode(new Uint8Array(data.buffer, data.byteOffset, data.byteLength), length => {
        if(length > data.maxByteLength)
            throw "source buffer too small to hold the result";
            //return responseBuffer = new Uint8Array(length);
        return responseBuffer = new Uint8Array(data.buffer, 0, data.maxByteLength);
    });
    const buffer = popResponseBuffer();
    if(typeof byteLength === "string") {
        throw byteLength;
    }

    commandTransferableResponse = [buffer.buffer];
    return {
        buffer: buffer.buffer,
        byteLength: byteLength,
        byteOffset: 0,
    };
});

registerCommandHandler("encode-payload", async data => {
    if(!codec_instance)
        throw "codec not initialized/initialize failed";

    const byteLength = codec_instance.encode(new Uint8Array(data.buffer, data.byteOffset, data.byteLength), length => {
        if(length > data.maxByteLength)
            throw "source buffer too small to hold the result";
            //return responseBuffer = new Uint8Array(length);
        return responseBuffer = new Uint8Array(data.buffer, 0, data.maxByteLength);
    });
    const buffer = popResponseBuffer();
    if(typeof byteLength === "string") {
        throw byteLength;
    }

    commandTransferableResponse = [buffer.buffer];
    return {
        buffer: buffer.buffer,
        byteLength: byteLength,
        byteOffset: 0
    };
});