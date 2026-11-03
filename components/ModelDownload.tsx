import fs from "node:fs";
import path from "node:path";
import { pct, usdM, mult } from "@/lib/format";

const TABS: [string, string][] = [
  ["Read Me", "What the model answers, the live key results, how to use it, how the numbers flow, and a glossary of every named cell."],
  ["One Page Summary", "Revenue to NOI, the cost stack, yield on cost against the 6.5% floor, and the most we can pay for land."],
  ["Program & Massing", "Unit mix by care level, rents, gross square feet, floors and parking, tied to the 3D massing on this page."],
  ["Capital Deployment", "Sources and uses, the monthly draw (equity first, then the loan), the five gates, IRRs and the equity multiple."],
  ["10 Year Cash Flow", "Lease-up, stabilized operations, the HUD 232-style take-out and the hold case."],
  ["Sources & Notes", "Where every input comes from, with the market and research citations."],
];
const FLOW = ["Program and unit mix", "Rents by care level", "Revenue less operating costs", "Real estate tax by structure", "NOI", "Hard, site, soft and carry costs", "Total development cost", "Yield on cost and max land", "Draws, take-out and IRR"];

export default function ModelDownload({ site, cp }: { site: any; cp: any }) {
  const file = `ATCO-${site.id}-proforma.xlsx`;
  let kb = 0;
  try { kb = Math.round(fs.statSync(path.join(process.cwd(), "public/models", file)).size / 1024); } catch {}
  const u = site.uw;
  const keys: [string, string][] = [
    ["Yield on cost (as structured)", pct(cp.yoc)],
    ["Total development cost", usdM(cp.uses.total, 1)],
    ["Equity / construction loan", `${usdM(cp.equityCommit, 1)} / ${usdM(cp.loanCommit, 1)}`],
    cp.efCase
      ? ["Entrance-fee case, levered IRR", `${pct(cp.efCase.nonprofit.irrL, 1)} nonprofit · ${pct(cp.efCase.taxable.irrL, 1)} for-profit`]
      : ["Levered IRR · equity multiple", `${Number.isFinite(cp.irrLevered) ? pct(cp.irrLevered, 1) : "n/a"} · ${mult(cp.equityMultiple)}`],
    ["Max land at 6.5%", usdM(u.max_land, 1)],
  ];
  return (
    <div className="model-dl">
      <div className="model-dl-main">
        <div className="xl-icon" aria-hidden="true"><span>X</span></div>
        <div style={{ minWidth: 0 }}>
          <div className="label" style={{ color: "rgba(255,255,255,.75)" }}>Live Excel model · {TABS.length} tabs · {kb ? `${kb} KB` : "xlsx"}</div>
          <h3 style={{ margin: "4px 0 6px", color: "#fff" }}>{site.name}: the full pro forma</h3>
          <p className="small" style={{ margin: 0, color: "rgba(255,255,255,.85)" }}>Every number on this page, with working formulas. Blue cells are inputs: change the rents, costs, land or cap rate and the whole model recalculates. Open the Read Me tab first.</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
            <a className="btn btn-xl" href={`/models/${file}`} download>Download the Excel model</a>
            <a className="btn btn-ghost" href="/models/ATCO-senior-living-portfolio.xlsx" download>Portfolio workbook (all 44)</a>
          </div>
        </div>
      </div>
      <div className="grid g2" style={{ marginTop: 18 }}>
        <div className="card card-pad">
          <h3 style={{ marginTop: 0 }}>What is inside</h3>
          <ol className="model-tabs">{TABS.map(([t, d]) => <li key={t}><b>{t}</b><span>{d}</span></li>)}</ol>
        </div>
        <div className="card card-pad">
          <h3 style={{ marginTop: 0 }}>The answers it gives</h3>
          <table className="kv small"><tbody>{keys.map(([k, v]) => <tr key={k}><td>{k}</td><td className="tnum"><b>{v}</b></td></tr>)}</tbody></table>
          <div className="label" style={{ margin: "16px 0 8px" }}>How the numbers flow</div>
          <div className="flow">{FLOW.map((f, i) => <span key={f}><i>{i + 1}</i>{f}</span>)}</div>
          <p className="xs muted" style={{ marginTop: 12 }}>The workbook ties to this page to the dollar: all 45 models are recalculated and reconciled against the site underwriting before each release.</p>
        </div>
      </div>
    </div>
  );
}
