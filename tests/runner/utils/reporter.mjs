const color = {
    green: "\u001b[32m",
    red: "\u001b[31m",
    blue: "\u001b[34m",
    gray: "\u001b[90m",
    bold: "\u001b[1m",
    reset: "\u001b[0m",
};

export function formatFailure(name, error) {
    if (error instanceof Error) {
        return `[${name}] ${error.message}`;
    }

    return `[${name}] ${String(error)}`;
}

export function printCasePass(result) {
    console.log(`${color.green}[PASS]${color.reset} ${color.bold}${result.name}${color.reset}`);
    console.log(`  ${color.gray}ts :${color.reset} ${result.sourceStdout}`);
    console.log(`  ${color.gray}js :${color.reset} ${result.compiledStdout}`);
    console.log(`  ${color.gray}obf:${color.reset} ${result.obfuscatedStdout}`);
}

export function printDistPass(result) {
    console.log(`${color.blue}[DIST]${color.reset} ${color.bold}${result.name}${color.reset}`);
    console.log(`  ${color.gray}out:${color.reset} ${result.output}`);
}

export function printFailure(failure) {
    console.log(`${color.red}[FAIL]${color.reset} ${failure}`);
}

export function printSummary(passed, failed) {
    console.log("");
    console.log(`${color.bold}Summary${color.reset}`);
    console.log(`  ${color.green}passed${color.reset}: ${passed}`);
    console.log(`  ${failed > 0 ? color.red : color.gray}failed${color.reset}: ${failed}`);
}
