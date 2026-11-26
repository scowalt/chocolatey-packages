import { describe, expect, test } from "bun:test";
import {
  assertVersion,
  compareVersions,
  newestVersion,
  parseNuspecVersion,
  versionText,
} from "../src/version.ts";

describe("parseNuspecVersion", () => {
  test("a plain version is an upstream version", () => {
    expect(parseNuspecVersion("1.19.7")).toEqual({ upstream: "1.19.7" });
    expect(parseNuspecVersion("6.3.5.94")).toEqual({ upstream: "6.3.5.94" });
  });

  test("three segments plus an eight digit date is a fix of that upstream version", () => {
    expect(parseNuspecVersion("3.0.1.20261126")).toEqual({ upstream: "3.0.1", fixDate: "20261126" });
  });

  test("a fourth segment that is not eight digits belongs to the upstream version", () => {
    expect(parseNuspecVersion("3.0.1.211012")).toEqual({ upstream: "3.0.1.211012" });
  });

  test("text round trips", () => {
    for (const text of ["1.19.7", "6.3.5.94", "3.0.1.20261126"]) {
      expect(versionText(parseNuspecVersion(text))).toBe(text);
    }
  });

  test("rejects what NuGet will not accept", () => {
    for (const text of ["6.3.5.94.20261126", "1.0.0-beta", "1..0", "", "v1.0", "1.0.0.0.0", "1.2147483648"]) {
      expect(() => parseNuspecVersion(text)).toThrow();
    }
  });
});

describe("assertVersion", () => {
  test("returns a valid version unchanged", () => {
    expect(assertVersion("5.0.12")).toBe("5.0.12");
  });

  test("rejects a version with more than four segments", () => {
    expect(() => assertVersion("1.2.3.4.5")).toThrow("at most 4");
  });
});

describe("compareVersions", () => {
  test("compares segment by segment as numbers", () => {
    expect(compareVersions("1.19.10", "1.19.9")).toBeGreaterThan(0);
    expect(compareVersions("6.3.5.94", "6.3.5.94")).toBe(0);
    expect(compareVersions("3.0.1", "3.0.1.20261126")).toBeLessThan(0);
  });

  test("a missing segment counts as zero", () => {
    expect(compareVersions("1.0", "1.0.0")).toBe(0);
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
