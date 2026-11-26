import { outputDirectory, pack, push } from "./choco.ts";
import { endGroup, group, selectedIds } from "./selection.ts";

const apiKey = process.env.CHOCOLATEY_API_KEY;
if (!apiKey) throw new Error("CHOCOLATEY_API_KEY is not set");

const requested = process.argv.slice(2);
if (requested.length === 0) throw new Error("Name the packages to push");
const ids = selectedIds(requested);
const out = outputDirectory();
const failures: string[] = [];

for (const id of ids) {
  group(`push ${id}`);
  try {
    const outcome = await push(await pack(id, out), apiKey);
    console.log(`${id}: ${outcome}`);
    if (outcome === "failed") failures.push(id);
  } catch (error) {
    console.error(error);
    failures.push(id);
  }
  endGroup();
}

if (failures.length > 0) {
  console.error(`Push failed: ${failures.join(", ")}`);
  process.exit(1);
}
