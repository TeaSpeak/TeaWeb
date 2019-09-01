import * as ts from "typescript";
import {SyntaxKind} from "typescript";

interface Array<T> {
    last?(): T;
}

if (!(<any>Array).prototype.last){
    (<any>Array).prototype.last = function(){
        if(this.length == 0) return undefined;
        return this[this.length - 1];
    };
}

function has_modifier<T extends ts.Modifier["kind"]>(modifiers: ts.ModifiersArray | undefined, target: T) : boolean {
    if(modifiers) {
        for(const modifier of modifiers)
            if(modifier.kind == target)
                return true;
    }
    return false;
}

function append_modifier<T extends ts.Modifier["kind"]>(modifiers: ts.ModifiersArray | undefined, target: T) : ts.ModifiersArray {
    if(has_modifier(modifiers, target)) return modifiers;

    return ts.createNodeArray(
        [ts.createModifier(target as number), ...(modifiers || [])].map((e, index, array) => {
            const range = ts.getCommentRange(e);
            if(range.end === -1 && range.pos === -1)
                return e;
            ts.setCommentRange(e, {pos: -1, end: -1});

            const first_range = ts.getCommentRange(array[0]);
            if(first_range.end === -1 && first_range.pos === -1)
                ts.setCommentRange(array[0], range);
            else
                console.warn("Dropping comment on node because first node already has a comment");
            return e;
        }),
        (modifiers || {hasTrailingComma: false}).hasTrailingComma
    );
}

//TODO: Transfer comments?
function remove_modifier<T extends ts.Modifier["kind"]>(modifiers: ts.ModifiersArray | undefined, target: T) : ts.ModifiersArray {
    if(!has_modifier(modifiers, target)) return modifiers;

    const new_modifiers: ts.Modifier[] = [];
    for(const modifier of (modifiers || []))
        if(modifier.kind != target)
            new_modifiers.push(modifier);

    return new_modifiers.length == 0 ? undefined : ts.createNodeArray(new_modifiers, (modifiers || {hasTrailingComma: false}).hasTrailingComma);
}

const has_declare = (modifiers?: ts.ModifiersArray) => has_modifier(modifiers, SyntaxKind.DeclareKeyword);
const has_private = (modifiers?: ts.ModifiersArray) => has_modifier(modifiers, SyntaxKind.PrivateKeyword);
const append_declare = (modifiers?: ts.ModifiersArray, flag: boolean = true) => flag ? append_modifier(modifiers, SyntaxKind.DeclareKeyword) : remove_modifier(modifiers, SyntaxKind.DeclareKeyword);
const append_export = (modifiers?: ts.ModifiersArray, flag: boolean = true) => flag ? append_modifier(modifiers, SyntaxKind.ExportKeyword) : remove_modifier(modifiers, SyntaxKind.ExportKeyword);

interface StackParameter {
    flag_declare: boolean,
    flag_namespace: boolean
    flag_class: boolean;
}

class StackParameters implements StackParameter {
    flag_declare: boolean = false;
    flag_namespace: boolean = false;
    flag_class: boolean = false;

    stack: StackParameter[] = [];

    recalculate() {
        {
            this.flag_declare = false;
            for(const layer of this.stack) {
                if(layer.flag_declare) {
                    this.flag_declare = true;
                    break;
                }
            }
        }
        {
            this.flag_namespace = false;
            for(const layer of this.stack) {
                if(layer.flag_namespace) {
                    this.flag_namespace = true;
                    break;
                }
            }
        }
        {
            this.flag_class = false;
            for(const layer of this.stack) {
                if(layer.flag_class) {
                    this.flag_class = true;
                    break;
                }
            }
        }
    }

    push(layer: StackParameter) {
        this.stack.push(layer);
        this.recalculate();
    }

    pop?() : StackParameter {
        const result = this.stack.pop();
        if(result)
            this.recalculate();
        return result;
    }
}


const generators: {[key: number]:((settings: _Settings, stack: StackParameters, node: ts.Node) => ts.Node | undefined) | undefined} = {};

function _generate(settings: _Settings, stack: StackParameters, layer: ts.Node[], node: ts.Node) {
    //console.log(SyntaxKind[node.kind]);
    if(generators[node.kind]) {
        const result = generators[node.kind](settings, stack, node);
        if(result)
            layer.push(result);
        return;
    }

    switch(node.kind) {
        case SyntaxKind.Identifier:
            console.log("Unknown identifier %s", (<ts.Identifier>node).text);
            break;
        case SyntaxKind.SourceFile: /* yeah we have something */
            node.forEachChild(n => _generate(settings, stack, layer, n));
            break;
        case SyntaxKind.EndOfFileToken: /* oh no, we're at the end */
            break;
        default:
            //node.forEachChild(n => _generate(settings, stack, layer, n));
            const sf = node.getSourceFile();
            let { line, character } = sf ? sf.getLineAndCharacterOfPosition(node.getStart()) : {line: -1, character: -1};
            console.log(`${(sf || {fileName: "unknown"}).fileName} (${line + 1},${character + 1}): Unhandled type %s`, SyntaxKind[node.kind]);
    }
}

export interface Settings {
    remove_private?: {
        field?: boolean;
        method?: boolean;
    } | boolean;

    log?: {
        unhandled_types: boolean;
    } | boolean;
}

class _Settings implements Settings {
    remove_private: {
        field: boolean;
        method: boolean;
    } = {
        field: false,
        method: false
    };

    log?: {
        unhandled_types: boolean;
    } = {
        unhandled_types: false
    }
}

function specify_settings(settings?: Settings) : _Settings {
    const result: _Settings = new _Settings();
    Object.assign(result, settings);
    if(!settings)
        settings = {};

    if(typeof(settings.remove_private) === "boolean")
        result.remove_private = {
            field: settings.remove_private,
            method: settings.remove_private
        };

    if(typeof(settings.log) === "boolean")
        result.log = {
            unhandled_types: settings.log,
        };

    return result;
}

export function generate(file: ts.SourceFile, settings?: Settings) : ts.Node[]{
    const layer: ts.Node[] = [];
    const stack = new StackParameters();
    const _settings = specify_settings(settings);

    _generate(_settings, stack, layer, file);

    return layer;
}

export function print(source: ts.SourceFile, nodes: ts.Node[]) : string {
    const printer = ts.createPrinter({
        newLine: ts.NewLineKind.LineFeed
    });

    return printer.printList(
        ts.ListFormat.SpaceBetweenBraces | ts.ListFormat.MultiLine | ts.ListFormat.PreferNewLine,
        nodes as any,
        source
    );
}

/* generator impl */
generators[SyntaxKind.ModuleBlock] = (settings, stack, node: ts.ModuleBlock) => {
    const layer = [] as ts.Node[];
    node.forEachChild(n => _generate(settings, stack, layer, n));
    return ts.createModuleBlock(layer as any);
};

generators[SyntaxKind.ModuleDeclaration] = (settings, stack, node: ts.ModuleDeclaration) => {
    switch (node.flags) {
        case ts.NodeFlags.Namespace:
            break;
        default:
        //throw "flag " + node.flags + " isn't supported yet!"; /* TODO wrap with more info */
    }


    stack.push({
        flag_declare: true,
        flag_namespace: true,
        flag_class: false
    });
    const body = generators[node.body.kind](settings, stack, node.body) as ts.ModuleBlock;
    stack.pop();

    return ts.createModuleDeclaration(node.decorators, append_declare(node.modifiers, !stack.flag_declare), node.name, body, node.flags);
};


const _generate_param_declare = (settings, stack, params: ts.NodeArray<ts.ParameterDeclaration>) => {
    const parms: any[] = [];
    for(const parm of params)
        parms.push(generators[parm.kind](settings, stack, parm));
    return parms;
};

/* functions */
generators[SyntaxKind.Parameter] = (settings, stack, node: ts.ParameterDeclaration) => {
    return ts.createParameter(node.decorators, node.modifiers, node.dotDotDotToken, node.name, node.questionToken || (node.initializer ? ts.createToken(SyntaxKind.QuestionToken) : undefined), node.type, undefined);
};

generators[SyntaxKind.Constructor] = (settings, stack, node: ts.ConstructorDeclaration) => {
    if(settings.remove_private.method && has_private(node.modifiers)) return;

    return ts.createConstructor(node.decorators, node.modifiers, _generate_param_declare(settings, stack, node.parameters), undefined);
};

generators[SyntaxKind.FunctionDeclaration] = (settings, stack, node: ts.FunctionDeclaration) => {
    if(stack.flag_namespace && !has_modifier(node.modifiers, SyntaxKind.ExportKeyword)) return;

    let return_type = node.type;
    if(has_modifier(node.modifiers, SyntaxKind.AsyncKeyword)) {
        if(!return_type)
            return_type = ts.createTypeReferenceNode("Promise", [ts.createIdentifier("any") as any]);
    }

    return ts.createFunctionDeclaration(node.decorators, remove_modifier(append_declare(node.modifiers, !stack.flag_declare), SyntaxKind.AsyncKeyword), node.asteriskToken, node.name, node.typeParameters, _generate_param_declare(settings, stack, node.parameters), return_type, undefined);
};


generators[SyntaxKind.MethodDeclaration] = (settings, stack, node: ts.MethodDeclaration) => {
    if(settings.remove_private.method && has_private(node.modifiers)) return;

    return ts.createMethod(node.decorators, remove_modifier(node.modifiers, SyntaxKind.AsyncKeyword), node.asteriskToken, node.name, node.questionToken, node.typeParameters, _generate_param_declare(settings, stack, node.parameters), node.type, undefined);
};

generators[SyntaxKind.GetAccessor] = (settings, stack, node: ts.GetAccessorDeclaration) => {
    if(settings.remove_private.method && has_private(node.modifiers)) return;

    node = ts.createGetAccessor(node.decorators, node.modifiers, node.name, _generate_param_declare(settings, stack, node.parameters), node.type, undefined);
    return ts.addSyntheticLeadingComment(node, SyntaxKind.SingleLineCommentTrivia, " @ts-ignore", true);
};
generators[SyntaxKind.SetAccessor] = (settings, stack, node: ts.SetAccessorDeclaration) => {
    if(settings.remove_private.method && has_private(node.modifiers)) return;
    node = ts.createSetAccessor(node.decorators, node.modifiers, node.name, _generate_param_declare(settings, stack, node.parameters), undefined);
    return ts.addSyntheticLeadingComment(node, SyntaxKind.SingleLineCommentTrivia, " @ts-ignore", true);
};

/* variables or properties */
generators[SyntaxKind.PropertyDeclaration] = (settings, stack, node: ts.PropertyDeclaration) => {
    if(settings.remove_private.field && has_private(node.modifiers)) return;

    return ts.createProperty(node.decorators, append_declare(node.modifiers, !stack.flag_declare), node.name, node.questionToken, node.type, undefined);
};

/* class types */
generators[SyntaxKind.ClassDeclaration] = (settings, stack, node: ts.ClassDeclaration) => {
    const members = [] as ts.Node[];
    {
        stack.push({
            flag_declare: true,
            flag_namespace: false,
            flag_class: true
        });

        node.forEachChild(n => {
            if(n.kind == SyntaxKind.Identifier) return; /* class identifier */
            if(ts.isModifier(n)) return; /* we have already class modifiers */

            _generate(settings, stack, members, n)
        });
        stack.pop();
    }

    /*
    members.sort((a, b) => {
        if(a.kind > b.kind) return 1;
        if(a.kind < b.kind) return -1;

        if(a.kind == SyntaxKind.FunctionDeclaration)
            return (<ts.FunctionDeclaration>b).name.escapedText.toString().localeCompare((<ts.FunctionDeclaration>a).name.escapedText.toString());

        return 0;
    });
    */

    return ts.createClassDeclaration(node.decorators, append_export(append_declare(node.modifiers, !stack.flag_declare), stack.flag_namespace), node.name, node.typeParameters, node.heritageClauses, members as any);
};

generators[SyntaxKind.PropertySignature] = (settings, stack, node: ts.PropertySignature) => {
    if(!node.type)
        return node;

    let type: ts.TypeNode = node.type;
    switch (node.type.kind) {
        case SyntaxKind.LiteralType:
            type = ts.createIdentifier("any") as any;
    }

    return ts.createPropertySignature(node.modifiers, node.name, node.questionToken, type, undefined);
};

generators[SyntaxKind.InterfaceDeclaration] = (settings, stack, node: ts.InterfaceDeclaration) => {
    if(settings.remove_private.field && has_private(node.modifiers)) return;
    if(stack.flag_namespace && !has_modifier(node.modifiers, SyntaxKind.ExportKeyword)) return;

    const members: any[] = [];
    for(const member of node.members) {
        if(generators[member.kind])
            members.push(generators[member.kind](settings, stack, member));
        else
            members.push(member);
    }

    return ts.createInterfaceDeclaration(undefined, append_export(append_declare(node.modifiers, !stack.flag_declare), stack.flag_namespace), node.name, node.typeParameters, node.heritageClauses, members);
};

generators[SyntaxKind.VariableDeclaration] = (settings, stack, node: ts.VariableDeclaration) => {
    return ts.createVariableDeclaration(node.name, node.type, undefined);
};

generators[SyntaxKind.VariableDeclarationList] = (settings, stack, node: ts.VariableDeclarationList) => {
    const decls: any[] = [];
    for(const decl of node.declarations)
        decls.push(generators[SyntaxKind.VariableDeclaration](settings, stack, decl) as any);
    return ts.createVariableDeclarationList(decls, node.flags);
};

generators[SyntaxKind.VariableStatement] = (settings, stack, node: ts.VariableStatement) => {
    if(settings.remove_private.field && has_private(node.modifiers)) return;

    if(stack.flag_class) {

    } else if(stack.flag_namespace) {
        if(!has_modifier(node.modifiers, SyntaxKind.ExportKeyword)) return;
    }

    return ts.createVariableStatement(append_declare(node.modifiers, !stack.flag_declare), generators[node.declarationList.kind](settings, stack, node.declarationList) as any);
};

generators[SyntaxKind.TypeAliasDeclaration] = (settings, stack, node: ts.TypeAliasDeclaration) => {
    if(stack.flag_namespace && !has_modifier(node.modifiers, SyntaxKind.ExportKeyword)) return;

    let type = node.type;
    if(type.kind == SyntaxKind.UnionType) {
        const union_members = [];
        const union = <ts.UnionTypeNode>node.type;

        for(const element of union.types as any as any[]) {
            union_members.push(element);
        }

        type = ts.createUnionTypeNode(union_members);
    }

    return ts.createTypeAliasDeclaration(node.decorators, append_declare(node.modifiers, !stack.flag_declare), node.name, node.typeParameters, type);
};

generators[SyntaxKind.EnumMember] = (settings, stack, node: ts.EnumMember) => {
    return ts.createEnumMember(node.name, node.initializer);
};

generators[SyntaxKind.EnumDeclaration] = (settings, stack, node: ts.EnumDeclaration) => {
    const members: any[] = [];
    for(const member of node.members)
        members.push(generators[SyntaxKind.EnumMember](settings, stack, member));
    return ts.createEnumDeclaration(undefined, append_export(append_declare(node.modifiers, !stack.flag_declare), stack.flag_namespace), node.name, members);
};

generators[SyntaxKind.HeritageClause] = (settings, stack, node: ts.HeritageClause) => {
    return undefined;
};

/* every variable in a block has no global scope! */
generators[SyntaxKind.Block] = (settings, stack, node: ts.Block) => {
    return undefined;
};

generators[SyntaxKind.IfStatement] = (settings, stack, node: ts.IfStatement) => {
    return undefined;
};

/* Example for an ExpressionStatement would be: Modul["text"] = "XXX"; */
generators[SyntaxKind.ExpressionStatement] = (settings, stack, node: ts.ExpressionStatement) => {
    return undefined;
};

generators[SyntaxKind.SemicolonClassElement] = (settings, stack, node: ts.ExpressionStatement) => {
    return undefined;
};