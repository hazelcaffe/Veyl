import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { cleanupFiles } from "./artifacts.mjs";
import { assertContains, assertNotContains, assertRegex } from "./utils/assertions.mjs";
import {
    casesDir,
    configDistEntry,
    coreDistEntry,
    rootDir,
    testDir,
    vitePluginDistEntry,
    vitePluginPackageDir,
} from "./utils/paths.mjs";
import { run } from "./utils/process.mjs";

export async function runDistChecks() {
    const coreDist = await import(pathToFileURL(coreDistEntry).href);
    const configDist = await import(pathToFileURL(configDistEntry).href);
    const scratchDir = path.resolve(testDir, ".tmp");

    fs.mkdirSync(scratchDir, { recursive: true });

    const mergedConfig = configDist.mergeConfig(
        {},
        {
            minify: false,
            obfuscate: {
                strings: {
                    enabled: false,
                },
                numbers: {
                    enabled: true,
                    method: "equation",
                },
                booleans: {
                    enabled: true,
                    method: "depth",
                    depth: null,
                },
            },
            features: {
                randomized_unique_identifiers: false,
                functionify: false,
                evalify: true,
                node_vm: false,
            },
        }
    );
    const resolvedConfig = configDist.resolveConfig(mergedConfig);
    const apiOut = coreDist.obfuscateCode("console.log(7, true, false);", resolvedConfig);
    const apiOutPath = path.resolve(scratchDir, "api-out.js");

    fs.writeFileSync(apiOutPath, apiOut.code, "utf8");

    const apiStdout = run(process.execPath, ["--no-warnings", apiOutPath], rootDir, {
        captureStdout: true,
    }).trim();

    if (apiStdout !== "7 true false") {
        throw new Error(
            `[dist] obfuscateCode output mismatch\nexpected: 7 true false\nactual:   ${apiStdout}`
        );
    }

    assertContains(apiOut.code, "eval(", "[dist] obfuscateCode should support evalify");

    const fileCaseDir = path.resolve(casesDir, "functionality");
    const fileOutPath = path.resolve(scratchDir, "file-out.js");
    const fileStats = await coreDist.obfuscateFile({
        input: path.resolve(fileCaseDir, "entry.ts"),
        output: fileOutPath,
        config: {
            minify: false,
            obfuscate: {
                strings: {
                    enabled: true,
                    encode: false,
                    unicode_escape_sequence: true,
                    method: "split",
                    split_length: 2,
                },
                numbers: {
                    enabled: false,
                },
                booleans: {
                    enabled: false,
                },
            },
            features: {
                randomized_unique_identifiers: false,
                unnecessary_depth: false,
                dead_code_injection: false,
                control_flow_flattening: false,
                simplify: false,
                functionify: false,
                evalify: false,
                node_vm: true,
            },
        },
    });
    const fileCode = fs.readFileSync(fileOutPath, "utf8");
    const fileStdout = run(process.execPath, ["--no-warnings", fileOutPath], rootDir, {
        captureStdout: true,
    }).trim();

    if (!fileStdout.includes("import-ok:module-string:5")) {
        throw new Error("[dist] obfuscateFile should produce executable output");
    }

    if (typeof fileStats.outputBytes !== "number" || fileStats.outputBytes <= 0) {
        throw new Error("[dist] obfuscateFile should return populated stats");
    }

    assertContains(fileCode, "\\u", "[dist] obfuscateFile should preserve unicode escaped strings");
    assertContains(fileCode, "runInContext", "[dist] obfuscateFile should support node_vm");

    cleanupFiles([apiOutPath, fileOutPath]);
    fs.rmSync(scratchDir, { recursive: true, force: true });

    const vitePluginResult = await runVitePluginCheck();

    return [
        {
            name: "obfuscateCode",
            output: apiStdout,
        },
        {
            name: "obfuscateFile",
            output: fileStdout,
        },
        vitePluginResult,
    ];
}

async function runVitePluginCheck() {
    const vite = await import(
        pathToFileURL(
            path.resolve(vitePluginPackageDir, "node_modules", "vite", "dist", "node", "index.js")
        ).href
    );
    const vitePlugin = await import(pathToFileURL(vitePluginDistEntry).href);
    const caseDir = path.resolve(casesDir, "vite-plugin");
    const outDir = path.resolve(caseDir, "dist");

    fs.rmSync(outDir, { recursive: true, force: true });

    await vite.build({
        root: caseDir,
        logLevel: "silent",
        configFile: false,
        build: {
            outDir,
            minify: false,
            rollupOptions: {
                input: path.resolve(caseDir, "src", "entry.js"),
                output: {
                    entryFileNames: "entry.js",
                    format: "es",
                },
            },
        },
        plugins: [
            vitePlugin.default({
                config: {
                    minify: false,
                    obfuscate: {
                        strings: { enabled: false },
                        numbers: { enabled: false },
                        booleans: { enabled: false },
                    },
                    features: {
                        randomized_unique_identifiers: true,
                    },
                },
            }),
        ],
    });

    const outputPath = path.resolve(outDir, "entry.js");
    const outputCode = fs.readFileSync(outputPath, "utf8");

    assertRegex(
        outputCode,
        /_0x[0-9a-f]+/,
        "[dist] vite plugin should emit randomized identifiers in the built chunk"
    );
    assertNotContains(
        outputCode,
        "function greet",
        "[dist] vite plugin should rename the original function identifier"
    );

    const stdout = run(process.execPath, ["--no-warnings", outputPath], rootDir, {
        captureStdout: true,
    }).trim();

    if (stdout !== "hello veyl 42") {
        throw new Error(
            `[dist] vite plugin output mismatch\nexpected: hello veyl 42\nactual:   ${stdout}`
        );
    }

    fs.rmSync(outDir, { recursive: true, force: true });

    return {
        name: "vite-plugin",
        output: stdout,
    };
}
