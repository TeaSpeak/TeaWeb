import * as webpack from "webpack";
import * as fs from "fs";

interface Options {
    file?: string;
}

class ManifestGenerator {
    private manifest_content;

    readonly options: Options;
    constructor(options: Options) {
        this.options = options || {};
    }

    apply(compiler: webpack.Compiler) {
        compiler.hooks.afterCompile.tap(this.constructor.name,  compilation => {
            const chunks_data = {};
            for(const chunk_group of compilation.chunkGroups) {
                console.log(chunk_group.options.name);
                const js_files = [];
                for(const chunk of chunk_group.chunks) {
                    if(chunk.files.length !== 1) throw "expected only one file per chunk";

                    const file = chunk.files[0];
                    console.log("Chunk: %s - %s - %s", chunk.id, chunk.hash, file);
                    //console.log(chunk);
                    //console.log(" - %s -  %o", chunk.id, chunk);
                    js_files.push({
                        hash: chunk.hash,
                        file: file
                    })
                }
                chunks_data[chunk_group.options.name] = js_files;
            }

            this.manifest_content = {
                version: 1,
                chunks: chunks_data
            };
        });

        compiler.hooks.done.tap(this.constructor.name, () => {
            fs.writeFileSync(this.options.file || "manifest.json", JSON.stringify(this.manifest_content));
        });
    }
}

export = ManifestGenerator;