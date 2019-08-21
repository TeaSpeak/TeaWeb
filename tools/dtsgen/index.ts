import {readFileSync, writeFileSync, mkdir} from "fs";
import {isArray, isString} from "util";
import * as ts from "typescript";
import * as decl from "./declarator";
import * as glob from "glob";
import * as path from "path";
import * as mkdirp from "mkdirp";

let source_files: string[] = [];
let exclude_files: string[] = [];
let target_file: string = "out.d.ts";
let verbose: boolean = false;
let config_file: string = undefined;
let base_path = process.cwd();

let args = process.argv.slice(2);
while(args.length > 0) {
    if(args[0] == "--file") {
        source_files.push(args[1]);
        args = args.slice(2);
    } else if(args[0] == "--exclude") {
        exclude_files.push(args[1]);
        args = args.slice(2);
    } else if(args[0] == "--destination") {
        target_file = args[1];
        args = args.slice(2);
    } else if(args[0] == "-v" || args[0] == "--verbose") {
        verbose = true;
        args = args.slice(1);
    } else if(args[0] == "-c" || args[0] == "--config") {
        config_file = args[1];
        base_path = path.normalize(path.dirname(config_file));
        args = args.slice(2);
    } else if(args[0] == "-b" || args[0] == "--base") {
        base_path = args[1];
        base_path = path.normalize(base_path);
        args = args.slice(2);
    } else {
        console.error("Invalid command line option %s", args[0]);
        process.exit(1);
    }
}

if(config_file) {
    console.log("Loading config file");
    const json = JSON.parse(readFileSync(config_file).toString());
    if(!json) {
        console.error("Failed to parse config!");
        process.exit(1);
    }

    if(isArray(json["source_files"]))
        source_files.push(...json["source_files"]);
    if(isArray(json["exclude"]))
        exclude_files.push(...json["exclude"]);
    if(isString(json["target_file"]))
        target_file = json["target_file"];
}

if(verbose) {
    console.log("Base path: " + base_path);
    console.log("Input files:");
    for(const file of source_files)
        console.log(" - " + file);
    console.log("Target file: " + target_file);
}

const negate_files: string[] = [].concat.apply([], exclude_files.map(file => glob.sync(base_path + "/" + file))).map(file => path.normalize(file));

let result = "";
source_files.forEach(file => {
    glob.sync(base_path + "/" + file).forEach(_file => {
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
            ts.ScriptTarget.ES2015,
            true
        );

        console.log("Compile " + _file);
        result += "\n/* File: " + _file + " */\n" + decl.print(source, decl.generate(source, {
            remove_private: false
        }));
    });
});

mkdirp(path.normalize(path.dirname(base_path + "/" + target_file)), error => {
    if(error)
        throw error;
    writeFileSync(base_path + "/" + target_file, result);
});