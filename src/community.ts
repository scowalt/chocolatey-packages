import { HttpStatusError, type Http } from "./http.ts";
import { newestVersion } from "./version.ts";

const API = "https://community.chocolatey.org/api/v2/";
const FEED = `${API}FindPackagesById()`;
const MAX_PAGES = 5;

export type FeedStatus = "approved" | "submitted" | "rejected" | "absent";

const STATUS_BY_NAME: ReadonlyMap<string, Exclude<FeedStatus, "absent">> = new Map([
  ["Approved", "approved"],
  ["Exempted", "approved"],
  ["Submitted", "submitted"],
  ["Updated", "submitted"],
  ["Pending", "submitted"],
  ["Rejected", "rejected"],
]);

function packageStatusName(entry: string): string | undefined {
  return /<d:PackageStatus>([^<]*)<\/d:PackageStatus>/.exec(entry)?.[1];
}

export function feedStatusFromEntry(xml: string): Exclude<FeedStatus, "absent"> {
  const name = packageStatusName(xml);
  if (name === undefined) throw new Error("The feed entry has no PackageStatus");
  const status = STATUS_BY_NAME.get(name);
  if (status === undefined) throw new Error(`Unrecognised PackageStatus "${name}"`);
  return status;
}

export async function feedStatusOf(id: string, version: string, http: Http): Promise<FeedStatus> {
  const url = `${API}Packages(Id='${encodeURIComponent(id)}',Version='${encodeURIComponent(version)}')`;
  try {
    return feedStatusFromEntry(await http.text(url));
  } catch (error) {
    if (error instanceof HttpStatusError && error.status === 404) return "absent";
    throw error;
  }
}

export interface FeedPage {
  readonly approvedVersions: string[];
  readonly nextUrl: string | null;
}

export function parseFeedPage(xml: string): FeedPage {
  const entries = xml.split("<entry>").slice(1);
  const approvedVersions = entries.flatMap((entry) => {
    const version = /<d:Version>([^<]*)<\/d:Version>/.exec(entry)?.[1];
    const status = STATUS_BY_NAME.get(packageStatusName(entry) ?? "");
    return version !== undefined && status === "approved" ? [version] : [];
  });
  const next = /<link rel="next" href="([^"]*)"/.exec(xml)?.[1];
  return {
    approvedVersions,
    nextUrl: entries.length > 0 && next !== undefined ? next.replaceAll("&amp;", "&") : null,
  };
}

export async function latestApprovedVersion(id: string, http: Http): Promise<string | null> {
  const versions: string[] = [];
  let url: string | null = `${FEED}?id='${encodeURIComponent(id)}'`;
  for (let page = 0; page < MAX_PAGES && url !== null; page++) {
    const parsed = parseFeedPage(await http.text(url));
    versions.push(...parsed.approvedVersions);
    url = parsed.nextUrl;
  }
  return newestVersion(versions);
}
