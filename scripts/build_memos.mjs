// Render each shortlist IC memo to PDF: start the site (next start -p 3000) first, then `node scripts/build_memos.mjs`.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright"); // pre-installed globally in CI images; npm i -D playwright elsewhere
import fs from "node:fs";
const d = JSON.parse(fs.readFileSync(new URL("../data/site-data.json", import.meta.url), "utf8"));
const ids = d.sites.filter((s) => s.verdict === "Pursue" || s.verdict === "Pursue-structured").map((s) => s.id);
const base = process.env.BASE || "http://localhost:3000";
const out = new URL("../public/memos/", import.meta.url);
fs.mkdirSync(out, { recursive: true });
for (const f of fs.readdirSync(out)) if (f.endsWith(".pdf")) fs.unlinkSync(new URL(f, out));
const browser = await chromium.launch();
const page = await browser.newPage();
for (const id of ids) {
  await page.goto(`${base}/memo/${id}`, { waitUntil: "networkidle" });
  await page.emulateMedia({ media: "print" });
  const file = new URL(`ATCO-${id}-IC-memo.pdf`, out);
  await page.pdf({ path: file.pathname, format: "Letter", printBackground: true, preferCSSPageSize: true });
  console.log(id, fs.statSync(file).size);
}
await browser.close();
