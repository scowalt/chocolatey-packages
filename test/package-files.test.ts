import { describe, expect, test } from "bun:test";
import { applyRevision, nuspecVersion, type PackageFiles } from "../src/package-files.ts";

const files: PackageFiles = {
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
  checksum: "bbbb",
};

describe("applyRevision", () => {
  test("rewrites the version, the url and the checksum and nothing else", () => {
    const next = applyRevision(files, revision);
    expect(nuspecVersion(next.nuspec)).toBe("1.1.0");
    expect(next.nuspec).toContain('<dependency id="core" version="1.3.1" />');
    expect(next.install).toContain("$url = 'https://example.test/demo-1.1.0.msi'");
    expect(next.install).toContain("$checksum = 'bbbb'");
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
