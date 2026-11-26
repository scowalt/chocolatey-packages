import type { Http, RequestHeaders } from "./http.ts";
import { assertVersion, newestVersion } from "./version.ts";

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

export interface Project64Installer {
  readonly version: string;
  readonly slug: string;
}

export function project64Installers(html: string): Project64Installer[] {
  return [...html.matchAll(/\/download\/project64-(\d+(?:-\d+)*)-installer/g)].flatMap((match) =>
    match[1] === undefined ? [] : [{ slug: match[1], version: match[1].replaceAll("-", ".") }],
  );
}

export function project64FileUrl(html: string, slug: string, origin: string): string {
  const match = new RegExp(`href="(/file/setup-project64-${slug}-[^"/]+/)"`).exec(html);
  if (match?.[1] === undefined) throw new Error(`No installer link for Project64 ${slug}`);
  return new URL(match[1], origin).href;
}

async function fromProject64(
  upstream: Extract<Upstream, { kind: "project64-releases" }>,
  http: Http,
): Promise<Release> {
  const installers = project64Installers(await http.text(upstream.releasesUrl));
  const version = newestVersion(installers.map((installer) => installer.version));
  const newest = installers.find((installer) => installer.version === version);
  if (newest === undefined) throw new Error("No Project64 installer listed");
  const origin = new URL(upstream.releasesUrl).origin;
  const installerPage = await http.text(`${origin}/download/project64-${newest.slug}-installer`);
  return { version: newest.version, downloadUrl: project64FileUrl(installerPage, newest.slug, origin) };
}

export function githubHeaders(token: string | undefined): RequestHeaders {
  return token
    ? { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}` }
    : { Accept: "application/vnd.github+json" };
}

async function locate(upstream: Upstream, http: Http): Promise<Release> {
  switch (upstream.kind) {
    case "github-release":
      return releaseFromGithub(
        upstream,
        await http.json(
          `https://api.github.com/repos/${upstream.repo}/releases/latest`,
          githubHeaders(process.env.GITHUB_TOKEN),
        ),
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

export async function findLatest(upstream: Upstream, http: Http): Promise<Release> {
  const release = await locate(upstream, http);
  return { ...release, version: assertVersion(release.version) };
}
