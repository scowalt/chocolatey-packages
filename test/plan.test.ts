import { describe, expect, test } from "bun:test";
import type { FeedStatus } from "../src/community.ts";
import { actionable, plan, samePlan, versionsToLookUp, type Plan } from "../src/plan.ts";
import { parseNuspecVersion } from "../src/version.ts";

function planFor(nuspec: string, upstream: string, feed: Record<string, FeedStatus>): Plan {
  return plan(parseNuspecVersion(nuspec), upstream, feed);
}

describe("plan", () => {
  test("a new package at upstream's version is published", () => {
    expect(planFor("1.55.6", "1.55.6", { "1.55.6": "absent" })).toEqual({
      kind: "publish",
      version: "1.55.6",
      rewrite: false,
    });
  });

  test("a fix version of upstream's release is published", () => {
    expect(planFor("3.0.1.20261126", "3.0.1", { "3.0.1.20261126": "absent" })).toEqual({
      kind: "publish",
      version: "3.0.1.20261126",
      rewrite: false,
    });
  });

  test("an approved version is not published", () => {
    expect(planFor("1.19.2", "1.19.2", { "1.19.2": "approved" })).toEqual({
      kind: "approved",
      version: "1.19.2",
      rewrite: false,
    });
  });

  test("a version waiting in moderation is not published again", () => {
    expect(planFor("1.19.2", "1.19.2", { "1.19.2": "submitted" })).toEqual({
      kind: "moderation",
      version: "1.19.2",
      rewrite: false,
    });
  });

  test("a rejected version is a problem and is not published", () => {
    const decision = planFor("1.19.2", "1.19.2", { "1.19.2": "rejected" });
    expect(decision.kind).toBe("rejected");
    expect(() => actionable(decision)).toThrow("rejected");
  });

  test("a newer upstream rewrites to upstream's version and publishes it", () => {
    expect(planFor("1.19.2", "1.19.7", { "1.19.7": "absent" })).toEqual({
      kind: "publish",
      version: "1.19.7",
      rewrite: true,
    });
  });

  test("a newer upstream than a fix version rewrites to upstream's version", () => {
    expect(planFor("3.0.1.20261126", "3.0.2", { "3.0.2": "absent" })).toEqual({
      kind: "publish",
      version: "3.0.2",
      rewrite: true,
    });
  });

  test("an upstream older than the nuspec is ahead and nothing is rewritten", () => {
    const decision = planFor("1.19.8", "1.19.7", {});
    expect(decision).toEqual({ kind: "ahead", nuspec: "1.19.8", upstream: "1.19.7" });
    expect(() => actionable(decision)).toThrow("nothing is rewritten downward");
  });

  test("after a crash between push and commit the files are rewritten again and nothing is pushed", () => {
    for (const status of ["submitted", "approved"] as const) {
      const decision = planFor("1.19.2", "1.19.7", { "1.19.7": status });
      expect(decision).toEqual({
        kind: status === "submitted" ? "moderation" : "approved",
        version: "1.19.7",
        rewrite: true,
      });
    }
  });

  test("a fix version of the current release is kept, not rewritten to upstream's plain version", () => {
    expect(planFor("3.0.1.20261126", "3.0.1", { "3.0.1.20261126": "approved" })).toEqual({
      kind: "approved",
      version: "3.0.1.20261126",
      rewrite: false,
    });
  });

  test("a four segment upstream version equal to the nuspec is kept", () => {
    expect(planFor("6.3.5.94", "6.3.5.94", { "6.3.5.94": "approved" }).kind).toBe("approved");
  });

  test("an upstream version that looks like a fix date does not rewrite forever", () => {
    expect(planFor("2.0.0.20261126", "2.0.0.20261126", { "2.0.0.20261126": "approved" })).toEqual({
      kind: "approved",
      version: "2.0.0.20261126",
      rewrite: false,
    });
  });

  test("compares versions as numbers, not as text", () => {
    expect(planFor("1.19.9", "1.19.10", { "1.19.10": "absent" })).toEqual({
      kind: "publish",
      version: "1.19.10",
      rewrite: true,
    });
  });

  test("a missing feed status is a programming error", () => {
    expect(() => planFor("1.0.0", "1.0.0", {})).toThrow("No feed status for 1.0.0");
  });
});

describe("versionsToLookUp", () => {
  test("is the nuspec's version and upstream's, once each", () => {
    expect(versionsToLookUp(parseNuspecVersion("1.0.0"), "1.0.0")).toEqual(["1.0.0"]);
    expect(versionsToLookUp(parseNuspecVersion("3.0.1.20261126"), "3.0.2")).toEqual([
      "3.0.1.20261126",
      "3.0.2",
    ]);
  });
});

describe("samePlan", () => {
  test("compares kind, version and rewrite", () => {
    const publish: Plan = { kind: "publish", version: "1.0.0", rewrite: false };
    expect(samePlan(publish, { ...publish })).toBe(true);
    expect(samePlan(publish, { ...publish, rewrite: true })).toBe(false);
    expect(samePlan(publish, { ...publish, version: "1.0.1" })).toBe(false);
    expect(samePlan(publish, { kind: "approved", version: "1.0.0", rewrite: false })).toBe(false);
    expect(samePlan(publish, { kind: "ahead", nuspec: "2", upstream: "1" })).toBe(false);
  });
});
