import path from "node:path";
import { assertContains, assertNotContains, assertRegex } from "./runner/utils/assertions.mjs";

export function getCases(casesDir) {
    return [
        {
            name: "functionality",
            dir: path.resolve(casesDir, "functionality"),
            entry: "entry.ts",
            configFile: "veyl_config.json",
        },
        {
            name: "string-array",
            dir: path.resolve(casesDir, "string-array"),
            entry: "entry.ts",
            configFile: "veyl_config.json",
            validate(outputCode) {
                assertContains(
                    outputCode,
                    '.join(" ")',
                    "string-array case should use array join reconstruction"
                );
                assertNotContains(
                    outputCode,
                    "TextDecoder",
                    "string-array case should not inject the string decoder when encode is disabled"
                );
            },
        },
        {
            name: "string-split",
            dir: path.resolve(casesDir, "string-split"),
            entry: "entry.ts",
            configFile: "veyl_config.json",
            validate(outputCode) {
                assertContains(
                    outputCode,
                    " + ",
                    "string-split case should concatenate split chunks"
                );
                assertNotContains(
                    outputCode,
                    '.join(" ")',
                    "string-split case should not use array table access"
                );
                assertContains(
                    outputCode,
                    '"sp"',
                    "string-split case should keep visible split string chunks in output"
                );
            },
        },
        {
            name: "string-encoding",
            dir: path.resolve(casesDir, "string-encoding"),
            entry: "entry.ts",
            configFile: "veyl_config.json",
            validate(outputCode) {
                assertContains(
                    outputCode,
                    "TextDecoder",
                    "string-encoding case should inject decoder helpers"
                );
            },
        },
        {
            name: "string-ues",
            dir: path.resolve(casesDir, "string-ues"),
            entry: "entry.ts",
            configFile: "veyl_config.json",
            validate(outputCode) {
                assertContains(outputCode, "\\u", "string-ues case should emit unicode escapes");
                assertNotContains(
                    outputCode,
                    "TextDecoder",
                    "string-ues only case should not inject decoder helpers"
                );
            },
        },
        {
            name: "number-offset",
            dir: path.resolve(casesDir, "number-offset"),
            entry: "entry.ts",
            configFile: "veyl_config.json",
            validate(outputCode) {
                assertContains(
                    outputCode,
                    "64",
                    "number-offset case should encode the configured offset"
                );
            },
        },
        {
            name: "number-equation",
            dir: path.resolve(casesDir, "number-equation"),
            entry: "entry.ts",
            configFile: "veyl_config.json",
            validate(outputCode) {
                assertNotContains(
                    outputCode,
                    "return inp",
                    "number-equation case should not inject number decoder helpers"
                );
                assertRegex(
                    outputCode,
                    /[*/+-].*[*/+-]/s,
                    "number-equation case should emit arithmetic expressions"
                );
            },
        },
        {
            name: "boolean-number",
            dir: path.resolve(casesDir, "boolean-number"),
            entry: "entry.ts",
            configFile: "veyl_config.json",
            validate(outputCode) {
                assertContains(
                    outputCode,
                    "12345",
                    "boolean-number case should include the configured true token"
                );
            },
        },
        {
            name: "boolean-depth",
            dir: path.resolve(casesDir, "boolean-depth"),
            entry: "entry.ts",
            configFile: "veyl_config.json",
            validate(outputCode) {
                assertContains(outputCode, "![]", "boolean-depth case should emit negation syntax");
            },
        },
        {
            name: "randomized-unique-identifiers",
            dir: path.resolve(casesDir, "randomized-unique-identifiers"),
            entry: "entry.ts",
            configFile: "veyl_config.json",
            validate(outputCode) {
                assertRegex(
                    outputCode,
                    /_0x[0-9a-f]+/,
                    "randomized identifier case should emit randomized names"
                );
            },
        },
        {
            name: "unnecessary-depth",
            dir: path.resolve(casesDir, "unnecessary-depth"),
            entry: "entry.ts",
            configFile: "veyl_config.json",
            validate(outputCode) {
                assertRegex(
                    outputCode,
                    /const _0x[0-9a-f]+ = [A-Za-z_$]/,
                    "unnecessary-depth case should alias calls before invocation"
                );
            },
        },
        {
            name: "dead-code-injection",
            dir: path.resolve(casesDir, "dead-code-injection"),
            entry: "entry.ts",
            configFile: "veyl_config.json",
            validate(outputCode) {
                assertContains(
                    outputCode,
                    "!==",
                    "dead-code-injection case should inject impossible branches"
                );
                assertContains(
                    outputCode,
                    "switch",
                    "dead-code-injection case should inject decoy switch logic"
                );
            },
        },
        {
            name: "control-flow-flattening",
            dir: path.resolve(casesDir, "control-flow-flattening"),
            entry: "entry.ts",
            configFile: "veyl_config.json",
            validate(outputCode) {
                assertContains(
                    outputCode,
                    "while (!",
                    "flattening case should emit dispatcher loop"
                );
                assertContains(
                    outputCode,
                    "switch",
                    "flattening case should emit dispatcher switch"
                );
            },
        },
        {
            name: "simplify",
            dir: path.resolve(casesDir, "simplify"),
            entry: "entry.ts",
            configFile: "veyl_config.json",
            validate(outputCode) {
                assertContains(
                    outputCode,
                    "?",
                    "simplify case should rewrite returns into a conditional expression"
                );
                assertNotContains(
                    outputCode,
                    "if (",
                    "simplify case should remove the original if return structure"
                );
            },
        },
        {
            name: "functionify",
            dir: path.resolve(casesDir, "functionify"),
            entry: "entry.ts",
            configFile: "veyl_config.json",
            validate(outputCode) {
                assertContains(
                    outputCode,
                    "new Function",
                    "functionify case should emit new Function"
                );
                assertContains(
                    outputCode,
                    "TextDecoder",
                    "functionify case should inject string decoder"
                );
                assertNotContains(
                    outputCode,
                    "const alphabet =",
                    "functionify case should obfuscate injected helper locals"
                );
            },
        },
        {
            name: "evalify",
            dir: path.resolve(casesDir, "evalify"),
            entry: "entry.ts",
            configFile: "veyl_config.json",
            validate(outputCode) {
                assertContains(outputCode, "eval(", "evalify case should emit eval execution");
                assertNotContains(
                    outputCode,
                    "const alphabet =",
                    "evalify case should obfuscate injected helper locals"
                );
                assertNotContains(
                    outputCode,
                    "new Function",
                    "evalify case should not emit new Function"
                );
                assertNotContains(
                    outputCode,
                    "runInContext",
                    "evalify case should not emit node:vm execution"
                );
            },
        },
        {
            name: "node-vm",
            dir: path.resolve(casesDir, "node-vm"),
            entry: "entry.ts",
            configFile: "veyl_config.json",
            validate(outputCode) {
                assertContains(outputCode, "node:vm", "node-vm case should import node:vm");
                assertContains(
                    outputCode,
                    "createContext",
                    "node-vm case should create a vm context"
                );
                assertContains(
                    outputCode,
                    "runInContext",
                    "node-vm case should execute the wrapped body in vm"
                );
                assertNotContains(
                    outputCode,
                    "new Function",
                    "node-vm case should not emit new Function"
                );
            },
        },
        {
            name: "encrypted-payloads",
            dir: path.resolve(casesDir, "encrypted-payloads"),
            entry: "entry.ts",
            configFile: "veyl_config.json",
            validate(outputCode) {
                assertContains(
                    outputCode,
                    "privateDecrypt",
                    "encrypted payload case should inject runtime private key decryption"
                );
                assertContains(
                    outputCode,
                    "createDecipheriv",
                    "encrypted payload case should inject runtime payload decryption"
                );
                assertNotContains(
                    outputCode,
                    "super-secret-payload",
                    "encrypted payload case should not leave the plaintext body marker in output"
                );
            },
        },
        {
            name: "minify",
            dir: path.resolve(casesDir, "minify"),
            entry: "entry.ts",
            configFile: "veyl_config.json",
            validate(outputCode) {
                if (outputCode.split("\n").length > 2) {
                    throw new Error("minify case should emit compact output");
                }
            },
        },
    ];
}
