// Render the one-page partnership brief to PDF: start the site (next start -p 3000) first, then `node scripts/build_brief.mjs`.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import fs from "node:fs";
const base = process.env.BASE || "http://localhost:3000";
const out = new URL("../public/briefs/", import.meta.url);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`${base}/brief`, { waitUntil: "networkidle" });
await page.emulateMedia({ media: "print" });
const file = new URL("ATCO-senior-living-partnership-brief.pdf", out);
await page.pdf({ path: file.pathname, format: "Letter", printBackground: true, preferCSSPageSize: true });
console.log("brief", fs.statSync(file).size);
await browser.close();
