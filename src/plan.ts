import type { FeedStatus } from "./community.ts";
import { compareVersions, versionText, type NuspecVersion } from "./version.ts";

export interface Ahead {
  readonly kind: "ahead";
  readonly version: string;
  readonly upstream: string;
  readonly rewrite: false;
}

export interface Target {
  readonly kind: "target";
  readonly version: string;
  readonly rewrite: boolean;
}

export interface Decided {
  readonly kind: "approved" | "moderation" | "publish" | "rejected";
  readonly version: string;
  readonly rewrite: boolean;
}

export type Plan = Ahead | Decided;

export type Standing = "current" | "moderation" | "unpublished" | "behind" | "ahead" | "rejected";

export function targetOf(nuspec: NuspecVersion, upstream: string): Ahead | Target {
  const current = versionText(nuspec);
  if (current === upstream) return { kind: "target", version: current, rewrite: false };
  const order = compareVersions(upstream, nuspec.upstream);
  if (order < 0) return { kind: "ahead", version: current, upstream, rewrite: false };
  return order === 0
    ? { kind: "target", version: current, rewrite: false }
    : { kind: "target", version: upstream, rewrite: true };
}

export function plan(target: Target, status: FeedStatus): Decided {
  const { version, rewrite } = target;
  switch (status) {
    case "approved":
      return { kind: "approved", version, rewrite };
    case "submitted":
      return { kind: "moderation", version, rewrite };
    case "rejected":
      return { kind: "rejected", version, rewrite: false };
    case "absent":
      return { kind: "publish", version, rewrite };
  }
}

export function onFeed(decision: Plan): boolean {
  return decision.kind === "approved" || decision.kind === "moderation";
}

export function standingOf(decision: Plan): Standing {
  if (decision.rewrite) return "behind";
  switch (decision.kind) {
    case "approved":
      return "current";
    case "publish":
      return "unpublished";
    default:
      return decision.kind;
  }
}

export function problemOf(decision: Plan): string | undefined {
  switch (decision.kind) {
    case "ahead":
      return `the nuspec's ${decision.version} is newer than upstream's ${decision.upstream}; nothing is rewritten downward`;
    case "rejected":
      return `${decision.version} was rejected by Chocolatey moderation; write a fix version by hand: its nuspec version, URL and checksum`;
    default:
      return undefined;
  }
}
