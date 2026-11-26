import { afterAll, describe, expect, test } from "bun:test";
import { HttpStatusError, http } from "../src/http.ts";

const seen: { path: string; accept: string | null; agent: string | null }[] = [];
const server = Bun.serve({
  port: 0,
  fetch(request) {
    const path = new URL(request.url).pathname;
    seen.push({ path, accept: request.headers.get("accept"), agent: request.headers.get("user-agent") });
    if (path === "/missing") return new Response("gone", { status: 404 });
    if (path === "/json") return Response.json({ ok: true });
    return new Response("hello");
  },
});
afterAll(() => server.stop(true));
const base = `http://localhost:${server.port}`;

describe("http", () => {
  test("a 404 is a status error and is not retried", async () => {
    seen.length = 0;
    const failure = await http.text(`${base}/missing`).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(HttpStatusError);
    expect((failure as HttpStatusError).status).toBe(404);
    expect(seen).toHaveLength(1);
  });

  test("sends its own user agent and only the headers a caller asks for", async () => {
    seen.length = 0;
    await http.text(`${base}/plain`);
    await http.json(`${base}/json`, { Accept: "application/vnd.github+json" });
    expect(seen[0]?.agent).toBe("scowalt-chocolatey-packages");
    expect(seen[0]?.accept).not.toBe("application/vnd.github+json");
    expect(seen[1]?.accept).toBe("application/vnd.github+json");
  });

  test("hashes a download", async () => {
    expect(await http.sha256(`${base}/plain`)).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });
});
