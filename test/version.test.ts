import { describe, expect, test } from "bun:test";
import { compareVersions, isCurrent, newestVersion } from "../src/version.ts";

describe("isCurrent", () => {
  test("a nuspec equal to upstream is current", () => {
    expect(isCurrent("1.19.7", "1.19.7")).toBe(true);
  });

  test("upstream plus an eight digit date is a package fix of that release", () => {
    expect(isCurrent("3.0.1.20261126", "3.0.1")).toBe(true);
  });

  test("an older release is behind", () => {
    expect(isCurrent("1.19.2", "1.19.7")).toBe(false);
  });

  test("a fix of an older release is behind the newer release", () => {
    expect(isCurrent("3.0.1.20261126", "3.0.2")).toBe(false);
  });

  test("a different suffix is not a date fix", () => {
    expect(isCurrent("3.0.1.211012", "3.0.1")).toBe(false);
    expect(isCurrent("3.0.1.5", "3.0.1")).toBe(false);
  });

  test("a prefix of a longer segment is not current", () => {
    expect(isCurrent("1.19.70", "1.19.7")).toBe(false);
  });
});

describe("compareVersions", () => {
  test("compares segment by segment as numbers", () => {
    expect(compareVersions("1.19.10", "1.19.9")).toBeGreaterThan(0);
    expect(compareVersions("6.3.5.94", "6.3.5.94")).toBe(0);
    expect(compareVersions("3.0.1", "3.0.1.20261126")).toBeLessThan(0);
  });

  test("rejects text that is not a numeric version", () => {
    expect(() => compareVersions("1.0.0-beta", "1.0.0")).toThrow();
  });
});

describe("newestVersion", () => {
  test("picks the highest numeric version and ignores others", () => {
    expect(newestVersion(["5.00.2334", "6.3.5.94", "6.3.2.88", "7.0-beta"])).toBe("6.3.5.94");
  });

  test("is null for an empty list", () => {
    expect(newestVersion([])).toBeNull();
  });
});
