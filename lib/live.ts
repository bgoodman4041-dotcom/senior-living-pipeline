// Live public-data lookups run in the viewer's browser (no keys):
//  - tax parcels from each state's public ArcGIS service
//  - points of interest around the site from OpenStreetMap (Overpass API)
import { haversineMi } from "./geo";

export interface ParcelSource { name: string; url: string; note?: string; fields: Record<string, string[]> }

const NY_PUBLIC_COUNTIES = ["Albany", "Broome", "Cayuga", "Chautauqua", "Cortland", "Erie", "Genesee", "Greene", "Hamilton", "Lewis", "Livingston", "Montgomery", "Bronx", "Kings", "New York", "Queens", "Richmond", "Oneida", "Onondaga", "Ontario", "Orange", "Oswego", "Otsego", "Putnam", "Rensselaer", "Rockland", "Schuyler", "Steuben", "St Lawrence", "Suffolk", "Sullivan", "Tioga", "Tompkins", "Ulster", "Warren", "Wayne", "Westchester", "Wyoming"];

// Display field -> candidate attribute names (first non-empty wins)
export const PARCEL_SOURCES: Record<string, ParcelSource> = {
  NJ: {
    name: "NJGIN Parcels & MOD-IV Composite",
    url: "https://services2.arcgis.com/XVOqAjTOJ5P6ngMu/arcgis/rest/services/Parcels_Composite_NJ_WM/FeatureServer/0/query",
    fields: {
      Address: ["PROP_LOC"], Municipality: ["MUN_NAME"], "Block / lot": ["PCLBLOCK|PCLLOT"], Owner: ["OWNER_NAME"],
      "Assessed acres": ["CALC_ACRE"], "Property class": ["PROP_CLASS"], "Land value": ["$LAND_VAL"], "Improvement value": ["$IMPRVT_VAL"],
      "Net assessed value": ["$NET_VALUE"], Building: ["BLDG_DESC"], "Year built": ["YR_CONSTR"], "Last sale": ["$SALE_PRICE"], "Deed date": ["DEED_DATE"], PIN: ["PAMS_PIN"],
    },
  },
  NY: {
    name: "NYS Tax Parcels (public counties)",
    url: "https://gisservices.its.ny.gov/arcgis/rest/services/NYS_Tax_Parcels_Public/MapServer/1/query",
    fields: {
      Address: ["PARCEL_ADDR"], Municipality: ["MUNI_NAME", "CITYTOWN_NAME"], "Tax map ID": ["PRINT_KEY", "SBL"], Owner: ["PRIMARY_OWNER"],
      "Assessed acres": ["ACRES", "CALC_ACRES"], "Property class": ["PROP_CLASS"], "Full market value": ["$FULL_MARKET_VAL"], "Total AV": ["$TOTAL_AV"],
      "Used as": ["USED_AS_DESC"], "Year built": ["YR_BLT"], Sewer: ["SEWER_DESC"], Water: ["WATER_DESC"], "School district": ["SCHOOL_NAME"],
    },
  },
  CT: {
    name: "CT State Parcel Layer + CAMA",
    url: "https://services3.arcgis.com/3FL1kr7L4LvwA2Kb/ArcGIS/rest/services/Connecticut_State_Parcel_Layer_2023/FeatureServer/0/query",
    fields: {
      Address: ["Location"], Town: ["Town_Name"], Owner: ["Owner"], Zone: ["Zone|Zone_Description"], "State use": ["State_Use_Description"],
      "Assessed total": ["$Assessed_Total"], "Appraised land": ["$Appraised_Land"], "Appraised building": ["$Appraised_Building"],
      "Year built": ["AYB"], "Last sale": ["$Sale_Price"], "Sale date": ["Sale_Date"], "Assessor card": ["Link"],
    },
  },
};

export function parcelSourceFor(state: string, county: string): { src?: ParcelSource; reason?: string } {
  if (state === "NY" && !NY_PUBLIC_COUNTIES.includes(county)) {
    return { reason: `${county} County does not publish its parcels to the NYS public layer. Pull the tax map from the county GIS portal.` };
  }
  return { src: PARCEL_SOURCES[state] };
}

export function readField(attrs: Record<string, any>, spec: string[]): string | null {
  for (const s of spec) {
    const money = s.startsWith("$");
    const keys = s.replace(/^\$/, "").split("|");
    const vals = keys.map((k) => attrs[k]).filter((v) => v !== null && v !== undefined && String(v).trim() !== "" && String(v).trim() !== "0");
    if (!vals.length) continue;
    if (money) {
      const n = Number(vals[0]);
      return Number.isFinite(n) ? `$${Math.round(n).toLocaleString("en-US")}` : String(vals[0]);
    }
    if (keys.some((k) => /DATE/i.test(k)) && typeof vals[0] === "number" && vals[0] > 1e11) return new Date(vals[0]).toISOString().slice(0, 10);
    return keys.length > 1 ? vals.join(" · ") : String(vals[0]);
  }
  return null;
}

async function withTimeout<T>(p: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try { return await p(ctl.signal); } finally { clearTimeout(t); }
}

export async function fetchParcels(src: ParcelSource, lon: number, lat: number, halfMeters = 320): Promise<any[]> {
  const dLat = halfMeters / 110540, dLon = halfMeters / (111320 * Math.cos((lat * Math.PI) / 180));
  const params = new URLSearchParams({
    geometry: [lon - dLon, lat - dLat, lon + dLon, lat + dLat].map((v) => v.toFixed(6)).join(","),
    geometryType: "esriGeometryEnvelope", inSR: "4326", spatialRel: "esriSpatialRelIntersects",
    outFields: "*", returnGeometry: "true", outSR: "4326", f: "geojson", resultRecordCount: "400",
  });
  const json = await withTimeout(async (signal) => {
    const r = await fetch(`${src.url}?${params}`, { signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }, 20000);
  if (json.error) throw new Error(json.error.message || "Parcel service error");
  return (json.features || []).filter((f: any) => f.geometry && (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon"));
}

// ---------------------------------------------------------------- amenities
export type Cat = "hospital" | "medical" | "grocery" | "retail" | "transit" | "senior" | "civic";
export const CATS: { key: Cat; label: string; color: string; radiusMi: number }[] = [
  { key: "hospital", label: "Hospitals", color: "#D0433A", radiusMi: 10 },
  { key: "transit", label: "Rail & transit", color: "#2F64C8", radiusMi: 10 },
  { key: "grocery", label: "Grocery", color: "#2E8B57", radiusMi: 3 },
  { key: "medical", label: "Clinics, doctors & pharmacy", color: "#E08A1E", radiusMi: 3 },
  { key: "senior", label: "Senior living & nursing (competitors)", color: "#7A4FC0", radiusMi: 5 },
  { key: "retail", label: "Retail, dining & banks", color: "#0E9AA7", radiusMi: 1 },
  { key: "civic", label: "Parks, worship & civic", color: "#B5387F", radiusMi: 1.5 },
];
export const CAT_COLOR = Object.fromEntries(CATS.map((c) => [c.key, c.color])) as Record<Cat, string>;

export interface Poi { id: string; cat: Cat; name: string; kind: string; lon: number; lat: number; mi: number; bus?: boolean }

const OVERPASS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

function query(lat: number, lon: number) {
  const a = (m: number) => `(around:${Math.round(m * 1609.34)},${lat},${lon})`;
  return `[out:json][timeout:40];
(
  nwr["amenity"="hospital"]${a(10)};
  nwr["healthcare"="hospital"]${a(10)};
  nwr["railway"~"^(station|halt)$"]${a(10)};
  nwr["public_transport"="station"]${a(10)};
  node["highway"="bus_stop"]${a(0.6)};
  nwr["shop"~"^(supermarket|greengrocer|wholesale)$"]${a(3)};
  nwr["amenity"~"^(clinic|doctors|pharmacy|dentist)$"]${a(3)};
  nwr["healthcare"~"^(clinic|doctor|centre|urgent_care|rehabilitation|physiotherapist)$"]${a(3)};
  nwr["shop"="chemist"]${a(3)};
  nwr["social_facility"~"^(assisted_living|nursing_home)$"]${a(5)};
  nwr["amenity"="nursing_home"]${a(5)};
  nwr["healthcare"="nursing_home"]${a(5)};
  nwr["social_facility:for"~"senior"]${a(5)};
  nwr["shop"~"^(mall|department_store)$"]${a(3)};
  nwr["amenity"~"^(restaurant|cafe|bank)$"]${a(1)};
  nwr["leisure"~"^(park|golf_course|nature_reserve)$"]["name"]${a(1.5)};
  nwr["amenity"~"^(place_of_worship|community_centre|library|theatre|social_centre)$"]${a(1.5)};
);
out tags center 3000;`;
}

function classify(t: Record<string, string>): { cat: Cat; kind: string; bus?: boolean } | null {
  const am = t.amenity, hc = t.healthcare, sf = t.social_facility, shop = t.shop;
  if (sf === "assisted_living" || sf === "nursing_home" || am === "nursing_home" || hc === "nursing_home" || /senior/.test(t["social_facility:for"] || ""))
    return { cat: "senior", kind: sf === "assisted_living" ? "Assisted living" : sf === "nursing_home" || am === "nursing_home" || hc === "nursing_home" ? "Nursing home" : "Senior facility" };
  if (am === "hospital" || hc === "hospital") return { cat: "hospital", kind: "Hospital" };
  if (t.railway === "station" || t.railway === "halt" || t.public_transport === "station") {
    if (t.highway === "bus_stop" || t.bus === "yes" && !t.railway && !t.train) return { cat: "transit", kind: "Bus station", bus: true };
    return { cat: "transit", kind: t.station === "subway" ? "Subway" : "Rail station" };
  }
  if (t.highway === "bus_stop") return { cat: "transit", kind: "Bus stop", bus: true };
  if (shop === "supermarket" || shop === "greengrocer" || shop === "wholesale") return { cat: "grocery", kind: shop === "supermarket" ? "Supermarket" : "Grocery" };
  if (am === "pharmacy" || shop === "chemist") return { cat: "medical", kind: "Pharmacy" };
  if (am === "clinic" || am === "doctors" || am === "dentist" || hc) return { cat: "medical", kind: hc === "urgent_care" ? "Urgent care" : am === "dentist" ? "Dentist" : am === "doctors" || hc === "doctor" ? "Doctors" : "Clinic" };
  if (shop === "mall" || shop === "department_store") return { cat: "retail", kind: shop === "mall" ? "Shopping center" : "Department store" };
  if (am === "restaurant" || am === "cafe" || am === "bank") return { cat: "retail", kind: am === "bank" ? "Bank" : am === "cafe" ? "Café" : "Restaurant" };
  if (t.leisure) return { cat: "civic", kind: t.leisure === "golf_course" ? "Golf course" : t.leisure === "nature_reserve" ? "Nature preserve" : "Park" };
  if (am === "place_of_worship") return { cat: "civic", kind: "Place of worship" };
  if (am === "community_centre" || am === "social_centre") return { cat: "civic", kind: "Community center" };
  if (am === "library") return { cat: "civic", kind: "Library" };
  if (am === "theatre") return { cat: "civic", kind: "Theater" };
  return null;
}

const CACHE_V = "atco-poi-v2";
export async function fetchPois(id: string, lat: number, lon: number): Promise<{ pois: Poi[]; fetchedAt: string; source: string }> {
  try {
    const c = localStorage.getItem(`${CACHE_V}:${id}`);
    if (c) {
      const j = JSON.parse(c);
      if (Date.now() - new Date(j.fetchedAt).getTime() < 7 * 864e5 && Array.isArray(j.pois)) return j;
    }
  } catch { /* storage unavailable */ }
  const body = new URLSearchParams({ data: query(lat, lon) });
  let lastErr: any = null;
  for (const url of OVERPASS) {
    try {
      const json = await withTimeout(async (signal) => {
        const r = await fetch(url, { method: "POST", body, signal });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }, 45000);
      const seen = new Map<string, Poi>();
      const out: Poi[] = [];
      for (const e of json.elements || []) {
        const t = e.tags || {};
        const c = classify(t);
        if (!c) continue;
        const plon = e.lon ?? e.center?.lon, plat = e.lat ?? e.center?.lat;
        if (plon === undefined || plat === undefined) continue;
        const name = t.name || t.brand || t.operator || (c.bus ? "Bus stop" : c.kind);
        if (!t.name && !c.bus && (c.cat === "retail" || c.cat === "civic")) continue; // skip unnamed minor POIs
        const mi = haversineMi([lon, lat], [plon, plat]);
        const key = `${c.cat}|${name.toLowerCase()}`;
        const prior = seen.get(key);
        if (prior && haversineMi([prior.lon, prior.lat], [plon, plat]) < 0.25) continue;
        const p: Poi = { id: `${e.type}/${e.id}`, cat: c.cat, kind: c.kind, name, lon: plon, lat: plat, mi, bus: c.bus };
        seen.set(key, p);
        out.push(p);
      }
      out.sort((a, b) => a.mi - b.mi);
      const res = { pois: out, fetchedAt: new Date().toISOString(), source: new URL(url).host };
      try { localStorage.setItem(`${CACHE_V}:${id}`, JSON.stringify(res)); } catch { /* quota */ }
      return res;
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("Overpass unavailable");
}
