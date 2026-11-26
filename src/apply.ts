import type { Http } from "./http.ts";
import {
  PACKAGES_DIR,
  applyRevision,
  hashPackage,
  readPackage,
  writePackage,
  type FilePair,
} from "./package-files.ts";
import { problemOf, type Plan } from "./plan.ts";
import { packages, type PackageDefinition } from "./registry.ts";
import { forEachPackage, type Outcome } from "./runner.ts";
import { surveyPackage } from "./survey.ts";

export interface Applied {
  readonly id: string;
  readonly plan: Plan;
  readonly hash: string;
  readonly original: FilePair;
}

export async function applyPlan(
  definition: PackageDefinition,
  http: Http,
  dir: string = PACKAGES_DIR,
): Promise<Applied> {
  const survey = await surveyPackage(definition, http, dir);
  const decision = survey.plan;
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
  return { id: definition.id, plan: decision, hash: hashPackage(definition.id, dir), original };
}

export function applyPlans(http: Http, dir: string = PACKAGES_DIR): Promise<Outcome<Applied>[]> {
  return forEachPackage(
    packages,
    "apply",
    (definition) => applyPlan(definition, http, dir),
    (applied) => problemOf(applied.plan),
  );
}
