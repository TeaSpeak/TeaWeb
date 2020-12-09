import * as path from "path";
import * as config_base from "./webpack.config";
const WasmPackPlugin = require("@wasm-tool/wasm-pack-plugin");

export = () => config_base.config("web").then(config => {
    Object.assign(config.entry, {
        "shared-app": "./web/app/index.ts",
        "modal-external": "./web/app/index-external.ts"
    });

    Object.assign(config.resolve.alias, {
        "tc-shared": path.resolve(__dirname, "shared/js"),
        "tc-backend/audio-lib": path.resolve(__dirname, "web/audio-lib/pkg"),
        "tc-backend/web": path.resolve(__dirname, "web/app"),
        "tc-backend": path.resolve(__dirname, "web/app"),
    });

    config.node = config.node || {};
    config.node["fs"] = "empty";

    config.plugins.push(new WasmPackPlugin({
        crateDirectory: path.resolve(__dirname, "web", "audio-lib"),
        outName: "index",
        //forceMode: "profiling",
        outDir: "pkg"
    }));
    return Promise.resolve(config);
});