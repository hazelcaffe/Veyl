import { execFileSync } from "node:child_process";

export function run(command, args, cwd, options = {}) {
    const result = execFileSync(command, args, {
        cwd,
        encoding: "utf8",
        stdio: options.captureStdout ? ["ignore", "pipe", "inherit"] : "inherit",
    });

    return result ?? "";
}
