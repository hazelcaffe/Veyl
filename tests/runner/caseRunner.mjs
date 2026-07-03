import fs from "node:fs";
import path from "node:path";
import {
    cleanupArtifacts,
    cleanupFiles,
    collectTypeScriptFiles,
    replaceExtension,
} from "./artifacts.mjs";
import { runTypeScriptCase } from "./tsRuntime.mjs";
import { cliEntry, rootDir, tscBin } from "./utils/paths.mjs";
import { run } from "./utils/process.mjs";

export function runCase(testCase, options) {
    const entryTsPath = path.resolve(testCase.dir, testCase.entry);
    const entryJsPath = replaceExtension(entryTsPath, ".js");
    const outPath = path.resolve(testCase.dir, "out.js");
    const generatedJsFiles = collectTypeScriptFiles(testCase.dir).map((file) =>
        replaceExtension(file, ".js")
    );
    const tsRuntimeDir = path.resolve(testCase.dir, ".ts-runtime");

    cleanupArtifacts(generatedJsFiles, outPath, tsRuntimeDir);

    const sourceStdout = runTypeScriptCase(testCase.dir, testCase.entry).trim();

    run(
        tscBin,
        [
            "--ignoreconfig",
            "--module",
            "nodenext",
            "--target",
            "esnext",
            "--skipLibCheck",
            ...collectTypeScriptFiles(testCase.dir),
        ],
        rootDir
    );

    const expectedStdout = run(process.execPath, ["--no-warnings", entryJsPath], rootDir, {
        captureStdout: true,
    }).trim();
    const cliArgs = [cliEntry, "-i", entryTsPath, "-o", outPath];

    if (testCase.configFile !== undefined) {
        cliArgs.push("-c", path.resolve(testCase.dir, testCase.configFile));
    }

    if (testCase.cliArgs !== undefined) {
        cliArgs.push(...testCase.cliArgs);
    }

    run(process.execPath, cliArgs, rootDir, { captureStdout: true });

    const actualStdout = run(process.execPath, ["--no-warnings", outPath], rootDir, {
        captureStdout: true,
    }).trim();

    if (sourceStdout !== expectedStdout) {
        throw new Error(
            `[${testCase.name}] ts runtime output mismatch\nsource:   ${sourceStdout}\ncompiled: ${expectedStdout}`
        );
    }

    if (expectedStdout !== actualStdout) {
        throw new Error(
            `[${testCase.name}] runtime output mismatch\nexpected: ${expectedStdout}\nactual:   ${actualStdout}`
        );
    }

    const outputCode = fs.readFileSync(outPath, "utf8");
    testCase.validate?.(outputCode);

    if (!options.keepJs) {
        cleanupFiles(generatedJsFiles);
    }

    if (!options.keepOut) {
        cleanupFiles([outPath]);
        fs.rmSync(tsRuntimeDir, { recursive: true, force: true });
    }

    return {
        name: testCase.name,
        sourceStdout,
        compiledStdout: expectedStdout,
        obfuscatedStdout: actualStdout,
    };
}
