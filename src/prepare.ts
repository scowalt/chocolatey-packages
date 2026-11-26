import type { Choco } from "./choco.ts";
import { derivePackage } from "./derive.ts";
import type { Http } from "./http.ts";
import { PACKAGES_DIR } from "./package-files.ts";
import { definitionOf, packages } from "./registry.ts";
import type { PrepareReport } from "./report.ts";
import { failures, forEachPackage, values } from "./runner.ts";
import { verifyPackages } from "./verify.ts";

export async function planPackages(http: Http, dir: string = PACKAGES_DIR): Promise<PrepareReport> {
  const outcomes = await forEachPackage(
    packages.map((definition) => definition.id),
    "plan",
    (id) => derivePackage(definitionOf(id), http, dir),
  );
  return {
    packages: values(outcomes).map((derived) => ({
      id: derived.id,
      plan: derived.plan,
      hash: derived.hash,
      installed: false,
    })),
    failures: failures(outcomes),
  };
}

export async function installPackages(
  planned: PrepareReport,
  out: string,
  choco: Pick<Choco, "pack" | "installAndUninstall">,
): Promise<PrepareReport> {
  const verification = await verifyPackages(
    packages.map((definition) => definition.id),
    out,
    choco,
  );
  return {
    packages: planned.packages.map((entry) => ({
      ...entry,
      installed: verification.passed.includes(entry.id),
    })),
    failures: [...planned.failures, ...verification.failures],
  };
}

export async function prepare(
  http: Http,
  out: string,
  choco: Pick<Choco, "pack" | "installAndUninstall">,
  dir: string = PACKAGES_DIR,
): Promise<PrepareReport> {
  return installPackages(await planPackages(http, dir), out, choco);
}
