import type { Http } from "./http.ts";
import { newestVersion } from "./version.ts";

const FEED = "https://community.chocolatey.org/api/v2/FindPackagesById()";
const MAX_PAGES = 5;

export interface FeedPage {
  readonly approvedVersions: string[];
  readonly nextUrl: string | null;
}

export function parseFeedPage(xml: string): FeedPage {
  const entries = xml.split("<entry>").slice(1);
  const approvedVersions = entries.flatMap((entry) => {
    const version = /<d:Version>([^<]*)<\/d:Version>/.exec(entry)?.[1];
    const status = /<d:PackageStatus>([^<]*)<\/d:PackageStatus>/.exec(entry)?.[1];
    return version !== undefined && status === "Approved" ? [version] : [];
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
