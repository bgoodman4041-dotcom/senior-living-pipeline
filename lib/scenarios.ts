// Downside scenarios for investment-committee review: each shock alone, then all four together.
import { underwrite } from "./underwrite.ts";
import { capitalPlan, structureOf } from "./capital.ts";

export const SHOCKS = { rent: -0.10, hard: 0.10, exitBps: 50, leaseupMonths: 6 };

export interface Scenario { key: string; label: string; yoc: number; irrL: number; irrU: number; em: number; profit: number; equity: number; total: number; months: number }

export function scenarios(s: any, markets: any[], a: any): Scenario[] | null {
  const struct = structureOf(s);
  if (struct === "Entrance fee") return null;
  const base = underwrite(s, markets, a);
  const run = (key: string, label: string, w: any, exitAdd = 0): Scenario => {
    const uw = w ? { ...s.uw, ...underwrite(s, markets, a, w) } : s.uw;
    const p = capitalPlan({ ...s, uw }, { ...a, exit_cap: a.exit_cap + exitAdd }, struct);
    return { key, label, yoc: p.yoc, irrL: p.irrLevered, irrU: p.irrUnlevered, em: p.equityMultiple, profit: p.profit, equity: p.equityCommit, total: p.uses.total, months: p.N };
  };
  const rent = { rentIndex: base.rent_index * (1 + SHOCKS.rent) };
  const hard = { hardCostPsf: a.hard_cost_psf * (1 + SHOCKS.hard) };
  const lu = { leaseupExtraMonths: SHOCKS.leaseupMonths };
  const x = SHOCKS.exitBps / 10000;
  return [
    run("base", "Base case", null),
    run("rent", "Rents −10%", rent),
    run("hard", "Hard costs +10%", hard),
    run("exit", `Exit cap +${SHOCKS.exitBps} bps`, null, x),
    run("lease", `Lease-up +${SHOCKS.leaseupMonths} months`, lu),
    run("all", "Combined downside", { ...rent, ...hard, ...lu }, x),
  ];
}
