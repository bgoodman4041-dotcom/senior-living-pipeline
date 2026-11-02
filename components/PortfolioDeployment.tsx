import { capitalPlan } from "@/lib/capital";
import { pct, usdM, mult } from "@/lib/format";

/** Shortlist capital deployment: one closing per quarter in rank order, equity first then loan, per site. */
export default function PortfolioDeployment({ shortlist, a }: { shortlist: any[]; a: any }) {
  const rows = shortlist.slice().sort((x, y) => x.rank - y.rank).map((s, i) => ({ s, i, p: capitalPlan(s, a) }));
  const rental = rows.filter((r) => r.p.struct !== "Entrance fee");
  const months = Math.max(...rows.map((r) => r.i * 3 + r.p.N)) + 1;
  const cumE = new Array(months).fill(0), cumL = new Array(months).fill(0);
  for (const r of rows) {
    for (const m of r.p.months) {
      const t = r.i * 3 + m.m;
      for (let k = t; k < months; k++) { cumE[k] += m.equity; cumL[k] += m.loan; }
    }
  }
  const peakEquity = cumE[months - 1];
  const sum = (f: (r: (typeof rows)[number]) => number, rs = rental) => rs.reduce((acc, r) => acc + f(r), 0);
  const eqR = sum((r) => r.p.equityCommit);
  const wIrrL = sum((r) => r.p.equityCommit * r.p.irrLevered) / eqR;
  const wEm = sum((r) => r.p.equityCommit * r.p.equityMultiple) / eqR;
  const wIrrU = sum((r) => r.p.uses.total * r.p.irrUnlevered) / sum((r) => r.p.uses.total);
  const atRisk = sum((r) => r.p.atRiskPreEntitlement, rows);

  const W = 760, H = 220, pl = 58, pr = 12, pt = 12, pb = 30;
  const max = cumE[months - 1] + cumL[months - 1];
  const x = (m: number) => pl + (m / (months - 1)) * (W - pl - pr);
  const y = (v: number) => pt + (1 - v / max) * (H - pt - pb);
  const line = (arr: number[], add?: number[]) => arr.map((v, m) => `${m ? "L" : "M"}${x(m).toFixed(1)},${y(v + (add ? add[m] : 0)).toFixed(1)}`).join(" ");
  const eqArea = `${line(cumE)} L${x(months - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const loanArea = `${line(cumL, cumE)} ${cumE.map((v, m) => `L${x(months - 1 - m).toFixed(1)},${y(cumE[months - 1 - m]).toFixed(1)}`).join(" ")} Z`;
  const years = Array.from({ length: Math.ceil(months / 12) + 1 }, (_, k) => k * 12).filter((m) => m < months);

  return (
    <div className="grid" style={{ gap: 18, gridTemplateColumns: "minmax(0, 1fr)" }}>
      <div className="grid g4">
        <div className="card kpi"><div className="label">Shortlist capitalization</div><div className="v">{usdM(sum((r) => r.p.uses.total, rows), 0)}</div><div className="s">{usdM(sum((r) => r.p.uses.total), 0)} rental · {usdM(sum((r) => r.p.uses.total, rows) - sum((r) => r.p.uses.total), 0)} entrance-fee campus</div></div>
        <div className="card kpi"><div className="label">Equity required · all {rows.length} sites</div><div className="v">{usdM(peakEquity, 0)}</div><div className="s">Fully drawn by month {cumE.findIndex((v) => v >= peakEquity - 1)} with one closing per quarter</div></div>
        <div className="card kpi"><div className="label">At risk before entitlement</div><div className="v">{usdM(atRisk, 1)}</div><div className="s">{pct(atRisk / peakEquity, 1)} of equity, spread over {rows.length} sites</div></div>
        <div className="card kpi"><div className="label">Rental portfolio returns</div><div className="v">{pct(wIrrL, 1)}</div><div className="s">Levered IRR, equity-weighted · {mult(wEm)} multiple · {pct(wIrrU, 1)} unlevered</div></div>
      </div>
      <div className="grid g-side">
        <div className="card card-pad">
          <div className="label" style={{ marginBottom: 8 }}>Cumulative portfolio capital drawn · one closing per quarter in rank order</div>
          <svg viewBox={`0 0 ${W} ${H}`} className="svg-chart" role="img" aria-label="Cumulative portfolio equity and loan draws by month" style={{ width: "100%", height: "auto" }}>
            {[0, 0.25, 0.5, 0.75, 1].map((f) => (
              <g key={f}><line x1={pl} x2={W - pr} y1={y(f * max)} y2={y(f * max)} stroke="#e6e6e6" /><text x={pl - 6} y={y(f * max) + 4} textAnchor="end" fontSize="10.5" fill="#6f7779">{usdM(f * max, 0)}</text></g>
            ))}
            {years.map((m) => <text key={m} x={x(m)} y={H - 10} textAnchor="middle" fontSize="10.5" fill="#6f7779">Yr {m / 12}</text>)}
            <path d={loanArea} fill="#403393" opacity="0.85" />
            <path d={eqArea} fill="#F7901E" opacity="0.9" />
          </svg>
          <div className="xs muted" style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 6 }}>
            <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#F7901E", marginRight: 6 }} />Equity</span>
            <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#403393", marginRight: 6 }} />Senior construction loans</span>
          </div>
        </div>
        <div className="card card-pad">
          <h3>How capital is allocated</h3>
          <ul className="list-clean small">
            <li><b>Pursuit capital only until approvals.</b> Each site gets its land deposit and design money; no further equity until the site plan or special permit is in hand.</li>
            <li><b>Pursue sites first.</b> PILOT sites close only with a signed PILOT term sheet; entrance-fee campuses only with a nonprofit sponsor and 70% presales.</li>
            <li><b>Land discipline.</b> No LOI above the site&apos;s max land at a {pct(a.hurdle_yoc, 1)} yield on cost.</li>
            <li><b>Pacing.</b> One closing per quarter keeps the equity call even and lets each construction loan stand on its own, with no cross-collateral.</li>
            <li><b>Reporting.</b> Quarterly investor report and annual audit at portfolio and site level.</li>
          </ul>
        </div>
      </div>
      <div className="card"><div className="table-wrap"><table className="t">
        <thead><tr><th>Site</th><th>Structure</th><th className="num">Site control</th><th className="num">Stabilized</th><th className="num">Equity</th><th className="num">Loan</th><th className="num">At risk pre-approval</th><th className="num">Unlevered IRR</th><th className="num">Levered IRR</th><th className="num">Multiple</th><th>Model</th></tr></thead>
        <tbody>{rows.map(({ s, i, p }) => {
          const ef = p.struct === "Entrance fee";
          return (
            <tr key={s.id}>
              <td style={{ minWidth: 200 }}><a href={`/sites/${s.id}#capital`} className="site-name">{s.name}</a><div className="xs muted">{s.municipality}, {s.state}</div></td>
              <td>{p.struct}</td><td className="num">Q{i + 1}</td><td className="num">Q{i + 1 + Math.round(p.N / 3)}</td>
              <td className="num">{usdM(p.equityCommit)}</td><td className="num">{usdM(p.loanCommit)}</td><td className="num">{usdM(p.atRiskPreEntitlement, 2)}</td>
              <td className="num">{ef ? <span className="muted">n/m</span> : pct(p.irrUnlevered, 1)}</td>
              <td className="num" style={{ fontWeight: 700 }}>{ef ? <span className="muted">n/m</span> : pct(p.irrLevered, 1)}</td>
              <td className="num">{ef ? <span className="muted">n/m</span> : mult(p.equityMultiple)}</td>
              <td><a href={`/models/ATCO-${s.id}-proforma.xlsx`} download>.xlsx</a></td>
            </tr>
          );
        })}</tbody>
      </table></div></div>
      <div className="xs muted">IRRs assume sale at stabilization at a {pct(a.exit_cap)} cap on NOI trended 3% a year from today, less 2% sale costs; equity funds before the {pct(a.debt.ltc, 0)} LTC construction loan. Entrance-fee campus excluded from the rental return figures.</div>
    </div>
  );
}
