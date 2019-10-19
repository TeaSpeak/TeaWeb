/// <reference path="../Identity.ts" />

namespace profiles.identities {
    export namespace CryptoHelper {
        export function base64_url_encode(str){
            return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/\=+$/, '');
        }

        export function base64_url_decode(str: string, pad?: boolean){
            if(typeof(pad) === 'undefined' || pad)
                str = (str + '===').slice(0, str.length + (str.length % 4));
            return str.replace(/-/g, '+').replace(/_/g, '/');
        }

        export function arraybuffer_to_string(buf) {
            return String.fromCharCode.apply(null, new Uint16Array(buf));
        }

        export async function export_ecc_key(crypto_key: CryptoKey, public_key: boolean) {
            /*
                Tomcrypt public key export:
                if (type == PK_PRIVATE) {
                   flags[0] = 1;
                   err = der_encode_sequence_multi(out, outlen,
                                             LTC_ASN1_BIT_STRING,      1UL, flags,
                                             LTC_ASN1_SHORT_INTEGER,   1UL, &key_size,
                                             LTC_ASN1_INTEGER,         1UL, key->pubkey.x,
                                             LTC_ASN1_INTEGER,         1UL, key->pubkey.y,
                                             LTC_ASN1_INTEGER,         1UL, key->k,
                                             LTC_ASN1_EOL,             0UL, NULL);
                } else {
                   flags[0] = 0;
                   err = der_encode_sequence_multi(out, outlen,
                                             LTC_ASN1_BIT_STRING,      1UL, flags,
                                             LTC_ASN1_SHORT_INTEGER,   1UL, &key_size,
                                             LTC_ASN1_INTEGER,         1UL, key->pubkey.x,
                                             LTC_ASN1_INTEGER,         1UL, key->pubkey.y,
                                             LTC_ASN1_EOL,             0UL, NULL);
                }

             */

            const key_data = await crypto.subtle.exportKey("jwk", crypto_key);

            let index = 0;
            const length = public_key ? 79 : 114; /* max lengths! Depends on the padding could be less */
            const buffer = new Uint8Array(length); /* fixed ASN1 length */
            { /* the initial sequence */
                buffer[index++] = 0x30; /* type */
                buffer[index++] = 0x00; /* we will set the sequence length later */
            }
            { /* the flags bit string */
                buffer[index++] = 0x03; /* type */
                buffer[index++] = 0x02; /* length */
                buffer[index++] = 0x07; /* data */
                buffer[index++] = public_key ? 0x00 : 0x80; /* flag 1 or 0 (1 = private key)*/
            }
            { /* key size (const 32 for P-256) */
                buffer[index++] = 0x02; /* type */
                buffer[index++] = 0x01; /* length */
                buffer[index++] = 0x20;
            }
            try { /* Public kex X */
                buffer[index++] = 0x02; /* type */
                buffer[index++] = 0x20; /* length */

                const raw = atob(base64_url_decode(key_data.x, false));
                if(raw.charCodeAt(0) > 0x7F) {
                    buffer[index - 1] += 1;
                    buffer[index++] = 0;
                }

                for(let i = 0; i < 32; i++)
                    buffer[index++] = raw.charCodeAt(i);
            } catch(error) {
                if(error instanceof DOMException)
                    throw "failed to parse x coordinate (invalid base64)";
                throw error;
            }

            try { /* Public kex Y */
                buffer[index++] = 0x02; /* type */
                buffer[index++] = 0x20; /* length */

                const raw = atob(base64_url_decode(key_data.y, false));
                if(raw.charCodeAt(0) > 0x7F) {
                    buffer[index - 1] += 1;
                    buffer[index++] = 0;
                }

                for(let i = 0; i < 32; i++)
                    buffer[index++] = raw.charCodeAt(i);
            } catch(error) {
                if(error instanceof DOMException)
                    throw "failed to parse y coordinate (invalid base64)";
                throw error;
            }

            if(!public_key) {
                try { /* Public kex K */
                    buffer[index++] = 0x02; /* type */
                    buffer[index++] = 0x20; /* length */

                    const raw = atob(base64_url_decode(key_data.d, false));
                    if(raw.charCodeAt(0) > 0x7F) {
                        buffer[index - 1] += 1;
                        buffer[index++] = 0;
                    }

                    for(let i = 0; i < 32; i++)
                        buffer[index++] = raw.charCodeAt(i);
                } catch(error) {
                    if(error instanceof DOMException)
                        throw "failed to parse y coordinate (invalid base64)";
                    throw error;
                }
            }

            buffer[1] = index - 2; /* set the final sequence length */

            return base64_encode_ab(buffer.buffer.slice(0, index));
        }

        const crypt_key = "b9dfaa7bee6ac57ac7b65f1094a1c155e747327bc2fe5d51c512023fe54a280201004e90ad1daaae1075d53b7d571c30e063b5a62a4a017bb394833aa0983e6e";
        function c_strlen(buffer: Uint8Array, offset: number) : number {
            let index = 0;
            while(index + offset < buffer.length && buffer[index + offset] != 0)
                index++;
            return index;
        }

        export async function decrypt_ts_identity(buffer: Uint8Array) : Promise<string> {
            /* buffer could contains a zero! */
            const hash = new Uint8Array(await sha.sha1(buffer.buffer.slice(20, 20 + c_strlen(buffer, 20))));
            for(let i = 0; i < 20; i++)
                buffer[i] ^= hash[i];

            const length = Math.min(buffer.length, 100);
            for(let i = 0; i < length; i++)
                buffer[i] ^= crypt_key.charCodeAt(i);

            return arraybuffer_to_string(buffer);
        }

        export async function encrypt_ts_identity(buffer: Uint8Array) : Promise<string> {
            const length = Math.min(buffer.length, 100);
            for(let i = 0; i < length; i++)
                buffer[i] ^= crypt_key.charCodeAt(i);

            const hash = new Uint8Array(await sha.sha1(buffer.buffer.slice(20, 20 + c_strlen(buffer, 20))));
            for(let i = 0; i < 20; i++)
                buffer[i] ^= hash[i];

            return base64_encode_ab(buffer);
        }

        /**
         * @param buffer base64 encoded ASN.1 string
         */
        export function decode_tomcrypt_key(buffer: string) {
            let decoded;

            try {
                decoded = asn1.decode(atob(buffer));
            } catch(error) {
                if(error instanceof DOMException)
                    throw "failed to parse key buffer (invalid base64)";
                throw error;
            }

            let {x, y, k} = {
                x: decoded.children[2].content(Infinity, asn1.TagType.VisibleString),
                y: decoded.children[3].content(Infinity, asn1.TagType.VisibleString),
                k: decoded.children[4].content(Infinity, asn1.TagType.VisibleString)
            };

            if(x.length > 32) {
                if(x.charCodeAt(0) != 0)
                    throw "Invalid X coordinate! (Too long)";
                x = x.substr(1);
            }

            if(y.length > 32) {
                if(y.charCodeAt(0) != 0)
                    throw "Invalid Y coordinate! (Too long)";
                y = y.substr(1);
            }

            if(k.length > 32) {
                if(k.charCodeAt(0) != 0)
                    throw "Invalid private coordinate! (Too long)";
                k = k.substr(1);
            }

            /*
            console.log("Key x: %s (%d)", btoa(x), x.length);
            console.log("Key y: %s (%d)", btoa(y), y.length);
            console.log("Key k: %s (%d)", btoa(k), k.length);
            */
            return {
                crv: "P-256",
                d: base64_url_encode(btoa(k)),
                x: base64_url_encode(btoa(x)),
                y: base64_url_encode(btoa(y)),

                ext: true,
                key_ops:["deriveKey", "sign"],
                kty:"EC",
            };
        }
    }

    class TeaSpeakHandshakeHandler extends AbstractHandshakeIdentityHandler {
        identity: TeaSpeakIdentity;
        handler: HandshakeCommandHandler<TeaSpeakHandshakeHandler>;

        constructor(connection: connection.AbstractServerConnection, identity: TeaSpeakIdentity) {
            super(connection);
            this.identity = identity;
            this.handler = new HandshakeCommandHandler(connection, this);
            this.handler["handshakeidentityproof"] = this.handle_proof.bind(this);
        }

        start_handshake() {
            this.connection.command_handler_boss().register_handler(this.handler);
            this.connection.send_command("handshakebegin", {
                intention: 0,
                authentication_method: this.identity.type(),
                publicKey: this.identity.public_key
            }).catch(error => {
                log.error(LogCategory.IDENTITIES, tr("Failed to initialize TeamSpeak based handshake. Error: %o"), error);

                if(error instanceof CommandResult)
                    error = error.extra_message || error.message;
                this.trigger_fail("failed to execute begin (" + error + ")");
            });
        }

        private handle_proof(json) {
            if(!json[0]["digest"]) {
                this.trigger_fail("server too old");
                return;
            }

            this.identity.sign_message(json[0]["message"], json[0]["digest"]).then(proof => {
                this.connection.send_command("handshakeindentityproof", {proof: proof}).catch(error => {
                    log.error(LogCategory.IDENTITIES, tr("Failed to proof the identity. Error: %o"), error);

                    if(error instanceof CommandResult)
                        error = error.extra_message || error.message;
                    this.trigger_fail("failed to execute proof (" + error + ")");
                }).then(() => this.trigger_success());
            }).catch(error => {
                this.trigger_fail("failed to sign message");
            });
        }

        protected trigger_fail(message: string) {
            this.connection.command_handler_boss().unregister_handler(this.handler);
            super.trigger_fail(message);
        }

        protected trigger_success() {
            this.connection.command_handler_boss().unregister_handler(this.handler);
            super.trigger_success();
        }
    }

    class IdentityPOWWorker {
        private _worker: Worker;
        private _current_hash: string;
        private _best_level: number;

        async initialize(key: string) {
            this._worker = new Worker(settings.static("worker_directory", "js/workers/") + "WorkerPOW.js");

            /* initialize */
            await new Promise<void>((resolve, reject) => {
                const timeout_id = setTimeout(() => reject("timeout"), 1000);

                this._worker.onmessage = event => {
                    clearTimeout(timeout_id);

                    if(!event.data) {
                        reject("invalid data");
                        return;
                    }

                    if(!event.data.success) {
                        reject("initialize failed (" + event.data.success + " | " + (event.data.message || "unknown eroror") + ")");
                        return;
                    }

                    this._worker.onmessage = event => this.handle_message(event.data);
                    resolve();
                };
                this._worker.onerror = event => {
                    log.error(LogCategory.IDENTITIES, tr("POW Worker error %o"), event);
                    clearTimeout(timeout_id);
                    reject("Failed to load worker (" + event.message + ")");
                };
            });

            /* set data */
            await new Promise<void>((resolve, reject) => {
                this._worker.postMessage({
                    type: "set_data",
                    private_key: key,
                    code: "set_data"
                });

                const timeout_id = setTimeout(() => reject("timeout (data)"), 1000);

                this._worker.onmessage = event => {
                    clearTimeout(timeout_id);

                    if (!event.data) {
                        reject("invalid data");
                        return;
                    }

                    if (!event.data.success) {
                        reject("initialize of data failed (" + event.data.success + " | " + (event.data.message || "unknown eroror") + ")");
                        return;
                    }

                    this._worker.onmessage = event => this.handle_message(event.data);
                    resolve();
                };
            });
        }

        async mine(hash: string, iterations: number, target: number, timeout?: number) : Promise<Boolean> {
            this._current_hash = hash;
            if(target < this._best_level)
                return true;

            return await new Promise<Boolean>((resolve, reject) => {
                this._worker.postMessage({
                    type: "mine",
                    hash: this._current_hash,
                    iterations: iterations,
                    target: target,
                    code: "mine"
                });

                const timeout_id = setTimeout(() => reject("timeout (mine)"), timeout || 5000);

                this._worker.onmessage = event => {
                    this._worker.onmessage = event => this.handle_message(event.data);

                    clearTimeout(timeout_id);
                    if (!event.data) {
                        reject("invalid data");
                        return;
                    }

                    if (!event.data.success) {
                        reject("mining failed (" + event.data.success + " | " + (event.data.message || "unknown eroror") + ")");
                        return;
                    }

                    if(event.data.result) {
                        this._best_level = event.data.level;
                        this._current_hash = event.data.hash;
                        resolve(true);
                    } else {
                        resolve(false); /* no result */
                    }
                };
            });
        }

        current_hash() : string {
            return this._current_hash;
        }

        current_level() : number {
            return this._best_level;
        }

        async finalize(timeout?: number) {
            try {
                await new Promise<void>((resolve, reject) => {
                    this._worker.postMessage({
                        type: "finalize",
                        code: "finalize"
                    });

                    const timeout_id = setTimeout(() => reject("timeout"), timeout || 250);

                    this._worker.onmessage = event => {
                        this._worker.onmessage = event => this.handle_message(event.data);

                        clearTimeout(timeout_id);

                        if (!event.data) {
                            reject("invalid data");
                            return;
                        }

                        if (!event.data.success) {
                            reject("failed to finalize (" + event.data.success + " | " + (event.data.message || "unknown eroror") + ")");
                            return;
                        }

                        resolve();
                    };
                });
            } catch(error) {
                log.error(LogCategory.IDENTITIES, tr("Failed to finalize POW worker! (%o)"), error);
            }

            this._worker.terminate();
            this._worker = undefined;
        }

        private handle_message(message: any) {
            log.info(LogCategory.IDENTITIES, tr("Received message: %o"), message);
        }
    }

    export class TeaSpeakIdentity implements Identity {
        static async generate_new() : Promise<TeaSpeakIdentity> {
            let key: CryptoKeyPair;
            try {
                key = await crypto.subtle.generateKey({name:'ECDH', namedCurve: 'P-256'}, true, ["deriveKey"]);
            } catch(e) {
                log.error(LogCategory.IDENTITIES, tr("Could not generate a new key: %o"), e);
                throw "Failed to generate keypair";
            }
            const private_key = await CryptoHelper.export_ecc_key(key.privateKey, false);

            const identity = new TeaSpeakIdentity(private_key, "0", undefined, false);
            await identity.initialize();
            return identity;
        }

        static async import_ts(ts_string: string, ini?: boolean) : Promise<TeaSpeakIdentity> {
            const parse_string = string => {
                /* parsing without INI structure */
                const V_index = string.indexOf('V');
                if(V_index == -1) throw "invalid input (missing V)";

                return {
                    hash: string.substr(0, V_index),
                    data: string.substr(V_index + 1),
                    name: "TeaSpeak user"
                }
            };

            const {hash, data, name} = (!ini ? () => parse_string(ts_string) : () => {
                /* parsing with INI structure */
                let identity: string, name: string;

                for(const line of ts_string.split("\n")) {
                    if(line.startsWith("identity="))
                        identity = line.substr(9);
                    else if(line.startsWith("nickname="))
                        name = line.substr(9);
                }

                if(!identity) throw "missing identity keyword";
                if(identity[0] == "\"" && identity[identity.length - 1] == "\"")
                    identity = identity.substr(1, identity.length - 2);

                const result = parse_string(identity);
                result.name = name || result.name;
                return result;
            })();

            if(!ts_string.match(/[0-9]+/g)) throw "invalid hash!";

            const key64 = await CryptoHelper.decrypt_ts_identity(new Uint8Array(arrayBufferBase64(data)));

            const identity = new TeaSpeakIdentity(key64, hash, name, false);
            await identity.initialize();
            return identity;
        }

        hash_number: string; /* hash suffix for the private key */
        private_key: string; /* base64 representation of the private key */
        _name: string;

        public_key: string; /* only set when initialized */

        private _initialized: boolean;
        private _crypto_key: CryptoKey;
        private _crypto_key_sign: CryptoKey;

        private _unique_id: string;

        constructor(private_key?: string, hash?: string, name?: string, initialize?: boolean) {
            this.private_key = private_key;
            this.hash_number = hash || "0";
            this._name = name;

            if(this.private_key && (typeof(initialize) === "undefined" || initialize)) {
                this.initialize().catch(error => {
                    log.error(LogCategory.IDENTITIES, "Failed to initialize TeaSpeakIdentity (%s)", error);
                    this._initialized = false;
                });
            }
        }

        fallback_name(): string | undefined  {
            return this._name;
        }

        uid(): string {
            return this._unique_id;
        }

        type(): IdentitifyType {
            return IdentitifyType.TEAMSPEAK;
        }

        valid(): boolean {
            return this._initialized && !!this._crypto_key && !!this._crypto_key_sign;
        }

        async decode(data: string) : Promise<void> {
            const json = JSON.parse(data);
            if(!json) throw "invalid json";

            if(json.version == 2) {
                this.private_key = json.key;
                this.hash_number = json.hash;
                this._name = json.name;
            } else if(json.version == 1) {
                const key = json.key;
                this._name = json.name;

                const clone = await TeaSpeakIdentity.import_ts(key, false);
                this.private_key = clone.private_key;
                this.hash_number = clone.hash_number;
            } else
                throw "invalid version";

            await this.initialize();
        }

        encode?() : string {
            return JSON.stringify({
                key: this.private_key,
                hash: this.hash_number,
                name: this._name,
                version: 2
            });
        }

        async level() : Promise<number> {
            if(!this._initialized || !this.public_key)
                throw "not initialized";

            const hash = new Uint8Array(await sha.sha1(this.public_key + this.hash_number));

            let level = 0;
            while(level < hash.byteLength && hash[level] == 0)
                level++;

            if(level >= hash.byteLength) {
                level = 256;
            } else {
                let byte = hash[level];
                level <<= 3;
                while((byte & 0x1) == 0) {
                    level++;
                    byte >>= 1;
                }
            }

            return level;
        }

        /**
         * @param {string} a
         * @param {string} b
         * @description b must be smaller (in bytes) then a
         */
        private string_add(a: string, b: string) {
            const char_result: number[] = [];
            const char_a = [...a].reverse().map(e => e.charCodeAt(0));
            const char_b = [...b].reverse().map(e => e.charCodeAt(0));

            let carry = false;
            while(char_b.length > 0) {
                let result = char_b.pop_front() + char_a.pop_front() + (carry ? 1 : 0) - 48;
                if((carry = result > 57))
                    result -= 10;
                char_result.push(result);
            }

            while(char_a.length > 0) {
                let result = char_a.pop_front() + (carry ? 1 : 0);
                if((carry = result > 57))
                    result -= 10;
                char_result.push(result);
            }

            if(carry)
                char_result.push(49);

            return String.fromCharCode.apply(null, char_result.slice().reverse());
        }


        async improve_level_for(time: number, threads: number) : Promise<Boolean> {
            let active = true;
            setTimeout(() => active = false, time);

            return await this.improve_level(-1, threads, () => active);
        }

        async improve_level(target: number, threads: number, active_callback: () => boolean, callback_level?: (current: number) => any, callback_status?: (hash_rate: number) => any) : Promise<Boolean> {
            if(!this._initialized || !this.public_key)
                throw "not initialized";
            if(target == -1) /* get the highest level possible */
                target = 0;
            else if(target <= await this.level())
                return true;

            const workers: IdentityPOWWorker[] = [];

            const iterations = 100000;
            let current_hash;
            const next_hash = () => {
                if(!current_hash)
                    return (current_hash = this.hash_number);

                if(current_hash.length < iterations.toString().length) {
                    current_hash = this.string_add(iterations.toString(), current_hash);
                } else {
                    current_hash = this.string_add(current_hash, iterations.toString());
                }
                return current_hash;
            };

            { /* init */
                const initialize_promise: Promise<void>[] = [];
                for(let index = 0; index  < threads; index++) {
                    const worker = new IdentityPOWWorker();
                    workers.push(worker);
                    initialize_promise.push(worker.initialize(this.public_key));
                }

                try {
                    await Promise.all(initialize_promise);
                } catch(error) {
                    log.error(LogCategory.IDENTITIES, error);
                    throw "failed to initialize";
                }
            }

            let result = false;
            let best_level = 0;
            let target_level = target > 0 ? target : await this.level() + 1;

            const worker_promise: Promise<void>[] = [];

            const hash_timestamps: number[] = [];
            let last_hashrate_update: number = 0;

            const update_hashrate = () => {
                if(!callback_status) return;
                const now = Date.now();
                hash_timestamps.push(now);

                if(last_hashrate_update + 1000 < now) {
                    last_hashrate_update = now;

                    const timeout = now - 10 * 1000; /* 10s */
                    const rounds = hash_timestamps.filter(e => e > timeout);
                    callback_status(Math.ceil((rounds.length * iterations) / Math.ceil((now - rounds[0]) / 1000)))
                }
            };

            try {
                result = await new Promise<boolean>((resolve, reject) => {
                    let active = true;

                    const exit = () => {
                        const timeout = setTimeout(() => resolve(true), 1000);
                        Promise.all(worker_promise).then(result => {
                            clearTimeout(timeout);
                            resolve(true);
                        }).catch(error => resolve(true));
                        active = false;
                    };

                    for(const worker of workers) {
                        const worker_mine = () => {
                            if(!active) return;

                            const promise = worker.mine(next_hash(), iterations, target_level);
                            const p = promise.then(result => {
                                update_hashrate();

                                worker_promise.remove(p);

                                if(result.valueOf()) {
                                    if(worker.current_level() > best_level) {
                                        this.hash_number = worker.current_hash();

                                        log.info(LogCategory.IDENTITIES, "Found new best at %s (%d). Old was %d", this.hash_number, worker.current_level(), best_level);
                                        best_level = worker.current_level();
                                        if(callback_level)
                                            callback_level(best_level);
                                    }

                                    if(active) {
                                        if(target > 0)
                                            exit();
                                        else
                                            target_level = best_level + 1;
                                    }
                                }

                                if(active && (active = active_callback()))
                                    setTimeout(() => worker_mine(), 0);
                                else {
                                    exit();
                                }

                                return Promise.resolve();
                            }).catch(error => {
                                worker_promise.remove(p);

                                log.warn(LogCategory.IDENTITIES, "POW worker error %o", error);
                                reject(error);

                                return Promise.resolve();
                            });

                            worker_promise.push(p);
                        };

                        worker_mine();
                    }
                });
            } catch(error) {
                //error already printed before reject had been called
            }

            { /* shutdown */
                const finalize_promise: Promise<void>[] = [];
                for(const worker of workers)
                    finalize_promise.push(worker.finalize(250));

                try {
                    await Promise.all(finalize_promise);
                } catch(error) {
                    log.error(LogCategory.IDENTITIES, error);
                    throw "failed to finalize";
                }
            }


            return result;
        }

        private async initialize() {
            if(!this.private_key)
                throw "Invalid private key";

            let jwk: any;
            try {
                jwk = await CryptoHelper.decode_tomcrypt_key(this.private_key);
                if(!jwk)
                    throw "result undefined";
            } catch(error) {
                throw "failed to parse key (" + error + ")";
            }

            try {
                this._crypto_key_sign = await crypto.subtle.importKey("jwk", jwk, {name:'ECDSA', namedCurve: 'P-256'}, false, ["sign"]);
            } catch(error) {
                log.error(LogCategory.IDENTITIES, error);
                throw "failed to create crypto sign key";
            }

            try {
                this._crypto_key = await crypto.subtle.importKey("jwk", jwk, {name:'ECDH', namedCurve: 'P-256'}, true, ["deriveKey"]);
            } catch(error) {
                log.error(LogCategory.IDENTITIES, error);
                throw "failed to create crypto key";
            }

            try {
                this.public_key = await CryptoHelper.export_ecc_key(this._crypto_key, true);
                this._unique_id = base64_encode_ab(await sha.sha1(this.public_key));
            } catch(error) {
                log.error(LogCategory.IDENTITIES, error);
                throw "failed to calculate unique id";
            }

            this._initialized = true;
            //const public_key = await profiles.identities.CryptoHelper.export_ecc_key(key, true);
        }

        async export_ts(ini?: boolean) : Promise<string> {
            if(!this.private_key)
                throw "Invalid private key";

            const identity = this.hash_number + "V" + await CryptoHelper.encrypt_ts_identity(new Uint8Array(str2ab8(this.private_key)));
            if(!ini) return identity;

            return "[Identity]\n" +
                    "id=TeaWeb-Exported\n" +
                    "identity=\"" + identity + "\"\n" +
                    "nickname=\"" + this.fallback_name() + "\"\n" +
                    "phonetic_nickname=";
        }

        async sign_message(message: string, hash: string = "SHA-256") : Promise<string> {
            /* bring this to libtomcrypt format */
            const sign_buffer = await crypto.subtle.sign({
                name: "ECDSA",
                hash: hash
            }, this._crypto_key_sign, str2ab8(message));
            const sign = new Uint8Array(sign_buffer);
            /* first 32 r bits | last 32 s bits */

            const buffer = new Uint8Array(72);
            let index = 0;

            { /* the initial sequence */
                buffer[index++] = 0x30; /* type */
                buffer[index++] = 0x00; /* we will set the sequence length later */
            }
            { /* integer r  */
                buffer[index++] = 0x02; /* type */
                buffer[index++] = 0x20; /* length */

                if(sign[0] > 0x7F) {
                    buffer[index - 1] += 1;
                    buffer[index++] = 0;
                }

                for(let i = 0; i < 32; i++)
                    buffer[index++] = sign[i];
            }
            { /* integer s  */
                buffer[index++] = 0x02; /* type */
                buffer[index++] = 0x20; /* length */

                if(sign[32] > 0x7F) {
                    buffer[index - 1] += 1;
                    buffer[index++] = 0;
                }

                for(let i = 0; i < 32; i++)
                    buffer[index++] = sign[32 + i];
            }
            buffer[1] = index - 2;

            return base64_encode_ab(buffer.subarray(0, index));
        }

        spawn_identity_handshake_handler(connection: connection.AbstractServerConnection): connection.HandshakeIdentityHandler {
            return new TeaSpeakHandshakeHandler(connection, this);
        }
    }
}