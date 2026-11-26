import type { Choco, PushOutcome } from "./choco.ts";
import { derivePackage, type Derived } from "./derive.ts";
import type { Git } from "./git.ts";
import type { Http } from "./http.ts";
import { PACKAGES_DIR, writePackage } from "./package-files.ts";
import type { Actionable } from "./plan.ts";
import { definitionOf, packages } from "./registry.ts";
import type { PrepareEntry } from "./report.ts";
import { errorMessage, failures, forEachPackage, values, type Outcome } from "./runner.ts";

export type PushGate = { readonly push: true } | { readonly push: false; readonly reason: string };

export function pushGate(
  derived: { readonly plan: Actionable; readonly hash: string },
  reported: PrepareEntry | undefined,
): PushGate {
  if (derived.plan.kind !== "publish") return { push: false, reason: `nothing to publish (${derived.plan.kind})` };
  if (reported === undefined) return { push: false, reason: "prepare reported nothing for this package" };
  if (!reported.installed) return { push: false, reason: "its install test did not pass" };
  if (reported.hash !== derived.hash) {
    return { push: false, reason: "its files differ from the ones prepare tested" };
  }
  return { push: true };
}

export type PushResult = PushOutcome | "not-attempted";

export interface PublishItem {
  readonly id: string;
  readonly plan: Actionable;
  readonly push: PushResult;
}

function isOnFeed(item: PublishItem): boolean {
  switch (item.plan.kind) {
    case "approved":
    case "moderation":
      return true;
    case "publish":
      return item.push === "pushed" || item.push === "already-published";
  }
}

export function selectCommits(items: readonly PublishItem[]): string[] {
  return items.filter((item) => item.plan.rewrite && isOnFeed(item)).map((item) => item.id);
}

export interface PublishDeps {
  readonly http: Http;
  readonly choco: Pick<Choco, "pack" | "push">;
  readonly git: Git;
  readonly out: string;
  readonly apiKey: string;
  readonly dir?: string;
}

function pushResultOf(attempts: readonly Outcome<PushOutcome>[], id: string): PushResult {
  const attempt = attempts.find((candidate) => candidate.id === id);
  if (attempt === undefined) return "not-attempted";
  return attempt.ok ? attempt.value : "failed";
}

export async function publishPackages(
  prepared: readonly PrepareEntry[],
  deps: PublishDeps,
): Promise<string[]> {
  const dir = deps.dir ?? PACKAGES_DIR;
  const derivations = await forEachPackage(
    packages.map((definition) => definition.id),
    "derive",
    (id) => derivePackage(definitionOf(id), deps.http, dir),
  );
  const derived = values(derivations);
  const reported = new Map(prepared.map((entry) => [entry.id, entry]));
  const gates = derived.map((item) => ({ item, gate: pushGate(item, reported.get(item.id)) }));

  const refused = gates.flatMap(({ item, gate }) =>
    !gate.push && item.plan.kind === "publish" ? [`${item.id}: not pushed: ${gate.reason}`] : [],
  );
  for (const line of refused) console.error(line);

  const attempts = await forEachPackage(
    gates.filter(({ gate }) => gate.push).map(({ item }) => item.id),
    "push",
    async (id) => {
      const outcome = await deps.choco.push(await deps.choco.pack(id, deps.out), deps.apiKey);
      console.log(`${id}: ${outcome}`);
      if (outcome === "failed") throw new Error("choco push failed");
      return outcome;
    },
  );

  const committed = selectCommits(
    derived.map((item) => ({ id: item.id, plan: item.plan, push: pushResultOf(attempts, item.id) })),
  );
  restoreUncommitted(derived, committed, dir);
  const commitProblems = await commitSelected(committed, deps.git);

  return [...failures(derivations), ...refused, ...failures(attempts), ...commitProblems];
}

async function commitSelected(committed: readonly string[], git: Git): Promise<string[]> {
  if (committed.length === 0) return [];
  try {
    await git.commitAndPush(committed, `chore: publish ${committed.join(" ")}`);
    return [];
  } catch (error) {
    return [`commit: ${errorMessage(error)}`];
  }
}

function restoreUncommitted(derived: readonly Derived[], committed: readonly string[], dir: string): void {
  for (const item of derived) {
    if (item.plan.rewrite && !committed.includes(item.id)) writePackage(item.id, item.original, dir);
  }
}
