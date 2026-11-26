import { describe, expect, test } from "bun:test";
import { classifyPush, createdPackagePath } from "../src/choco.ts";

describe("classifyPush", () => {
  test("a zero exit code is a push", () => {
    expect(classifyPush({ code: 0, output: "Your package was pushed" })).toBe("pushed");
  });

  test("a conflict means the version is already on the feed", () => {
    expect(
      classifyPush({
        code: 1,
        output: "The remote server returned an error: (409) Conflict. The package already exists.",
      }),
    ).toBe("already-published");
  });

  test("any other failure is a failure", () => {
    expect(classifyPush({ code: 1, output: "The remote server returned an error: (403) Forbidden." })).toBe(
      "failed",
    );
  });
});

describe("createdPackagePath", () => {
  test("reads the package file from choco's output", () => {
    expect(createdPackagePath("Successfully created package 'C:\\out\\demo.1.0.0.nupkg'")).toBe(
      "C:\\out\\demo.1.0.0.nupkg",
    );
  });

  test("fails when choco reports no package", () => {
    expect(() => createdPackagePath("nothing")).toThrow("did not report");
  });
});
