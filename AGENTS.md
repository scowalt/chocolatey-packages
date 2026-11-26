# Maintaining this repository

Chocolatey packages for scowalt, kept current by one daily GitHub Actions job. Read `README.md` first.

## Where things are

- `packages/<id>/`: one folder per package, with `<id>.nuspec` and `tools/`.
- `src/registry.ts`: the list of packages and how to find each upstream.
- `src/upstream.ts`: finds the latest version and download URL for each kind of upstream.
- `src/package-files.ts`: rewrites `<version>`, `$url` and `$checksum`.
- `src/plan.ts`: the one pure decision per package, and every reading of it (`onFeed`, `standingOf`,
  `problemOf`). `src/community.ts`: feed status of a version.
  `src/survey.ts`: gathers the three facts with one feed lookup.
- `src/apply.ts`: applies a plan by rewriting the package files and hashing them.
- `src/prepare.ts`, `publish.ts`, `verify.ts`, `check.ts`: the commands' logic. Each takes its network,
  Chocolatey and git as arguments, and `test/` runs them without any.
- `src/bin/`: one thin entry script per command. They wire the real network, Chocolatey and git into
  those functions.
- `src/runner.ts`: the one "for each package, log group, run, collect failures" loop.
- `test/`: behavior tests with saved fixtures in `test/fixtures/`. They never touch the network.
- `.github/workflows/`: `ci.yml` and `update.yml`.

## Commands

- `bun run check`: package state against upstream and the community feed. Needs the network.
- `bun test` and `bun run typecheck`: run both before every commit.
- `bun run check:comments`: the comment policy. Source files must have no comments.
- `bun run verify [id...]`: packs, installs and uninstalls packages. Needs Windows and Chocolatey.
- `bun run daily:plan`, `daily:install` and `daily:publish`: the daily workflow's steps. They rewrite
  files and, for `daily:publish`, push to Chocolatey and to `master`. Run them only in a throwaway
  copy, and only `daily:plan` is safe without credentials. `daily:install` writes the report that
  `daily:publish` reads (`PREPARE_REPORT`).

## How to verify a change

- Updater or parser change: add or adjust a test and a fixture, then run `bun test`.
- Package change: open a pull request. The `install` job in `ci.yml` must pass for all packages.
- Updater behavior against live data: `bun run check`, then `bun run daily:plan` in a copy of the
  repository without `.git`.

## Rules

- Never push a package from a laptop. Only the `publish` job of `update.yml` pushes, with the
  environment secret. No third-party code may run in that job: no installers, no package scripts, and
  no `bun install`.
- Do not add runtime dependencies. Use `fetch`, `node:crypto` and `node:fs`.
- Keep exactly one `$url = '...'` line and one `$checksum = '...'` line in each install script.
- Do not hand-edit versions to catch up with upstream. Let the daily job do it.
- To fix a broken published package, use the fix-version convention in `README.md`.
- If Listary replaces its binary without changing the version, the daily install fails on the
  checksum. That is correct, because users get the same failure.
- Listary's versions already use four segments, so the `.YYYYMMDD` convention does not fit. Chocolatey's
  fix notation for that case is to append `00` to the fourth segment and increment it, for example
  `6.3.5.9400` then `6.3.5.9401`. Every later version with the same first three segments must keep
  the suffix. Source: <https://docs.chocolatey.org/en-us/create/create-packages/> ("Package Fix
  Version Notation"). The updater does not support that notation yet. Add it the first time it is
  needed.
- Pin every GitHub Action by full commit SHA. Record its version in `README.md`. Use first-party
  actions and `oven-sh/setup-bun` only.
- Never name a package script `prepare` or `publish`. Bun and npm run those lifecycle scripts by themselves.
- Never publish a version the feed lists, in any status. Pushing a version that waits in moderation
  replaces the submission.
- Never auto-merge dependency updates. Renovate waits 7 days before proposing a release.
