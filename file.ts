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
import * as https from "https";

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
    { /* javascript files as manifest.json */
        "type": "js",
        "search-pattern": /.*\.(js|json|svg|png|css)$/,
        "build-target": "dev|rel",

        "path": "js/",
        "local-path": "./dist/"
    },

    { /* shared html files */
        "type": "html",
        "search-pattern": /^.*([a-zA-Z]+)\.(html|json)$/,
        "build-target": "dev|rel",

        "path": "./",
        "local-path": "./dist/"
    },
    { /* shared sound files */
        "type": "wav",
        "search-pattern": /.*\.(wav|json)$/,
        "build-target": "dev|rel",

        "path": "audio/",
        "local-path": "./shared/audio/"
    },
    { /* shared image files */
        "type": "img",
        "search-pattern": /.*\.(svg|png|gif)/,
        "build-target": "dev|rel",
        "search-exclude": /.*(client-icons)\/.*/,

        "path": "img/",
        "local-path": "./shared/img/"
    },
];

const APP_FILE_LIST_SHARED_VENDORS: ProjectResource[] = [];

const APP_FILE_LIST_CLIENT_SOURCE: ProjectResource[] = [];

const APP_FILE_LIST_WEB_SOURCE: ProjectResource[] = [
    { /* translations */
        "web-only": true, /* Only required for the web client */
        "type": "i18n",
        "search-pattern": /.*\.(translation|json)/,
        "build-target": "dev|rel",

        "path": "i18n/",
        "local-path": "./shared/i18n/"
    }
];

const CLIENT_APP_FILE_LIST = [
        ...APP_FILE_LIST_SHARED_SOURCE,
        ...APP_FILE_LIST_SHARED_VENDORS,
        ...APP_FILE_LIST_CLIENT_SOURCE
];

const WEB_APP_FILE_LIST = [
    ...APP_FILE_LIST_SHARED_SOURCE,
    ...APP_FILE_LIST_SHARED_VENDORS,
    ...APP_FILE_LIST_WEB_SOURCE,
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

    function file_matches_options(file: ProjectResource, options: SearchOptions) {
        if(typeof file["web-only"] === "boolean" && file["web-only"] && options.target !== "web")
            return false;

        if(typeof file["client-only"] === "boolean" && file["client-only"] && options.target !== "client")
            return false;

        if(typeof file["serve-only"] === "boolean" && file["serve-only"] && !options.serving)
            return false;

        if(!file["build-target"].split("|").find(e => e === options.mode))
            return false;

        return !(Array.isArray(file["req-parm"]) && file["req-parm"].find(e => !options.parameter.find(p => p.toLowerCase() === e.toLowerCase())));
    }

    export async function search_files(files: ProjectResource[], options: SearchOptions) : Promise<Entry[]> {
        const result: Entry[] = [];

        for(const file of files) {
            if(!file_matches_options(file, options))
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

    export async function search_http_file(files: ProjectResource[], target_file: string, options: SearchOptions) : Promise<string> {
        for(const file of files) {
            if(!file_matches_options(file, options))
                continue;

            if(file.path !== "./" && !target_file.startsWith("/" + file.path.replace(/\\/g, "/")))
                continue;

            const normal_local = path.normalize(path.join(options.source_path, file["local-path"]));
            const files: string[] = await rreaddir(normal_local);
            for(const f of files) {
                const local_name = f.substr(normal_local.length);
                if(!local_name.match(file["search-pattern"]) && !local_name.replace("\\\\", "/").match(file["search-pattern"]))
                    continue;

                if(typeof(file["search-exclude"]) !== "undefined" && f.match(file["search-exclude"]))
                    continue;

                if("/" + path.join(file.path, local_name).replace(/\\/g, "/") === target_file)
                    return f;
            }
        }

        return undefined;
    }
}

namespace server {
    import SearchOptions = generator.SearchOptions;
    export type Options = {
        port: number;
        search_options: SearchOptions;
    }

    let files: ProjectResource[] = [];
    let server: http.Server;
    let options: Options;

    const use_https = false;
    export async function launch(_files: ProjectResource[], options_: Options) {
        options = options_;
        files = _files;

        if(process.env["ssl_enabled"] === "1" || use_https) {
            //openssl req -nodes -new -x509 -keyout files_key.pem -out files_cert.pem
            const key_file = process.env["ssl_key"] || path.join(__dirname, "files_key.pem");
            const cert_file = process.env["ssl_cert"] || path.join(__dirname, "files_cert.pem");
            if(!await fs.pathExists(key_file))
                throw "Missing ssl key file";

            if(!await fs.pathExists(cert_file))
                throw "Missing ssl cert file";

            server = https.createServer({
                key: await fs.readFile(key_file),
                cert: await fs.readFile(cert_file),
            }, handleHTTPRequest);
        } else {
            server = http.createServer(handleHTTPRequest);
        }
        await new Promise<void>((resolve, reject) => {
            server.on('error', reject);
            server.listen(options.port, () => {
                server.off("error", reject);
                resolve();
            });
        });
    }

    export async function shutdown() {
        if(server) {
            await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
            server = undefined;
        }
    }

    async function serve_file(pathname: string, response: http.ServerResponse) {
        if(pathname.startsWith("//")) { pathname = pathname.substring(1); }
        const file = await generator.search_http_file(files, pathname, options.search_options);
        if(!file) {
            console.log("[SERVER] Client requested unknown file %s", pathname);
            response.writeHead(404);
            response.write("Missing file: " + pathname);
            response.end();
            return;
        }

        let type: string = mt.lookup(path.extname(file)) || "text/html";
        console.log("[SERVER] Serving file %s", file, type);
        const fis = fs.createReadStream(file);

        response.writeHead(200, "success", {
            "Content-Type": type + (type.startsWith("text/") ? "; charset=utf-8" : "")
        });

        fis.on("end", () => response.end());
        fis.on("error", () => {
            response.write("Ah error happend!");
        });
        fis.on("data", data => response.write(data));
    }

    async function handle_api_request(response: http.ServerResponse, url: url_utils.UrlWithParsedQuery) {
        if(url.query["type"] === "files") {
            response.writeHead(200, { "info-version": 1 });
            response.write("type\thash\tpath\tname\n");
            for(const file of await generator.search_files(files, options.search_options))
                response.write(file.type + "\t" + file.hash + "\t" + path.dirname(file.target_path) + "\t" + file.name + "\n");
            response.end();
            return;
        } else if(url.query["type"] === "file") {
            let p = path.join(url.query["path"] as string, url.query["name"] as string).replace(/\\/g, "/");
            if(!p.startsWith("/")) p = "/" + p;
            await serve_file(p, response);
            return;
        }

        response.writeHead(404);
        response.write(JSON.stringify({
            success: 0,
            message: "Unknown command"
        }));
        response.end();
    }

    function handleHTTPRequest(request: http.IncomingMessage, response: http.ServerResponse) {
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
            handle_api_request(response, url);
            return;
        } else if(url.pathname === "/") {
            url.pathname = "/index.html";
        }
        serve_file(url.pathname, response);
    }
}

namespace watcher {
    function execute(cmd: string, args: string[]) : ChildProcess {
        if(os.platform() === "win32")
            return cp.spawn(process.env.comspec, ["/C", cmd, ...args], {
                stdio: "pipe",
                cwd: __dirname,
                env: Object.assign({ NODE_ENV: "development" }, process.env)
            });
        else
            return cp.spawn(cmd, args, {
                cwd: __dirname,
                stdio: "pipe",
                detached: true,
                env: Object.assign({ NODE_ENV: "development" }, process.env)
            });
    }

    export abstract class Watcher {
        readonly name: string;

        protected verbose: boolean = false;

        private _process: ChildProcess;
        private _callback_init: () => any;
        private _callback_init_fail: (msg: string) => any;

        protected constructor(name: string) {
            this.name = name;
        }

        async start() {
            if(this._process)
                throw "watcher already started";

            const command = this.start_command();
            this._process = execute(command[0], command.slice(1));
            this._process.unref();
            this._process.stdout.on("readable", this.handle_stdout_readable.bind(this));
            this._process.stderr.on("readable", this.handle_stderr_readable.bind(this));
            this._process.addListener("exit", this.handle_exit.bind(this));
            this._process.addListener("error", this.handle_error.bind(this));

            try {
                await new Promise<void>((resolve, reject) => {
                    const id = setTimeout(reject, 5000, "timeout");
                    this._callback_init = () => {
                        clearTimeout(id);
                        resolve();
                    };
                    this._callback_init_fail = err => {
                        clearTimeout(id);
                        reject(err);
                    };
                });
            } catch(e) {
                try { this.stop(); } catch (_) { }
                throw e;
            } finally {
                this._callback_init_fail = undefined;
                this._callback_init = undefined;
            }
            console.log("%s watcher started.", this.name);
        }

        protected abstract start_command() : string[];

        async stop() {
            if(!this._process) return;

            console.log("%s watcher stopped.", this.name);
            this._process.kill("SIGTERM");
            this._process = undefined;
        }

        private handle_exit(code: number | null, signal: string | null) {
            console.log("%s watcher exited with code %d (%s)", this.name, code, signal);
            if(this._callback_init_fail)
                this._callback_init_fail("unexpected exit with code " + code);
        }

        private printReadBuffer(buffer: string, callback: typeof console.log) {
            const lines = buffer.split("\n");
            for(let index = 0; index < lines.length; index++) {
                let line = lines[index];
                if(line.charAt(0) === "\r")
                    line = line.substr(1);
                if(line === "" && index + 1 === lines.length)
                    break;

                callback("[%s] %s", this.name, line);
            }
        }

        private handle_stdout_readable() {
            const buffer: Buffer = this._process.stdout.read(this._process.stdout.readableLength);
            if(!buffer) return;

            if(this._callback_init)
                this._callback_init();

            const data = buffer.toString();
            if(this.verbose)
                this.printReadBuffer(data, console.log);
        }

        private handle_stderr_readable() {
            const buffer: Buffer = this._process.stderr.read(this._process.stderr.readableLength);
            if(!buffer) return;

            this.printReadBuffer(buffer.toString(), console.error);
        }

        private handle_error(err: Error) {
            if(this._callback_init_fail) {
                console.debug("%s received startup error: %o", this.name, err);
                this._callback_init_fail("received error: " + err.message);
            } else {
                console.log("%s received error: %o", this.name, err);
            }
        }
    }

    export class WebPackWatcher extends Watcher {
        private readonly target;

        constructor(target: "web" | "client") {
            super("WebPack");
            this.target = target;
            this.verbose = true;
        }

        protected start_command(): string[] {
            return ["npm", "run", "webpack-" + this.target, "--", "--watch"];
        }
    }
}
async function main_serve(target: "client" | "web", mode: "rel" | "dev", port: number) {
    await server.launch(target === "client" ? CLIENT_APP_FILE_LIST : WEB_APP_FILE_LIST, {
        port: port,
        search_options: {
            source_path: __dirname,
            parameter: [],
            target: target,
            mode: mode,
            serving: true
        }
    });

    console.log("Server started on %d", port);
    console.log("To stop the server press ^K^C.");
    await new Promise(() => {});
}

async function main_develop(node: boolean, target: "client" | "web", port: number, flags: string[]) {
    const webpackwatcher = new watcher.WebPackWatcher(target);

    try {
        if(flags.indexOf("--no-webpack") == -1)
            await webpackwatcher.start();

        try {
            await server.launch(target === "client" ? CLIENT_APP_FILE_LIST : WEB_APP_FILE_LIST, {
                port: port,
                search_options: {
                    source_path: __dirname,
                    parameter: [],
                    target: target,
                    mode: "dev",
                    serving: true
                }
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
    } catch (error) {
        console.error("Failed to start WebPack watcher: %o", error instanceof Error ? error.message : error);
    } finally {
        try {
            await webpackwatcher.stop();
        } catch(error) {
            console.warn("Failed to stop WebPack watcher: %o", error instanceof Error ? error.message : error);
        }
    }
}

async function git_tag() {
    const git_rev = fs.readFileSync(path.join(__dirname, ".git", "HEAD")).toString();

    if(git_rev.indexOf("/") === -1)
        return git_rev.substr(0, 7);
    else
        return fs.readFileSync(path.join(__dirname, ".git", git_rev.substr(5).trim())).toString().substr(0, 7);
}

async function main_generate(target: "client" | "web", mode: "rel" | "dev", dest_path: string, args: any[]) {
    const begin = Date.now();
    const files = await generator.search_files(target === "client" ? CLIENT_APP_FILE_LIST : WEB_APP_FILE_LIST, {
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
            const { stderr } = await exec(command);
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
            const switches = [];
            const pargs = args.slice(1).filter(e => e.startsWith("--") ? (switches.push(e), false) : true);

            await main_develop(is_node, target, pargs.length > 1 ? parseInt(pargs[1]) : 8081, switches);
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
}

/* proxy log for better format */
const wrap_log = (original, prefix: string) => (message, ...args) => original(prefix + (message ? message + "" : "").replace(/\n/g, "\n" + prefix), ...args.map(e => typeof(e) === "string" ? e.replace(/\n/g, "\n" + prefix) : e));
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
    process.exit(1);
});