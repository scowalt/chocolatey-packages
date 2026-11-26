import { cpSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HttpStatusError, type Http, type RequestHeaders } from "../src/http.ts";

export const PACKAGES_FIXTURE = join(import.meta.dir, "fixtures", "packages");

export function fixture(name: string): string {
  return readFileSync(join(import.meta.dir, "fixtures", name), "utf8");
}

export type FakeResponse = string | { readonly status: number; readonly body: string };

export interface FakeHttp extends Http {
  readonly requests: { readonly url: string; readonly headers: RequestHeaders | undefined }[];
}

export function fakeHttp(
  responses: Record<string, FakeResponse>,
  checksums: Record<string, string> = {},
): FakeHttp {
  const requests: FakeHttp["requests"] = [];
  const body = (url: string, headers?: RequestHeaders): string => {
    requests.push({ url, headers });
    const found = responses[url];
    if (found === undefined) throw new Error(`Unexpected request: ${url}`);
    if (typeof found === "string") return found;
    if (found.status >= 400) throw new HttpStatusError(url, found.status);
    return found.body;
  };
  return {
    requests,
    async text(url) {
      return body(url);
    },
    async json(url, headers) {
      return JSON.parse(body(url, headers));
    },
    async sha256(url) {
      const checksum = checksums[url];
      if (checksum === undefined) throw new Error(`Unexpected download: ${url}`);
      return checksum;
    },
  };
}

export function copyOfPackages(): string {
  const directory = mkdtempSync(join(tmpdir(), "packages-"));
  cpSync(PACKAGES_FIXTURE, directory, { recursive: true });
  return directory;
}

export interface FakeChocoOptions {
  readonly failInstall?: readonly string[];
  readonly failPack?: readonly string[];
  readonly duringInstall?: (id: string) => void;
}

export function fakeChoco(options: FakeChocoOptions = {}) {
  const installed: string[] = [];
  return {
    installed,
    async pack(id: string, out: string) {
      if (options.failPack?.includes(id)) throw new Error(`pack ${id} failed`);
      return `${out}/${id}.nupkg`;
    },
    async installAndUninstall(id: string) {
      installed.push(id);
      options.duringInstall?.(id);
      if (options.failInstall?.includes(id)) throw new Error(`install ${id} failed`);
    },
  };
}
