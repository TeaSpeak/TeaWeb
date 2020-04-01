import * as path from "path";
const config = require("./webpack.config");

let isDevelopment = process.env.NODE_ENV === 'development';
isDevelopment = true;

config.entry = {
    "client-app": "./client/js/index.ts"
};

config.resolve.alias = {
    "tc-shared": path.resolve(__dirname, "shared/js"),
    /* backend hasn't declared but its available via "require()" */
    "tc-backend": path.resolve(__dirname, "shared/backend.d"),
};

config.externals = [
    {
        "tc-loader": "window loader"
    },
    (context, request: string, callback) => {
        if (request.startsWith("tc-backend/"))
            return callback(null, `window["backend-loader"].require("${request}")`);
        callback();
    }
];

export = config;