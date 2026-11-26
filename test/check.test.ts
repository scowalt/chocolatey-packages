import { describe, expect, test } from "bun:test";
import { checkPackages } from "../src/check.ts";
import { buildWorld } from "./world.ts";

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
});
