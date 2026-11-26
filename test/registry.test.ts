import { describe, expect, test } from "bun:test";
import { readdirSync } from "node:fs";
import { PACKAGES_DIR, applyRevision, nuspecVersion, readPackage } from "../src/package-files.ts";
import { packages } from "../src/registry.ts";
import { versionText } from "../src/version.ts";

describe("registry", () => {
  test("every folder under packages is registered and every entry has a folder", () => {
    const folders = readdirSync(PACKAGES_DIR).sort();
    expect(packages.map((definition) => definition.id).sort()).toEqual(folders);
  });

  for (const { id } of packages) {
    describe(id, () => {
      const files = readPackage(id);

      test("the nuspec id matches the registry id", () => {
        expect(files.nuspec).toContain(`<id>${id}</id>`);
      });

      test("the nuspec has a numeric version", () => {
        expect(versionText(nuspecVersion(files.nuspec))).toMatch(/^\d+(\.\d+)*$/);
      });

      test("the nuspec points at this folder as its package source", () => {
        expect(files.nuspec).toContain(
          `<packageSourceUrl>https://github.com/scowalt/chocolatey-packages/tree/master/packages/${id}</packageSourceUrl>`,
        );
      });

      test("the install script has the one url line and the one checksum line the updater rewrites", () => {
        expect(() =>
          applyRevision(files, { version: "1.0", url: "https://example.test/x", checksum: "0".repeat(64) }),
        ).not.toThrow();
        expect(files.install).toMatch(/^\$checksum = '[0-9a-f]{64}'$/m);
        expect(files.install).toMatch(/^\$url = 'https:\/\/[^']+'$/m);
      });
    });
  }
});
