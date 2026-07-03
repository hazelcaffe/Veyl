import path from "node:path";

export const rootDir = path.resolve(import.meta.dirname, "..", "..", "..");
export const testDir = path.resolve(rootDir, "tests");
export const casesDir = path.resolve(testDir, "cases");
export const tscBin = path.resolve(rootDir, "node_modules", ".bin", "tsc");
export const cliEntry = path.resolve(rootDir, "packages", "cli", "dist", "index.js");
export const coreDistEntry = path.resolve(rootDir, "packages", "core", "dist", "index.js");
export const configDistEntry = path.resolve(rootDir, "packages", "config", "dist", "index.js");
export const vitePluginDistEntry = path.resolve(rootDir, "packages", "vite-plugin", "dist", "index.js");
export const vitePluginPackageDir = path.resolve(rootDir, "packages", "vite-plugin");
