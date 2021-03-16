import * as ts from "typescript";
import {SyntaxKind} from "typescript";
import sha256 from "sha256";
import {TranslationEntry} from "./generator";

export function generate(file: ts.SourceFile, config: Configuration) : TranslationEntry[] {
    let result: TranslationEntry[] = [];

    file.forEachChild(n => _generate(config, n, result));

    return result;
}

const source_location = (node: ts.Node) => {
    const sf = node.getSourceFile();
    let { line, character } = sf ? sf.getLineAndCharacterOfPosition(node.getStart()) : {line: -1, character: -1};
    return `${(sf || {fileName: "unknown"}).fileName} (${line + 1},${character + 1})`;
};

function report(node: ts.Node, message: string) {
    console.log(`${source_location(node)}: ${message}`);
}

function _generate(config: Configuration, node: ts.Node, result: TranslationEntry[]) {
    //console.log("Node: %s", SyntaxKind[node.kind]);

    call_analize:
    if(ts.isCallExpression(node)) {
        const call = node as ts.CallExpression;
        const call_name = call.expression["escapedText"] as string;

        if(call_name != "tr") {
            break call_analize;
        }

        console.dir(call_name);
        console.log("Parameters: %o", call.arguments.length);
        if(call.arguments.length > 1) {
            report(call, "Invalid argument count");
            break call_analize;
        }

        const object = <ts.StringLiteral>call.arguments[0];
        if(object.kind != SyntaxKind.StringLiteral) {
            report(call, "Invalid argument: " + SyntaxKind[object.kind]);
            break call_analize;
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
            message: object.text,
            type: "call"
        });
    } else if(node.kind === SyntaxKind.JsxElement) {
        const element = node as ts.JsxElement;
        const tag = element.openingElement.tagName as ts.Identifier;

        if(tag.kind !== SyntaxKind.Identifier)
            break call_analize;

        if(tag.escapedText === "Translatable") {
            if(element.children.length !== 1) {
                report(element, "Invalid child count: " + element.children.length);
                break call_analize;
            }

            const text = element.children[0] as ts.JsxText;
            if(text.kind != SyntaxKind.JsxText) {
                report(element, "Invalid child type " + SyntaxKind[text.kind]);
                break call_analize;
            }

            const { line, character } = node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());
            result.push({
                filename: node.getSourceFile().fileName,
                line: line,
                character: character,
                message: text.text,
                type: "jsx-translatable"
            });
        } else if(tag.escapedText === "VariadicTranslatable") {

        }
    }

    node.forEachChild(n => _generate(config, n, result));
}
function generateUniqueCheck(config: Configuration, source_file: ts.SourceFile, variable: ts.Expression, variables: { name: string, node: ts.Node }[]) : ts.Node[] {
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
        const declarations = ts.createElementAccess(variable, ts.createLiteral(config.variables.declarations));
        nodes.push(ts.createAssignment(declarations, ts.createBinary(declarations, SyntaxKind.BarBarToken, ts.createAssignment(declarations, ts.createObjectLiteral()))));

        declarations_file = ts.createElementAccess(variable, ts.createLiteral(config.variables.declare_files));
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
            elements.push(ts.createCall(console, [], [ts.createLiteral("This file has already been loaded!\nAre you executing scripts twice?") as any]) as any);
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
                ts.createBindingElement(undefined, config.optimized ? "n": "name", for_variable_name, undefined),
                ts.createBindingElement(undefined, config.optimized ? "p": "path", for_variable_path, undefined)])
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
                    ts.createPropertyAssignment(config.optimized ? "n": "name", ts.createLiteral(e.name)),
                    ts.createPropertyAssignment(config.optimized ? "p": "path", ts.createLiteral(node_path(e.node)))
                    ]))
                ])
            , for_block);
        block = ts.addSyntheticLeadingComment(block, SyntaxKind.MultiLineCommentTrivia, "Auto generated helper for testing if the translation keys are unique", true);
        blocked_nodes.push(block);
    }
    return [...nodes, ts.createLabel(unique_check_label_name, ts.createBlock(blocked_nodes))];
}

let globalIdIndex = 0, globalIdTimestamp = Date.now();
export function transform(config: Configuration, context: ts.TransformationContext, source_file: ts.SourceFile) : TransformResult {
    const cache: VolatileTransformConfig = {} as any;
    cache.translations = [];

    config.variables = (config.variables || {}) as any;
    config.variables.base = config.variables.base || (config.optimized ? "__tr" : "_translations");
    config.variables.declare_files = config.variables.declare_files || (config.optimized ? "f" : "declare_files");
    config.variables.declarations = config.variables.declarations || (config.optimized ? "d" : "definitions");

    //Initialize nodes
    const extra_nodes: ts.Node[] = [];
    {
        cache.nodes = {} as any;
        if(config.use_window) {
            const window = ts.createIdentifier("window");
            let translation_map = ts.createPropertyAccess(window, ts.createIdentifier(config.variables.base));
            const new_translations = ts.createAssignment(translation_map, ts.createObjectLiteral());

            let translation_map_init: ts.Expression = ts.createBinary(translation_map, ts.SyntaxKind.BarBarToken, new_translations);
            translation_map_init = ts.createParen(translation_map_init);

            extra_nodes.push(translation_map_init);
            cache.nodes = {
                translation_map: translation_map
            };
        } else if(config.module) {
            cache.nodes = {
                translation_map: ts.createIdentifier(config.variables.base)
            };

            extra_nodes.push(ts.createVariableDeclarationList([
                ts.createVariableDeclaration(config.variables.base, undefined, ts.createObjectLiteral())
            ], ts.NodeFlags.Const), ts.createToken(SyntaxKind.SemicolonToken));
        } else {
            const variable_map = ts.createIdentifier(config.variables.base);
            const inline_if = ts.createBinary(ts.createBinary(ts.createTypeOf(variable_map), SyntaxKind.ExclamationEqualsEqualsToken, ts.createLiteral("undefined")), ts.SyntaxKind.BarBarToken, ts.createAssignment(variable_map, ts.createObjectLiteral()));

            cache.nodes = {
                translation_map: variable_map,
            };

            extra_nodes.push(inline_if);
        }
    }

    const generated_names: { name: string, node: ts.Node }[] = [];
    let generator_base = 0;

    const generate_unique_name = config => {
        if(config.module) {
            return "_" + generator_base++;
        } else {
            return "_" + globalIdTimestamp + "-" + ++globalIdIndex;
        }
    };

    cache.name_generator = (config, node, message) => {
        const name = generate_unique_name(config);
        generated_names.push({name: name, node: node});
        return name;
    };

    cache.tsx_name_generator = generate_unique_name;

    function visit(node: ts.Node): ts.Node {
        node = ts.visitEachChild(node, visit, context);
        return replace_processor(config, cache, node, source_file);
    }
    source_file = ts.visitNode(source_file, visit);
    if(!config.module) {
        /* we don't need a unique check because we're just in our scope */
        extra_nodes.push(...generateUniqueCheck(config, source_file, cache.nodes.translation_map, generated_names));
    }

    source_file = ts.updateSourceFileNode(source_file, [...(extra_nodes as any[]), ...source_file.statements], source_file.isDeclarationFile, source_file.referencedFiles, source_file.typeReferenceDirectives, source_file.hasNoDefaultLib, source_file.referencedFiles);

    const result: TransformResult = {} as any;
    result.node = source_file;
    result.translations = cache.translations;
    return result;
}

const generate_jsx_cache_key = (cache: VolatileTransformConfig, config: Configuration, element: ts.JsxElement) => ts.updateJsxElement(
    element,
    ts.updateJsxOpeningElement(
        element.openingElement,
        element.openingElement.tagName,
        element.openingElement.typeArguments,
        ts.updateJsxAttributes(element.openingElement.attributes, [
            ...element.openingElement.attributes.properties,
            ts.createJsxAttribute(ts.createIdentifier("__cacheKey"), ts.createStringLiteral(cache.tsx_name_generator(config)))
        ])
    ),
    element.children,
    element.closingElement
);

export function replace_processor(config: Configuration, cache: VolatileTransformConfig, node: ts.Node, source_file: ts.SourceFile) : ts.Node {
    if(config.verbose)
        console.log("Process %s", SyntaxKind[node.kind]);

    if(!node.getSourceFile())
        return node;

    if(ts.isCallExpression(node)) {
        const call = <ts.CallExpression>node;
        const call_name = call.expression["escapedText"] as string;
        if(call_name != "tr") return node;
        if(config.verbose) {
            console.dir(call_name);
            console.log("Parameters: %o", call.arguments.length);
        }

        if(call.arguments.length > 1)
            throw new Error(source_location(call) + ": tr(...) has been called with an invalid arguments (" +  (call.arguments.length === 0 ? "too few" : "too many") + ")");

        const fullText = call.getFullText(source_file);
        if(fullText && fullText.indexOf("@tr-ignore") !== -1)
            return node;

        const object = <ts.StringLiteral>call.arguments[0];
        if(object.kind != SyntaxKind.StringLiteral) {
            if(call.getSourceFile())
                throw new Error(source_location(call) + ": Ignoring tr call because given argument isn't of type string literal. (" + SyntaxKind[object.kind] + ")");
            report(call, "Ignoring tr call because given argument isn't of type string literal. (" + SyntaxKind[object.kind] + ")");
        }

        if(config.verbose)
            console.log("Message: %o", object.text || object.getText(source_file));

        const variable_name = ts.createIdentifier(cache.name_generator(config, node, object.text || object.getText(source_file)));
        const variable_init = ts.createPropertyAccess(cache.nodes.translation_map, variable_name);

        const variable = ts.createPropertyAccess(cache.nodes.translation_map, variable_name);
        const new_variable = ts.createAssignment(variable, call);

        let { line, character } = source_file.getLineAndCharacterOfPosition(node.getStart());

        cache.translations.push({
            message: object.text || object.getText(source_file),
            line: line,
            character: character,
            filename: (source_file || {fileName: "unknown"}).fileName,
            type: "call"
        });

        return ts.createBinary(variable_init, ts.SyntaxKind.BarBarToken, new_variable);
    } else if(node.kind === SyntaxKind.JsxElement) {
        const element = node as ts.JsxElement;
        const tag = element.openingElement.tagName as ts.Identifier;

        if(tag.kind !== SyntaxKind.Identifier)
            return node;

        const properties = {} as any;

        element.openingElement.attributes.properties.forEach((e: ts.JsxAttribute) => {
            if(e.kind !== SyntaxKind.JsxAttribute)
                throw new Error(source_location(e) + ": Invalid jsx attribute kind " + SyntaxKind[e.kind]);

            if(e.name.kind !== SyntaxKind.Identifier)
                throw new Error(source_location(e) + ": Key isn't an identifier");

            properties[e.name.escapedText as string] = e.initializer;
        });

        if(tag.escapedText === "Translatable") {
            if('trIgnore' in properties && properties.trIgnore.kind === SyntaxKind.JsxExpression) {
                const ignoreAttribute = properties.trIgnore as ts.JsxExpression;
                if(ignoreAttribute.expression.kind === SyntaxKind.TrueKeyword)
                    return node;
                else if(ignoreAttribute.expression.kind !== SyntaxKind.FalseKeyword)
                    throw new Error(source_location(ignoreAttribute) + ": Invalid attribute value of type " + SyntaxKind[ignoreAttribute.expression.kind]);
            }

            if(element.children.length < 1) {
                throw new Error(source_location(element) + ": Element has been called with an invalid arguments (too few)");
            }

            let text = element.children.map(element => {
                if(element.kind === SyntaxKind.JsxText) {
                    return element.text;
                } else if(element.kind === SyntaxKind.JsxSelfClosingElement) {
                    if(element.tagName.kind !== SyntaxKind.Identifier) {
                        throw new Error(source_location(element.tagName) + ": Expected a JsxSelfClosingElement, but received " + SyntaxKind[element.tagName.kind]);
                    }

                    if(element.tagName.escapedText !== "br") {
                        throw new Error(source_location(element.tagName) + ": Expected a br element, but received " + element.tagName.escapedText);
                    }

                    return "\n";
                }
            }).join("");

            let { line, character } = source_file.getLineAndCharacterOfPosition(node.getStart());
            cache.translations.push({
                message: text,
                line: line,
                character: character,
                filename: (source_file || {fileName: "unknown"}).fileName,
                type: "jsx-translatable"
            });

            return generate_jsx_cache_key(cache, config, element);
        } else if(tag.escapedText === "VariadicTranslatable") {
            if(!('text' in properties))
                throw new Error(source_location(element) + ": Missing text to translate");

            const textAttribute = properties["text"] as ts.JsxExpression;
            if(textAttribute.kind !== SyntaxKind.JsxExpression)
                throw new Error(source_location(element) + ": Text attribute has an invalid type. Expected JsxExpression but received " + SyntaxKind[textAttribute.kind]);

            if(textAttribute.expression.kind !== SyntaxKind.StringLiteral)
                throw new Error(source_location(element) + ": Text attribute value isn't a string literal. Expected StringLiteral but received " + SyntaxKind[textAttribute.expression.kind]);

            const literal = textAttribute.expression as ts.StringLiteral;

            let { line, character } = source_file.getLineAndCharacterOfPosition(node.getStart());
            cache.translations.push({
                message: literal.text,
                line: line,
                character: character,
                filename: (source_file || {fileName: "unknown"}).fileName,
                type: "jsx-variadic-translatable"
            });

            return generate_jsx_cache_key(cache, config, element);
        }
    }

    return node;
}
export interface Configuration {
    use_window?: boolean;
    replace_cache?: boolean;
    verbose?: boolean;

    optimized?: boolean;
    module?: boolean;

    variables?: {
        base: string,
        declarations: string,
        declare_files: string
    }
}

export interface TransformResult {
    node: ts.SourceFile;
    translations: TranslationEntry[];
}

interface VolatileTransformConfig {
    nodes: {
        translation_map: ts.Expression;
    };

    name_generator: (config: Configuration, node: ts.Node, message: string) => string;
    tsx_name_generator: (config: Configuration) => string;
    translations: TranslationEntry[];
}