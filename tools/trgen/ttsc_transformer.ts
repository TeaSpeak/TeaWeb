import transform, {Config} from "./ts_transformer";
import {PluginConfig} from "ttypescript/lib/PluginCreator";
import * as ts from "typescript";

export default function(program: ts.Program, config?: PluginConfig) : (context: ts.TransformationContext) => (sourceFile: ts.SourceFile) => ts.SourceFile {
    const process_config: Config = config as any || {};

    return transform(program, process_config);
}