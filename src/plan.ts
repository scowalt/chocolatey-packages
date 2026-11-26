import type { FeedStatus } from "./community.ts";
import { compareVersions, versionText, type NuspecVersion } from "./version.ts";

export type Plan =
  | { readonly kind: "ahead"; readonly nuspec: string; readonly upstream: string }
  | { readonly kind: "rejected"; readonly version: string; readonly rewrite: boolean }
  | { readonly kind: "moderation"; readonly version: string; readonly rewrite: boolean }
  | { readonly kind: "approved"; readonly version: string; readonly rewrite: boolean }
  | { readonly kind: "publish"; readonly version: string; readonly rewrite: boolean };

export interface Target {
  readonly kind: "target";
  readonly version: string;
  readonly rewrite: boolean;
}

export type Ahead = Extract<Plan, { kind: "ahead" }>;

export function targetOf(nuspec: NuspecVersion, upstream: string): Ahead | Target {
  const current = versionText(nuspec);
  if (current === upstream) return { kind: "target", version: current, rewrite: false };
  const order = compareVersions(upstream, nuspec.upstream);
  if (order < 0) return { kind: "ahead", nuspec: current, upstream };
  return order === 0
    ? { kind: "target", version: current, rewrite: false }
    : { kind: "target", version: upstream, rewrite: true };
}

export function plan(target: Target, status: FeedStatus): Exclude<Plan, Ahead> {
  const { version, rewrite } = target;
  switch (status) {
    case "approved":
      return { kind: "approved", version, rewrite };
    case "submitted":
      return { kind: "moderation", version, rewrite };
    case "rejected":
      return { kind: "rejected", version, rewrite };
    case "absent":
      return { kind: "publish", version, rewrite };
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
