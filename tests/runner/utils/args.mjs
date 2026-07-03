export function parseArgs(argv) {
    const parsed = {
        keepJs: false,
        keepOut: false,
        clean: false,
        testName: null,
    };

    for (const arg of argv) {
        switch (arg) {
            case "--keep-js":
                parsed.keepJs = true;
                break;
            case "--keep-out":
                parsed.keepOut = true;
                break;
            default:
                if (arg === "--clean") {
                    parsed.clean = true;
                    break;
                }

                if (arg.startsWith("--test=")) {
                    parsed.testName = arg.slice("--test=".length);
                    break;
                }

                throw new Error(
                    `Unknown option: ${arg}\nUsage: node tests/runner.mjs [--keep-js|--keep-out|--clean|--test=<name>]`
                );
        }
    }

    return parsed;
}
