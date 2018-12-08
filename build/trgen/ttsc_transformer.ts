import * as ts from "typescript";
import * as generator from "./generator";
import {PluginConfig} from "ttypescript/lib/PluginCreator";
import {writeFileSync} from "fs";

interface Config {
    target_file?: string;
    verbose?: boolean;
}

//(program: ts.Program, config?: PluginConfig) => ts.TransformerFactory
let process_config: Config;
export default function(program: ts.Program, config?: PluginConfig) : (context: ts.TransformationContext) => (sourceFile: ts.SourceFile) => ts.SourceFile {
    process_config = config as any || {};

    if(process_config.verbose)
        console.log("TRGen transformer called");

    process.on('exit', function () {
        if(process_config.target_file) {
            if(process_config.verbose)
                console.log("Writing translation file to " + process_config.target_file);

            writeFileSync(process_config.target_file, JSON.stringify(translations, null, 2));
        }
    });

    return ctx => transformer(ctx);
}

const translations: generator.TranslationEntry[] = [];
const transformer = (context: ts.TransformationContext) => (rootNode: ts.SourceFile) => {
    console.log("Processing " + rootNode.fileName);
    const result = generator.transform({
        use_window: false,
        replace_cache: true
    }, context, rootNode);
    translations.push(...result.translations);
    return result.node;
};