import { describe, expect, test } from "bun:test";
import { checkPackages, renderTable, type CheckRow } from "../src/check.ts";
import type { Plan } from "../src/plan.ts";
import type { Outcome } from "../src/runner.ts";
import { buildWorld } from "./world.ts";

function row(id: string, plan: Plan, nuspec = "1.0.0", latestApproved: string | null = "1.0.0"): CheckRow {
  return {
    id,
    nuspec: { upstream: nuspec },
    upstream: { version: "1.0.0", downloadUrl: "https://example.test" },
    latestApproved,
    plan,
  };
}

function ok(value: CheckRow): Outcome<CheckRow> {
  return { id: value.id, ok: true, value };
}

describe("checkPackages", () => {
  test("all seven packages current and approved is healthy", async () => {
    const { http } = buildWorld();
    const { report, problems } = await checkPackages(http);
    expect(problems).toEqual([]);
    expect(report.split("\n").filter((line) => line.endsWith("current"))).toHaveLength(7);
  });

  test("reports one row per package and every problem", async () => {
    const { http } = buildWorld({
      upstream: { cryptomator: "1.19.7" },
      feed: {
        "cryptomator@1.19.7": "absent",
        "project64@3.0.1.20261126": "absent",
        "hearthstone-deck-tracker@1.55.6": "absent",
        "hearthstone-deck-tracker-arena-helper@0.9.6": "submitted",
        "stepmania@5.0.12": "rejected",
      },
      feedFailures: ["depressurizer@5.3.0"],
    });
    const { report, problems } = await checkPackages(http);
    expect(problems).toEqual([
      "cryptomator: behind",
      "depressurizer: GET https://community.chocolatey.org/api/v2/Packages(Id='depressurizer',Version='5.3.0') returned 503",
      "project64: unpublished",
      "stepmania: rejected",
      "hearthstone-deck-tracker: unpublished",
    ]);
    expect(report).toContain("hearthstone-deck-tracker-arena-helper");
    expect(report).toContain("moderation");
  });

  test("a nuspec newer than upstream is reported as ahead", async () => {
    const { http } = buildWorld({ upstream: { depressurizer: "5.2.9" } });
    const { problems } = await checkPackages(http);
    expect(problems).toEqual(["depressurizer: ahead"]);
  });

  test("the community column shows the newest approved version, and a failing listing is an error row", async () => {
    const { http } = buildWorld({ listingFails: true });
    const { report, problems } = await checkPackages(http);
    expect(problems).toHaveLength(7);
    expect(report).toContain("error: GET https://community.chocolatey.org/api/v2/FindPackagesById()");
  });
});

describe("renderTable", () => {
  test("aligns one row per package under a header", () => {
    const rows = renderTable([
      ok(row("a", { kind: "approved", version: "1.0.0", rewrite: false }, "1.0.0", "1.0.0")),
      { id: "long-id", ok: false, message: "boom" },
    ]);
    expect(rows.split("\n")).toEqual([
      "package  nuspec  community  upstream  state",
      "-------  ------  ---------  --------  -----------",
      "a        1.0.0   1.0.0      1.0.0     current",
      "long-id  -       -          -         error: boom",
    ]);
  });

  test("shows a fix version in full and a dash when nothing is approved", () => {
    const fixed = row("p", { kind: "publish", version: "3.0.1.20261126", rewrite: false }, "3.0.1", null);
    const line = renderTable([ok({ ...fixed, nuspec: { upstream: "3.0.1", fixDate: "20261126" } })]).split("\n")[2];
    expect(line).toBe("p        3.0.1.20261126  -          1.0.0     unpublished");
  });
});
