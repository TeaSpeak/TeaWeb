import * as path from "path";
import * as config_base from "./webpack.config";

export = env => config_base.config(env, "web").then(config => {
    Object.assign(config.entry, {
        "shared-app": ["./web/app/entry-points/AppMain.ts"],
        "modal-external": ["./web/app/entry-points/ModalWindow.ts"]
    });

    Object.assign(config.resolve.alias, {
        "tc-shared": path.resolve(__dirname, "shared/js"),
    });

    return Promise.resolve(config);
});