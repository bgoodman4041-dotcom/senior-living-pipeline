// TypeScript port of model/underwrite.py (the Python remains the source of truth).
// tests/run.ts checks that this reproduces every site's uw.yoc and uw.max_land.

export type Dict = Record<string, any>;

/** Months from opening to stabilization at industry-norm net move-ins (AL/MC 2-4/mo, IL 3-6/mo); mirrors model/underwrite.py. */
export function leaseupMonthsFor(mix: Record<string, number>, a: any, market: any): number {
  const lp = a.leaseup;
  const ratio = Number(market.unmet_demand_ratio) || 1.0;
  const adj = ratio >= 1.3 ? lp.adj : ratio <= 0.9 ? -lp.adj : 0;
  const cl = a.care_levels;
  const il = (mix.IL || 0) * cl.IL.stabilized_occupancy;
  const almc = ["AL", "MC", "SNF"].reduce((x, c) => x + (mix[c] || 0) * cl[c].stabilized_occupancy, 0);
  const m = Math.max(il ? il / (lp.il_pace + adj) : 0, almc ? almc / (lp.almc_pace + adj) : 0);
  return Math.max(lp.min_months, Math.ceil(m - 1e-9));
}

export function num(v: any, d: number | null = null): number | null {
  if (v === null || v === undefined) return d;
  const s = String(v).trim().replace(/\$/g, "").replace(/,/g, "");
  if (s === "") return d;
  const n = Number(s);
  return Number.isFinite(n) ? n : d;
}

const r = (x: number, dp = 0) => {
  const f = Math.pow(10, dp);
  return Math.round(x * f) / f;
};

export interface WhatIf {
  rentIndex?: number;      // submarket rent index override
  hardCostPsf?: number;    // $/SF
  taxPerUnit?: number;     // $/unit/yr
  landCost?: number;       // $ total
  occupancyDelta?: number; // added to each care level's stabilized occupancy (e.g. -0.03)
  leaseupExtraMonths?: number; // added to the norm lease-up period (downside cases)
}

export function marketFor(site: Dict, markets: Dict[], a: Dict): Dict {
  const m = markets.find((x) => x.state === site.state && x.county === site.county)
    || markets.find((x) => x.state === site.state && x.county === "*");
  if (!m) throw new Error(`No market row for ${site.state}|${site.county}`);
  const out: Dict = { ...m };
  out.rent_index = num(m.rent_index, 1.0);
  out.cost_index = num(m.cost_index, 1.0);
  out.tax_per_unit = num(m.tax_per_unit, a.default_tax_per_unit);
  out.county_rent_index = out.rent_index;
  const rs = num(site.rent_index_site);
  if (rs) out.rent_index = rs;
  return out;
}

function pickPrototype(site: Dict, a: Dict): string {
  const forced = (site.prototype || "").trim();
  if (forced) return forced;
  const acres = num(site.acres, 0) || 0;
  let best: string | null = null;
  for (const [k, p] of Object.entries<any>(a.prototypes)) {
    if (acres >= p.site_acres_min) {
      if (best === null || p.site_acres_min > a.prototypes[best].site_acres_min) best = k;
    }
  }
  return best || "C";
}

export function underwrite(site: Dict, markets: Dict[], a: Dict, w: WhatIf = {}) {
  const market = marketFor(site, markets, a);
  if (w.rentIndex !== undefined) market.rent_index = w.rentIndex;
  let protoKey = pickPrototype(site, a);
  let proto: Dict = a.prototypes[protoKey.replace(/\*$/, "")];
  const custom: Dict = {};
  let customSum = 0;
  for (const c of Object.keys(a.care_levels)) {
    custom[c] = Math.trunc(num(site[`mix_${c}`], 0) || 0);
    customSum += custom[c];
  }
  if (customSum > 0) {
    proto = {
      name: `Site program (${proto.name} scale)`,
      site_acres_typ: Math.min(num(site.acres, proto.site_acres_typ) as number, proto.site_acres_typ * 1.5),
      mix: custom,
    };
    protoKey = protoKey + "*";
  }
  const taxPerUnit = w.taxPerUnit ?? (num(site.tax_per_unit, market.tax_per_unit) as number);
  const costFactor = num(site.cost_factor, 1.0) as number;
  const hardPsf = w.hardCostPsf ?? a.hard_cost_psf;

  // prototype_proforma
  const rentIdx = market.rent_index;
  const costIdx = market.cost_index * costFactor;
  let units = 0, gpr = 0, gsf = 0, opex = 0;
  const lines: Dict[] = [];
  for (const [care, n] of Object.entries<number>(proto.mix)) {
    if (n <= 0) continue;
    const c = a.care_levels[care];
    let rent = c.base_monthly_rate * rentIdx;
    if (care === "AL" && num(market.al_medicaid_share, 0)) {
      const sh = num(market.al_medicaid_share) as number;
      rent = rent * (1 - sh) + (num(market.al_medicaid_monthly, 3500) as number) * sh;
    }
    const occ = Math.min(1, c.stabilized_occupancy + (w.occupancyDelta || 0));
    const revenue = n * rent * 12 * occ * (1 + c.ancillary_pct);
    const careOpex = revenue * (1 - c.noi_margin_pre_tax);
    units += n; gpr += revenue; opex += careOpex; gsf += n * c.gsf_per_unit;
    lines.push({ care, units: n, monthly_rate: r(rent), revenue: r(revenue), opex: r(careOpex) });
  }
  const reserves = units * a.replacement_reserve_per_unit;
  const taxes = units * taxPerUnit;
  const noi = gpr - opex - reserves - taxes;
  const hard = gsf * hardPsf * costIdx;
  const siteWork = proto.site_acres_typ * a.site_work_per_acre * costIdx;
  const ffe = units * a.ffe_per_unit;
  const soft = (hard + siteWork) * a.soft_cost_pct;
  const preLand = hard + siteWork + ffe + soft;
  const carry = preLand * a.construction_interest_pct_of_cost;
  const leaseupMonths = leaseupMonthsFor(proto.mix, a, market) + (w.leaseupExtraMonths || 0);
  const leaseup = (noi * leaseupMonths * a.leaseup.deficit_share_of_noi) / 12;
  const contingency = (hard + siteWork) * a.contingency_pct;
  const costExLand = preLand + carry + leaseup + contingency;

  const hurdle = a.hurdle_yoc;
  const maxLand = noi / hurdle - costExLand;
  let landCost: number, basis: string;
  if (w.landCost !== undefined) { landCost = w.landCost; basis = "what-if"; }
  else if (num(site.asking_price)) { landCost = num(site.asking_price) as number; basis = "ask"; }
  else if (num(site.est_land_value)) { landCost = num(site.est_land_value) as number; basis = "estimate"; }
  else { landCost = (num(market.land_per_unit, a.default_land_per_unit) as number) * units; basis = "market comp/unit"; }
  const totalCost = costExLand + landCost;
  const yoc = totalCost ? noi / totalCost : 0;
  const yocBy: Dict = {}, maxLandBy: Dict = {};
  for (const [k, factor] of Object.entries<number>(a.tax_structures)) {
    const noiK = noi + taxes * (1 - factor);
    yocBy[k] = totalCost ? noiK / totalCost : 0;
    maxLandBy[k] = noiK / hurdle - costExLand;
  }
  const d = a.debt;
  const loan = totalCost * d.ltc;
  const mr = d.rate / 12, nper = d.amort_years * 12;
  const pmt = (loan * mr / (1 - Math.pow(1 + mr, -nper))) * 12;
  const noiRd = (gpr - opex) * 0.9 - taxes - reserves;
  return {
    prototype: protoKey, units, gsf, revenue: gpr, opex, taxes, reserves, noi,
    hard, site_work: siteWork, ffe, soft, carry, leaseup, leaseup_months: leaseupMonths, contingency, cost_ex_land: costExLand,
    land_cost: landCost, land_cost_basis: basis, total_cost: totalCost, yoc, max_land: maxLand,
    land_cushion: maxLand - landCost, yoc_by_tax_structure: yocBy, max_land_by_tax_structure: maxLandBy,
    loan, dscr: pmt ? noi / pmt : null, equity: totalCost - loan,
    breakeven_rent_ratio: gpr > opex ? (hurdle * totalCost + taxes + reserves) / (gpr - opex) : null,
    stress: {
      yoc_rent_down_10: noiRd / totalCost,
      yoc_cost_up_10: noi / (costExLand * 1.1 + landCost),
      yoc_both: noiRd / (costExLand * 1.1 + landCost),
    },
    lines, rent_index: rentIdx, tax_per_unit: taxPerUnit, hard_cost_psf: hardPsf,
  };
}
