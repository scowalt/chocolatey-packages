import { http } from "./http.ts";
import { packages } from "./registry.ts";
import { renderTable, standingOf } from "./survey.ts";

const standings = await Promise.all(packages.map((definition) => standingOf(definition, http)));

console.log(renderTable(standings));
console.log();
console.log("current      the community feed already has upstream's newest version");
console.log("unpublished  the nuspec is current; the community feed is waiting on a push or moderation");
console.log("behind       upstream has a newer version than the nuspec; run the daily update");
console.log("error        upstream or the community feed could not be read");

const failing = standings.filter((standing) => standing.state === "behind" || standing.state === "error");
process.exit(failing.length === 0 ? 0 : 1);
