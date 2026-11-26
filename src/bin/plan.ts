import { http } from "../http.ts";
import { planPackages } from "../prepare.ts";
import { exitWith } from "../runner.ts";

exitWith(await planPackages(http), "Planned every package");
