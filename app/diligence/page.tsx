import type { Metadata } from "next";
import ev from "@/data/lp-evidence.json";
import icFlags from "@/data/ic-flags.json";
import RentComps from "@/components/RentComps";
import { shortlist, markets, assumptions, sites, onHold } from "@/lib/data";
import { capitalPlan } from "@/lib/capital";
import { structuring, recLabel } from "@/lib/structuring";
import { waterfall, WF } from "@/lib/waterfall";
import { pct, usdM, mult, int } from "@/lib/format";

export const metadata: Metadata = { title: "LP diligence", description: "The questions an institutional LP will ask, the public evidence behind each answer, and what still needs ATCO's action." };

type Ctl = { owner: string; status: string; path: string; assessed?: string; src: [string, string][] };
type Rdv = { status: string; text: string; src: [string, string][] };

const Src = ({ s }: { s: [string, string][] }) => <>{s.map((x, i) => <span key={x[1]}>{i ? "; " : ""}<a href={x[1]} target="_blank" rel="noopener">{x[0]}</a></span>)}</>;

export default function Diligence() {
  const control = ev.control as unknown as Record<string, Ctl>;
  const rdv = ev.redevelopment as unknown as Record<string, Rdv>;
  const flags = icFlags as Record<string, { label: string }>;
  const rentIds = Object.keys(ev.rents).filter((k) => !k.startsWith("_"));
  const cush = shortlist.map((s) => {
    const r = structuring(s, markets, assumptions);
    const p = capitalPlan(s, assumptions);
    const w = p.struct === "Entrance fee" ? null : waterfall(p.levCF);
    if (!r) return { s, r: null, p, w, best: null };
    const best = r.opts.filter((o) => o.available && o.key !== "fee").sort((a, b) => b.down.profit - a.down.profit)[0];
    return { s, r, p, w, best };
  });
  const score: [string, "Closed" | "Partly closed" | "Needs Ben", string, string][] = [
    ["Are the rents real?", "Partly closed", "Public comp set for every shortlist market. Florham Park, Whippany and Montville are inside the Class A range; Cortlandt and Trumbull were cut to the Class A median; Poughkeepsie was cut 14% and dropped to Pass.", "#rents"],
    ["Is the cost realistic?", "Partly closed", "Six public NJ/NY cost comps. Comps show about 969 SF a unit (Benchmark East Brunswick, the Cortlandt site plan); the model was raised from 828 to about 900 SF a unit on the AL/MC mix (AL 950, MC 800), adding about 7% to all-in cost. A Florham Park GC budget is ready to price.", "#costs"],
    ["Do you control the land?", "Needs Ben", "Owner of record, deal status and a control path for each site. No site is under LOI or option yet.", "#control"],
    ["Is the NJ PILOT real?", "Partly closed", "Florham Park is designated (Res. 20-94). Whippany's approval is for a non-senior plan. Nothing found for Montville.", "#redevelopment"],
    ["What if it goes wrong?", "Closed", "Every site carries each shock alone and combined, plus the structure that keeps it at breakeven and how much cushion is left.", "#cushion"],
    ["What do LPs actually net?", "Partly closed", `Illustrative waterfall: ${pct(WF.pref, 0)} preferred return, then ${Math.round(WF.lpSplit * 100)}/${Math.round((1 - WF.lpSplit) * 100)}. Ben to set final terms.`, "#waterfall"],
    ["Who operates it?", "Needs Ben", "Lead operator per site, with draft outreach letters and term-sheet outlines (internal). None signed.", "#operators"],
    ["Is there a pipeline behind Florham Park?", "Partly closed", "Every other site re-run on the tougher assumptions: none clears with acceptable approval odds. Two new Morris and Somerset pads with approvals in hand (Woodmont Parsippany, Peapack) are partner targets.", "#pipeline"],
    ["Is there a market study?", "Needs Ben", "Absorption is modeled from ACS data and state licensing lists. A NIC MAP pull or third-party study is the remaining gap.", "#gaps"],
  ];
  const tone = { "Closed": "go", "Partly closed": "warn", "Needs Ben": "bad" } as const;
  return (
    <section className="section">
      <div className="wrap">
        <div className="section-head"><div>
          <div className="eyebrow">LP diligence</div><h2>The questions an LP will ask, answered with evidence</h2>
          <p>Each answer cites public sources pulled {ev.as_of}. Where the evidence disagreed with the model, the model changed. The items marked for Ben need ATCO action rather than more research.</p>
        </div></div>

        <div className="card" style={{ marginBottom: 18 }}><div className="table-wrap"><table className="t">
          <thead><tr><th>LP question</th><th>Status</th><th>What we did</th></tr></thead>
          <tbody>{score.map(([q, st, t, h]) => (
            <tr key={q}><td style={{ minWidth: 170 }}><a href={h}><b>{q}</b></a></td><td><span className={`ic-chip ic-${tone[st]}`}>{st}</span></td><td className="small">{t}</td></tr>))}</tbody>
        </table></div></div>

        <h3 id="rents" className="anchor">1 · Rents</h3>
        <div className="grid" style={{ gap: 18, gridTemplateColumns: "minmax(0, 1fr)", marginBottom: 24 }}>
          {rentIds.filter((k) => !(ev.rents as Record<string, { same_as?: string }>)[k].same_as).map((k) => (
            <div key={k}><div className="small" style={{ marginBottom: 6 }}><b>{sites.find((x) => x.id === k)?.municipality}</b> ({k}){k === "NJ-04" ? ", also the comp set for Whippany and Montville" : ""}</div><RentComps id={k} /></div>))}
        </div>

        <h3 id="costs" className="anchor">2 · Construction cost</h3>
        <div className="card" style={{ marginBottom: 12 }}><div className="table-wrap"><table className="t">
          <thead><tr><th>Project</th><th>Program</th><th>Public figure</th><th className="num">$ / unit</th><th className="num">SF / unit</th><th>Source</th></tr></thead>
          <tbody>{(ev.costs.comps as (string | number | null)[][]).map((c) => (
            <tr key={String(c[0])}><td>{c[0]}</td><td className="small">{c[1]}</td><td className="small">{c[2]}</td><td className="num">{c[3] ? `$${int(Math.round(Number(c[3]) / 1000))}K` : "—"}</td><td className="num">{c[4] ?? "—"}</td><td className="xs"><a href={String(c[6])} target="_blank" rel="noopener">{c[5]}</a></td></tr>))}
            {shortlist.filter((s) => s.uw.prototype?.startsWith("C")).slice(0, 1).map((s) => (
              <tr key="model" className="row-base"><td><b>ATCO model, 114-unit AL/MC pad</b></td><td className="small">78 AL / 36 MC</td><td className="small">All-in incl. land, reserves</td><td className="num"><b>${int(Math.round(s.uw.total_cost / s.uw.units / 1000))}K</b></td><td className="num"><b>{Math.round(s.uw.gsf / s.uw.units)}</b></td><td className="xs">This site</td></tr>))}
          </tbody>
        </table></div></div>
        <p className="small">{ev.costs.verdict} Hard-cost benchmarks: {ev.costs.psf.map((p) => `${p[0]} ${p[1]} (${p[2]})`).join("; ")} (<a href={ev.costs.psf_src} target="_blank" rel="noopener">Senior Housing News</a>).</p>
        <p className="small" style={{ marginBottom: 24 }}><a className="btn" href="/models/ATCO-NJ-04-GC-budget.xlsx" download>Florham Park GC budget outline (.xlsx)</a> CSI-division budget from the model, with blank columns for a GC to price.</p>

        <h3 id="control" className="anchor">3 · Site control</h3>
        <div className="card" style={{ marginBottom: 24 }}><div className="table-wrap"><table className="t">
          <thead><tr><th>Site</th><th>Owner of record</th><th>Status</th><th>Recommended control path</th></tr></thead>
          <tbody>{Object.entries(control).map(([id, c]) => { const s = sites.find((x) => x.id === id)!; return (
            <tr key={id}><td style={{ minWidth: 130 }}><a href={`/sites/${id}`} className="site-name">{s.municipality}</a><div className="xs muted">{id}{flags[id] ? ` · ${flags[id].label}` : ""}</div></td><td className="small">{c.owner}</td><td className="small">{c.status}<div className="xs muted"><Src s={c.src} /></div></td><td className="small">{c.path}</td></tr>); })}</tbody>
        </table></div></div>

        <h3 id="redevelopment" className="anchor">4 · NJ redevelopment and PILOT status</h3>
        <div className="card" style={{ marginBottom: 24 }}><div className="table-wrap"><table className="t">
          <thead><tr><th>Site</th><th>Status</th><th>Evidence</th></tr></thead>
          <tbody>{Object.entries(rdv).map(([id, r]) => (
            <tr key={id}><td><a href={`/sites/${id}`} className="site-name">{sites.find((x) => x.id === id)?.municipality}</a></td><td><span className={`ic-chip ic-${r.status === "Designated" ? "go" : r.status === "Not found" ? "bad" : "warn"}`}>{r.status}</span></td><td className="small">{r.text}<div className="xs muted"><Src s={r.src} /></div></td></tr>))}</tbody>
        </table></div></div>

        <h3 id="cushion" className="anchor">5 · Downside cushion</h3>
        <div className="card" style={{ marginBottom: 12 }}><div className="table-wrap"><table className="t">
          <thead><tr><th>Site</th><th>Structure</th><th className="num">Downside profit</th><th className="num">Cushion, % of cost</th><th>What would raise it</th></tr></thead>
          <tbody>{cush.map(({ s, r, best, p }) => (
            <tr key={s.id}><td><a href={`/sites/${s.id}#structuring`} className="site-name">{s.municipality}</a></td>
              <td className="small">{r ? recLabel(r, onHold(s)) : "Entrance-fee campus"}</td>
              <td className="num">{r ? usdM(r.rec.atcoProfitDown, 1) : "n/m"}{r?.rec.key === "fee" && <div className="xs muted">ATCO fee</div>}</td>
              <td className="num">{r && r.rec.key !== "fee" ? pct(r.rec.down.profit / r.rec.down.total, 1) : "n/m"}</td>
              <td className="small">{!r ? `Judged on fee coverage (${Math.round(s.uw.entrance_fee.coverage * 100)}%) and presales; a nonprofit sponsor and 70% presales before construction.` : best && best.key !== r.rec.key && best.down.profit > r.rec.down.profit ? `${best.label}: ${usdM(best.down.profit, 1)} downside profit. ${best.availability || ""}` : "Already the strongest available structure; a lower land basis or a rate-shop-confirmed rent premium are the remaining levers."}</td></tr>))}</tbody>
        </table></div></div>
        <p className="small" style={{ marginBottom: 24 }}>Florham Park&apos;s cushion with a GMP alone is thin. Its redevelopment designation makes a PILOT available, which is the cheapest way to widen it.</p>

        <h3 id="waterfall" className="anchor">6 · What LPs net</h3>
        <div className="card" style={{ marginBottom: 12 }}><div className="table-wrap"><table className="t">
          <thead><tr><th>Site</th><th className="num">Project levered IRR</th><th className="num">LP net IRR</th><th className="num">LP multiple</th><th className="num">GP IRR</th><th className="num">GP promote</th></tr></thead>
          <tbody>{cush.map(({ s, p, w }) => (
            <tr key={s.id}><td><a href={`/sites/${s.id}#capital`} className="site-name">{s.municipality}</a>{onHold(s) && <span className="xs muted"> · on hold</span>}</td>
              {w ? <><td className="num">{pct(p.irrLevered, 1)}</td><td className="num"><b>{pct(w.lpIrr, 1)}</b></td><td className="num">{mult(w.lpMultiple)}</td><td className="num">{pct(w.gpIrr, 1)}</td><td className="num">{usdM(w.promote, 2)}</td></>
                : <td colSpan={5} className="small muted">Entrance-fee campus: returns depend on sponsor structure (see dossier)</td>}</tr>))}</tbody>
        </table></div></div>
        <p className="small" style={{ marginBottom: 24 }}>Illustrative terms: LP {pct(WF.lpShare, 0)} / GP {pct(1 - WF.lpShare, 0)} of equity, pari passu; {pct(WF.pref, 0)} compounding preferred return; then {Math.round(WF.lpSplit * 100)}% LP / {Math.round((1 - WF.lpSplit) * 100)}% GP. Base case, sale at stabilization. Ben sets the final terms.</p>

        <h3 id="operators" className="anchor">7 · Operators</h3>
        <p className="small" style={{ marginBottom: 24 }}>Lead operator per site is on the <a href="/operators">Operators</a> page. Draft outreach letters and term-sheet outlines for Engel Burman, Benchmark / National Development, Sunrise and LCS are prepared for Ben (internal, not published). None is signed.</p>

        <h3 id="pipeline" className="anchor">8 · What sits behind the anchor deal</h3>
        <p className="small">{ev.rescreen._note}</p>
        <div className="card" style={{ marginBottom: 12 }}><div className="table-wrap"><table className="t">
          <thead><tr><th>Watch site</th><th className="num">YOC fully taxed</th><th className="num hide-sm">With PILOT</th><th className="num hide-sm">Approval</th><th>Why it stays on Watch</th></tr></thead>
          <tbody>{(ev.rescreen.rows as (string | number)[][]).map((r) => (
            <tr key={String(r[0])}><td style={{ minWidth: 120 }}><a href={`/sites/${r[0]}`} className="site-name">{r[1]}</a><div className="xs muted">{r[0]}</div></td><td className="num">{pct(Number(r[2]))}</td><td className="num hide-sm">{pct(Number(r[3]))}</td><td className="num hide-sm">{r[4]}</td><td className="small">{r[5]}</td></tr>))}</tbody>
        </table></div></div>
        <p className="small">{ev.candidates._note}</p>
        <div className="card" style={{ marginBottom: 24 }}><div className="table-wrap"><table className="t">
          <thead><tr><th>New candidate</th><th>Program and status</th><th>Fit</th><th>ATCO&apos;s way in</th></tr></thead>
          <tbody>{(ev.candidates.rows as { name: string; place: string; program: string; status: string; fit: string; route: string; tone: string; src: [string, string][] }[]).map((c) => (
            <tr key={c.name}><td style={{ minWidth: 150 }}><b>{c.name}</b><div className="xs muted">{c.place}</div><span className={`ic-chip ic-${c.tone}`} style={{ marginTop: 4 }}>{c.tone === "go" ? "Pursue as partner" : "Comp only"}</span></td>
              <td className="small">{c.program}. {c.status}<div className="xs muted"><Src s={c.src} /></div></td><td className="small">{c.fit}</td><td className="small">{c.route}</td></tr>))}</tbody>
        </table></div></div>

        <h3 id="gaps" className="anchor">9 · Still open, and who closes it</h3>
        <div className="card card-pad"><ul className="list-clean small">
          <li><b>NIC MAP pull or third-party market study</b> for Florham Park, Montville and Cortlandt: confirms rents, occupancy and pipeline. <i>Ben: buy or commission.</i></li>
          <li><b>GC pricing</b> of the Florham Park budget by KBE or IMC: replaces the model hard cost. <i>Ben: send the budget outline.</i></li>
          <li><b>Site control:</b> LOI or option with Garden Homes (Florham Park) and Diversified (Montville). <i>Ben.</i></li>
          <li><b>PILOT conversations:</b> Florham Park redevelopment counsel, Montville administrator. <i>Ben or land-use counsel.</i></li>
          <li><b>Operator LOIs:</b> letters are drafted. <i>Ben: send.</i></li>
          <li><b>Fund terms:</b> pref, promote, fees and GP commitment. <i>Ben.</i></li>
          <li><b>Partner calls:</b> Woodmont (Parsippany approval) and Peapack Senior Living (CN in hand) as JV, equity or GC targets. <i>Ben.</i></li>
          <li><b>Track record:</b> ATCO&apos;s senior-housing or comparable ground-up history for the LP deck. <i>Ben.</i></li>
        </ul></div>
      </div>
    </section>
  );
}
