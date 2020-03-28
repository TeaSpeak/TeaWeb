import {readFileSync, writeFileSync, mkdir, existsSync} from "fs";
import * as ts from "typescript";
import * as decl from "./declarator";
import * as glob from "glob";
import * as path from "path";
import * as mkdirp from "mkdirp";
import {removeSync} from "fs-extra";

let source_files: string[] = [];
let exclude_files: string[] = [];
let target_directory: string = "out.d/";
let verbose: boolean = false;
let config_file: string = undefined;
let base_path = process.cwd();
let module_mode: boolean = false;

let args = process.argv.slice(2);
while(args.length > 0) {
    if(args[0] === "--file") {
        source_files.push(args[1]);
        args = args.slice(2);
    } else if(args[0] === "--exclude") {
        exclude_files.push(args[1]);
        args = args.slice(2);
    } else if(args[0] === "--destination") {
        target_directory = args[1];
        args = args.slice(2);
    } else if(args[0] === "-v" || args[0] === "--verbose") {
        verbose = true;
        args = args.slice(1);
    } else if(args[0] === "-c" || args[0] === "--config") {
        config_file = args[1];
        base_path = path.normalize(path.dirname(config_file));
        args = args.slice(2);
    } else if(args[0] === "-b" || args[0] === "--base-directory") {
        base_path = args[1];
        base_path = path.normalize(base_path);
        args = args.slice(2);
    } else if(args[0] === "-m" || args[0] === "--module") {
        module_mode = true;
        args = args.slice(1);
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

    if(Array.isArray(json["source_files"]))
        source_files.push(...json["source_files"]);
    if(Array.isArray(json["exclude"]))
        exclude_files.push(...json["exclude"]);
    if(typeof json["target_directory"] === "string")
        target_directory = json["target_directory"];
    if(typeof json["base_directory"] === "string")
        base_path = json["base_directory"];
    if(typeof json["modular"] === "boolean")
        module_mode = json["modular"];
}

if(verbose) {
    console.log("Base path: " + base_path);
    console.log("Input files:");
    for(const file of source_files)
        console.log(" - " + file);
    console.log("Target directory: " + target_directory);
}

if(existsSync(target_directory)) {
    removeSync(target_directory);
    if(existsSync(target_directory)) {
        console.error("Failed to remove target directory (%s)", target_directory);
        process.exit(1);
    }
}

const negate_files: string[] = [].concat.apply([], exclude_files.map(file => glob.sync(base_path + "/" + file))).map(file => path.normalize(file));

source_files.forEach(file => {
    const glob_base = path.normalize(path.join(process.cwd(), base_path));
    if(verbose)
        console.log("Globbing %s", glob_base);
    glob.sync(glob_base + "/" + file).forEach(_file => {
        _file = path.normalize(_file);
        if(!_file.startsWith(glob_base)) {
            /* this should never happen */
            console.log("Skipping %s because of unmatching base directory.", _file);
            return;
        }
        for(const n_file of negate_files) {
            if(n_file == _file)  {
                console.log("Skipping %s", _file);
                return;
            }
        }

        const relpath = _file.substr(glob_base.length);
        let source = ts.createSourceFile(
            _file,
            readFileSync(_file).toString(),
            ts.ScriptTarget.ES2015,
            true
        );

        console.log("Compile %s (%s)", _file, relpath);
        const result = decl.print(source, decl.generate(source, {
            remove_private: false,
            module_mode: module_mode
        }));

        let fpath = path.join(base_path, target_directory, relpath);
        fpath = fpath.substr(0, fpath.lastIndexOf(".")) + ".d.ts";
        mkdirp(path.normalize(path.dirname(fpath)), error => {
            if(error) throw error;
            writeFileSync(fpath, result);
        });
    });
});
