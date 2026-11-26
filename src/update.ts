import { http } from "./http.ts";
import { applyRevision, readPackage, writePackage, nuspecVersion } from "./package-files.ts";
import { packages } from "./registry.ts";
import { lookUpstream } from "./survey.ts";
import { isCurrent } from "./version.ts";

const changed: string[] = [];
const failed: string[] = [];

for (const definition of packages) {
  const release = await lookUpstream(definition, http);
  if (release instanceof Error) {
    console.error(`${definition.id}: ${release.message}`);
    failed.push(definition.id);
    continue;
  }
  const files = readPackage(definition.id);
  const current = nuspecVersion(files.nuspec);
  if (isCurrent(current, release.version)) {
    console.error(`${definition.id}: ${current} is current`);
    continue;
  }
  try {
    const checksum = await http.sha256(release.downloadUrl);
    writePackage(
      definition.id,
      applyRevision(files, { version: release.version, url: release.downloadUrl, checksum }),
    );
    console.error(`${definition.id}: ${current} -> ${release.version} (${checksum})`);
    changed.push(definition.id);
  } catch (error) {
    console.error(`${definition.id}: ${error instanceof Error ? error.message : String(error)}`);
    failed.push(definition.id);
  }
}

for (const id of changed) console.log(id);
if (failed.length > 0) {
  console.error(`Failed: ${failed.join(", ")}`);
  process.exit(1);
}
