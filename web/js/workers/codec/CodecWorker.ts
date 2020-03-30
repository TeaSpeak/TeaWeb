import {CodecType} from "tc-backend/web/codec/Codec";

const prefix = "[CodecWorker] ";

export interface CodecWorker {
    name();
    initialise?() : string;
    deinitialise();
    decode(data: Uint8Array);
    encode(data: Float32Array) : Uint8Array | string;

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

export let codecInstance: CodecWorker;

function printMessageToServerTab(message: string) {
    /*
    sendMessage({
        token: workerCallbackToken,
        type: "chatmessage_server",
        message: message
    });
    */
}

declare function postMessage(message: any): void;
function sendMessage(message: any, origin?: string) {
    message["timestamp"] = Date.now();
    postMessage(message);
}

let globally_initialized = false;
let global_initialize_result;

/**
 * @param command
 * @param data
 * @return string on error or object on success
 */
async function handle_message(command: string, data: any) : Promise<string | object> {
    switch (command) {
        case "global-initialize":
            const init_result = globally_initialized ? global_initialize_result : await initialize_callback();
            globally_initialized = true;

            if(typeof init_result === "string")
                return init_result;

            return {};
        case "initialise":
            console.log(prefix + "Got initialize for type " + CodecType[data.type as CodecType]);
            if(!supported_types[data.type])
                return "type unsupported";

            try {
                codecInstance = await supported_types[data.type](data.options);
            } catch(ex) {
                console.error(prefix + "Failed to allocate codec: %o", ex);
                return typeof ex === "string" ? ex : "failed to allocate codec";
            }

            const error = codecInstance.initialise();
            if(error) return error;

            return {};
        case "encodeSamples":
            let encodeArray = new Float32Array(data.length);
            for(let index = 0; index < encodeArray.length; index++)
                encodeArray[index] = data.data[index];

            let encodeResult = codecInstance.encode(encodeArray);
            if(typeof encodeResult === "string")
                return encodeResult;
            else
                return { data: encodeResult, length: encodeResult.length };
        case "decodeSamples":
            let decodeArray = new Uint8Array(data.length);
            for(let index = 0; index < decodeArray.length; index++)
                decodeArray[index] = data.data[index];

            let decodeResult = codecInstance.decode(decodeArray);
            if(typeof decodeResult === "string")
                return decodeResult;
            else
                return { data: decodeResult, length: decodeResult.length };
        case "reset":
            codecInstance.reset();
            break;
        default:
            return "unknown command";
    }
}


const handle_message_event = (e: MessageEvent) => {
    const token = e.data.token;
    const received = Date.now();

    const send_result = result => {
        const data = {};
        if(typeof result === "object") {
            data["result"] = result;
            data["success"] = true;
        } else if(typeof result === "string") {
            data["error"] = result;
            data["success"] = false;
        } else {
            data["error"] = "invalid result";
            data["success"] = false;
        }
        data["token"] = token;
        data["timestamp_received"] = received;
        data["timestamp_send"] = Date.now();

        sendMessage(data, e.origin);
    };
    handle_message(e.data.command, e.data.data).then(res => {
        if(token) {
            send_result(res);
        }
    }).catch(error => {
        console.warn("An error has been thrown while handing command %s: %o", e.data.command, error);
        if(token) {
            send_result(typeof error === "string" ? error : "unexpected exception has been thrown");
        }
    });
};
addEventListener("message", handle_message_event);