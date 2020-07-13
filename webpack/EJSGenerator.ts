import * as webpack from "webpack";
import * as ejs from "ejs";
import * as fs from "fs";
import * as util from "util";
import * as minifier from "html-minifier";
import * as path from "path";
import Compilation = webpack.compilation.Compilation;

interface Options {
    input: string,
    output: string,

    minify?: boolean,

    initialJSEntryChunk: string,
    embedInitialJSEntryChunk?: boolean,

    initialCSSFile: {
        localFile: string,
        publicFile: string
    },
    embedInitialCSSFile?: boolean,

    variables?: {[name: string]: any};
}

class EJSGenerator {
    readonly options: Options;

    constructor(options: Options) {
        this.options = options;
    }

    private async generateEntryJsTag(compilation: Compilation) {
        const entry_group = compilation.chunkGroups.find(e => e.options.name === this.options.initialJSEntryChunk);
        if(!entry_group) return; /* not the correct compilation */

        const tags = entry_group.chunks.map(chunk => {
            if(chunk.files.length !== 1)
                throw "invalid chunk file count";

            const file = chunk.files[0];
            if(path.extname(file) !== ".js")
                throw "Entry chunk file has unknown extension";

            if(!this.options.embedInitialJSEntryChunk) {
                return '<script type="application/javascript" src=' + compilation.compiler.options.output.publicPath + file + ' async defer></script>';
            } else {
                const script = fs.readFileSync(path.join(compilation.compiler.outputPath, file));
                return `<script type="application/javascript">${script}</script>`;
            }
        });
        return tags.join("\n");
    }

    private async generateEntryCssTag() {
        if(this.options.embedInitialCSSFile) {
            const style = await util.promisify(fs.readFile)(this.options.initialCSSFile.localFile);
            return `<style>${style}</style>`
        } else {
            return `<link rel="stylesheet" href="${this.options.initialCSSFile.publicFile}">`
        }
    }

    apply(compiler: webpack.Compiler) {
        compiler.hooks.afterEmit.tapPromise(this.constructor.name, async compilation => {
            const input = await util.promisify(fs.readFile)(this.options.input);
            const variables = Object.assign({}, this.options.variables);

            variables["initial_script"] = await this.generateEntryJsTag(compilation);
            variables["initial_css"] = await this.generateEntryCssTag();

            let generated = await ejs.render(input.toString(), variables, {
                beautify: false, /* uglify is a bit dump and does not understands ES6 */
                context: this
            });

            if(this.options.minify) {
                generated = minifier.minify(generated, {
                    html5: true,

                    collapseWhitespace: true,
                    removeComments: true,
                    removeRedundantAttributes: true,
                    removeScriptTypeAttributes: true,
                    removeTagWhitespace: true,
                    minifyCSS: true,
                    minifyJS: true,
                    minifyURLs: true,
                });
            }

            await util.promisify(fs.writeFile)(this.options.output, generated);
        });

        compiler.hooks.afterCompile.tapPromise(this.constructor.name, async compilation => {
            const file = path.resolve(this.options.input);
            if(compilation.fileDependencies.has(file))
                return;

            console.log("Adding additional watch to %s", file);
            compilation.fileDependencies.add(file);
        });
    }
}

export = EJSGenerator;