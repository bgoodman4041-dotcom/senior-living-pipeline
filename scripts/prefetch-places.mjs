// Snapshot of nearby places for every site (public/places/<id>.json), so the site maps load instantly.
// Run weekly (and on demand) by .github/workflows/refresh-places.yml, which commits the files. Vercel builds skip it:
// they deploy the committed snapshots, so a slow public Overpass server can't hold up a deploy, and a site without a
// snapshot still gets its places live in the browser (Esri, then OpenStreetMap).
// Best effort: OpenStreetMap (Overpass) first. When the public Overpass servers are down, a site keeps its committed
// snapshot, and a site with no snapshot (or a thin one) gets Esri's keyless places instead, the same source the
// browser would use. Sites with no or thin snapshots are tried first. Network trouble never fails the run.
// PREFETCH_STRICT=1 (the workflow) does fail when lib/live.ts cannot load, so a code problem can't go unnoticed again.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

const ROOT = new URL("..", import.meta.url);
const OUT = new URL("public/places/", ROOT);
const BUDGET_MS = Number(process.env.PREFETCH_BUDGET_MIN || 6) * 60 * 1000, started = Date.now();
const MAX_AGE_MS = Number(process.env.PREFETCH_MAX_AGE_DAYS ?? 10) * 864e5;
const THIN = 15; // fewer places than this means a partial answer: refresh it first and replace it from Esri if need be
const STRICT = process.env.PREFETCH_STRICT === "1";
if (!process.env.PREFETCH_PLACES) {
  console.log("prefetch-places: skipped; deploying the committed snapshots (set PREFETCH_PLACES=1 to refresh them)");
  process.exit(0);
}
mkdirSync(OUT, { recursive: true });

const d = JSON.parse(readFileSync(new URL("data/site-data.json", ROOT), "utf8"));
let mod, esri;
try {
  mod = await import(new URL("lib/live.ts", ROOT));
  esri = await import(new URL("lib/esriPlaces.ts", ROOT));
  if (typeof mod.overpassPois !== "function" || typeof mod.overpassPoisSplit !== "function") throw new Error("lib/live.ts is missing overpassPois/overpassPoisSplit");
  if (typeof esri.esriPois !== "function") throw new Error("lib/esriPlaces.ts is missing esriPois");
} catch (e) {
  console.log(`prefetch-places: cannot load lib/live.ts (${e.message})`);
  process.exit(STRICT ? 1 : 0);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const read = (f) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return null; } };
const age = (j) => (j ? Date.now() - new Date(j.fetchedAt).getTime() : Infinity);
const count = (j) => (Array.isArray(j?.pois) ? j.pois.length : 0);
const file = (s) => new URL(`${s.id}.json`, OUT);

/** Full query twice, then the same search split into three smaller queries (dense suburbs time out on the full one). */
async function lookup(lat, lon) {
  const errs = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    try { return await mod.overpassPois(lat, lon, 90000); } catch (e) { errs.push(e.message); await wait(5000 * (attempt + 1)); }
  }
  try { return await mod.overpassPoisSplit(lat, lon, 60000); } catch (e) { errs.push(`split: ${e.message}`); }
  throw new Error(errs.join("; "));
}

const fresh = [], written = [], fallback = [], failed = [];
// Missing snapshots first, then thin ones, then the oldest.
const rank = (s) => { const j = read(file(s)); return !j ? 0 : count(j) < THIN ? 1 : 2; };
const queue = d.sites.map((s) => ({ s, r: rank(s), a: age(read(file(s))) })).sort((x, y) => x.r - y.r || y.a - x.a).map((x) => x.s);
async function worker() {
  while (queue.length && Date.now() - started < BUDGET_MS) {
    const s = queue.shift();
    const f = file(s), prev = read(f);
    if (prev && age(prev) < MAX_AGE_MS && count(prev) >= THIN) { fresh.push(s.id); continue; }
    try {
      const res = await lookup(Number(s.lat), Number(s.lon));
      if (!res?.pois?.length) throw new Error("no places returned");
      writeFileSync(f, JSON.stringify(res));
      written.push(s.id);
      console.log(`prefetch-places: ${s.id} ${res.pois.length} places (${res.source})`);
    } catch (e) {
      if (count(prev) < THIN) {
        try {
          const alt = await esri.esriPois(Number(s.lat), Number(s.lon), 30000);
          if (count(alt) > count(prev)) {
            writeFileSync(f, JSON.stringify(alt));
            fallback.push(s.id);
            console.log(`prefetch-places: ${s.id} ${alt.pois.length} places (${alt.source}; OpenStreetMap failed: ${e.message})`);
            continue;
          }
        } catch (e2) { e = new Error(`${e.message}; esri: ${e2.message}`); }
      }
      failed.push(s.id);
      console.log(`prefetch-places: ${s.id} failed${prev ? ", keeping the committed snapshot" : ""} (${e.message})`);
    }
  }
}
await Promise.all(Array.from({ length: Math.max(1, Number(process.env.PREFETCH_WORKERS || 2)) }, worker));
const missing = d.sites.filter((s) => !existsSync(file(s))).map((s) => s.id);
console.log(`prefetch-places: ${written.length} refreshed, ${fallback.length} from Esri, ${fresh.length} already fresh, ${failed.length} failed, ${queue.length} not reached (time budget)`);
if (failed.length) console.log(`prefetch-places: failed: ${failed.join(", ")}`);
if (missing.length) console.log(`prefetch-places: no snapshot (the map looks these up live): ${missing.join(", ")}`);
process.exit(0);
