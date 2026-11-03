import { readFileSync } from "node:fs";
import { underwrite } from "../lib/underwrite.ts";

const d = JSON.parse(readFileSync(new URL("../data/site-data.json", import.meta.url), "utf8"));
let fail = 0, n = 0;
const check = (ok: boolean, msg: string) => { n++; if (!ok) { fail++; console.error("FAIL", msg); } };

// 1. TS port reproduces the Python underwriter for every site
for (const s of d.sites) {
  const u = underwrite(s, d.markets, d.assumptions);
  check(Math.abs(u.yoc - s.uw.yoc) <= 0.0001, `${s.id} yoc ts=${u.yoc.toFixed(5)} py=${s.uw.yoc}`);
  check(Math.abs(u.max_land - s.uw.max_land) <= 1000, `${s.id} max_land ts=${Math.round(u.max_land)} py=${s.uw.max_land}`);
  for (const k of ["full_tax", "pilot", "nonprofit_exempt"]) {
    check(Math.abs(u.yoc_by_tax_structure[k] - s.uw.yoc_by_tax_structure[k]) <= 0.0001, `${s.id} yoc ${k}`);
  }
  check(Math.abs(u.noi - s.uw.noi) <= 2, `${s.id} noi`);
  check(Math.abs(u.total_cost - s.uw.total_cost) <= 2, `${s.id} total_cost`);
  check(u.units === s.uw.units, `${s.id} units`);
  check(Math.abs((u.dscr ?? 0) - s.uw.dscr) <= 0.006, `${s.id} dscr`);
}

// 2. Data contract / acceptance checks from BUILD_SPEC §9
check(d.sites.length === 44, "44 sites");
const short = d.sites.filter((s: any) => s.verdict === "Pursue" || s.verdict === "Pursue-structured");
check(short.length === d.funnel.shortlist, `shortlist count ${short.length} vs funnel ${d.funnel.shortlist}`);
const fp = d.sites.find((s: any) => s.id === "NJ-04");
check(fp.uw.yoc === 0.0724 && fp.uw.yoc_by_tax_structure.pilot === 0.0802 && Math.round(fp.uw.max_land / 1e5) === 128, "Florham Park acceptance figures (norm lease-up, comp-based GSF, site work on site acreage, 2026-11-03)");
const ids = new Set(d.sites.map((s: any) => s.id));
check(ids.size === d.sites.length, "unique ids");
for (const s of d.sites) {
  check(Number.isFinite(+s.lat) && Number.isFinite(+s.lon) && +s.lat > 39.5 && +s.lat < 42.6 && +s.lon > -75.7 && +s.lon < -71.5, `${s.id} coords in band`);
  check(["Pursue", "Pursue-structured", "Watch", "Pass"].includes(s.verdict), `${s.id} verdict`);
  check(Array.isArray(s.diligence) && s.diligence.length === 15, `${s.id} diligence 15`);
  check(!!d.markets.find((m: any) => m.state === s.state && m.county === s.county), `${s.id} market row`);
}
// LP evidence: the model rent quoted beside each comp set must equal the underwriting's private-pay AL rate
{
  const ev = JSON.parse(readFileSync(new URL("../data/lp-evidence.json", import.meta.url), "utf8"));
  for (const [id, r] of Object.entries<any>(ev.rents)) {
    if (id.startsWith("_")) continue;
    const s = d.sites.find((x: any) => x.id === id);
    check(Math.round(d.assumptions.care_levels.AL.base_monthly_rate * Number(s.rent_index_site)) === r.model, `${id} lp-evidence model rent matches underwriting`);
  }
}
// the Excel Structuring tab reads data/structuring.json; it must match the live model
{
  const { structuring } = await import("../lib/structuring.ts");
  const sj = JSON.parse(readFileSync(new URL("../data/structuring.json", import.meta.url), "utf8"));
  for (const s of d.sites.filter((x: any) => x.verdict === "Pursue" || x.verdict === "Pursue-structured")) {
    const r = structuring(s, d.markets, d.assumptions);
    if (!r) continue;
    check(sj[s.id]?.rec === r.rec.key, `${s.id} structuring.json rec current (run scripts/export_structuring.ts)`);
    check(Math.abs(sj[s.id]?.opts.find((o: any) => o.key === r.rec.key).down.profit - r.rec.down.profit) < 1, `${s.id} structuring.json downside profit current`);
  }
}
// hand-written figures in data text must match the live model (they went stale once; this keeps them honest)
{
  const { structuring } = await import("../lib/structuring.ts");
  const { capitalPlan: cpl } = await import("../lib/capital.ts");
  const flags = JSON.parse(readFileSync(new URL("../data/ic-flags.json", import.meta.url), "utf8"));
  const ops = readFileSync(new URL("../data/operators.json", import.meta.url), "utf8");
  const m1 = (v: number) => `$${(Math.abs(v) / 1e6).toFixed(1)}M`;
  const fpS = structuring(fp, d.markets, d.assumptions)!;
  check(flags["NJ-04"].text.includes(`about ${m1(fpS.rec.down.profit)} of cushion`), `ic-flags NJ-04 cushion text vs model ${m1(fpS.rec.down.profit)}`);
  const rb = d.sites.find((s: any) => s.id === "NY-01"), ef = cpl(rb, d.assumptions).efCase!;
  for (const v of [ef.taxable.profit, ef.nonprofit.profit, rb.uw.total_cost * d.assumptions.entrance_fee.developer_fee_pct]) {
    check(flags["NY-01"].text.includes(m1(v)) && ops.includes(m1(v)), `Rye Brook figure ${m1(v)} in ic-flags and operators text`);
  }
}
console.log(`${n - fail}/${n} checks passed`);
if (fail) process.exitCode = 1;

// 3. Capital deployment: draws reconcile to the budget and the debt sizing for every site
import { capitalPlan } from "../lib/capital.ts";
{
  let cf = 0, cn = 0;
  for (const s of d.sites) {
    const c = capitalPlan(s, d.assumptions);
    const drawn = c.months.reduce((a: number, m: any) => a + m.total, 0);
    cn += 2;
    if (Math.abs(drawn - s.uw.total_cost) > 5) { cf++; console.error("FAIL capital draws", s.id, drawn, s.uw.total_cost); }
    if (Math.abs(c.months.at(-1)!.cumLoan - c.loanCommit) > 5) { cf++; console.error("FAIL loan draws", s.id, c.months.at(-1)!.cumLoan, c.loanCommit); }
  }
  console.log(`capital deployment: ${cn - cf}/${cn} checks passed`);
  if (cf) process.exitCode = 1;
}
