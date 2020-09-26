import {tr} from "../i18n/localize";

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

export class ImageCache {
    readonly cache_name: string;

    private _cache_category: Cache;

    constructor(name: string) {
        this.cache_name = name;
    }

    setupped() : boolean { return !!this._cache_category; }

    async reset() {
        if(!window.caches)
            return;

        try {
            await caches.delete(this.cache_name);
        } catch(error) {
            throw "Failed to delete cache: " + error;
        }
        try {
            await this.setup();
        } catch(error) {
            throw "Failed to reinitialize cache!";
        }
    }

    async setup() {
        if(!window.caches)
            throw "Missing caches!";

        if(this._cache_category)
            return;

        this._cache_category = await caches.open(this.cache_name);
    }

    async cleanup(maxAge: number) {
        /* FIXME: TODO */
    }

    async resolveCached(key: string, maxAge?: number) : Promise<Response | undefined> {
        maxAge = typeof(maxAge) === "number" ? maxAge : -1;

        const cachedResponse = await this._cache_category.match("https://_local_cache/cache_request_" + key);
        if(!cachedResponse)
            return undefined;

        /* FIXME: Max age */
        return cachedResponse;
    }

    async putCache(key: string, value: Response, type?: string, headers?: {[key: string]:string}) {
        const new_headers = new Headers();
        for(const key of value.headers.keys())
            new_headers.set(key, value.headers.get(key));
        if(type)
            new_headers.set("Content-type", type);
        for(const key of Object.keys(headers || {}))
            new_headers.set(key, headers[key]);

        await this._cache_category.put("https://_local_cache/cache_request_" + key, new Response(value.body, {
            headers: new_headers
        }));
    }

    async delete(key: string) {
        const flag = await this._cache_category.delete("https://_local_cache/cache_request_" + key, {
            ignoreVary: true,
            ignoreMethod: true,
            ignoreSearch: true
        });
        if(!flag) {
            console.warn(tr("Failed to delete key %s from cache!"), key);
        }
    }
}