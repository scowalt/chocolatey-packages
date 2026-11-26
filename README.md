# Chocolatey packages

Chocolatey packages maintained by [scowalt](https://community.chocolatey.org/profiles/scowalt).
One daily job keeps every package at the newest upstream version and publishes it.

## Packages

| Package | What it installs |
| --- | --- |
| `cryptomator` | Client-side encryption for cloud files |
| `depressurizer` | Steam library category manager |
| `Listary` | File search utility for Windows |
| `project64` | Nintendo 64 emulator |
| `stepmania` | Rhythm and dance game |
| `hearthstone-deck-tracker` | Deck tracker for Hearthstone |
| `hearthstone-deck-tracker-arena-helper` | Arena draft plugin for the deck tracker |

Each package lives in `packages/<id>/` with a nuspec and `tools/chocolateyInstall.ps1`.

## How the updater works

`src/registry.ts` lists every package and how to find its upstream. Three kinds exist:

- `github-release`: the latest release of a GitHub repository, its tag prefix, and the installer asset name.
- `listary-changelog`: the first heading of the Listary changelog, with a fixed download link.
- `project64-releases`: the newest installer listed on pj64-emu.com.

Each install script has exactly one `$url = '...'` line and one `$checksum = '...'` line.
The updater rewrites those two lines and the `<version>` in the nuspec. It touches nothing else.

A nuspec version is current when it equals upstream's version, or equals it plus a dot and an
eight digit date, such as `3.0.1.20261126`. Anything else that differs is behind.

The daily workflow `.github/workflows/update.yml` runs this loop:

1. `bun run update` rewrites the files of each package that is behind and prints the changed ids.
2. For each changed id, `bun run verify` packs it and installs and uninstalls it from the local folder.
3. `bun run release` pushes the package to Chocolatey. A push that Chocolatey answers with 409
   means the version is already there, and counts as done.
4. The new files are committed to `master`.
5. A heartbeat is sent to `alerts.scowalt.com`. If it stops, the alerts router pages the owner.
   This also catches GitHub disabling the schedule after 60 days without repository activity.

A run that crashed after the push and before the commit repairs itself on the next run.
The files are still behind, so the same version is built again, rejected with 409, and committed.

## Check the state

```sh
bun install
bun run check
```

`check` prints one row per package: the nuspec version, the newest approved version on the
Chocolatey community feed, upstream's version, and a state. It exits 1 if any package is behind
or if something could not be read.

| State | Meaning |
| --- | --- |
| `current` | The community feed has upstream's newest version. |
| `unpublished` | The nuspec is current. The feed is waiting on a push or on moderation. |
| `behind` | Upstream is newer than the nuspec. The next daily run fixes it. |
| `error` | Upstream or the feed could not be read. |

Set `GITHUB_TOKEN` to avoid GitHub's low rate limit for anonymous requests.

## Add a package

1. Create `packages/<id>/<id>.nuspec` and `packages/<id>/tools/chocolateyInstall.ps1`. Use one
   `$url = '...'` line and one `$checksum = '...'` line. Set `packageSourceUrl` to
   `https://github.com/scowalt/chocolatey-packages/tree/master/packages/<id>`.
2. Add one entry to `src/registry.ts`.
3. Run `bun test`. It fails if the folder, the nuspec id or the two lines are wrong.
4. Open a pull request. CI packs and installs every package on Windows.

## The fix-version convention

When a published package is broken but upstream has no new release, publish a fix with the
upstream version plus `.YYYYMMDD`. For example `3.0.1.20261126` is the fixed Project64 3.0.1.
The updater treats it as current until upstream releases a newer version.

## Why GitHub Actions

Packing and install tests need Windows and Chocolatey. GitHub's `windows-latest` runner has both.
The rest of the workspace uses Woodpecker, which has no Windows runner here.

## Workflows and secrets

- `ci.yml` runs on every pull request and push to `master`. It needs no secrets. An Ubuntu job runs
  the type check, `bun test` and the comment policy. A Windows job runs `bun run verify`, which packs
  every package and installs and uninstalls each one from the local folder.
- `update.yml` runs daily and on demand. It runs in the GitHub environment `chocolatey`, which only
  `master` may deploy to.
  - `CHOCOLATEY_API_KEY` is a secret of the `chocolatey` environment. No other job can read it,
    and `ci.yml` never references it.
  - `ALERTS_TOKEN` is a repository secret. It is the bearer token of the `chocolatey-packages`
    source on the alerts router.
  - `GITHUB_TOKEN` is provided by GitHub. The job has `contents: write` to commit to `master`.

## Development

Runtimes are pinned in `.mise.toml`. The updater has no runtime dependencies. Source files carry no
comments (see `.comment-policy/README.md`), and the pre-commit hooks in `lefthook.yml` enforce that
along with gitleaks. Install the hooks with `lefthook install`.

Pinned actions: `actions/checkout` v7.0.1 and `oven-sh/setup-bun` v2.2.0. Workflow files cannot
hold version comments, so this list is the record.
