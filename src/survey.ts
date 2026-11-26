import { latestApprovedVersion } from "./community.ts";
import type { Http } from "./http.ts";
import { readPackage, nuspecVersion } from "./package-files.ts";
import type { PackageDefinition } from "./registry.ts";
import { findLatest, type Release } from "./upstream.ts";
import { isCurrent } from "./version.ts";

export type PackageState = "current" | "unpublished" | "behind" | "error";

export interface Standing {
  readonly id: string;
  readonly nuspec: string;
  readonly community: string | null;
  readonly upstream: string | null;
  readonly state: PackageState;
  readonly detail: string;
}

export function classify(
  nuspec: string,
  upstream: string,
  community: string | null,
): Exclude<PackageState, "error"> {
  if (!isCurrent(nuspec, upstream)) return "behind";
  if (community !== null && isCurrent(community, upstream)) return "current";
  return "unpublished";
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function lookUpstream(
  definition: PackageDefinition,
  http: Http,
): Promise<Release | Error> {
  try {
    return await findLatest(definition.upstream, http);
  } catch (error) {
    return new Error(describe(error));
  }
}

export async function standingOf(definition: PackageDefinition, http: Http): Promise<Standing> {
  const nuspec = nuspecVersion(readPackage(definition.id).nuspec);
  const [release, community] = await Promise.all([
    lookUpstream(definition, http),
    latestApprovedVersion(definition.id, http).catch((error: unknown) => new Error(describe(error))),
  ]);
  if (release instanceof Error) {
    return { id: definition.id, nuspec, community: null, upstream: null, state: "error", detail: release.message };
  }
  if (community instanceof Error) {
    return {
      id: definition.id,
      nuspec,
      community: null,
      upstream: release.version,
      state: "error",
      detail: `community feed: ${community.message}`,
    };
  }
  return {
    id: definition.id,
    nuspec,
    community,
    upstream: release.version,
    state: classify(nuspec, release.version, community),
    detail: "",
  };
}

const COLUMNS = ["package", "nuspec", "community", "upstream", "state"] as const;

export function renderTable(standings: readonly Standing[]): string {
  const rows = standings.map((standing) => [
    standing.id,
    standing.nuspec,
    standing.community ?? "-",
    standing.upstream ?? "-",
    standing.detail === "" ? standing.state : `${standing.state}: ${standing.detail}`,
  ]);
  const widths = COLUMNS.map((name, column) =>
    Math.max(name.length, ...rows.map((row) => row[column]?.length ?? 0)),
  );
  const format = (cells: readonly string[]) =>
    cells.map((cell, column) => cell.padEnd(widths[column] ?? 0)).join("  ").trimEnd();
  return [format(COLUMNS), format(widths.map((width) => "-".repeat(width))), ...rows.map(format)].join("\n");
}
