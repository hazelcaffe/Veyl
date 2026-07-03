import { getCases } from "./cases.mjs";
import { cleanupAllArtifacts } from "./runner/artifacts.mjs";
import { runCase } from "./runner/caseRunner.mjs";
import { runDistChecks } from "./runner/distChecks.mjs";
import { parseArgs } from "./runner/utils/args.mjs";
import { casesDir } from "./runner/utils/paths.mjs";
import {
    formatFailure,
    printCasePass,
    printDistPass,
    printFailure,
    printSummary,
} from "./runner/utils/reporter.mjs";

const options = parseArgs(process.argv.slice(2));

if (options.clean) {
    cleanupAllArtifacts();
    process.exit(0);
}

const allCases = getCases(casesDir);
const cases =
    options.testName === null
        ? allCases
        : allCases.filter((testCase) => testCase.name === options.testName);
const failures = [];
let passedCount = 0;

if (options.testName !== null && cases.length === 0) {
    throw new Error(`Unknown test case: ${options.testName}`);
}

for (const testCase of cases) {
    try {
        const result = runCase(testCase, options);
        passedCount++;
        printCasePass(result);
    } catch (err) {
        const failure = formatFailure(testCase.name, err);
        failures.push(failure);
        printFailure(failure);
    }
}

if (options.testName === null) {
    try {
        const distResults = await runDistChecks();

        for (const result of distResults) {
            passedCount++;
            printDistPass(result);
        }
    } catch (err) {
        const failure = formatFailure("dist", err);
        failures.push(failure);
        printFailure(failure);
    }
}

printSummary(passedCount, failures.length);

if (failures.length > 0) {
    throw new Error(`Test failures:\n\n${failures.join("\n\n")}`);
}
