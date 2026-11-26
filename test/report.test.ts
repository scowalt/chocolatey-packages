import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadReport, parseReport, serializeReport, type PrepareEntry } from "../src/report.ts";

const entries: PrepareEntry[] = [
  { id: "a", hash: "h", installed: true },
  { id: "b", hash: "i", installed: false },
];

describe("report", () => {
  test("round trips", () => {
    expect(parseReport(serializeReport(entries))).toEqual(entries);
  });

  test("keeps only an id, a hash and whether the install passed", () => {
    const text = '[{"id":"a","hash":"h","installed":true,"plan":{"kind":"publish"},"failures":["::error::x"]}]';
    expect(parseReport(text)).toEqual([{ id: "a", hash: "h", installed: true }]);
  });

  test("refuses anything that is not a well formed report", () => {
    const bad = [
      "not json",
      "{}",
      "[1]",
      '[{"id":"a"}]',
      '[{"id":"a","hash":"h","installed":"true"}]',
      '[{"id":1,"hash":"h","installed":true}]',
    ];
    for (const text of bad) expect(() => parseReport(text)).toThrow();
  });

  test("an unreadable file is an empty report, never a crash", () => {
    const directory = mkdtempSync(join(tmpdir(), "report-"));
    expect(loadReport(join(directory, "missing.json"))).toEqual([]);

    const corrupt = join(directory, "corrupt.json");
    writeFileSync(corrupt, "{");
    expect(loadReport(corrupt)).toEqual([]);
  });
});
