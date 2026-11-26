import { describe, expect, test } from "bun:test";
import { definitionOf } from "../src/registry.ts";
import { surveyPackage } from "../src/survey.ts";
import { buildWorld, feedUrl } from "./world.ts";

function feedRequests(requests: readonly { readonly url: string }[]): string[] {
  return requests.map((request) => request.url).filter((url) => url.includes("community.chocolatey.org"));
}

describe("surveyPackage", () => {
  test("reads the nuspec, upstream and the target version's feed status", async () => {
    const { http } = buildWorld({
      upstream: { cryptomator: "1.19.7" },
      feed: { "cryptomator@1.19.7": "absent" },
    });
    const result = await surveyPackage(definitionOf("cryptomator"), http);
    expect(result.nuspec).toEqual({ upstream: "1.19.2" });
    expect(result.upstream.version).toBe("1.19.7");
    expect(result.plan).toEqual({ kind: "publish", version: "1.19.7", rewrite: true });
  });

  test("a fix version in the nuspec is looked up as it is written", async () => {
    const { http } = buildWorld({ feed: { "project64@3.0.1.20261126": "absent" } });
    const result = await surveyPackage(definitionOf("project64"), http);
    expect(result.nuspec).toEqual({ upstream: "3.0.1", fixDate: "20261126" });
    expect(result.plan).toEqual({ kind: "publish", version: "3.0.1.20261126", rewrite: false });
  });

  test("makes one feed request, for the target version only", async () => {
    const { http } = buildWorld({ upstream: { cryptomator: "1.19.7" } });
    await surveyPackage(definitionOf("cryptomator"), http);
    expect(feedRequests(http.requests)).toEqual([feedUrl("cryptomator", "1.19.7")]);
  });

  test("makes no feed request when the nuspec is ahead of upstream", async () => {
    const { http } = buildWorld({ upstream: { cryptomator: "1.19.1" } });
    const result = await surveyPackage(definitionOf("cryptomator"), http);
    expect(result.plan).toEqual({ kind: "ahead", version: "1.19.2", upstream: "1.19.1", rewrite: false });
    expect(feedRequests(http.requests)).toEqual([]);
  });

  test("a feed failure outside the target version and the version listing do not matter", async () => {
    const { http } = buildWorld({
      upstream: { cryptomator: "1.19.7" },
      feed: { "cryptomator@1.19.7": "absent" },
      feedFailures: ["cryptomator@1.19.2"],
      listingFails: true,
    });
    const result = await surveyPackage(definitionOf("cryptomator"), http);
    expect(result.plan).toEqual({ kind: "publish", version: "1.19.7", rewrite: true });
  });

  test("a failing lookup of the target version fails the survey rather than reading as absent", async () => {
    const { http } = buildWorld({ feedFailures: ["stepmania@5.0.12"] });
    await expect(surveyPackage(definitionOf("stepmania"), http)).rejects.toThrow("503");
  });
});
