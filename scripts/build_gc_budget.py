"""Florham Park (NJ-04) GC budget outline: the model's hard cost spread across CSI divisions, with columns for a GC to price.

    python3 scripts/build_gc_budget.py   -> public/models/ATCO-NJ-04-GC-budget.xlsx
Division shares are planning allocations for a 3-4 story AL/MC building [I]; the GC's numbers replace them.
"""
import json
from pathlib import Path
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from atco_xlsx import brand  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
D = json.loads((ROOT / "data" / "site-data.json").read_text())
s = next(x for x in D["sites"] if x["id"] == "NJ-04")
u = s["uw"]

DIVS = [
    ("01", "General requirements and conditions", "Supervision, temp facilities, cleanup, winter conditions", 0.07),
    ("03", "Concrete", "Foundations, slab on grade, podium if any", 0.07),
    ("04", "Masonry", "Veneer at base, site walls", 0.03),
    ("05", "Metals", "Structural steel at common areas, stairs, rails", 0.04),
    ("06", "Wood, plastics and composites", "Wood framing, trusses, sheathing, rough carpentry", 0.11),
    ("07", "Thermal and moisture protection", "Roofing (hipped slate-look), insulation, air barrier, siding", 0.07),
    ("08", "Openings", "Windows, storefront, doors, hardware incl. MC delayed egress", 0.05),
    ("09", "Finishes", "Drywall, flooring, ceilings, paint, tile", 0.12),
    ("10", "Specialties", "Signage, toilet accessories, fire extinguishers", 0.02),
    ("11", "Equipment", "Commercial kitchen, laundry, servery", 0.03),
    ("12", "Furnishings", "Casework, kitchenettes, window treatments (FF&E is separate)", 0.02),
    ("14", "Conveying equipment", "Two passenger elevators, one service", 0.02),
    ("21", "Fire suppression", "NFPA 13 sprinkler", 0.025),
    ("22", "Plumbing", "Domestic water, sanitary, fixtures, gas", 0.075),
    ("23", "HVAC", "PTAC/VTAC or VRF in units, central ventilation, MC pressurization", 0.08),
    ("26", "Electrical", "Service, distribution, lighting, generator", 0.09),
    ("27-28", "Communications and electronic safety", "Nurse call, access control, wander management, fire alarm, low voltage", 0.03),
    ("GC", "GC fee", "Fee on cost of work", 0.035),
    ("GC", "Insurance and bond", "GL, builder's risk if GC-carried, P&P bond", 0.015),
]
assert abs(sum(d[3] for d in DIVS) - 1) < 1e-9

wb = Workbook(); ws = wb.active; ws.title = "GC Budget"
B = Font(name="Arial", bold=True); N = Font(name="Arial"); H = Font(name="Arial", bold=True, color="FFFFFFFF"); IN = Font(name="Arial", bold=True, color="FF0070C0")
HF = PatternFill("solid", fgColor="FF403393"); SF = PatternFill("solid", fgColor="FFEFEEF6")
ws["B2"] = f"Florham Park AL/MC pad: GC budget outline ({s['name']})".upper(); ws["B2"].font = Font(name="Arial", size=14, bold=True, color="FF292929")
ws["B3"] = (f"{u['units']} units ({', '.join(str(l['units']) + ' ' + l['care'] for l in u['lines'])}), {u['gsf']:,.0f} GSF. Model building hard cost ${u['hard']:,.0f} "
            f"(${u['hard'] / u['gsf']:,.0f}/GSF). Division shares are ATCO planning allocations; GC enters its price in column G.")
ws["B3"].font = Font(name="Arial", italic=True, size=9)
hdr = ["Div.", "Scope", "Includes", "Share", "Model budget", "$/GSF", "GC price", "Variance", "GC notes / exclusions"]
for i, h in enumerate(hdr):
    c = ws.cell(row=5, column=2 + i, value=h); c.font = H; c.fill = HF
r = 6
ws["L2"] = "Building hard cost"; ws["M2"] = u["hard"]; ws["M2"].number_format = "$#,##0"; ws["M2"].font = IN
ws["L3"] = "GSF"; ws["M3"] = u["gsf"]; ws["M3"].number_format = "#,##0"; ws["M3"].font = IN
for d, scope, inc, sh in DIVS:
    ws.cell(row=r, column=2, value=d).font = N
    ws.cell(row=r, column=3, value=scope).font = B
    ws.cell(row=r, column=4, value=inc).font = N
    c = ws.cell(row=r, column=5, value=sh); c.number_format = "0.0%"; c.font = IN
    ws.cell(row=r, column=6, value=f"=E{r}*$M$2").number_format = "$#,##0"
    ws.cell(row=r, column=7, value=f"=F{r}/$M$3").number_format = "$#,##0"
    ws.cell(row=r, column=8).number_format = "$#,##0"
    ws.cell(row=r, column=9, value=f'=IF(H{r}="","",H{r}-F{r})').number_format = "$#,##0;[Red]-$#,##0"
    r += 1
first, last = 6, r - 1
ws.cell(row=r, column=3, value="Building subtotal").font = B
ws.cell(row=r, column=5, value=f"=SUM(E{first}:E{last})").number_format = "0.0%"
for col in "FGHI":
    c = ws[f"{col}{r}"]; c.value = f"=SUM({col}{first}:{col}{last})" if col != "G" else f"=F{r}/$M$3"; c.number_format = "$#,##0"; c.font = B
for col in range(2, 11): ws.cell(row=r, column=col).fill = SF
r += 2
extra = [("31-33", "Site work", "Earthwork, utilities, paving, landscape, stormwater", u["site_work"]),
         ("Owner", "Owner hard-cost contingency", "Held by owner, not in GMP", u["contingency"])]
for d, scope, inc, v in extra:
    ws.cell(row=r, column=2, value=d); ws.cell(row=r, column=3, value=scope).font = B; ws.cell(row=r, column=4, value=inc)
    ws.cell(row=r, column=6, value=v).number_format = "$#,##0"; ws.cell(row=r, column=8).number_format = "$#,##0"
    ws.cell(row=r, column=9, value=f'=IF(H{r}="","",H{r}-F{r})').number_format = "$#,##0;[Red]-$#,##0"; r += 1
ws.cell(row=r, column=3, value="Construction contract incl. site work and contingency").font = B
ws.cell(row=r, column=6, value=f"=F{first + len(DIVS)}+F{r - 2}+F{r - 1}").number_format = "$#,##0"; ws.cell(row=r, column=6).font = B
r += 2
notes = ["Pricing basis: GMP at financial close, open book, 10% retainage; owner keeps the contingency shown.",
         "Program: AL 950 GSF/unit and MC 800 GSF/unit gross (comp: Benchmark East Brunswick 969 SF/unit; Cortlandt Evergreen Manor 96,850 SF / 100 units).",
         "Excluded from this budget: land, FF&E, soft costs, construction interest, lease-up reserve (see the site pro forma).",
         "Benchmarks: Weitz/ASHA AL hard cost $280-356/SF mid-level and $363-452/SF high-level (national, Feb 2026)."]
for t in notes:
    ws.cell(row=r, column=2, value=t).font = Font(name="Arial", italic=True, size=9); r += 1
for col, w in {"A": 2, "B": 7, "C": 34, "D": 52, "E": 8, "F": 14, "G": 9, "H": 14, "I": 12, "J": 30, "L": 18, "M": 14}.items():
    ws.column_dimensions[col].width = w
ws.freeze_panes = "B6"
wb.calculation.fullCalcOnLoad = True
out = ROOT / "public" / "models" / "ATCO-NJ-04-GC-budget.xlsx"
brand(wb, "ATCO Properties & Management · Confidential · Planning allocations for GC pricing").save(out); print("wrote", out)
