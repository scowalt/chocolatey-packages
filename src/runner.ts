import { errorMessage } from "./errors.ts";

export type Outcome<T> =
  | { readonly id: string; readonly ok: true; readonly value: T }
  | { readonly id: string; readonly ok: false; readonly message: string };

export function group(title: string): void {
  console.log(process.env.GITHUB_ACTIONS ? `::group::${title}` : `\n== ${title}`);
}

export function endGroup(): void {
  if (process.env.GITHUB_ACTIONS) console.log("::endgroup::");
}

export interface Identified {
  readonly id: string;
}

export async function attempt<P extends Identified, T>(
  item: P,
  step: (item: P) => Promise<T>,
  refusal: (value: T) => string | undefined = () => undefined,
): Promise<Outcome<T>> {
  const { id } = item;
  try {
    const value = await step(item);
    const refused = refusal(value);
    return refused === undefined ? { id, ok: true, value } : { id, ok: false, message: refused };
  } catch (error) {
    return { id, ok: false, message: errorMessage(error) };
  }
}

export async function forEachPackage<P extends Identified, T>(
  items: readonly P[],
  title: string,
  step: (item: P) => Promise<T>,
  refusal?: (value: T) => string | undefined,
): Promise<Outcome<T>[]> {
  const outcomes: Outcome<T>[] = [];
  for (const item of items) {
    group(`${title} ${item.id}`);
    const outcome = await attempt(item, step, refusal);
    if (!outcome.ok) console.error(`${item.id}: ${outcome.message}`);
    outcomes.push(outcome);
    endGroup();
  }
  return outcomes;
}

export function values<T>(outcomes: readonly Outcome<T>[]): T[] {
  return outcomes.flatMap((outcome) => (outcome.ok ? [outcome.value] : []));
}

export function failures<T>(outcomes: readonly Outcome<T>[]): string[] {
  return outcomes.flatMap((outcome) => (outcome.ok ? [] : [`${outcome.id}: ${outcome.message}`]));
}

export function exitWith(problems: readonly string[], success: string): never {
  if (problems.length === 0) {
    console.log(success);
    process.exit(0);
  }
  console.error(`Problems:\n${problems.join("\n")}`);
  process.exit(1);
}
