import { packages } from "./registry.ts";

export function selectedIds(args: readonly string[]): string[] {
  const known = new Set(packages.map((definition) => definition.id));
  const unknown = args.filter((id) => !known.has(id));
  if (unknown.length > 0) throw new Error(`Unknown package: ${unknown.join(", ")}`);
  return args.length === 0 ? packages.map((definition) => definition.id) : [...args];
}
