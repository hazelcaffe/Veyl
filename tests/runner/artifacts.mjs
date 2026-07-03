import fs from "node:fs";
import path from "node:path";
import { casesDir } from "./utils/paths.mjs";

export function collectTypeScriptFiles(caseDir) {
    const entries = fs.readdirSync(caseDir, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        const fullPath = path.resolve(caseDir, entry.name);

        if (entry.isDirectory()) {
            if (entry.name.startsWith(".")) {
                continue;
            }

            files.push(...collectTypeScriptFiles(fullPath));
            continue;
        }

        if (entry.isFile() && fullPath.endsWith(".ts")) {
            files.push(fullPath);
        }
    }

    return files.sort();
}

export function cleanupAllArtifacts() {
    for (const caseName of fs.readdirSync(casesDir)) {
        const caseDir = path.resolve(casesDir, caseName);

        if (!fs.statSync(caseDir).isDirectory()) {
            continue;
        }

        const generatedJsFiles = collectTypeScriptFiles(caseDir).map((file) =>
            replaceExtension(file, ".js")
        );

        cleanupArtifacts(
            generatedJsFiles,
            path.resolve(caseDir, "out.js"),
            path.resolve(caseDir, ".ts-runtime")
        );
    }
}

export function cleanupArtifacts(generatedJsFiles, outPath, tsRuntimeDir) {
    cleanupFiles([...generatedJsFiles, outPath]);

    if (tsRuntimeDir !== undefined && fs.existsSync(tsRuntimeDir)) {
        fs.rmSync(tsRuntimeDir, { recursive: true, force: true });
    }
}

export function cleanupFiles(files) {
    for (const file of files) {
        if (fs.existsSync(file)) {
            fs.rmSync(file, { force: true });
        }
    }
}

export function replaceExtension(filePath, extension) {
    return `${filePath.slice(0, filePath.lastIndexOf("."))}${extension}`;
}
