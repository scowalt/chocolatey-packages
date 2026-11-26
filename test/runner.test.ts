import { describe, expect, test } from "bun:test";
import { allPackages, errorMessage, failures, forEachPackage, values } from "../src/runner.ts";

describe("forEachPackage", () => {
  test("runs every package in order and keeps going after a failure", async () => {
    const seen: string[] = [];
    const outcomes = await forEachPackage(["a", "b", "c"], "step", async (id) => {
      seen.push(id);
      if (id === "b") throw new Error("boom");
      return id.toUpperCase();
    });
    expect(seen).toEqual(["a", "b", "c"]);
    expect(values(outcomes)).toEqual(["A", "C"]);
    expect(failures(outcomes)).toEqual(["b: boom"]);
  });

  test("records a thrown string and a thrown error the same way", async () => {
    const outcomes = await forEachPackage(["a", "b"], "step", async (id) => {
      throw id === "a" ? "plain" : new Error("wrapped");
    });
    expect(failures(outcomes)).toEqual(["a: plain", "b: wrapped"]);
  });
});

describe("allPackages", () => {
  test("collects every outcome", async () => {
    const outcomes = await allPackages(["a", "b"], async (id) => {
      if (id === "a") throw new Error("nope");
      return 1;
    });
    expect(failures(outcomes)).toEqual(["a: nope"]);
    expect(values(outcomes)).toEqual([1]);
  });
});

describe("errorMessage", () => {
  test("is the message of an Error and the text of anything else", () => {
    expect(errorMessage(new Error("x"))).toBe("x");
    expect(errorMessage(42)).toBe("42");
  });
});
