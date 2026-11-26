import { writeFileSync } from "node:fs";
import { choco, outputDirectory } from "../choco.ts";
import { http } from "../http.ts";
import { installPackages, planPackages } from "../prepare.ts";
import { loadReport, serializeReport } from "../report.ts";
import { exitWith } from "../runner.ts";

const reportPath = process.env.PREPARE_REPORT ?? "prepare-report.json";
const phase = process.argv[2];

const report =
  phase === "plan"
    ? await planPackages(http)
    : phase === "install"
      ? await installPackages(loadReport(reportPath), outputDirectory(), choco)
      : null;
if (report === null) throw new Error("Usage: bin/prepare.ts plan | install");

writeFileSync(reportPath, serializeReport(report));
exitWith(report.failures, `${phase}: ${report.packages.map((entry) => entry.id).join(", ")}`);
