/// <reference path="loader.ts" />

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

loader.register_task(loader.Stage.JAVASCRIPT_INITIALIZING, {
    name: "log enabled initialisation",
    function: async () => log.initialize(app.type === app.Type.CLIENT_DEBUG || app.type === app.Type.WEB_DEBUG ? LogType.TRACE : LogType.INFO),
    priority: 150
});

if(!loader.running()) {
    /* we know that we want to load the app */
    loader.execute_managed();
}