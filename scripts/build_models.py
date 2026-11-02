"""
Build the downloadable Excel pro formas: one workbook per site plus a portfolio workbook.

Layout follows ATCO's in-house pro forma (106 Court): a One Page Summary with sources and
uses, income, opex, NOIStruct, yield on cost, value, profit and IRRs; supporting tabs for the
program, a monthly capital deployment schedule and a 10-year hold. Inputs are blue,
everything else is a live formula. Logic mirrors lib/underwrite.ts and lib/capital.ts;
scripts/check_models.py recalculates the workbooks in LibreOffice and reconciles them.

    python3 scripts/build_models.py            -> public/models/*.xlsx
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.worksheet.datavalidation import DataValidation

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "models"
D = json.loads((ROOT / "data" / "site-data.json").read_text())
A = D["assumptions"]

# Capital deployment parameters: keep in step with lib/capital.ts (CAP)
CAP = dict(predev=9, build={"A": 30, "B": 24, "C": 20}, leaseup={"A": 24, "B": 20, "C": 18}, deposit=0.05,
           predev_soft=0.35, ffe_months=3, sale_cost=0.02, lp_share=0.9, perm_dy=0.10, perm_ltv=0.75,
           perm_rate=0.06, perm_amort=35, trend=0.03, retainage=0.10, co_threshold=250000)
MAXM = 63  # months 0..63 cover the longest schedule (9 + 30 + 24)

# ---------- styles (106 Court: Aptos Narrow 11, slate headers, blue inputs, yellow key output) ----------
FONT = "Aptos Narrow"
HDR_FILL = PatternFill("solid", fgColor="FF304152")
SUB_FILL = PatternFill("solid", fgColor="FFE7EAF0")
KEY_FILL = PatternFill("solid", fgColor="FFFFFF00")
BAND = {"Predevelopment": "FFF3F2F9", "Construction": "FFEEF4FA", "Lease-up": "FFEDF6EB"}
F_BASE = Font(name=FONT, size=11)
F_BOLD = Font(name=FONT, size=11, bold=True)
F_HDR = Font(name=FONT, size=11, bold=True, color="FFFFFFFF")
F_IN = Font(name=FONT, size=11, bold=True, color="FF0070C0")
F_TITLE = Font(name=FONT, size=16, bold=True)
F_NOTE = Font(name=FONT, size=10, italic=True, color="FF555F61")
MED = Side(style="medium"); THIN = Side(style="thin")
USD = '"$"\\ #,##0'; USD2 = '"$"#,##0.00'; PCT = "0.00%"; PCT1 = "0.0%"; NUM = "#,##0"; X = '0.00"x"'; SF = '#,##0\\ "sf"'


def num(v, d=None):
    if v is None:
        return d
    s = str(v).strip().replace("$", "").replace(",", "")
    if s == "":
        return d
    try:
        return float(s)
    except ValueError:
        return d


def market_for(site):
    ms = D["markets"]
    m = next((x for x in ms if x["state"] == site["state"] and x["county"] == site["county"]), None) or \
        next((x for x in ms if x["state"] == site["state"] and x["county"] == "*"), None)
    out = dict(m)
    out["rent_index"] = num(m.get("rent_index"), 1.0)
    out["cost_index"] = num(m.get("cost_index"), 1.0)
    rs = num(site.get("rent_index_site"))
    if rs:
        out["rent_index"] = rs
    return out


def structure_of(s):
    import re
    if re.search(r"entrance-fee", s.get("verdict_reason") or ""):
        return "Entrance fee"
    if s["verdict"] == "Pursue-structured":
        return "PILOT"
    return "Fully taxed"


class Sheet:
    """Small helper: write values/formulas with styles and register workbook names."""

    def __init__(self, wb, ws):
        self.wb, self.ws = wb, ws
        ws.page_setup.orientation = "landscape"
        ws.page_setup.fitToWidth = 1
        ws.page_setup.fitToHeight = 0
        ws.sheet_properties.pageSetUpPr.fitToPage = True
        ws.print_options.horizontalCentered = True
        ws.page_margins.left = ws.page_margins.right = 0.4

    def put(self, ref, value, fmt=None, font=None, fill=None, bold=False, align=None, wrap=False):
        c = self.ws[ref]
        c.value = value
        c.font = font or (F_BOLD if bold else F_BASE)
        if fmt:
            c.number_format = fmt
        if fill:
            c.fill = fill
        if align or wrap:
            c.alignment = Alignment(horizontal=align, vertical="top" if wrap else None, wrap_text=wrap)
        return c

    def inp(self, ref, value, fmt=None, name=None):
        c = self.put(ref, value, fmt, font=F_IN)
        if name:
            self.name(name, ref)
        return c

    def calc(self, ref, formula, fmt=None, name=None, bold=False):
        c = self.put(ref, formula, fmt, bold=bold)
        if name:
            self.name(name, ref)
        return c

    def name(self, name, ref):
        col = "".join(ch for ch in ref if ch.isalpha()); row = "".join(ch for ch in ref if ch.isdigit())
        self.wb.defined_names[name] = DefinedName(name, attr_text=f"'{self.ws.title}'!${col}${row}")

    def header(self, ref_from, ref_to, text):
        r1 = self.ws[ref_from]
        for row in self.ws[f"{ref_from}:{ref_to}"]:
            for c in row:
                c.fill = HDR_FILL; c.font = F_HDR
        r1.value = text

    def sub(self, ref_from, ref_to, labels):
        cells = [c for row in self.ws[f"{ref_from}:{ref_to}"] for c in row]
        for c, t in zip(cells, labels):
            c.value = t; c.font = F_BOLD; c.fill = SUB_FILL
            c.alignment = Alignment(horizontal="right" if t and labels.index(t) > 0 else None)

    def box(self, ref):
        c = self.ws[ref]; c.fill = KEY_FILL; c.border = Border(top=MED, bottom=MED, left=MED, right=MED)

    def total_line(self, ref_from, ref_to):
        for row in self.ws[f"{ref_from}:{ref_to}"]:
            for c in row:
                c.border = Border(top=THIN); c.font = F_BOLD

    def widths(self, w):
        for col, v in w.items():
            self.ws.column_dimensions[col].width = v


def build_site(s):
    u = s["uw"]
    mk = market_for(s)
    proto = (u["prototype"] or "C").rstrip("*")[:1] or "C"
    struct = structure_of(s)
    units = u["units"]
    cost_idx = u["hard"] / (u["gsf"] * A["hard_cost_psf"]) if u["gsf"] else 1.0
    site_acres_basis = u["site_work"] / (A["site_work_per_acre"] * cost_idx) if cost_idx else 0
    tax_per_unit = u["taxes"] / units if units else 0
    lines = {l["care"]: l for l in u["lines"]}

    wb = Workbook()
    ws = wb.active; ws.title = "One Page Summary"
    S = Sheet(wb, ws)
    ws.sheet_view.showGridLines = False
    S.widths({"A": 3, "B": 30, "C": 12, "D": 18, "E": 3, "F": 30, "G": 16, "H": 14, "I": 14, "J": 18, "K": 3, "L": 3, "M": 30, "N": 16, "O": 14, "P": 3, "Q": 26, "R": 16})

    S.put("B2", s["name"], font=F_TITLE)
    S.put("B3", f"ATCO Senior Living · {s['municipality']}, {s['county']} County, {s['state']} · {u['prototype_name']} · Site {s['id']}", font=F_BOLD)
    S.put("B4", "Blue = input. Black = formula. Change any blue cell and the whole model recalculates.", font=F_NOTE)

    # Property information
    S.header("B5", "D5", "Property Information")
    S.put("F5", "Yield on Cost (as structured)", bold=True); S.box("F5")
    S.calc("G5", "=NOIStruct/TotalCost", PCT, name="YOC", bold=True); S.box("G5")
    rows = [
        ("Site acres", s["acres"] and num(s["acres"]), NUM + ".0", "SiteAcres", True),
        ("Site work basis (acres)", round(site_acres_basis, 3), "0.0", "SiteWorkAcres", True),
        ("Units", "='Program & Massing'!C11", NUM, "Units", False),
        ("Total GSF", "='Program & Massing'!G11", SF, "TotalGSF", False),
        ("GSF / unit", "=TotalGSF/Units", NUM, None, False),
        ("FAR (GSF / site area)", "=TotalGSF/(SiteAcres*43560)", "0.00", None, False),
        ("Drive to Midtown (min)", num(s["drive_min_midtown"]), NUM, None, True),
        ("Verdict", s["verdict"], None, None, False),
        ("Prototype", u["prototype_name"], None, None, False),
    ]
    for i, (lab, val, fmt, nm, is_in) in enumerate(rows):
        r = 6 + i
        S.put(f"B{r}", lab)
        (S.inp if is_in else S.calc)(f"D{r}", val, fmt, name=nm)

    # Land, tax and structure
    S.header("F7", "G7", "Land, Tax & Structure")
    S.put("F8", "Land cost"); S.inp("G8", u["land_cost"], USD, "Land")
    S.put("F9", "Land basis"); S.put("G9", u["land_cost_basis"])
    S.put("F10", "Land / unit"); S.calc("G10", "=Land/Units", USD)
    S.put("F11", "Max land at hurdle"); S.calc("G11", "=NOIStruct/Hurdle-CostExLand", USD, "MaxLand")
    S.put("F12", "Land cushion"); S.calc("G12", "=MaxLand-Land", USD)
    S.put("F13", "Hurdle yield on cost"); S.inp("G13", A["hurdle_yoc"], PCT, "Hurdle")
    S.put("F14", "Tax structure"); S.inp("G14", "PILOT" if struct == "PILOT" else "Fully taxed", None, "Structure")
    dv = DataValidation(type="list", formula1='"Fully taxed,PILOT,Nonprofit exempt"', allow_blank=False); ws.add_data_validation(dv); dv.add("G14")
    S.put("F15", "RE tax / unit (fully taxed)"); S.inp("G15", round(tax_per_unit, 2), USD, "TaxPerUnit")
    S.put("F16", "PILOT factor"); S.inp("G16", A["tax_structures"]["pilot"], PCT1, "PilotFactor")
    S.put("F17", "Nonprofit factor"); S.inp("G17", A["tax_structures"]["nonprofit_exempt"], PCT1, "NonprofitFactor")
    S.put("F18", "Tax factor applied"); S.calc("G18", '=IF(Structure="PILOT",PilotFactor,IF(Structure="Nonprofit exempt",NonprofitFactor,1))', PCT1, "TaxFactor")
    if struct == "Entrance fee":
        S.put("F19", "Entrance-fee campus: judge on fee coverage, not rental YOC.", font=F_NOTE)

    # Predevelopment S&U
    S.header("B21", "J21", "Predevelopment Phase S&U (site control to financial close, equity only)")
    S.sub("B22", "D22", ["Sources", "% Total", "Amount"])
    S.sub("F22", "J22", ["Uses", "Per unit", "Per GSF", "% Total", "Amount"])
    S.put("B23", "Equity (pursuit capital)"); S.calc("C23", "=1", PCT1); S.calc("D23", "=J25", USD)
    S.put("B24", "Total"); S.calc("C24", "=C23", PCT1); S.calc("D24", "=D23", USD); S.total_line("B24", "D24")
    S.put("F23", "Land deposit"); S.calc("J23", "=Land*DepositPct", USD)
    S.put("F24", "Entitlement, design & GMP (soft)"); S.calc("J24", "=Soft*PredevSoftPct", USD)
    S.put("F25", "Total at risk before close"); S.calc("J25", "=SUM(J23:J24)", USD, "PredevTotal")
    for r in (23, 24, 25):
        S.calc(f"G{r}", f"=J{r}/Units", USD); S.calc(f"H{r}", f"=J{r}/TotalGSF", USD2); S.calc(f"I{r}", f"=J{r}/$J$25", PCT1)
    S.total_line("F25", "J25")

    # Development S&U
    S.header("B27", "J27", "Development Phase S&U (total capitalization)")
    S.sub("B28", "D28", ["Sources", "% Total", "Amount"])
    S.sub("F28", "J28", ["Uses", "Per unit", "Per GSF", "% Total", "Amount"])
    S.put("B29", "Senior construction loan"); S.inp("C29", A["debt"]["ltc"], PCT1, "LoanLTC"); S.calc("D29", "=LoanLTC*TotalCost", USD, "LoanCommit")
    S.put("B30", "LP equity"); S.calc("C30", "=(1-LoanLTC)*LPShare", PCT1); S.calc("D30", "=EquityCommit*LPShare", USD)
    S.put("B31", "GP / ATCO co-invest"); S.calc("C31", "=(1-LoanLTC)*(1-LPShare)", PCT1); S.calc("D31", "=EquityCommit*(1-LPShare)", USD)
    S.put("B32", "Total"); S.calc("C32", "=SUM(C29:C31)", PCT1); S.calc("D32", "=SUM(D29:D31)", USD); S.total_line("B32", "D32")
    S.put("B33", "Equity commitment"); S.calc("D33", "=TotalCost-LoanCommit", USD, "EquityCommit")
    uses = [
        ("Land", "=Land", None),
        ("Hard costs", "=TotalGSF*HardPSF*CostIndex", "Hard"),
        ("Site work", "=SiteWorkAcres*SiteWorkPerAcre*CostIndex", "SiteWork"),
        ("Hard cost contingency", "=(Hard+SiteWork)*ContingencyPct", "Contingency"),
        ("FF&E", "=Units*FFEPerUnit", "FFEBudget"),
        ("Soft costs", "=(Hard+SiteWork)*SoftPct", "Soft"),
        ("Construction interest reserve", "=(Hard+SiteWork+FFEBudget+Soft)*InterestPct", "Carry"),
        ("Lease-up / operating deficit reserve", "=NOI_Full*LeaseupMonths/12", "Leaseup"),
    ]
    for i, (lab, f, nm) in enumerate(uses):
        r = 29 + i
        S.put(f"F{r}", lab); S.calc(f"J{r}", f, USD, nm)
        S.calc(f"G{r}", f"=J{r}/Units", USD); S.calc(f"H{r}", f"=J{r}/TotalGSF", USD2); S.calc(f"I{r}", f"=J{r}/TotalCost", PCT1)
    S.put("F37", "Total"); S.calc("J37", "=SUM(J29:J36)", USD, "TotalCost")
    S.calc("G37", "=J37/Units", USD); S.calc("H37", "=J37/TotalGSF", USD2); S.calc("I37", "=J37/TotalCost", PCT1); S.total_line("F37", "J37")
    S.put("F38", "Total cost ex land"); S.calc("J38", "=TotalCost-Land", USD, "CostExLand")

    # Project income and NOIStruct
    S.header("B40", "D40", "Project Income (stabilized, today's rents)")
    inc = [
        ("Gross revenue (rent + care + ancillary)", "='Program & Massing'!K11", "Revenue"),
        ("Operating expenses (pre-tax)", "=-'Program & Massing'!M11", "OpexNeg"),
        ("Replacement reserves", "=-Units*ReservePerUnit", None),
        ("Real estate tax (fully taxed)", "=-Units*TaxPerUnit", "TaxFullNeg"),
        ("NOI, fully taxed", "=SUM(D41:D44)", "NOI_Full"),
        ("Tax relief from structure", "=-TaxFullNeg*(1-TaxFactor)", None),
        ("NOI as structured", "=D45+D46", "NOIStruct"),
        ("NOI margin", "=NOIStruct/Revenue", None),
    ]
    for i, (lab, f, nm) in enumerate(inc):
        r = 41 + i
        S.put(f"B{r}", lab); S.calc(f"D{r}", f, PCT1 if "margin" in lab else USD, nm, bold=lab.startswith("NOI"))
    S.total_line("B45", "D45"); S.total_line("B47", "D47")

    S.header("F40", "J40", "Operating Assumptions")
    ops = [("Replacement reserve / unit", A["replacement_reserve_per_unit"], USD, "ReservePerUnit"),
           ("Hard cost / GSF (Westchester base)", A["hard_cost_psf"], USD2, "HardPSF"),
           ("Cost index (market x site)", round(cost_idx, 5), "0.000", "CostIndex"),
           ("Site work / acre", A["site_work_per_acre"], USD, "SiteWorkPerAcre"),
           ("FF&E / unit", A["ffe_per_unit"], USD, "FFEPerUnit"),
           ("Soft costs (% of hard + site)", A["soft_cost_pct"], PCT1, "SoftPct"),
           ("Construction interest (% of cost)", A["construction_interest_pct_of_cost"], PCT1, "InterestPct"),
           ("Contingency (% of hard + site)", A["contingency_pct"], PCT1, "ContingencyPct"),
           ("Lease-up reserve (months of NOI)", A["leaseup_deficit_months_of_noi"], "0.0", "LeaseupMonths")]
    for i, (lab, v, fmt, nm) in enumerate(ops):
        r = 41 + i
        S.put(f"F{r}", lab); S.inp(f"J{r}", v, fmt, nm)

    # Value and returns
    S.header("B51", "D51", "Value & Profit")
    val = [("Yield on cost (as structured)", "=YOC", PCT), ("Yield on cost, fully taxed", "=NOI_Full/TotalCost", PCT),
           ("Exit cap rate", None, PCT), ("Stabilized value, today's NOI", "=NOIStruct/ExitCap", USD),
           ("Profit (today's NOI)", "=D55-TotalCost", USD), ("Profit on cost", "=D56/TotalCost", PCT1),
           ("Breakeven rent ratio at hurdle", "=(Hurdle*TotalCost-TaxFullNeg*TaxFactor+'Program & Massing'!$N$11)/(Revenue+OpexNeg)", "0.000")]
    for i, (lab, f, fmt) in enumerate(val):
        r = 52 + i
        S.put(f"B{r}", lab)
        if lab == "Exit cap rate":
            S.inp(f"D{r}", A["exit_cap"], fmt, "ExitCap")
        else:
            S.calc(f"D{r}", f, fmt, bold=lab.startswith("Yield"))

    S.header("F51", "J51", "Returns per Dollar Deployed (sale at stabilization)")
    ret = [("Rent & expense growth to sale", None, PCT1, "Trend"),
           ("NOI at stabilization (trended)", "=NOIStruct*(1+Trend)^(MonthsN/12)", USD, "NOITrended"),
           ("Yield on cost, trended", "=NOITrended/TotalCost", PCT, None),
           ("Net sale proceeds", "=NOITrended/ExitCap*(1-SaleCostPct)", USD, "NetSale"),
           ("Unlevered IRR", "='Capital Deployment'!IRR_U", PCT1, None),
           ("Levered IRR", "='Capital Deployment'!IRR_L", PCT1, None),
           ("Equity multiple", "=(NetSale-'Capital Deployment'!LoanAtSale)/EquityCommit", X, None),
           ("Value created per $1 of cost", "=NOITrended/ExitCap/TotalCost", '"$"0.00', None)]
    for i, (lab, f, fmt, nm) in enumerate(ret):
        r = 52 + i
        S.put(f"F{r}", lab)
        if f is None:
            S.inp(f"J{r}", CAP["trend"], fmt, nm)
        else:
            f = f.replace("'Capital Deployment'!IRR_U", "IRR_U").replace("'Capital Deployment'!IRR_L", "IRR_L").replace("'Capital Deployment'!LoanAtSale", "LoanAtSale")
            S.calc(f"J{r}", f, fmt, nm, bold=lab in ("Unlevered IRR", "Levered IRR", "Equity multiple"))
    for r in (56, 57, 58):
        S.box(f"J{r}")

    # Perm loan (HUD 232 style take-out), as in 106 Court
    S.header("B61", "D61", "Perm Loan Assumptions (hold case)")
    perm = [("Debt yield", CAP["perm_dy"], PCT1, "PermDY", True), ("Max LTV", CAP["perm_ltv"], PCT1, "PermLTV", True),
            ("Rate", CAP["perm_rate"], PCT, "PermRate", True), ("Amortization (years)", CAP["perm_amort"], NUM, "PermAmort", True),
            ("Loan amount", "=MIN(NOITrended/PermDY,NOITrended/ExitCap*PermLTV)", USD, "PermLoan", False),
            ("Debt service (annual)", "=-PMT(PermRate/12,PermAmort*12,PermLoan)*12", USD, "PermDS", False),
            ("DSCR", "=NOITrended/PermDS", X, None, False),
            ("Refi proceeds (cash out)", "=PermLoan-LoanAtSale", USD, "CashOut", False),
            ("Remaining equity", "=EquityCommit-CashOut", USD, "EquityLeft", False),
            ("Cash yield on remaining equity", "=IF(EquityLeft>0,(NOITrended-PermDS)/EquityLeft,\"n/m\")", PCT1, None, False)]
    for i, (lab, v, fmt, nm, is_in) in enumerate(perm):
        r = 62 + i
        S.put(f"B{r}", lab); (S.inp if is_in else S.calc)(f"D{r}", v, fmt, nm)

    # Supplemental: loan test + schedule (right column, as in 106 Court)
    S.header("M5", "N5", "Supplemental: Construction Loan Test")
    lt = [("Loan commitment", "=LoanCommit", USD), ("Rate", A["debt"]["rate"], PCT), ("Amortization (years)", A["debt"]["amort_years"], NUM),
          ("Annual debt service (fully drawn)", "=-PMT(N7/12,N8*12,LoanCommit)*12", USD), ("DSCR on today's NOI", "=NOIStruct/N9", X), ("Debt yield", "=NOIStruct/LoanCommit", PCT1)]
    for i, (lab, v, fmt) in enumerate(lt):
        r = 6 + i
        S.put(f"M{r}", lab)
        (S.inp if not str(v).startswith("=") else S.calc)(f"N{r}", v, fmt)
    S.header("M13", "N13", "Supplemental: Schedule (months)")
    sch = [("Predevelopment (to financial close)", CAP["predev"], "PredevMonths"), ("Construction", CAP["build"][proto], "BuildMonths"),
           ("Lease-up to stabilization", CAP["leaseup"][proto], "LeaseupMo"), ("Total to stabilization", "=PredevMonths+BuildMonths+LeaseupMo", "MonthsN")]
    for i, (lab, v, nm) in enumerate(sch):
        r = 14 + i
        S.put(f"M{r}", lab); (S.calc if str(v).startswith("=") else S.inp)(f"N{r}", v, NUM, nm)
    S.header("M19", "N19", "Supplemental: Capital Release Rules")
    rel = [("Land deposit at site control", CAP["deposit"], PCT1, "DepositPct"), ("Soft costs spent before close", CAP["predev_soft"], PCT1, "PredevSoftPct"),
           ("FF&E delivery (final months)", CAP["ffe_months"], NUM, "FFEMonths"), ("LP share of equity", CAP["lp_share"], PCT1, "LPShare"),
           ("Sale costs", CAP["sale_cost"], PCT1, "SaleCostPct"), ("Retainage held on hard costs", CAP["retainage"], PCT1, None),
           ("Change orders needing IC approval above", CAP["co_threshold"], USD, None)]
    for i, (lab, v, fmt, nm) in enumerate(rel):
        r = 20 + i
        S.put(f"M{r}", lab); S.inp(f"N{r}", v, fmt, nm)
    S.header("M28", "N28", "Stress Tests (fully taxed)")
    st = [("Rents -10%", "=((Revenue+OpexNeg)*0.9+TaxFullNeg-Units*ReservePerUnit)/TotalCost"),
          ("Costs +10%", "=NOI_Full/(CostExLand*1.1+Land)"),
          ("Both", "=((Revenue+OpexNeg)*0.9+TaxFullNeg-Units*ReservePerUnit)/(CostExLand*1.1+Land)")]
    for i, (lab, f) in enumerate(st):
        S.put(f"M{29 + i}", lab); S.calc(f"N{29 + i}", f, PCT)
    S.put("M33", "Model reconciles to the website underwriting for this site.", font=F_NOTE)
    S.put("M34", f"Website YOC (fully taxed): {u['yoc']:.2%}", font=F_NOTE)
    ws.freeze_panes = "A5"

    build_program(wb, s, u, lines)
    build_capital(wb, s)
    build_hold(wb)
    build_notes(wb, s, mk)
    wb.calculation.fullCalcOnLoad = True
    return wb


def build_program(wb, s, u, lines):
    ws = wb.create_sheet("Program & Massing"); S = Sheet(wb, ws); ws.sheet_view.showGridLines = False
    S.widths({"A": 3, "B": 26, "C": 10, "D": 14, "E": 12, "F": 12, "G": 14, "H": 14, "I": 12, "J": 12, "K": 16, "L": 12, "M": 16, "N": 14})
    S.put("B2", "Program & Massing", font=F_TITLE)
    S.put("B3", "Unit mix, rates and GSF by care level. Monthly rate = base rate x submarket rent index (AL blends the state Medicaid set-aside where one applies).", font=F_NOTE)
    S.header("B5", "N5", "Unit Mix & Revenue")
    S.sub("B6", "N6", ["Care level", "Units", "Monthly rate", "Occupancy", "Ancillary", "GSF / unit", "TotalGSF", "Stories", "Footprint", "Wing (ft)", "Revenue", "NOI margin", "Opex (pre-tax)", "Reserves"])
    stories = {"IL": 4, "AL": 3, "MC": 2, "SNF": 2}
    for i, care in enumerate(["IL", "AL", "MC", "SNF"]):
        r = 7 + i
        c = A["care_levels"][care]
        ln = lines.get(care)
        n = ln["units"] if ln else 0
        occ, anc = c["stabilized_occupancy"], c["ancillary_pct"]
        rate = (ln["revenue"] / (n * 12 * occ * (1 + anc))) if ln and n else c["base_monthly_rate"]
        S.put(f"B{r}", care)
        S.inp(f"C{r}", n, NUM); S.inp(f"D{r}", round(rate, 2), USD); S.inp(f"E{r}", occ, PCT1); S.inp(f"F{r}", anc, PCT1)
        S.inp(f"G{r}", c["gsf_per_unit"], NUM); S.calc(f"H{r}", f"=C{r}*G{r}", NUM); S.inp(f"I{r}", stories[care], NUM)
        S.calc(f"J{r}", f"=IF(I{r}>0,H{r}/I{r},0)", NUM); S.calc(f"K{r}", f"=J{r}/65", NUM)
        S.calc(f"L{r}", f"=C{r}*D{r}*12*E{r}*(1+F{r})", USD); S.inp(f"M{r}", c["noi_margin_pre_tax"], PCT1)
        S.calc(f"N{r}", f"=L{r}*(1-M{r})", USD)
    # totals (row 11). Column letters shift: C units, G gsf total in H... keep summary refs C11/G11/K11/M11/N11
    S.put("B11", "Total")
    S.calc("C11", "=SUM(C7:C10)", NUM); S.calc("G11", "=SUM(H7:H10)", NUM); S.calc("K11", "=SUM(L7:L10)", USD)
    S.calc("M11", "=SUM(N7:N10)", USD); S.calc("N11", "=C11*ReservePerUnit", USD)
    S.calc("J11", "=SUM(J7:J10)", NUM)
    S.total_line("B11", "N11")
    S.put("B12", "Row 11: C = units, G = total GSF, K = revenue, M = pre-tax opex, N = reserves (linked to the One Page Summary).", font=F_NOTE)
    S.header("B14", "D14", "Site Fit")
    fit = [("Site area (SF)", "=SiteAcres*43560", NUM), ("Building footprint (SF)", "=J11", NUM), ("Lot coverage", "=J11/D15", PCT1),
           ("FAR", "=G11/D15", "0.00"), ("Parking spaces (0.5 / unit + staff)", "=ROUND(C11*0.5+20,0)", NUM), ("Surface parking (SF, 320 / space)", "=D19*320", NUM),
           ("Open space", "=MAX(0,1-(D16+D20)/D15)", PCT1)]
    for i, (lab, f, fmt) in enumerate(fit):
        S.put(f"B{15 + i}", lab); S.calc(f"D{15 + i}", f, fmt)
    S.put("B23", "Massing is a concept to show scale and coverage: double-loaded 65-ft wings, IL 4 stories, AL 3, MC 2. Not a site plan.", font=F_NOTE)


def build_capital(wb, s):
    ws = wb.create_sheet("Capital Deployment"); S = Sheet(wb, ws); ws.sheet_view.showGridLines = False
    S.widths({"A": 3, "B": 34, "C": 16, "D": 16, "E": 16, "F": 14, "G": 14, "H": 16, "I": 14, "J": 16, "K": 16, "L": 16, "M": 16, "N": 16, "O": 16, "P": 16, "Q": 16})
    S.put("B2", "Capital Deployment", font=F_TITLE)
    S.put("B3", "How each dollar is raised, released and returned. Equity funds first; the senior loan funds after equity is fully in. Capital is released only at the gates below.", font=F_NOTE)

    S.header("B5", "E5", "Sources & Uses Summary")
    su = [("Total capitalization", "=TotalCost"), ("Senior construction loan", "=LoanCommit"), ("Equity commitment", "=EquityCommit"),
          ("  LP equity", "=EquityCommit*LPShare"), ("  GP / ATCO co-invest", "=EquityCommit*(1-LPShare)"),
          ("Capital at risk before entitlement", "=PredevTotal"), ("  as % of equity", "=PredevTotal/EquityCommit"),
          ("Peak equity month", "=MATCH(EquityCommit-1,M33:M96,1)-1"), ("Months to stabilization", "=MonthsN")]
    for i, (lab, f) in enumerate(su):
        r = 6 + i
        S.put(f"B{r}", lab); S.calc(f"D{r}", f, PCT1 if "%" in lab else (NUM if "month" in lab.lower() else USD))

    S.header("G5", "J5", "Returns per Dollar Deployed")
    rr = [("Yield on cost (today's NOI)", "=YOC", PCT), ("Yield on cost (trended)", "=NOITrended/TotalCost", PCT),
          ("Unlevered IRR", "=IFERROR((1+IRR(O33:O96,0.01))^12-1,IFERROR((1+IRR(O33:O96,-0.03))^12-1,\"n/m\"))", PCT1), ("Levered IRR", "=IFERROR((1+IRR(P33:P96,0.01))^12-1,IFERROR((1+IRR(P33:P96,-0.03))^12-1,\"n/m\"))", PCT1),
          ("Equity multiple", "=(NetSale-LoanAtSale)/EquityCommit", X), ("Profit on cost (net sale)", "=(NetSale-TotalCost)/TotalCost", PCT1),
          ("NOI per $1 of equity", "=NOITrended/EquityCommit", '"$"0.000'), ("Loan balance at sale", "=INDEX(N33:N96,MonthsN+1)", USD)]
    for i, (lab, f, _fmt) in enumerate(rr):
        r = 6 + i
        S.put(f"G{r}", lab)
        nm = {"Unlevered IRR": "IRR_U", "Levered IRR": "IRR_L", "Loan balance at sale": "LoanAtSale"}.get(lab)
        fmt = PCT if "Yield" in lab else (X if "multiple" in lab else ('"$"0.000' if "NOI per" in lab else (USD if "Loan" in lab else PCT1)))
        S.calc(f"J{r}", f, fmt, nm, bold=nm in ("IRR_U", "IRR_L"))

    S.header("B16", "F16", "Capital Release Gates")
    S.sub("B17", "F17", ["Gate", "Months", "Released", "% of total", "Release test"])
    gates = [("1. Site control", "0", "=SUMIFS(J33:J96,B33:B96,0)", "LOI inside max land; title, Phase I, survey ordered"),
             ("2. Entitlement & design", '="1-"&(PredevMonths-1)', "=SUMIFS(J33:J96,B33:B96,\">0\",B33:B96,\"<\"&PredevMonths)", "Approvals in hand; CN/ERCN filed; GMP within 3% of budget"),
             ("3. Financial close", "=PredevMonths", "=SUMIFS(J33:J96,B33:B96,PredevMonths)", "Loan committed at or under LTC; operator agreement; equity fully subscribed"),
             ("4. Construction", '=(PredevMonths+1)&"-"&(PredevMonths+BuildMonths-1)', "=SUMIFS(J33:J96,B33:B96,\">\"&PredevMonths,B33:B96,\"<\"&(PredevMonths+BuildMonths))", "Monthly draws certified by lender's construction monitor; 10% retainage"),
             ("5. Lease-up", '=(PredevMonths+BuildMonths)&"-"&MonthsN', "=SUMIFS(J33:J96,B33:B96,\">=\"&(PredevMonths+BuildMonths))", "Deficit reserve released only against monthly variance reports")]
    for i, (g, m, f, t) in enumerate(gates):
        r = 18 + i
        S.put(f"B{r}", g); S.calc(f"C{r}", m); S.calc(f"D{r}", f, USD); S.calc(f"E{r}", f"=D{r}/TotalCost", PCT1); S.put(f"F{r}", t)
    S.put("B23", "Total"); S.calc("D23", "=SUM(D18:D22)", USD); S.calc("E23", "=D23/TotalCost", PCT1); S.total_line("B23", "F23")

    S.header("H16", "Q16", "Cost Controls & Investor Governance")
    ctrl = ["GMP contract with the general contractor; hard-cost contingency of " + f"{A['contingency_pct']:.0%}" + " held by owner, not GC.",
            "Interest reserve and lease-up deficit reserve sized in the budget, so no capital calls for carry or ramp-up.",
            "Lender's construction monitor certifies every draw; 10% retainage until substantial completion.",
            f"Change orders above ${CAP['co_threshold']:,} need investment-committee approval; contingency use reported monthly.",
            "GP completion and cost-overrun guarantee through certificate of occupancy.",
            "Quarterly investor report: budget vs actual, draw log, schedule, lease-up (occupancy, rate, labor %).",
            "Annual audited financials; operator held to an annual budget with incentive fees tied to NOI."]
    for i, t in enumerate(ctrl):
        S.put(f"H{17 + i}", f"{i + 1}. {t}")

    # monthly schedule
    S.header("B31", "P31", "Monthly Draw Schedule (equity first, then senior loan)")
    S.sub("B32", "P32", ["Month", "Phase", "Land", "Soft", "Hard + site + contingency", "FF&E", "Lease-up reserve", "Interest wt", "Total incl. interest", "Equity", "Loan", "Cum. equity", "Cum. loan", "Unlevered CF", "Levered CF"])
    # columns: B month, C phase, D land, E soft, F hard, G ffe, H leaseup, I int wt, J interest?? -> keep mapping below
    first, last = 33, 33 + MAXM
    for k in range(MAXM + 1):
        r = first + k
        m = f"B{r}"
        ws[m] = k; ws[m].font = F_BASE
        S.calc(f"C{r}", f'=IF({m}<PredevMonths,"Predevelopment",IF({m}<PredevMonths+BuildMonths,"Construction",IF({m}<=MonthsN,"Lease-up","")))')
        S.calc(f"D{r}", f"=IF({m}=0,Land*DepositPct,0)+IF({m}=PredevMonths,Land*(1-DepositPct),0)", USD)
        S.calc(f"E{r}", f"=IF({m}<PredevMonths,Soft*PredevSoftPct/PredevMonths,0)+IF(AND({m}>=PredevMonths,{m}<PredevMonths+BuildMonths),Soft*(1-PredevSoftPct)/BuildMonths,0)", USD)
        S.calc(f"F{r}", f"=IF(AND({m}>=PredevMonths,{m}<PredevMonths+BuildMonths),(Hard+SiteWork+Contingency)*SIN(PI()*({m}-PredevMonths+0.5)/BuildMonths)*SIN(PI()/(2*BuildMonths)),0)", USD)
        S.calc(f"G{r}", f"=IF(AND({m}>=PredevMonths+BuildMonths-FFEMonths,{m}<PredevMonths+BuildMonths),FFEBudget/FFEMonths,0)", USD)
        S.calc(f"H{r}", f"=IF(AND({m}>=PredevMonths+BuildMonths,{m}<MonthsN),Leaseup/LeaseupMo,0)", USD)
        S.calc(f"I{r}", f"=IF(AND({m}>PredevMonths,{m}<MonthsN),SUM($D${first}:H{r}),0)", USD)
        # J total incl. interest; K equity; L loan; M cum eq; N cum loan; O unlev; P lev
        S.calc(f"J{r}", f"=SUM(D{r}:H{r})+Carry*I{r}/SUM($I${first}:$I${last})", USD)
        prev_m = f"M{r - 1}" if k else "0"
        S.calc(f"K{r}", f"=MIN(J{r},MAX(0,EquityCommit-{prev_m}))", USD)
        S.calc(f"L{r}", f"=J{r}-K{r}", USD)
        S.calc(f"M{r}", f"={prev_m}+K{r}" if k else f"=K{r}", USD)
        S.calc(f"N{r}", f"=N{r - 1}+L{r}" if k else f"=L{r}", USD)
        S.calc(f"O{r}", f"=IF({m}<=MonthsN,-J{r}+IF({m}=MonthsN,NetSale,0),0)", USD)
        S.calc(f"P{r}", f"=IF({m}<=MonthsN,-K{r}+IF({m}=MonthsN,NetSale-N{r},0),0)", USD)
        fill = PatternFill("solid", fgColor=BAND["Predevelopment" if k < CAP["predev"] else "Construction"])
        ws[f"B{r}"].fill = fill
    S.put(f"B{last + 1}", "Total")
    for col in "DEFGHJKL":
        S.calc(f"{col}{last + 1}", f"=SUM({col}{first}:{col}{last})", USD)
    S.total_line(f"B{last + 1}", f"P{last + 1}")
    S.put(f"B{last + 2}", "Check: total draws = total capitalization"); S.calc(f"J{last + 2}", f"=ROUND(J{last + 1}-TotalCost,0)", NUM)
    S.put(f"B{last + 3}", "Interest weight (I) is the cumulative spend after close, a proxy for the loan balance that carries the interest reserve.", font=F_NOTE)
    ws.freeze_panes = "D33"


def build_hold(wb):
    ws = wb.create_sheet("10 Year Cash Flow"); S = Sheet(wb, ws); ws.sheet_view.showGridLines = False
    S.widths({"A": 3, "B": 34, **{get_column_letter(c): 15 for c in range(3, 14)}})
    S.put("B2", "10 Year Cash Flow (hold case, from stabilization)", font=F_TITLE)
    S.put("B3", "Year 1 = first stabilized year. Revenue and expenses grow at the input rates; perm loan per the One Page Summary.", font=F_NOTE)
    S.put("B5", "Revenue growth"); S.inp("C5", CAP["trend"], PCT1, "RevGrowth")
    S.put("B6", "Expense growth"); S.inp("C6", CAP["trend"], PCT1, "ExpGrowth")
    S.put("B7", "Tax growth"); S.inp("C7", CAP["trend"], PCT1, "TaxGrowth")
    S.header("B9", "M9", "Annual Cash Flow")
    S.put("B10", "Year", bold=True)
    for y in range(1, 11):
        S.put(f"{get_column_letter(2 + y)}10", y, bold=True)
    rows = ["Revenue", "Operating expenses", "Replacement reserves", "Real estate tax (as structured)", "NOIStruct", "Perm debt service", "Free cash flow", "Cash yield on remaining equity", "Cumulative distributions"]
    for i, lab in enumerate(rows):
        S.put(f"B{11 + i}", lab, bold=lab in ("NOIStruct", "Free cash flow"))
    g = "(1+Trend)^(MonthsN/12)"
    for y in range(1, 11):
        c = get_column_letter(2 + y)
        n = y - 1
        S.calc(f"{c}11", f"=Revenue*{g}*(1+RevGrowth)^{n}", USD)
        S.calc(f"{c}12", f"=OpexNeg*{g}*(1+ExpGrowth)^{n}", USD)
        S.calc(f"{c}13", f"=-Units*ReservePerUnit*{g}*(1+ExpGrowth)^{n}", USD)
        S.calc(f"{c}14", f"=TaxFullNeg*TaxFactor*{g}*(1+TaxGrowth)^{n}", USD)
        S.calc(f"{c}15", f"=SUM({c}11:{c}14)", USD, bold=True)
        S.calc(f"{c}16", "=-PermDS", USD)
        S.calc(f"{c}17", f"={c}15+{c}16", USD, bold=True)
        S.calc(f"{c}18", f'=IF(EquityLeft>0,{c}17/EquityLeft,"n/m")', PCT1)
        S.calc(f"{c}19", f"=SUM($C$17:{c}17)", USD)
    S.total_line("B15", "M15"); S.total_line("B17", "M17")
    S.put("B21", "Year-10 reversion at exit cap"); S.calc("C21", "=L15*(1+RevGrowth)/ExitCap", USD)


def build_notes(wb, s, mk):
    ws = wb.create_sheet("Sources & Notes"); S = Sheet(wb, ws); ws.sheet_view.showGridLines = False
    S.widths({"A": 3, "B": 120})
    S.put("B2", "Sources & Notes", font=F_TITLE)
    notes = [
        f"Site: {s['name']}, {s['municipality']}, {s['county']} County, {s['state']}. Pin: {s.get('pin_address') or 'research coordinate'} ({s.get('pin_basis', '')}).",
        f"Entitlement: {s.get('entitlement_status', '')}",
        f"Deal route: {s.get('deal_route', '')}. Land: {s.get('land_note', '')}",
        f"Next step: {s.get('next_step', '')}",
        "Rates, occupancy and margins: model/assumptions.json, calibrated to operator listings and NIC MAP-style benchmarks; indices marked [I] on the website are estimates to replace with NIC MAP and assessor data before LOI.",
        f"Market basis: {mk.get('basis', '')}",
        "Hard costs scale a Westchester $/GSF by the county cost index and any site factor. Soft costs, interest and contingency are percentages of hard and site work.",
        "Capital deployment: equity funds first; the senior loan funds once equity is fully in. Sale at stabilization uses trended NOI at the exit cap less sale costs.",
        "Screening model, not an appraisal or offer. Confirm parcel, zoning and tax treatment with counsel and the assessor.",
    ]
    for i, t in enumerate(notes):
        S.put(f"B{4 + i}", t, wrap=True)
        ws.row_dimensions[4 + i].height = 32


# ---------------- portfolio workbook ----------------
def plan_static(s):
    """Python mirror of lib/capital.ts capitalPlan for the portfolio roll-up."""
    u = s["uw"]; proto = (u["prototype"] or "C").rstrip("*")[:1] or "C"
    P, B, L = CAP["predev"], CAP["build"][proto], CAP["leaseup"][proto]; N = P + B + L
    hb = u["hard"] + u["site_work"] + u["contingency"]; sp = u["soft"] * CAP["predev_soft"]; spo = u["soft"] - sp
    k = math.sin(math.pi / (2 * B))
    raw = []
    for m in range(N + 1):
        land = (u["land_cost"] * CAP["deposit"] if m == 0 else 0) + (u["land_cost"] * (1 - CAP["deposit"]) if m == P else 0)
        soft = (sp / P if m < P else 0) + (spo / B if P <= m < P + B else 0)
        hard = hb * math.sin(math.pi * (m - P + 0.5) / B) * k if P <= m < P + B else 0
        ffe = u["ffe"] / CAP["ffe_months"] if P + B - CAP["ffe_months"] <= m < P + B else 0
        lu = u["leaseup"] / L if P + B <= m < N else 0
        raw.append(land + soft + hard + ffe + lu)
    cum, w = 0, []
    for m, x in enumerate(raw):
        cum += x; w.append(cum if P < m < N else 0)
    wt = sum(w) or 1
    tot = [x + u["carry"] * w[m] / wt for m, x in enumerate(raw)]
    eq_c = u["total_cost"] * (1 - A["debt"]["ltc"]); left = eq_c; eq, ln = [], []
    for t in tot:
        e = min(t, max(0, left)); left -= e; eq.append(e); ln.append(t - e)
    return dict(N=N, P=P, total=tot, equity=eq, loan=ln)


def build_portfolio():
    short = [s for s in D["sites"] if s["verdict"] in ("Pursue", "Pursue-structured")]
    short.sort(key=lambda s: s["rank"])
    wb = Workbook(); ws = wb.active; ws.title = "Portfolio Summary"; S = Sheet(wb, ws); ws.sheet_view.showGridLines = False
    S.widths({"A": 3, "B": 40, "C": 12, "D": 14, "E": 10, "F": 16, "G": 16, "H": 12, "I": 16, "J": 16, "K": 16, "L": 16, "M": 12, "N": 12})
    S.put("B2", "ATCO Senior Living: Shortlist Portfolio", font=F_TITLE)
    S.put("B3", "One row per shortlisted site; totals and weighted metrics are live formulas. Per-site detail lives in each site workbook (download from its dossier page).", font=F_NOTE)
    S.header("B5", "N5", "Portfolio Sources & Uses and Returns")
    S.sub("B6", "N6", ["Site", "State", "Structure", "Units", "Total cost", "NOI (as structured)", "YOC", "Senior loan", "Equity", "Land", "At risk pre-entitlement", "Site control (qtr)", "Stabilized (qtr)"])
    from_row = 7
    for i, s in enumerate(short):
        r = from_row + i; u = s["uw"]; st = structure_of(s)
        noi = u["noi"] + (u["taxes"] * (1 - A["tax_structures"]["pilot"]) if st == "PILOT" else 0)
        p = plan_static(s)
        S.put(f"B{r}", f"{s['id']}  {s['name']}"); S.put(f"C{r}", s["state"]); S.put(f"D{r}", st)
        S.inp(f"E{r}", u["units"], NUM); S.inp(f"F{r}", round(u["total_cost"]), USD); S.inp(f"G{r}", round(noi), USD)
        S.calc(f"H{r}", f"=G{r}/F{r}", PCT); S.calc(f"I{r}", f"=F{r}*$C$22", USD); S.calc(f"J{r}", f"=F{r}-I{r}", USD)
        S.inp(f"K{r}", round(u["land_cost"]), USD); S.inp(f"L{r}", round(sum(p["total"][:p["P"]])), USD)
        S.inp(f"M{r}", i, NUM); S.calc(f"N{r}", f"=M{r}+ROUNDUP({p['N']}/3,0)", NUM)
    last = from_row + len(short) - 1
    t = last + 1
    S.put(f"B{t}", "Shortlist total"); S.calc(f"E{t}", f"=SUM(E{from_row}:E{last})", NUM)
    for c in "FGIJKL":
        S.calc(f"{c}{t}", f"=SUM({c}{from_row}:{c}{last})", USD)
    S.calc(f"H{t}", f"=G{t}/F{t}", PCT); S.total_line(f"B{t}", f"N{t}")
    rental = [i for i, s in enumerate(short) if structure_of(s) != "Entrance fee"]
    S.put(f"B{t + 1}", "Rental portfolio (excludes entrance-fee campus)")
    for c, fmt in (("E", NUM), ("F", USD), ("G", USD), ("I", USD), ("J", USD)):
        S.calc(f"{c}{t + 1}", "=" + "+".join(f"{c}{from_row + i}" for i in rental), fmt)
    S.calc(f"H{t + 1}", f"=G{t + 1}/F{t + 1}", PCT); S.total_line(f"B{t + 1}", f"N{t + 1}")
    S.put("B21", "Assumptions", bold=True)
    S.put("B22", "Senior loan (LTC)"); S.inp("C22", A["debt"]["ltc"], PCT1)
    S.put("B23", "Exit cap"); S.inp("C23", A["exit_cap"], PCT)
    S.put("B24", "Rental portfolio value at exit cap (today's NOI)"); S.calc("C24", f"=G{t + 1}/C23", USD)
    S.put("B25", "Profit on cost (today's NOI)"); S.calc("C25", f"=C24/F{t + 1}-1", PCT1)
    S.put("B26", "Closings staggered one per quarter in rank order (input column M). Equity at risk before entitlement stays under 15% of equity per site.", font=F_NOTE)

    # capital deployment by quarter
    ws2 = wb.create_sheet("Capital Deployment"); S2 = Sheet(wb, ws2); ws2.sheet_view.showGridLines = False
    S2.widths({"A": 3, "B": 40, **{get_column_letter(c): 13 for c in range(3, 40)}})
    S2.put("B2", "Portfolio Capital Deployment by Quarter", font=F_TITLE)
    S2.put("B3", "Each site's monthly draw schedule (equity first, then loan) rolled into quarters and offset by its closing quarter. Values from the site workbooks; totals are live.", font=F_NOTE)
    plans = [(s, plan_static(s)) for s in short]
    nq = max(i * 1 + math.ceil((p["N"] + 1) / 3) for i, (s, p) in enumerate(plans)) + 1
    S2.header("B5", f"{get_column_letter(2 + nq)}5", "Equity draws by quarter")
    S2.put("B6", "Quarter", bold=True)
    for q in range(nq):
        S2.put(f"{get_column_letter(3 + q)}6", f"Q{q + 1}", bold=True)
    def block(start, key, title):
        S2.header(f"B{start - 1}", f"{get_column_letter(2 + nq)}{start - 1}", title) if start != 7 else None
        for i, (s, p) in enumerate(plans):
            r = start + i
            S2.put(f"B{r}", f"{s['id']}  {s['name']}")
            qs = [0.0] * nq
            for m, v in enumerate(p[key]):
                qs[i + m // 3] += v
            for q in range(nq):
                if qs[q]:
                    S2.inp(f"{get_column_letter(3 + q)}{r}", round(qs[q]), USD)
        tr = start + len(plans)
        S2.put(f"B{tr}", "Total")
        for q in range(nq):
            c = get_column_letter(3 + q)
            S2.calc(f"{c}{tr}", f"=SUM({c}{start}:{c}{tr - 1})", USD)
        S2.total_line(f"B{tr}", f"{get_column_letter(2 + nq)}{tr}")
        S2.put(f"B{tr + 1}", "Cumulative", bold=True)
        for q in range(nq):
            c = get_column_letter(3 + q)
            S2.calc(f"{c}{tr + 1}", f"=SUM($C${tr}:{c}{tr})", USD)
        return tr
    e_tot = block(7, "equity", "Equity draws by quarter")
    l_start = e_tot + 4
    S2.header(f"B{l_start - 1}", f"{get_column_letter(2 + nq)}{l_start - 1}", "Senior loan draws by quarter")
    l_tot = block(l_start, "loan", "Senior loan draws by quarter")
    S2.put(f"B{l_tot + 3}", "Peak cumulative equity", bold=True); S2.calc(f"C{l_tot + 3}", f"=MAX(C{e_tot + 1}:{get_column_letter(2 + nq)}{e_tot + 1})", USD)
    S2.put(f"B{l_tot + 4}", "Peak cumulative loan", bold=True); S2.calc(f"C{l_tot + 4}", f"=MAX(C{l_tot + 1}:{get_column_letter(2 + nq)}{l_tot + 1})", USD)
    ws2.freeze_panes = "C7"

    # all 44 sites
    ws3 = wb.create_sheet("All Sites"); S3 = Sheet(wb, ws3); ws3.sheet_view.showGridLines = False
    S3.widths({"A": 3, "B": 8, "C": 44, "D": 22, "E": 7, "F": 18, "G": 9, "H": 15, "I": 15, "J": 10, "K": 10, "L": 10, "M": 15, "N": 15})
    S3.put("B2", "All Underwritten Sites", font=F_TITLE)
    S3.sub("B4", "N4", ["ID", "Site", "Municipality", "State", "Verdict", "Units", "Total cost", "NOI (full tax)", "YOC full", "YOC PILOT", "YOC NFP", "Max land", "Land"])
    for i, s in enumerate(sorted(D["sites"], key=lambda x: x["rank"])):
        r = 5 + i; u = s["uw"]
        for c, v, f in (("B", s["id"], None), ("C", s["name"], None), ("D", s["municipality"], None), ("E", s["state"], None), ("F", s["verdict"], None),
                        ("G", u["units"], NUM), ("H", round(u["total_cost"]), USD), ("I", round(u["noi"]), USD)):
            S3.put(f"{c}{r}", v, f)
        S3.calc(f"J{r}", f"=I{r}/H{r}", PCT)
        S3.put(f"K{r}", u["yoc_by_tax_structure"]["pilot"], PCT); S3.put(f"L{r}", u["yoc_by_tax_structure"]["nonprofit_exempt"], PCT)
        S3.put(f"M{r}", round(u["max_land"]), USD); S3.put(f"N{r}", round(u["land_cost"]), USD)
    ws3.auto_filter.ref = f"B4:N{4 + len(D['sites'])}"; ws3.freeze_panes = "D5"
    wb.calculation.fullCalcOnLoad = True
    return wb


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    only = set(sys.argv[1:])
    for s in D["sites"]:
        if only and s["id"] not in only:
            continue
        build_site(s).save(OUT / f"ATCO-{s['id']}-proforma.xlsx")
    if not only:
        build_portfolio().save(OUT / "ATCO-senior-living-portfolio.xlsx")
    print("wrote", len(list(OUT.glob("*.xlsx"))), "workbooks to", OUT)


if __name__ == "__main__":
    main()
