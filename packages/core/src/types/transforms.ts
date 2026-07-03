import type * as t from "@babel/types";
import type { NumberObfuscationOperator } from "@skylvi/veyl-config";
import type { BabelNode, BabelNodePath, BabelScope, PropKeyNode } from "./babel.js";
import type { RuntimeHelperOptions } from "./runtime.js";

export interface LiteralObfuscationResult {
    runtimeOptions: RuntimeHelperOptions;
    stringCount: number;
    numberCount: number;
    booleanCount: number;
    booleanNumber: number | null;
    numberOffset: number | null;
    numberOperators: NumberObfuscationOperator[];
}

export interface UnnecessaryDepthResult {
    addedReferences: number;
}

export interface DeadCodeInjectionResult {
    addedBlocks: number;
}

export interface ControlFlowFlatteningResult {
    flattenedBlocks: number;
}

export interface SimplifyResult {
    simplifiedStatements: number;
}

export interface CallablePath {
    node: {
        callee: BabelNode;
        optional?: boolean;
    };
    getStatementParent(): StatementPath | null;
}

export interface StatementPath {
    parent?: BabelNode;
    insertBefore(node: t.Statement): void;
}

export interface IdentifierNode extends BabelNode {
    type: "Identifier";
    name: string;
}

export interface PropertyPath {
    node: PropKeyNode;
    parent?: BabelNode;
    parentPath?: {
        parent?: BabelNode;
    };
}

export interface VariableDeclaratorPath {
    node: {
        id: BabelNode;
        init: BabelNode | null;
    };
    scope: BabelScope;
}

export interface ClassDeclarationPath {
    node: {
        id: BabelNode | null;
    };
}

export interface MemberExpressionPath {
    node: {
        computed: boolean;
        object: BabelNode;
        property: BabelNode;
    };
    parentPath?: BabelNodePath;
}

export interface MemberExpressionNode extends BabelNode {
    computed: boolean;
    object: BabelNode;
    property: BabelNode;
}

export interface NewExpressionNode extends BabelNode {
    callee: BabelNode;
}

export interface PropertyRenameResult {
    renamedProperties: number;
}
