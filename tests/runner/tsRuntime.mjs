import fs from "node:fs";
import path from "node:path";
import { collectTypeScriptFiles } from "./artifacts.mjs";
import { rootDir } from "./utils/paths.mjs";
import { run } from "./utils/process.mjs";

export function runTypeScriptCase(caseDir, entryFile) {
    const runtimeDir = path.resolve(caseDir, ".ts-runtime");
    const packageJsonPath = path.resolve(runtimeDir, "package.json");

    fs.rmSync(runtimeDir, { recursive: true, force: true });
    fs.mkdirSync(runtimeDir, { recursive: true });
    fs.mkdirSync(path.dirname(packageJsonPath), { recursive: true });
    fs.writeFileSync(packageJsonPath, JSON.stringify({ type: "module" }, null, 4), "utf8");

    for (const file of collectTypeScriptFiles(caseDir)) {
        const relativePath = path.relative(caseDir, file);
        const targetPath = path.resolve(runtimeDir, relativePath);

        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.writeFileSync(
            targetPath,
            rewriteTypeScriptImports(fs.readFileSync(file, "utf8")),
            "utf8"
        );
    }

    return run(process.execPath, ["--no-warnings", path.resolve(runtimeDir, entryFile)], rootDir, {
        captureStdout: true,
    });
}

function rewriteTypeScriptImports(source) {
    return source.replaceAll('.js"', '.ts"').replaceAll(".js'", ".ts'");
}
