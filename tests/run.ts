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

// 4. Internal market studies: one per active shortlist site, PDFs present, headline figures quoted in the study text tie to the data
{
  const ms = JSON.parse(readFileSync(new URL("../data/market-studies.json", import.meta.url), "utf8"));
  const txt = readFileSync(new URL("../app/study/[id]/page.tsx", import.meta.url), "utf8");
  const { existsSync } = await import("node:fs");
  let mf = 0, mn = 0;
  const ck = (ok: boolean, msg: string) => { mn++; if (!ok) { mf++; console.error("FAIL market study", msg); } };
  ck(JSON.stringify(ms.order) === JSON.stringify(["NJ-04", "NJ-10", "NY-03", "CT-02", "NY-01"]), "study order (Whippany excluded)");
  const r = (x: number | null) => (x === null ? null : Math.round(x * 100));
  const S = ms.studies;
  for (const id of ms.order) ck(existsSync(new URL(`../public/studies/ATCO-${id}-market-study.pdf`, import.meta.url)), `${id} PDF`);
  ck(S["NJ-04"].pop75 === 28680 && r(S["NJ-04"].base.capture) === 30 && r(S["NJ-04"].hi.capture) === 16 && r(S["NJ-04"].with_contingent.capture) === 38, "Florham Park ties to absorption.json (30% / 16% / 38%)");
  ck(r(S["NJ-10"].base.capture) === 33 && r(S["NJ-10"].with_contingent.capture) === 43 && S["NJ-10"].low.capture === null, "Montville 33% / 43% / none");
  ck(r(S["NY-03"].base.capture) === 31 && r(S["NY-03"].hi.capture) === 18 && Math.round(S["NY-03"].occupancy_doh * 100) === 72, "Cortlandt 31% / 18% / 72% occ");
  ck(r(S["CT-02"].base.capture) === 14 && r(S["CT-02"].hi.capture) === 10 && r(S["CT-02"].il.base.capture) === 13 && r(S["CT-02"].low.capture) === 49, "Trumbull 14% / 10% / IL 13% / low 49%");
  ck(r(S["NY-01"].base.capture) === 10 && r(S["NY-01"].il.base.capture) === 10 && r(S["NY-01"].il.hi.capture) === 7 && r(S["NY-01"].il.with_pipeline.capture) === 12 && Math.round(S["NY-01"].occupancy_doh * 100) === 75, "Rye Brook 10% / IL 10%, 7%->12% / 75% occ");
  ck(/not a third-party market study/.test(txt) && /not affiliated with RiverSpring/.test(txt), "internal-study and non-affiliation statements");
  ck(!/Hebrew Home|FCA|settlement/i.test(txt), "no Hebrew Home financials on public study pages");
  console.log(`market studies: ${mn - mf}/${mn} checks passed`);
  if (mf) process.exitCode = 1;
}
