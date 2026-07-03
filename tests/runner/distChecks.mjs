import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { cleanupFiles } from "./artifacts.mjs";
import { assertContains, assertNotContains, assertRegex } from "./utils/assertions.mjs";
import {
    appPackageDir,
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
    const reactViteResult = await runReactViteCheck();

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
        reactViteResult,
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

async function runReactViteCheck() {
    const vite = await import(
        pathToFileURL(path.resolve(appPackageDir, "node_modules", "vite", "dist", "node", "index.js"))
            .href
    );
    const react = await import(
        pathToFileURL(
            path.resolve(appPackageDir, "node_modules", "@vitejs", "plugin-react", "dist", "index.js")
        ).href
    );
    const vitePlugin = await import(pathToFileURL(vitePluginDistEntry).href);
    const caseDir = path.resolve(casesDir, "react-vite");
    const outDir = path.resolve(caseDir, "dist");

    fs.rmSync(outDir, { recursive: true, force: true });

    await vite.build({
        root: caseDir,
        logLevel: "silent",
        configFile: false,
        resolve: {
            alias: {
                "@vitejs/plugin-react": path.resolve(
                    appPackageDir,
                    "node_modules",
                    "@vitejs",
                    "plugin-react"
                ),
                react: path.resolve(appPackageDir, "node_modules", "react"),
                "react-dom": path.resolve(appPackageDir, "node_modules", "react-dom"),
            },
        },
        build: {
            outDir,
            minify: false,
            rollupOptions: {
                input: path.resolve(caseDir, "src", "entry.jsx"),
                output: {
                    entryFileNames: "entry.js",
                    format: "es",
                },
            },
        },
        plugins: [
            react.default(),
            vitePlugin.default({
                config: {
                    minify: false,
                    obfuscate: {
                        strings: {
                            enabled: true,
                            encode: true,
                            method: "array",
                        },
                        numbers: {
                            enabled: true,
                            method: "offset",
                        },
                        booleans: {
                            enabled: true,
                            method: "number",
                        },
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
    const stdout = run(
        process.execPath,
        [
            "--no-warnings",
            "--input-type=module",
            "--eval",
            `import(${JSON.stringify(pathToFileURL(outputPath).href)}).then(() => process.exit(0));`,
        ],
        rootDir,
        {
            captureStdout: true,
        }
    ).trim();
    const expected =
        '<section class="score-card ready" data-total="49"><h1>React Veyl</h1><ul><li>1:13</li><li>2:17</li><li>3:19</li></ul><p>ready</p></section>';

    if (stdout !== expected) {
        throw new Error(
            `[dist] obfuscated React/Vite output mismatch\nexpected: ${expected}\nactual:   ${stdout}`
        );
    }

    assertRegex(
        outputCode,
        /_0x[0-9a-f]+/,
        "[dist] React/Vite build should emit randomized identifiers"
    );
    assertContains(
        outputCode,
        "TextDecoder",
        "[dist] React/Vite build should include encoded string helpers"
    );
    assertNotContains(
        outputCode,
        "React Veyl",
        "[dist] React/Vite build should not leave fixture text unobfuscated"
    );

    fs.rmSync(outDir, { recursive: true, force: true });

    return {
        name: "react-vite",
        output: stdout,
    };
}
