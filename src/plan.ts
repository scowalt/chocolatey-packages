import type { FeedStatus } from "./community.ts";
import { compareVersions, versionText, type NuspecVersion } from "./version.ts";

export type Plan =
  | { readonly kind: "ahead"; readonly nuspec: string; readonly upstream: string }
  | { readonly kind: "rejected"; readonly version: string; readonly rewrite: boolean }
  | { readonly kind: "moderation"; readonly version: string; readonly rewrite: boolean }
  | { readonly kind: "approved"; readonly version: string; readonly rewrite: boolean }
  | { readonly kind: "publish"; readonly version: string; readonly rewrite: boolean };

export type FeedStatuses = Readonly<Record<string, FeedStatus>>;

export function versionsToLookUp(nuspec: NuspecVersion, upstream: string): string[] {
  return [...new Set([versionText(nuspec), upstream])];
}

function targetOf(
  nuspec: NuspecVersion,
  upstream: string,
): { readonly version: string; readonly rewrite: boolean } | null {
  const current = versionText(nuspec);
  if (current === upstream) return { version: current, rewrite: false };
  const order = compareVersions(upstream, nuspec.upstream);
  if (order < 0) return null;
  return order === 0 ? { version: current, rewrite: false } : { version: upstream, rewrite: true };
}

export function plan(nuspec: NuspecVersion, upstream: string, feed: FeedStatuses): Plan {
  const target = targetOf(nuspec, upstream);
  if (target === null) return { kind: "ahead", nuspec: versionText(nuspec), upstream };
  const status = feed[target.version];
  if (status === undefined) throw new Error(`No feed status for ${target.version}`);
  switch (status) {
    case "approved":
      return { kind: "approved", ...target };
    case "submitted":
      return { kind: "moderation", ...target };
    case "rejected":
      return { kind: "rejected", ...target };
    case "absent":
      return { kind: "publish", ...target };
  }
}

export type Actionable = Exclude<Plan, { kind: "ahead" | "rejected" }>;

export function actionable(decision: Plan): Actionable {
  switch (decision.kind) {
    case "ahead":
      throw new Error(
        `the nuspec's ${decision.nuspec} is newer than upstream's ${decision.upstream}; nothing is rewritten downward`,
      );
    case "rejected":
      throw new Error(
        `${decision.version} was rejected by Chocolatey moderation; publish a fix version`,
      );
    default:
      return decision;
  }
}

export function samePlan(a: Plan, b: Plan): boolean {
  if (a.kind === "ahead") {
    return b.kind === "ahead" && a.nuspec === b.nuspec && a.upstream === b.upstream;
  }
  if (b.kind === "ahead") return false;
  return a.kind === b.kind && a.version === b.version && a.rewrite === b.rewrite;
}
