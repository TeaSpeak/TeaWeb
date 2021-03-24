/* Note: This will be included into the controller and renderer process */
import {LogCategory, logError, logWarn} from "tc-shared/log";
import * as loader from "tc-loader";
import {Stage} from "tc-loader";
import * as crypto from "crypto-js";

export type LocalAvatarInfo = {
    fileName: string,
    fileSize: number,
    fileHashMD5: string,

    fileUploaded: number,
    fileModified: number,

    contentType: string,

    resourceUrl: string | undefined,
}

export type LocalAvatarUpdateResult = {
    status: "success"
} | {
    status: "error",
    reason: string
} | {
    status: "cache-unavailable"
};

export type LocalAvatarLoadResult<T> = {
    status: "success",
    result: T,
} | {
    status: "error",
    reason: string
} | {
    status: "cache-unavailable" | "empty-result"
};

const kMaxAvatarSize = 16 * 1024 * 1024;

export type OwnAvatarMode = "uploading" | "server";
export class OwnAvatarStorage {
    private openedCache: Cache | undefined;

    private static generateRequestUrl(serverUniqueId: string, mode: OwnAvatarMode) : string {
        return "https://_local_avatar/" + serverUniqueId + "/" + mode;
    }

    async initialize() {
        if(!("caches" in window)) {
            /* Not available  (may unsecure context?) */
            this.openedCache = undefined;
            return;
        }

        try {
            this.openedCache = await caches.open("local-avatars");
        } catch (error) {
            logError(LogCategory.GENERAL, tr("Failed to open local avatar cache: %o"), error);
            return;
        }
    }

    private async loadAvatarRequest(serverUniqueId: string, mode: OwnAvatarMode) : Promise<LocalAvatarLoadResult<Response>> {
        if(!this.openedCache) {
            return { status: "cache-unavailable" };
        }

        try {
            const response = await this.openedCache.match(OwnAvatarStorage.generateRequestUrl(serverUniqueId, mode), {
                ignoreMethod: true,
                ignoreSearch: true,
            });

            if(!response) {
                return { status: "empty-result" };
            }

            return { status: "success", result: response };
        } catch (error) {
            logError(LogCategory.GENERAL, tr("Failed to query local avatar cache: %o"), error);
            return { status: "error", reason: tr("failed to query cache") };
        }
    }

    async loadAvatarImage(serverUniqueId: string, mode: OwnAvatarMode) : Promise<LocalAvatarLoadResult<ArrayBuffer>> {
        const loadResult = await this.loadAvatarRequest(serverUniqueId, mode);
        if(loadResult.status !== "success") {
            return loadResult;
        }

        try {
            return { status: "success", result: await loadResult.result.arrayBuffer() };
        } catch (error) {
            logError(LogCategory.GENERAL, tr("Failed to load avatar into a buffer: %o"), error);
            return { status: "error", reason: tr("failed to load avatar into a buffer") };
        }
    }

    async loadAvatar(serverUniqueId: string, mode: OwnAvatarMode, createResourceUrl: boolean) : Promise<LocalAvatarLoadResult<LocalAvatarInfo>> {
        const loadResult = await this.loadAvatarRequest(serverUniqueId, mode);
        if(loadResult.status !== "success") {
            return loadResult;
        }

        const headers = loadResult.result.headers;
        const contentType = headers.get("Content-Type");
        const avatarSize = parseInt(headers.get("Content-Length"));
        const avatarHash = headers.get("X-Avatar-Hash");
        const avatarName = headers.get("X-File-Name");
        const avatarDateModified = parseInt(headers.get("X-File-Date-Modified"));
        const avatarDateUploaded = parseInt(headers.get("X-File-Uploaded"));

        if(!avatarHash) {
            return { status: "error", reason: tr("missing response header file hash") };
        }

        if(!avatarName) {
            return { status: "error", reason: tr("missing response header file name") };
        }

        if(isNaN(avatarSize)) {
            return { status: "error", reason: tr("missing/invalid response header file size") };
        }

        if(isNaN(avatarDateModified)) {
            return { status: "error", reason: tr("missing/invalid response header file modify date") };
        }

        if(isNaN(avatarDateUploaded)) {
            return { status: "error", reason: tr("missing/invalid response header file upload date") };
        }

        let resourceUrl;
        if(createResourceUrl) {
            try {
                resourceUrl = URL.createObjectURL(await loadResult.result.blob());
            } catch (error) {
                logError(LogCategory.GENERAL, tr("Failed to create avatar resource url: %o"), error);
                return { status: "error", reason: tr("failed to generate resource url") };
            }
        }

        return {
            status: "success",
            result: {
                contentType: contentType,

                fileName: avatarName,
                fileSize: avatarSize,
                fileHashMD5: avatarHash,

                fileModified: avatarDateModified,
                fileUploaded: avatarDateUploaded,

                resourceUrl: resourceUrl,
            }
        };
    }

    async updateAvatar(serverUniqueId: string, mode: OwnAvatarMode, target: File) : Promise<LocalAvatarUpdateResult> {
        if(!this.openedCache) {
            return { status: "cache-unavailable" };
        }

        if(target.size > kMaxAvatarSize) {
            return { status: "error", reason: tra("Image exceeds maximum software size of {} bytes", kMaxAvatarSize) };
        }

        let md5Hash: string;
        try {
            const hasher = crypto.algo.MD5.create();
            await target.stream().pipeTo(new WritableStream({
                write(data) {
                    hasher.update(crypto.lib.WordArray.create(data));
                }
            }));

            md5Hash = hasher.finalize().toString(crypto.enc.Hex);
        } catch (error) {
            logError(LogCategory.GENERAL, tr("Failed to create avatar md5 hash: %o"), error);
            return { status: "error", reason: tr("failed to create md5 hash") };
        }

        const headers = new Headers();
        headers.set("X-Avatar-Hash", md5Hash);
        headers.set("X-File-Name", target.name);
        headers.set("X-File-Date-Modified", target.lastModified.toString());
        headers.set("X-File-Uploaded", Date.now().toString());
        headers.set("Content-Type", target.type);
        headers.set("Content-Length", target.size.toString());

        try {
            const response = new Response(target, { headers: headers });
            await this.openedCache.put("https://_local_avatar/" + serverUniqueId + "/" + mode, response);
        } catch (error) {
            logError(LogCategory.GENERAL, tr("Failed to save local avatar: %o"), error);
            return { status: "error", reason: tr("failed to save avatar to disk") };
        }

        return { status: "success" };
    }

    async removeAvatar(serverUniqueId: string, mode: OwnAvatarMode) {
        if(!this.openedCache) {
            return;
        }

        try {
            await this.openedCache.delete(OwnAvatarStorage.generateRequestUrl(serverUniqueId, mode));
        } catch (error) {
            logWarn(LogCategory.GENERAL, tr("Failed to delete avatar request: %o"), error);
        }
    }

    /**
     * Move the avatar file which is currently in "uploading" state to server
     * @param serverUniqueId
     */
    async avatarUploadSucceeded(serverUniqueId: string) {
        if(!this.openedCache) {
            return;
        }

        const request = await this.loadAvatarRequest(serverUniqueId, "uploading");
        if(request.status !== "success") {
            if(request.status !== "empty-result") {
                logError(LogCategory.GENERAL, tr("Failed to save uploaded avatar. Request failed to load: %o"), request);
            }
            return;
        }

        try {
            await this.openedCache.put(OwnAvatarStorage.generateRequestUrl(serverUniqueId, "server"), request.result);
        } catch (error) {
            logError(LogCategory.GENERAL, tr("Failed to save uploaded avatar. Failed to store request: %o"), request);
            return;
        }

        await this.removeAvatar(serverUniqueId, "uploading");
    }
}

let instance: OwnAvatarStorage;
export function getOwnAvatarStorage(): OwnAvatarStorage {
    return instance;
}

loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    priority: 10,
    name: "own avatar storage",
    function: async () => {
        instance = new OwnAvatarStorage();
        await instance.initialize();
    }
});