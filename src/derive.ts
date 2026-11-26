import type { Http } from "./http.ts";
import {
  PACKAGES_DIR,
  applyRevision,
  hashPackage,
  readPackage,
  writePackage,
  type FilePair,
} from "./package-files.ts";
import { actionable, type Actionable } from "./plan.ts";
import type { PackageDefinition } from "./registry.ts";
import { surveyPackage, type Survey } from "./survey.ts";

export interface Derived {
  readonly id: string;
  readonly survey: Survey;
  readonly plan: Actionable;
  readonly hash: string;
  readonly original: FilePair;
}

export async function derivePackage(
  definition: PackageDefinition,
  http: Http,
  dir: string = PACKAGES_DIR,
): Promise<Derived> {
  const survey = await surveyPackage(definition, http, dir);
  const decision = actionable(survey.plan);
  const original = readPackage(definition.id, dir);
  if (decision.rewrite) {
    const checksum = await http.sha256(survey.upstream.downloadUrl);
    writePackage(
      definition.id,
      applyRevision(original, {
        version: survey.upstream.version,
        url: survey.upstream.downloadUrl,
        checksum,
      }),
      dir,
    );
    console.log(`${definition.id}: ${decision.version} (${checksum})`);
  }
  return { id: definition.id, survey, plan: decision, hash: hashPackage(definition.id, dir), original };
}
