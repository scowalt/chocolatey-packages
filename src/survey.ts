import { feedStatusOf } from "./community.ts";
import type { Http } from "./http.ts";
import { PACKAGES_DIR, nuspecVersion, readPackage } from "./package-files.ts";
import { plan, targetOf, type Plan } from "./plan.ts";
import type { PackageDefinition } from "./registry.ts";
import { findLatest, type Release } from "./upstream.ts";
import type { NuspecVersion } from "./version.ts";

export interface Survey {
  readonly id: string;
  readonly nuspec: NuspecVersion;
  readonly upstream: Release;
  readonly plan: Plan;
}

export async function surveyPackage(
  definition: PackageDefinition,
  http: Http,
  dir: string = PACKAGES_DIR,
): Promise<Survey> {
  const nuspec = nuspecVersion(readPackage(definition.id, dir).nuspec);
  const upstream = await findLatest(definition.upstream, http);
  const target = targetOf(nuspec, upstream.version);
  return {
    id: definition.id,
    nuspec,
    upstream,
    plan: target.kind === "ahead" ? target : plan(target, await feedStatusOf(definition.id, target.version, http)),
  };
}
