import { createHash } from "node:crypto";
import type { FeedStatus } from "../src/community.ts";
import { packages } from "../src/registry.ts";
import { fakeHttp, fixture, type FakeHttp, type FakeResponse } from "./support.ts";

const API = "https://community.chocolatey.org/api/v2/";
const EMPTY_FEED = '<feed xmlns="http://www.w3.org/2005/Atom"></feed>';

export const CURRENT_UPSTREAM: Readonly<Record<string, string>> = {
  cryptomator: "1.19.2",
  depressurizer: "5.3.0",
  Listary: "6.3.5.94",
  project64: "3.0.1",
  stepmania: "5.0.12",
  "hearthstone-deck-tracker": "1.55.6",
  "hearthstone-deck-tracker-arena-helper": "0.9.6",
};

export const NUSPEC_VERSIONS: Readonly<Record<string, string>> = {
  ...CURRENT_UPSTREAM,
  project64: "3.0.1.20261126",
};

export function sha256Of(url: string): string {
  return createHash("sha256").update(url).digest("hex");
}

export interface World {
  readonly http: FakeHttp;
  readonly downloads: Readonly<Record<string, string>>;
}

export interface WorldOptions {
  readonly upstream?: Readonly<Record<string, string>>;
  readonly feed?: Readonly<Record<string, FeedStatus>>;
  readonly feedFailures?: readonly string[];
  readonly listingFails?: boolean;
}

export function feedUrl(id: string, version: string): string {
  return `${API}Packages(Id='${id}',Version='${version}')`;
}

function entryFor(status: FeedStatus): FakeResponse {
  switch (status) {
    case "approved":
      return fixture("community-package-approved.xml");
    case "submitted":
      return fixture("community-package-submitted.xml");
    case "rejected":
      return fixture("community-package-submitted.xml").replace(
        "<d:PackageStatus>Submitted</d:PackageStatus>",
        "<d:PackageStatus>Rejected</d:PackageStatus>",
      );
    case "absent":
      return { status: 404, body: fixture("community-package-absent.xml") };
  }
}

function githubRelease(tag: string, assetName: string, repo: string) {
  return JSON.stringify({
    tag_name: tag,
    assets: [
      { name: assetName, browser_download_url: `https://github.com/${repo}/releases/download/${tag}/${assetName}` },
    ],
  });
}

export function buildWorld(options: WorldOptions = {}): World {
  const upstream = { ...CURRENT_UPSTREAM, ...options.upstream };
  const feed = options.feed ?? {};
  const responses: Record<string, FakeResponse> = {};
  const downloads: Record<string, string> = {};

  for (const definition of packages) {
    const id = definition.id;
    const version = upstream[id];
    if (version === undefined) throw new Error(`No upstream version for ${id}`);
    const source = definition.upstream;
    if (source.kind === "github-release") {
      const tag = `${source.tagPrefix}${version}`;
      const asset = source.asset.replaceAll("{version}", version);
      responses[`https://api.github.com/repos/${source.repo}/releases/latest`] = githubRelease(tag, asset, source.repo);
      downloads[`https://github.com/${source.repo}/releases/download/${tag}/${asset}`] = "";
    } else if (source.kind === "listary-changelog") {
      responses[source.changelogUrl] = `<html><h3>${version}</h3></html>`;
      downloads[source.downloadUrl] = "";
    } else {
      responses[source.releasesUrl] = fixture("project64-public-releases.html");
      responses["https://www.pj64-emu.com/download/project64-3-0-1-installer"] = fixture(
        "project64-3-0-1-installer.html",
      );
      downloads["https://www.pj64-emu.com/file/setup-project64-3-0-1-5664-2df3434/"] = "";
    }
    responses[`${API}FindPackagesById()?id='${id}'`] = options.listingFails
      ? { status: 503, body: "" }
      : EMPTY_FEED;
    const versions = new Set([NUSPEC_VERSIONS[id] ?? version, version]);
    for (const candidate of versions) {
      const key = `${id}@${candidate}`;
      const status = feed[key] ?? "approved";
      responses[feedUrl(id, candidate)] = options.feedFailures?.includes(key)
        ? { status: 503, body: "" }
        : entryFor(status);
    }
  }

  const checksums = Object.fromEntries(Object.keys(downloads).map((url) => [url, sha256Of(url)]));
  return { http: fakeHttp(responses, checksums), downloads: checksums };
}
