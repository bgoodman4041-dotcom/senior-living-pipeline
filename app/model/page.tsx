import type { Metadata } from "next";
import { assumptions as a, regulatory, comps, STATE_NAME } from "@/lib/data";
import { readDoc, parseTable, Inline } from "@/lib/md";
import { int } from "@/lib/format";

export const metadata: Metadata = { title: "The Model", description: "What RiverSpring Living's Riverdale campus teaches, what a developer can carry to suburban sites, the prototypes, the regulatory matrix and the underwriting assumptions." };

const S = {
  ziegler: ["Ziegler, Feb 2026", "https://www.ziegler.com/media/n2apxp4y/ziegler-press-release_riversedge_final_022726.pdf"] as [string, string],
  nyp: ["NewYork-Presbyterian, Oct 2025", "https://www.nyp.org/news/riverspring-living-opens-state-of-the-art-hauser-rehabilitation-center-in-collaboration-with-nyp"] as [string, string],
  buildnyc: ["Build NYC, Jan 2025", "https://edc.nyc/sites/default/files/2025-01/River's%20Edge%20PHP_Redacted.pdf"] as [string, string],
  weinberg: ["Milbank Memorial Fund", "https://www.milbank.org/publications/an-elder-abuse-shelter-model-for-integrated-health-systems-and-beyond-the-harry-and-jeanette-weinberg-center-for-elder-justice/"] as [string, string],
  ny2019: ["NY DOH disclosure statement, 2019", "https://WWW.HEALTH.NY.GOV/facilities/long_term_care/retirement_communities/continuing_care/docs/2019-08-14_disclosure_statement.pdf"] as [string, string],
  site: ["riverspringliving.org", "https://www.riverspringliving.org/"] as [string, string],
};
const RS: [string, string, [string, string][]][] = [
  ["A full continuum on one campus", "Independent living, assisted living and memory care, short-term rehabilitation, the Hebrew Home's nursing care, home care and hospice, so residents can move between levels of care without leaving the community.", [S.site, S.ny2019]],
  ["New York City's first life plan community", "River's Edge: 260 independent living apartments financed with about $633M in February 2026, with more than 85% of the apartments reserved at financing. It shows deep demand for entrance-fee living in the region.", [S.ziegler]],
  ["Land as a long-term asset", "River's Edge is built on about 3 acres of the campus under a long-term ground lease to an affiliate, so land held for decades supports the next generation of housing.", [S.buildnyc]],
  ["Partnership with a hospital system", "The 79-bed Hauser Rehabilitation Center opened in 2025 with NewYork-Presbyterian clinicians on campus five days a week.", [S.nyp]],
  ["Care contracted, not duplicated", "River's Edge owns no nursing beds; residents have priority access to assisted living, memory care and nursing care on the campus by contract.", [S.ny2019]],
  ["Mission beyond housing", "The Harry and Jeanette Weinberg Center for Elder Justice, founded in 2005, was the first regional elder-abuse shelter based in a long-term care setting.", [S.weinberg]],
];
const LEVERS: string[][] = [
  ["Continuum of care", "Every level of care on one campus", "AL and memory care pads inside approved age-restricted communities (Florham Park, Montville)", "ATCO builds; operator runs care"],
  ["Land", "Long-owned land, ground-leased for new housing", "Pads inside approved master plans, bought and owned fee simple for the long term", "ATCO, with landowners"],
  ["Ownership and tax status", "Nonprofit ownership and tax-exempt bonds", "Entrance-fee campuses (Rye Brook, Trumbull) owned by a nonprofit sponsor; ATCO as fee developer", "Nonprofit partner"],
  ["Entrance fees", "Refundable entrance fees fund River's Edge", "Modeled on both campuses; fees must cover at least 70% of IL cost", "Nonprofit sponsor and manager"],
  ["Nursing care", "Existing licensed beds back the life-care promise", "New nursing beds are effectively unavailable in all three states; care by contract with an existing provider", "Operator or partner"],
  ["Clinical partnership", "Hauser Rehabilitation with NewYork-Presbyterian", "A clinical and referral partner named in each operator agreement", "Operator and partner"],
  ["Philanthropy and mission programs", "Foundation support, elder justice, research", "Not modeled; a partner's to bring", "Nonprofit partner"],
];

export default function Model() {
  const asm = parseTable(readDoc("model/ASSUMPTIONS.md")).slice(1);
  const protos = Object.entries<any>(a.prototypes);
  return (
    <>
      <section className="hero"><div className="wrap">
        <div className="eyebrow">The Model</div>
        <h1>Learning from RiverSpring Living</h1>
        <p className="lede">Founded in Harlem in 1917 as the Hebrew Home, RiverSpring Living today brings housing, assisted living, memory care, rehabilitation and nursing care together on a 32-acre campus on the Hudson in Riverdale. This page sets out what that model teaches a developer, what we can carry to suburban sites, and what belongs with a mission-driven partner.</p>
        <p className="hero-note">ATCO is not affiliated with RiverSpring Living. Everything here comes from public sources, cited below.</p>
      </div></section>

      <section className="section"><div className="wrap">
        <div className="section-head"><div><h2 className="rule-title">What the Riverdale campus shows</h2></div></div>
        <div className="grid g2">
          {RS.map(([t, d, src], i) => (
            <div key={t} className="card card-pad" style={{ display: "flex", gap: 14 }}>
              <span style={{ fontFamily: "var(--sans)", fontSize: 28, color: "var(--atco-purple)", fontWeight: 300, lineHeight: 1 }}>{i + 1}</span>
              <div><h3 style={{ fontSize: 15, letterSpacing: ".05em", marginBottom: 6 }}>{t}</h3><p className="small" style={{ margin: 0, color: "var(--ink-2)" }}>{d}</p>
                <div className="xs muted" style={{ marginTop: 6 }}>{src.map(([l, u], k) => <span key={u}>{k ? "; " : ""}<a href={u} target="_blank" rel="noopener">{l}</a></span>)}</div></div>
            </div>
          ))}
        </div>
      </div></section>

      <section className="section"><div className="wrap">
        <div className="section-head"><div><h2 className="rule-title">What travels to a suburban site, and who carries it</h2><p>A developer can bring the real-estate layer. Care, licensing, tax-exempt ownership and philanthropy belong with a mission-driven partner.</p></div></div>
        <div className="card"><div className="table-wrap"><table className="t">
          <thead><tr><th>Element</th><th>At RiverSpring</th><th>In this pipeline</th><th>Who carries it</th></tr></thead>
          <tbody>{LEVERS.map((r) => <tr key={r[0]}><td style={{ minWidth: 150 }}><b>{r[0]}</b></td><td className="small">{r[1]}</td><td className="small">{r[2]}</td><td className="small">{r[3]}</td></tr>)}</tbody>
        </table></div></div>
        <div className="callout" style={{ marginTop: 16 }}><b>Bottom line.</b> Assisted living and memory care pads clear the floor as rentals in the strongest submarket. Independent-living campuses work as life plan communities only when a nonprofit owns them, which is where a partner like RiverSpring changes the outcome. See <a href="/#partner">where a partner fits</a>.</div>
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
