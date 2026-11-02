// Keyed providers (optional). With a Mapbox token set in Vercel, the maps use Mapbox satellite and
// streets tiles and nearby places come from the Mapbox Search Box API; without one, the keyless
// Esri / CARTO / OpenStreetMap stack is used. Tokens are read from environment variables only.
import type { Cat, Poi } from "./live";

/** Public (pk.) token for map tiles in the browser. Inlined at build time by Next.js. */
export const MAPBOX_PUBLIC_TOKEN = (process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "").trim();

function haversineMi(a: [number, number], b: [number, number]) {
  const toR = Math.PI / 180, R = 3958.8;
  const dLat = (b[1] - a[1]) * toR, dLon = (b[0] - a[0]) * toR;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * toR) * Math.cos(b[1] * toR) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Mapbox canonical category ids -> our categories and labels, with the search radius in miles.
const CATEGORY_MAP: { id: string; cat: Cat; kind: string; mi: number; bus?: boolean }[] = [
  { id: "hospital", cat: "hospital", kind: "Hospital", mi: 10 },
  { id: "train_station", cat: "transit", kind: "Rail station", mi: 10 },
  { id: "bus_station", cat: "transit", kind: "Bus station", mi: 3, bus: true },
  { id: "bus_stop", cat: "transit", kind: "Bus stop", mi: 0.6, bus: true },
  { id: "supermarket", cat: "grocery", kind: "Supermarket", mi: 3 },
  { id: "grocery", cat: "grocery", kind: "Grocery", mi: 3 },
  { id: "pharmacy", cat: "medical", kind: "Pharmacy", mi: 3 },
  { id: "doctors_office", cat: "medical", kind: "Doctors", mi: 3 },
  { id: "clinic", cat: "medical", kind: "Clinic", mi: 3 },
  { id: "urgent_care", cat: "medical", kind: "Urgent care", mi: 3 },
  { id: "nursing_home", cat: "senior", kind: "Nursing home", mi: 5 },
  { id: "assisted_living", cat: "senior", kind: "Assisted living", mi: 5 },
  { id: "retirement_home", cat: "senior", kind: "Senior living", mi: 5 },
  { id: "shopping_mall", cat: "retail", kind: "Shopping center", mi: 3 },
  { id: "restaurant", cat: "retail", kind: "Restaurant", mi: 1 },
  { id: "cafe", cat: "retail", kind: "Café", mi: 1 },
  { id: "bank", cat: "retail", kind: "Bank", mi: 1 },
  { id: "park", cat: "civic", kind: "Park", mi: 1.5 },
  { id: "place_of_worship", cat: "civic", kind: "Place of worship", mi: 1.5 },
  { id: "library", cat: "civic", kind: "Library", mi: 1.5 },
  { id: "community_center", cat: "civic", kind: "Community center", mi: 1.5 },
];
// Free-text searches that catch senior communities not tagged with a category.
const TEXT_QUERIES: { q: string; cat: Cat; kind: string; mi: number }[] = [
  { q: "assisted living", cat: "senior", kind: "Assisted living", mi: 5 },
  { q: "memory care", cat: "senior", kind: "Memory care", mi: 5 },
  { q: "senior living", cat: "senior", kind: "Senior living", mi: 5 },
];

const bbox = (lat: number, lon: number, mi: number) => {
  const dLat = mi / 69, dLon = mi / (69 * Math.cos((lat * Math.PI) / 180));
  return [lon - dLon, lat - dLat, lon + dLon, lat + dLat].map((v) => v.toFixed(5)).join(",");
};

/** Server side: nearby places from the Mapbox Search Box API. Throws if nothing came back. */
export async function mapboxPois(lat: number, lon: number, token: string, timeoutMs = 20000): Promise<{ pois: Poi[]; fetchedAt: string; source: string }> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  const base = "https://api.mapbox.com/search/searchbox/v1";
  const common = (mi: number) => `access_token=${encodeURIComponent(token)}&proximity=${lon},${lat}&bbox=${bbox(lat, lon, mi)}&limit=25&language=en&country=US`;
  const get = async (url: string) => {
    const r = await fetch(url, { signal: ctl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return (await r.json())?.features || [];
  };
  const jobs = [
    ...CATEGORY_MAP.map((c) => get(`${base}/category/${c.id}?${common(c.mi)}`).then((fs) => fs.map((f: any) => ({ f, c })))),
    ...TEXT_QUERIES.map((c) => get(`${base}/forward?q=${encodeURIComponent(c.q)}&types=poi&${common(c.mi)}`).then((fs) => fs.map((f: any) => ({ f, c })))),
  ];
  try {
    const settled = await Promise.allSettled(jobs);
    const seen = new Set<string>();
    const out: Poi[] = [];
    let anyOk = false;
    for (const s of settled) {
      if (s.status !== "fulfilled") continue;
      anyOk = true;
      for (const { f, c } of s.value) {
        const [plon, plat] = f.geometry?.coordinates || [];
        if (typeof plon !== "number" || typeof plat !== "number") continue;
        const name = f.properties?.name || c.kind;
        const id = f.properties?.mapbox_id || `${name}|${plon.toFixed(5)}|${plat.toFixed(5)}`;
        const key = `${c.cat}|${name.toLowerCase()}|${plon.toFixed(3)}|${plat.toFixed(3)}`;
        if (seen.has(id) || seen.has(key)) continue;
        const mi = haversineMi([lon, lat], [plon, plat]);
        if (mi > c.mi * 1.05) continue;
        seen.add(id); seen.add(key);
        out.push({ id: `mapbox/${id}`, cat: c.cat, kind: c.kind, name, lon: plon, lat: plat, mi, bus: (c as any).bus });
      }
    }
    if (!anyOk) throw new Error("Mapbox search unavailable");
    out.sort((a, b) => a.mi - b.mi);
    return { pois: out, fetchedAt: new Date().toISOString(), source: "Mapbox Search" };
  } finally { clearTimeout(timer); ctl.abort(); }
}
