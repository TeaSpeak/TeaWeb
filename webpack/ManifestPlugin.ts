import * as webpack from "webpack";
import * as fs from "fs";
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
            for(const chunk_group of compilation.chunkGroups) {
                const js_files = [];
                const css_files = [];
                const modules = [];

                for(const chunk of chunk_group.chunks) {
                    if(!chunk.files.length) continue;
                    if(chunk.files.length !== 1) {
                        console.error("Expected only one file per chunk but got " + chunk.files.length);
                        chunk.files.forEach(e => console.log(" - %s", e));
                        throw "expected only one file per chunk";
                    }

                    for(const file of chunk.files) {
                        const extension = path.extname(file);
                        if(extension === ".js")
                            js_files.push({
                                hash: chunk.hash,
                                file: file
                            });
                        else if(extension === ".css")
                            css_files.push({
                                hash: chunk.hash,
                                file: file
                            });
                        else
                            throw "Unknown chunk file with extension " + extension;
                    }

                    for(const module of chunk._modules) {
                        if(!module.type.startsWith("javascript/"))
                            continue;

                        if(!module.resource || !module.context)
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

                chunks_data[chunk_group.options.name] = {
                    files: js_files,
                    css_files: css_files,
                    modules: modules
                };
            }

            this.manifest_content = {
                version: 2,
                chunks: chunks_data
            };
        });

        compiler.hooks.done.tap(this.constructor.name, () => {
            fs.writeFileSync(this.options.file || "manifest.json", JSON.stringify(this.manifest_content));
        });
    }
}

export = ManifestGenerator;