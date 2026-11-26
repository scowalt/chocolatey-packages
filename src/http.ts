import { createHash } from "node:crypto";

export interface Http {
  text(url: string): Promise<string>;
  json(url: string): Promise<unknown>;
  sha256(url: string): Promise<string>;
}

const ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;

function headersFor(url: string): Record<string, string> {
  const headers: Record<string, string> = { "User-Agent": "scowalt-chocolatey-packages" };
  if (new URL(url).hostname === "api.github.com") {
    headers.Accept = "application/vnd.github+json";
    const token = process.env.GITHUB_TOKEN;
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function fetchOk(url: string): Promise<Response> {
  let failure: unknown;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, { headers: headersFor(url), redirect: "follow" });
      if (response.ok) return response;
      failure = new Error(`GET ${url} returned ${response.status}`);
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
  async json(url) {
    return (await fetchOk(url)).json();
  },
  async sha256(url) {
    return hashBody(await fetchOk(url));
  },
};
