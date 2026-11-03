import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { VerdictChip } from "@/components/ui";
import { sites, shortlist, meta, onHold } from "@/lib/data";
import { pct, longDate } from "@/lib/format";

export const metadata: Metadata = { title: "Data room", description: "Document index: IC memos, Excel pro formas for every site, the portfolio workbook, underwriting basis and market research." };

const size = (rel: string) => {
  try { const b = fs.statSync(path.join(process.cwd(), "public", rel)).size; return b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.round(b / 1e3)} KB`; } catch { return null; }
};

export default function DataRoom() {
  const ordered = sites.slice().sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
  const port = "models/ATCO-senior-living-portfolio.xlsx";
  let n = 0; const idx = () => `${++n}`.padStart(2, "0");
  return (
    <section className="section">
      <div className="wrap">
        <div className="section-head"><div>
          <div className="eyebrow">Data room</div><h2>Document index</h2>
          <p>Everything an investment committee or co-GP needs to re-underwrite the program, in one place. Models and memos regenerate from the same data as this site, so the numbers tie. Data as of {longDate(meta.as_of)}.</p>
        </div></div>

        <div className="card" style={{ marginBottom: 18 }}><div className="table-wrap"><table className="t dr-t">
          <caption className="label" style={{ textAlign: "left", padding: "14px 16px 4px" }}>1 · Investment committee</caption>
          <thead><tr><th>#</th><th>Document</th><th className="hide-sm">Type</th><th className="num hide-sm">Size</th><th></th></tr></thead>
          <tbody>
            <tr><td>{idx()}</td><td><b>Portfolio workbook</b><div className="xs muted">All 44 sites, shortlist roll-up and capital deployment, live formulas</div></td><td className="hide-sm">Excel</td><td className="num hide-sm">{size(port)}</td><td><a href={`/${port}`} download>Download</a></td></tr>
            {shortlist.map((s) => { const f = `memos/ATCO-${s.id}-IC-memo.pdf`; return (
              <tr key={s.id}><td>{idx()}</td><td><b>IC memo · {s.municipality}</b><div className="xs muted">{s.name} · {s.id} · rank {s.rank}</div></td><td className="hide-sm">PDF</td><td className="num hide-sm">{size(f) ?? "—"}</td>
                <td><a href={`/${f}`} download>Download</a> · <a href={`/memo/${s.id}`}>View</a></td></tr>); })}
          </tbody>
        </table></div></div>

        <div className="card" style={{ marginBottom: 18 }}><div className="table-wrap"><table className="t dr-t">
          <caption className="label" style={{ textAlign: "left", padding: "14px 16px 4px" }}>2 · Site pro formas · {sites.length} Excel models in the 106 Court format</caption>
          <thead><tr><th>#</th><th>Site</th><th>Verdict</th><th className="num">YOC taxed</th><th className="num hide-sm">Size</th><th></th></tr></thead>
          <tbody>{ordered.map((s) => { const f = `models/ATCO-${s.id}-proforma.xlsx`; return (
            <tr key={s.id}><td>{idx()}</td><td><a href={`/sites/${s.id}`} className="site-name">{s.name}</a><div className="xs muted">{s.municipality}, {s.state} · {s.id}</div></td>
              <td><VerdictChip v={s.verdict} hold={onHold(s)} /></td><td className="num">{pct(s.uw.yoc)}</td><td className="num hide-sm">{size(f)}</td><td><a href={`/${f}`} download>Download</a></td></tr>); })}</tbody>
        </table></div></div>

        <div className="card"><div className="table-wrap"><table className="t dr-t">
          <caption className="label" style={{ textAlign: "left", padding: "14px 16px 4px" }}>3 · Underwriting basis, market and partners</caption>
          <thead><tr><th>#</th><th>Document</th><th>What it covers</th><th></th></tr></thead>
          <tbody>
            {([
              ["Investor FAQ", "The questions LPs and lenders ask first, each linked to its evidence, with the items only ATCO can answer", "/investors"],
              ["Anchor deal: Florham Park", "Test fit, sources and uses, schedule, PILOT path, risk register and capital gates for the lead site", "/anchor"],
              ["LP diligence", "Rent comps, cost comps, site control, NJ redevelopment status, downside cushion and LP net returns, with sources", "/diligence"],
              ["Florham Park GC budget outline", "CSI-division budget from the model, ready for a GC to price (.xlsx)", "/models/ATCO-NJ-04-GC-budget.xlsx"],
              ["Methodology", "Screens, scoring, verdict rules and the tax structures", "/method"],
              ["Assumptions register", "Every input with its value and source, including the lease-up norm", "/method#assumptions"],
              ["The model", "How the pro forma and capital plan are built, cell by cell", "/model"],
              ["Markets", "County rent, cost, tax and land indices", "/markets"],
              ["Operators and contractors", "Operator fit by site, sponsors, structures and the GC roster with sourced projects", "/operators"],
              ["News", "Dated, sourced supply, demand and capital-markets items", "/news"],
              ["Important notice", "Limits of the model and disclaimer", "/method#disclaimer"],
            ] as [string, string, string][]).map(([t, d, h]) => (
              <tr key={h}><td>{idx()}</td><td><b>{t}</b></td><td className="small">{d}</td><td><a href={h}>Open</a></td></tr>))}
          </tbody>
        </table></div></div>
      </div>
    </section>
  );
}
