import * as path from "path";
import * as config_base from "./webpack.config";

export = () => config_base.config("web").then(config => {
    Object.assign(config.entry, {
        "shared-app": "./web/app/index.ts"
    });

    Object.assign(config.resolve.alias, {
        "tc-shared": path.resolve(__dirname, "shared/js"),
        "tc-backend/web/assembly": path.resolve(__dirname, "web/native-codec/generated"),
        "tc-backend/web": path.resolve(__dirname, "web/app"),
        "tc-backend": path.resolve(__dirname, "web/app"),
    });

    config.node = config.node || {};
    config.node["fs"] = "empty";

    return Promise.resolve(config);
});