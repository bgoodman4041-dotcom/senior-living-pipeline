"""
Senior living site underwriter.

For every candidate site, picks the prototype the land can carry, prices it off
the local rent index, and solves the one number that matters: the maximum land
price at which stabilized yield on cost still clears the hurdle (6.50%).

    YOC        = stabilized NOI / all-in development cost (incl. land)
    max land   = NOI / hurdle - (all-in cost ex-land)
    land cushion = max land - asking (or est. land value)

Inputs:  model/assumptions.json, data/sites.csv, data/markets.csv
Outputs: data/sites_underwritten.json, data/sites_underwritten.csv

Standard library only, so it runs anywhere (and ports cleanly to TypeScript).
"""

from __future__ import annotations

import csv
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def load_json(p: Path) -> dict:
    with open(p) as f:
        return json.load(f)


def load_csv(p: Path) -> list[dict]:
    with open(p, newline="") as f:
        return list(csv.DictReader(f))


def num(v, default=None):
    try:
        if v is None or str(v).strip() == "":
            return default
        return float(str(v).replace("$", "").replace(",", ""))
    except ValueError:
        return default


# -----------------------------------------------------------------------------
# Pro forma
# -----------------------------------------------------------------------------
def prototype_proforma(proto: dict, a: dict, market: dict, tax_per_unit: float,
                       cost_factor: float = 1.0) -> dict:
    """Stabilized NOI and all-in cost ex-land for one prototype in one market.

    cost_factor < 1 for adaptive reuse of an existing building (Trumbull-type).
    """
    rent_idx = market["rent_index"]
    cost_idx = market["cost_index"] * cost_factor
    units = 0
    gpr = 0.0
    gsf = 0.0
    opex = 0.0
    lines = []
    for care, n in proto["mix"].items():
        if n <= 0:
            continue
        c = a["care_levels"][care]
        rent = c["base_monthly_rate"] * rent_idx           # per unit per month
        if care == "AL" and num(market.get("al_medicaid_share"), 0):
            # NJ CN condition: 10% of AL beds at Medicaid within 3 yrs, held forever
            sh = num(market["al_medicaid_share"])
            rent = rent * (1 - sh) + num(market.get("al_medicaid_monthly"), 3500) * sh
        occ = c["stabilized_occupancy"]
        revenue = n * rent * 12 * occ * (1 + c["ancillary_pct"])
        # Opex modeled as a margin on revenue before property tax, so it scales with
        # acuity; property tax is added separately because it varies 5x by town.
        care_opex = revenue * (1 - c["noi_margin_pre_tax"])
        units += n
        gpr += revenue
        opex += care_opex
        gsf += n * c["gsf_per_unit"]
        lines.append({"care": care, "units": n, "monthly_rate": round(rent),
                      "revenue": round(revenue), "opex": round(care_opex)})

    reserves = units * a["replacement_reserve_per_unit"]
    taxes = units * tax_per_unit
    noi = gpr - opex - reserves - taxes

    hard = gsf * a["hard_cost_psf"] * cost_idx
    site_work = proto["site_acres_typ"] * a["site_work_per_acre"] * cost_idx
    ffe = units * a["ffe_per_unit"]
    soft = (hard + site_work) * a["soft_cost_pct"]
    pre_land = hard + site_work + ffe + soft
    # Financing carry and lease-up operating deficit, funded in the budget
    carry = pre_land * a["construction_interest_pct_of_cost"]
    leaseup = noi * a["leaseup_deficit_months_of_noi"] / 12
    contingency = (hard + site_work) * a["contingency_pct"]
    cost_ex_land = pre_land + carry + leaseup + contingency

    return {
        "units": units, "gsf": round(gsf), "revenue": round(gpr), "opex": round(opex),
        "taxes": round(taxes), "reserves": round(reserves), "noi": round(noi),
        "noi_margin": round(noi / gpr, 4) if gpr else 0,
        "hard": round(hard), "site_work": round(site_work), "ffe": round(ffe),
        "soft": round(soft), "carry": round(carry), "leaseup": round(leaseup),
        "contingency": round(contingency), "cost_ex_land": round(cost_ex_land),
        "cost_per_unit_ex_land": round(cost_ex_land / units) if units else 0,
        "lines": lines,
    }


def debt_check(noi: float, total_cost: float, a: dict) -> dict:
    d = a["debt"]
    loan = total_cost * d["ltc"]
    r = d["rate"] / 12
    n = d["amort_years"] * 12
    pmt = loan * r / (1 - (1 + r) ** -n) * 12
    return {"loan": round(loan), "annual_debt_service": round(pmt),
            "dscr": round(noi / pmt, 2) if pmt else None,
            "debt_yield": round(noi / loan, 4) if loan else None,
            "equity": round(total_cost - loan)}


def entrance_fee_test(pf: dict, proto: dict, market: dict, total_cost: float, a: dict) -> dict | None:
    """Can first-generation entrance fees retire the IL component's cost?

    This is how RiverSpring's River's Edge and LCS's Broadview pencil: the IL is
    judged on fee coverage and presales, not stabilized YOC. Fee is capped at
    ~90% of the submarket home value (residents fund it by selling the house).
    """
    e = a["entrance_fee"]
    il = proto["mix"].get("IL", 0)
    if il < e["min_il_units"]:
        return None
    hv = num(market.get("med_home_value"), 400000)
    county_ri = num(market.get("county_rent_index"), market["rent_index"]) or 1.0
    sub_hv = hv * market["rent_index"] / county_ri
    fee = sub_hv * e["fee_to_home_value"]
    il_gsf = il * a["care_levels"]["IL"]["gsf_per_unit"]
    il_cost = total_cost * il_gsf / pf["gsf"] if pf["gsf"] else 0
    pool = il * e["presale_occupancy"] * fee
    cov = pool / il_cost if il_cost else 0
    return {"avg_fee": round(fee), "fee_pool": round(pool), "il_cost": round(il_cost),
            "coverage": round(cov, 2), "viable": cov >= e["min_coverage"],
            "developer_fee": round(total_cost * e["developer_fee_pct"])}


def pick_prototype(site: dict, a: dict) -> str:
    """Biggest prototype the land and the entitlement path can carry."""
    acres = num(site.get("acres"), 0) or 0
    forced = (site.get("prototype") or "").strip()
    if forced:
        return forced
    best = None
    for key, p in a["prototypes"].items():
        if acres >= p["site_acres_min"]:
            if best is None or p["site_acres_min"] > a["prototypes"][best]["site_acres_min"]:
                best = key
    return best or "C"


# -----------------------------------------------------------------------------
# Scoring: town approval, rent support, need
# -----------------------------------------------------------------------------
def clamp(x, lo=0.0, hi=100.0):
    return max(lo, min(hi, x))


def score_site(site: dict, market: dict, uw: dict, a: dict) -> dict:
    w = a["score_weights"]
    # Approval: entered by analyst 0-100 from the zoning path / precedent / opposition
    approval = num(site.get("approval_score"), 50)
    # Rent support: are the rents this deal NEEDS already proven locally, and can
    # the local 75+ base pay them? (a) breakeven ratio = rent required for the
    # hurdle / submarket-proven rent; (b) capacity = home equity + income vs rent.
    ber = uw.get("breakeven_rent_ratio") or 2.0
    proven = clamp(60 - (ber - 1.0) * 200)          # 0.85 -> 90, 1.00 -> 60, 1.15 -> 30
    hv = num(market.get("med_home_value"), 400000)
    inc = num(market.get("med_hh_inc_65plus"), 60000)
    capacity = clamp(50 * min(hv / 650000, 1.3) + 50 * min(inc / 90000, 1.3))
    rent_support = 0.6 * proven + 0.4 * capacity
    # Need: age-qualified, income-qualified demand vs existing + pipeline supply,
    # from the PMA math in markets.csv (units of unmet demand per proposed unit).
    unmet_ratio = num(site.get("unmet_demand_ratio"), num(market.get("unmet_demand_ratio"), 1.0))
    need = clamp(25 * unmet_ratio + 25)
    # Yield: how far over the hurdle at the asking/estimated land price
    yoc = uw["yoc"]
    yield_score = clamp(50 + (yoc - a["hurdle_yoc"]) * 2000)  # +/-25 bps = +/-5 pts
    total = (w["approval"] * approval + w["rent_support"] * rent_support
             + w["need"] * need + w["yield"] * yield_score)
    return {"approval": round(approval), "rent_support": round(rent_support),
            "need": round(need), "yield": round(yield_score), "total": round(total, 1)}


def gates(site: dict, uw: dict, sc: dict, a: dict) -> list[str]:
    """Hard kills. An empty list means the site survives to a verdict."""
    g = a["gates"]
    out = []
    if (num(site.get("drive_min_midtown"), 0) or 0) > g["max_drive_min"].get(site["state"], 120):
        out.append("Outside drive band")
    if (num(site.get("acres"), 0) or 0) < g["min_acres"]:
        out.append("Undersized")
    if sc["approval"] < g["min_approval_score"]:
        out.append("Entitlement path not credible")
    return out


def verdict(uw: dict, sc: dict, kills: list[str], a: dict) -> tuple[str, str]:
    """Pursue / Pursue-structured / Watch / Pass, with the reason in one line."""
    h = a["hurdle_yoc"]
    ys = uw["yoc_by_tax_structure"]
    near = a["near_miss_bps"] / 10000
    if kills:
        return "Pass", "; ".join(kills)
    approvable = sc["approval"] >= 55
    if uw["yoc"] >= h and uw["land_cushion"] is not None and uw["land_cushion"] >= 0:
        return ("Pursue", "Clears 6.5% fully taxed at the land basis") if approvable else \
               ("Watch", "Clears 6.5% but entitlement risk is high")
    if ys["pilot"] >= h:
        return ("Pursue-structured", "Clears 6.5% only with a PILOT / tax abatement") if approvable else \
               ("Watch", "Needs PILOT and entitlement risk is high")
    ef = uw.get("entrance_fee")
    if ef and ef["viable"] and approvable:
        return ("Pursue-structured",
                f"Rental misses; works as entrance-fee life plan (fees cover {ef['coverage']:.0%} of IL cost)")
    if ys["nonprofit_exempt"] >= h and approvable:
        return "Watch", "Clears only under nonprofit (RiverSpring-style) tax treatment"
    if ys["pilot"] >= h - near and approvable:
        return "Watch", "Within 50 bps with a PILOT; needs a cost or rent lift"
    return "Pass", f"Below 6.5% under every structure (best {ys['nonprofit_exempt']*100:.2f}%)"


def underwrite_site(site: dict, markets: dict, a: dict) -> dict:
    mkey = f'{site["state"]}|{site["county"]}'
    market = markets.get(mkey) or markets.get(f'{site["state"]}|*')
    if not market:
        raise KeyError(f"No market row for {mkey}")
    market = dict(market)
    market["county_rent_index"] = market["rent_index"]
    if num(site.get("rent_index_site")):
        # Submarket rent level (town cluster) overrides the county index
        market["rent_index"] = num(site["rent_index_site"])
    proto_key = pick_prototype(site, a)
    proto = a["prototypes"][proto_key.rstrip("*")]
    custom = {c: int(num(site.get(f"mix_{c}"), 0) or 0) for c in a["care_levels"]}
    if sum(custom.values()) > 0:
        # Site carries its own approved / proposed program
        proto = {"name": f'Site program ({proto["name"]} scale)',
                 "site_acres_typ": min(num(site.get("acres"), proto["site_acres_typ"]), proto["site_acres_typ"] * 1.5),
                 "mix": custom}
        proto_key = proto_key + "*"
    tax_per_unit = num(site.get("tax_per_unit"), market["tax_per_unit"])
    pf = prototype_proforma(proto, a, market, tax_per_unit, num(site.get("cost_factor"), 1.0))

    hurdle = a["hurdle_yoc"]
    max_land = pf["noi"] / hurdle - pf["cost_ex_land"]
    # Land basis: the ask if public, else an analyst estimate, else the market's
    # entitled land comp per unit. Never solved backward from the hurdle.
    if num(site.get("asking_price")):
        land_cost, basis = num(site.get("asking_price")), "ask"
    elif num(site.get("est_land_value")):
        land_cost, basis = num(site.get("est_land_value")), "estimate"
    else:
        land_cost, basis = num(market.get("land_per_unit"), a["default_land_per_unit"]) * pf["units"], "market comp/unit"
    total_cost = pf["cost_ex_land"] + land_cost
    yoc = pf["noi"] / total_cost if total_cost else 0
    uw = {
        "prototype": proto_key, "prototype_name": proto["name"], **pf,
        "land_cost": round(land_cost), "land_cost_basis": basis,
        "total_cost": round(total_cost), "yoc": round(yoc, 4),
        "max_land": round(max_land), "max_land_per_unit": round(max_land / pf["units"]),
        "land_cushion": round(max_land - land_cost) if land_cost else None,
        "value_at_exit_cap": round(pf["noi"] / a["exit_cap"]),
        "profit_on_cost": round(pf["noi"] / a["exit_cap"] / total_cost - 1, 3) if total_cost else None,
        # Break-even rent: blended monthly rate at which YOC hits the hurdle
        # (required revenue / modeled revenue); < 1.0 means rents have room to fall.
        "breakeven_rent_ratio": round(
            (hurdle * total_cost + pf["taxes"] + pf["reserves"])
            / (pf["revenue"] - pf["opex"]), 3) if pf["revenue"] > pf["opex"] else None,
    }
    # Tax structure is the swing factor in this region: RiverSpring-style nonprofit
    # ownership is largely exempt; a county IDA PILOT roughly halves the load.
    uw["yoc_by_tax_structure"] = {}
    uw["max_land_by_tax_structure"] = {}
    for k, factor in a["tax_structures"].items():
        noi_k = pf["noi"] + pf["taxes"] * (1 - factor)
        uw["yoc_by_tax_structure"][k] = round(noi_k / total_cost, 4) if total_cost else 0
        uw["max_land_by_tax_structure"][k] = round(noi_k / hurdle - pf["cost_ex_land"])
    uw.update(debt_check(pf["noi"], total_cost, a))
    # Stress: rents -10% (opex is a margin, so NOI falls with revenue less fixed tax/
    # reserves) and hard/soft cost +10%.
    noi_rd = (pf["revenue"] - pf["opex"]) * 0.9 - pf["taxes"] - pf["reserves"]
    uw["stress"] = {
        "yoc_rent_down_10": round(noi_rd / total_cost, 4) if total_cost else 0,
        "yoc_cost_up_10": round(pf["noi"] / (pf["cost_ex_land"] * 1.1 + land_cost), 4),
        "yoc_both": round(noi_rd / (pf["cost_ex_land"] * 1.1 + land_cost), 4),
    }
    uw["entrance_fee"] = entrance_fee_test(pf, proto, market, total_cost, a)
    sc = score_site(site, market, uw, a)
    kills = gates(site, uw, sc, a)
    v, why = verdict(uw, sc, kills, a)
    return {**site, "market": market, "uw": uw, "scores": sc, "kills": kills,
            "verdict": v, "verdict_reason": why}


def main(argv=None):
    a = load_json(ROOT / "model" / "assumptions.json")
    mrows = load_csv(ROOT / "data" / "markets.csv")
    markets = {}
    for m in mrows:
        m2 = dict(m)
        for k in ("rent_index", "cost_index", "tax_per_unit"):
            m2[k] = num(m.get(k), 1.0 if k != "tax_per_unit" else a["default_tax_per_unit"])
        markets[f'{m["state"]}|{m["county"]}'] = m2
    sites = load_csv(ROOT / "data" / "sites.csv")
    out = [underwrite_site(s, markets, a) for s in sites]
    order = {"Pursue": 0, "Pursue-structured": 1, "Watch": 2, "Pass": 3}
    out.sort(key=lambda r: (order[r["verdict"]], -r["scores"]["total"]))
    for i, r in enumerate(out, 1):
        r["rank"] = i
    (ROOT / "data" / "sites_underwritten.json").write_text(json.dumps(out, indent=2))
    flat_cols = ["rank", "id", "name", "municipality", "county", "state", "acres", "verdict"]
    with open(ROOT / "data" / "sites_underwritten.csv", "w", newline="") as f:
        wr = csv.writer(f)
        wr.writerow(flat_cols + ["prototype", "units", "noi", "total_cost", "yoc", "max_land",
                                 "land_cost", "dscr", "approval", "rent_support", "need", "score", "verdict_reason"])
        for r in out:
            u, s = r["uw"], r["scores"]
            wr.writerow([r.get(c, "") for c in flat_cols] + [
                u["prototype"], u["units"], u["noi"], u["total_cost"], u["yoc"], u["max_land"],
                u["land_cost"], u["dscr"], s["approval"], s["rent_support"], s["need"], s["total"],
                r["verdict_reason"]])
    for r in out:
        u = r["uw"]
        print(f'{r["rank"]:>2} {r["verdict"]:<17} {r["name"][:38]:<38} {r["state"]} '
              f'{u["prototype"]} {u["units"]:>3}u YOC {u["yoc"]*100:5.2f}% '
              f'maxLand ${u["max_land"]/1e6:6.1f}M ask ${u["land_cost"]/1e6:5.1f}M '
              f'PILOT {u["yoc_by_tax_structure"]["pilot"]*100:5.2f}% NP {u["yoc_by_tax_structure"]["nonprofit_exempt"]*100:5.2f}% '
              f'DSCR {u["dscr"]} A{r["scores"]["approval"]} R{r["scores"]["rent_support"]} N{r["scores"]["need"]} score {r["scores"]["total"]}  {r["verdict_reason"]}')


if __name__ == "__main__":
    sys.exit(main())
