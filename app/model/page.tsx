import type { Metadata } from "next";
import { assumptions as a, regulatory, comps, STATE_NAME } from "@/lib/data";
import { readDoc, section, parseTable, Inline, numbered } from "@/lib/md";
import { int } from "@/lib/format";

export const metadata: Metadata = { title: "The Model", description: "RiverSpring Living decoded: what a for-profit developer can copy, the prototypes, the regulatory matrix and the underwriting assumptions." };

export default function Model() {
  const rs = readDoc("research/riverspring-model.md");
  const take = numbered(section(rs, "0. Executive takeaways"));
  const levers = parseTable(section(rs, "4.1 The model")).slice(1);
  const bottom = section(rs, "4.1 The model").split("**Bottom line [I]:**")[1]?.trim();
  const asm = parseTable(readDoc("model/ASSUMPTIONS.md")).slice(1);
  const protos = Object.entries<any>(a.prototypes);
  return (
    <>
      <section className="hero"><div className="wrap">
        <div className="eyebrow">The Model</div>
        <h1>RiverSpring, decoded for a developer</h1>
        <p className="lede">RiverSpring Living's 32-acre Riverdale campus pairs a nursing home, assisted living and a new entrance-fee life plan community on owned land. We copy the real-estate layer and partner for the rest.</p>
      </div></section>

      <section className="section"><div className="wrap">
        <div className="section-head"><div><h2 className="rule-title">Executive takeaways</h2></div></div>
        <div className="grid g2">
          {take.map((t, i) => (
            <div key={i} className="card card-pad" style={{ display: "flex", gap: 14 }}>
              <span style={{ fontFamily: "var(--serif)", fontSize: 26, color: "var(--atco-purple)", fontWeight: 600, lineHeight: 1 }}>{i + 1}</span>
              <p className="small" style={{ margin: 0, color: "var(--ink-2)" }}><Inline text={t} /></p>
            </div>
          ))}
        </div>
      </div></section>

      <section className="section"><div className="wrap">
        <div className="section-head"><div><h2 className="rule-title">The levers, and which ones a for-profit can pull</h2></div></div>
        <div className="card"><div className="table-wrap"><table className="t">
          <thead><tr><th>Lever</th><th>How RiverSpring uses it</th><th>Replicable by for-profit / JV?</th></tr></thead>
          <tbody>{levers.map((r) => <tr key={r[0]}><td style={{ minWidth: 170 }}><Inline text={r[0]} /></td><td className="small"><Inline text={r[1]} /></td><td className="small"><Inline text={r[2]} /></td></tr>)}</tbody>
        </table></div></div>
        {bottom && <div className="callout" style={{ marginTop: 16 }}><b>Bottom line.</b> <Inline text={bottom} /></div>}
      </div></section>

      <section className="section"><div className="wrap">
        <div className="section-head"><div><h2 className="rule-title">Two tracks, three prototypes</h2><p>Rental AL/MC infill is the track that clears the floor fully taxed. Continuum campuses need entrance fees, a nonprofit sponsor or ground-leased land.</p></div></div>
        <div className="grid g3">
          {protos.map(([k, p]) => {
            const units = Object.values<number>(p.mix).reduce((x, y) => x + y, 0);
            const gsf = Object.entries<number>(p.mix).reduce((x, [c, n]) => x + n * a.care_levels[c].gsf_per_unit, 0);
            return (
              <div key={k} className="card card-pad">
                <div className="label">Prototype {k}</div>
                <h3 style={{ marginTop: 4 }}>{p.name}</h3>
                <table className="kv"><tbody>
                  <tr><td>Units</td><td className="num">{units}</td></tr>
                  {Object.entries<number>(p.mix).filter(([, n]) => n > 0).map(([c, n]) => <tr key={c}><td>{c}</td><td className="num">{n}</td></tr>)}
                  <tr><td>Gross SF</td><td className="num">{int(gsf)}</td></tr>
                  <tr><td>Site acres (min / typical)</td><td className="num">{p.site_acres_min} / {p.site_acres_typ}</td></tr>
                </tbody></table>
              </div>
            );
          })}
        </div>
      </div></section>

      <section className="section"><div className="wrap">
        <div className="section-head"><div><h2 className="rule-title">Regulatory matrix</h2><p>Assisted living is the buildable care tier in all three states; new nursing-home beds are effectively unavailable.</p></div></div>
        <div className="card"><div className="table-wrap"><table className="t">
          <thead><tr><th>Component</th>{Object.keys(regulatory).map((s) => <th key={s}>{STATE_NAME[s]}</th>)}</tr></thead>
          <tbody>{[["rental_il", "Rental IL"], ["al_mc", "AL / MC"], ["snf", "Skilled nursing"], ["ccrc", "CCRC / life plan"], ["tax_tool", "Tax tool"]].map(([k, l]) => (
            <tr key={k}><td><b>{l}</b></td>{Object.keys(regulatory).map((s) => <td key={s} className="small">{regulatory[s][k]}</td>)}</tr>
          ))}</tbody>
        </table></div></div>
      </div></section>

      <section className="section"><div className="wrap">
        <div className="section-head"><div><h2 className="rule-title">Benchmark communities</h2></div></div>
        <div className="card"><div className="table-wrap"><table className="t">
          <thead><tr><th>Community</th><th>Location</th><th>Type</th><th className="num">Units</th><th>Pricing</th><th>Status</th></tr></thead>
          <tbody>{comps.map((c) => <tr key={c.name}><td><a href={c.url} target="_blank" rel="noreferrer" className="site-name">{c.name}</a></td><td>{c.town}</td><td>{c.type}</td><td className="num">{c.units}</td><td className="small">{c.pricing}</td><td className="small">{c.status}</td></tr>)}</tbody>
        </table></div></div>
      </div></section>

      <section className="section"><div className="wrap">
        <div className="section-head"><div><h2 className="rule-title">Underwriting assumptions</h2><p>Westchester is the 1.00 base; each market scales rents by its rent index and hard costs by its cost index.</p></div></div>
        <div className="card"><div className="table-wrap"><table className="t">
          <thead><tr><th>Input</th><th>Value</th><th>Basis</th></tr></thead>
          <tbody>{asm.map((r) => <tr key={r[0]}><td><b>{r[0]}</b></td><td className="small" style={{ minWidth: 180 }}><Inline text={r[1]} /></td><td className="small muted"><Inline text={r[2]} /></td></tr>)}</tbody>
        </table></div></div>
      </div></section>
    </>
  );
}
