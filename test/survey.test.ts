import { describe, expect, test } from "bun:test";
import { classifyPush } from "../src/choco.ts";
import { classify, renderTable, type Standing } from "../src/survey.ts";

describe("classify", () => {
  test("a nuspec behind upstream is behind, whatever the community feed holds", () => {
    expect(classify("1.19.2", "1.19.7", "1.19.2")).toBe("behind");
  });

  test("a current nuspec the community feed lacks is unpublished", () => {
    expect(classify("1.19.7", "1.19.7", "1.19.2")).toBe("unpublished");
    expect(classify("1.19.7", "1.19.7", null)).toBe("unpublished");
  });

  test("a feed holding upstream's version, or a dated fix of it, is current", () => {
    expect(classify("3.0.1.20261126", "3.0.1", "3.0.1.20261126")).toBe("current");
    expect(classify("1.19.7", "1.19.7", "1.19.7")).toBe("current");
  });
});

describe("renderTable", () => {
  test("aligns one row per package under a header", () => {
    const standings: Standing[] = [
      { id: "a", nuspec: "1.0", community: "1.0", upstream: "1.0", state: "current", detail: "" },
      { id: "long-id", nuspec: "1.0", community: null, upstream: null, state: "error", detail: "boom" },
    ];
    expect(renderTable(standings).split("\n")).toEqual([
      "package  nuspec  community  upstream  state",
      "-------  ------  ---------  --------  -----------",
      "a        1.0     1.0        1.0       current",
      "long-id  1.0     -          -         error: boom",
    ]);
  });
});

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
