import { describe, expect, test } from "bun:test";
import type { Plan } from "../src/plan.ts";
import { LEGEND, problemsIn, renderTable, standingOf, surveyPackage, type Standing, type Survey } from "../src/survey.ts";
import { definitionOf } from "../src/registry.ts";
import type { Outcome } from "../src/runner.ts";
import { buildWorld } from "./world.ts";

function survey(id: string, plan: Plan, nuspec = "1.0.0", latestApproved: string | null = "1.0.0"): Survey {
  return { id, nuspec: { upstream: nuspec }, upstream: { version: "1.0.0", downloadUrl: "https://example.test" }, latestApproved, plan };
}

function ok(value: Survey): Outcome<Survey> {
  return { id: value.id, ok: true, value };
}

describe("standingOf", () => {
  const cases: readonly [Plan, Standing][] = [
    [{ kind: "approved", version: "1.0.0", rewrite: false }, "current"],
    [{ kind: "moderation", version: "1.0.0", rewrite: false }, "moderation"],
    [{ kind: "publish", version: "1.0.0", rewrite: false }, "unpublished"],
    [{ kind: "publish", version: "1.0.1", rewrite: true }, "behind"],
    [{ kind: "approved", version: "1.0.1", rewrite: true }, "behind"],
    [{ kind: "moderation", version: "1.0.1", rewrite: true }, "behind"],
    [{ kind: "rejected", version: "1.0.0", rewrite: false }, "rejected"],
    [{ kind: "ahead", nuspec: "1.0.1", upstream: "1.0.0" }, "ahead"],
  ];
  for (const [plan, expected] of cases) {
    test(`${plan.kind} is ${expected}`, () => {
      expect(standingOf(plan)).toBe(expected);
    });
  }
});

describe("problemsIn", () => {
  test("only current and waiting in moderation are healthy", () => {
    const outcomes = [
      ok(survey("a", { kind: "approved", version: "1.0.0", rewrite: false })),
      ok(survey("b", { kind: "moderation", version: "1.0.0", rewrite: false })),
      ok(survey("c", { kind: "publish", version: "1.0.0", rewrite: false })),
      ok(survey("d", { kind: "publish", version: "1.0.1", rewrite: true })),
      ok(survey("e", { kind: "ahead", nuspec: "1.0.1", upstream: "1.0.0" })),
      ok(survey("f", { kind: "rejected", version: "1.0.0", rewrite: false })),
      { id: "g", ok: false, message: "boom" } satisfies Outcome<Survey>,
    ];
    expect(problemsIn(outcomes)).toEqual([
      "c: unpublished",
      "d: behind",
      "e: ahead",
      "f: rejected",
      "g: boom",
    ]);
  });
});

describe("renderTable", () => {
  test("aligns one row per package under a header", () => {
    const rows = renderTable([
      ok(survey("a", { kind: "approved", version: "1.0.0", rewrite: false }, "1.0.0", "1.0.0")),
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
    const row = renderTable([
      ok({
        ...survey("p", { kind: "publish", version: "3.0.1.20261126", rewrite: false }, "3.0.1", null),
        nuspec: { upstream: "3.0.1", fixDate: "20261126" },
      }),
    ]).split("\n")[2];
    expect(row).toBe("p        3.0.1.20261126  -          1.0.0     unpublished");
  });

  test("the legend names every state", () => {
    for (const state of ["current", "moderation", "unpublished", "behind", "ahead", "rejected", "error"]) {
      expect(LEGEND).toContain(state);
    }
  });
});

describe("surveyPackage", () => {
  test("reads the nuspec, upstream and the exact version's feed status", async () => {
    const { http } = buildWorld({
      upstream: { cryptomator: "1.19.7" },
      feed: { "cryptomator@1.19.7": "absent" },
    });
    const result = await surveyPackage(definitionOf("cryptomator"), http);
    expect(result.nuspec).toEqual({ upstream: "1.19.2" });
    expect(result.upstream.version).toBe("1.19.7");
    expect(result.plan).toEqual({ kind: "publish", version: "1.19.7", rewrite: true });
  });

  test("a fix version in the nuspec is looked up as it is written", async () => {
    const { http } = buildWorld({ feed: { "project64@3.0.1.20261126": "absent" } });
    const result = await surveyPackage(definitionOf("project64"), http);
    expect(result.nuspec).toEqual({ upstream: "3.0.1", fixDate: "20261126" });
    expect(result.plan).toEqual({ kind: "publish", version: "3.0.1.20261126", rewrite: false });
  });

  test("a failing feed lookup fails the survey rather than reading as absent", async () => {
    const { http } = buildWorld({ feedFailures: ["stepmania@5.0.12"] });
    await expect(surveyPackage(definitionOf("stepmania"), http)).rejects.toThrow("503");
  });
});
