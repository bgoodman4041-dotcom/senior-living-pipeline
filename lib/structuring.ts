// Structural mitigants for the combined downside: which deal structure keeps each site at or above breakeven.
// Every option re-runs the full pro forma (lib/underwrite.ts) and capital plan (lib/capital.ts); nothing is a plug.
import { underwrite } from "./underwrite.ts";
import { capitalPlan, structureOf, type Struct } from "./capital.ts";
import { SHOCKS } from "./scenarios.ts";

export const STRUCT = {
  gmpOwnerShare: 0.3,      // under a GMP signed at financial close the owner keeps ~30% of a 10% hard-cost overrun (pre-GMP pricing, owner changes); the GC carries the rest
  groundRentYield: 0.06,   // ground rent as a share of land value, escalating with NOI
  leaseRentShare: 0.85,    // master-lease rent as a share of base stabilized NOI (≈1.18x coverage on NOI)
  leaseCapPremium: 0.005,  // net-leased senior housing trades wider than operating assets
  leaseRampMonths: 12,     // rent starts at delivery; sale once 12 months of coverage are seasoned
  lowLtc: 0.5,
  minCoverage: 1.0,        // operator rent coverage below this in the downside = lease at risk
};

export type OptKey = "none" | "gmp" | "gmp_pilot" | "gmp_ground" | "gmp_pilot_ground" | "gmp_lease" | "fee";
export interface Case { yoc: number; irrL: number; irrL50: number; profit: number; equity: number; total: number }
export interface Opt { key: OptKey; label: string; what: string; base: Case; down: Case; ok: boolean; atcoProfitDown: number; note?: string; coverage?: number; available: boolean; availability?: string }

const dsW = (a: any, base: any, hardShare = 1) => ({
  rentIndex: base.rent_index * (1 + SHOCKS.rent),
  hardCostPsf: a.hard_cost_psf * (1 + SHOCKS.hard * hardShare),
  leaseupExtraMonths: SHOCKS.leaseupMonths,
});

function run(s: any, uw: any, a: any, struct: Struct, exitAdd = 0, ltc?: number) {
  const aa = { ...a, exit_cap: a.exit_cap + exitAdd, debt: ltc ? { ...a.debt, ltc } : a.debt };
  return capitalPlan({ ...s, uw }, aa, struct);
}
const toCase = (p: ReturnType<typeof capitalPlan>, p50: ReturnType<typeof capitalPlan>): Case =>
  ({ yoc: p.yoc, irrL: p.irrLevered, irrL50: p50.irrLevered, profit: p.profit, equity: p.equityCommit, total: p.uses.total });

export function pilotPath(s: any): { available: boolean; note: string } {
  const tool = String(s.regulatory?.tax_tool || "");
  // site evidence (data/lp-evidence.json "redevelopment"), checked 2026-11-03
  const NJ: Record<string, string> = {
    "NJ-04": "Florham Park has declared the ASCO site an Area in Need of Redevelopment (Res. 20-94); the redevelopment plan is in draft, so a 40A:20 PILOT is available once it is adopted.",
    "NJ-06": "The site's redevelopment approval (Ord. 2-2025) is for JMF's non-senior plan; an AL PILOT would need an amendment.",
    "NJ-10": "No redevelopment designation found for Brookside. Montville has granted 30-year PILOTs through affordable-housing settlements (AvalonBay, Mill Creek); this needs a new agreement.",
  };
  if (NJ[s.id]) return { available: true, note: NJ[s.id] };
  if (structureOf(s) === "PILOT") return { available: true, note: "Already in the base case; close only on a signed term sheet." };
  if (s.state === "NJ") return { available: true, note: "Needs a redevelopment-area designation for a long-term tax exemption (N.J.S.A. 40A:20). Not yet confirmed with the township." };
  if (s.state === "NY") return { available: true, note: "Through the county IDA; needs an IDA application and a public hearing." };
  return { available: /12-65b|PILOT|abat/i.test(tool), note: tool || "Local fixed assessment agreement." };
}

export const recLabel = (r: { rec: { label: string; key: string }; baseStruct?: string }, hold = false) => {
  const l = r.baseStruct === "PILOT" && !r.rec.key.includes("pilot") && r.rec.key !== "fee" ? `${r.rec.label} + PILOT` : r.rec.label;
  return hold ? `On hold · contingency: ${l}` : `Recommended: ${l}`;
};

export function structuring(s: any, markets: any[], a: any): { opts: Opt[]; rec: Opt; baseStruct: Struct; nothing: boolean } | null {
  const baseStruct = structureOf(s);
  if (baseStruct === "Entrance fee") return null;
  const b0 = underwrite(s, markets, a);
  const x = SHOCKS.exitBps / 10000;
  const uwOf = (w: any) => (w ? { ...s.uw, ...underwrite(s, markets, a, w) } : s.uw);
  const ground = (uw: any) => {
    const gr = uw.land_cost * STRUCT.groundRentYield;
    return { ...uw, noi: uw.noi - gr, total_cost: uw.total_cost - uw.land_cost, land_cost: 0 };
  };
  const pilotStruct: Struct = "PILOT";
  const pp = pilotPath(s);
  const mk = (key: OptKey, label: string, what: string, struct: Struct, f: (uw: any) => any, hardShare: number, extra: Partial<Opt> = {}): Opt => {
    const ub = f(s.uw), ud = f(uwOf(dsW(a, b0, hardShare)));
    const base = toCase(run(s, ub, a, struct), run(s, ub, a, struct, 0, STRUCT.lowLtc));
    const down = toCase(run(s, ud, a, struct, x), run(s, ud, a, struct, x, STRUCT.lowLtc));
    return { key, label, what, base, down, ok: down.profit >= 0, atcoProfitDown: down.profit, available: true, ...extra };
  };
  const opts: Opt[] = [];
  opts.push(mk("none", "As underwritten", "Base structure, no mitigants", baseStruct, (u) => u, 1));
  opts.push(mk("gmp", "GMP contract", `Guaranteed maximum price at financial close; the owner keeps about ${Math.round(STRUCT.gmpOwnerShare * 100)}% of a hard-cost overrun`, baseStruct, (u) => u, STRUCT.gmpOwnerShare));
  if (baseStruct !== "PILOT") opts.push(mk("gmp_pilot", "GMP + PILOT", `PILOT at ${Math.round(a.tax_structures.pilot * 100)}% of full taxes. ${pp.note}`, pilotStruct, (u) => u, STRUCT.gmpOwnerShare, { available: pp.available, availability: pp.note }));
  opts.push(mk("gmp_ground", "GMP + ground lease", `Landowner keeps the fee and takes ground rent at ${Math.round(STRUCT.groundRentYield * 100)}% of land value; land leaves the capital stack`, baseStruct, ground, STRUCT.gmpOwnerShare));
  if (baseStruct !== "PILOT") opts.push(mk("gmp_pilot_ground", "GMP + PILOT + ground lease", "Both of the above", pilotStruct, ground, STRUCT.gmpOwnerShare, { available: pp.available, availability: pp.note }));
  // master lease: operator signs a triple-net lease at delivery and carries rents, lease-up and opex; owner carries cost and exit cap
  {
    const rent = (u: any) => (baseStruct === "PILOT" ? u.noi + u.taxes * (1 - a.tax_structures.pilot) : u.noi) * STRUCT.leaseRentShare;
    const fixedRent = rent(s.uw);
    const lease = (u: any) => ({ ...u, noi: fixedRent, taxes: 0, total_cost: u.total_cost - u.leaseup, leaseup: 0, leaseup_months: STRUCT.leaseRampMonths });
    const ub = lease(s.uw), uDraw = uwOf(dsW(a, b0, STRUCT.gmpOwnerShare)), ud = lease(uDraw);
    const p = STRUCT.leaseCapPremium;
    const base = toCase(run(s, ub, a, "Fully taxed", p), run(s, ub, a, "Fully taxed", p, STRUCT.lowLtc));
    const down = toCase(run(s, ud, a, "Fully taxed", p + x), run(s, ud, a, "Fully taxed", p + x, STRUCT.lowLtc));
    const opNoiDown = baseStruct === "PILOT" ? uDraw.noi + uDraw.taxes * (1 - a.tax_structures.pilot) : uDraw.noi;
    const coverage = opNoiDown / fixedRent;
    opts.push({ key: "gmp_lease", label: "GMP + operator master lease", what: `Triple-net lease to the operator at ${Math.round(STRUCT.leaseRentShare * 100)}% of base NOI from delivery; sold at a cap ${Math.round(p * 10000)} bps wider`, base, down, ok: down.profit >= 0 && coverage >= STRUCT.minCoverage, atcoProfitDown: down.profit, coverage, available: true,
      note: `Operator rent coverage in the downside: ${coverage.toFixed(2)}x${coverage < STRUCT.minCoverage ? ", below 1.0x, so the lease itself is at risk" : ""}.` });
  }
  // nonprofit fee development: a tax-exempt sponsor owns it; ATCO earns the development fee and builds it
  {
    const o = mk("fee", "Fee development for a nonprofit", `A tax-exempt sponsor owns and finances it; ATCO earns a ${(a.entrance_fee.developer_fee_pct * 100).toFixed(1)}% development fee plus the GC contract`, "Nonprofit exempt", (u) => u, STRUCT.gmpOwnerShare);
    const fee = s.uw.total_cost * a.entrance_fee.developer_fee_pct;
    opts.push({ ...o, ok: o.down.profit >= 0, atcoProfitDown: fee, note: `ATCO's fee is about $${(fee / 1e6).toFixed(1)}M with no ownership equity. The sponsor's downside profit is $${(o.down.profit / 1e6).toFixed(1)}M${o.down.profit < 0 ? ", so a sponsor is unlikely to take it on" : ""}.` });
  }
  // a GMP at close is standard practice, so the recommendation starts there
  const order: OptKey[] = ["gmp", "gmp_pilot", "gmp_ground", "gmp_pilot_ground", "gmp_lease", "fee"];
  const rec = order.map((k) => opts.find((o) => o.key === k)).find((o) => o && o.ok && o.available) || opts.find((o) => o.key === "fee")!;
  const nothing = rec.key === "fee" && !rec.ok;
  return { opts, rec, baseStruct, nothing };
}

/** Plain-English verdict for the recommended structure. */
export function structVerdict(r: NonNullable<ReturnType<typeof structuring>>, site: any, hold = false): string {
  if (hold) return `On hold for absorption: do not pursue now. If a NIC MAP pull or the Arbor Terrace lease-up shows the demand is there, the contingency structure is ${r.rec.label}, which ${r.rec.ok ? "would hold breakeven in the combined downside" : "still would not hold breakeven"}.`;
  const o = r.rec, d = o.down;
  const m = (v: number) => `$${(Math.abs(v) / 1e6).toFixed(1)}M`;
  if (r.nothing) return `Nothing keeps ${site.municipality} at breakeven, even fee development: the nonprofit sponsor would lose ${m(d.profit)} in the downside. Take it only as GC, or pass.`;
  if (o.key === "fee") return `No ownership structure holds breakeven. It works only as fee development: a nonprofit sponsor owns it tax-exempt and keeps ${m(d.profit)} of profit even in the downside, and ATCO earns about ${m(o.atcoProfitDown)} of fees with no ownership equity.`;
  const cond = o.availability && o.key.includes("pilot") ? ` Condition: ${o.availability}` : r.baseStruct === "PILOT" ? ` Condition: ${pilotPath(site).note}` : "";
  return `${o.label}${r.baseStruct === "PILOT" ? ", on top of the PILOT already in the base case," : ""} holds breakeven: the combined downside still returns ${m(d.profit)} of profit (${(d.yoc * 100).toFixed(2)}% YOC, ${(d.irrL * 100).toFixed(1)}% levered IRR).${cond}`;
}
