import { writeFileSync } from "node:fs";
import type { Choco } from "./choco.ts";
import { derivePackage } from "./derive.ts";
import type { Http } from "./http.ts";
import { PACKAGES_DIR, hashPackage } from "./package-files.ts";
import { definitionOf, packages } from "./registry.ts";
import { serializeReport } from "./report.ts";
import { failures, forEachPackage } from "./runner.ts";
import { verifyPackages } from "./verify.ts";

export async function planPackages(http: Http, dir: string = PACKAGES_DIR): Promise<string[]> {
  const outcomes = await forEachPackage(
    packages.map((definition) => definition.id),
    "plan",
    (id) => derivePackage(definitionOf(id), http, dir),
  );
  return failures(outcomes);
}

export async function installPackages(
  out: string,
  choco: Pick<Choco, "pack" | "installAndUninstall">,
  reportPath: string,
  dir: string = PACKAGES_DIR,
): Promise<readonly string[]> {
  const ids = packages.map((definition) => definition.id);
  const hashed = ids.map((id) => ({ id, hash: hashPackage(id, dir) }));
  const verification = await verifyPackages(ids, out, choco);
  writeFileSync(
    reportPath,
    serializeReport(hashed.map((entry) => ({ ...entry, installed: verification.passed.includes(entry.id) }))),
  );
  return verification.failures;
}
