import * as webpack from "webpack";
import * as path from "path";

interface Options {
    outputFileName?: string;
    context: string;
}

class ManifestGenerator {
    private readonly options: Options;

    constructor(options: Options) {
        this.options = options || { context: __dirname };
    }

    apply(compiler: webpack.Compiler) {
        compiler.hooks.emit.tap("ManifestGenerator", compilation => {
            const chunkData = {};
            for(const chunkGroup of compilation.chunkGroups) {
                const fileJs = [];
                const filesCss = [];
                const modules = [];

                for(const chunk of chunkGroup.chunks) {
                    if(!chunk.files.size) {
                        continue;
                    }

                    for(const file of chunk.files) {
                        const extension = path.extname(file);
                        switch (extension) {
                            case ".js":
                                fileJs.push({
                                    hash: chunk.hash,
                                    file: file
                                });
                                break;

                            case ".css":
                                filesCss.push({
                                    hash: chunk.hash,
                                    file: file
                                });
                                break;

                            case ".wasm":
                                break;

                            default:
                                throw "Unknown chunk file with extension " + extension;
                        }
                    }

                    for(const module of chunk.getModules() as any[]) {
                        if(!module.type.startsWith("javascript/")) {
                            continue;
                        }

                        if(!module.context) {
                            continue;
                        }

                        if(module.context.startsWith("svg-sprites/")) {
                            /* custom svg sprite handler */
                            modules.push({
                                id: module.id,
                                context: "svg-sprites",
                                resource: module.context.substring("svg-sprites/".length)
                            });
                            continue;
                        }

                        if(!module.resource) {
                            continue;
                        }

                        if(module.context !== path.dirname(module.resource)) {
                            throw "invalid context/resource relation";
                        }

                        modules.push({
                            id: module.id,
                            context: path.relative(this.options.context, module.context).replace(/\\/g, "/"),
                            resource: path.basename(module.resource)
                        });
                    }
                }

                chunkData[chunkGroup.options.name] = {
                    files: fileJs,
                    css_files: filesCss,
                    modules: modules
                };
            }

            const payload = JSON.stringify({
                version: 2,
                chunks: chunkData
            });

            const fileName = this.options.outputFileName || "manifest.json";
            compilation.assets[fileName] = {
                size() { return payload.length; },
                source() { return payload; }
            } as any;
        });
    }
}

export = ManifestGenerator;