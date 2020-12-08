import {tr} from "../i18n/localize";
import {LogCategory, logDebug} from "tc-shared/log";

export enum ImageType {
    UNKNOWN,
    BITMAP,
    PNG,
    GIF,
    SVG,
    JPEG
}

export function imageType2MediaType(type: ImageType, file?: boolean) {
    switch (type) {
        case ImageType.BITMAP:
            return "bmp";
        case ImageType.GIF:
            return "gif";
        case ImageType.SVG:
            return file ? "svg" : "svg+xml";
        case ImageType.JPEG:
            return "jpeg";
        case ImageType.UNKNOWN:
        case ImageType.PNG:
        default:
            return "png";
    }
}

export function responseImageType(encoded_data: string | ArrayBuffer, base64_encoded?: boolean) {
    const ab2str10 = () => {
        const buf = new Uint8Array(encoded_data as ArrayBuffer);
        if(buf.byteLength < 10)
            return "";

        let result = "";
        for(let index = 0; index < 10; index++)
            result += String.fromCharCode(buf[index]);
        return result;
    };

    const bin = typeof(encoded_data) === "string" ? ((typeof(base64_encoded) === "undefined" || base64_encoded) ? atob(encoded_data) : encoded_data) : ab2str10();
    if(bin.length < 10) return ImageType.UNKNOWN;

    if(bin[0] == String.fromCharCode(66) && bin[1] == String.fromCharCode(77)) {
        return ImageType.BITMAP;
    } else if(bin.substr(0, 8) == "\x89\x50\x4e\x47\x0d\x0a\x1a\x0a") {
        return ImageType.PNG;
    } else if(bin.substr(0, 4) == "\x47\x49\x46\x38" && (bin[4] == '\x37' || bin[4] == '\x39') && bin[5] == '\x61') {
        return ImageType.GIF;
    } else if(bin[0] == '\x3c') {
        return ImageType.SVG;
    } else if(bin[0] == '\xFF' && bin[1] == '\xd8') {
        return ImageType.JPEG;
    }

    return ImageType.UNKNOWN;
}

export type ImageCacheState = {
    state: "loaded",
    instance: Cache
} | {
    state: "errored",
    reason: string
} | {
    state: "unloaded"
}

export class ImageCache {
    readonly cacheName: string;

    private state: ImageCacheState;

    private constructor(name: string) {
        this.cacheName = name;
        this.state = { state: "unloaded" };
    }

    public static async load(cacheName: string) : Promise<ImageCache> {
        const cache = new ImageCache(cacheName);
        await cache.initialize();
        return cache;
    }

    private async initialize() {
        if(!window.caches) {
            this.state = { "state": "errored", reason: tr("Caches are not enabled by the user") };
            return;
        }

        try {
            const instance = await window.caches.open(this.cacheName);
            this.state = { state: "loaded", instance: instance };
        } catch (error) {
            logDebug(LogCategory.GENERAL, tr("Failed to open image cache %s: %o"), this.cacheName, error);
            this.state = { "state": "errored", reason: tr("Failed to open the cache") };
        }
    }

    private getCacheInstance() : Cache | undefined {
        return this.state.state === "loaded" ? this.state.instance : undefined;
    }

    isPersistent() {
        return this.state.state === "loaded";
    }

    async reset() {
        if(!window.caches) {
            /* Caches are disabled by the user */
            return;
        }

        try {
            await caches.delete(this.cacheName);
        } catch(error) {
            throw "Failed to delete cache: " + error;
        }

        try {
            await this.initialize();
        } catch(error) {
            throw "Failed to reinitialize cache!";
        }
    }

    async cleanup(maxAge: number) {
        /* FIXME: TODO */
    }

    async resolveCached(key: string, maxAge?: number) : Promise<Response | undefined> {
        const cacheInstance = this.getCacheInstance();
        if(!cacheInstance) { return undefined; }

        maxAge = typeof(maxAge) === "number" ? maxAge : -1;
        const cachedResponse = await cacheInstance.match("https://_local_cache/cache_request_" + key);
        if(!cachedResponse)
            return undefined;

        /* FIXME: Max age */
        return cachedResponse;
    }

    async putCache(key: string, value: Response, type?: string, headers?: {[key: string]:string}) {
        const cacheInstance = this.getCacheInstance();
        if(!cacheInstance) { return; }

        const new_headers = new Headers();
        for(const key of value.headers.keys())
            new_headers.set(key, value.headers.get(key));
        if(type)
            new_headers.set("Content-type", type);
        for(const key of Object.keys(headers || {}))
            new_headers.set(key, headers[key]);

        await cacheInstance.put("https://_local_cache/cache_request_" + key, new Response(value.body, {
            headers: new_headers
        }));
    }

    async delete(key: string) {
        const cacheInstance = this.getCacheInstance();
        if(!cacheInstance) { return; }
        
        const flag = await cacheInstance.delete("https://_local_cache/cache_request_" + key, {
            ignoreVary: true,
            ignoreMethod: true,
            ignoreSearch: true
        });
        if(!flag) {
            console.warn(tr("Failed to delete key %s from cache!"), key);
        }
    }
}