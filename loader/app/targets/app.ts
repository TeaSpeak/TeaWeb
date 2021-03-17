import "./shared";
import * as loader from "../loader/loader";
import {ApplicationLoader} from "../loader/loader";
import {loadManifest, loadManifestTarget} from "../maifest";

/* all javascript loaders */
const loader_javascript = {
    load_scripts: async taskId => {
        loader.setCurrentTaskName(taskId, "manifest");
        await loadManifest();
        await loadManifestTarget(__build.entry_chunk_name, taskId);
    }
};

loader.register_task(loader.Stage.INITIALIZING, {
    name: "secure tester",
    function: async () => {
        /* we need https or localhost to use some things like the storage API */
        if(typeof isSecureContext === "undefined")
            (window as any)["isSecureContext"] = location.protocol !== 'https:' || location.hostname === 'localhost';

        if(!isSecureContext) {
            loader.critical_error("TeaWeb cant run on unsecured sides.", "App requires to be loaded via HTTPS!");
            throw "App requires a secure context!"
        }
    },
    priority: 20
});

loader.register_task(loader.Stage.JAVASCRIPT, {
    name: "scripts",
    function: loader_javascript.load_scripts,
    priority: 10
});

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

/* test if we're getting loaded within a TeaClient preview window */
loader.register_task(loader.Stage.SETUP, {
    name: "TeaClient tester",
    function: async () => {
        if(typeof __teaclient_preview_notice !== "undefined" && typeof __teaclient_preview_error !== "undefined") {
            loader.critical_error("Why you're opening TeaWeb within the TeaSpeak client?!");
            throw "we're already a TeaClient!";
        }
    },
    priority: 100
});

export default class implements ApplicationLoader {
    execute() {
        loader.execute_managed(true);
    }
}