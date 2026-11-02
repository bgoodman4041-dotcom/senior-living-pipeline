// Deploy-time snapshot of nearby places for every site (public/places/<id>.json), so maps load instantly.
// Best effort: any site that fails falls back to the live API at view time. Never fails the build.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

const ROOT = new URL("..", import.meta.url);
const OUT = new URL("public/places/", ROOT);
const BUDGET_MS = 6 * 60 * 1000, started = Date.now();
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
    try {
      const res = await mod.overpassPois(Number(s.lat), Number(s.lon), 45000);
      writeFileSync(new URL(`${s.id}.json`, OUT), JSON.stringify(res));
      ok++;
    } catch (e) {
      fail++; console.log(`prefetch-places: ${s.id} failed (${e.message})`);
    }
  }
}
await Promise.all([worker(), worker()]);
console.log(`prefetch-places: ${ok} written, ${fail} failed, ${queue.length} skipped`);
process.exit(0);
