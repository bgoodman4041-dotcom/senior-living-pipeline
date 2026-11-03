import { readFileSync } from "node:fs";
import { structuring } from "../lib/structuring.ts";
const d = JSON.parse(readFileSync(new URL("../data/site-data.json", import.meta.url), "utf8"));
for (const s of d.sites.filter((x: any) => x.verdict.startsWith("Pursue"))) {
  const r = structuring(s, d.markets, d.assumptions)!;
  console.log(s.id, "REC:", r.rec.key);
  for (const o of r.opts) console.log("  ", o.key.padEnd(17), "base", (o.base.yoc*100).toFixed(2), (o.base.irrL*100).toFixed(1), (o.base.profit/1e6).toFixed(1), "| down", (o.down.yoc*100).toFixed(2), (o.down.irrL*100).toFixed(1), (o.down.irrL50*100).toFixed(1), (o.down.profit/1e6).toFixed(1), "eq", (o.base.equity/1e6).toFixed(1), o.coverage?.toFixed(2) ?? "");
}
