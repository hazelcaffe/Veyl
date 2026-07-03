export function assertContains(haystack, needle, message) {
    if (!haystack.includes(needle)) {
        throw new Error(message);
    }
}

export function assertNotContains(haystack, needle, message) {
    if (haystack.includes(needle)) {
        throw new Error(message);
    }
}

export function assertRegex(haystack, regex, message) {
    if (!regex.test(haystack)) {
        throw new Error(message);
    }
}
