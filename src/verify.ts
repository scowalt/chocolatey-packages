import type { Choco } from "./choco.ts";
import { failures, forEachPackage } from "./runner.ts";

export interface Verification {
  readonly passed: readonly string[];
  readonly failures: readonly string[];
}

export async function verifyPackages(
  ids: readonly string[],
  out: string,
  choco: Pick<Choco, "pack" | "installAndUninstall">,
): Promise<Verification> {
  const packed = await forEachPackage(ids, "pack", (id) => choco.pack(id, out));
  const packable = packed.filter((outcome) => outcome.ok).map((outcome) => outcome.id);
  const installed = await forEachPackage(packable, "install", (id) => choco.installAndUninstall(id, out));
  return {
    passed: installed.filter((outcome) => outcome.ok).map((outcome) => outcome.id),
    failures: [...failures(packed), ...failures(installed)],
  };
}
