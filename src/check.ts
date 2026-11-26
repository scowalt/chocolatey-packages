import type { Http } from "./http.ts";
import { PACKAGES_DIR } from "./package-files.ts";
import { definitionOf, packages } from "./registry.ts";
import { allPackages } from "./runner.ts";
import { LEGEND, problemsIn, renderTable, surveyPackage } from "./survey.ts";

export interface CheckResult {
  readonly report: string;
  readonly problems: readonly string[];
}

export async function checkPackages(http: Http, dir: string = PACKAGES_DIR): Promise<CheckResult> {
  const outcomes = await allPackages(
    packages.map((definition) => definition.id),
    (id) => surveyPackage(definitionOf(id), http, dir),
  );
  return { report: `${renderTable(outcomes)}\n\n${LEGEND}`, problems: problemsIn(outcomes) };
}
