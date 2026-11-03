import { readFileSync } from "node:fs";
import { scenarios } from "../lib/scenarios.ts";
const d = JSON.parse(readFileSync(new URL("../data/site-data.json", import.meta.url), "utf8"));
for (const s of d.sites.filter((x: any) => x.verdict.startsWith("Pursue") || x.id === "NY-01")) {
  const r = scenarios(s, d.markets, d.assumptions);
  console.log(s.id, r ? r.map((x) => `${x.key}:${(x.yoc*100).toFixed(2)}/${(x.irrL*100).toFixed(1)}/${(x.profit/1e6).toFixed(1)}`).join(" ") : "EF");
}
