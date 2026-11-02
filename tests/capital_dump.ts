import { readFileSync, writeFileSync } from "node:fs";
import { capitalPlan } from "../lib/capital.ts";
const d = JSON.parse(readFileSync(new URL("../data/site-data.json", import.meta.url), "utf8"));
const out: Record<string, any> = {};
for (const s of d.sites) {
  const c = capitalPlan(s, d.assumptions);
  out[s.id] = { struct: c.struct, noi: c.noi, total: c.uses.total, yoc: c.yoc, irrU: c.irrUnlevered, irrL: c.irrLevered, em: c.equityMultiple, poc: c.profitOnCost, loan: c.loanCommit, equity: c.equityCommit, atRisk: c.atRiskPreEntitlement, N: c.N, cumLoan: c.months.at(-1)!.cumLoan, permDscr: c.perm.dscr, cashYield: c.perm.cashYield };
}
const target = process.argv[2];
if (target) writeFileSync(target, JSON.stringify(out, null, 1));
for (const id of ["NJ-04", "NJ-06", "NY-10", "NJ-10", "NY-03", "CT-02", "NY-01"]) { const o = out[id]; console.log(id, o.struct, "YOC", (o.yoc*100).toFixed(2), "IRRu", (o.irrU*100).toFixed(1), "IRRl", (o.irrL*100).toFixed(1), "EM", o.em.toFixed(2), "risk$", Math.round(o.atRisk/1e3)+"k", "loanchk", Math.round(o.cumLoan - o.loan), "N", o.N, "permDSCR", o.permDscr.toFixed(2)); }
