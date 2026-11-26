# Every package here tracks upstream's newest release, passes the daily install test, and is on the Chocolatey feed or in its moderation queue

## Proof

`proof` checks two things and fails if either is false.

1. The latest completed run of `update.yml` on `master` succeeded and started less than 36 hours
   ago. That run compared every package with upstream, installed and uninstalled all of them on
   Windows, and pushed every new version. If any of those steps fails, the run fails.
2. `bun run check` lists every directory in `packages/`, and shows each one as `current`,
   `moderation` or `behind`. It fails on `unpublished`, `ahead`, `rejected` and `error`.

`behind` passes because a successful run leaves nothing behind when it plans. A package can only be
behind afterwards if upstream released after that run, and the next daily run publishes it. If that
run fails, part 1 fails.

The proof reads GitHub with the host's `gh` login and the public Chocolatey feed. It changes nothing.

## Allowed

- Open pull requests that change `packages/`, `src/`, `test/`, `README.md` and `AGENTS.md`, following
  `AGENTS.md`. That includes a hand-written fix version after Chocolatey rejects a version.
- Merge its own pull request into `master` once CI passes, including the Windows install of every
  package.
- Start `update.yml` with `gh workflow run`, and turn it back on with `gh workflow enable` if GitHub
  turned off its schedule.
- Read run logs, the Chocolatey feed and upstream release pages.

## Ask first

- Changing `proof` or this file.
- Anything under `.github/`, repository settings, secrets or the `chocolatey` environment.
- Adding or removing a package, or adding a dependency.
- Hiding a version on Chocolatey, or replying to a moderator.
- Pushing to Chocolatey or to `master` by any route other than `update.yml` and a merged pull request.
