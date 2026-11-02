// Deploy-time snapshot of nearby places for every site (public/places/<id>.json), so maps load instantly.
// Best effort: snapshots are committed in the repo; a site that fails keeps its committed file. Never fails the build.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

const ROOT = new URL("..", import.meta.url);
const OUT = new URL("public/places/", ROOT);
const BUDGET_MS = Number(process.env.PREFETCH_BUDGET_MIN || 6) * 60 * 1000, started = Date.now();
const MAX_AGE_MS = Number(process.env.PREFETCH_MAX_AGE_DAYS ?? 3) * 864e5;
if (!process.env.VERCEL && !process.env.PREFETCH_PLACES) {
  console.log("prefetch-places: skipped (set PREFETCH_PLACES=1 to run outside Vercel)");
  process.exit(0);
}
mkdirSync(OUT, { recursive: true });

const d = JSON.parse(readFileSync(new URL("data/site-data.json", ROOT), "utf8"));
let mod;
try {
  mod = await import(new URL("lib/live.ts", ROOT));
} catch (e) {
  console.log("prefetch-places: cannot load lib/live.ts in this Node (", e.message, "); skipping");
  process.exit(0);
}
let ok = 0, fail = 0;
const queue = [...d.sites];
async function worker() {
  while (queue.length && Date.now() - started < BUDGET_MS) {
    const s = queue.shift();
    const f = new URL(`${s.id}.json`, OUT);
    try {
      // committed snapshots stay unless a fresh lookup succeeds; skip ones refreshed in the last 3 days
      if (existsSync(f) && Date.now() - new Date(JSON.parse(readFileSync(f, "utf8")).fetchedAt).getTime() < MAX_AGE_MS) { ok++; continue; }
      let res, err;
      for (let attempt = 0; attempt < 3 && !res; attempt++) {
        try { res = await mod.overpassPois(Number(s.lat), Number(s.lon), 90000); }
        catch (e) { err = e; await new Promise((r) => setTimeout(r, 5000 * (attempt + 1))); }
      }
      if (!res) throw err;
      writeFileSync(f, JSON.stringify(res));
      ok++;
    } catch (e) {
      fail++; console.log(`prefetch-places: ${s.id} failed (${e.message})`);
    }
  }
}
await Promise.all(Array.from({ length: Number(process.env.PREFETCH_WORKERS || 2) }, worker));
console.log(`prefetch-places: ${ok} written, ${fail} failed, ${queue.length} skipped`);
process.exit(0);
