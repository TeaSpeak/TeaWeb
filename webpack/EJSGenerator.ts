import * as webpack from "webpack";
import * as ejs from "ejs";
import * as fs from "fs";
import * as util from "util";
import * as minifier from "html-minifier";
import * as path from "path";
import {Compilation} from "webpack";

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

    private async generate_entry_js_tag(compilation: Compilation) {
        const entry_group = compilation.chunkGroups.find(e => e.options.name === this.options.initialJSEntryChunk);
        if(!entry_group) return; /* not the correct compilation */
        if(entry_group.chunks.length !== 1) throw "Unsupported entry chunk size. We only support one at the moment.";
        if(entry_group.chunks[0].files.length !== 1)
            throw "Entry chunk has too many files. We only support to inline one!";
        const file = entry_group.chunks[0].files[0];
        if(path.extname(file) !== ".js")
            throw "Entry chunk file has unknown extension";

        if(!this.options.embedInitialJSEntryChunk) {
            return '<script type="application/javascript" src=' + compilation.compiler.options.output.publicPath + file + ' async defer></script>';
        } else {
            const script = await util.promisify(fs.readFile)(path.join(compilation.compiler.outputPath, file));
            return `<script type="application/javascript">${script}</script>`;
        }
    }

    private async generate_entry_css_tag() {
        if(this.options.embedInitialCSSFile) {
            const style = await util.promisify(fs.readFile)(this.options.initialCSSFile.localFile);
            return `<style>${style}</style>`
        } else {
            //<link rel="preload" href="mystyles.css" as="style" onload="this.rel='stylesheet'">
            return `<link rel="preload" as="style" onload="this.rel='stylesheet'" href="${this.options.initialCSSFile.publicFile}">`
        }
    }

    apply(compiler: webpack.Compiler) {
        compiler.hooks.afterEmit.tapPromise(this.constructor.name, async compilation => {
            const input = await util.promisify(fs.readFile)(this.options.input);
            const variables = Object.assign({}, this.options.variables);

            variables["initial_script"] = await this.generate_entry_js_tag(compilation);
            variables["initial_css"] = await this.generate_entry_css_tag();

            let generated = await ejs.render(input.toString(), variables, {
                beautify: false /* uglify is a bit dump and does not understands ES6 */
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
                    minifyURLs: true
                });
            }

            await util.promisify(fs.writeFile)(this.options.output, generated);
        });
    }
}

export = EJSGenerator;