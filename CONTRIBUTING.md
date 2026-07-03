# Contributing

## Workflow
- Fork the repository to your own account.
- Create a new branch for each change instead of working on `main`.
- Keep each branch scoped to one change or one tightly related set of changes.
- When behavior, config, CLI flags, or the public API change, update the relevant docs, refresh the example config if needed, and add or adjust tests to cover the change.

## Setup
```sh
git clone https://github.com/hazelcaffe/veyl
cd veyl
pnpm install
pnpm build
```
If you are contributing from a fork, push your work to your fork and open a PR from that branch.

## Common Commands
```sh
pnpm cli # `node packages/cli/dist/index.js`
pnpm dev # vite dev (`packages/app`)
pnpm preview # vite preview (`packages/app`)
pnpm test # run test suite
pnpm lint # biome
pnpm lint:fix # biome
pnpm format # biome
pnpm check # biome
pnpm typecheck # typecheck all packages
pnpm build # build all packages
```

## Required Checks
Before opening a PR, make sure your changes pass:
```sh
pnpm lint
pnpm check
pnpm typecheck
pnpm build
pnpm test
```

GitHub Actions runs `pnpm lint`, `pnpm test`, `pnpm typecheck`, and `pnpm build` on every push
and pull request. The browser app in `packages/app` is also built and deployed to GitHub Pages on
pushes to `main`.

## Testing
```sh
pnpm test

# Flags
pnpm test --keep-js # Keep all JS output
pnpm test --keep-out # Keep `out.js`
pnpm test --clean # Cleanup any dists
pnpm test --test=test_name # Run specific test
```

## Workspace Layout
```text
packages/
  app/    # Vite + Monaco browser playground
  config/ # local config parsing/resolution package
  core/   # @skylvi/veyl API package
  cli/    # @skylvi/veyl-cli executable package
  vite-plugin/ # @skylvi/vite-plugin package
```
