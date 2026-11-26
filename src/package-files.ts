import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const PACKAGES_DIR = join(import.meta.dir, "..", "packages");

export interface PackageFiles {
  readonly nuspec: string;
  readonly install: string;
}

export interface PackagePaths {
  readonly nuspec: string;
  readonly install: string;
}

export function pathsFor(id: string): PackagePaths {
  const folder = join(PACKAGES_DIR, id);
  return {
    nuspec: join(folder, `${id}.nuspec`),
    install: join(folder, "tools", "chocolateyInstall.ps1"),
  };
}

export function readPackage(id: string): PackageFiles {
  const paths = pathsFor(id);
  return {
    nuspec: readFileSync(paths.nuspec, "utf8"),
    install: readFileSync(paths.install, "utf8"),
  };
}

export function writePackage(id: string, files: PackageFiles): void {
  const paths = pathsFor(id);
  writeFileSync(paths.nuspec, files.nuspec);
  writeFileSync(paths.install, files.install);
}

const VERSION_ELEMENT = /<version>[^<]*<\/version>/g;
const URL_LINE = /^(\$url = ')[^']*(')/gm;
const CHECKSUM_LINE = /^(\$checksum = ')[^']*(')/gm;

function replaceExactlyOnce(
  text: string,
  pattern: RegExp,
  rewrite: (match: string, ...groups: string[]) => string,
  what: string,
): string {
  const matches = text.match(pattern)?.length ?? 0;
  if (matches !== 1) throw new Error(`Expected exactly one ${what}, found ${matches}`);
  return text.replace(pattern, rewrite);
}

function keepEnds(value: string): (match: string, open: string, close: string) => string {
  return (_match, open, close) => `${open}${value}${close}`;
}

export function nuspecVersion(nuspec: string): string {
  const match = /<version>([^<]*)<\/version>/.exec(nuspec);
  if (match?.[1] === undefined) throw new Error("No <version> in nuspec");
  return match[1].trim();
}

export interface Revision {
  readonly version: string;
  readonly url: string;
  readonly checksum: string;
}

export function applyRevision(files: PackageFiles, revision: Revision): PackageFiles {
  return {
    nuspec: replaceExactlyOnce(
      files.nuspec,
      VERSION_ELEMENT,
      () => `<version>${revision.version}</version>`,
      "<version> element",
    ),
    install: replaceExactlyOnce(
      replaceExactlyOnce(files.install, URL_LINE, keepEnds(revision.url), "$url line"),
      CHECKSUM_LINE,
      keepEnds(revision.checksum),
      "$checksum line",
    ),
  };
}
