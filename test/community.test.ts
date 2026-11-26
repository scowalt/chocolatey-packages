import { describe, expect, test } from "bun:test";
import { latestApprovedVersion, parseFeedPage } from "../src/community.ts";
import { fakeHttp, fixture } from "./support.ts";

const FEED_URL = "https://community.chocolatey.org/api/v2/FindPackagesById()?id='hearthstone-deck-tracker'";

describe("community feed", () => {
  test("the newest approved version of a package is the highest one listed", async () => {
    const empty = '<feed xmlns="http://www.w3.org/2005/Atom"></feed>';
    const http = fakeHttp({
      [FEED_URL]: fixture("community-feed-hdt.xml"),
      "https://community.chocolatey.org/api/v2/FindPackagesById?id='hearthstone-deck-tracker'&$skiptoken='1757918989540','0.14.9','hearthstone-deck-tracker'":
        empty,
    });
    expect(await latestApprovedVersion("hearthstone-deck-tracker", http)).toBe("1.1.6");
  });

  test("versions that are not approved do not count", () => {
    const entry = (version: string, status: string) =>
      `<entry><m:properties><d:Version>${version}</d:Version><d:PackageStatus>${status}</d:PackageStatus></m:properties></entry>`;
    const page = parseFeedPage(`<feed>${entry("2.0.0", "Submitted")}${entry("1.0.0", "Approved")}${entry("3.0.0", "Rejected")}</feed>`);
    expect(page.approvedVersions).toEqual(["1.0.0"]);
  });

  test("a package the feed does not know has no version", async () => {
    const http = fakeHttp({
      "https://community.chocolatey.org/api/v2/FindPackagesById()?id='nothing'":
        '<feed xmlns="http://www.w3.org/2005/Atom"></feed>',
    });
    expect(await latestApprovedVersion("nothing", http)).toBeNull();
  });
});
