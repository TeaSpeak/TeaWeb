import * as path from "path";
import * as config_base from "./webpack.config";

export = () => config_base.config("web").then(config => {
    Object.assign(config.entry, {
        "shared-app": "./web/js/index.ts"
    });

    Object.assign(config.resolve.alias, {
        "tc-shared": path.resolve(__dirname, "shared/js"),
        "tc-backend/web": path.resolve(__dirname, "web/js"),
        "tc-backend": path.resolve(__dirname, "web/js"),
        "tc-generated/codec/opus": path.resolve(__dirname, "web/native-codec/generated/TeaWeb-Worker-Codec-Opus.js"),
    });

    return Promise.resolve(config);
});