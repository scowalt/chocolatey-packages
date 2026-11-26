import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { PushOutcome } from "../src/choco.ts";
import type { Git } from "../src/git.ts";
import { readPackage } from "../src/package-files.ts";
import type { Decided, Plan } from "../src/plan.ts";
import { installPackages, planPackages } from "../src/prepare.ts";
import { pushGate, publishPackages, selectCommits, type PublishItem } from "../src/publish.ts";
import { loadReport, type PrepareEntry } from "../src/report.ts";
import { copyOfPackages, fakeChoco } from "./support.ts";
import { buildWorld, type WorldOptions } from "./world.ts";

const publishPlan: Plan = { kind: "publish", version: "1.0.0", rewrite: false };

function entry(overrides: Partial<PrepareEntry> = {}): PrepareEntry {
  return { id: "demo", hash: "h", installed: true, ...overrides };
}

describe("pushGate", () => {
  test("pushes when the plan says publish, the install passed and the hashes match", () => {
    expect(pushGate({ plan: publishPlan, hash: "h" }, entry())).toEqual({ push: true });
  });

  test("does not push when the plan is not publish", () => {
    for (const kind of ["approved", "moderation"] as const) {
      const plan: Plan = { kind, version: "1.0.0", rewrite: false };
      expect(pushGate({ plan, hash: "h" }, entry()).push).toBe(false);
    }
  });

  test("does not push when prepare reported nothing for the package", () => {
    expect(pushGate({ plan: publishPlan, hash: "h" }, undefined)).toEqual({
      push: false,
      reason: "prepare reported nothing for this package",
    });
  });

  test("does not push when the install test did not pass", () => {
    expect(pushGate({ plan: publishPlan, hash: "h" }, entry({ installed: false })).push).toBe(false);
  });

  test("does not push when the files differ from the ones prepare tested", () => {
    expect(pushGate({ plan: publishPlan, hash: "other" }, entry())).toEqual({
      push: false,
      reason: "its files differ from the ones prepare tested",
    });
  });
});

describe("selectCommits", () => {
  const item = (id: string, plan: Plan, push: PublishItem["push"] = "not-attempted"): PublishItem => ({
    id,
    plan,
    push,
  });
  const rewrite = (kind: Decided["kind"]): Plan => ({ kind, version: "2.0.0", rewrite: true });

  test("commits a rewrite that was just pushed or answered with a conflict", () => {
    expect(
      selectCommits([
        item("pushed", rewrite("publish"), "pushed"),
        item("conflict", rewrite("publish"), "already-published"),
      ]),
    ).toEqual(["pushed", "conflict"]);
  });

  test("commits a rewrite whose version is already on the feed, as submitted or approved", () => {
    expect(selectCommits([item("a", rewrite("moderation")), item("b", rewrite("approved"))])).toEqual(["a", "b"]);
  });

  test("never commits a rewrite whose push failed or was refused", () => {
    expect(
      selectCommits([
        item("failed", rewrite("publish"), "failed"),
        item("refused", rewrite("publish"), "not-attempted"),
      ]),
    ).toEqual([]);
  });

  test("a failing package does not stop the others being committed", () => {
    expect(
      selectCommits([
        item("first", rewrite("publish"), "pushed"),
        item("broken", rewrite("publish"), "failed"),
        item("last", rewrite("publish"), "already-published"),
      ]),
    ).toEqual(["first", "last"]);
  });

  test("commits nothing for a package that was not rewritten", () => {
    expect(selectCommits([item("a", publishPlan, "pushed"), item("b", { ...publishPlan, kind: "approved" })])).toEqual(
      [],
    );
  });
});

const LIVE: WorldOptions = {
  upstream: { cryptomator: "1.19.7" },
  feed: {
    "cryptomator@1.19.7": "absent",
    "project64@3.0.1.20261126": "absent",
    "hearthstone-deck-tracker@1.55.6": "absent",
    "hearthstone-deck-tracker-arena-helper@0.9.6": "absent",
  },
};
const PUBLISHABLE = ["cryptomator", "project64", "hearthstone-deck-tracker", "hearthstone-deck-tracker-arena-helper"];

interface Recorded {
  readonly pushed: string[];
  readonly committed: string[][];
  readonly messages: string[];
}

interface PublishOptions {
  readonly pushOutcomes?: Record<string, PushOutcome>;
  readonly git?: Git;
}

async function prepareThroughDisk(world: WorldOptions, failInstall: readonly string[] = []): Promise<PrepareEntry[]> {
  const dir = copyOfPackages();
  await planPackages(buildWorld(world).http, dir);
  const path = join(mkdtempSync(join(tmpdir(), "handoff-")), "prepare-report.json");
  await installPackages("out", fakeChoco({ failInstall }), path, dir);
  return loadReport(path);
}

async function publishFrom(
  entries: readonly PrepareEntry[],
  world: WorldOptions,
  options: PublishOptions = {},
): Promise<{ problems: string[]; recorded: Recorded; dir: string }> {
  const dir = copyOfPackages();
  const recorded: Recorded = { pushed: [], committed: [], messages: [] };
  const problems = await publishPackages(entries, {
    http: buildWorld(world).http,
    choco: {
      async pack(id, out) {
        return `${out}/${id}.nupkg`;
      },
      async push(nupkg) {
        const id = /([^/]+)\.nupkg$/.exec(nupkg)?.[1] ?? "";
        recorded.pushed.push(id);
        return options.pushOutcomes?.[id] ?? "pushed";
      },
    },
    git: options.git ?? {
      async commitAndPush(ids, message) {
        recorded.committed.push([...ids]);
        recorded.messages.push(message);
      },
    },
    out: "out",
    apiKey: "key",
    dir,
  });
  return { problems, recorded, dir };
}

async function runPublish(
  world: WorldOptions,
  options: PublishOptions & {
    readonly tamper?: (entries: PrepareEntry[]) => PrepareEntry[];
    readonly failInstall?: readonly string[];
  } = {},
) {
  const entries = await prepareThroughDisk(world, options.failInstall);
  return publishFrom(options.tamper ? options.tamper(entries) : entries, world, options);
}

describe("the handoff from prepare to publish", () => {
  test("prepare rewrites and tests, writes the report file, and publish pushes what that file vouches for", async () => {
    const prepareDir = copyOfPackages();
    const path = join(mkdtempSync(join(tmpdir(), "handoff-")), "prepare-report.json");

    expect(await planPackages(buildWorld(LIVE).http, prepareDir)).toEqual([]);
    expect(readPackage("cryptomator", prepareDir).nuspec).toContain("<version>1.19.7</version>");

    expect(await installPackages("out", fakeChoco(), path, prepareDir)).toEqual([]);
    const written: Record<string, unknown>[] = JSON.parse(readFileSync(path, "utf8"));
    expect(written).toHaveLength(7);
    for (const item of written) expect(Object.keys(item).sort()).toEqual(["hash", "id", "installed"]);

    const { problems, recorded, dir } = await publishFrom(loadReport(path), LIVE);
    expect(problems).toEqual([]);
    expect(recorded.pushed.sort()).toEqual([...PUBLISHABLE].sort());
    expect(recorded.committed).toEqual([["cryptomator"]]);
    expect(readPackage("cryptomator", dir).nuspec).toContain("<version>1.19.7</version>");
  });
});

describe("publishPackages", () => {
  test("pushes every package whose version is absent and commits only the rewritten one", async () => {
    const { problems, recorded, dir } = await runPublish(LIVE);
    expect(problems).toEqual([]);
    expect(recorded.pushed.sort()).toEqual([...PUBLISHABLE].sort());
    expect(recorded.committed).toEqual([["cryptomator"]]);
    expect(readPackage("cryptomator", dir).nuspec).toContain("<version>1.19.7</version>");
  });

  test("never pushes a version the feed already has, in any status", async () => {
    for (const status of ["approved", "submitted", "rejected"] as const) {
      const { recorded } = await runPublish({
        upstream: LIVE.upstream ?? {},
        feed: { "cryptomator@1.19.7": status },
      });
      expect(recorded.pushed).toEqual([]);
    }
  });

  test("after a crash between push and commit the files are rewritten and committed, and nothing is pushed", async () => {
    for (const status of ["submitted", "approved"] as const) {
      const { problems, recorded, dir } = await runPublish({
        upstream: LIVE.upstream ?? {},
        feed: { "cryptomator@1.19.7": status },
      });
      expect(problems).toEqual([]);
      expect(recorded.pushed).toEqual([]);
      expect(recorded.committed).toEqual([["cryptomator"]]);
      expect(readPackage("cryptomator", dir).nuspec).toContain("<version>1.19.7</version>");
    }
  });

  test("does not push a package whose files differ from the ones prepare tested", async () => {
    const { problems, recorded } = await runPublish(LIVE, {
      tamper: (entries) =>
        entries.map((reported) => (reported.id === "project64" ? { ...reported, hash: "0".repeat(64) } : reported)),
    });
    expect(recorded.pushed.sort()).toEqual(PUBLISHABLE.filter((id) => id !== "project64").sort());
    expect(problems).toEqual(["project64: not pushed: its files differ from the ones prepare tested"]);
    expect(recorded.committed).toEqual([["cryptomator"]]);
  });

  test("does not push a package whose install test failed, and does not hold back the others", async () => {
    const { problems, recorded, dir } = await runPublish(LIVE, { failInstall: ["cryptomator"] });
    expect(recorded.pushed).not.toContain("cryptomator");
    expect(recorded.pushed.sort()).toEqual(PUBLISHABLE.filter((id) => id !== "cryptomator").sort());
    expect(recorded.committed).toEqual([]);
    expect(readPackage("cryptomator", dir).nuspec).toContain("<version>1.19.2</version>");
    expect(problems).toEqual(["cryptomator: not pushed: its install test did not pass"]);
  });

  test("a failed push restores that package's files, is reported, and does not block the others", async () => {
    const { problems, recorded, dir } = await runPublish(LIVE, { pushOutcomes: { cryptomator: "failed" } });
    expect(recorded.pushed.sort()).toEqual([...PUBLISHABLE].sort());
    expect(recorded.committed).toEqual([]);
    expect(readPackage("cryptomator", dir).nuspec).toContain("<version>1.19.2</version>");
    expect(problems).toEqual(["cryptomator: choco push failed"]);
  });

  test("a push answered with a conflict counts as done and is committed", async () => {
    const { problems, recorded } = await runPublish(LIVE, { pushOutcomes: { cryptomator: "already-published" } });
    expect(problems).toEqual([]);
    expect(recorded.committed).toEqual([["cryptomator"]]);
  });

  test("a failing commit is reported", async () => {
    const { problems } = await runPublish(LIVE, {
      git: {
        async commitAndPush() {
          throw new Error("rejected by remote");
        },
      },
    });
    expect(problems).toEqual(["commit: rejected by remote"]);
  });

  test("a rejected version is an error and is never pushed", async () => {
    const { problems, recorded } = await runPublish({
      upstream: LIVE.upstream ?? {},
      feed: { "cryptomator@1.19.7": "rejected" },
    });
    expect(recorded.pushed).toEqual([]);
    expect(problems).toEqual(["cryptomator: 1.19.7 was rejected by Chocolatey moderation; publish a fix version"]);
  });

  test("a nuspec newer than upstream is an error and is never rewritten", async () => {
    const { problems, recorded, dir } = await runPublish({ upstream: { cryptomator: "1.19.1" } });
    expect(recorded.pushed).toEqual([]);
    expect(recorded.committed).toEqual([]);
    expect(problems[0]).toContain("is newer than upstream");
    expect(readPackage("cryptomator", dir).nuspec).toContain("<version>1.19.2</version>");
  });

  test("an unreadable prepare report pushes nothing", async () => {
    const { problems, recorded } = await runPublish(LIVE, { tamper: () => [] });
    expect(recorded.pushed).toEqual([]);
    expect(problems).toEqual(PUBLISHABLE.map((id) => `${id}: not pushed: prepare reported nothing for this package`));
  });

  test("a failure on a lookup the decision does not use cannot hold back a push", async () => {
    const { problems, recorded } = await runPublish({
      ...LIVE,
      feedFailures: ["cryptomator@1.19.2"],
      listingFails: true,
    });
    expect(problems).toEqual([]);
    expect(recorded.pushed.sort()).toEqual([...PUBLISHABLE].sort());
    expect(recorded.committed).toEqual([["cryptomator"]]);
  });
});
