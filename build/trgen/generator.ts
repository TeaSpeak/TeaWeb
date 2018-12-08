import * as ts from "typescript";
import * as sha256 from "sha256";
import {SyntaxKind} from "typescript";


export function generate(file: ts.SourceFile, config: Configuration) : TranslationEntry[] {
    let result: TranslationEntry[] = [];

    file.forEachChild(n => _generate(config, n, result));

    return result;
}

function report(node: ts.Node, message: string) {
    const sf = node.getSourceFile();
    let { line, character } = sf ? sf.getLineAndCharacterOfPosition(node.getStart()) : {line: -1, character: -1};
    console.log(`${(sf || {fileName: "unknown"}).fileName} (${line + 1},${character + 1}): ${message}`);
}

function _generate(config: Configuration, node: ts.Node, result: TranslationEntry[]) {
    //console.log("Node: %s", SyntaxKind[node.kind]);

    call_analize:
    if(ts.isCallExpression(node)) {
        const call = <ts.CallExpression>node;
        const call_name = call.expression["escapedText"] as string;
        if(call_name != "tr") break call_analize;

        console.dir(call_name);

        console.log("Parameters: %o", call.arguments.length);
        if(call.arguments.length > 1) {
            report(call, "Invalid argument count");
            node.forEachChild(n => _generate(config, n, result));
            return;
        }

        const object = <ts.StringLiteral>call.arguments[0];
        if(object.kind != SyntaxKind.StringLiteral) {
            report(call, "Invalid argument: " + SyntaxKind[object.kind]);
            node.forEachChild(n => _generate(config, n, result));
            return;
        }

        console.log("Message: %o", object.text);

        //FIXME
        if(config.replace_cache) {
            console.log("Update!");
            ts.updateCall(call, call.expression, call.typeArguments, [ts.createLiteral("PENIS!")]);
        }

        const { line, character } = node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());
        result.push({
            filename: node.getSourceFile().fileName,
            line: line,
            character: character,
            message: object.text
        });
    }

    node.forEachChild(n => _generate(config, n, result));
}
function create_unique_check(source_file: ts.SourceFile, variable: ts.Expression, variables: { name: string, node: ts.Node }[]) : ts.Node[] {
    const nodes: ts.Node[] = [], blocked_nodes: ts.Statement[] = [];

    const node_path = (node: ts.Node) => {
        const sf = node.getSourceFile();
        let { line, character } = sf ? sf.getLineAndCharacterOfPosition(node.getStart()) : {line: -1, character: -1};
        return `${(sf || {fileName: "unknown"}).fileName} (${line + 1},${character + 1})`;
    };

    const create_error = (variable_name: ts.Expression, variable_path: ts.Expression, other_path: ts.Expression) => {
        return [
            ts.createLiteral("Translation with generated name \""),
            variable_name,
            ts.createLiteral("\" already exists!\nIt has been already defined here: "),
            other_path,
            ts.createLiteral("\nAttempted to redefine here: "),
            variable_path,
            ts.createLiteral("\nRegenerate and/or fix your program!")
        ].reduce((a, b) => ts.createBinary(a, SyntaxKind.PlusToken, b));
    };

    let declarations_file: ts.Expression;
    const unique_check_label_name = "unique_translation_check";

    /* initialization */
    {
        const declarations = ts.createElementAccess(variable, ts.createLiteral("declared"));
        nodes.push(ts.createAssignment(declarations, ts.createBinary(declarations, SyntaxKind.BarBarToken, ts.createAssignment(declarations, ts.createObjectLiteral()))));

        declarations_file = ts.createElementAccess(variable, ts.createLiteral("declared_files"));
        nodes.push(ts.createAssignment(declarations_file, ts.createBinary(declarations_file, SyntaxKind.BarBarToken, ts.createAssignment(declarations_file, ts.createObjectLiteral()))));

        variable = declarations;
    }

    /* test file already loaded */
    {
        const unique_id = sha256(source_file.fileName + " | " + (Date.now() / 1000));
        const property = ts.createElementAccess(declarations_file, ts.createLiteral(unique_id));

        const if_condition = ts.createBinary(property, SyntaxKind.ExclamationEqualsEqualsToken, ts.createIdentifier("undefined"));
        //
        let if_then: ts.Block;
        {
            const elements: ts.Statement[] = [];

            const console = ts.createIdentifier("console.warn");
            elements.push(ts.createCall(console, [], [ts.createLiteral("This file has already been loaded!\nAre you executing scripts twice?") as any]));
            elements.push(ts.createBreak(unique_check_label_name));

            if_then = ts.createBlock(elements);
        }

        const if_else = ts.createAssignment(property, ts.createLiteral(unique_id));
        blocked_nodes.push(ts.createIf(if_condition, if_then, if_else as any));
    }

    /* test if variable has been defined somewhere else */
    {
        const for_variable_name = ts.createLoopVariable();
        const for_variable_path = ts.createLoopVariable();
        const for_declaration = ts.createVariableDeclarationList([ts.createVariableDeclaration(ts.createObjectBindingPattern([
                ts.createBindingElement(undefined, "name", for_variable_name, undefined),
                ts.createBindingElement(undefined, "path", for_variable_path, undefined)])
            , undefined, undefined)]);

        let for_block: ts.Statement;
        { //Create the for block
            const elements: ts.Statement[] = [];


            const property = ts.createElementAccess(variable, for_variable_name);
            const if_condition = ts.createBinary(property, SyntaxKind.ExclamationEqualsEqualsToken, ts.createIdentifier("undefined"));

            //
            const if_then = ts.createThrow(create_error(for_variable_name, for_variable_path, property));
            const if_else = ts.createAssignment(property, for_variable_path);
            const if_valid = ts.createIf(if_condition, if_then, if_else as any);

            elements.push(if_valid);

            for_block = ts.createBlock(elements);
        }

        let block = ts.createForOf(undefined,
            for_declaration, ts.createArrayLiteral(
                [...variables.map(e => ts.createObjectLiteral([
                    ts.createPropertyAssignment("name", ts.createLiteral(e.name)),
                    ts.createPropertyAssignment("path", ts.createLiteral(node_path(e.node)))
                    ]))
                ])
            , for_block);
        block = ts.addSyntheticLeadingComment(block, SyntaxKind.MultiLineCommentTrivia, "Auto generated helper for testing if the translation keys are unique", true);
        blocked_nodes.push(block);
    }
    return [...nodes, ts.createLabel(unique_check_label_name, ts.createBlock(blocked_nodes))];
}

export function transform(config: Configuration, context: ts.TransformationContext, node: ts.SourceFile) : TransformResult {
    const cache: VolatileTransformConfig = {} as any;
    cache.translations = [];

    //Initialize nodes
    const extra_nodes: ts.Node[] = [];
    {
        cache.nodes = {} as any;
        if(config.use_window) {
            const window = ts.createIdentifier("window");
            let translation_map = ts.createPropertyAccess(window, ts.createIdentifier("_translations"));
            const new_translations = ts.createAssignment(translation_map, ts.createObjectLiteral());

            let translation_map_init: ts.Expression = ts.createBinary(translation_map, ts.SyntaxKind.BarBarToken, new_translations);
            translation_map_init = ts.createParen(translation_map_init);

            cache.nodes = {
                translation_map: translation_map,
                translation_map_init: translation_map_init
            };
        } else {
            const variable_name = "_translations";
            const variable_map = ts.createIdentifier(variable_name);

            const inline_if = ts.createBinary(ts.createBinary(ts.createTypeOf(variable_map), SyntaxKind.ExclamationEqualsEqualsToken, ts.createLiteral("undefined")), ts.SyntaxKind.BarBarToken, ts.createAssignment(variable_map, ts.createObjectLiteral()));

            cache.nodes = {
                translation_map: variable_map,
                translation_map_init: variable_map
            };

            //ts.createVariableDeclarationList([ts.createVariableDeclaration(variable_name)], ts.NodeFlags.Let)
            extra_nodes.push(inline_if);
        }
    }

    const generated_names: { name: string, node: ts.Node }[] = [];
    cache.name_generator = (config, node, message) => {
        const characters = "0123456789_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let name = "";
        while(name.length < 8) {
            const char = characters[Math.floor(Math.random() * characters.length)];
            name = name + char;
            if(name[0] >= '0' && name[0] <= '9')
                name = name.substr(1) || "";
        }

        //FIXME
        //if(generated_names.indexOf(name) != -1)
        //    return cache.name_generator(config, node, message);

        generated_names.push({name: name, node: node});
        return name;
    };

    function visit(node: ts.Node): ts.Node {
        node = ts.visitEachChild(node, visit, context);
        return replace_processor(config, cache, node);
    }
    node = ts.visitNode(node, visit);
    extra_nodes.push(...create_unique_check(node, cache.nodes.translation_map_init, generated_names));

    node = ts.updateSourceFileNode(node, [...(extra_nodes as any[]), ...node.statements], node.isDeclarationFile, node.referencedFiles, node.typeReferenceDirectives, node.hasNoDefaultLib, node.referencedFiles);

    const result: TransformResult = {} as any;
    result.node = node;
    result.translations = cache.translations;
    return result;
}

export function replace_processor(config: Configuration, cache: VolatileTransformConfig, node: ts.Node) : ts.Node {
    if(config.verbose)
        console.log("Process %s", SyntaxKind[node.kind]);
    if(ts.isCallExpression(node)) {
        const call = <ts.CallExpression>node;
        const call_name = call.expression["escapedText"] as string;
        if(call_name != "tr") return node;

        if(config.verbose) {
            console.dir(call_name);
            console.log("Parameters: %o", call.arguments.length);
        }
        if(call.arguments.length > 1) {
            report(call, "Invalid argument count");
            return node;
        }

        const object = <ts.StringLiteral>call.arguments[0];
        if(object.kind != SyntaxKind.StringLiteral) {
            report(call, "Invalid argument: " + SyntaxKind[object.kind]);
            return node;
        }

        if(config.verbose)
            console.log("Message: %o", object.text || object.getText());

        const variable_name = ts.createIdentifier(cache.name_generator(config, node, object.text || object.getText()));
        const variable_init = ts.createPropertyAccess(cache.nodes.translation_map_init, variable_name);

        const variable = ts.createPropertyAccess(cache.nodes.translation_map, variable_name);
        const new_variable = ts.createAssignment(variable, call);

        const source_file = node.getSourceFile();
        let { line, character } = source_file ? source_file.getLineAndCharacterOfPosition(node.getStart()) : {line: -1, character: -1};

        cache.translations.push({
            message: object.text || object.getText(),
            line: line,
            character: character,
            filename: (source_file || {fileName: "unknown"}).fileName
        });

        return ts.createBinary(variable_init, ts.SyntaxKind.BarBarToken, new_variable);
    }
    return node;
}

export interface TranslationEntry {
    filename: string;
    line: number;
    character: number;

    message: string;
}

export interface Configuration {
    use_window?: boolean;
    replace_cache?: boolean;
    verbose?: boolean;
}

export interface TransformResult {
    node: ts.SourceFile;
    translations: TranslationEntry[];
}

interface VolatileTransformConfig {
    nodes: {
        translation_map: ts.Expression;
        translation_map_init: ts.Expression;
    };

    name_generator: (config: Configuration, node: ts.Node, message: string) => string;
    translations: TranslationEntry[];
}