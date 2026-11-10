import type { Metadata } from "next";
import ops from "@/data/operators.json";
import { siteById, isShortlist, onHold } from "@/lib/data";
import { longDate } from "@/lib/format";
import { allGCs } from "@/lib/contractors";
import gcData from "@/data/contractors.json";

export const metadata: Metadata = { title: "Operator partners", description: "Which senior living operators and nonprofit sponsors ATCO should build with, site by site, with the deal structure for each." };

export default function Operators() {
  // only sites still on the shortlist, in rank order (a site that drops to Watch or Pass leaves this table)
  const fit = (Object.entries(ops.fit) as [string, (typeof ops.fit)[keyof typeof ops.fit]][])
    .filter(([id]) => { const s = siteById(id); return !!s && isShortlist(s); })
    .sort(([a], [b]) => (siteById(a)?.rank ?? 99) - (siteById(b)?.rank ?? 99));
  const words = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  return (
    <>
      <section className="hero"><div className="wrap">
        <div className="eyebrow">Operator partners</div>
        <h1>Who ATCO should build with</h1>
        <p className="lede">{ops.bottomLine}</p>
        <div className="hero-meta">Updated {longDate(ops.updated)} · {ops.partners.length} lead partners · {ops.bench.length} on the bench · {ops.sponsors.length} nonprofit sponsors</div>
      </div></section>

      <section className="section"><div className="wrap">
        <div className="section-head"><div><h2 className="rule-title">Lead partners</h2><p>Ranked on footprint in our drive band, a current development program in our product, and the capital behind them.</p></div></div>
        <div className="grid g2">
          {ops.partners.map((p) => (
            <div key={p.name} className="card card-pad op-card">
              <div className="op-rank">{p.rank}</div>
              <h3 style={{ marginTop: 0 }}>{p.name}</h3>
              <div className="small" style={{ color: "var(--atco-purple)", fontWeight: 600, marginBottom: 10 }}>{p.role}</div>
              <table className="kv small"><tbody>
                <tr><td>Footprint</td><td>{p.footprint}</td></tr>
                <tr><td>Product</td><td>{p.product}</td></tr>
                <tr><td>Structure</td><td>{p.structure}</td></tr>
                <tr><td>Signal</td><td>{p.signal}</td></tr>
              </tbody></table>
              <div className="op-sites">
                {p.sites.map((id) => {
                  const s = siteById(id);
                  if (!s) return null;
                  const off = !isShortlist(s);
                  return <a key={id} href={`/sites/${id}${off ? "" : "#operators"}`} className={`tag${off ? " tag-off" : ""}`} title={off ? `No longer on the shortlist (${s.verdict})` : onHold(s) ? "On hold" : undefined}>{id} · {s.municipality}{off ? ` · ${s.verdict}` : onHold(s) ? " · on hold" : ""}</a>;
                })}
              </div>
              <div className="xs muted" style={{ marginTop: 10 }}>{p.src.map(([l, u], i) => <span key={u}>{i ? " · " : "Sources: "}<a href={u} target="_blank" rel="noreferrer">{l}</a></span>)}</div>
            </div>
          ))}
        </div>
      </div></section>

      <section className="section" style={{ paddingTop: 0 }}><div className="wrap">
        <div className="section-head"><div><h2 className="rule-title">Fit by shortlist site</h2><p>First and second call for each of the {words[fit.length] ?? fit.length} shortlist sites, and what could change the deal.</p></div></div>
        <div className="card"><div className="table-wrap"><table className="t">
          <thead><tr><th>Site</th><th>First call</th><th className="hide-sm">Second call</th><th>Why</th><th>Watch</th></tr></thead>
          <tbody>{fit.map(([id, f]) => { const s = siteById(id); return (
            <tr key={id}>
              <td style={{ minWidth: 140 }}><a href={`/sites/${id}#operators`}><b>{s?.municipality}</b></a><div className="xs muted">{id}</div></td>
              <td style={{ minWidth: 150 }}><b>{f.first}</b></td>
              <td className="hide-sm" style={{ minWidth: 140 }}>{f.second}</td>
              <td className="small" style={{ minWidth: 200 }}>{f.why}</td>
              <td className="small" style={{ minWidth: 220 }}>{f.watch}</td>
            </tr>); })}</tbody>
        </table></div></div>
      </div></section>

      <section className="section" style={{ paddingTop: 0 }}><div className="wrap">
        <div className="grid g2">
          <div className="card card-pad"><h3>On the bench</h3>
            <ul className="list-clean small">{ops.bench.map((b) => <li key={b.name}><b>{b.url ? <a href={b.url} target="_blank" rel="noreferrer">{b.name}</a> : b.name}.</b> {b.note}</li>)}</ul></div>
          <div className="card card-pad"><h3>Nonprofit sponsors</h3>
            <p className="xs muted" style={{ marginTop: -6 }}>For entrance-fee or tax-exempt deals, where a 501(c)(3) borrower is required.</p>
            <ul className="list-clean small">{ops.sponsors.map((b) => <li key={b.name}><b>{b.name}.</b> {b.note}</li>)}</ul></div>
        </div>
      </div></section>

      <section className="section" style={{ paddingTop: 0 }}><div className="wrap">
        <div className="section-head"><div><h2 className="rule-title">Deal structures to offer</h2><p>Where ATCO&apos;s money is made in each form.</p></div></div>
        <div className="card"><div className="table-wrap"><table className="t">
          <thead><tr><th>Structure</th><th>Who uses it</th><th>ATCO economics</th><th className="hide-sm">When to use</th></tr></thead>
          <tbody>{ops.structures.map((x) => <tr key={x.t}><td style={{ minWidth: 170 }}><b>{x.t}</b></td><td className="small" style={{ minWidth: 150 }}>{x.who}</td><td className="small" style={{ minWidth: 200 }}>{x.econ}</td><td className="small hide-sm">{x.when}</td></tr>)}</tbody>
        </table></div></div>
        <div className="card card-pad" style={{ marginTop: 18 }}>
          <h3>Next calls, in order</h3>
          <ol className="small" style={{ paddingLeft: 18, margin: 0 }}>{ops.next.map((x) => <li key={x} style={{ marginBottom: 6 }}>{x}</li>)}</ol>
        </div>
        <div className="section-head" style={{ marginTop: 36 }}><div><h2 className="rule-title" id="contractors">General contractors</h2><p>Builders with recent senior living work in the drive band. Each site page names its pick and ATCO&apos;s construction role.</p></div></div>
        <div className="card"><div className="table-wrap"><table className="t">
          <thead><tr><th>Contractor</th><th>Comparable senior living projects</th></tr></thead>
          <tbody>{allGCs().map((g) => <tr key={g.key}><td style={{ minWidth: 170 }}><b>{g.name}</b><div className="xs muted">{g.role} · {g.hq}</div></td><td className="small">{g.projects.map((c, i) => <span key={c.p}>{i ? " · " : ""}<a href={c.url} target="_blank" rel="noreferrer">{c.p}</a> ({c.where})</span>)}</td></tr>)}</tbody>
        </table></div></div>
        <p className="xs muted" style={{ marginTop: 10 }}>{gcData.note}</p>
        <p className="xs muted" style={{ marginTop: 12 }}>Facts are sourced; items marked inferred are ATCO&apos;s judgment and need a call to confirm. Full research: research/operator-partners.md.</p>
      </div></section>
    </>
  );
}
