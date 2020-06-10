import * as ts from "typescript";
import {SyntaxKind} from "typescript";

interface RequiredType {
    identifier: string;
}

class ImportsParserData {
    readonly source_file: ts.SourceFile;
    required_type: RequiredType[];
    depth: number;

    constructor(sf: ts.SourceFile) {
        this.source_file = sf;
        this.required_type = [];
        this.depth = 0;
    }

    has_type(name: string) {
        return this.required_type.findIndex(e => e.identifier === name) !== -1;
    }
}

export function remove_unused(source_file: ts.SourceFile, nodes: ts.Node[]) : ts.Node[] {
    const data = new ImportsParserData(source_file);

    for(const node of nodes)
        gather_required_types(node, data);

    //console.log(data.required_type);
    const result2d = nodes.map(e => ts.transform(e, [ctx => node => eliminate_imports(node, ctx, data)])).map(e => e.transformed);
    const result = [];
    for(const entry of result2d)
        result.push(...entry);
    return result;
}

function eliminate_imports(node: ts.Node, ctx: ts.TransformationContext, data: ImportsParserData) : ts.Node | undefined {
    switch (node.kind) {
        case SyntaxKind.ImportDeclaration:
            const import_decl = node as ts.ImportDeclaration;
            const clause = import_decl.importClause;
            if(!clause.namedBindings) return node;

            let new_binding;
            if(clause.namedBindings.kind === SyntaxKind.NamedImports) {
                const bindings = clause.namedBindings as ts.NamedImports;
                const elements = bindings.elements.filter(e => data.has_type(e.name.text));
                if(!elements.length) return ts.createIdentifier("");

                new_binding = ts.createNamedImports(elements);
            } else if(clause.namedBindings.kind === SyntaxKind.NamespaceImport) {
                const binding = clause.namedBindings as ts.NamespaceImport;
                if(!data.has_type(binding.name.text))
                    return ts.createIdentifier("");
                new_binding = binding;
            } else
                throw "unknown named binding";

            return ts.createImportDeclaration(import_decl.decorators, import_decl.modifiers, new_binding, import_decl.moduleSpecifier);
        default:
            return ts.visitEachChild(node, e => eliminate_imports(e, ctx, data), ctx);
    }
}

const import_parsers: {[key: number]:(node: ts.Node, data: ImportsParserData) => void} = {};
function gather_required_types(node: ts.Node, data: ImportsParserData) {
    if(!node) return;
    //console.log("%d %s", data.depth, SyntaxKind[node.kind]);

    if(import_parsers[node.kind]) {
        import_parsers[node.kind](node, data);
        return;
    }

    data.depth++;
    node.forEachChild(e => gather_required_types(e, data));
    data.depth--;
}


import_parsers[SyntaxKind.Parameter] = (node: ts.ParameterDeclaration, data) => {
    if(!node.type) return;

    analyze_type_node(node.type, data);
};

import_parsers[SyntaxKind.TypeAliasDeclaration] = (node: ts.TypeAliasDeclaration, data) => {
    (node.typeParameters || []).forEach(e => gather_required_types(e, data));
    if(node.type) analyze_type_node(node.type, data);
    if(node.decorators) node.decorators.forEach(e => analyze_type_node(e.expression, data));
};


import_parsers[SyntaxKind.HeritageClause] = (node: ts.HeritageClause, data) => {
    const heritage = node as ts.HeritageClause;
    for(const type of heritage.types)
        analyze_type_node(type, data);
};

import_parsers[SyntaxKind.TypeParameter] = (node: ts.TypeParameterDeclaration, data) => {
    if(node.constraint) analyze_type_node(node.constraint, data);
    if(node.default) analyze_type_node(node.default, data);
};

import_parsers[SyntaxKind.FunctionDeclaration] = (node: ts.FunctionDeclaration, data) => {
    if(node.type)
        analyze_type_node(node.type, data);
    (node.typeParameters || []).forEach(e => gather_required_types(e, data));
    for(const param of node.parameters)
        gather_required_types(param, data);
};

import_parsers[SyntaxKind.MethodSignature] = (node: ts.MethodSignature, data) => {
    if(node.type)
        analyze_type_node(node.type, data);
    (node.typeParameters || []).forEach(e => gather_required_types(e, data));
    for(const param of node.parameters)
        gather_required_types(param, data);
};

import_parsers[SyntaxKind.ClassDeclaration] = (node: ts.ClassDeclaration, data) => {
    for(const e of node.heritageClauses || [])
        gather_required_types(e, data);

    for(const e of node.typeParameters || [])
        gather_required_types(e, data);

    for(const e of node.members || [])
        gather_required_types(e, data);
};

import_parsers[SyntaxKind.PropertySignature] = (node: ts.PropertySignature, data) => {
    analyze_type_node(node.type, data);
};

import_parsers[SyntaxKind.PropertyDeclaration] = (node: ts.PropertyDeclaration, data) => {
    analyze_type_node(node.type, data);
};

import_parsers[SyntaxKind.MethodDeclaration] = (node: ts.MethodDeclaration, data) => {
    for(const e of node.parameters || [])
        gather_required_types(e, data);
    for(const e of node.typeParameters || [])
        gather_required_types(e, data);
    analyze_type_node(node.type, data);
};

function analyze_type_node(node: ts.TypeNode | ts.LeftHandSideExpression, data: ImportsParserData) {
    if(!node) return;

    //console.log("T: %s", SyntaxKind[node.kind]);
    switch (node.kind) {
        case SyntaxKind.AnyKeyword:
        case SyntaxKind.VoidKeyword:
        case SyntaxKind.ThisType:
        case SyntaxKind.ThisKeyword:
        case SyntaxKind.BooleanKeyword:
        case SyntaxKind.StringKeyword:
        case SyntaxKind.StringLiteral:
        case SyntaxKind.LiteralType:
        case SyntaxKind.NumberKeyword:
        case SyntaxKind.ObjectKeyword:
        case SyntaxKind.NullKeyword:
        case SyntaxKind.NeverKeyword:
        case SyntaxKind.UndefinedKeyword:
            /* no special export type */
            break;

        case SyntaxKind.UnionType:
            const union = node as ts.UnionTypeNode;
            union.types.forEach(e => analyze_type_node(e, data));
            break;

        case SyntaxKind.IntersectionType:
            const intersection = node as ts.IntersectionTypeNode;
            intersection.types.forEach(e => analyze_type_node(e, data));
            break;

        case SyntaxKind.TypeReference:
            const ref = node as ts.TypeReferenceNode;
            if(ref.typeName.kind === SyntaxKind.Identifier) {
                data.required_type.push({
                    identifier: ref.typeName.text
                });
            } else if(ref.typeName.kind === SyntaxKind.QualifiedName) {
                let left: ts.Identifier | ts.QualifiedName = ref.typeName.left;
                while(left.kind !== SyntaxKind.Identifier)
                    left = left.left;
                data.required_type.push({
                    identifier: left.text
                });
            } else
                throw "invalid type name";
            for(const e of ref.typeArguments || [])
                analyze_type_node(e, data);
            break;

        case SyntaxKind.Identifier:
            data.required_type.push({
                identifier: (node as ts.Identifier).text
            });
            break;

        case SyntaxKind.TypeLiteral:
            const lit = node as ts.TypeLiteralNode;
            for(const member of lit.members)
                gather_required_types(member, data);
            break;

        case SyntaxKind.ArrayType:
            const array = node as ts.ArrayTypeNode;
            analyze_type_node(array.elementType, data);
            break;

        case SyntaxKind.FunctionType:
            const fn = node as ts.FunctionTypeNode;
            for(const param of fn.parameters || [])
                gather_required_types(param, data);

            for(const type of fn.typeParameters || [])
                gather_required_types(type, data);
            break;

        case SyntaxKind.TypeOperator:
            const to = node as ts.TypeOperatorNode;
            analyze_type_node(to.type, data);
            break;

        case SyntaxKind.ExpressionWithTypeArguments:
            analyze_type_node((node as ts.ExpressionWithTypeArguments).expression, data);
            break;

        case SyntaxKind.IndexedAccessType:
            const ia = node as ts.IndexedAccessTypeNode;
            analyze_type_node(ia.indexType, data);
            analyze_type_node(ia.objectType, data);
            break;

        case SyntaxKind.ParenthesizedType:
            const parenthesized = node as ts.ParenthesizedTypeNode;
            analyze_type_node(parenthesized.type, data);
            break;

        case SyntaxKind.MappedType:
            const mt = node as ts.MappedTypeNode;
            analyze_type_node(mt.type, data);
            break;

        case SyntaxKind.PropertyAccessExpression:
            let pae = node as ts.PropertyAccessExpression;
            while(pae.expression.kind == SyntaxKind.PropertyAccessExpression)
                pae = pae.expression as ts.PropertyAccessExpression;

            analyze_type_node(pae.expression, data);
            break;

        case SyntaxKind.ConstructorType:
            let ct = node as ts.ConstructorTypeNode;
            analyze_type_node(ct.type, data);
            break;

        default:
            throw "Unknown type " + SyntaxKind[node.kind] + ". Extend me :)";
    }
}
