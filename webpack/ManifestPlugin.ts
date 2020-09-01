import * as webpack from "webpack";
import * as fs from "fs-extra";
import * as path from "path";

interface Options {
    file?: string;
    base: string;
}

class ManifestGenerator {
    private manifest_content;

    readonly options: Options;
    constructor(options: Options) {
        this.options = options || { base: __dirname };
    }

    apply(compiler: webpack.Compiler) {
        compiler.hooks.afterCompile.tap(this.constructor.name,  compilation => {
            const chunks_data = {};
            for(const chunkGroup of compilation.chunkGroups) {
                const fileJs = [];
                const filesCss = [];
                const modules = [];

                for(const chunk of chunkGroup.chunks) {
                    if(!chunk.files.length)
                        continue;

                    /*
                    if(chunk.files.length !== 1) {
                        console.error("Expected only one file per chunk but got " + chunk.files.length);
                        chunk.files.forEach(e => console.log(" - %s", e));
                        throw "expected only one file per chunk";
                    }
                    */

                    for(const file of chunk.files) {
                        const extension = path.extname(file);
                        if(extension === ".js") {
                            fileJs.push({
                                hash: chunk.hash,
                                file: file
                            });
                        } else if(extension === ".css") {
                            filesCss.push({
                                hash: chunk.hash,
                                file: file
                            });
                        } else if(extension === ".wasm") {
                            /* do nothing */
                        } else {
                            throw "Unknown chunk file with extension " + extension;
                        }
                    }

                    for(const module of chunk.getModules()) {
                        if(!module.type.startsWith("javascript/"))
                            continue;

                        if(!module.context)
                            continue;

                        if(module.context.startsWith("svg-sprites/")) {
                            /* custom svg sprite handler */
                            modules.push({
                                id: module.id,
                                context: "svg-sprites",
                                resource: module.context.substring("svg-sprites/".length)
                            });
                            continue;
                        }

                        if(!module.resource)
                            continue;

                        if(module.context !== path.dirname(module.resource))
                            throw "invalid context/resource relation";

                        modules.push({
                            id: module.id,
                            context: path.relative(this.options.base, module.context).replace(/\\/g, "/"),
                            resource: path.basename(module.resource)
                        });
                    }
                }

                chunks_data[chunkGroup.options.name] = {
                    files: fileJs,
                    css_files: filesCss,
                    modules: modules
                };
            }

            this.manifest_content = {
                version: 2,
                chunks: chunks_data
            };
        });

        compiler.hooks.done.tap(this.constructor.name, () => {
            const file = this.options.file || "manifest.json";
            fs.mkdirpSync(path.dirname(file));
            fs.writeFileSync(this.options.file || "manifest.json", JSON.stringify(this.manifest_content));
        });
    }
}

export = ManifestGenerator;