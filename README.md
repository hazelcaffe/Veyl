# Veyl
A complete and customizable JavaScript and TypeScript obfuscation utility.

## Quick Start
```sh
pnpm i -g @skylvi/veyl-cli
veyl -i ./input.ts -o ./output.js
```

### Web Demo
If you don't want to install Veyl but want to mess around with it, you can use the webapp found [here](https://veyl.qwq.sh)

## Install From Source
```sh
git clone https://github.com/hazelcaffe/veyl
cd veyl
pnpm install
pnpm build
node packages/cli/dist/index.js -i ./input.ts -o ./output.js
```

## Docs
- [API](docs/API.md)
- [CLI](docs/CLI.md)
- [Vite Plugin](docs/vite-plugin.md)
- [Configuration](docs/config.md)
- [How It Works](docs/how_it_works.md)
