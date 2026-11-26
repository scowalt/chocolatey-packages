import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Http } from "../src/http.ts";

export function fixture(name: string): string {
  return readFileSync(join(import.meta.dir, "fixtures", name), "utf8");
}

export function fakeHttp(responses: Record<string, string>): Http {
  const body = (url: string): string => {
    const found = responses[url];
    if (found === undefined) throw new Error(`Unexpected request: ${url}`);
    return found;
  };
  return {
    async text(url) {
      return body(url);
    },
    async json(url) {
      return JSON.parse(body(url));
    },
    async sha256() {
      throw new Error("Downloads are not available in tests");
    },
  };
}
