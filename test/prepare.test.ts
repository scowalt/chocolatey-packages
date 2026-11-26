import { describe, expect, test } from "bun:test";
import { appendFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hashPackage, pathsFor, readPackage } from "../src/package-files.ts";
import { installPackages, planPackages } from "../src/prepare.ts";
import { packages } from "../src/registry.ts";
import { loadReport } from "../src/report.ts";
import { verifyPackages } from "../src/verify.ts";
import { copyOfPackages, fakeChoco } from "./support.ts";
import { buildWorld } from "./world.ts";

const ALL = packages.map((definition) => definition.id);

function reportPath(): string {
  return join(mkdtempSync(join(tmpdir(), "report-")), "prepare-report.json");
}

describe("verifyPackages", () => {
  test("packs and installs every package and keeps going after a failure", async () => {
    const choco = fakeChoco({ failInstall: ["project64"], failPack: ["stepmania"] });
    const verification = await verifyPackages(packages, "out", choco);
    expect(verification.passed).toEqual(ALL.filter((id) => id !== "project64" && id !== "stepmania"));
    expect(verification.failures).toEqual(["stepmania: pack stepmania failed", "project64: install project64 failed"]);
    expect(choco.installed).not.toContain("stepmania");
  });
});

describe("planPackages", () => {
  test("rewrites the packages that are behind and leaves the others as they were", async () => {
    const dir = copyOfPackages();
    const problems = await planPackages(
      buildWorld({
        upstream: { cryptomator: "1.19.7" },
        feed: { "cryptomator@1.19.7": "absent", "project64@3.0.1.20261126": "absent" },
      }).http,
      dir,
    );
    expect(problems).toEqual([]);
    expect(readPackage("cryptomator", dir).nuspec).toContain("<version>1.19.7</version>");
    for (const id of ALL.filter((candidate) => candidate !== "cryptomator")) {
      expect(readPackage(id, dir)).toEqual(readPackage(id));
    }
  });

  test("a package that cannot be planned is a problem and does not stop the others", async () => {
    const dir = copyOfPackages();
    const problems = await planPackages(
      buildWorld({
        upstream: { cryptomator: "1.19.7" },
        feed: { "cryptomator@1.19.7": "absent", "stepmania@5.0.12": "rejected" },
      }).http,
      dir,
    );
    expect(problems).toEqual(["stepmania: 5.0.12 was rejected by Chocolatey moderation; publish a fix version"]);
    expect(readPackage("cryptomator", dir).nuspec).toContain("<version>1.19.7</version>");
  });
});

describe("installPackages", () => {
  test("writes one entry per package with its files' hash and whether its install passed", async () => {
    const dir = copyOfPackages();
    const path = reportPath();
    const choco = fakeChoco({ failInstall: ["project64"] });
    const problems = await installPackages("out", choco, path, dir);
    expect(problems).toEqual(["project64: install project64 failed"]);
    expect(choco.installed.sort()).toEqual([...ALL].sort());
    expect(loadReport(path)).toEqual(
      ALL.map((id) => ({ id, hash: hashPackage(id, dir), installed: id !== "project64" })),
    );
  });

  test("hashes every package before any installer runs", async () => {
    const dir = copyOfPackages();
    const path = reportPath();
    const before = hashPackage("stepmania", dir);
    const choco = fakeChoco({
      duringInstall: (id) => {
        if (id === ALL[0]) appendFileSync(pathsFor("stepmania", dir).install, "tampered\n");
      },
    });
    await installPackages("out", choco, path, dir);
    expect(hashPackage("stepmania", dir)).not.toBe(before);
    expect(loadReport(path).find((entry) => entry.id === "stepmania")?.hash).toBe(before);
  });
});
