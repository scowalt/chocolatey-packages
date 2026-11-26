import { choco, outputDirectory } from "../choco.ts";
import { exitWith } from "../runner.ts";
import { selectedIds } from "../selection.ts";
import { verifyPackages } from "../verify.ts";

const ids = selectedIds(process.argv.slice(2));
const verification = await verifyPackages(ids, outputDirectory(), choco);
exitWith(verification.failures, `Verified: ${verification.passed.join(", ")}`);
