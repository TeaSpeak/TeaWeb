import "./shared";
import * as loader from "../loader/loader";
import {ApplicationLoader, Stage} from "../loader/loader";
import {loadManifest, loadManifestTarget} from "../maifest";
import {getUrlParameter} from "../loader/Utils";

export default class implements ApplicationLoader {
    execute() {
        loader.register_task(Stage.SETUP, {
            function: async taskId => {
                await loadManifest();

                const entryChunk = getUrlParameter("loader-chunk");
                if(!entryChunk) {
                    loader.critical_error("Missing entry chunk parameter");
                    throw "Missing entry chunk parameter";
                }

                await loadManifestTarget(entryChunk, taskId);
            },
            name: "Manifest loader",
            priority: 100
        });

        /* required sadly */
        loader.register_task(loader.Stage.SETUP, {
            name: "page setup",
            function: async () => {
                const body = document.body;

                /* template containers */
                {
                    const container = document.createElement("div");
                    container.setAttribute('id', "templates");
                    body.append(container);
                }

                /* sounds container */
                {
                    const container = document.createElement("div");
                    container.setAttribute('id', "sounds");
                    body.append(container);
                }
            },
            priority: 10
        });

        loader.execute_managed(false);
    }
}