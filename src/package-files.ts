import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseNuspecVersion, type NuspecVersion } from "./version.ts";

export const PACKAGES_DIR = join(import.meta.dir, "..", "packages");

export interface FilePair {
  readonly nuspec: string;
  readonly install: string;
}

export function pathsFor(id: string, dir: string = PACKAGES_DIR): FilePair {
  const folder = join(dir, id);
  return {
    nuspec: join(folder, `${id}.nuspec`),
    install: join(folder, "tools", "chocolateyInstall.ps1"),
  };
}

export function readPackage(id: string, dir: string = PACKAGES_DIR): FilePair {
  const paths = pathsFor(id, dir);
  return {
    nuspec: readFileSync(paths.nuspec, "utf8"),
    install: readFileSync(paths.install, "utf8"),
  };
}

export function writePackage(id: string, files: FilePair, dir: string = PACKAGES_DIR): void {
  const paths = pathsFor(id, dir);
  writeFileSync(paths.nuspec, files.nuspec);
  writeFileSync(paths.install, files.install);
}

export function hashPackage(id: string, dir: string = PACKAGES_DIR): string {
  const folder = join(dir, id);
  const files = readdirSync(folder, { recursive: true, encoding: "utf8" })
    .map((entry) => entry.replaceAll("\\", "/"))
    .filter((entry) => statSync(join(folder, entry)).isFile())
    .sort();
  const hash = createHash("sha256");
  for (const file of files) {
    const content = createHash("sha256").update(readFileSync(join(folder, file))).digest("hex");
    hash.update(`${file}\0${content}\n`);
  }
  return hash.digest("hex");
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

export function nuspecVersion(nuspec: string): NuspecVersion {
  const match = /<version>([^<]*)<\/version>/.exec(nuspec);
  if (match?.[1] === undefined) throw new Error("No <version> in nuspec");
  return parseNuspecVersion(match[1].trim());
}

export interface Revision {
  readonly version: string;
  readonly url: string;
  readonly checksum: string;
}

const CHECKSUM = /^[0-9a-f]{64}$/;
const UNSAFE_URL = /['\s]/;

function assertRevision(revision: Revision): void {
  parseNuspecVersion(revision.version);
  if (UNSAFE_URL.test(revision.url)) {
    throw new Error(`A download URL must not contain a quote or whitespace: ${JSON.stringify(revision.url)}`);
  }
  if (!CHECKSUM.test(revision.checksum)) {
    throw new Error(`A checksum must be 64 lowercase hex characters: ${JSON.stringify(revision.checksum)}`);
  }
}

export function applyRevision(files: FilePair, revision: Revision): FilePair {
  assertRevision(revision);
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
