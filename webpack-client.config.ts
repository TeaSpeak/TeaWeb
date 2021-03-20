import * as path from "path";
import * as config_base from "./webpack.config";

export = env => config_base.config(env, "client").then(config => {
    Object.assign(config.entry, {
        "shared-app": ["./client/app/entry-points/AppMain.ts"],
        "modal-external": ["./client/app/entry-points/ModalWindow.ts"]
    });

    Object.assign(config.resolve.alias, {
        "tc-shared": path.resolve(__dirname, "shared/js"),
    });

    if(!Array.isArray(config.externals)) {
        throw "invalid config";
    }

    config.externals.push(({ context, request }, callback) => {
        if (request.startsWith("tc-backend/")) {
            return callback(null, `window["backend-loader"].require("${request}")`);
        }

        callback(undefined, undefined);
    });

    config.externals.push({ "jquery": "window.$" });
    config.externals.push({ "jsrender": "window.$" });

    return Promise.resolve(config);
});