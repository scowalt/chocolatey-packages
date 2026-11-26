const NUMERIC_VERSION = /^\d+(\.\d+)*$/;
const FIX_DATE = /^\d{8}$/;
const MAX_SEGMENTS = 4;
const MAX_SEGMENT_VALUE = 2_147_483_647;

export interface NuspecVersion {
  readonly upstream: string;
  readonly fixDate?: string;
}

export function parseVersion(text: string): number[] {
  if (!NUMERIC_VERSION.test(text)) {
    throw new Error(`Not a numeric version: "${text}"`);
  }
  return text.split(".").map(Number);
}

export function assertVersion(text: string): string {
  const segments = parseVersion(text);
  if (segments.length > MAX_SEGMENTS || segments.some((segment) => segment > MAX_SEGMENT_VALUE)) {
    throw new Error(
      `NuGet accepts at most ${MAX_SEGMENTS} numeric segments up to ${MAX_SEGMENT_VALUE}: "${text}"`,
    );
  }
  return text;
}

export function parseNuspecVersion(text: string): NuspecVersion {
  const parts = assertVersion(text).split(".");
  const last = parts[MAX_SEGMENTS - 1];
  if (parts.length === MAX_SEGMENTS && last !== undefined && FIX_DATE.test(last)) {
    return { upstream: parts.slice(0, MAX_SEGMENTS - 1).join("."), fixDate: last };
  }
  return { upstream: text };
}

export function versionText(version: NuspecVersion): string {
  return version.fixDate === undefined ? version.upstream : `${version.upstream}.${version.fixDate}`;
}

export function compareVersions(a: string, b: string): number {
  const left = parseVersion(a);
  const right = parseVersion(b);
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index++) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

export function newestVersion(versions: readonly string[]): string | null {
  const numeric = versions.filter((version) => NUMERIC_VERSION.test(version));
  return numeric.reduce<string | null>(
    (best, version) => (best === null || compareVersions(version, best) > 0 ? version : best),
    null,
  );
}
