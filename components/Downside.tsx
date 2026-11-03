import { scenarios, SHOCKS } from "@/lib/scenarios";
import { pct, usdM, mult } from "@/lib/format";

/** Base vs. downside table for IC: each shock alone, then combined. */
export default function Downside({ site, markets, a }: { site: any; markets: any[]; a: any }) {
  const rows = scenarios(site, markets, a);
  if (!rows) return (
    <div className="card card-pad small muted">Downside cases are run on rental structures. This campus is judged on entrance-fee coverage and presales; see the entrance-fee case above.</div>
  );
  const b = rows[0], all = rows[rows.length - 1];
  const holds = all.yoc >= a.hurdle_yoc;
  const bps = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(Math.round(v * 10000))}`;
  return (
    <div className="card downside">
      <div className="card-pad" style={{ paddingBottom: 6 }}>
        <div className="label">Downside cases · {site.municipality}</div>
        <p className="small" style={{ margin: "6px 0 0" }}>
          Combined downside (rents −{Math.round(-SHOCKS.rent * 100)}%, hard costs +{Math.round(SHOCKS.hard * 100)}%, exit cap +{SHOCKS.exitBps} bps, lease-up +{SHOCKS.leaseupMonths} months):
          {" "}<b>{pct(all.yoc)} YOC and {pct(all.irrL, 1)} levered IRR</b>, {holds ? "still above" : "below"} the {pct(a.hurdle_yoc, 1)} floor{all.profit < 0 ? <>, with a <b>{usdM(-all.profit, 1)} loss</b> on a sale at stabilization</> : <>, with {usdM(all.profit, 1)} profit at stabilization</>}.
        </p>
      </div>
      <div className="table-wrap"><table className="t">
        <thead><tr><th>Case</th><th className="num">YOC</th><th className="num">Δ YOC (bps)</th><th className="num">Unlevered IRR</th><th className="num">Levered IRR</th><th className="num">Multiple</th><th className="num">Profit</th><th className="num">Equity</th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.key} className={r.key === "base" ? "row-base" : r.key === "all" ? "row-down" : undefined}>
            <td>{r.label}</td>
            <td className="num" style={{ fontWeight: 700, color: r.yoc < a.hurdle_yoc ? "#8a1a2a" : undefined }}>{pct(r.yoc)}</td>
            <td className="num">{r.key === "base" ? "—" : bps(r.yoc - b.yoc)}</td>
            <td className="num">{pct(r.irrU, 1)}</td>
            <td className="num">{Number.isFinite(r.irrL) ? pct(r.irrL, 1) : "n/m"}</td>
            <td className="num">{mult(r.em)}</td>
            <td className="num">{usdM(r.profit, 1)}</td>
            <td className="num">{usdM(r.equity, 1)}</td>
          </tr>))}</tbody>
      </table></div>
      <div className="xs muted card-pad" style={{ paddingTop: 8 }}>Each shock re-runs the full pro forma and capital plan: lower rents cut NOI and the lease-up reserve; higher hard costs carry through soft costs, contingency and interest; a longer lease-up adds reserve and pushes the sale out. Exit cap moves value only.</div>
    </div>
  );
}
