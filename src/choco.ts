import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { PACKAGES_DIR, pathsFor, nuspecVersion, readPackage } from "./package-files.ts";

export const COMMUNITY_FEED = "https://community.chocolatey.org/api/v2/";
export const PUSH_SOURCE = "https://push.chocolatey.org/";

const INSTALL_OK_EXIT_CODES = new Set([0, 1641, 3010]);

export interface Run {
  readonly code: number;
  readonly output: string;
}

export async function choco(args: readonly string[], cwd?: string): Promise<Run> {
  const child = Bun.spawn(["choco", ...args], { cwd, stdout: "pipe", stderr: "pipe" });
  const decoder = new TextDecoder();
  let output = "";
  const pump = async (stream: ReadableStream<Uint8Array>) => {
    for await (const chunk of stream) {
      const text = decoder.decode(chunk, { stream: true });
      output += text;
      process.stdout.write(text);
    }
  };
  await Promise.all([pump(child.stdout), pump(child.stderr)]);
  return { code: await child.exited, output };
}

export function outputDirectory(): string {
  const directory = resolve(process.env.CHOCO_OUT ?? "out");
  mkdirSync(directory, { recursive: true });
  return directory;
}

export function createdPackagePath(output: string): string {
  const match = /Successfully created package '([^']+\.nupkg)'/.exec(output);
  if (match?.[1] === undefined) throw new Error("choco pack did not report a package file");
  return match[1];
}

export async function pack(id: string, out: string): Promise<string> {
  const run = await choco(
    ["pack", pathsFor(id).nuspec, "--outputdirectory", out],
    join(PACKAGES_DIR, id),
  );
  if (run.code !== 0) throw new Error(`choco pack ${id} exited with ${run.code}`);
  return createdPackagePath(run.output);
}

export async function installAndUninstall(id: string, out: string): Promise<void> {
  const version = nuspecVersion(readPackage(id).nuspec);
  const install = await choco([
    "install",
    id,
    "--version",
    version,
    "--source",
    `'${out};${COMMUNITY_FEED}'`,
    "--yes",
    "--no-progress",
  ]);
  if (!INSTALL_OK_EXIT_CODES.has(install.code)) {
    throw new Error(`choco install ${id} exited with ${install.code}`);
  }
  const uninstall = await choco(["uninstall", id, "--yes", "--no-progress"]);
  if (!INSTALL_OK_EXIT_CODES.has(uninstall.code)) {
    throw new Error(`choco uninstall ${id} exited with ${uninstall.code}`);
  }
}

export type PushOutcome = "pushed" | "already-published" | "failed";

export function classifyPush(run: Run): PushOutcome {
  if (run.code === 0) return "pushed";
  return /\(409\)|409 \(Conflict\)|already exists/i.test(run.output) ? "already-published" : "failed";
}

export async function push(nupkg: string, apiKey: string): Promise<PushOutcome> {
  return classifyPush(await choco(["push", nupkg, "--source", PUSH_SOURCE, "--api-key", apiKey]));
}
