import { describe, expect, test } from "bun:test";
import { packages } from "../src/registry.ts";
import { findLatest, githubHeaders, project64FileUrl, project64Installers } from "../src/upstream.ts";
import { fakeHttp, fixture } from "./support.ts";

function definition(id: string) {
  const found = packages.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`No package ${id}`);
  return found;
}

describe("github-release upstream", () => {
  test("finds the version from the tag and the installer asset by name", async () => {
    const http = fakeHttp({
      "https://api.github.com/repos/cryptomator/cryptomator/releases/latest": fixture(
        "github-cryptomator-latest.json",
      ),
    });
    expect(await findLatest(definition("cryptomator").upstream, http)).toEqual({
      version: "1.19.7",
      downloadUrl:
        "https://github.com/cryptomator/cryptomator/releases/download/1.19.7/Cryptomator-1.19.7-x64.msi",
    });
  });

  test("works for a tag without a v prefix and a zip asset", async () => {
    const http = fakeHttp({
      "https://api.github.com/repos/rembound/Arena-Helper/releases/latest": fixture(
        "github-arena-helper-latest.json",
      ),
    });
    const release = await findLatest(definition("hearthstone-deck-tracker-arena-helper").upstream, http);
    expect(release.version).toBe("0.9.6");
    expect(release.downloadUrl).toEndWith("/0.9.6/ArenaHelper.v0.9.6.zip");
  });

  test("fails when the newest release has no installer yet", async () => {
    const withoutMsi = JSON.parse(fixture("github-cryptomator-latest.json"));
    withoutMsi.assets = withoutMsi.assets.filter((asset: { name: string }) => !asset.name.endsWith(".msi"));
    const http = fakeHttp({
      "https://api.github.com/repos/cryptomator/cryptomator/releases/latest": JSON.stringify(withoutMsi),
    });
    await expect(findLatest(definition("cryptomator").upstream, http)).rejects.toThrow("no asset");
  });

  test("fails when the tag does not carry the expected prefix", async () => {
    const http = fakeHttp({
      "https://api.github.com/repos/stepmania/stepmania/releases/latest": JSON.stringify({
        tag_name: "5.0.12",
        assets: [],
      }),
    });
    await expect(findLatest(definition("stepmania").upstream, http)).rejects.toThrow("prefix");
  });
});

describe("github request headers", () => {
  const url = "https://api.github.com/repos/cryptomator/cryptomator/releases/latest";

  test("a github-release lookup asks for the GitHub media type and authenticates with the token", () => {
    expect(githubHeaders("t0ken")).toEqual({
      Accept: "application/vnd.github+json",
      Authorization: "Bearer t0ken",
    });
  });

  test("without a token the lookup is anonymous", () => {
    expect(githubHeaders(undefined)).toEqual({ Accept: "application/vnd.github+json" });
  });

  test("only the github-release lookup sends them", async () => {
    const github = fakeHttp({ [url]: fixture("github-cryptomator-latest.json") });
    await findLatest(definition("cryptomator").upstream, github);
    expect(github.requests[0]?.headers?.Accept).toBe("application/vnd.github+json");

    const listary = fakeHttp({ "https://help.listary.com/changelog": fixture("listary-changelog.html") });
    await findLatest(definition("Listary").upstream, listary);
    expect(listary.requests[0]?.headers).toBeUndefined();
  });
});

describe("version validation", () => {
  test("a release version NuGet would not accept is an error", async () => {
    const http = fakeHttp({
      "https://help.listary.com/changelog": "<html><h3>6.3.5.94.1</h3></html>",
    });
    await expect(findLatest(definition("Listary").upstream, http)).rejects.toThrow("at most 4");
  });
});

describe("listary-changelog upstream", () => {
  test("takes the first heading as the newest version and keeps the static download link", async () => {
    const http = fakeHttp({ "https://help.listary.com/changelog": fixture("listary-changelog.html") });
    expect(await findLatest(definition("Listary").upstream, http)).toEqual({
      version: "6.3.5.94",
      downloadUrl: "https://www.listary.com/download/Listary.exe",
    });
  });

  test("fails when the page has no version heading", async () => {
    const http = fakeHttp({ "https://help.listary.com/changelog": "<html><h3>Welcome</h3></html>" });
    await expect(findLatest(definition("Listary").upstream, http)).rejects.toThrow("No version heading");
  });
});

describe("project64-releases upstream", () => {
  test("picks the newest listed installer and follows its download page to the file", async () => {
    const http = fakeHttp({
      "https://www.pj64-emu.com/public-releases": fixture("project64-public-releases.html"),
      "https://www.pj64-emu.com/download/project64-3-0-1-installer": fixture(
        "project64-3-0-1-installer.html",
      ),
    });
    expect(await findLatest(definition("project64").upstream, http)).toEqual({
      version: "3.0.1",
      downloadUrl: "https://www.pj64-emu.com/file/setup-project64-3-0-1-5664-2df3434/",
    });
  });

  test("fails when the release list has no installer", async () => {
    const http = fakeHttp({ "https://www.pj64-emu.com/public-releases": "<html></html>" });
    await expect(findLatest(definition("project64").upstream, http)).rejects.toThrow("No Project64 installer");
  });
});

describe("project64 page parsing", () => {
  test("reads installer versions and their slugs from the download links", () => {
    expect(
      project64Installers(
        '<a href="/download/project64-3-0-1-installer">3.0.1</a><a href="/download/project64-2-3-2-installer">x</a>',
      ),
    ).toEqual([
      { slug: "3-0-1", version: "3.0.1" },
      { slug: "2-3-2", version: "2.3.2" },
    ]);
  });

  test("finds the file link for a slug, and fails when the page lacks one", () => {
    const html = '<a href="/file/setup-project64-3-0-1-5664-2df3434/">Try again</a>';
    expect(project64FileUrl(html, "3-0-1", "https://www.pj64-emu.com")).toBe(
      "https://www.pj64-emu.com/file/setup-project64-3-0-1-5664-2df3434/",
    );
    expect(() => project64FileUrl(html, "3-0-2", "https://www.pj64-emu.com")).toThrow("No installer link");
  });
});
