import type { Choco } from "./choco.ts";
import type { PackageDefinition } from "./registry.ts";
import { failures, forEachPackage, values } from "./runner.ts";

export interface Verification {
  readonly passed: readonly string[];
  readonly failures: readonly string[];
}

export async function verifyPackages(
  definitions: readonly PackageDefinition[],
  out: string,
  choco: Pick<Choco, "pack" | "installAndUninstall">,
): Promise<Verification> {
  const packed = await forEachPackage(definitions, "pack", async (definition) => {
    await choco.pack(definition.id, out);
    return definition;
  });
  const installed = await forEachPackage(values(packed), "install", async (definition) => {
    await choco.installAndUninstall(definition.id, out);
    return definition;
  });
  return {
    passed: values(installed).map((definition) => definition.id),
    failures: [...failures(packed), ...failures(installed)],
  };
}
