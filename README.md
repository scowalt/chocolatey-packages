# Chocolatey packages

Chocolatey packages maintained by [scowalt](https://community.chocolatey.org/profiles/scowalt).
One daily workflow keeps every package at the newest upstream version and publishes it.

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

## One decision per package

`src/plan.ts` turns three facts into one decision per package. Every command reads it. None re-derives it.

1. The nuspec version, parsed once into `{ upstream, fixDate? }`. See the fix-version convention below.
2. Upstream's newest version.
3. The feed status of the exact nuspec version, and of upstream's version if it differs:
   `approved`, `submitted`, `rejected` or `absent`.

Versions compare as numbers, segment by segment, never as text.

- Upstream is newer than the nuspec's upstream part: rewrite the package to upstream's version.
- They are equal: keep the nuspec, including a fix version.
- Upstream is older: the state is `ahead`, which is an error. The updater never rewrites downward.

After that, the package is published exactly when its resulting version is `absent` from the feed.
Any other status blocks a push, because pushing a version that waits in moderation replaces the
submission and can restart moderation.

| Feed status | Chocolatey `PackageStatus` values it covers |
| --- | --- |
| `approved` | `Approved`, `Exempted` |
| `submitted` | `Submitted`, `Updated`, `Pending` |
| `rejected` | `Rejected` |
| `absent` | the lookup answers 404 |

Any other status, such as `Unknown`, is an error. A lookup that fails with anything but 404 is an
error too, never `absent`.

## The daily workflow

`.github/workflows/update.yml` runs two jobs. Third-party code, meaning each package's installer,
only ever runs in the first, where no secret and no write token exists.

`prepare` has `contents: read`, no environment and no secrets. It checks out without persisting
credentials and gives `GITHUB_TOKEN` only to the step that asks GitHub for releases.

1. `bun run daily:plan` computes every plan and rewrites the packages that are behind.
2. `bun run daily:install` packs, installs and uninstalls every package, changed or not, so a dead
   download shows up the day it dies.
3. The job uploads `prepare-report.json`: for each package its plan, whether its install test passed,
   and a SHA-256 over its rewritten package files. It uploads even when some installs failed, and the
   job fails at the end if any package failed.

`publish` runs after `prepare`, also when `prepare` failed. It runs in the environment `chocolatey`
with `contents: write`, runs no package script and no installer, and treats the report as untrusted.
Its Bun setup skips the Actions cache, because jobs that ran installers on `master` can write that
cache.

1. `bun run daily:publish` re-derives every plan and rewrites the files itself: a download and a hash.
2. It packs and pushes a package only when the report says its install test passed, its own file hash
   equals the reported one, its own plan equals the reported one, and the plan says publish.
3. A push that Chocolatey answers with 409 means the version is already there, and counts as done.
4. It commits the rewritten files of every package whose new version is now on the feed, whether it
   was just pushed, answered 409, or was found submitted or approved. It restores the files of every
   other package first, then rebases on `origin/master` and pushes as `github-actions[bot]`.
5. It fails if any push failed or `prepare` failed. A failing package never blocks the others.
6. After a fully successful run it sends a heartbeat to `alerts.scowalt.com`. If the heartbeat
   stops, the alerts router pages the owner. This also catches GitHub disabling the schedule after
   60 days without repository activity.

A run that crashed between the push and the commit repairs itself on the next run. The version is on
the feed as `submitted` or `approved`, so the files are rewritten and committed and nothing is pushed.

## Check the state

```sh
bun install
bun run check
```

`check` prints one row per package (the nuspec version, the newest approved version on the
Chocolatey community feed, upstream's version and a state), then a legend. The legend lives in
`LEGEND` in `src/survey.ts`, so it cannot drift from the code. `check` exits 1 unless every package
is `current` or `moderation`.

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
The updater keeps it until upstream releases a newer version.

NuGet allows four version segments, so the convention only works for upstream versions of three or
fewer segments. A nuspec version of four segments whose last has eight digits reads as a fix. A
nuspec version of more than four segments is an error. Listary's upstream versions have four
segments, such as `6.3.5.94`, so Listary cannot use the convention.

## Why GitHub Actions

Packing and install tests need Windows and Chocolatey. GitHub's `windows-latest` runner has both.
The rest of the workspace uses Woodpecker, which has no Windows runner here.

## Workflows and secrets

- `ci.yml` runs on every pull request and push to `master`. It needs no secrets and never references
  the environment or the key. An Ubuntu job runs the type check, `bun test` and the comment policy.
  A Windows job runs `bun run verify`, which packs every package and installs and uninstalls each
  one from the local folder.
- `update.yml` runs daily and on demand, as described above.
  - `CHOCOLATEY_API_KEY` is a secret of the `chocolatey` environment, which only `master` may use.
    Only the `publish` job can read it, and `ci.yml` never references it.
  - `ALERTS_TOKEN` is a repository secret. It is the bearer token of the `chocolatey-packages`
    source on the alerts router. Only the heartbeat step reads it.
  - `GITHUB_TOKEN` is provided by GitHub. `prepare` has `contents: read` and `publish` has
    `contents: write`, to commit to `master`.

## Development

Runtimes are pinned in `.mise.toml`. The updater has no runtime dependencies. Source files carry no
comments (see `.comment-policy/README.md`), and the pre-commit hooks in `lefthook.yml` enforce that
along with gitleaks. Install the hooks with `lefthook install`.

Pinned actions: `actions/checkout` v7.0.1, `actions/upload-artifact` v7.0.2,
`actions/download-artifact` v8.0.2 and `oven-sh/setup-bun` v2.2.0. Workflow files cannot hold
version comments, so this list is the record.
