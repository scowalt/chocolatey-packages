import { choco, outputDirectory } from "../choco.ts";
import { selectPackages } from "../registry.ts";
import { exitWith } from "../runner.ts";
import { verifyPackages } from "../verify.ts";

const verification = await verifyPackages(selectPackages(process.argv.slice(2)), outputDirectory(), choco);
exitWith(verification.failures, `Verified: ${verification.passed.join(", ")}`);
