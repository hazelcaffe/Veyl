import { traverse } from "../babel/interop.js";
import { staticKeyName } from "../babel/predicates.js";
import type { BabelNode, BabelNodePath } from "../types/babel.js";
import type {
    ClassDeclarationPath,
    MemberExpressionNode,
    MemberExpressionPath,
    NewExpressionNode,
    PropertyPath,
    PropertyRenameResult,
    VariableDeclaratorPath,
} from "../types/transforms.js";
import type { NameGenerator } from "../utils/random.js";

// Renames properties declared on local object/class shapes and matching local accesses.
export function renameProperties(ast: object, names: NameGenerator): PropertyRenameResult {
    const propMap = new Map<string, string>();
    const localObjBindings = new Set<string>();
    const localClassBindings = new Set<string>();
    const localClassInstanceBindings = new Set<string>();
    const localObjectExpressions = new Set<BabelNode>();
    const localClassBodies = new Set<BabelNode>();

    traverse(ast, {
        VariableDeclarator(pathNode: VariableDeclaratorPath) {
            if (
                pathNode.node.id.type === "Identifier" &&
                typeof pathNode.node.id.name === "string" &&
                pathNode.node.init?.type === "ObjectExpression" &&
                isSafeLocalObjectBinding(pathNode)
            ) {
                localObjBindings.add(pathNode.node.id.name);
                markLocalObjectExpression(
                    pathNode.node.init as BabelNode & {
                        properties?: BabelNode[];
                    },
                    localObjectExpressions
                );
            }

            if (
                pathNode.node.id.type === "Identifier" &&
                typeof pathNode.node.id.name === "string" &&
                pathNode.node.init?.type === "ClassExpression"
            ) {
                localClassBindings.add(pathNode.node.id.name);
                const classBody = (
                    pathNode.node.init as BabelNode & {
                        body?: BabelNode;
                    }
                ).body;

                if (classBody !== undefined) {
                    localClassBodies.add(classBody);
                }
            }

            const init = pathNode.node.init;

            if (init?.type === "NewExpression") {
                const newExpression = init as NewExpressionNode;

                if (
                    pathNode.node.id.type === "Identifier" &&
                    typeof pathNode.node.id.name === "string" &&
                    newExpression.callee.type === "Identifier" &&
                    typeof newExpression.callee.name === "string" &&
                    localClassBindings.has(newExpression.callee.name)
                ) {
                    localClassInstanceBindings.add(pathNode.node.id.name);
                }
            }
        },

        ClassDeclaration(pathNode: ClassDeclarationPath) {
            if (
                pathNode.node.id?.type === "Identifier" &&
                typeof pathNode.node.id.name === "string"
            ) {
                localClassBindings.add(pathNode.node.id.name);

                const classBody = (
                    pathNode.node as unknown as BabelNode & {
                        body?: BabelNode;
                    }
                ).body;

                if (classBody !== undefined) {
                    localClassBodies.add(classBody);
                }
            }
        },
    });

    // Collect every local rename target before mutating the tree so equivalent property names stay
    // consistent across declarations and accesses.
    traverse(ast, {
        "ObjectProperty|ObjectMethod|ClassProperty|ClassMethod|ClassAccessorProperty"(
            pathNode: PropertyPath
        ) {
            if (
                pathNode.node.computed ||
                shouldSkipPropertyRename(pathNode) ||
                !isRenamablePropertyDeclaration(pathNode, localObjectExpressions, localClassBodies)
            ) {
                return;
            }

            const name = staticKeyName(pathNode.node.key);

            if (name !== null && !propMap.has(name)) {
                propMap.set(name, names.freshIdentifier());
            }
        },

        "MemberExpression|OptionalMemberExpression"(pathNode: MemberExpressionPath) {
            if (pathNode.node.computed || pathNode.node.property.type !== "Identifier") {
                return;
            }

            if (
                !isLocalPropertyAccess(
                    pathNode.node.object,
                    localObjBindings,
                    localClassInstanceBindings,
                    localClassBodies,
                    pathNode.parentPath
                )
            ) {
                return;
            }

            const name = pathNode.node.property.name;

            if (typeof name === "string" && !propMap.has(name)) {
                propMap.set(name, names.freshIdentifier());
            }
        },
    });

    traverse(ast, {
        "ObjectProperty|ObjectMethod|ClassProperty|ClassMethod|ClassAccessorProperty"(
            pathNode: PropertyPath
        ) {
            if (
                pathNode.node.computed ||
                shouldSkipPropertyRename(pathNode) ||
                !isRenamablePropertyDeclaration(pathNode, localObjectExpressions, localClassBodies)
            ) {
                return;
            }

            const name = staticKeyName(pathNode.node.key);

            if (name === null) {
                return;
            }

            const replacement = propMap.get(name);

            if (replacement === undefined) {
                return;
            }

            if (pathNode.node.key.type === "Identifier") {
                pathNode.node.key.name = replacement;
            } else if (pathNode.node.key.type === "StringLiteral") {
                (
                    pathNode.node.key as BabelNode & {
                        value: string;
                    }
                ).value = replacement;

                (
                    pathNode.node.key as BabelNode & {
                        extra?: {
                            rawValue?: string;
                            raw?: string;
                        };
                    }
                ).extra = {
                    rawValue: replacement,
                    raw: JSON.stringify(replacement),
                };
            }
        },

        "MemberExpression|OptionalMemberExpression"(pathNode: MemberExpressionPath) {
            if (pathNode.node.computed) {
                return;
            }

            if (pathNode.node.property.type !== "Identifier") {
                return;
            }

            if (
                !isLocalPropertyAccess(
                    pathNode.node.object,
                    localObjBindings,
                    localClassInstanceBindings,
                    localClassBodies,
                    pathNode.parentPath
                )
            ) {
                return;
            }

            const name = pathNode.node.property.name;

            if (typeof name !== "string") {
                return;
            }

            const replacement = propMap.get(name);

            if (replacement !== undefined) {
                pathNode.node.property.name = replacement;
            }
        },
    });

    return {
        renamedProperties: propMap.size,
    };
}

function isRenamablePropertyDeclaration(
    pathNode: PropertyPath,
    localObjectExpressions: Set<BabelNode>,
    localClassBodies: Set<BabelNode>
): boolean {
    const parentNode = pathNode.parent;

    if (parentNode?.type === "ObjectExpression") {
        return localObjectExpressions.has(parentNode);
    }

    if (parentNode?.type === "ClassBody") {
        return localClassBodies.has(parentNode);
    }

    return false;
}

function markLocalObjectExpression(
    objectExpression: BabelNode & {
        properties?: BabelNode[];
    },
    localObjectExpressions: Set<BabelNode>
): void {
    if (localObjectExpressions.has(objectExpression)) {
        return;
    }

    localObjectExpressions.add(objectExpression);

    for (const property of objectExpression.properties ?? []) {
        if (property.type !== "ObjectProperty") {
            continue;
        }

        const value = (property as BabelNode & { value?: BabelNode }).value;

        if (value?.type === "ObjectExpression") {
            markLocalObjectExpression(
                value as BabelNode & {
                    properties?: BabelNode[];
                },
                localObjectExpressions
            );
        }
    }
}

function isLocalPropertyAccess(
    node: BabelNode,
    localObjBindings: Set<string>,
    localClassInstanceBindings: Set<string>,
    localClassBodies: Set<BabelNode>,
    pathNode?: BabelNodePath
): boolean {
    if (node.type === "ThisExpression") {
        return isInsideLocalClassBody(pathNode, localClassBodies);
    }

    if (node.type === "Identifier") {
        return (
            typeof node.name === "string" &&
            (localObjBindings.has(node.name) || localClassInstanceBindings.has(node.name))
        );
    }

    if (node.type !== "MemberExpression" && node.type !== "OptionalMemberExpression") {
        return false;
    }

    const memberExpression = node as MemberExpressionNode;

    if (memberExpression.computed || memberExpression.property.type !== "Identifier") {
        return false;
    }

    return isLocalPropertyAccess(
        memberExpression.object,
        localObjBindings,
        localClassInstanceBindings,
        localClassBodies,
        pathNode
    );
}

function isInsideLocalClassBody(
    pathNode: BabelNodePath | null | undefined,
    localClassBodies: Set<BabelNode>
): boolean {
    let current = pathNode;

    while (current !== null && current !== undefined) {
        if (current.node !== undefined && localClassBodies.has(current.node)) {
            return true;
        }

        current = current.parentPath;
    }

    return false;
}

function isSafeLocalObjectBinding(pathNode: VariableDeclaratorPath): boolean {
    const bindingName =
        pathNode.node.id.type === "Identifier" && typeof pathNode.node.id.name === "string"
            ? pathNode.node.id.name
            : null;
    const binding = bindingName === null ? null : pathNode.scope.getBinding(bindingName);

    if (binding === null || binding === undefined) {
        return false;
    }

    return binding.referencePaths.every((referencePath: BabelNodePath) =>
        isSafeLocalObjectReference(referencePath)
    );
}

function isSafeLocalObjectReference(referencePath: BabelNodePath): boolean {
    const parent = referencePath.parent;
    const node = referencePath.node;

    if (parent === undefined || node === undefined) {
        return false;
    }

    if (parent.type === "MemberExpression" || parent.type === "OptionalMemberExpression") {
        const memberExpression = parent as MemberExpressionNode;

        return memberExpression.object === node;
    }

    return false;
}

// Leaves externally meaningful property names alone.
function shouldSkipPropertyRename(pathNode: PropertyPath): boolean {
    const name = staticKeyName(pathNode.node.key);

    if (name === null) {
        return true;
    }

    if (
        name === "depth" ||
        name === "colors" ||
        name === "showHidden" ||
        name === "maxArrayLength" ||
        name === "maxStringLength" ||
        name === "constructor"
    ) {
        return true;
    }

    const objectParent = pathNode.parentPath?.parent;

    // Keys passed inline to calls/new expressions often participate in external APIs, so renaming
    // them is much more likely to break user code than local object literals are.
    if (objectParent?.type === "CallExpression" || objectParent?.type === "NewExpression") {
        return true;
    }

    return false;
}
