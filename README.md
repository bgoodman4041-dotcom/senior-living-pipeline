# ATCO Senior Living · Site Selection

Institutional site-selection website for ATCO's RiverSpring-model senior living pipeline: 44 underwritten sites across NY, NJ and CT, screened against a 6.5% yield-on-cost floor.

**Stack:** Next.js 15 (App Router, fully static), TypeScript, MapLibre GL. No API keys, no database, no environment variables.

## Pages
- `/` Pipeline: funnel, KPIs, shortlist, interactive map (verdict / YOC coloring, drive rings, satellite), filters, tax-structure toggle, ranked table, YOC dot plot
- `/sites/[id]` Site dossier (44 pages): verdict, satellite map with live tax parcels and nearby hospitals / transit / grocery / clinics / competitors / retail / civic, entitlement, market, program, pro forma, tax structures, stress, entrance-fee test, live what-if, capital stack, risks, diligence, sources
- `/markets`, `/model`, `/method`

## Data
- `data/site-data.json` is the only data file. Every number renders from it. Refresh with `model/underwrite.py` then `model/export_site_data.py` and copy the JSON here.
- Live layers load in the viewer's browser: parcels from NJGIN (NJ), NYS ITS public tax parcels (NY, participating counties), CT State Parcel Layer + CAMA (CT); places from OpenStreetMap via Overpass, snapshotted weekly to public/places by the "Refresh live data" GitHub Action (Esri places fill in live for a site without a snapshot). Basemaps: Esri World Street Map and World Imagery (keyless).

## Commands
```
npm install
npm test        # TS port of the underwriter reproduces every site's YOC / max land / DSCR, plus data-contract checks
npm run build
npm run dev
```

## Deploy
Import the repo at vercel.com/new (framework auto-detected as Next.js). Production deployments are public by default; leave Deployment Protection off for production so anyone with the link can view it.
