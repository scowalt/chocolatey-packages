import type { Choco, PushOutcome } from "./choco.ts";
import { applyPlans, type Applied } from "./apply.ts";
import type { Git } from "./git.ts";
import type { Http } from "./http.ts";
import { PACKAGES_DIR, writePackage } from "./package-files.ts";
import { onFeed, type Plan } from "./plan.ts";
import type { PrepareEntry } from "./report.ts";
import { errorMessage } from "./errors.ts";
import { failures, forEachPackage, values, type Outcome } from "./runner.ts";

export type PushGate = { readonly push: true } | { readonly push: false; readonly reason: string };

export function pushGate(
  derived: { readonly plan: Plan; readonly hash: string },
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
  readonly plan: Plan;
  readonly push: PushResult;
}

export function selectCommits(items: readonly PublishItem[]): string[] {
  return items
    .filter(({ plan, push }) => plan.rewrite && (onFeed(plan) || push === "pushed" || push === "already-published"))
    .map((item) => item.id);
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
  const applications = await applyPlans(deps.http, dir);
  const applied = values(applications);
  const reported = new Map(prepared.map((entry) => [entry.id, entry]));
  const gates = applied.map((item) => ({ item, gate: pushGate(item, reported.get(item.id)) }));

  const refused = gates.flatMap(({ item, gate }) =>
    !gate.push && item.plan.kind === "publish" ? [`${item.id}: not pushed: ${gate.reason}`] : [],
  );
  for (const line of refused) console.error(line);

  const attempts = await forEachPackage(
    gates.filter(({ gate }) => gate.push).map(({ item }) => item),
    "push",
    async ({ id }) => {
      const outcome = await deps.choco.push(await deps.choco.pack(id, deps.out), deps.apiKey);
      console.log(`${id}: ${outcome}`);
      if (outcome === "failed") throw new Error("choco push failed");
      return outcome;
    },
  );

  const committed = selectCommits(
    applied.map((item) => ({ id: item.id, plan: item.plan, push: pushResultOf(attempts, item.id) })),
  );
  restoreUncommitted(applied, committed, dir);
  const commitProblems = await commitSelected(committed, deps.git);

  return [...failures(applications), ...refused, ...failures(attempts), ...commitProblems];
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

function restoreUncommitted(applied: readonly Applied[], committed: readonly string[], dir: string): void {
  for (const item of applied) {
    if (item.plan.rewrite && !committed.includes(item.id)) writePackage(item.id, item.original, dir);
  }
}
