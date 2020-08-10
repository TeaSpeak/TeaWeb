import * as loader from "tc-loader";
import * as aplayer from "tc-backend/web/audio/player";
import * as log from "tc-shared/log";
import {LogCategory} from "tc-shared/log";
import {tr} from "tc-shared/i18n/localize";
import {CodecType} from "tc-backend/web/codec/Codec";
import {VoiceConnection} from "tc-backend/web/voice/VoiceHandler";
import {BasicCodec} from "tc-backend/web/codec/BasicCodec";
import {createErrorModal} from "tc-shared/ui/elements/Modal";
import {CodecWrapperWorker} from "tc-backend/web/codec/CodecWrapperWorker";

class CacheEntry {
    instance: BasicCodec;
    owner: number;

    last_access: number;
}

export function codec_supported(type: CodecType) {
    return type == CodecType.OPUS_MUSIC || type == CodecType.OPUS_VOICE;
}

export class CodecPool {
    codecIndex: number;
    name: string;
    type: CodecType;

    entries: CacheEntry[] = [];
    maxInstances: number = 2;

    private _supported: boolean = true;

    initialize(cached: number) {
        /* test if we're able to use this codec */
        const dummy_client_id = 0xFFEF;

        this.ownCodec(dummy_client_id, _ => {}).then(codec => {
            log.trace(LogCategory.VOICE, tr("Releasing codec instance (%o)"), codec);
            this.releaseCodec(dummy_client_id);
        }).catch(error => {
            if(this._supported) {
                log.warn(LogCategory.VOICE, tr("Disabling codec support for "), this.name);
                createErrorModal(tr("Could not load codec driver"), tr("Could not load or initialize codec ") + this.name + "<br>" +
                    "Error: <code>" + JSON.stringify(error) + "</code>").open();
                log.error(LogCategory.VOICE, tr("Failed to initialize the opus codec. Error: %o"), error);
            } else {
                log.debug(LogCategory.VOICE, tr("Failed to initialize already disabled codec. Error: %o"), error);
            }
            this._supported = false;
        });
    }

    supported() { return this._supported; }

    ownCodec?(clientId: number, callback_encoded: (buffer: Uint8Array) => any, create: boolean = true) : Promise<BasicCodec | undefined> {
        return new Promise<BasicCodec>((resolve, reject) => {
            if(!this._supported) {
                reject(tr("unsupported codec!"));
                return;
            }

            let free_slot = 0;
            for(let index = 0; index < this.entries.length; index++) {
                if(this.entries[index].owner == clientId) {
                    this.entries[index].last_access = Date.now();
                    if(this.entries[index].instance.initialized())
                        resolve(this.entries[index].instance);
                    else {
                        this.entries[index].instance.initialise().then((flag) => {
                            //TODO test success flag
                            this.ownCodec(clientId, callback_encoded, false).then(resolve).catch(reject);
                        }).catch(reject);
                    }
                    return;
                } else if(this.entries[index].owner == 0) {
                    free_slot = index;
                }
            }

            if(!create) {
                resolve(undefined);
                return;
            }

            if(free_slot == 0){
                free_slot = this.entries.length;
                let entry = new CacheEntry();
                entry.instance = new CodecWrapperWorker(this.type);
                this.entries.push(entry);
            }
            this.entries[free_slot].owner = clientId;
            this.entries[free_slot].last_access = new Date().getTime();
            this.entries[free_slot].instance.on_encoded_data = callback_encoded;
            if(this.entries[free_slot].instance.initialized())
                this.entries[free_slot].instance.reset();
            else {
                this.ownCodec(clientId, callback_encoded, false).then(resolve).catch(reject);
                return;
            }
            resolve(this.entries[free_slot].instance);
        });
    }

    releaseCodec(clientId: number) {
        for(let index = 0; index < this.entries.length; index++)
            if(this.entries[index].owner == clientId) this.entries[index].owner = 0;
    }

    constructor(index: number, name: string, type: CodecType){
        this.codecIndex = index;
        this.name = name;
        this.type = type;

        this._supported = this.type !== undefined && codec_supported(this.type);
    }
}

export let codecPool: CodecPool[];
loader.register_task(loader.Stage.JAVASCRIPT_INITIALIZING, {
    priority: 10,
    function: async () => {
        aplayer.on_ready(() => {
            log.info(LogCategory.VOICE, tr("Initializing voice handler after AudioController has been initialized!"));

            codecPool = [
                new CodecPool(0, tr("Speex Narrowband"), CodecType.SPEEX_NARROWBAND),
                new CodecPool(1, tr("Speex Wideband"), CodecType.SPEEX_WIDEBAND),
                new CodecPool(2, tr("Speex Ultra Wideband"), CodecType.SPEEX_ULTRA_WIDEBAND),
                new CodecPool(3, tr("CELT Mono"), CodecType.CELT_MONO),
                new CodecPool(4, tr("Opus Voice"), CodecType.OPUS_VOICE),
                new CodecPool(5, tr("Opus Music"), CodecType.OPUS_MUSIC)
            ];

            codecPool[4].initialize(2);
            codecPool[5].initialize(2);
        });
    },
    name: "registering codec initialisation"
});
