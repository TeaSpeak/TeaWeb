import * as loader from "../loader/loader";

let is_debug = false;

/* all javascript loaders */
const loader_javascript = {
    detect_type: async () => {
        /* test if js/proto.js is available. If so we're in debug mode */
        const request = new XMLHttpRequest();
        request.open('GET', 'js/proto.js', true);

        await new Promise((resolve, reject) => {
            request.onreadystatechange = () => {
                if (request.readyState === 4){
                    is_debug = request.status !== 404;
                    resolve();
                }
            };
            request.onerror = () => {
                reject("Failed to detect app type");
            };
            request.send();
        });
    },

    load_scripts: async () => {
        await loader.load_script(["vendor/jquery/jquery.min.js"]);
        await loader.load_scripts([
            ["dist/certificate-popup.js"],
        ]);
    }
};

const loader_style = {
    load_style: async () => {
        if(is_debug) {
            await loader_style.load_style_debug();
        } else {
            await loader_style.load_style_release();
        }
    },

    load_style_debug: async () => {
        await loader.load_styles([
            "css/static/main.css",
        ]);
    },

    load_style_release: async () => {
        await loader.load_styles([
            "css/static/main.css",
        ]);
    }
};

loader.register_task(loader.Stage.INITIALIZING, {
    name: "app type test",
    function: loader_javascript.detect_type,
    priority: 20
});

loader.register_task(loader.Stage.JAVASCRIPT, {
    name: "javascript",
    function: loader_javascript.load_scripts,
    priority: 10
});

loader.register_task(loader.Stage.STYLE, {
    name: "style",
    function: loader_style.load_style,
    priority: 10
});

loader.register_task(loader.Stage.LOADED, {
    name: "loaded handler",
    function: async () => loader.hide_overlay(),
    priority: 0
});

/* register tasks */
loader.register_task(loader.Stage.INITIALIZING, {
    name: "safari fix",
    function: async () => {
        /* safari remove "fix" */
        if(Element.prototype.remove === undefined)
            Object.defineProperty(Element.prototype, "remove", {
                enumerable: false,
                configurable: false,
                writable: false,
                value: function(){
                    this.parentElement.removeChild(this);
                }
            });
    },
    priority: 50
});

if(!loader.running()) {
    /* we know that we want to load the app */
    loader.execute_managed();
}