import { createHash } from "node:crypto";

export type RequestHeaders = Readonly<Record<string, string>>;

export interface Http {
  text(url: string): Promise<string>;
  json(url: string, headers?: RequestHeaders): Promise<unknown>;
  sha256(url: string): Promise<string>;
}

export class HttpStatusError extends Error {
  constructor(
    readonly url: string,
    readonly status: number,
  ) {
    super(`GET ${url} returned ${status}`);
  }
}

const ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;

async function fetchOk(url: string, headers: RequestHeaders = {}): Promise<Response> {
  let failure: unknown;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "scowalt-chocolatey-packages", ...headers },
        redirect: "follow",
      });
      if (response.ok) return response;
      failure = new HttpStatusError(url, response.status);
      if (response.status < 500 && response.status !== 429) break;
    } catch (error) {
      failure = error;
    }
    if (attempt < ATTEMPTS) await Bun.sleep(RETRY_DELAY_MS * attempt);
  }
  throw failure;
}

async function hashBody(response: Response): Promise<string> {
  const hash = createHash("sha256");
  if (response.body === null) throw new Error("Empty download");
  for await (const chunk of response.body) hash.update(chunk);
  return hash.digest("hex");
}

export const http: Http = {
  async text(url) {
    return (await fetchOk(url)).text();
  },
  async json(url, headers) {
    return (await fetchOk(url, headers)).json();
  },
  async sha256(url) {
    return hashBody(await fetchOk(url));
  },
};
