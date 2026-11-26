import { describe, expect, test } from "bun:test";
import type { FeedStatus } from "../src/community.ts";
import { plan, targetOf, type Plan } from "../src/plan.ts";
import { parseNuspecVersion } from "../src/version.ts";

function target(nuspec: string, upstream: string) {
  return targetOf(parseNuspecVersion(nuspec), upstream);
}

function planFor(nuspec: string, upstream: string, status: FeedStatus): Plan {
  const chosen = target(nuspec, upstream);
  return chosen.kind === "ahead" ? chosen : plan(chosen, status);
}

describe("targetOf", () => {
  test("a newer upstream is the target and rewrites the package", () => {
    expect(target("1.19.2", "1.19.7")).toEqual({ kind: "target", version: "1.19.7", rewrite: true });
  });

  test("an equal upstream keeps the nuspec's version", () => {
    expect(target("1.19.2", "1.19.2")).toEqual({ kind: "target", version: "1.19.2", rewrite: false });
  });

  test("a fix version of the current release is kept, not rewritten to upstream's plain version", () => {
    expect(target("3.0.1.20261126", "3.0.1")).toEqual({
      kind: "target",
      version: "3.0.1.20261126",
      rewrite: false,
    });
  });

  test("a newer upstream than a fix version rewrites to upstream's version", () => {
    expect(target("3.0.1.20261126", "3.0.2")).toEqual({ kind: "target", version: "3.0.2", rewrite: true });
  });

  test("a four segment upstream version equal to the nuspec is kept", () => {
    expect(target("6.3.5.94", "6.3.5.94")).toEqual({ kind: "target", version: "6.3.5.94", rewrite: false });
  });

  test("an upstream version that looks like a fix date does not rewrite forever", () => {
    expect(target("2.0.0.20261126", "2.0.0.20261126")).toEqual({
      kind: "target",
      version: "2.0.0.20261126",
      rewrite: false,
    });
  });

  test("compares versions as numbers, not as text", () => {
    expect(target("1.19.9", "1.19.10")).toEqual({ kind: "target", version: "1.19.10", rewrite: true });
  });

  test("an upstream older than the nuspec is ahead and nothing is rewritten", () => {
    expect(target("1.19.8", "1.19.7")).toEqual({ kind: "ahead", version: "1.19.8", upstream: "1.19.7", rewrite: false });
  });
});

describe("plan", () => {
  test("a version the feed does not have is published", () => {
    expect(planFor("1.55.6", "1.55.6", "absent")).toEqual({ kind: "publish", version: "1.55.6", rewrite: false });
  });

  test("a fix version of upstream's release is published", () => {
    expect(planFor("3.0.1.20261126", "3.0.1", "absent")).toEqual({
      kind: "publish",
      version: "3.0.1.20261126",
      rewrite: false,
    });
  });

  test("an approved version is not published", () => {
    expect(planFor("1.19.2", "1.19.2", "approved")).toEqual({ kind: "approved", version: "1.19.2", rewrite: false });
  });

  test("a version waiting in moderation is not published again", () => {
    expect(planFor("1.19.2", "1.19.2", "submitted")).toEqual({ kind: "moderation", version: "1.19.2", rewrite: false });
  });

  test("a rejected version is not published", () => {
    expect(planFor("1.19.2", "1.19.2", "rejected")).toEqual({ kind: "rejected", version: "1.19.2", rewrite: false });
  });

  test("a newer upstream rewrites to upstream's version and publishes it", () => {
    expect(planFor("1.19.2", "1.19.7", "absent")).toEqual({ kind: "publish", version: "1.19.7", rewrite: true });
  });

  test("a rejected version is never rewritten to, even when upstream is newer", () => {
    expect(planFor("1.19.2", "1.19.7", "rejected")).toEqual({ kind: "rejected", version: "1.19.7", rewrite: false });
  });

  test("after a crash between push and commit the files are rewritten again and nothing is pushed", () => {
    expect(planFor("1.19.2", "1.19.7", "submitted")).toEqual({ kind: "moderation", version: "1.19.7", rewrite: true });
    expect(planFor("1.19.2", "1.19.7", "approved")).toEqual({ kind: "approved", version: "1.19.7", rewrite: true });
  });
});
