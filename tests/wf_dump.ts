import { readFileSync } from "node:fs";
import { capitalPlan } from "../lib/capital.ts";
import { waterfall } from "../lib/waterfall.ts";
const d = JSON.parse(readFileSync(new URL("../data/site-data.json", import.meta.url), "utf8"));
for (const s of d.sites.filter((x: any) => x.verdict.startsWith("Pursue"))) {
  const p = capitalPlan(s, d.assumptions); const w = waterfall(p.levCF);
  console.log(s.id, p.struct, "proj lev", (p.irrLevered*100).toFixed(1), "LP", (w.lpIrr*100).toFixed(1), w.lpMultiple.toFixed(2)+"x", "GP", (w.gpIrr*100).toFixed(1), w.gpMultiple.toFixed(2)+"x", "promote", (w.promote/1e6).toFixed(1));
}
