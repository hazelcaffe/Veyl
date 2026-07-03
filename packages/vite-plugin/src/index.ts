import path from "node:path";
import type { ObfuscationConfig, ObfuscationConfigInput } from "@skylvi/veyl";
import {
    loadConfigFile,
    loadDefaultConfigFile,
    mergeConfig,
    obfuscateCode,
    resolveConfig,
} from "@skylvi/veyl";
import type { FilterPattern, Plugin, ResolvedConfig } from "vite";
import { createFilter } from "vite";

export interface VeylPluginOptions {
    /**
     * Inline Veyl config. Has priority over `confileFile`
     */
    config?: ObfuscationConfigInput;
    /**
     * Path to a Veyl JSON config file to load, resolved relative to the Vite project root.
     * Set to `false` to skip config file discovery entirely and rely only on `config`.
     */
    configFile?: string | false;
    /** Only obfuscate chunks whose file name matches this pattern. */
    include?: FilterPattern;
    /** Never obfuscate chunks whose file name matches this pattern. */
    exclude?: FilterPattern;
    /**
     * Controls when the plugin runs. Obfuscation is a production-build concern, so it defaults
     * to `"build"` and is skipped entirely for the dev server. Pass `"always"` to run for both
     * `vite build` and `vite dev`/`vite serve`.
     */
    apply?: "build" | "serve" | "always";
}

const PLUGIN_NAME = "veyl";

export default function veyl(options: VeylPluginOptions = {}): Plugin {
    const filter = createFilter(options.include, options.exclude);
    const apply = options.apply ?? "build";
    let resolvedConfig: ObfuscationConfig | null = null;
    let viteConfig: ResolvedConfig | null = null;

    return {
        name: PLUGIN_NAME,
        apply: apply === "always" ? undefined : apply,
        enforce: "post",

        configResolved(config) {
            viteConfig = config;
            resolvedConfig = resolveVeylConfig(options, config.root);
            warnAboutRuntimeCaveats(resolvedConfig, config);
        },

        renderChunk(code, chunk) {
            if (resolvedConfig === null) {
                return null;
            }

            if (!filter(chunk.fileName)) {
                return null;
            }

            if (viteConfig?.build.sourcemap) {
                this.warn(
                    `[${PLUGIN_NAME}] sourcemaps are not supported by Veyl's transforms; ` +
                        `output for "${chunk.fileName}" will not be mapped back to your original source.`
                );
            }

            const result = obfuscateCode(code, resolvedConfig);

            return {
                code: result.code,
                map: null,
            };
        },
    };
}

function resolveVeylConfig(options: VeylPluginOptions, root: string): ObfuscationConfig {
    const fileConfig = loadFileConfig(options.configFile, root);
    const merged = mergeConfig(fileConfig, options.config ?? {});

    return resolveConfig(merged);
}

function loadFileConfig(
    configFile: string | false | undefined,
    root: string
): ObfuscationConfigInput {
    if (configFile === false) {
        return {};
    }

    if (configFile !== undefined) {
        return loadConfigFile(path.resolve(root, configFile));
    }

    return loadDefaultConfigFile(root);
}

function warnAboutRuntimeCaveats(config: ObfuscationConfig, viteConfig: ResolvedConfig): void {
    const isClientTarget = viteConfig.build.ssr === false || viteConfig.build.ssr === undefined;

    if (!isClientTarget) {
        return;
    }

    if (config.features.node_vm) {
        viteConfig.logger.warn(
            `[${PLUGIN_NAME}] features.node_vm relies on Node's "node:vm" module at runtime and will not work in a browser bundle. Use it only for SSR/Node build targets.`
        );
    }

    const encryptionEnabled =
        config.features.encryption.public_key !== null ||
        config.features.encryption.private_key !== null;

    if (encryptionEnabled) {
        viteConfig.logger.warn(
            `[${PLUGIN_NAME}] features.encryption relies on Node's "node:crypto" module at runtime and will not work in a browser bundle. Use it only for SSR/Node build targets.`
        );
    }
}
