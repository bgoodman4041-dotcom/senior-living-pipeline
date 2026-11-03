// Writes data/structuring.json (read by scripts/build_models.py for each workbook's Structuring tab).
//   node --experimental-strip-types scripts/export_structuring.ts
import { readFileSync, writeFileSync } from "node:fs";
import { structuring, structVerdict, recLabel, STRUCT } from "../lib/structuring.ts";
import { SHOCKS } from "../lib/scenarios.ts";
const d = JSON.parse(readFileSync(new URL("../data/site-data.json", import.meta.url), "utf8"));
const flags = JSON.parse(readFileSync(new URL("../data/ic-flags.json", import.meta.url), "utf8"));
const out: Record<string, any> = { _assumptions: { ...STRUCT, shocks: SHOCKS } };
for (const s of d.sites.filter((x: any) => x.verdict === "Pursue" || x.verdict === "Pursue-structured")) {
  const r = structuring(s, d.markets, d.assumptions);
  if (!r) continue;
  const hold = flags[s.id]?.tone === "bad";
  out[s.id] = { rec: r.rec.key, hold, lead: recLabel(r, hold), nothing: r.nothing, verdict: structVerdict(r, s, hold), opts: r.opts.map((o) => ({ key: o.key, label: o.label, what: o.what, ok: o.ok, note: o.note ?? null, availability: o.availability ?? null, coverage: o.coverage ?? null, base: o.base, down: o.down })) };
}
writeFileSync(new URL("../data/structuring.json", import.meta.url), JSON.stringify(out, null, 1));
console.log(Object.keys(out).length - 1, "sites");
