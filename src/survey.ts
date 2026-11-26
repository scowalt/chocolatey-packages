import { feedStatusOf, latestApprovedVersion, type FeedStatus } from "./community.ts";
import type { Http } from "./http.ts";
import { PACKAGES_DIR, nuspecVersion, readPackage } from "./package-files.ts";
import { plan, versionsToLookUp, type Plan } from "./plan.ts";
import type { PackageDefinition } from "./registry.ts";
import type { Outcome } from "./runner.ts";
import { findLatest, type Release } from "./upstream.ts";
import { versionText, type NuspecVersion } from "./version.ts";

export interface Survey {
  readonly id: string;
  readonly nuspec: NuspecVersion;
  readonly upstream: Release;
  readonly latestApproved: string | null;
  readonly plan: Plan;
}

export async function surveyPackage(
  definition: PackageDefinition,
  http: Http,
  dir: string = PACKAGES_DIR,
): Promise<Survey> {
  const nuspec = nuspecVersion(readPackage(definition.id, dir).nuspec);
  const upstream = await findLatest(definition.upstream, http);
  const [latestApproved, ...statuses] = await Promise.all([
    latestApprovedVersion(definition.id, http),
    ...versionsToLookUp(nuspec, upstream.version).map(async (version) => {
      const status: FeedStatus = await feedStatusOf(definition.id, version, http);
      return [version, status] as const;
    }),
  ]);
  return {
    id: definition.id,
    nuspec,
    upstream,
    latestApproved,
    plan: plan(nuspec, upstream.version, Object.fromEntries(statuses)),
  };
}

export type Standing = "current" | "moderation" | "unpublished" | "behind" | "ahead" | "rejected";

export function standingOf(decision: Plan): Standing {
  if (decision.kind === "ahead" || decision.kind === "rejected") return decision.kind;
  if (decision.rewrite) return "behind";
  if (decision.kind === "publish") return "unpublished";
  return decision.kind === "moderation" ? "moderation" : "current";
}

export const LEGEND = [
  "current      the nuspec is at upstream's version and Chocolatey has approved it",
  "moderation   the nuspec is at upstream's version and Chocolatey holds it in moderation",
  "unpublished  the nuspec is at upstream's version and Chocolatey has no such version; the next daily run pushes it",
  "behind       upstream is newer than the nuspec; the next daily run rewrites the package",
  "ahead        the nuspec is newer than upstream; the updater never rewrites downward",
  "rejected     Chocolatey rejected the nuspec's version; publish a fix version",
  "error        upstream or the Chocolatey feed could not be read",
].join("\n");

const HEALTHY: readonly Standing[] = ["current", "moderation"];

export function problemsIn(outcomes: readonly Outcome<Survey>[]): string[] {
  return outcomes.flatMap((outcome) => {
    if (!outcome.ok) return [`${outcome.id}: ${outcome.message}`];
    const standing = standingOf(outcome.value.plan);
    return HEALTHY.includes(standing) ? [] : [`${outcome.id}: ${standing}`];
  });
}

const COLUMNS = ["package", "nuspec", "community", "upstream", "state"] as const;

function rowOf(outcome: Outcome<Survey>): string[] {
  if (!outcome.ok) return [outcome.id, "-", "-", "-", `error: ${outcome.message}`];
  const survey = outcome.value;
  return [
    survey.id,
    versionText(survey.nuspec),
    survey.latestApproved ?? "-",
    survey.upstream.version,
    standingOf(survey.plan),
  ];
}

export function renderTable(outcomes: readonly Outcome<Survey>[]): string {
  const rows = outcomes.map(rowOf);
  const widths = COLUMNS.map((name, column) =>
    Math.max(name.length, ...rows.map((row) => row[column]?.length ?? 0)),
  );
  const format = (cells: readonly string[]) =>
    cells.map((cell, column) => cell.padEnd(widths[column] ?? 0)).join("  ").trimEnd();
  return [format(COLUMNS), format(widths.map((width) => "-".repeat(width))), ...rows.map(format)].join("\n");
}
