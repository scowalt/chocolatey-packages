import { latestApprovedVersion } from "./community.ts";
import type { Http } from "./http.ts";
import { PACKAGES_DIR } from "./package-files.ts";
import { onFeed, standingOf } from "./plan.ts";
import { packages } from "./registry.ts";
import { attempt, type Outcome } from "./runner.ts";
import { surveyPackage, type Survey } from "./survey.ts";
import { versionText } from "./version.ts";

export interface CheckRow extends Survey {
  readonly latestApproved: string | null;
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

function problemsIn(outcomes: readonly Outcome<CheckRow>[]): string[] {
  return outcomes.flatMap((outcome) => {
    if (!outcome.ok) return [`${outcome.id}: ${outcome.message}`];
    const { plan } = outcome.value;
    return onFeed(plan) && !plan.rewrite ? [] : [`${outcome.id}: ${standingOf(plan)}`];
  });
}

const COLUMNS = ["package", "nuspec", "community", "upstream", "state"] as const;

function rowOf(outcome: Outcome<CheckRow>): string[] {
  if (!outcome.ok) return [outcome.id, "-", "-", "-", `error: ${outcome.message}`];
  const row = outcome.value;
  return [row.id, versionText(row.nuspec), row.latestApproved ?? "-", row.upstream.version, standingOf(row.plan)];
}

export function renderTable(outcomes: readonly Outcome<CheckRow>[]): string {
  const rows = outcomes.map(rowOf);
  const widths = COLUMNS.map((name, column) =>
    Math.max(name.length, ...rows.map((row) => row[column]?.length ?? 0)),
  );
  const format = (cells: readonly string[]) =>
    cells.map((cell, column) => cell.padEnd(widths[column] ?? 0)).join("  ").trimEnd();
  return [format(COLUMNS), format(widths.map((width) => "-".repeat(width))), ...rows.map(format)].join("\n");
}

export interface CheckResult {
  readonly report: string;
  readonly problems: readonly string[];
}

export async function checkPackages(http: Http, dir: string = PACKAGES_DIR): Promise<CheckResult> {
  const outcomes = await Promise.all(
    packages.map((definition) =>
      attempt(definition, async () => {
        const [survey, latestApproved] = await Promise.all([
          surveyPackage(definition, http, dir),
          latestApprovedVersion(definition.id, http),
        ]);
        return { ...survey, latestApproved };
      }),
    ),
  );
  return { report: `${renderTable(outcomes)}\n\n${LEGEND}`, problems: problemsIn(outcomes) };
}
