// Snapshot of nearby places for every site (public/places/<id>.json), so the site maps load instantly.
// Run weekly by .github/workflows/refresh-places.yml (which commits the files) and at each Vercel build.
// Best effort: a site whose lookup fails keeps its committed file, and network trouble never fails the build.
// PREFETCH_STRICT=1 (the workflow) does fail when lib/live.ts cannot load, so a code problem can't go unnoticed again.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

const ROOT = new URL("..", import.meta.url);
const OUT = new URL("public/places/", ROOT);
const BUDGET_MS = Number(process.env.PREFETCH_BUDGET_MIN || 6) * 60 * 1000, started = Date.now();
const MAX_AGE_MS = Number(process.env.PREFETCH_MAX_AGE_DAYS ?? 10) * 864e5;
const STRICT = process.env.PREFETCH_STRICT === "1";
if (!process.env.VERCEL && !process.env.PREFETCH_PLACES) {
  console.log("prefetch-places: skipped (set PREFETCH_PLACES=1 to run outside Vercel)");
  process.exit(0);
}
mkdirSync(OUT, { recursive: true });

const d = JSON.parse(readFileSync(new URL("data/site-data.json", ROOT), "utf8"));
let mod;
try {
  mod = await import(new URL("lib/live.ts", ROOT));
  if (typeof mod.overpassPois !== "function" || typeof mod.overpassPoisSplit !== "function") throw new Error("lib/live.ts is missing overpassPois/overpassPoisSplit");
} catch (e) {
  console.log(`prefetch-places: cannot load lib/live.ts (${e.message})`);
  process.exit(STRICT ? 1 : 0);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const age = (f) => { try { return Date.now() - new Date(JSON.parse(readFileSync(f, "utf8")).fetchedAt).getTime(); } catch { return Infinity; } };

/** Full query twice, then the same search split into three smaller queries (dense suburbs time out on the full one). */
async function lookup(lat, lon) {
  const errs = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    try { return await mod.overpassPois(lat, lon, 90000); } catch (e) { errs.push(e.message); await wait(5000 * (attempt + 1)); }
  }
  try { return await mod.overpassPoisSplit(lat, lon, 60000); } catch (e) { errs.push(`split: ${e.message}`); }
  throw new Error(errs.join("; "));
}

const fresh = [], written = [], failed = [];
const queue = [...d.sites];
async function worker() {
  while (queue.length && Date.now() - started < BUDGET_MS) {
    const s = queue.shift();
    const f = new URL(`${s.id}.json`, OUT);
    if (existsSync(f) && age(f) < MAX_AGE_MS) { fresh.push(s.id); continue; }
    try {
      const res = await lookup(Number(s.lat), Number(s.lon));
      if (!res?.pois?.length) throw new Error("no places returned");
      writeFileSync(f, JSON.stringify(res));
      written.push(s.id);
      console.log(`prefetch-places: ${s.id} ${res.pois.length} places (${res.source})`);
    } catch (e) {
      failed.push(s.id);
      console.log(`prefetch-places: ${s.id} failed${existsSync(f) ? ", keeping the committed snapshot" : ""} (${e.message})`);
    }
  }
}
await Promise.all(Array.from({ length: Math.max(1, Number(process.env.PREFETCH_WORKERS || 2)) }, worker));
const missing = d.sites.filter((s) => !existsSync(new URL(`${s.id}.json`, OUT))).map((s) => s.id);
console.log(`prefetch-places: ${written.length} refreshed, ${fresh.length} already fresh, ${failed.length} failed, ${queue.length} not reached (time budget)`);
if (failed.length) console.log(`prefetch-places: failed: ${failed.join(", ")}`);
if (missing.length) console.log(`prefetch-places: no snapshot (the map looks these up live): ${missing.join(", ")}`);
process.exit(0);
