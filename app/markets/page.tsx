import type { Metadata } from "next";
import { markets, sites, isShortlist, STATE_NAME } from "@/lib/data";
import { I } from "@/components/ui";
import { usd, usdK, int } from "@/lib/format";
import { readDoc, section, parseTable, Inline, bullets } from "@/lib/md";

export const metadata: Metadata = { title: "Markets", description: "County demand, rent and cost indices behind the underwriting, and the top 12 senior living submarkets." };

export default function Markets() {
  const md = readDoc("research/market-demand.md");
  const top = parseTable(section(md, "8. Top 12")).slice(1);
  const watch = bullets(section(md, "8. Top 12").split("**Watch list**")[1]?.split("**Avoid")[0] || "");
  const macro = parseTable(section(md, "1. Macro")).slice(1, 8);
  const rows = [...markets].sort((a, b) => a.state.localeCompare(b.state) || Number(b.pop75) - Number(a.pop75));
  const maxPop = Math.max(...markets.map((m) => Number(m.pop75) || 0));
  const maxInc = Math.max(...markets.map((m) => Number(m.med_hh_inc_65plus) || 0));
  const cnt = (m: any, f = (_: any) => true) => sites.filter((s) => s.state === m.state && s.county === m.county && f(s)).length;
  return (
    <>
      <section className="hero"><div className="wrap">
        <div className="eyebrow">Markets</div>
        <h1>Where the rents and the need already exist</h1>
        <p className="lede">The county table drives every pro forma: demographics are verified Census figures; rent, cost, tax, land and unmet-demand indices are calibrated estimates to be replaced with NIC MAP and assessor data before LOI.</p>
      </div></section>

      <section className="section"><div className="wrap">
        <div className="section-head"><div><h2 className="rule-title">Demand backdrop</h2><p>Occupancy at a cycle high, the construction pipeline near a 14-year low.</p></div></div>
        <div className="card"><div className="table-wrap"><table className="t">
          <thead><tr><th>Metric</th><th>Value</th><th>Period</th><th className="hide-sm">Source</th></tr></thead>
          <tbody>{macro.map((r) => <tr key={r[0]}><td><Inline text={r[0]} /></td><td style={{ minWidth: 160 }}><Inline text={r[1]} /></td><td>{r[2]}</td><td className="xs hide-sm" style={{ wordBreak: "break-all" }}><Inline text={r[3] || ""} /></td></tr>)}</tbody>
        </table></div></div>
      </div></section>

      <section className="section"><div className="wrap">
        <div className="section-head"><div><h2 className="rule-title">County screen</h2><p>{markets.length} counties in the drive band. Bars scale to the largest county in the set.</p></div></div>
        <div className="card"><div className="table-wrap"><table className="t">
          <thead><tr>
            <th>County</th><th className="num">Pipeline</th><th style={{ minWidth: 150 }}>Pop. 75+</th><th style={{ minWidth: 150 }}>HH income 65+</th><th className="num">Home value</th>
            <th className="num">Rent idx <I /></th><th className="num">Cost idx <I /></th><th className="num">Tax / unit <I /></th><th className="num">Land / unit <I /></th><th className="num">Unmet ratio <I /></th>
          </tr></thead>
          <tbody>{rows.map((m) => (
            <tr key={m.state + m.county}>
              <td><b>{m.county}</b><div className="xs muted">{STATE_NAME[m.state]}</div></td>
              <td className="num">{cnt(m)}{cnt(m, isShortlist) ? <div className="xs" style={{ color: "var(--brass)", fontWeight: 600 }}>{cnt(m, isShortlist)} shortlist</div> : null}</td>
              <td><div style={{ display: "flex", gap: 8, alignItems: "center" }}><span className="tnum" style={{ width: 62 }}>{int(m.pop75)}</span><div className="bar-track" style={{ flex: 1 }}><div className="bar-fill" style={{ width: `${(Number(m.pop75) / maxPop) * 100}%` }} /></div></div></td>
              <td><div style={{ display: "flex", gap: 8, alignItems: "center" }}><span className="tnum" style={{ width: 62 }}>{usdK(Number(m.med_hh_inc_65plus))}</span><div className="bar-track" style={{ flex: 1 }}><div className="bar-fill" style={{ width: `${(Number(m.med_hh_inc_65plus) / maxInc) * 100}%`, background: "var(--brass)" }} /></div></div></td>
              <td className="num">{usd(Number(m.med_home_value))}</td>
              <td className="num">{Number(m.rent_index).toFixed(2)}</td><td className="num">{Number(m.cost_index).toFixed(2)}</td>
              <td className="num">{usd(Number(m.tax_per_unit))}</td><td className="num">{usd(Number(m.land_per_unit))}</td><td className="num">{m.unmet_demand_ratio}</td>
            </tr>
          ))}</tbody>
        </table></div></div>
        <p className="xs muted" style={{ marginTop: 10 }}>{markets[0]?.basis}</p>
      </div></section>

      <section className="section"><div className="wrap">
        <div className="section-head"><div><h2 className="rule-title">Top 12 submarkets</h2><p>Ranked on rent support (65+ income and home equity), a demonstrated $8,500–12,500 rent ceiling, 75+ depth, supply gap, and drive time and entitlement path.</p></div></div>
        <div className="grid g3">
          {top.map((r) => (
            <div key={r[0]} className="card card-pad">
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ fontFamily: "var(--serif)", fontWeight: 600, fontSize: 22, color: "var(--brass)", lineHeight: 1 }}>{r[0]}</span>
                <h3 style={{ fontSize: 16 }}><Inline text={r[1].replace(/\*\*/g, "")} /></h3>
              </div>
              <p className="small" style={{ color: "var(--ink-2)", marginTop: 10, marginBottom: 0 }}><Inline text={r[2]} /></p>
            </div>
          ))}
        </div>
        {watch.length > 0 && (
          <div className="card card-pad" style={{ marginTop: 18 }}>
            <h3>Watch list</h3>
            <ul className="list-clean small">{watch.map((w) => <li key={w}><Inline text={w} /></li>)}</ul>
          </div>
        )}
      </div></section>
    </>
  );
}
