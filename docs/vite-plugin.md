# Vite Plugin

`@skylvi/veyl-vite-plugin` obfuscates your production Vite build output using Veyl.

## Install
```sh
pnpm add -D @skylvi/veyl-vite-plugin
```

## Usage
```ts
import { defineConfig } from "vite";
import veyl from "@skylvi/veyl-vite-plugin";

export default defineConfig({
    plugins: [
        veyl({
            config: {
                obfuscate: {
                    strings: { enabled: true },
                    numbers: { enabled: true },
                    booleans: { enabled: true },
                },
                features: {
                    randomized_unique_identifiers: true,
                    control_flow_flattening: true,
                },
            },
        }),
    ],
});
```

By default the plugin also looks for a `veyl_config.json` file in your Vite project root.

## Options
```ts
interface VeylPluginOptions {
    // Inline config overrides, same shape as veyl_config.json. Merged on top of any config file.
    config?: ObfuscationConfigInput;

    // Path to a Veyl JSON config file, resolved relative to the Vite project root.
    // Set to `false` to skip config file discovery. Defaults to `veyl_config.json` in the root.
    configFile?: string | false;

    // Only obfuscate output chunks whose file name matches this pattern.
    include?: FilterPattern;

    // Never obfuscate output chunks whose file name matches this pattern.
    exclude?: FilterPattern;

    // Controls when the plugin runs. Defaults to "build" (skipped for the dev server).
    // Pass "always" to also run during `vite dev`/`vite serve`.
    apply?: "build" | "serve" | "always";
}
```

## How It Works
The plugin hooks into Rollup/Rolldown's `renderChunk` stage, after Vite has finished bundling,
and runs each emitted chunk through `obfuscateCode` from `@skylvi/veyl`. This means:

- Obfuscation runs on the final bundled output, once per chunk, not per source module.
- It runs after Vite/Rollup's own minification, so pair `minify: true` in your Veyl config with
  Vite's `build.minify: false` if you want Veyl's esbuild-based post-minify pass to be the only
  minification step, or leave both enabled to layer them.
- Because obfuscation runs by default only for `apply: "build"`, dev server behavior (`vite dev`)
  is completely unaffected.

## Caveats
- **No sourcemaps.** Veyl's transforms do not currently track source positions through Babel, so
  the plugin returns `map: null` from `renderChunk`. If `build.sourcemap` is enabled, the plugin
  logs a warning that obfuscated chunks will not be mapped back to your original source.
- **`features.node_vm` and `features.encryption` are Node-only at runtime** (they rely on
  `node:vm` / `node:crypto`). The plugin warns if either is enabled for a client build target;
  only use them for SSR/Node build outputs.
- Like the rest of Veyl, obfuscation trades runtime performance and bundle size for reduced
  readability; heavier features such as `control_flow_flattening` and `dead_code_injection` will
  increase output size.
