import { choco, outputDirectory } from "../choco.ts";
import { gitIn } from "../git.ts";
import { http } from "../http.ts";
import { publishPackages } from "../publish.ts";
import { loadReport } from "../report.ts";
import { exitWith } from "../runner.ts";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

const problems = await publishPackages(loadReport(required("PREPARE_REPORT")), {
  http,
  choco,
  git: gitIn(process.cwd()),
  out: outputDirectory(),
  apiKey: required("CHOCOLATEY_API_KEY"),
});
exitWith(problems, "Published");
