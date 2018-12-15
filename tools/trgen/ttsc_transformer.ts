import * as ts from "typescript";
import * as ts_generator from "./ts_generator";
import * as path from "path";
import * as mkdirp from "mkdirp";

import {PluginConfig} from "ttypescript/lib/PluginCreator";
import {writeFileSync} from "fs";
import {TranslationEntry} from "./generator";

interface Config {
    target_file?: string;
    verbose?: boolean;
}

//(program: ts.Program, config?: PluginConfig) => ts.TransformerFactory
let process_config: Config;
export default function(program: ts.Program, config?: PluginConfig) : (context: ts.TransformationContext) => (sourceFile: ts.SourceFile) => ts.SourceFile {
    process_config = config as any || {};

    const base_path = path.dirname(program.getCompilerOptions().project || program.getCurrentDirectory());
    if(process_config.verbose) {
        console.log("TRGen transformer called");
        console.log("Base path: %s", base_path);
    }

    process.on('exit', function () {
        const target = path.isAbsolute(process_config.target_file) ? process_config.target_file : path.join(base_path, process_config.target_file);
        if(process_config.target_file) {
            if(process_config.verbose)
                console.log("Writing translation file to " + target);

            mkdirp.sync(path.dirname(target));
            writeFileSync(target, JSON.stringify(translations, null, 2));
        }
    });

    return ctx => transformer(ctx);
}

const translations: TranslationEntry[] = [];
const transformer = (context: ts.TransformationContext) => (rootNode: ts.SourceFile) => {
    console.log("Processing " + rootNode.fileName);
    const result = ts_generator.transform({
        use_window: false,
        replace_cache: true
    }, context, rootNode);
    translations.push(...result.translations);
    return result.node;
};