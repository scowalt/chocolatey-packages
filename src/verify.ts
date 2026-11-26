import { installAndUninstall, outputDirectory, pack } from "./choco.ts";
import { endGroup, group, selectedIds } from "./selection.ts";

const ids = selectedIds(process.argv.slice(2));
const out = outputDirectory();
const failures: string[] = [];

for (const id of ids) {
  group(`pack ${id}`);
  try {
    await pack(id, out);
  } catch (error) {
    failures.push(`${id}: ${error instanceof Error ? error.message : String(error)}`);
  }
  endGroup();
}

for (const id of ids) {
  group(`install ${id}`);
  try {
    await installAndUninstall(id, out);
  } catch (error) {
    failures.push(`${id}: ${error instanceof Error ? error.message : String(error)}`);
  }
  endGroup();
}

if (failures.length > 0) {
  console.error(`Verification failed:\n${failures.join("\n")}`);
  process.exit(1);
}
console.log(`Verified: ${ids.join(", ")}`);
