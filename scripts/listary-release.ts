import { assert } from "ts-essentials";
import path from "path";
import {
  createNupkgAndUpload,
  getCurrentVersion,
  getSha256,
  parseOptions,
} from "./shared/release";
import fs from "fs";
import cheerio from "cheerio";
import fetch from "node-fetch";
import _ from "lodash";

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
    updatePackage(downloadUrl, sha256, latestVersion);
    await createNupkgAndUpload(packageFolder, options.upload);
  } else {
    console.log("No update available");
  }
}

function updatePackage(
  downloadUrl: string,
  sha: string,
  version: string
): void {
  let installPwsh = fs.readFileSync(installPwshPath, "utf8");
  installPwsh = installPwsh.replace(/\$url \= .*/, `$url = "${downloadUrl}"`);
  installPwsh = installPwsh.replace(/\$hash \= .*/, `$hash = '${sha}'`);
  fs.writeFileSync(installPwshPath, installPwsh);
  console.log("Updated chocolateyinstall.ps1");

  let nuspec = fs.readFileSync(nuspecPath, "utf8");
  nuspec = nuspec.replace(
    /<version>.*<\/version>/,
    `<version>${version}</version>`
  );
  fs.writeFileSync(nuspecPath, nuspec);
  console.log("Updated nuspec");
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
      let text = (child as any).data as string;
      const match = text.match(/((\d*\.)+(\d)*)/);
      if (match == null) {
        console.log(`No version in "${text}"`);
      } else {
        console.log(`Found version in "${text}"`);
        result = match[1];
      }

      // break if we have a result
      return result == null;
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
