const prefix = "[CodecWorker] ";
interface CodecWorker {
    name();
    initialise();
    deinitialise();
    decode(data: Uint8Array);
    encode(data: Float32Array) : Uint8Array | string;

    reset();
}

enum CodecWorkerType {
    WORKER_OPUS
}
let codecInstance: CodecWorker;

onmessage = function(e) {
    let data = JSON.parse(e.data);
    //console.log(data);

    let res: any = {};
    res.token = data.token;

    switch (data.command) {
        case "initialise":
            console.log(prefix + "Got initialize for type " + CodecWorkerType[data.type as CodecWorkerType]);
            switch (data.type as CodecWorkerType) {
                case CodecWorkerType.WORKER_OPUS:
                    codecInstance = new OpusWorker(data.channelCount, data.channelCount == 1 ? OpusType.VOIP : OpusType.AUDIO);
                    break;

                default:
                    console.error("Could not resolve opus type!");
                    return;
            }

            codecInstance.initialise();
            break;

        case "encodeSamples":
            let encodeArray = new Float32Array(data.dataLength);
            for(let index = 0; index < encodeArray.length; index++)
                encodeArray[index] = data.data[index];

            let encodeResult = codecInstance.encode(encodeArray);

            if(typeof encodeResult === "string") {
                res.success = false;
                res.message = encodeResult;
            } else {
                res.success = true;
                res.data = encodeResult;
                res.dataLength = encodeResult.length;
            }
            sendMessage(res, e.origin);
            break;

        case "decodeSamples":
            let decodeArray = new Uint8Array(data.dataLength);
            for(let index = 0; index < decodeArray.length; index++)
                decodeArray[index] = data.data[index];

            let decodeResult = codecInstance.decode(decodeArray);

            if(typeof decodeResult === "string") {
                res.success = false;
                res.message = decodeResult;
            } else {
                res.success = true;
                res.data = decodeResult;
                res.dataLength = decodeResult.length;
            }
            sendMessage(res, e.origin);
            break;

        case "reset":
            codecInstance.reset();
            break;

        default:
            console.error(prefix + "Unknown type " + data.command);
    }
};

declare function postMessage(message: any): void;
function sendMessage(message: any, origin: string){
    postMessage(JSON.stringify(message));
}