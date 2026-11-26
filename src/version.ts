const DATE_SUFFIX = /^\.\d{8}$/;
const NUMERIC_VERSION = /^\d+(\.\d+)*$/;

export function parseVersion(text: string): number[] {
  if (!NUMERIC_VERSION.test(text)) {
    throw new Error(`Not a numeric version: "${text}"`);
  }
  return text.split(".").map(Number);
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

export function isCurrent(packageVersion: string, upstreamVersion: string): boolean {
  if (packageVersion === upstreamVersion) return true;
  if (!packageVersion.startsWith(upstreamVersion)) return false;
  return DATE_SUFFIX.test(packageVersion.slice(upstreamVersion.length));
}

export function newestVersion(versions: readonly string[]): string | null {
  const numeric = versions.filter((version) => NUMERIC_VERSION.test(version));
  return numeric.reduce<string | null>(
    (best, version) => (best === null || compareVersions(version, best) > 0 ? version : best),
    null,
  );
}
