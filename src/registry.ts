import type { Upstream } from "./upstream.ts";

export interface PackageDefinition {
  readonly id: string;
  readonly upstream: Upstream;
}

export const packages: readonly PackageDefinition[] = [
  {
    id: "cryptomator",
    upstream: {
      kind: "github-release",
      repo: "cryptomator/cryptomator",
      tagPrefix: "",
      asset: "Cryptomator-{version}-x64.msi",
    },
  },
  {
    id: "depressurizer",
    upstream: {
      kind: "github-release",
      repo: "Depressurizer/Depressurizer",
      tagPrefix: "v",
      asset: "Depressurizer-v{version}.exe",
    },
  },
  {
    id: "Listary",
    upstream: {
      kind: "listary-changelog",
      changelogUrl: "https://help.listary.com/changelog",
      downloadUrl: "https://www.listary.com/download/Listary.exe",
    },
  },
  {
    id: "project64",
    upstream: {
      kind: "project64-releases",
      releasesUrl: "https://www.pj64-emu.com/public-releases",
    },
  },
  {
    id: "stepmania",
    upstream: {
      kind: "github-release",
      repo: "stepmania/stepmania",
      tagPrefix: "v",
      asset: "StepMania-{version}-win32.exe",
    },
  },
  {
    id: "hearthstone-deck-tracker",
    upstream: {
      kind: "github-release",
      repo: "HearthSim/Hearthstone-Deck-Tracker",
      tagPrefix: "v",
      asset: "Hearthstone.Deck.Tracker-v{version}.zip",
    },
  },
  {
    id: "hearthstone-deck-tracker-arena-helper",
    upstream: {
      kind: "github-release",
      repo: "rembound/Arena-Helper",
      tagPrefix: "",
      asset: "ArenaHelper.v{version}.zip",
    },
  },
];

export function definitionOf(id: string): PackageDefinition {
  const found = packages.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`Unknown package: ${id}`);
  return found;
}

export function selectPackages(ids: readonly string[]): readonly PackageDefinition[] {
  return ids.length === 0 ? packages : ids.map(definitionOf);
}
