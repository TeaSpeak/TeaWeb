import * as ts from "typescript";
import {SyntaxKind} from "typescript";

let has_export;
const visit = (node: ts.Node) => has_export = has_export || (node.modifiers || [] as any).filter(e => e.kind === SyntaxKind.ExportKeyword).length !== 0 || ts.forEachChild(node, visit);

export function fix_declare_global(nodes: ts.Node[]) : ts.Node[] {
    has_export = false;

    // nodes.forEach(visit); /* for a "deep" check */
    nodes.forEach(e => has_export = has_export || (e.modifiers || [] as any).filter(e => e.kind === SyntaxKind.ExportKeyword).length !== 0);
    if(has_export) return nodes;

    return [];
}

SyntaxKind.PlusEqualsToken