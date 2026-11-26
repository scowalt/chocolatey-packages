import { choco, outputDirectory } from "../choco.ts";
import { installPackages } from "../prepare.ts";
import { exitWith } from "../runner.ts";

const reportPath = process.env.PREPARE_REPORT ?? "prepare-report.json";
exitWith(await installPackages(outputDirectory(), choco, reportPath), "Installed every package");
