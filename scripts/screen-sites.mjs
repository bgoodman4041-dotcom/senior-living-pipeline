// Environmental and regulatory screening of every site from official GIS services.
// Writes data/screening.json. Run by .github/workflows/refresh-places.yml (needs open internet).
//   FEMA NFHL flood zones · USFWS National Wetlands Inventory · EPA EMEF (Superfund, brownfields,
//   RCRA hazardous waste, toxic release) · NJDEP (known contaminated sites, sewer service areas,
//   areas in need of redevelopment, CAFRA, historic properties, overburdened communities) ·
//   NYSDEC informational freshwater wetland mapping.
import { readFileSync, writeFileSync } from "node:fs";

const ROOT = new URL("..", import.meta.url);
const d = JSON.parse(readFileSync(new URL("data/site-data.json", ROOT), "utf8"));
const OUT = new URL("data/screening.json", ROOT);
let prior = {};
try { prior = JSON.parse(readFileSync(OUT, "utf8")).sites || {}; } catch { /* first run */ }

const FEMA = "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28";
const NWI = "https://fwspublicservices.wim.usgs.gov/wetlandsmapservice/rest/services/Wetlands/MapServer/0";
const EPA = "https://geopub.epa.gov/arcgis/rest/services/EMEF/efpoints/MapServer/";
const NJ = "https://mapsdep.nj.gov/arcgis/rest/services/Features/";
const NYW = "https://services6.arcgis.com/DZHaqZm9cxOD4CWM/arcgis/rest/services/Informational_Freshwater_Wetland_Mapping/FeatureServer/2";

async function q(base, lat, lon, dist, fields = "*", countOnly = false) {
  const p = new URLSearchParams({
    geometry: `${lon},${lat}`, geometryType: "esriGeometryPoint", inSR: "4326", distance: String(Math.round(dist)),
    units: "esriSRUnit_Meter", spatialRel: "esriSpatialRelIntersects", outFields: fields, returnGeometry: "false", f: "json",
  });
  if (countOnly) p.set("returnCountOnly", "true");
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(`${base}/query?${p}`, { signal: AbortSignal.timeout(40000) });
      const j = await r.json();
      if (j.error) throw new Error(j.error.message || "service error");
      return countOnly ? j.count : (j.features || []).map((f) => f.attributes);
    } catch (e) {
      if (attempt === 2) throw e;
      await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
    }
  }
}
const safe = async (p) => { try { return await p; } catch (e) { return { err: String(e.message || e).slice(0, 80) }; } };
const uniq = (a) => [...new Set(a)];
const zones = (a) => (a.err ? a : uniq(a.map((x) => x.FLD_ZONE + (x.ZONE_SUBTY && /0\.2/.test(x.ZONE_SUBTY) ? " (0.2%)" : ""))));
const named = (a) => (a.err ? a : { n: a.length, names: uniq(a.map((x) => x.primary_name)).slice(0, 4) });
const pick = (a, re) => (a.err ? a : a.map((x) => Object.keys(x).filter((k) => re.test(k)).map((k) => x[k]).filter(Boolean).join(" / ")).filter(Boolean).slice(0, 4));

async function screen(s) {
  const lat = Number(s.lat), lon = Number(s.lon);
  const R = Math.min(Math.sqrt((Number(s.acres) * 4046.86) / Math.PI), 450); // program footprint radius, m
  const o = { radius_m: Math.round(R), pin_basis: s.pin_basis || null };
  const [fp, fs, nw, nw30, npl, bf, rcra, tri] = await Promise.all([
    safe(q(FEMA, lat, lon, 1, "FLD_ZONE,ZONE_SUBTY,SFHA_TF")), safe(q(FEMA, lat, lon, R, "FLD_ZONE,ZONE_SUBTY,SFHA_TF")),
    safe(q(NWI, lat, lon, R, "WETLAND_TYPE,ATTRIBUTE")), safe(q(NWI, lat, lon, R + 30, "WETLAND_TYPE")),
    safe(q(EPA + "0", lat, lon, 1609, "primary_name")), safe(q(EPA + "5", lat, lon, 805, "primary_name")),
    safe(q(EPA + "4", lat, lon, 200, "primary_name")), safe(q(EPA + "1", lat, lon, 805, "primary_name")),
  ]);
  o.flood_pin = zones(fp); o.flood_site = zones(fs); o.sfha_site = fs.err ? null : fs.some((x) => x.SFHA_TF === "T");
  o.nwi_site = nw.err ? nw : uniq(nw.map((x) => x.WETLAND_TYPE)); o.nwi_100ft = nw30.err ? nw30 : nw30.length;
  o.epa = { npl_1mi: named(npl), brownfield_half_mi: named(bf), rcra_adjacent: named(rcra), tri_half_mi: named(tri) };
  if (s.state === "NJ") {
    const [kcs, kcsS, ainr, ssa, cafra, hist, obc] = await Promise.all([
      safe(q(NJ + "Environmental_NJEMS/MapServer/0", lat, lon, 402)), safe(q(NJ + "Environmental_NJEMS/MapServer/0", lat, lon, R)),
      safe(q(NJ + "Government/MapServer/31", lat, lon, R)), safe(q(NJ + "Utilities/MapServer/8", lat, lon, 1)),
      safe(q(NJ + "Land_CAFRA_coast/MapServer/0", lat, lon, 1)), safe(q(NJ + "Land/MapServer/55", lat, lon, R)),
      safe(q(NJ + "Government/MapServer/42", lat, lon, 1)),
    ]);
    o.nj = {
      kcs_quarter_mi: kcs.err ? kcs : kcs.length, kcs_on_site: pick(kcsS, /NAME|PI_NUM/i), redevelopment_area: pick(ainr, /NAME|DESIG|STATUS/i),
      sewer_service_area: pick(ssa, /NAME|WMP|STATUS|TYPE|TRT|PLANT/i), in_sewer_service_area: ssa.err ? null : ssa.length > 0,
      cafra: cafra.err ? cafra : cafra.length > 0, historic: pick(hist, /NAME|STATUS/i), overburdened_community: obc.err ? obc : obc.length > 0,
    };
  }
  if (s.state === "NY") o.ny = { dec_wetlands_within_100ft: await safe(q(NYW, lat, lon, R + 30, "*", true)) };
  return o;
}

const out = {};
const queue = [...d.sites];
let ok = 0, fail = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (queue.length) {
    const s = queue.shift();
    try { out[s.id] = await screen(s); ok++; }
    catch (e) { fail++; if (prior[s.id]) out[s.id] = prior[s.id]; console.log(`screen-sites: ${s.id} failed (${e.message})`); }
  }
}));
const sorted = Object.fromEntries(Object.keys(out).sort().map((k) => [k, out[k]]));
writeFileSync(OUT, JSON.stringify({ screened_at: new Date().toISOString(), sources: {
  fema: FEMA, nwi: NWI, epa: EPA, njdep: NJ, nysdec_wetlands: NYW,
}, sites: sorted }, null, 1) + "\n");
console.log(`screen-sites: ${ok} screened, ${fail} failed`);
