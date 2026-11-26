# Maintaining this repository

Chocolatey packages for scowalt, kept current by one daily GitHub Actions job. Read `README.md` first.

## Where things are

- `packages/<id>/`: one folder per package, with `<id>.nuspec` and `tools/`.
- `src/registry.ts`: the list of packages and how to find each upstream.
- `src/upstream.ts`: finds the latest version and download URL for each kind of upstream.
- `src/package-files.ts`: rewrites `<version>`, `$url` and `$checksum`.
- `src/check.ts`, `update.ts`, `verify.ts`, `release.ts`: the four commands.
- `test/`: behavior tests with saved fixtures in `test/fixtures/`. They never touch the network.
- `.github/workflows/`: `ci.yml` and `update.yml`.

## Commands

- `bun run check`: package state against upstream and the community feed. Needs the network.
- `bun test` and `bun run typecheck`: run both before every commit.
- `bun run check:comments`: the comment policy. Source files must have no comments.
- `bun run update`: rewrites files for packages that are behind. Run it in a throwaway copy of the
  repository unless you mean to change the packages.
- `bun run verify [id...]` and `bun run release id...`: need Windows and Chocolatey.

## How to verify a change

- Updater or parser change: add or adjust a test and a fixture, then run `bun test`.
- Package change: open a pull request. The `install` job in `ci.yml` must pass for all packages.
- Updater behavior against live data: `bun run check`, then `bun run update` in a copy.

## Rules

- Never push a package from a laptop. Only `update.yml` pushes, with the environment secret.
- Do not add runtime dependencies. Use `fetch`, `node:crypto` and `node:fs`.
- Keep exactly one `$url = '...'` line and one `$checksum = '...'` line in each install script.
- Do not hand-edit versions to catch up with upstream. Let the daily job do it.
- To fix a broken published package, use the fix-version convention in `README.md`.
- Pin every GitHub Action by full commit SHA. Record its version in `README.md`.
- Never auto-merge dependency updates. Renovate waits 7 days before proposing a release.
