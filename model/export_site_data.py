"""
Builds build-spec/site-data.json: the single file the website reads.

    python3 model/underwrite.py && python3 model/export_site_data.py

Joins the underwritten sites with research sources, the county market table,
the prototype program, the state regulatory matrix, comps and the diligence
checklist, so the site has no hand-typed numbers.
"""

from __future__ import annotations

import csv
import json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def rows(p):
    with open(p, newline="") as f:
        return list(csv.DictReader(f))


def research_sources():
    out = {}
    for st in ("ny", "ct", "nj"):
        p = ROOT / "research" / f"sites-{st}.csv"
        if p.exists():
            for r in rows(p):
                urls = [u.strip(" ;,") for u in r.get("sources", "").replace(";", " ").split() if u.startswith("http")]
                out[r["id"]] = {"sources": urls, "zoning": r.get("zoning", ""),
                                "senior_use_path": r.get("senior_use_path", ""),
                                "prior_use": r.get("prior_use", ""), "sewer_water": r.get("sewer_water", ""),
                                "approval_evidence": r.get("approval_evidence", "")}
    return out


DILIGENCE = [
    ("control", "Site control: LOI / option / JV term sheet"),
    ("title", "Title commitment and survey (ALTA)"),
    ("phase1", "Phase I ESA (Phase II if RECs)"),
    ("wetlands", "Wetlands delineation, FEMA flood zone, NJ Highlands / NYC watershed check"),
    ("geotech", "Geotechnical borings, rock and groundwater"),
    ("utilities", "Sewer capacity and water will-serve letters; power"),
    ("traffic", "Traffic study and DOT access permit"),
    ("zoning", "Zoning opinion: permitted / special permit / rezoning path"),
    ("seqr", "Environmental review (SEQRA / NJ / CEPA) scope"),
    ("license", "State licensure / CN path (NY ALR-EALR, NJ expedited CN, CT ALSA) or Article 46 / CCRC registration"),
    ("market", "Third-party market study: PMA, penetration, capture, rate shop"),
    ("fiscal", "Fiscal impact study for the town"),
    ("tax", "Assessor estimate and PILOT / abatement term sheet"),
    ("operator", "Operator LOI and management agreement terms"),
    ("capital", "Construction lender term sheet; equity commitment"),
]

REGULATORY = {
    "NY": {"rental_il": "Local zoning (special permit / floating zone typical)",
           "al_mc": "ALR / EALR / SNALR licence; no bed-need test; ~9-18 months",
           "snf": "New beds presumed unneeded below 97% county occupancy (10 NYCRR 709.3); buy or contract",
           "ccrc": "Article 46 Certificate of Authority before 10% deposits; nonprofit norm",
           "tax_tool": "County IDA PILOT + sales-tax exemption"},
    "NJ": {"rental_il": "Local zoning / redevelopment plan",
           "al_mc": "Expedited CN (~12 months) + 10% Medicaid occupancy within 3 yrs, held permanently",
           "snf": "General bed call cancelled (86.6% vs 90% target); buy existing beds",
           "ccrc": "DCA registration and disclosure",
           "tax_tool": "Redevelopment-area long-term PILOT"},
    "CT": {"rental_il": "Local zoning (P&Z special permit / text amendment)",
           "al_mc": "No CON (CGS 19a-638(b)(5)); ALSA licence + managed residential community",
           "snf": "Moratorium, except CCRC beds not used for Medicaid",
           "ccrc": "DSS registration; for-profit precedent (Edgehill)",
           "tax_tool": "CGS 12-65b tax abatement agreement"},
}

COMPS = [
    {"name": "River's Edge (RiverSpring)", "town": "Riverdale, Bronx NY", "type": "Entrance-fee CCRC (IL)", "units": 260,
     "pricing": "$2.1M avg entrance fee, $9,200/mo", "status": "86% reserved; opens Dec 2028",
     "url": "https://seniorcare.levinassociates.com/2026/03/02/new-york-citys-first-ccrc-development-secures-major-bond-financing/"},
    {"name": "Broadview at Purchase College (LCS)", "town": "Purchase NY", "type": "Institutional ground-lease CCRC", "units": 220,
     "pricing": "n/d", "status": "Opened 2024, 90%+ reserved",
     "url": "https://seniorshousingbusiness.com/lcs-opens-174-unit-broadview-at-purchase-college-in-westchester-new-york/"},
    {"name": "Benchmark Mount Pleasant", "town": "Thornwood NY", "type": "Rental AL/MC", "units": 100,
     "pricing": "$9,810 base AL", "status": "Approved 2022, opened late 2025",
     "url": "https://westfaironline.com/apartments/benchmark-senior-facility-opens-in-thornwood"},
    {"name": "Erickson at Arrowwood", "town": "Rye Brook NY", "type": "Large CCRC", "units": 834,
     "pricing": "n/d", "status": "Positive declaration Aug 2026, DEIS required",
     "url": "https://dec.ny.gov/news/environmental-notice-bulletin/2026-08-12/seqr/village-of-rye-brook-erickson-living-properties-llc"},
    {"name": "CopperWood (Pfizer campus)", "town": "Peapack-Gladstone NJ", "type": "IL/AL/MC", "units": 225,
     "pricing": "n/d", "status": "$84.7M bonds closed Aug 2026",
     "url": "https://seniorshousingbusiness.com/?p=32457"},
    {"name": "Sunrise of Scarsdale", "town": "Scarsdale NY", "type": "Rental AL", "units": None,
     "pricing": "$11,525 base AL", "status": "Operating",
     "url": "https://www.caring.com/senior-living/assisted-living/new-york/westchester-county"},
    {"name": "Sturges Ridge", "town": "Fairfield CT", "type": "Rental AL", "units": None,
     "pricing": "$12,550 base AL", "status": "Operating",
     "url": "https://www.caring.com/senior-living/assisted-living/connecticut/fairfield-county"},
    {"name": "The Delaney at The Green", "town": "Florham Park NJ", "type": "Rental AL", "units": None,
     "pricing": "$10,800 base AL", "status": "Operating",
     "url": "https://www.caring.com/senior-living/assisted-living/new-jersey/morris-county"},
    {"name": "Paramus 731 Pascack Rd (land trade)", "town": "Paramus NJ", "type": "Land comp", "units": 162,
     "pricing": "$9.25M ($57k per approved 55+ unit)", "status": "Sold Jan 2026",
     "url": "https://re-nj.com/paramus-tract-slated-for-162-unit-luxury-senior-housing-project-sells-for-9-25-million/"},
]


def main():
    a = json.loads((ROOT / "model" / "assumptions.json").read_text())
    sites = json.loads((ROOT / "data" / "sites_underwritten.json").read_text())
    src = research_sources()
    markets = rows(ROOT / "data" / "markets.csv")
    for s in sites:
        s["research"] = src.get(s["id"], {})
        s["diligence"] = [{"key": k, "item": v, "status": "Not started"} for k, v in DILIGENCE]
        s["regulatory"] = REGULATORY[s["state"]]
        s.pop("market", None)  # county row lives in markets[]; join on state+county
    funnel = {
        "sourced": 47, "underwritten": len(sites),
        "survive": sum(1 for s in sites if s["verdict"] != "Pass"),
        "shortlist": sum(1 for s in sites if s["verdict"].startswith("Pursue")),
    }
    out = {
        "meta": {"title": "Senior Living Site Pipeline: RiverSpring-model communities, NY / CT / NJ",
                 "as_of": date.today().isoformat(), "hurdle_yoc": a["hurdle_yoc"],
                 "drive_bands_min": a["gates"]["max_drive_min"],
                 "note": "Indices marked [I] in markets are calibrated estimates; replace with NIC MAP + assessor data before LOI."},
        "funnel": funnel,
        "assumptions": a,
        "markets": markets,
        "regulatory": REGULATORY,
        "comps": COMPS,
        "sites": sites,
    }
    p = ROOT / "build-spec" / "site-data.json"
    p.write_text(json.dumps(out, indent=1))
    print(f"wrote {p} ({p.stat().st_size // 1024} KB), {len(sites)} sites, funnel {funnel}")


if __name__ == "__main__":
    main()
