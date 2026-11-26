import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gitIn } from "../src/git.ts";

function git(cwd: string, ...args: string[]): string {
  const result = Bun.spawnSync(
    ["git", "-c", "user.name=Seed", "-c", "user.email=seed@example.test", ...args],
    { cwd, env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_SYSTEM: "/dev/null" } },
  );
  if (result.exitCode !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr.toString()}`);
  return result.stdout.toString().trim();
}

function setup(): { origin: string; work: string; other: string } {
  const root = mkdtempSync(join(tmpdir(), "git-"));
  const origin = join(root, "origin.git");
  const seed = join(root, "seed");
  mkdirSync(origin);
  git(origin, "init", "--bare", "-b", "master");
  mkdirSync(join(seed, "packages", "a"), { recursive: true });
  mkdirSync(join(seed, "packages", "b"), { recursive: true });
  writeFileSync(join(seed, "packages", "a", "file"), "a1\n");
  writeFileSync(join(seed, "packages", "b", "file"), "b1\n");
  git(seed, "init", "-b", "master");
  git(seed, "add", ".");
  git(seed, "commit", "-m", "seed");
  git(seed, "remote", "add", "origin", origin);
  git(seed, "push", "origin", "master");
  const work = join(root, "work");
  const other = join(root, "other");
  git(root, "clone", origin, work);
  git(root, "clone", origin, other);
  return { origin, work, other };
}

describe("gitIn", () => {
  test("commits only the selected packages as the bot and pushes them to master", async () => {
    const { origin, work } = setup();
    writeFileSync(join(work, "packages", "a", "file"), "a2\n");
    writeFileSync(join(work, "packages", "b", "file"), "b2\n");
    await gitIn(work).commitAndPush(["a"], "chore: publish a");
    expect(git(origin, "show", "master:packages/a/file")).toBe("a2");
    expect(git(origin, "show", "master:packages/b/file")).toBe("b1");
    expect(git(origin, "log", "-1", "--format=%an <%ae>|%s")).toBe(
      "github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>|chore: publish a",
    );
    expect(readFileSync(join(work, "packages", "b", "file"), "utf8")).toBe("b2\n");
  });

  test("rebases onto a master that moved while the job ran", async () => {
    const { origin, work, other } = setup();
    writeFileSync(join(other, "packages", "b", "file"), "b-other\n");
    git(other, "commit", "-am", "other work");
    git(other, "push", "origin", "master");
    writeFileSync(join(work, "packages", "a", "file"), "a2\n");
    await gitIn(work).commitAndPush(["a"], "chore: publish a");
    expect(git(origin, "show", "master:packages/a/file")).toBe("a2");
    expect(git(origin, "show", "master:packages/b/file")).toBe("b-other");
    expect(git(origin, "rev-list", "--count", "master")).toBe("3");
  });

  test("does nothing when the selected packages did not change", async () => {
    const { origin, work } = setup();
    const before = git(origin, "rev-parse", "master");
    await gitIn(work).commitAndPush(["a"], "chore: publish a");
    expect(git(origin, "rev-parse", "master")).toBe(before);
  });
});
