import * as ts from "typescript";
import * as generator from "./generator";
import {readFileSync, writeFileSync} from "fs";
import * as path from "path";
import * as glob from "glob";
import {isArray} from "util";

console.log("TR GEN!");

/*
const files = ["/home/wolverindev/TeaSpeak/TeaSpeak/Web-Client/build/trgen/test/test_01.ts"];
files.forEach(file => {
    let source = ts.createSourceFile(
        file,
        readFileSync(file).toString(),
        ts.ScriptTarget.ES2016,
        true
    );

    generator.generate(source);
});
*/

interface Config {
    source_files?: string[];
    excluded_files?: string[];
    target_file?: string;
    verbose?: boolean;

    base_bath?: string;
    file_config?: string;
}

let config: Config = {};

let args = process.argv.slice(2);
while(args.length > 0) {
    if(args[0] == "-f" || args[0] == "--file") {
        (config.source_files || (config.source_files = [])).push(args[1]);
        args = args.slice(2);
    } else if(args[0] == "-e" || args[0] == "--exclude") {
        (config.excluded_files || (config.excluded_files = [])).push(args[1]);
        args = args.slice(2);
    } else if(args[0] == "-d" || args[0] == "--destination") {
        config.target_file = args[1];
        args = args.slice(2);
    } else if(args[0] == "-v" || args[0] == "--verbose") {
        config.verbose = true;
        args = args.slice(1);
    } else if(args[0] == "-c" || args[0] == "--config") {
        config.file_config = args[1];
        config.base_bath = path.normalize(path.dirname(config.file_config)) + "/";
        args = args.slice(2);
    } else {
        console.error("Invalid command line option \"%s\"", args[0]);
        process.exit(1);
    }
}

config.base_bath = config.base_bath || "";


if(config.verbose) {
    console.log("Base path: " + config.base_bath);
    console.log("Input files:");
    for(const file of config.source_files)
        console.log(" - " + file);
    console.log("Target file: " + config.target_file;
}

const negate_files: string[] = [].concat.apply([], (config.excluded_files || []).map(file => glob.sync(config.base_bath + file))).map(file => path.normalize(file));

let result = "";

function print(nodes: ts.Node[] | ts.SourceFile) : string {
    if(!isArray(nodes) && nodes.kind == ts.SyntaxKind.SourceFile)
        nodes = (<ts.SourceFile>nodes).getChildren();
    const dummy_file = ts.createSourceFile(
        "dummy_file",
        "",
        ts.ScriptTarget.ES2016,
        false,
        ts.ScriptKind.TS
    );

    const printer = ts.createPrinter({
        newLine: ts.NewLineKind.LineFeed
    });

    return printer.printList(
        ts.ListFormat.SpaceBetweenBraces | ts.ListFormat.MultiLine | ts.ListFormat.PreferNewLine,
        nodes as any,
        dummy_file
    );
}

config.source_files.forEach(file => {
    if(config.verbose)
        console.log("iterating over %s", file)
    glob.sync(config.base_bath + file).forEach(_file => {
        _file = path.normalize(_file);
        for(const n_file of negate_files) {
            if(n_file == _file)  {
                console.log("Skipping %s", _file);
                return;
            }
        }

        let source = ts.createSourceFile(
            _file,
            readFileSync(_file).toString(),
            ts.ScriptTarget.ES2016,
            true
        );
        console.log(print(source));

        console.log("Compile " + _file);

        const messages = generator.generate(source, {
            replace_cache: true
        });
        messages.forEach(message => {
            console.log(message);
        });

        console.log("PRINT!");
        console.log(print(source));
        /*
        result += "\n\n" + decl.print(decl.generate(source, {
            remove_private: false
        }));
*/
    });
});

/*
mkdirp(path.normalize(path.dirname(base_path + "/" + target_file)), error => {
    if(error)
        throw error;
    writeFileSync(base_path + "/" + target_file, result);
});
*/