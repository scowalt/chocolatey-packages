import { describe, expect, test } from "bun:test";
import { feedStatusFromEntry, feedStatusOf, latestApprovedVersion, parseFeedPage } from "../src/community.ts";
import { fakeHttp, fixture } from "./support.ts";

const API = "https://community.chocolatey.org/api/v2";
const FEED_URL = `${API}/FindPackagesById()?id='hearthstone-deck-tracker'`;

function entryWithStatus(status: string): string {
  return `<entry><m:properties><d:PackageStatus>${status}</d:PackageStatus></m:properties></entry>`;
}

describe("feedStatusOf", () => {
  test("an approved version is approved", async () => {
    const http = fakeHttp({
      [`${API}/Packages(Id='cryptomator',Version='1.19.2')`]: fixture("community-package-approved.xml"),
    });
    expect(await feedStatusOf("cryptomator", "1.19.2", http)).toBe("approved");
  });

  test("a version waiting in moderation is submitted", async () => {
    const http = fakeHttp({
      [`${API}/Packages(Id='iconpackager',Version='10.3.0.20261120')`]: fixture("community-package-submitted.xml"),
    });
    expect(await feedStatusOf("iconpackager", "10.3.0.20261120", http)).toBe("submitted");
  });

  test("a version the feed has never seen is absent", async () => {
    const http = fakeHttp({
      [`${API}/Packages(Id='project64',Version='3.0.1.20261126')`]: {
        status: 404,
        body: fixture("community-package-absent.xml"),
      },
    });
    expect(await feedStatusOf("project64", "3.0.1.20261126", http)).toBe("absent");
  });

  test("a server error is an error, never absent", async () => {
    const http = fakeHttp({
      [`${API}/Packages(Id='project64',Version='3.0.1')`]: { status: 503, body: "" },
    });
    await expect(feedStatusOf("project64", "3.0.1", http)).rejects.toThrow("503");
  });
});

describe("feedStatusFromEntry", () => {
  test("maps every status Chocolatey documents", () => {
    const expected = {
      Approved: "approved",
      Exempted: "approved",
      Submitted: "submitted",
      Updated: "submitted",
      Pending: "submitted",
      Rejected: "rejected",
    } as const;
    for (const [name, status] of Object.entries(expected)) {
      expect(feedStatusFromEntry(entryWithStatus(name))).toBe(status);
    }
  });

  test("refuses a status it does not know rather than guessing", () => {
    expect(() => feedStatusFromEntry(entryWithStatus("Unknown"))).toThrow('Unrecognised PackageStatus "Unknown"');
  });

  test("refuses an entry with no status", () => {
    expect(() => feedStatusFromEntry("<entry></entry>")).toThrow("no PackageStatus");
  });
});

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
    const page = parseFeedPage(
      `<feed>${entry("2.0.0", "Submitted")}${entry("1.0.0", "Approved")}${entry("3.0.0", "Rejected")}${entry("4.0.0", "Exempted")}</feed>`,
    );
    expect(page.approvedVersions).toEqual(["1.0.0", "4.0.0"]);
  });

  test("a package the feed does not know has no version", async () => {
    const http = fakeHttp({
      "https://community.chocolatey.org/api/v2/FindPackagesById()?id='nothing'":
        '<feed xmlns="http://www.w3.org/2005/Atom"></feed>',
    });
    expect(await latestApprovedVersion("nothing", http)).toBeNull();
  });
});
