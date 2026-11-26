import type { Http } from "./http.ts";
import { newestVersion, parseVersion } from "./version.ts";

export type Upstream =
  | {
      readonly kind: "github-release";
      readonly repo: string;
      readonly tagPrefix: string;
      readonly asset: string;
    }
  | {
      readonly kind: "listary-changelog";
      readonly changelogUrl: string;
      readonly downloadUrl: string;
    }
  | {
      readonly kind: "project64-releases";
      readonly releasesUrl: string;
    };

export interface Release {
  readonly version: string;
  readonly downloadUrl: string;
}

interface GithubAsset {
  readonly name: string;
  readonly browser_download_url: string;
}

interface GithubRelease {
  readonly tag_name: string;
  readonly assets: readonly GithubAsset[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseGithubRelease(json: unknown): GithubRelease {
  if (!isRecord(json) || typeof json.tag_name !== "string" || !Array.isArray(json.assets)) {
    throw new Error("Unexpected GitHub release response");
  }
  const assets = json.assets.map((asset: unknown): GithubAsset => {
    if (
      !isRecord(asset) ||
      typeof asset.name !== "string" ||
      typeof asset.browser_download_url !== "string"
    ) {
      throw new Error("Unexpected GitHub release asset");
    }
    return { name: asset.name, browser_download_url: asset.browser_download_url };
  });
  return { tag_name: json.tag_name, assets };
}

export function releaseFromGithub(
  upstream: Extract<Upstream, { kind: "github-release" }>,
  json: unknown,
): Release {
  const release = parseGithubRelease(json);
  if (!release.tag_name.startsWith(upstream.tagPrefix)) {
    throw new Error(`Tag "${release.tag_name}" lacks prefix "${upstream.tagPrefix}"`);
  }
  const version = release.tag_name.slice(upstream.tagPrefix.length);
  parseVersion(version);
  const assetName = upstream.asset.replaceAll("{version}", version);
  const asset = release.assets.find((candidate) => candidate.name === assetName);
  if (asset === undefined) {
    throw new Error(`Release ${release.tag_name} of ${upstream.repo} has no asset "${assetName}"`);
  }
  return { version, downloadUrl: asset.browser_download_url };
}

export function versionFromListaryChangelog(html: string): string {
  const match = /<h3\b[^>]*>\s*(\d+(?:\.\d+)+)/.exec(html);
  if (match?.[1] === undefined) {
    throw new Error("No version heading in the Listary changelog");
  }
  return match[1];
}

export function project64InstallerSlugs(html: string): string[] {
  const slugs = [...html.matchAll(/\/download\/project64-(\d+(?:-\d+)*)-installer/g)];
  return slugs.map((match) => match[1] ?? "");
}

export function project64FileUrl(html: string, slug: string, origin: string): string {
  const pattern = new RegExp(`href="(/file/setup-project64-${slug}-[^"/]+/)"`);
  const match = pattern.exec(html);
  if (match?.[1] === undefined) {
    throw new Error(`No installer link for Project64 ${slug.replaceAll("-", ".")}`);
  }
  return new URL(match[1], origin).href;
}

async function fromProject64(
  upstream: Extract<Upstream, { kind: "project64-releases" }>,
  http: Http,
): Promise<Release> {
  const releasesPage = await http.text(upstream.releasesUrl);
  const versions = project64InstallerSlugs(releasesPage).map((slug) => slug.replaceAll("-", "."));
  const version = newestVersion(versions);
  if (version === null) throw new Error("No Project64 installer listed");
  const slug = version.replaceAll(".", "-");
  const origin = new URL(upstream.releasesUrl).origin;
  const installerPage = await http.text(`${origin}/download/project64-${slug}-installer`);
  return { version, downloadUrl: project64FileUrl(installerPage, slug, origin) };
}

export async function findLatest(upstream: Upstream, http: Http): Promise<Release> {
  switch (upstream.kind) {
    case "github-release":
      return releaseFromGithub(
        upstream,
        await http.json(`https://api.github.com/repos/${upstream.repo}/releases/latest`),
      );
    case "listary-changelog":
      return {
        version: versionFromListaryChangelog(await http.text(upstream.changelogUrl)),
        downloadUrl: upstream.downloadUrl,
      };
    case "project64-releases":
      return fromProject64(upstream, http);
  }
}
