import { errorMessage } from "./runner.ts";

const IDENTITY = [
  "-c",
  "user.name=github-actions[bot]",
  "-c",
  "user.email=41898282+github-actions[bot]@users.noreply.github.com",
];
const PUSH_ATTEMPTS = 3;

export interface Git {
  commitAndPush(ids: readonly string[], message: string): Promise<void>;
}

async function run(cwd: string, args: readonly string[]): Promise<number> {
  const child = Bun.spawn(["git", ...IDENTITY, ...args], { cwd, stdout: "inherit", stderr: "inherit" });
  return child.exited;
}

async function mustRun(cwd: string, args: readonly string[]): Promise<void> {
  const code = await run(cwd, args);
  if (code !== 0) throw new Error(`git ${args.join(" ")} exited with ${code}`);
}

export function gitIn(cwd: string, branch = "master"): Git {
  return {
    async commitAndPush(ids, message) {
      await mustRun(cwd, ["add", "--", ...ids.map((id) => `packages/${id}`)]);
      if ((await run(cwd, ["diff", "--cached", "--quiet"])) === 0) return;
      await mustRun(cwd, ["commit", "-m", message]);
      let failure = "";
      for (let attempt = 1; attempt <= PUSH_ATTEMPTS; attempt++) {
        try {
          await mustRun(cwd, ["pull", "--rebase", "--autostash", "origin", branch]);
          await mustRun(cwd, ["push", "origin", `HEAD:${branch}`]);
          return;
        } catch (error) {
          failure = errorMessage(error);
          await run(cwd, ["rebase", "--abort"]);
        }
      }
      throw new Error(`Could not push to ${branch} after ${PUSH_ATTEMPTS} attempts: ${failure}`);
    },
  };
}
