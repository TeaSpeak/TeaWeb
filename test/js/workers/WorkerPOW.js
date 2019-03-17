var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const prefix = "[POWWorker] ";
let initialized = false;
let memory;
let memory_u8;
let wasm_object;
function post_status(code, result) {
    let data = {};
    data.code = code;
    if (typeof (result) === "string") {
        data.success = false;
        data.message = result;
    }
    else if (typeof (result) === "boolean") {
        data.success = result;
    }
    else {
        data.success = true;
        Object.assign(data, result);
    }
    postMessage(data);
}
{
    memory = new WebAssembly.Memory({ initial: 1 });
    memory_u8 = new Uint8Array(memory.buffer);
    if (typeof (WebAssembly.instantiateStreaming) === "undefined") {
        WebAssembly.instantiateStreaming = (stream, imports) => __awaiter(this, void 0, void 0, function* () {
            const response = yield stream;
            const buffer = yield response.arrayBuffer();
            return WebAssembly.instantiate(buffer, imports);
        });
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
onmessage = function (e) {
    let data = e.data;
    //console.log(prefix + "Got data: %o", data);
    if (data.type == "set_data") {
        const key = data.private_key;
        key_offset = 0;
        for (const char of key)
            memory_u8[0x0A0 + key_offset++] = char.charCodeAt(0);
        post_status(data.code, true);
    }
    else if (data.type == "mine") {
        let hash = data.hash;
        const iterations = data.iterations;
        const target = data.target;
        hash_offset = 0;
        for (const char of hash) {
            memory_u8[0x0A0 + key_offset + hash_offset++] = char.charCodeAt(0);
        }
        let level = wasm_object.instance.exports.mine(key_offset, hash_offset, iterations, target > 1 ? target - 1 : target);
        hash = "";
        hash_offset = 0;
        while (memory_u8[0x0A0 + key_offset + hash_offset] != 0)
            hash = hash + String.fromCharCode(memory_u8[0x0A0 + key_offset + hash_offset++]);
        console.log(prefix + "New hash: %s, level %o", hash, level);
        post_status(data.code, {
            result: level >= target,
            hash: hash,
            level: level
        });
    }
    else if (data.type == "finalize") {
        wasm_object = undefined;
        memory = undefined;
        memory_u8 = undefined;
        post_status(data.code, true);
    }
};
//# sourceMappingURL=WorkerPOW.js.map