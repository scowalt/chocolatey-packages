export type Outcome<T> =
  | { readonly id: string; readonly ok: true; readonly value: T }
  | { readonly id: string; readonly ok: false; readonly message: string };

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function group(title: string): void {
  console.log(process.env.GITHUB_ACTIONS ? `::group::${title}` : `\n== ${title}`);
}

export function endGroup(): void {
  if (process.env.GITHUB_ACTIONS) console.log("::endgroup::");
}

export async function attempt<T>(
  id: string,
  step: (id: string) => Promise<T>,
  refusal: (value: T) => string | undefined = () => undefined,
): Promise<Outcome<T>> {
  try {
    const value = await step(id);
    const refused = refusal(value);
    return refused === undefined ? { id, ok: true, value } : { id, ok: false, message: refused };
  } catch (error) {
    return { id, ok: false, message: errorMessage(error) };
  }
}

export async function forEachPackage<T>(
  ids: readonly string[],
  title: string,
  step: (id: string) => Promise<T>,
  refusal?: (value: T) => string | undefined,
): Promise<Outcome<T>[]> {
  const outcomes: Outcome<T>[] = [];
  for (const id of ids) {
    group(`${title} ${id}`);
    const outcome = await attempt(id, step, refusal);
    if (!outcome.ok) console.error(`${id}: ${outcome.message}`);
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
