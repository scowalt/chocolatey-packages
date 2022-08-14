import { assert } from "ts-essentials";
import path from "path";
import {
  createNupkgAndUpload,
  getCurrentVersion,
  getGithubReleaseInfo,
  getSha256,
  GithubReleaseInfo,
  parseOptions,
} from "./shared/release";
import fs from "fs";
import cheerio from "cheerio";
import fetch from "node-fetch";
import _ from "lodash";
import { SemVer } from "semver";

const packageFolder = path.join(__dirname, "..", "packages", "Listary");
const nuspecPath = path.join(packageFolder, "Listary.nuspec");
const installPwshPath = path.join(
  packageFolder,
  "tools",
  "chocolateyInstall.ps1"
);

async function main(): Promise<void> {
  const options = parseOptions();
  const current = getCurrentVersion(nuspecPath);
  const latestVersion = await getLatestVersion();
  console.log("Latest version:", latestVersion);

  if (current !== latestVersion) {
    // Looks like there is just a static link that always updates.
    const downloadUrl = "https://www.listary.com/download/Listary.exe";
    const sha256 = await getSha256(downloadUrl);
    console.log("SHA256:", sha256);
    // updatePackage(downloadUrl, sha256, latestVersion, current);
    // await createNupkgAndUpload(packageFolder, options.upload);
  } else {
    console.log("No update available");
  }
}

async function getLatestVersion(): Promise<string> {
  const releaseInfoUrl = "https://www.listary.com/download";
  const page = await fetch(releaseInfoUrl);
  const html = await page.text();
  const $ = cheerio.load(html);

  // This seems fragile! Could be h3 in the future?
  let result: string | null = null;
  const h2 = $("h2");
  _.each(h2, (element) => {
    _.each(element.children, (child) => {
      let text = (child as any).data;
      text = text.replace(/\s\(.*\)/, ""); // Replace "1.2 (2019-01-01)" with "1.2 "
      console.log(text);
      try {
        const semver = new SemVer(text);
        console.log(semver);
      } catch (e) {
        console.log(`No version in "${text}"`);
      }
    });

    // break if we have a result
    return result == null;
  });

  assert(
    result !== null,
    "Couldn't find a version on the Listary download page"
  );
  return result;
}

main();
