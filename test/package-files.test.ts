import { describe, expect, test } from "bun:test";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { applyRevision, hashPackage, nuspecVersion, readPackage, writePackage, type FilePair } from "../src/package-files.ts";
import { copyOfPackages } from "./support.ts";

const files: FilePair = {
  nuspec: `<package><metadata><id>demo</id><version>1.0.0</version>
<dependencies><dependency id="core" version="1.3.1" /></dependencies></metadata></package>\n`,
  install: `$ErrorActionPreference = 'Stop'
$url = 'https://example.test/demo-1.0.0.msi'
$checksum = 'aaaa'
$packageArgs = @{ url = $url; checksum = $checksum }
Install-ChocolateyPackage @packageArgs\n`,
};

const revision = {
  version: "1.1.0",
  url: "https://example.test/demo-1.1.0.msi",
  checksum: "b".repeat(64),
};

describe("applyRevision", () => {
  test("rewrites the version, the url and the checksum and nothing else", () => {
    const next = applyRevision(files, revision);
    expect(nuspecVersion(next.nuspec)).toEqual({ upstream: "1.1.0" });
    expect(next.nuspec).toContain('<dependency id="core" version="1.3.1" />');
    expect(next.install).toContain("$url = 'https://example.test/demo-1.1.0.msi'");
    expect(next.install).toContain(`$checksum = '${"b".repeat(64)}'`);
    expect(next.install).toContain("$packageArgs = @{ url = $url; checksum = $checksum }");
  });

  test("a second application with the same revision changes nothing", () => {
    const once = applyRevision(files, revision);
    expect(applyRevision(once, revision)).toEqual(once);
  });

  test("keeps a byte order mark and the original quotes around the value", () => {
    const withBom = { ...files, install: `\uFEFF${files.install}` };
    expect(applyRevision(withBom, revision).install.startsWith("\uFEFF$ErrorActionPreference")).toBe(true);
  });

  test("a dollar sign in a value is written literally", () => {
    const next = applyRevision(files, { ...revision, url: "https://example.test/$&-setup.exe" });
    expect(next.install).toContain("$url = 'https://example.test/$&-setup.exe'");
  });

  test("refuses a script with no checksum line", () => {
    const broken = { ...files, install: files.install.replace("$checksum = 'aaaa'", "") };
    expect(() => applyRevision(broken, revision)).toThrow("exactly one $checksum line, found 0");
  });

  test("refuses a script with two url lines", () => {
    const broken = { ...files, install: `${files.install}$url = 'https://example.test/other'\n` };
    expect(() => applyRevision(broken, revision)).toThrow("exactly one $url line, found 2");
  });
});

describe("applyRevision validation", () => {
  test("refuses a URL with a quote or whitespace", () => {
    for (const url of ["https://example.test/a'b", "https://example.test/a b", "https://example.test/a\nb"]) {
      expect(() => applyRevision(files, { ...revision, url })).toThrow("quote or whitespace");
    }
  });

  test("refuses a checksum that is not 64 lowercase hex characters", () => {
    for (const checksum of ["bbbb", "B".repeat(64), "g".repeat(64), "b".repeat(65), ""]) {
      expect(() => applyRevision(files, { ...revision, checksum })).toThrow("64 lowercase hex");
    }
  });

  test("refuses a version NuGet would not accept", () => {
    for (const version of ["1.0.0-beta", "1.2.3.4.5", "latest", ""]) {
      expect(() => applyRevision(files, { ...revision, version })).toThrow();
    }
  });
});

describe("nuspecVersion", () => {
  test("splits a fix date off a three segment version", () => {
    expect(nuspecVersion("<version>3.0.1.20261126</version>")).toEqual({ upstream: "3.0.1", fixDate: "20261126" });
  });

  test("refuses a nuspec with more than four segments", () => {
    expect(() => nuspecVersion("<version>6.3.5.94.20261126</version>")).toThrow("at most 4");
  });

  test("refuses a nuspec with no version", () => {
    expect(() => nuspecVersion("<package/>")).toThrow("No <version>");
  });
});

describe("hashPackage", () => {
  test("is stable for unchanged files", () => {
    const dir = copyOfPackages();
    expect(hashPackage("cryptomator", dir)).toBe(hashPackage("cryptomator", dir));
  });

  test("changes when the install script changes", () => {
    const dir = copyOfPackages();
    const before = hashPackage("cryptomator", dir);
    const original = readPackage("cryptomator", dir);
    writePackage("cryptomator", { ...original, install: `${original.install}\n` }, dir);
    expect(hashPackage("cryptomator", dir)).not.toBe(before);
  });

  test("changes when any other file in the package changes", () => {
    const dir = copyOfPackages();
    const before = hashPackage("cryptomator", dir);
    const uninstall = join(dir, "cryptomator", "tools", "chocolateyUninstall.ps1");
    writeFileSync(uninstall, `${readFileSync(uninstall, "utf8")}\n`);
    expect(hashPackage("cryptomator", dir)).not.toBe(before);
  });

  test("changes when a file is added", () => {
    const dir = copyOfPackages();
    const before = hashPackage("cryptomator", dir);
    writeFileSync(join(dir, "cryptomator", "tools", "extra.ps1"), "x");
    expect(hashPackage("cryptomator", dir)).not.toBe(before);
  });
});
