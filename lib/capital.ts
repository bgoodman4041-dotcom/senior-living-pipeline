// Capital deployment model: how each dollar is raised, released and returned.
// Pure functions shared by the site pages and the Excel generator's reconciliation test
// (scripts/build_models.py writes the same logic as live Excel formulas).

export const CAP = {
  predevMonths: 9,                 // site control to financial close (entitlement, design, GMP)
  buildMonths: { A: 30, B: 24, C: 20 } as Record<string, number>,
  leaseupMonths: { A: 24, B: 20, C: 18 } as Record<string, number>,
  depositPct: 0.05,                // of land, at site control (hard after due diligence)
  predevSoftPct: 0.35,             // share of soft costs spent before close
  ffeMonths: 3,                    // FF&E lands in the last months of construction
  saleCostPct: 0.02,
  trend: 0.03,                     // annual rent and expense growth from underwriting date to sale (NOI grows at the same rate)
  lpShare: 0.9,                    // LP / GP equity split
  permDebtYield: 0.1, permMaxLtv: 0.75, permRate: 0.06, permAmortYears: 35, // HUD 232 style take-out
  retainagePct: 0.1,
  coRepThreshold: 250000,          // change orders above this need investment-committee sign-off
  efMonthlyPct: 0.7,               // entrance-fee contracts: IL monthly service fee as a share of the rental IL rate
};

export type Struct = "Fully taxed" | "PILOT" | "Nonprofit exempt" | "Entrance fee";

export function structureOf(s: any): Struct {
  if (/entrance-fee/.test(s.verdict_reason || "")) return "Entrance fee";
  if (s.verdict === "Pursue-structured") return "PILOT";
  return "Fully taxed";
}

export function noiFor(s: any, a: any, struct: Struct): number {
  const u = s.uw, f = a.tax_structures;
  if (struct === "PILOT") return u.noi + u.taxes * (1 - f.pilot);
  if (struct === "Nonprofit exempt") return u.noi + u.taxes * (1 - f.nonprofit_exempt);
  return u.noi;
}

const protoKey = (s: any) => String(s.uw.prototype || "C").replace(/\*$/, "").slice(0, 1) || "C";

/** Normalised half-sine S-curve weights for n periods. */
export function sCurve(n: number): number[] {
  const w = Array.from({ length: n }, (_, i) => Math.sin((Math.PI * (i + 0.5)) / n));
  const t = w.reduce((a, b) => a + b, 0);
  return w.map((x) => x / t);
}

export interface Month { m: number; phase: "Predevelopment" | "Construction" | "Lease-up"; land: number; soft: number; hard: number; ffe: number; interest: number; leaseup: number; total: number; equity: number; loan: number; cumEquity: number; cumLoan: number }

export function capitalPlan(s: any, a: any, structOverride?: Struct) {
  const u = s.uw;
  const struct = structOverride || structureOf(s);
  const noi = noiFor(s, a, struct === "Entrance fee" ? "Fully taxed" : struct);
  const P = CAP.predevMonths, B = CAP.buildMonths[protoKey(s)] ?? 24, L = u.leaseup_months ?? CAP.leaseupMonths[protoKey(s)] ?? 20;
  const N = P + B + L; // month index 0..N; month 0 = site control, P = financial close, P+B = completion, N = stabilization
  const hardBudget = u.hard + u.site_work + u.contingency;
  const softPre = u.soft * CAP.predevSoftPct, softPost = u.soft - softPre;
  const curve = sCurve(B);
  const months: Month[] = [];
  const total = u.total_cost, loanCommit = total * a.debt.ltc, equityCommit = total - loanCommit;
  // interest reserve is drawn in proportion to the loan balance outstanding, so build loan balance first without it
  const raw: Omit<Month, "interest" | "total" | "equity" | "loan" | "cumEquity" | "cumLoan">[] = [];
  for (let m = 0; m <= N; m++) {
    const phase: Month["phase"] = m < P ? "Predevelopment" : m < P + B ? "Construction" : "Lease-up";
    let land = 0, soft = 0, hard = 0, ffe = 0, leaseup = 0;
    if (m === 0) land += u.land_cost * CAP.depositPct;
    if (m === P) land += u.land_cost * (1 - CAP.depositPct);
    if (m < P) soft += softPre / P;
    if (phase === "Construction") {
      const i = m - P;
      hard += hardBudget * curve[i];
      soft += softPost / B;
      if (i >= B - CAP.ffeMonths) ffe += u.ffe / CAP.ffeMonths;
    }
    if (phase === "Lease-up" && m < N) leaseup += u.leaseup / L;
    raw.push({ m, phase, land, soft, hard, ffe, leaseup });
  }
  // interest weights: cumulative non-interest spend after close (proxy for the loan balance)
  let cum = 0; const iw: number[] = [];
  for (const r of raw) { const spend = r.land + r.soft + r.hard + r.ffe + r.leaseup; cum += spend; iw.push(r.m > P && r.m < N ? cum : 0); }
  const iwT = iw.reduce((x, y) => x + y, 0) || 1;
  let eqLeft = equityCommit, cE = 0, cL = 0;
  for (let k = 0; k < raw.length; k++) {
    const r = raw[k];
    const interest = (u.carry * iw[k]) / iwT;
    const t = r.land + r.soft + r.hard + r.ffe + r.leaseup + interest;
    const equity = Math.min(t, Math.max(0, eqLeft)); // equity first, then the senior loan
    eqLeft -= equity;
    const loan = t - equity;
    cE += equity; cL += loan;
    months.push({ ...r, interest, total: t, equity, loan, cumEquity: cE, cumLoan: cL });
  }
  const uses = { land: u.land_cost, hard: u.hard, siteWork: u.site_work, contingency: u.contingency, ffe: u.ffe, soft: u.soft, interest: u.carry, leaseup: u.leaseup, total };
  // gates: what is at risk before each approval
  const sumTo = (end: number) => months.filter((x) => x.m < end).reduce((a2, x) => a2 + x.total, 0);
  const gates = [
    { gate: "1. Site control", when: "Month 0", released: u.land_cost * CAP.depositPct, test: "LOI inside max land; title, environmental Phase I, survey ordered" },
    { gate: "2. Entitlement and design", when: `Months 1–${P - 1}`, released: sumTo(P) - u.land_cost * CAP.depositPct, test: "Site plan / special permit approved; CN or ERCN filed; GMP within 3% of budget" },
    { gate: "3. Financial close", when: `Month ${P}`, released: months[P].total + 0, test: "Loan committed at ≤60% LTC; operator agreement signed; equity fully subscribed" },
    { gate: "4. Construction", when: `Months ${P + 1}–${P + B - 1}`, released: months.filter((x) => x.m > P && x.m < P + B).reduce((a2, x) => a2 + x.total, 0), test: "Monthly draws certified by the lender's construction monitor; 10% retainage" },
    { gate: "5. Lease-up", when: `Months ${P + B}–${N}`, released: months.filter((x) => x.m >= P + B).reduce((a2, x) => a2 + x.total, 0), test: "Operating deficit reserve released only against monthly variance reports" },
  ];
  const atRiskPreEntitlement = sumTo(P);
  // returns: sale at stabilization (month N) at the exit cap
  const noiTrended = noi * Math.pow(1 + CAP.trend, N / 12);
  const value = noiTrended / a.exit_cap;
  const netSale = value * (1 - CAP.saleCostPct);
  const unlev = months.map((x) => -x.total); unlev[N] += netSale;
  const lev = months.map((x) => -x.equity); lev[N] += netSale - cL;
  const irrU = annualize(irr(unlev)), irrL = annualize(irr(lev));
  const equityMultiple = (netSale - cL) / equityCommit;
  // hold: HUD 232-style take-out
  const permLoan = Math.min(noiTrended / CAP.permDebtYield, value * CAP.permMaxLtv);
  const mr = CAP.permRate / 12, np = CAP.permAmortYears * 12;
  const permDs = (permLoan * mr / (1 - Math.pow(1 + mr, -np))) * 12;
  const cashOut = permLoan - cL;
  const equityLeft = equityCommit - cashOut;
  // entrance-fee case (life-plan campuses): first-generation IL fees arrive as units fill during lease-up and
  // retire the construction loan first; IL monthly service fees run at efMonthlyPct of the rental rate.
  type EfCase = { noi: number; noiTrended: number; feePool: number; value: number; irrU: number; irrL: number; em: number; loanRetiredPct: number; yoc: number; profit: number };
  const efRun = (exempt: boolean): EfCase => {
    const ilRev = (u.lines || []).filter((l: any) => l.care === "IL").reduce((x: number, l: any) => x + l.revenue, 0);
    const noiE = noi - ilRev * (1 - CAP.efMonthlyPct) + (exempt ? u.taxes * (1 - a.tax_structures.nonprofit_exempt) : 0);
    const noiET = noiE * Math.pow(1 + CAP.trend, N / 12);
    const pool = u.entrance_fee.fee_pool;
    const fees = months.map((x) => (x.m >= P + B && x.m < N ? pool / (N - P - B) : 0));
    const valE = noiET / a.exit_cap, saleE = valE * (1 - CAP.saleCostPct);
    const unlevE = months.map((x, k) => -x.total + fees[k]); unlevE[N] += saleE;
    let bal = 0, retired = 0; const levE: number[] = [];
    for (let k = 0; k < months.length; k++) {
      bal += months[k].loan;
      const pay = Math.min(bal, fees[k]); bal -= pay; retired += pay;
      levE.push(-months[k].equity + (fees[k] - pay));
    }
    levE[N] += saleE - bal;
    const back = levE.filter((v) => v > 0).reduce((x, y) => x + y, 0);
    return { noi: noiE, noiTrended: noiET, feePool: pool, value: valE, irrU: annualize(irr(unlevE)), irrL: annualize(irr(levE)), em: back / equityCommit, loanRetiredPct: retired / (cL || 1), yoc: noiE / total, profit: pool + saleE - total };
  };
  // entrance-fee case (life-plan campuses): first-generation IL fees arrive as units fill during lease-up and retire the
  // construction loan first; IL monthly service fees run at efMonthlyPct of the rental rate. Shown taxable and with a
  // nonprofit sponsor (RiverSpring / LCS model: tax-exempt operations).
  const efCase = struct === "Entrance fee" && u.entrance_fee ? { taxable: efRun(false), nonprofit: efRun(true) } : null;
  return {
    struct, noi, P, B, L, N, months, uses, efCase, levCF: lev, loanCommit, equityCommit, lp: equityCommit * CAP.lpShare, gp: equityCommit * (1 - CAP.lpShare),
    gates, atRiskPreEntitlement, value, netSale, profit: netSale - total, profitOnCost: (netSale - total) / total,
    yoc: noi / total, irrUnlevered: irrU, irrLevered: irrL, equityMultiple,
    noiPerEquityDollar: noiTrended / equityCommit, valuePerDollar: value / total,
    perm: { loan: permLoan, ds: permDs, dscr: noiTrended / permDs, cashOut, equityLeft, cashYield: equityLeft > 0 ? (noiTrended - permDs) / equityLeft : null },
    noiTrended, yocTrended: noiTrended / total,
    peakEquityMonth: months.find((x) => x.cumEquity >= equityCommit - 1)?.m ?? N,
    maxLand: u.max_land, landCushion: u.land_cushion,
  };
}

export function irr(cf: number[]): number {
  const npv = (r: number) => cf.reduce((a, c, i) => a + c / Math.pow(1 + r, i), 0);
  let lo = -0.99, hi = 1.0;
  if (npv(lo) * npv(hi) > 0) return NaN;
  for (let k = 0; k < 200; k++) { const mid = (lo + hi) / 2; if (npv(lo) * npv(mid) <= 0) hi = mid; else lo = mid; }
  return (lo + hi) / 2;
}
export const annualize = (mr: number) => (Number.isFinite(mr) ? Math.pow(1 + mr, 12) - 1 : NaN);

/** Quarterly roll-up of the monthly schedule for charts. */
export function quarterly(months: Month[]) {
  const q: { q: number; equity: number; loan: number; cumEquity: number; cumLoan: number; phase: string }[] = [];
  for (const x of months) {
    const k = Math.floor(x.m / 3);
    if (!q[k]) q[k] = { q: k, equity: 0, loan: 0, cumEquity: 0, cumLoan: 0, phase: x.phase };
    q[k].equity += x.equity; q[k].loan += x.loan; q[k].cumEquity = x.cumEquity; q[k].cumLoan = x.cumLoan;
  }
  return q;
}
