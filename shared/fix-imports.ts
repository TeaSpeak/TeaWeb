import * as ts from "tsd/libraries/typescript";
import {SourceFile, SyntaxKind, TransformerFactory} from "tsd/libraries/typescript";
import * as path from "path";
import * as fs from "fs-extra";

type ImportReplacement = { index: number, length: number, replacement: string };
let importReplacements: ImportReplacement[] = [];

const ImportTransformerFactory: (depth: number) => TransformerFactory<SourceFile> = fileDepth => context => source => {
    const visit = (node: ts.Node, depth: number) => {
        if(node.kind === SyntaxKind.ImportDeclaration) {
            const decl = node as ts.ImportDeclaration;
            if(decl.moduleSpecifier?.kind === SyntaxKind.StringLiteral) {
                const module = decl.moduleSpecifier as ts.StringLiteral;
                if(module.text.startsWith("tc-shared")) {
                    const rootPath = [...new Array(fileDepth)].map(() => "..").join("/");
                    const newPath = (rootPath || ".") + module.text.substr(9);
                    console.error("Import: %o -> %o", module.text, newPath);
                    importReplacements.push({
                        index: module.getStart(source, false) + 1,
                        length: module.getWidth(source) - 2,
                        replacement: newPath
                    });
                }
            }
        }

        if(depth > 5) {
            /* no import decl possible */
            return node;
        }

        return ts.visitEachChild(node, n => visit(n, depth + 1), context);
    };

    return ts.visitNode(source, n => visit(n, fileDepth));
}

async function processFile(file: string, fileDepth: number) {
    if(path.extname(file) !== ".ts") {
        return;
    }

    let sourceData = (await fs.readFile(file)).toString();
    let source = ts.createSourceFile(
        file,
        sourceData,
        ts.ScriptTarget.ES2015,
        true
    );

    console.log("Transforming %s", file);

    importReplacements = [];
    ts.transform(source, [ImportTransformerFactory(fileDepth)]);
    importReplacements.sort((a, b) => b.index - a.index);
    importReplacements.forEach(replacement => {
        sourceData = sourceData.substring(0, replacement.index) + replacement.replacement + sourceData.substring(replacement.index + replacement.length);
    });

    await fs.writeFile(file, sourceData);
}

async function processDirectory(directory: string, depth: number) {
    const files = await fs.readdir(directory);
    for(const file of files) {
        let filePath = path.join(directory, file);
        if((await fs.stat(filePath)).isDirectory()) {
            await processDirectory(filePath, depth + 1);
        } else {
            await processFile(filePath, depth);
        }
    }
}

processDirectory(path.join(__dirname, "js"), 0).catch(error => {
    console.error(error);
});