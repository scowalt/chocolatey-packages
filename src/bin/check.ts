import { checkPackages } from "../check.ts";
import { http } from "../http.ts";

const { report, problems } = await checkPackages(http);
console.log(report);
process.exit(problems.length === 0 ? 0 : 1);
