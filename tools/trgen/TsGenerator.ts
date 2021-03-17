import * as ts from "typescript";
import sha256 from "sha256";
import {SyntaxKind} from "typescript";
import {TranslationEntry} from "./generator";

const getSourceLocation = (node: ts.Node) => {
    const sf = node.getSourceFile();
    let { line, character } = sf ? sf.getLineAndCharacterOfPosition(node.getStart()) : {line: -1, character: -1};
    return `${(sf || {fileName: "unknown"}).fileName} (${line + 1},${character + 1})`;
};

function report(node: ts.Node, message: string) {
    console.log(`${getSourceLocation(node)}: ${message}`);
}

function generateUniqueCheck(config: Configuration, source_file: ts.SourceFile, variable: ts.Expression, variables: { name: string, node: ts.Node }[]) : ts.Node[] {
    const nodes: ts.Node[] = [], blockedNodes: ts.Statement[] = [];

    const nodePath = (node: ts.Node) => {
        const sf = node.getSourceFile();
        let { line, character } = sf ? sf.getLineAndCharacterOfPosition(node.getStart()) : {line: -1, character: -1};
        return `${(sf || {fileName: "unknown"}).fileName} (${line + 1},${character + 1})`;
    };

    const createError = (variable_name: ts.Expression, variable_path: ts.Expression, other_path: ts.Expression) => {
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

    let declarationsFile: ts.Expression;
    const uniqueCheckLabelName = "unique_translation_check";

    /* initialization */
    {
        const declarations = ts.createElementAccess(variable, ts.createLiteral(config.variables.declarations));
        nodes.push(ts.createAssignment(declarations, ts.createBinary(declarations, SyntaxKind.BarBarToken, ts.createAssignment(declarations, ts.createObjectLiteral()))));

        declarationsFile = ts.createElementAccess(variable, ts.createLiteral(config.variables.declareFiles));
        nodes.push(ts.createAssignment(declarationsFile, ts.createBinary(declarationsFile, SyntaxKind.BarBarToken, ts.createAssignment(declarationsFile, ts.createObjectLiteral()))));

        variable = declarations;
    }

    /* test file already loaded */
    {
        const uniqueId = sha256(source_file.fileName + " | " + (Date.now() / 1000));
        const property = ts.createElementAccess(declarationsFile, ts.createLiteral(uniqueId));

        const ifCondition = ts.createBinary(property, SyntaxKind.ExclamationEqualsEqualsToken, ts.createIdentifier("undefined"));
        //
        let ifThen: ts.Block;
        {
            const elements: ts.Statement[] = [];

            const console = ts.createIdentifier("console.warn");
            elements.push(ts.createCall(console, [], [ts.createLiteral("This file has already been loaded!\nAre you executing scripts twice?") as any]) as any);
            elements.push(ts.createBreak(uniqueCheckLabelName));

            ifThen = ts.createBlock(elements);
        }

        const ifElse = ts.createAssignment(property, ts.createLiteral(uniqueId));
        blockedNodes.push(ts.createIf(ifCondition, ifThen, ifElse as any));
    }

    /* test if variable has been defined somewhere else */
    {
        const forVariableName = ts.createLoopVariable();
        const forVariablePath = ts.createLoopVariable();
        const forDeclaration = ts.createVariableDeclarationList([ts.createVariableDeclaration(ts.createObjectBindingPattern([
                ts.createBindingElement(undefined, config.optimized ? "n": "name", forVariableName, undefined),
                ts.createBindingElement(undefined, config.optimized ? "p": "path", forVariablePath, undefined)])
            , undefined, undefined)]);

        let forBlock: ts.Statement;
        { //Create the for block
            const elements: ts.Statement[] = [];


            const property = ts.createElementAccess(variable, forVariableName);
            const ifCondition = ts.createBinary(property, SyntaxKind.ExclamationEqualsEqualsToken, ts.createIdentifier("undefined"));

            //
            const ifThen = ts.createThrow(createError(forVariableName, forVariablePath, property));
            const ifElse = ts.createAssignment(property, forVariablePath);
            const ifValid = ts.createIf(ifCondition, ifThen, ifElse as any);

            elements.push(ifValid);

            forBlock = ts.createBlock(elements);
        }

        let block = ts.createForOf(undefined,
            forDeclaration, ts.createArrayLiteral(
                [...variables.map(e => ts.createObjectLiteral([
                    ts.createPropertyAssignment(config.optimized ? "n": "name", ts.createLiteral(e.name)),
                    ts.createPropertyAssignment(config.optimized ? "p": "path", ts.createLiteral(nodePath(e.node)))
                    ]))
                ])
            , forBlock);
        block = ts.addSyntheticLeadingComment(block, SyntaxKind.MultiLineCommentTrivia, "Auto generated helper for testing if the translation keys are unique", true);
        blockedNodes.push(block);
    }
    return [...nodes, ts.createLabel(uniqueCheckLabelName, ts.createBlock(blockedNodes))];
}

let globalIdIndex = 0, globalIdTimestamp = Date.now();
export function transform(config: Configuration, context: ts.TransformationContext, sourceFile: ts.SourceFile) : TransformResult {
    const cache: VolatileTransformConfig = {} as any;
    cache.translations = [];

    config.variables = (config.variables || {}) as any;
    config.variables.base = config.variables.base || (config.optimized ? "__tr" : "_translations");
    config.variables.declareFiles = config.variables.declareFiles || (config.optimized ? "f" : "declare_files");
    config.variables.declarations = config.variables.declarations || (config.optimized ? "d" : "definitions");

    //Initialize nodes
    const extraNodes = [];
    {
        cache.nodes = {} as any;
        if(config.useWindow) {
            const window = ts.createIdentifier("window");
            const translationMap = ts.createPropertyAccess(window, ts.createIdentifier(config.variables.base));
            const newTranslations = ts.createAssignment(translationMap, ts.createObjectLiteral());

            extraNodes.push(ts.createParen(
                ts.createBinary(translationMap, ts.SyntaxKind.BarBarToken, newTranslations)
            ));

            cache.nodes = {
                translationMap: translationMap
            };
        } else if(config.module) {
            cache.nodes = {
                translationMap: ts.createIdentifier(config.variables.base)
            };

            extraNodes.push((
                ts.createVariableDeclarationList([
                    ts.createVariableDeclaration(config.variables.base, undefined, ts.createObjectLiteral())
                ], ts.NodeFlags.Const)
            ), ts.createToken(SyntaxKind.SemicolonToken));
        } else {
            const variableMap = ts.createIdentifier(config.variables.base);
            const inlineIf = ts.createBinary(
                ts.createBinary(
                    ts.createTypeOf(variableMap),
                    SyntaxKind.ExclamationEqualsEqualsToken,
                    ts.createLiteral("undefined")
                ),
                ts.SyntaxKind.BarBarToken,
                ts.createAssignment(variableMap, ts.createObjectLiteral())
            );

            cache.nodes = {
                translationMap: variableMap,
            };

            extraNodes.push(inlineIf);
        }
    }

    const generatedNames: { name: string, node: ts.Node }[] = [];
    let generatorBase = 0;

    const generateUniqueName = config => {
        if(config.module) {
            return "_" + generatorBase++;
        } else {
            return "_" + globalIdTimestamp + "-" + ++globalIdIndex;
        }
    };

    cache.nameGenerator = (config, node) => {
        const name = generateUniqueName(config);
        generatedNames.push({name: name, node: node});
        return name;
    };

    cache.tsxNameGenerator = generateUniqueName;

    function visit(node: ts.Node): ts.Node {
        node = ts.visitEachChild(node, visit, context);
        return visitNode(config, cache, node, sourceFile);
    }

    sourceFile = ts.visitNode(sourceFile, visit);
    if(!config.module) {
        /* we don't need a unique check because we're just in our scope */
        extraNodes.push(...generateUniqueCheck(config, sourceFile, cache.nodes.translationMap, generatedNames));
    }

    if(!config.cacheTranslations) {
        sourceFile = ts.updateSourceFileNode(sourceFile, [
            ...extraNodes,
            ...sourceFile.statements
        ], sourceFile.isDeclarationFile, sourceFile.referencedFiles, sourceFile.typeReferenceDirectives, sourceFile.hasNoDefaultLib, sourceFile.referencedFiles);
    }

    return {
        node: sourceFile,
        translations: cache.translations
    };
}

const generateJsxCacheKey = (cache: VolatileTransformConfig, config: Configuration, element: ts.JsxElement) => ts.updateJsxElement(
    element,
    ts.updateJsxOpeningElement(
        element.openingElement,
        element.openingElement.tagName,
        element.openingElement.typeArguments,
        ts.updateJsxAttributes(element.openingElement.attributes, [
            ...element.openingElement.attributes.properties,
            ts.createJsxAttribute(ts.createIdentifier("__cacheKey"), ts.createStringLiteral(cache.tsxNameGenerator(config)))
        ])
    ),
    element.children,
    element.closingElement
);

export function visitNode(config: Configuration, cache: VolatileTransformConfig, node: ts.Node, sourceFile: ts.SourceFile) : ts.Node {
    if(config.verbose) {
        console.log("Process %s", SyntaxKind[node.kind]);
    }

    if(!node.getSourceFile()) {
        /* Node is already artificial */
        return node;
    }

    if(ts.isCallExpression(node)) {
        const call = node as ts.CallExpression;
        const callName = call.expression["escapedText"] as string;
        if(callName !== "tr" && callName !== "useTr") {
            return node;
        }

        if(call.arguments.length > 1) {
            throw new Error(getSourceLocation(call) + ": tr(...) has been called with an invalid arguments (" +  (call.arguments.length === 0 ? "too few" : "too many") + ")");
        }

        const fullText = call.getFullText(sourceFile);
        if(fullText && fullText.indexOf("@tr-ignore") !== -1) {
            return node;
        }

        const object = <ts.StringLiteral>call.arguments[0];
        if(object.kind != SyntaxKind.StringLiteral) {
            if(call.getSourceFile()) {
                throw new Error(getSourceLocation(call) + ": Ignoring tr call because given argument isn't of type string literal. (" + SyntaxKind[object.kind] + ")");
            }

            report(call, "Ignoring tr call because given argument isn't of type string literal. (" + SyntaxKind[object.kind] + ")");
        }

        if(config.verbose) {
            console.log("Message: %o", object.text || object.getText(sourceFile));
        }

        let { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        cache.translations.push({
            message: object.text || object.getText(sourceFile),
            line: line,
            character: character,
            filename: sourceFile.fileName,
            type: "call"
        });

        if(!config.cacheTranslations) {
            return node;
        }

        const variableName = ts.createIdentifier(cache.nameGenerator(config, node, object.text || object.getText(sourceFile)));
        const variableInit = ts.createPropertyAccess(cache.nodes.translationMap, variableName);

        const variable = ts.createPropertyAccess(cache.nodes.translationMap, variableName);
        const newVariable = ts.createAssignment(variable, call);

        return ts.createBinary(variableInit, ts.SyntaxKind.BarBarToken, newVariable);
    } else if(node.kind === SyntaxKind.JsxElement) {
        const element = node as ts.JsxElement;
        const tag = element.openingElement.tagName as ts.Identifier;

        if(tag.kind !== SyntaxKind.Identifier) {
            return node;
        }

        const properties: any = {};
        element.openingElement.attributes.properties.forEach((e: ts.JsxAttribute) => {
            if(e.kind !== SyntaxKind.JsxAttribute) {
                throw new Error(getSourceLocation(e) + ": Invalid jsx attribute kind " + SyntaxKind[e.kind]);
            }

            if(e.name.kind !== SyntaxKind.Identifier) {
                throw new Error(getSourceLocation(e) + ": Key isn't an identifier");
            }

            properties[e.name.escapedText as string] = e.initializer;
        });

        if(tag.escapedText === "Translatable") {
            if('trIgnore' in properties && properties.trIgnore.kind === SyntaxKind.JsxExpression) {
                const ignoreAttribute = properties.trIgnore as ts.JsxExpression;
                if(ignoreAttribute.expression.kind === SyntaxKind.TrueKeyword) {
                    return node;
                } else if(ignoreAttribute.expression.kind !== SyntaxKind.FalseKeyword) {
                    throw new Error(getSourceLocation(ignoreAttribute) + ": Invalid attribute value of type " + SyntaxKind[ignoreAttribute.expression.kind]);
                }
            }

            if(element.children.length < 1) {
                throw new Error(getSourceLocation(element) + ": Element has been called with an invalid arguments (too few)");
            }

            let text = element.children.map(element => {
                if(element.kind === SyntaxKind.JsxText) {
                    return element.text;
                } else if(element.kind === SyntaxKind.JsxSelfClosingElement) {
                    if(element.tagName.kind !== SyntaxKind.Identifier) {
                        throw new Error(getSourceLocation(element.tagName) + ": Expected a JsxSelfClosingElement, but received " + SyntaxKind[element.tagName.kind]);
                    }

                    if(element.tagName.escapedText !== "br") {
                        throw new Error(getSourceLocation(element.tagName) + ": Expected a br element, but received " + element.tagName.escapedText);
                    }

                    return "\n";
                }
            }).join("");

            let { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
            cache.translations.push({
                message: text,
                line: line,
                character: character,
                filename: sourceFile.fileName,
                type: "jsx-translatable"
            });

            if(!config.cacheTranslations) {
                return node;
            }

            return generateJsxCacheKey(cache, config, element);
        } else if(tag.escapedText === "VariadicTranslatable") {
            if(!('text' in properties)) {
                throw new Error(getSourceLocation(element) + ": Missing text to translate");
            }

            const textAttribute = properties["text"] as ts.JsxExpression;
            if(textAttribute.kind !== SyntaxKind.JsxExpression) {
                throw new Error(getSourceLocation(element) + ": Text attribute has an invalid type. Expected JsxExpression but received " + SyntaxKind[textAttribute.kind]);
            }

            if(textAttribute.expression.kind !== SyntaxKind.StringLiteral) {
                throw new Error(getSourceLocation(element) + ": Text attribute value isn't a string literal. Expected StringLiteral but received " + SyntaxKind[textAttribute.expression.kind]);
            }

            const literal = textAttribute.expression as ts.StringLiteral;

            let { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
            cache.translations.push({
                message: literal.text,
                line: line,
                character: character,
                filename: sourceFile.fileName,
                type: "jsx-variadic-translatable"
            });

            if(!config.cacheTranslations) {
                return node;
            }

            return generateJsxCacheKey(cache, config, element);
        }
    }

    return node;
}
export interface Configuration {
    useWindow?: boolean;
    cacheTranslations?: boolean;
    verbose?: boolean;

    optimized?: boolean;
    module?: boolean;

    variables?: {
        base: string,
        declarations: string,
        declareFiles: string
    }
}

export interface TransformResult {
    node: ts.SourceFile;
    translations: TranslationEntry[];
}

interface VolatileTransformConfig {
    nodes: {
        translationMap: ts.Expression;
    };

    nameGenerator: (config: Configuration, node: ts.Node, message: string) => string;
    tsxNameGenerator: (config: Configuration) => string;
    translations: TranslationEntry[];
}