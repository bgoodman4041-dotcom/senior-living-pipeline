// Render each internal market study to PDF: start the site (next start -p 3000) first, then `node scripts/build_studies.mjs`.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright"); // pre-installed globally in CI images; npm i -D playwright elsewhere
import fs from "node:fs";
const ids = JSON.parse(fs.readFileSync(new URL("../data/market-studies.json", import.meta.url), "utf8")).order;
const base = process.env.BASE || "http://localhost:3000";
const out = new URL("../public/studies/", import.meta.url);
fs.mkdirSync(out, { recursive: true });
for (const f of fs.readdirSync(out)) if (f.endsWith(".pdf")) fs.unlinkSync(new URL(f, out));
const browser = await chromium.launch();
const page = await browser.newPage();
for (const id of ids) {
  await page.goto(`${base}/study/${id}`, { waitUntil: "networkidle" });
  await page.emulateMedia({ media: "print" });
  const file = new URL(`ATCO-${id}-market-study.pdf`, out);
  await page.pdf({ path: file.pathname, format: "Letter", printBackground: true, preferCSSPageSize: false, displayHeaderFooter: true, headerTemplate: "<span></span>", footerTemplate: `<div style="font-size:7px;width:100%;padding:0 0.45in;color:#888;display:flex;justify-content:space-between;font-family:Roboto,Arial"><span>ATCO internal market study · not a third-party study · ATCO is not affiliated with RiverSpring Living</span><span><span class=pageNumber></span> / <span class=totalPages></span></span></div>`, margin: { top: "0.45in", bottom: "0.55in", left: "0.45in", right: "0.45in" } });
  console.log(id, fs.statSync(file).size);
}
await browser.close();
