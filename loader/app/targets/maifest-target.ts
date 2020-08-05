import "./shared";
import * as loader from "../loader/loader";
import {ApplicationLoader, Stage} from "../loader/loader";
import {loadManifest, loadManifestTarget} from "../maifest";
import {getUrlParameter} from "../loader/utils";

export default class implements ApplicationLoader {
    execute() {
        loader.register_task(Stage.SETUP, {
            function: async taskId => {
                await loadManifest();

                const entryChunk = getUrlParameter("chunk");
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
                /* top menu */
                {
                    const container = document.createElement("div");
                    container.setAttribute('id', "top-menu-bar");
                    body.append(container);
                }
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
                /* mouse move container */
                {
                    const container = document.createElement("div");
                    container.setAttribute('id', "mouse-move");

                    body.append(container);
                }
                /* tooltip container */
                {
                    const container = document.createElement("div");
                    container.setAttribute('id', "global-tooltip");

                    container.append(document.createElement("a"));

                    body.append(container);
                }
            },
            priority: 10
        });

        loader.register_task(loader.Stage.TEMPLATES, {
            name: "templates",
            function: async () => {
                await loader.templates.load_multiple([
                    "templates.html"
                ], {
                    cache_tag: "?22",
                    max_parallel_requests: -1
                });
            },
            priority: 10
        });

        loader.execute_managed();
    }
}