#!/usr/bin/env bash
# Re-run the Python underwriting on data/*.csv + model/assumptions.json and merge into data/site-data.json,
# keeping the repo-only fields (pins, meta). Usage: bash scripts/rebuild_site_data.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
W="$(mktemp -d)"
mkdir -p "$W/model" "$W/data" "$W/build-spec" "$W/research"
cp "$ROOT"/model/*.py "$ROOT"/model/assumptions.json "$W/model/"
cp "$ROOT"/data/markets.csv "$ROOT"/data/sites.csv "$W/data/"
cp -r /mnt/project-files/senior-living/research/. "$W/research/" 2>/dev/null || true
(cd "$W" && python3 model/underwrite.py >/dev/null && python3 model/export_site_data.py >/dev/null)
python3 - "$ROOT/data/site-data.json" "$W/build-spec/site-data.json" <<'PY'
import json, sys
old = json.load(open(sys.argv[1])); new = json.load(open(sys.argv[2]))
keep = ("lat", "lon", "lat_prior", "lon_prior", "pin_basis", "pin_address")
prev = {s["id"]: s for s in old["sites"]}
for s in new["sites"]:
    for k in keep:
        if k in prev.get(s["id"], {}): s[k] = prev[s["id"]][k]
new["meta"] = {**new.get("meta", {}), **old["meta"], "as_of": new.get("meta", {}).get("as_of", old["meta"]["as_of"])}
json.dump(new, open(sys.argv[1], "w"), indent=1)
print("merged", len(new["sites"]), "sites; funnel", new.get("funnel"))
PY
