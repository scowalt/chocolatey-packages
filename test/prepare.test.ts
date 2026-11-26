import { describe, expect, test } from "bun:test";
import { prepare } from "../src/prepare.ts";
import { hashPackage, readPackage } from "../src/package-files.ts";
import { verifyPackages } from "../src/verify.ts";
import { packages } from "../src/registry.ts";
import { copyOfPackages } from "./support.ts";
import { buildWorld } from "./world.ts";

const ALL = packages.map((definition) => definition.id);

function fakeChoco(failInstall: readonly string[] = [], failPack: readonly string[] = []) {
  const installed: string[] = [];
  return {
    installed,
    choco: {
      async pack(id: string, out: string) {
        if (failPack.includes(id)) throw new Error(`pack ${id} failed`);
        return `${out}/${id}.nupkg`;
      },
      async installAndUninstall(id: string) {
        installed.push(id);
        if (failInstall.includes(id)) throw new Error(`install ${id} failed`);
      },
    },
  };
}

describe("verifyPackages", () => {
  test("packs and installs every package and keeps going after a failure", async () => {
    const { choco, installed } = fakeChoco(["project64"], ["stepmania"]);
    const verification = await verifyPackages(ALL, "out", choco);
    expect(verification.passed).toEqual(ALL.filter((id) => id !== "project64" && id !== "stepmania"));
    expect(verification.failures).toEqual(["stepmania: pack stepmania failed", "project64: install project64 failed"]);
    expect(installed).not.toContain("stepmania");
  });
});

describe("prepare", () => {
  test("plans every package, rewrites the ones behind, installs all of them, and hashes the rewritten files", async () => {
    const dir = copyOfPackages();
    const { choco, installed } = fakeChoco();
    const report = await prepare(
      buildWorld({
        upstream: { cryptomator: "1.19.7" },
        feed: { "cryptomator@1.19.7": "absent", "project64@3.0.1.20261126": "absent" },
      }).http,
      "out",
      choco,
      dir,
    );
    expect(report.failures).toEqual([]);
    expect(installed.sort()).toEqual([...ALL].sort());
    const byId = new Map(report.packages.map((entry) => [entry.id, entry]));
    expect(byId.get("cryptomator")).toEqual({
      id: "cryptomator",
      plan: { kind: "publish", version: "1.19.7", rewrite: true },
      hash: hashPackage("cryptomator", dir),
      installed: true,
    });
    expect(byId.get("project64")?.plan).toEqual({ kind: "publish", version: "3.0.1.20261126", rewrite: false });
    expect(byId.get("stepmania")?.plan.kind).toBe("approved");
    expect(readPackage("cryptomator", dir).nuspec).toContain("<version>1.19.7</version>");
    expect(readPackage("stepmania", dir)).toEqual(readPackage("stepmania"));
  });

  test("a failed install is reported and the package is marked not installed", async () => {
    const { choco } = fakeChoco(["project64"]);
    const report = await prepare(
      buildWorld({ feed: { "project64@3.0.1.20261126": "absent" } }).http,
      "out",
      choco,
      copyOfPackages(),
    );
    expect(report.failures).toEqual(["project64: install project64 failed"]);
    expect(report.packages.find((entry) => entry.id === "project64")?.installed).toBe(false);
    expect(report.packages.find((entry) => entry.id === "stepmania")?.installed).toBe(true);
  });

  test("a package that cannot be planned is a failure and does not stop the others", async () => {
    const { choco } = fakeChoco();
    const report = await prepare(
      buildWorld({ feed: { "stepmania@5.0.12": "rejected" } }).http,
      "out",
      choco,
      copyOfPackages(),
    );
    expect(report.failures).toEqual(["stepmania: 5.0.12 was rejected by Chocolatey moderation; publish a fix version"]);
    expect(report.packages.map((entry) => entry.id)).not.toContain("stepmania");
    expect(report.packages).toHaveLength(6);
  });
});
