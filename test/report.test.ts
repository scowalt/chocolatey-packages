import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadReport, parseReport, serializeReport, type PrepareReport } from "../src/report.ts";

const report: PrepareReport = {
  packages: [
    { id: "a", plan: { kind: "publish", version: "1.0.0", rewrite: true }, hash: "h", installed: true },
    { id: "b", plan: { kind: "approved", version: "2.0.0", rewrite: false }, hash: "i", installed: false },
  ],
  failures: ["c: boom"],
};

describe("report", () => {
  test("round trips", () => {
    expect(parseReport(serializeReport(report))).toEqual(report);
  });

  test("refuses anything that is not a well formed report", () => {
    const bad = [
      "not json",
      "[]",
      '{"packages":[],"failures":[1]}',
      '{"packages":[{"id":"a"}],"failures":[]}',
      '{"packages":[{"id":"a","plan":{"kind":"explode"},"hash":"h","installed":true}],"failures":[]}',
      '{"packages":[{"id":"a","plan":{"kind":"publish","version":"1","rewrite":"yes"},"hash":"h","installed":true}],"failures":[]}',
      '{"packages":[{"id":"a","plan":{"kind":"publish","version":"1","rewrite":true},"hash":"h","installed":"true"}],"failures":[]}',
    ];
    for (const text of bad) expect(() => parseReport(text)).toThrow();
  });

  test("an unreadable file is a report with no packages and a failure, never a crash", () => {
    const directory = mkdtempSync(join(tmpdir(), "report-"));
    const missing = loadReport(join(directory, "missing.json"));
    expect(missing.packages).toEqual([]);
    expect(missing.failures[0]).toContain("prepare report unreadable");

    const corrupt = join(directory, "corrupt.json");
    writeFileSync(corrupt, "{");
    expect(loadReport(corrupt).packages).toEqual([]);
  });
});
