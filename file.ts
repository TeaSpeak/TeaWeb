import * as path from "path";
import * as fs from "fs-extra";
import * as util from "util";
import * as crypto from "crypto";
import * as http from "http";
import * as url_utils from "url";
import * as cp from "child_process";
import * as mt from "mime-types";
import * as os from "os";
import {PathLike} from "fs";
import {ChildProcess} from "child_process";

/* All project files */
type ProjectResourceType = "html" | "js" | "css" | "wasm" | "wav" | "json" | "img" | "i18n" | "pem";
type ProjectResource = {
    "type": ProjectResourceType;
    "build-target": "dev" | "rel" | "dev|rel";

    "web-only"?: boolean;
    "client-only"?: boolean;
    "serve-only"?: boolean;

    "search-pattern": RegExp;
    "search-exclude"?: RegExp;
    "req-parm"?: string[];

    "path": string;
    "local-path": string;
}

const APP_FILE_LIST_SHARED_SOURCE: ProjectResource[] = [
    { /* shared html and php files */
        "type": "html",
        "search-pattern": /^([a-zA-Z]+)\.(html|php|json)$/,
        "build-target": "dev|rel",

        "path": "./",
        "local-path": "./shared/html/"
    },

    { /* javascript loader */
        "type": "js",
        "search-pattern": /.*\.js$/,
        "build-target": "dev",

        "path": "loader/",
        "local-path": "./shared/loader/"
    },
    { /* javascript loader for releases */
        "type": "js",
        "search-pattern": /.*loader_[\S]+.min.js$/,
        "build-target": "rel",

        "path": "loader/",
        "local-path": "./shared/generated/"
    },

    { /* shared javascript files (WebRTC adapter) */
        "type": "js",
        "search-pattern": /.*\.js$/,
        "build-target": "dev|rel",

        "path": "adapter/",
        "local-path": "./shared/adapter/"
    },

    { /* shared javascript files (development mode only) */
        "type": "js",
        "search-pattern": /.*\.js$/,
        "search-exclude": /(.*\/)?workers\/.*/,
        "build-target": "dev",

        "path": "js/",
        "local-path": "./shared/js/"
    },
    { /* shared javascript mapping files (development mode only) */
        "type": "js",
        "search-pattern": /.*\.(js.map|ts)$/,
        "search-exclude": /(.*\/)?workers\/.*/,
        "build-target": "dev",

        "path": "js/",
        "local-path": "./shared/js/",
        "req-parm": ["--mappings"]
    },

    { /* shared generated worker codec */
        "type": "js",
        "search-pattern": /(WorkerPOW.js)$/,
        "build-target": "dev|rel",

        "path": "js/workers/",
        "local-path": "./shared/js/workers/"
    },
    { /* shared developer single css files */
        "type": "css",
        "search-pattern": /.*\.css$/,
        "build-target": "dev",

        "path": "css/",
        "local-path": "./shared/css/"
    },
    { /* shared css mapping files (development mode only) */
        "type": "css",
        "search-pattern": /.*\.(css.map|scss)$/,
        "build-target": "dev",

        "path": "css/",
        "local-path": "./shared/css/",
        "req-parm": ["--mappings"]
    },
    { /* shared release css files */
        "type": "css",
        "search-pattern": /.*\.css$/,
        "build-target": "rel",

        "path": "css/",
        "local-path": "./shared/generated/"
    },
    { /* shared release css files */
        "type": "css",
        "search-pattern": /.*\.css$/,
        "build-target": "rel",

        "path": "css/loader/",
        "local-path": "./shared/css/loader/"
    },
    { /* shared release css files */
        "type": "css",
        "search-pattern": /.*\.css$/,
        "build-target": "dev|rel",

        "path": "css/theme/",
        "local-path": "./shared/css/theme/"
    },
    { /* shared sound files */
        "type": "wav",
        "search-pattern": /.*\.wav$/,
        "build-target": "dev|rel",

        "path": "audio/",
        "local-path": "./shared/audio/"
    },
    { /* shared data sound files */
        "type": "json",
        "search-pattern": /.*\.json/,
        "build-target": "dev|rel",

        "path": "audio/",
        "local-path": "./shared/audio/"
    },
    { /* shared image files */
        "type": "img",
        "search-pattern": /.*\.(svg|png)/,
        "build-target": "dev|rel",

        "path": "img/",
        "local-path": "./shared/img/"
    },
    { /* own webassembly files */
        "type": "wasm",
        "search-pattern": /.*\.(wasm)/,
        "build-target": "dev|rel",

        "path": "wat/",
        "local-path": "./shared/wat/"
    }
];

const APP_FILE_LIST_SHARED_VENDORS: ProjectResource[] = [
    {
        "type": "js",
        "search-pattern": /.*(\.min)?\.js$/,
        "build-target": "dev|rel",

        "path": "vendor/",
        "local-path": "./vendor/"
    },
    {
        "type": "css",
        "search-pattern": /.*\.css$/,
        "build-target": "dev|rel",

        "path": "vendor/",
        "local-path": "./vendor/"
    }
];

const APP_FILE_LIST_CLIENT_SOURCE: ProjectResource[] = [
    { /* client css files */
        "client-only": true,
        "type": "css",
        "search-pattern": /.*\.css$/,
        "build-target": "dev|rel",

        "path": "css/",
        "local-path": "./client/css/"
    },
    { /* client js files */
        "client-only": true,
        "type": "js",
        "search-pattern": /.*\.js/,
        "build-target": "dev",

        "path": "js/",
        "local-path": "./client/js/"
    },

    /* release specific */
    { /* web merged javascript files (shared inclusive) */
        "client-only": true,
        "type": "js",
        "search-pattern": /.*\.js$/,
        "build-target": "rel",

        "path": "js/",
        "local-path": "./client/generated/"
    },
    { /* Add the shared generated files. Exclude the shared file because we're including it already */
        "client-only": true,
        "type": "js",
        "search-pattern": /.*\.js$/,
        "search-exclude": /shared\.js(.map)?$/,
        "build-target": "rel",

        "path": "js/",
        "local-path": "./shared/generated/"
    },
];

const APP_FILE_LIST_WEB_SOURCE: ProjectResource[] = [
    { /* generated assembly files */
        "web-only": true,
        "type": "wasm",
        "search-pattern": /.*\.(wasm)/,
        "build-target": "dev|rel",

        "path": "wasm/",
        "local-path": "./asm/generated/"
    },
    { /* generated assembly javascript files */
        "web-only": true,
        "type": "js",
        "search-pattern": /.*\.(js)/,
        "build-target": "dev|rel",

        "path": "wasm/",
        "local-path": "./asm/generated/"
    },
    { /* web generated worker codec */
        "web-only": true,
        "type": "js",
        "search-pattern": /(WorkerCodec.js)$/,
        "build-target": "dev|rel",

        "path": "js/workers/",
        "local-path": "./web/js/workers/"
    },
    { /* web javascript files (development mode only) */
        "web-only": true,
        "type": "js",
        "search-pattern": /.*\.js$/,
        "build-target": "dev",

        "path": "js/",
        "local-path": "./web/js/"
    },
    { /* web merged javascript files (shared inclusive) */
        "web-only": true,
        "type": "js",
        "search-pattern": /client(\.min)?\.js$/,
        "build-target": "rel",

        "path": "js/",
        "local-path": "./web/generated/"
    },
    { /* web css files */
        "web-only": true,
        "type": "css",
        "search-pattern": /.*\.css$/,
        "build-target": "dev|rel",

        "path": "css/",
        "local-path": "./web/css/"
    },
    { /* web html files */
        "web-only": true,
        "type": "html",
        "search-pattern": /.*\.(php|html)/,
        "build-target": "dev|rel",

        "path": "./",
        "local-path": "./web/html/"
    },
    { /* translations */
        "web-only": true, /* Only required for the web client */
        "type": "i18n",
        "search-pattern": /.*\.(translation|json)/,
        "build-target": "dev|rel",

        "path": "i18n/",
        "local-path": "./shared/i18n/"
    }
];

const APP_FILE_LIST_WEB_TEASPEAK: ProjectResource[] = [
    /* special web.teaspeak.de only auth files */
    { /* login page and api */
        "web-only": true,
        "type": "html",
        "search-pattern": /[a-zA-Z_0-9]+\.(php|html)$/,
        "build-target": "dev|rel",

        "path": "./",
        "local-path": "./auth/",
        "req-parm": ["-xf"]
    },
    { /* javascript  */
        "web-only": true,
        "type": "js",
        "search-pattern": /.*\.js$/,
        "build-target": "dev|rel",

        "path": "js/",
        "local-path": "./auth/js/",
        "req-parm": ["-xf"]
    },
    { /* web css files */
        "web-only": true,
        "type": "css",
        "search-pattern": /.*\.css$/,
        "build-target": "dev|rel",

        "path": "css/",
        "local-path": "./auth/css/",
        "req-parm": ["-xf"]
    },
    { /* certificates */
        "web-only": true,
        "type": "pem",
        "search-pattern": /.*\.pem$/,
        "build-target": "dev|rel",

        "path": "certs/",
        "local-path": "./auth/certs/",
        "req-parm": ["-xf"]
    }
];

const CERTACCEPT_FILE_LIST: ProjectResource[] = [
    { /* html files */
        "type": "html",
        "search-pattern": /^([a-zA-Z]+)\.(html|php|json)$/,
        "build-target": "dev|rel",

        "path": "./popup/certaccept/",
        "local-path": "./shared/popup/certaccept/html/"
    },

    { /* javascript loader (debug) */
        "type": "js",
        "search-pattern": /(loader|certaccept)\.js$/,
        "build-target": "dev",

        "path": "./popup/certaccept/loader/",
        "local-path": "./shared/loader/"
    },
    { /* javascript loader (releases) */
        "type": "js",
        "search-pattern": /.*loader_certaccept.min.js$/,
        "build-target": "rel",

        "path": "./popup/certaccept/loader/",
        "local-path": "./shared/generated/"
    },

    { /* javascript imported from shared for debug */
        "type": "js",
        "search-pattern": /^(BrowserIPC|log|proto|settings)\.js$/,
        "build-target": "dev",

        "path": "./popup/certaccept/js/",
        "local-path": "./shared/js/"
    },

    { /* javascript for debug */
        "type": "js",
        "search-pattern": /^certaccept\.min\.js$/,
        "build-target": "rel",

        "path": "./popup/certaccept/js/",
        "local-path": "./shared/generated/"
    },

    { /* javascript for release */
        "type": "js",
        "search-pattern": /^.*\.js$/,
        "build-target": "dev",

        "path": "./popup/certaccept/js/",
        "local-path": "./shared/popup/certaccept/js/"
    },

    { /* shared css files */
        "type": "css",
        "search-pattern": /.*\.css$/,
        "build-target": "dev|rel",

        "path": "./popup/certaccept/css/loader/",
        "local-path": "./shared/css/loader/"
    },

    { /* shared css files */
        "type": "css",
        "search-pattern": /.*\.css$/,
        "build-target": "dev|rel",

        "path": "./popup/certaccept/css/static/",
        "local-path": "./shared/popup/certaccept/css/static/"
    },

    { /* img files */
        "type": "img",
        "search-pattern": /^(loading_error.*)\.(svg)$/,
        "build-target": "dev|rel",

        "path": "./popup/certaccept/img/",
        "local-path": "./shared/img/"
    },

    { /* jquery vendor */
        "type": "js",
        "search-pattern": /^jquery\/.*\.js$/,
        "build-target": "dev|rel",

        "path": "./popup/certaccept/vendor/",
        "local-path": "./vendor/"
    },
];

const APP_FILE_LIST = [
        ...APP_FILE_LIST_SHARED_SOURCE,
        ...APP_FILE_LIST_SHARED_VENDORS,
        ...APP_FILE_LIST_CLIENT_SOURCE,
        ...APP_FILE_LIST_WEB_SOURCE,
        ...APP_FILE_LIST_WEB_TEASPEAK,
        ...CERTACCEPT_FILE_LIST,
];

//@ts-ignore
declare module "fs-extra" {
    export function exists(path: PathLike): Promise<boolean>;
}

/* the generator */
namespace generator {
    export type SearchOptions = {
        target: "client" | "web";
        mode: "rel" | "dev";

        serving: boolean;

        source_path: string;
        parameter: string[];
    };

    export type Entry = {
        target_path: string; /* relative */
        local_path: string; /* absolute */

        name: string;
        type: ProjectResourceType;
        hash: string;
    }

    async function sha(type: "sha1" | "sha256", file: string) : Promise<string> {
        const result = crypto.createHash(type);

        const fis = fs.createReadStream(file);
        await new Promise((resolve, reject) => {
            fis.on("error", reject);
            fis.on("end", resolve);

            fis.on("data", chunk => result.update(chunk));
        });

        return result.digest("hex");
    }

    export async function search_files(files: ProjectResource[], options: SearchOptions) : Promise<Entry[]> {
        const result: Entry[] = [];

        const rreaddir = async p => {
            const result = [];
            try {
                const files = await fs.readdir(p);
                for(const file of files) {
                    const file_path = path.join(p, file);

                    const info = await fs.stat(file_path);
                    if(info.isDirectory()) {
                        result.push(...await rreaddir(file_path));
                    } else {
                        result.push(file_path);
                    }
                }
            } catch(error) {
                if(error.code === "ENOENT")
                    return [];
                throw error;
            }
            return result;
        };

        for(const file of files) {
            if(typeof file["web-only"] === "boolean" && file["web-only"] && options.target !== "web")
                continue;
            if(typeof file["client-only"] === "boolean" && file["client-only"] && options.target !== "client")
                continue;
            if(typeof file["serve-only"] === "boolean" && file["serve-only"] && !options.serving)
                continue;
            if(!file["build-target"].split("|").find(e => e === options.mode))
                continue;
            if(Array.isArray(file["req-parm"]) && file["req-parm"].find(e => !options.parameter.find(p => p.toLowerCase() === e.toLowerCase())))
                continue;

            const normal_local = path.normalize(path.join(options.source_path, file["local-path"]));
            const files: string[] = await rreaddir(normal_local);
            for(const f of files) {
                const local_name = f.substr(normal_local.length);
                if(!local_name.match(file["search-pattern"]) && !local_name.replace("\\\\", "/").match(file["search-pattern"]))
                    continue;

                if(typeof(file["search-exclude"]) !== "undefined" && f.match(file["search-exclude"]))
                    continue;

                const data = {
                    hash: await sha("sha1", f),
                    local_path: f,
                    target_path: path.join(file.path, local_name),
                    name: path.basename(f),
                    type: file.type
                };
                if(result.find(e => e.target_path === data.target_path))
                    continue;
                result.push(data);
            }
        }

        return result;
    }
}

namespace server {
    export type Options = {
        port: number;
        php: string;
    }

    const exec: (command: string) => Promise<{ stdout: string, stderr: string }> = util.promisify(cp.exec);

    let files: (generator.Entry & { http_path: string; })[] = [];
    let server: http.Server;
    let php: string;
    export async function launch(_files: generator.Entry[], options: Options) {
        //Don't use this check anymore, because we're searching within the PATH variable
        //if(!await fs.exists(options.php) || !(await fs.stat(options.php)).isFile())
        //    throw "invalid php interpreter (not found)";

        try {
            const info = await exec(options.php + " --version");
            if(info.stderr)
                throw info.stderr;

            if(!info.stdout.startsWith("PHP 7."))
                throw "invalid php interpreter version (Require at least 7)";

            console.debug("Found PHP interpreter:\n%s", info.stdout);
            php = options.php;
        } catch(error) {
            console.error("failed to validate php interpreter: %o", error);
            throw "invalid php interpreter";
        }
        server = http.createServer(handle_request);
        await new Promise((resolve, reject) => {
            server.on('error', reject);
            server.listen(options.port, () => {
                server.off("error", reject);
                resolve();
            });
        });

        files = _files.map(e =>{
            return {
                type: e.type,
                name: e.name,
                hash: e.hash,
                local_path: e.local_path,
                target_path: e.target_path,
                http_path: "/" + e.target_path.replace(/\\/g, "/")
            }
        });
    }

    export async function shutdown() {
        if(server) {
            await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
            server = undefined;
        }
    }

    function serve_php(file: string, query: any, response: http.ServerResponse) {
        if(!fs.existsSync("tmp"))
            fs.mkdirSync("tmp");
        let tmp_script_name = path.join("tmp", Math.random().toFixed(32).substr(2));
        let script = "<?php\n";
        script += "$params = json_decode(urldecode(\"" + encodeURIComponent(JSON.stringify(query)) + "\")); \n";
        script += "foreach($params as $key => $value) $_GET[$key] = $value;\n";
        script += "chdir(urldecode(\"" + encodeURIComponent(path.dirname(file)) + "\"));";
        script += "?>";
        fs.writeFileSync(tmp_script_name, script, {flag: 'w'});
        exec(php + " -d auto_prepend_file=" + tmp_script_name + " " + file).then(result => {
            if(result.stderr && !result.stdout) {
                response.writeHead(500);
                response.write("Encountered error while interpreting PHP script:\n");
                response.write(result.stderr);
                response.end();
                return;
            }

            response.writeHead(200, "success", {
                "Content-Type": "text/html; charset=utf-8"
            });
            response.write(result.stdout);
            response.end();
        }).catch(error => {
            response.writeHead(500);
            response.write("Received an exception while interpreting PHP script:\n");
            response.write(error.toString());
            response.end();
        }).then(() => fs.unlink(tmp_script_name)).catch(error => {
            console.error("[SERVER] Failed to delete tmp PHP prepend file: %o", error);
        });
    }

    function serve_file(pathname: string, query: any, response: http.ServerResponse) {
        const file = files.find(e => e.http_path === pathname);
        if(!file) {
            console.log("[SERVER] Client requested unknown file %s", pathname);
            response.writeHead(404);
            response.write("Missing file: " + pathname);
            response.end();
            return;
        }

        let type = mt.lookup(path.extname(file.local_path)) || "text/html";
        console.log("[SERVER] Serving file %s (%s) (%s)", file.target_path, type, file.local_path);
        if(path.extname(file.local_path) === ".php") {
            serve_php(file.local_path, query, response);
            return;
        }
        const fis = fs.createReadStream(file.local_path);

        response.writeHead(200, "success", {
            "Content-Type": type + "; charset=utf-8"
        });

        fis.on("end", () => response.end());
        fis.on("error", () => {
            response.write("Ah error happend!");
        });
        fis.on("data", data => response.write(data));
    }

    function handle_api_request(request: http.IncomingMessage, response: http.ServerResponse, url: url_utils.UrlWithParsedQuery) {
        if(url.query["type"] === "files") {
            response.writeHead(200, { "info-version": 1 });
            response.write("type\thash\tpath\tname\n");
            for(const file of files)
                if(file.http_path.endsWith(".php"))
                    response.write(file.type + "\t" + file.hash + "\t" + path.dirname(file.http_path) + "\t" + path.basename(file.http_path, ".php") + ".html" + "\n");
                else
                    response.write(file.type + "\t" + file.hash + "\t" + path.dirname(file.http_path) + "\t" + path.basename(file.http_path) + "\n");
            response.end();
            return;
        } else if(url.query["type"] === "file") {
            let p = path.join(url.query["path"] as string, url.query["name"] as string).replace(/\\/g, "/");
            if(p.endsWith(".html")) {
                const np = p.substr(0, p.length - 5) + ".php";
                if(files.find(e => e.http_path == np) && !files.find(e => e.http_path == p))
                    p = np;
            }
            serve_file(p, url.query, response);
            return;
        }

        response.writeHead(404);
        response.write(JSON.stringify({
            success: 0,
            message: "Unknown command"
        }));
        response.end();
    }

    function handle_request(request: http.IncomingMessage, response: http.ServerResponse) {
        let url: url_utils.UrlWithParsedQuery;
        try {
            url = url_utils.parse(request.url, true);
        } catch(error) {
            response.writeHead(500);
            response.write("invalid url:\n");
            response.write(error.toString());
            response.end();
            return;
        }

        if(url.pathname === "/api.php") {
            //Client API
            handle_api_request(request, response, url);
            return;
        }
        serve_file(url.pathname, url.query, response);
    }
}

namespace watcher {
    export class TSCWatcher {
        private _process: ChildProcess;
        constructor() { }

        async start() {
            if(this._process) throw "watcher already started";

            this._process = cp.spawn("npm", ["run", "ttsc", "--", "-w"], {
                cwd: __dirname,
                stdio: "pipe",
            });

            this._process.unref();
            this._process.stdout.on("readable", this.handle_stdout_readable.bind(this));
            this._process.stderr.on("readable", this.handle_stderr_readable.bind(this));
            this._process.addListener("exit", this.handle_exit.bind(this));
            this._process.addListener("error", this.handle_error.bind(this));

            console.log("TSC Watcher started.");
        }

        async stop() {
            if(!this._process) return;

            console.log("TSC Watcher stopped.");
            this._process.kill("SIGTERM")
            this._process = undefined;
        }

        private handle_exit(code: number | null, signal: string | null) {
            console.log("TSC Watcher exited with code %d (%s)", code, signal);
        }

        private handle_stdout_readable() {
            const buffer: Buffer = this._process.stdout.read(this._process.stdout.readableLength);
            if(!buffer) return;

            //console.log("TSCWatcher read %d bytes", buffer.length);
        }

        private handle_stderr_readable() {
            const buffer: Buffer = this._process.stdout.read(this._process.stdout.readableLength);
            if(!buffer) return;

            console.log("TSC Watcher read %d error bytes:", buffer.length);
            console.log(buffer.toString());
        }

        private handle_error(err: Error) {
            console.log("TSC Watcher received error: %o", err);
        }
    }


    export class SASSWatcher {
        private _process: ChildProcess;
        constructor() { }

        async start() {
            if(this._process) throw "watcher already started";

            this._process = cp.spawn("npm", ["run", "sass", "--", "--watch"], {
                cwd: __dirname,
                stdio: "pipe",
            });

            this._process.unref();
            this._process.stdout.on("readable", this.handle_stdout_readable.bind(this));
            this._process.stderr.on("readable", this.handle_stderr_readable.bind(this));
            this._process.addListener("exit", this.handle_exit.bind(this));
            this._process.addListener("error", this.handle_error.bind(this));

            console.log("SASS Watcher started.");
        }

        async stop() {
            if(!this._process) return;

            console.log("SASS Watcher stopped.");
            this._process.kill("SIGTERM")
        }

        private handle_exit(code: number | null, signal: string | null) {
            console.log("SASS Watcher exited with code %d (%s)", code, signal);
        }

        private handle_stdout_readable() {
            const buffer: Buffer = this._process.stdout.read(this._process.stdout.readableLength);
            if(!buffer) return;

            //console.log("TSCWatcher read %d bytes", buffer.length);
        }

        private handle_stderr_readable() {
            const buffer: Buffer = this._process.stdout.read(this._process.stdout.readableLength);
            if(!buffer) return;

            console.log("SASS Watcher read %d error bytes:", buffer.length);
            console.log(buffer.toString());
        }

        private handle_error(err: Error) {
            console.log("SASS Watcher received error: %o", err);
        }
    }
}

function php_exe() : string {
    if(process.env["PHP_EXE"])
        return process.env["PHP_EXE"];
    if(os.platform() === "win32")
        return "php.exe";
    return "php";
}

async function main_serve(target: "client" | "web", mode: "rel" | "dev", port: number) {
    const files = await generator.search_files(APP_FILE_LIST, {
        source_path: __dirname,
        parameter: [],
        target: target,
        mode: mode,
        serving: true
    });

    await server.launch(files, {
        port: port,
        php: php_exe(),
    });

    console.log("Server started on %d", port);
    console.log("To stop the server press ^K^C.");
    await new Promise(resolve => {});
}

async function main_develop(node: boolean, target: "client" | "web", port: number) {
    const files = await generator.search_files(APP_FILE_LIST, {
        source_path: __dirname,
        parameter: [],
        target: target,
        mode: "dev",
        serving: true
    });

    const tscwatcher = new watcher.TSCWatcher();
    try {
        await tscwatcher.start();

        const sasswatcher = new watcher.SASSWatcher();
        try {
            await sasswatcher.start();

            try {
                await server.launch(files, {
                    port: port,
                    php: php_exe(),
                });
            } catch(error) {
                console.error("Failed to start server: %o", error instanceof Error ? error.message : error);
                return;
            }

            console.log("Server started on %d", port);
            console.log("To stop the session press ^K^C.");

            await new Promise(resolve => process.once('SIGINT', resolve));
            console.log("Stopping session.");

            try {
                await server.shutdown();
            } catch(error) {
                console.warn("Failed to stop web server: %o", error instanceof Error ? error.message : error);
            }
        } catch(error) {
            console.error("Failed to start SASS watcher: %o", error instanceof Error ? error.message : error);
        } finally {
            try {
                await sasswatcher.stop();
            } catch(error) {
                console.warn("Failed to stop SASS watcher: %o", error instanceof Error ? error.message : error);
            }
        }
    } catch(error) {
        console.error("Failed to start TSC watcher: %o", error instanceof Error ? error.message : error);
    } finally {
        try {
            await tscwatcher.stop();
        } catch(error) {
            console.warn("Failed to stop TSC watcher: %o", error instanceof Error ? error.message : error);
        }
    }
}

async function git_tag() {
    const exec = util.promisify(cp.exec);

    /* check if we've any uncommited changes */
    {
        let { stdout, stderr } = await exec("git diff-index HEAD -- . ':!asm/libraries/' ':!package-lock.json' ':!vendor/'");
        if(stderr) throw stderr;
        if(stdout) return "0000000";
    }

    let { stdout, stderr } = await exec("git rev-parse --short HEAD");
    if(stderr) throw stderr;
    return stdout.substr(0, 7);
}

async function main_generate(target: "client" | "web", mode: "rel" | "dev", dest_path: string, args: any[]) {
    const begin = Date.now();
    const files = await generator.search_files(APP_FILE_LIST, {
        source_path: __dirname,
        parameter: args,
        target: target,
        mode: mode,
        serving: true
    });

    if(await fs.exists(dest_path))
        await fs.remove(dest_path);
    await fs.mkdirp(dest_path);

    let linker: (source: string, target: string) => Promise<void>;
    if(os.platform() === "win32") {
        /* we're not able to create any links so we're copying the file */
        linker = (source, target) => fs.copyFile(source, target);
    } else {
        const exec = util.promisify(cp.exec);
        linker = async (source, target) => {
            const command = "ln -s " + source + " " + target;
            const { stdout, stderr } = await exec(command);
            if(stderr)
                throw "failed to create link: " + stderr;
        }
    }

    for(const file of files) {
        const target_path = path.join(dest_path, file.target_path);
        await fs.mkdirp(path.dirname(target_path));

        console.debug("Linking %s to %s", target_path, file.local_path);
        await linker(file.local_path, target_path);
    }

    //Write the version file (Attention git-bash needs to be within the normal PATH!)
    const version = await git_tag();
    await fs.writeFile(path.join(dest_path, "version"), version);

    console.log("Done in %dms (Version: %s)", Date.now() - begin, version);
}

async function main(args: string[]) {
    if(args.length >= 1) {
        if((args[0].toLowerCase() === "develop" && args.length >= 2) || args[0].toLowerCase() === "ndevelop") {
            const is_node = args[0].toLowerCase() === "ndevelop";
            if(is_node && args.length < 2) {
                console.error("Please specify on which module you want to work.");
                console.error("For developing on the web client run: npm start web");
                return;
            }

            let target;
            switch (args[1].toLowerCase()) {
                case "c":
                case "client":
                    target = "client";
                    break;
                case "w":
                case "web":
                    target = "web";
                    break;

                default:
                    console.error("Unknown serve target %s.", args[1]);
                    return;
            }

            await main_develop(is_node, target, args.length > 2 ? parseInt(args[2]) : 8081);
            return;
        }
    }
    if(args.length >= 2) {
        if(args[0].toLowerCase() === "serve") {
            let target;
            switch (args[1].toLowerCase()) {
                case "c":
                case "client":
                    target = "client";
                    break;
                case "w":
                case "web":
                    target = "web";
                    break;

                default:
                    console.error("Unknown serve target %s.", args[1]);
                    return;
            }

            let mode;
            switch (args[2].toLowerCase()) {
                case "dev":
                case "devel":
                case "development":
                    mode = "dev";
                    break;
                case "rel":
                case "release":
                    mode = "rel";
                    break;

                default:
                    console.error("Unknown serve mode %s.", args[2]);
                    return;
            }

            let port = 8081;
            if(args.length >= 4) {
                port = parseInt(args[3]);
                if(Number.isNaN(port) || port <= 0 || port > 65665) {
                    console.log("Invalid HTTP server port: %s", args[3]);
                    return;
                }
            }

            await main_serve(target, mode, port);
            return;
        }
    }
    if(args.length >= 3) {
        if(args[0].toLowerCase() === "generate" || args[0].toLowerCase() === "gen") {
            let target;
            let dest_dir;
            switch (args[1].toLowerCase()) {
                case "c":
                case "client":
                    target = "client";
                    break;
                case "w":
                case "web":
                    target = "web";
                    break;

                default:
                    console.error("Unknown serve target %s.", args[1]);
                    return;
            }

            let mode;
            switch (args[2].toLowerCase()) {
                case "dev":
                case "devel":
                case "development":
                    mode = "dev";
                    dest_dir = target === "client" ?
                        path.join(__dirname, "client-api", "environment", "ui-files", "raw") :
                        path.join(__dirname, "web", "environment", "development");
                    break;
                case "rel":
                case "release":
                    mode = "rel";
                    dest_dir = target === "client" ?
                        path.join(__dirname, "client-api", "environment", "ui-files", "raw") :
                        path.join(__dirname, "web", "environment", "release");
                    break;

                default:
                    console.error("Unknown serve mode %s.", args[2]);
                    return;
            }

            await main_generate(target, mode, args.length >= 4 && args[3] !== "unset" ? args[3] : dest_dir, args.length >= 5 ? args.slice(4) : []);
            return;
        } else if(args[0].toLowerCase() === "list") {
            console.error("Currently not yet supported");
            return;
        }
    }

    console.log("Invalid arguments!");
    console.log("Usage: node files.js <mode> [args...]");
    console.log("       node files.js serve <client|web> <dev|rel> [port]                       | Start a HTTP server which serves the web client");
    console.log("       node files.js generate <client|web> <dev|rel> [dest dir] [flags...]     | Generate the final environment ready to be packed and deployed");
    console.log("       node files.js list <client|web> <dev|rel>                               | List all project files");
    console.log("       node files.js develop <client|web> [port]                               | Start a developer session. All typescript an SASS files will generated automatically");
    console.log("                                                                               | You could access your current build via http://localhost:8081");
    console.log("");
    console.log("Influential environment variables:");
    console.log("   PHP_EXE   |  Path to the PHP CLI interpreter");
}

/* proxy log for better format */
const wrap_log = (original, prefix: string) => (message, ...args) => original(prefix + message.replace(/\n/g, "\n" + prefix), ...args.map(e => typeof(e) === "string" ? e.replace(/\n/g, "\n" + prefix) : e));
console.log = wrap_log(console.log, "[INFO ] ");
console.debug = wrap_log(console.debug, "[DEBUG] ");
console.warn = wrap_log(console.warn, "[WARNING] ");
console.error = wrap_log(console.error, "[ERROR] ");

main(process.argv.slice(2)).then(ignore_exit => {
    if(typeof(ignore_exit) === "boolean" && !<any>ignore_exit) return;
    process.exit();
}).catch(error => {
    console.error("Failed to execute application. Exception reached execution root!");
    console.error(error);
});