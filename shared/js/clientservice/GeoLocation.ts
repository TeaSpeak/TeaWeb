import * as loader from "tc-loader";
import {Stage} from "tc-loader";
import {LogCategory, logTrace} from "tc-shared/log";
import jsonp from 'simple-jsonp-promise';

interface GeoLocationInfo {
    /* The country code */
    country: string,

    city?: string,
    region?: string,
    timezone?: string
}

interface GeoLocationResolver {
    name() : string;
    resolve() : Promise<GeoLocationInfo>;
}

const kLocalCacheKey = "geo-info";
type GeoLocationCache = {
    version: 1,

    timestamp: number,
    info: GeoLocationInfo,
}

class GeoLocationProvider {
    private readonly resolver: GeoLocationResolver[];
    private currentResolverIndex: number;

    private cachedInfo: GeoLocationInfo | undefined;
    private lookupPromise: Promise<GeoLocationInfo>;

    constructor() {
        this.resolver = [
            new GeoResolverIpInfo(),
            new GeoResolverIpData()
        ];
        this.currentResolverIndex = 0;
    }

    loadCache() {
        this.doLoadCache();
        if(!this.cachedInfo) {
            this.lookupPromise = this.doQueryInfo();
        }
    }

    private doLoadCache() : GeoLocationInfo {
        try {
            const rawItem = localStorage.getItem(kLocalCacheKey);
            if(!rawItem) {
                return undefined;
            }

            const info: GeoLocationCache = JSON.parse(rawItem);
            if(info.version !== 1) {
                throw tr("invalid version number");
            }

            if(info.timestamp + 2 * 24 * 60 * 60 * 1000 < Date.now()) {
                throw tr("cache is too old");
            }

            if(info.timestamp + 2 * 60 * 60 * 1000 > Date.now()) {
                logTrace(LogCategory.GENERAL, tr("Geo cache is less than 2hrs old. Don't updating."));
                this.lookupPromise = Promise.resolve(info.info);
            } else {
                this.lookupPromise = this.doQueryInfo();
            }

            this.cachedInfo = info.info;
        } catch (error) {
            logTrace(LogCategory.GENERAL, tr("Failed to load geo resolve cache: %o"), error);
        }
    }

    async queryInfo(timeout: number) : Promise<GeoLocationInfo | undefined> {
        return await new Promise<GeoLocationInfo>(resolve => {
            if(!this.lookupPromise) {
                resolve(this.cachedInfo);
                return;
            }

            const timeoutId = typeof timeout === "number" ? setTimeout(() => resolve(this.cachedInfo), timeout) : -1;
            this.lookupPromise.then(result => {
                clearTimeout(timeoutId);
                resolve(result);
            });
        });
    }


    private async doQueryInfo() : Promise<GeoLocationInfo | undefined> {
        while(this.currentResolverIndex < this.resolver.length) {
            const resolver = this.resolver[this.currentResolverIndex++];
            try {
                const info = await resolver.resolve();
                logTrace(LogCategory.GENERAL, tr("Successfully resolved geo info from %s: %o"), resolver.name(), info);

                localStorage.setItem(kLocalCacheKey, JSON.stringify({
                    version: 1,
                    timestamp: Date.now(),
                    info: info
                } as GeoLocationCache));
                return info;
            } catch (error) {
                logTrace(LogCategory.GENERAL, tr("Geo resolver %s failed: %o. Trying next one."), resolver.name(), error);
            }
        }

        logTrace(LogCategory.GENERAL, tr("All geo resolver failed."));
        return undefined;
    }
}

class GeoResolverIpData implements GeoLocationResolver {
    name(): string {
        return "ipdata.co";
    }

    async resolve(): Promise<GeoLocationInfo> {
        const response = await fetch("https://api.ipdata.co/?api-key=test");
        const json = await response.json();

        if(!("country_code" in json)) {
            throw tr("missing country code");
        }

        return {
            country: json["country_code"],
            region: json["region"],
            city: json["city"],
            timezone: json["time_zone"]["name"]
        }
    }

}

class GeoResolverIpInfo implements GeoLocationResolver {
    name(): string {
        return "ipinfo.io";
    }

    async resolve(): Promise<GeoLocationInfo> {
        const response = await jsonp("http://ipinfo.io");
        if(!("country" in response)) {
            throw tr("missing country");
        }

        return {
            country: response["country"],

            city: response["city"],
            region: response["region"],
            timezone: response["timezone"]
        }
    }

}

export let geoLocationProvider: GeoLocationProvider;

/* The client services depend on this */
loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    priority: 35,
    function: async () => {
        geoLocationProvider = new GeoLocationProvider();
        geoLocationProvider.loadCache();
    },
    name: "geo services"
});