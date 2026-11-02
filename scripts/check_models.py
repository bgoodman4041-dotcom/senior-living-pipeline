"""Recalculate every workbook in LibreOffice, then reconcile it to the website model.

    node --experimental-strip-types tests/capital_dump.ts /tmp/cap.json
    python3 scripts/check_models.py /tmp/cap.json      -> replaces public/models/*.xlsx with recalculated copies
"""
import json, shutil, subprocess, sys, tempfile
from pathlib import Path
import openpyxl

ROOT = Path(__file__).resolve().parent.parent
MODELS = ROOT / "public" / "models"
cap = json.loads(Path(sys.argv[1]).read_text())
tmp = Path(tempfile.mkdtemp())
files = sorted(MODELS.glob("*.xlsx"))
subprocess.run(["soffice", "--headless", "--calc", "--convert-to", "xlsx", "--outdir", str(tmp), *map(str, files)], check=True, capture_output=True, timeout=900)
fail = 0
for f in files:
    out = tmp / f.name
    wb = openpyxl.load_workbook(out, data_only=True)
    errs = [(ws.title, c.coordinate, c.value) for ws in wb.worksheets for row in ws.iter_rows() for c in row
            if isinstance(c.value, str) and (c.value.startswith("#") or c.value.startswith("Err:"))]
    if errs:
        fail += 1; print("ERR", f.name, errs[:5])
    if f.name.startswith("ATCO-") and "-proforma" in f.name:
        sid = f.name[5:-14]
        t = cap[sid]; s = wb["One Page Summary"]; c = wb["Capital Deployment"]
        got = dict(yoc=s["G5"].value, total=s["J37"].value, irrU=c["J8"].value, irrL=c["J9"].value, em=c["J10"].value, check=c["J98"].value)
        exp_yoc = t["noi"] / t["total"]
        bad = []
        if abs(got["yoc"] - exp_yoc) > 1e-6: bad.append(("yoc", got["yoc"], exp_yoc))
        if abs(got["total"] - t["total"]) > 2: bad.append(("total", got["total"], t["total"]))
        for k in ("irrU", "irrL", "em"):
            ev = t[k]
            if ev is None or ev != ev:  # NaN in TS
                continue
            if not isinstance(got[k], (int, float)) or abs(got[k] - ev) > 2e-4: bad.append((k, got[k], ev))
        if got["check"] != 0: bad.append(("draw check", got["check"], 0))
        if bad:
            fail += 1; print("MISMATCH", sid, bad)
    shutil.copyfile(out, f)
print(f"{len(files)} workbooks recalculated; {fail} with problems")
sys.exit(1 if fail else 0)
