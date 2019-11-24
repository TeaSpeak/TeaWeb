declare namespace WebAssembly {
    export function instantiateStreaming(stream: Promise<Response>, imports?: any) : Promise<WebAssembly.WebAssemblyInstantiatedSource>;
}
declare function postMessage(message: any): void;

const prefix = "[POWWorker] ";

let initialized = false;

let memory: WebAssembly.Memory;
let memory_u8: Uint8Array;
let wasm_object: WebAssembly.WebAssemblyInstantiatedSource;

function post_status(code: string | undefined, result: boolean | string | any) {
    let data: any = {};
    data.code = code;
    if(typeof(result) === "string") {
        data.success = false;
        data.message = result;
    } else if(typeof(result) === "boolean") {
        data.success = result;
    } else {
        data.success = true;
        Object.assign(data, result);
    }

    postMessage(data);
}

{ /* initialize WASM handle */
    memory = new WebAssembly.Memory({ initial: 1 });
    memory_u8 = new Uint8Array(memory.buffer);

    if(typeof(WebAssembly.instantiateStreaming) === "undefined") {
        WebAssembly.instantiateStreaming = async (stream: Promise<Response>, imports?: any) => {
            const response = await stream;
            const buffer = await response.arrayBuffer();
            return WebAssembly.instantiate(buffer, imports);
        }
    }

    WebAssembly.instantiateStreaming(fetch('../../wat/pow/sha1.wasm'), {
        env: {
            memory: memory
        }
    }).then(object => {
        wasm_object = object;

        post_status("initialize", true);
    }).catch(error => {
        post_status("initialize", "failed to initialize WASM handle (" + error + ")");
    });
}

let key_offset = 0;
let hash_offset = 0;
onmessage = function(e: MessageEvent) {
    let data = e.data;

    if(data.type == "set_data") {
        const key = data.private_key;

        key_offset = 0;
        for(const char of key)
            memory_u8[0x0A0 + key_offset++] = char.charCodeAt(0);

        post_status(data.code, true);
    } else if(data.type == "mine") {
        let hash: string = data.hash;
        const iterations: number = data.iterations;
        const target: number = data.target;

        hash_offset = 0;
        for(const char of hash) {
            memory_u8[0x0A0 + key_offset + hash_offset++] = char.charCodeAt(0);
        }

        let level = (<any>wasm_object).instance.exports.mine(key_offset, hash_offset, iterations, target > 1 ? target - 1 : target);
        hash = "";

        hash_offset = 0;
        while(memory_u8[0x0A0 + key_offset + hash_offset] != 0)
            hash = hash + String.fromCharCode(memory_u8[0x0A0 + key_offset + hash_offset++]);

        // console.log(prefix + "New hash: %s, level %o", hash, level);
        post_status(data.code, {
            result: level >= target,
            hash: hash,
            level: level
        });
    } else if(data.type == "finalize") {
        wasm_object = undefined;
        memory = undefined;
        memory_u8 = undefined;

        post_status(data.code, true);
    }
};