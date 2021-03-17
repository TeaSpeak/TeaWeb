import * as webpack from "webpack";
import * as path from "path";
import {Compilation, NormalModule} from "webpack";

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
        compiler.hooks.thisCompilation.tap({
            name: "ManifestGenerator",
            stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
        }, compilation => {
            compilation.hooks.processAssets.tap("ManifestGenerator", () => this.emitAssets(compilation));
        });
    }

    emitAssets(compilation: webpack.Compilation) {
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

                for(const module of compilation.chunkGraph.getChunkModules(chunk)) {
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

                    if(!(module instanceof NormalModule)) {
                        continue;
                    }

                    if(module.resource.indexOf("webpack-dev-server") !== -1) {
                        /* Don't include dev server files */
                        continue;
                    }

                    if(module.context !== path.dirname(module.resource)) {
                        throw "invalid context/resource relation (" + module.context + " <-> " + path.dirname(module.resource) + ")";
                    }

                    modules.push({
                        id: compilation.chunkGraph.getModuleId(module),
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
        compilation.emitAsset(fileName, new webpack.sources.RawSource(payload));
    }
}

export = ManifestGenerator;