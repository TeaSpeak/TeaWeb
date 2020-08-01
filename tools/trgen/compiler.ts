import * as ts from "typescript";
import * as generator from "./ts_generator";

import {readFileSync} from "fs";
import * as glob from "glob";
import * as path from "path";

const transformer = <T extends ts.Node>(context: ts.TransformationContext) => (rootNode: T) => {
    return generator.transform({
        use_window: false,
        replace_cache: true,
        verbose: true
    }, context, rootNode as any).node;
};


function compile(fileNames: string[], options: ts.CompilerOptions): void {
    const program: ts.Program = ts.createProgram(fileNames, options);

    let emitResult = program.emit(undefined, undefined, undefined, undefined, {
        before: [ transformer ]
    });

    let allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);

    allDiagnostics.forEach(diagnostic => {
        if (diagnostic.file) {
            let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
                diagnostic.start!
            );
            let message = ts.flattenDiagnosticMessageText(
                diagnostic.messageText,
                "\n"
            );
            console.log(
                `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`
            );
        } else {
            console.log(
                `${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`
            );
        }
    });

    let exitCode = emitResult.emitSkipped ? 1 : 0;
    console.log(`Process exiting with code '${exitCode}'.`);
    process.exit(exitCode);
}

const config = ts.parseCommandLine(process.argv.slice(2), file => readFileSync(file).toString());
if(config.errors && config.errors.length > 0) {
    for(const error of config.errors)
        console.log(error.messageText);
    process.exit(1);
}

if(config.options.project) {
    const project = ts.readConfigFile(config.options.project, file => readFileSync(file).toString()).config;
    const base_path = path.dirname(config.options.project) + "/";
    console.dir(project);


    const negate_files: string[] = [].concat.apply([], (project.exclude || []).map(file => glob.sync(base_path + file))).map(file => path.normalize(file));
    project.include.forEach(file => {
        glob.sync(base_path + file).forEach(_file => {
            _file = path.normalize(_file);
            for(const n_file of negate_files) {
                if(n_file == _file)  {
                    console.log("Skipping %s", _file);
                    return;
                }
            }

            config.fileNames.push(_file);
        });
    });

    Object.assign(config.options, project.compilerOptions);
    console.log(config.options);
}

compile(config.fileNames, config.options);