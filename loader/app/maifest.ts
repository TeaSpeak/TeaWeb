import * as loader from "./loader/loader";
import {config, loaderPerformance} from "./loader/loader";
import {loadStyles} from "./loader/StyleLoader";
import {loadScripts} from "./loader/ScriptLoader";

export interface ApplicationManifest {
    version: number;

    chunks: {
        [key: string]: {
            files: {
                hash: string,
                file: string
            }[],
            css_files: {
                hash: string,
                file: string
            }[],
            modules: {
                id: string,
                context: string,
                resource: string
            }[]
        }
    };
}

let manifest: ApplicationManifest;
export async function loadManifest() : Promise<ApplicationManifest> {
    if(manifest) {
        return manifest;
    }

    const requestResource = loaderPerformance.logResourceRequest("json", "manifest.json");
    try {
        requestResource.markExecuting();
        const response = await fetch(config.baseUrl + "/manifest.json?_date=" + Date.now());
        if(!response.ok) {
            requestResource.markExecuted({ status: "unknown-error", message: response.status + " " + response.statusText });
            throw response.status + " " + response.statusText;
        }

        manifest = await response.json();
        requestResource.markExecuted({ status: "success" });
    } catch(error) {
        requestResource.markExecuted({ status: "error-event" });
        console.error("Failed to load javascript manifest: %o", error);
        loader.critical_error("Failed to load manifest.json", error);
        throw "failed to load manifest.json";
    }

    if(manifest.version !== 2) {
        throw "invalid manifest version";
    }

    return manifest;
}

export async function loadManifestTarget(chunkName: string, taskId: number) {
    if(typeof manifest.chunks[chunkName] !== "object") {
        loader.critical_error("Missing entry chunk in manifest.json", "Chunk " + chunkName + " is missing.");
        throw "missing entry chunk";
    }

    loader.module_mapping().push({
        application: chunkName,
        modules: manifest.chunks[chunkName].modules
    });

    const kMaxRequests = 4;
    await loadStyles(manifest.chunks[chunkName].css_files.map(e => e.file), {
        maxParallelRequests: kMaxRequests
    }, (entry, state) => {
        if (state !== "loading") {
            return;
        }

        loader.setCurrentTaskName(taskId, entry);
    });

    await loadScripts(manifest.chunks[chunkName].files.map(e => e.file), {
        maxParallelRequests: kMaxRequests
    }, (script, state) => {
        if(state !== "loading") {
            return;
        }

        loader.setCurrentTaskName(taskId, script);
    });
}