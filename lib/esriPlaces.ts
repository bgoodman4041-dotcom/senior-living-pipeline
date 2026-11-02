// Keyless nearby-places fallback: Esri World Geocoding Service category search (browser, CORS-enabled).
// Used when no committed snapshot exists and before the slower OpenStreetMap / Overpass mirrors.
import type { Cat, Poi } from "./live";

const CATS: { q: string; cat: Cat; kind: string; mi: number; text?: boolean }[] = [
  { q: "Hospital", cat: "hospital", kind: "Hospital", mi: 10 },
  { q: "Train Station", cat: "transit", kind: "Rail station", mi: 10 },
  { q: "Grocery", cat: "grocery", kind: "Grocery", mi: 3 },
  { q: "Pharmacy", cat: "medical", kind: "Pharmacy", mi: 3 },
  { q: "Medical Clinic", cat: "medical", kind: "Clinic", mi: 3 },
  { q: "Doctor", cat: "medical", kind: "Doctors", mi: 2 },
  { q: "Nursing Home", cat: "senior", kind: "Nursing home", mi: 5 },
  { q: "assisted living", cat: "senior", kind: "Assisted living", mi: 5, text: true },
  { q: "senior living", cat: "senior", kind: "Senior living", mi: 5, text: true },
  { q: "memory care", cat: "senior", kind: "Memory care", mi: 5, text: true },
  { q: "Shopping Center", cat: "retail", kind: "Shopping center", mi: 3 },
  { q: "Restaurant", cat: "retail", kind: "Restaurant", mi: 1 },
  { q: "Coffee Shop", cat: "retail", kind: "Café", mi: 1 },
  { q: "Bank", cat: "retail", kind: "Bank", mi: 1 },
  { q: "Park", cat: "civic", kind: "Park", mi: 1.5 },
  { q: "Church", cat: "civic", kind: "Place of worship", mi: 1.5 },
  { q: "Library", cat: "civic", kind: "Library", mi: 1.5 },
];

const hav = (a: [number, number], b: [number, number]) => {
  const r = Math.PI / 180, dLat = (b[1] - a[1]) * r, dLon = (b[0] - a[0]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLon / 2) ** 2;
  return 2 * 3958.8 * Math.asin(Math.sqrt(h));
};

export async function esriPois(lat: number, lon: number, timeoutMs = 15000): Promise<{ pois: Poi[]; fetchedAt: string; source: string }> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  const base = "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates";
  try {
    const settled = await Promise.allSettled(CATS.map(async (c) => {
      const dLat = c.mi / 69, dLon = c.mi / (69 * Math.cos((lat * Math.PI) / 180));
      const p = new URLSearchParams({
        location: `${lon},${lat}`, searchExtent: [lon - dLon, lat - dLat, lon + dLon, lat + dLat].map((v) => v.toFixed(5)).join(","),
        maxLocations: "50", outFields: "PlaceName,Type,Place_addr", f: "json",
        ...(c.text ? { SingleLine: c.q, category: "POI" } : { category: c.q }),
      });
      const r = await fetch(`${base}?${p}`, { signal: ctl.signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      if (j.error) throw new Error(j.error.message);
      return (j.candidates || []).map((x: any) => ({ x, c }));
    }));
    const out: Poi[] = [];
    const seen = new Set<string>();
    let anyOk = false;
    for (const s of settled) {
      if (s.status !== "fulfilled") continue;
      anyOk = true;
      for (const { x, c } of s.value) {
        const plon = x.location?.x, plat = x.location?.y;
        const name = String(x.attributes?.PlaceName || "").trim();
        if (typeof plon !== "number" || typeof plat !== "number" || !name) continue;
        if (c.text && !/assisted|senior (living|residence|communit|housing|apartments)|memory care|retire|nursing|rehab|adult home|independent living|manor|sunrise|atria|brookdale|benchmark|brandywine|arden|bristal/i.test(name)) continue;
        const key = `${c.cat}|${name.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
        if (seen.has(key)) continue;
        const mi = hav([lon, lat], [plon, plat]);
        if (mi > c.mi * 1.05) continue;
        seen.add(key);
        out.push({ id: `esri/${key}|${plon.toFixed(4)}`, cat: c.cat, kind: c.kind, name, lon: plon, lat: plat, mi });
      }
    }
    if (!anyOk || !out.length) throw new Error("Esri places unavailable");
    out.sort((a, b) => a.mi - b.mi);
    return { pois: out, fetchedAt: new Date().toISOString(), source: "Esri World Geocoding (places)" };
  } finally { clearTimeout(timer); ctl.abort(); }
}
