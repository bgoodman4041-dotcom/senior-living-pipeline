import { notFound } from "next/navigation";
import type { Metadata } from "next";
import icFlags from "@/data/ic-flags.json";
import ops from "@/data/operators.json";
import { onHold, shortlist, siteById, markets, assumptions, meta, HURDLE } from "@/lib/data";
import { capitalPlan, CAP } from "@/lib/capital";
import { scenarios } from "@/lib/scenarios";
import { underwrite } from "@/lib/underwrite";
import { structuring, structVerdict, recLabel } from "@/lib/structuring";
import { waterfall } from "@/lib/waterfall";
import { rentEvidence } from "@/components/RentComps";
import { playbook } from "@/lib/playbook";
import { gcFor } from "@/lib/contractors";
import { absorptionFor } from "@/components/Absorption";
import { pct, usdM, mult, int, longDate } from "@/lib/format";

export function generateStaticParams() { return shortlist.map((s) => ({ id: s.id })); }
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const s = siteById((await params).id);
  return { title: s ? `IC memo · ${s.municipality}` : "IC memo", robots: { index: false } };
}

const clean = (t: unknown) => String(t ?? "").replace(/\s*\((V|I)\)\s*/g, " ").replace(/\.\s*$/, "").trim();

export default async function Memo({ params }: { params: Promise<{ id: string }> }) {
  const s = siteById((await params).id);
  if (!s || !shortlist.includes(s)) notFound();
  const u = s.uw, a = assumptions;
  const cp = capitalPlan(s, a);
  const sc = scenarios(s, markets, a);
  const pb = playbook(s, a);
  const g = gcFor(s);
  const ab = absorptionFor(s.id);
  const f = (icFlags as Record<string, { tone: string; label: string; text: string }>)[s.id];
  const fit = (ops.fit as Record<string, { first: string; second: string }>)[s.id];
  const rec = f ? f.label : "Advance to LOI";
  const mix = (u.lines as { care: string; units: number }[]).map((l) => `${l.units} ${l.care}`).join(" · ");
  const all = sc?.at(-1);
  const tw = underwrite(s, markets, a);
  const st = structuring(s, markets, a);
  const ef = cp.efCase;
  const wf = ef ? null : waterfall(cp.levCF);
  const uses = [["Land", cp.uses.land], ["Hard cost", cp.uses.hard], ["Site work", cp.uses.siteWork], ["Contingency", cp.uses.contingency], ["FF&E", cp.uses.ffe], ["Soft cost", cp.uses.soft], ["Construction interest", cp.uses.interest], ["Lease-up reserve", cp.uses.leaseup]] as [string, number][];
  const risks: [string, string][] = [
    ["Entitlement", `${pb.d.pathLabel}; approval odds ${pb.like}% (${pb.likeBand}). ${clean(s.entitlement_status)}.`],
    ["Lease-up", `${u.leaseup_months} months to stabilization at industry-norm net move-ins (2–4 a month for AL/MC, 3–6 for IL; NIC MAP). The downside case adds 6 months.`],
    ["Rents", rentEvidence(s.id) ? `${rentEvidence(s.id)!.verdict} A NIC MAP pull and a rate shop confirm before LOI.` : `Rents run at ${tw.rent_index.toFixed(2)}x the base rate card, a calibrated estimate. A NIC MAP pull and a rate shop of the competitive set come before LOI.`],
    ...(ab?.v ? [["Absorption", `${ab.v.status}. ${ab.v.text}`] as [string, string]] : []),
    ["Taxes", cp.struct === "PILOT" ? `The return depends on a PILOT (fully taxed YOC ${pct(u.yoc)}). Close only on a signed term sheet.` : `Underwritten fully taxed at $${int(Math.round(tw.tax_per_unit))} a unit; an assessor letter confirms it before LOI.`],
  ];
  return (
    <div className="memo">
      <div className="memo-bar no-print"><a href={`/sites/${s.id}`}>← Back to the dossier</a>{s.id === "NJ-04" && <a href="/anchor">Anchor-deal package</a>}<a className="btn" href={`/memos/ATCO-${s.id}-IC-memo.pdf`} download>Download PDF</a></div>
      <article className="memo-page">
        <header className="memo-head">
          <img src="/brand/atco-logo.png" alt="ATCO" width="94" height="46" />
          <div style={{ textAlign: "right" }}><div className="memo-eyebrow">Investment committee memo · Confidential</div><div className="xs">{longDate(meta.as_of)} · Site {s.id} · Rank {s.rank}</div></div>
        </header>
        <h1>{s.name}</h1>
        <div className="memo-sub">{s.municipality}, {s.county} County, {s.state} · {u.units} units ({mix}) · {s.acres} acres · {s.drive_min_midtown} min to Midtown</div>
        <div className={`memo-rec ic-${f?.tone ?? "go"}`}><b>Recommendation: {rec}.</b> {f ? f.text : `${s.verdict_reason}.`}</div>
        <div className="memo-kpis">
          <div><span>Capital required</span><b>{usdM(cp.uses.total, 1)}</b></div>
          <div><span>Equity · loan</span><b>{usdM(cp.equityCommit, 1)} · {usdM(cp.loanCommit, 1)}</b></div>
          {ef ? <>
            <div><span>Entrance-fee coverage of IL cost</span><b>{Math.round(u.entrance_fee.coverage * 100)}%</b></div>
            <div><span>Nonprofit sponsor · lev. IRR</span><b>{pct(ef.nonprofit.irrL, 1)} · {mult(ef.nonprofit.em)}</b></div>
            <div><span>Profit · nonprofit / for-profit</span><b>{usdM(ef.nonprofit.profit, 1)} / {usdM(ef.taxable.profit, 1)}</b></div>
          </> : <>
          <div><span>Yield on cost · {cp.struct.toLowerCase()}</span><b>{pct(cp.yoc)}</b></div>
          <div><span>Levered IRR · LP net</span><b>{pct(cp.irrLevered, 1)} · {wf ? pct(wf.lpIrr, 1) : "n/m"}</b></div>
          <div><span>Profit at stabilization</span><b>{usdM(cp.profit, 1)}</b></div>
          </>}
          <div><span>At risk before approval</span><b>{usdM(cp.atRiskPreEntitlement, 2)}</b></div>
        </div>
        <h2>Thesis</h2>
        <ul>
          <li><b>Approvability.</b> {clean(s.approval_case)}. Opposition risk is {String(s.opposition_risk).toLowerCase()}.</li>
          <li><b>Deal route.</b> {clean(s.deal_route)}. {clean(s.land_note)}.</li>
          <li><b>Need and rents.</b> Need {s.scores.need}, rent support {s.scores.rent_support} and approval {s.scores.approval} on a 100-point scale.{ab ? ` About ${int(Math.round(ab.q))} age- and income-qualified households 75+ in the 7-mile market.` : ""}</li>
          {ef ? <li><b>Returns.</b> Judged as an entrance-fee life plan, not a rental: first-generation fees cover {Math.round(u.entrance_fee.coverage * 100)}% of IL cost against a 70% screen. Owned tax-exempt by a nonprofit sponsor it makes {usdM(ef.nonprofit.profit, 1)}; ATCO&apos;s development fee is about {usdM(u.entrance_fee.developer_fee, 1)}, plus the GC contract.</li> :
          <li><b>Returns.</b> {pct(cp.yoc)} yield on cost against a {pct(HURDLE, 1)} floor. Value at a {pct(a.exit_cap)} exit cap is {usdM(cp.value, 1)} on trended NOI of {usdM(cp.noiTrended, 2)}. Max land at the floor is {usdM(u.max_land, 1)} against a {usdM(u.land_cost, 1)} basis. LP net IRR after an 8% pref and 80/20 split: {wf ? pct(wf.lpIrr, 1) : "n/m"}.</li>}
        </ul>
        <div className="memo-cols">
          <div>
            <h2>Sources and uses</h2>
            <table className="memo-t"><tbody>
              {uses.map(([k, v]) => <tr key={k}><td>{k}</td><td className="num">{usdM(v, 2)}</td></tr>)}
              <tr className="tot"><td>Total uses</td><td className="num">{usdM(cp.uses.total, 2)}</td></tr>
              <tr><td>Equity, {pct(1 - a.debt.ltc, 0)} (LP {pct(CAP.lpShare, 0)} / GP {pct(1 - CAP.lpShare, 0)})</td><td className="num">{usdM(cp.equityCommit, 2)}</td></tr>
              <tr><td>Construction loan, {pct(a.debt.ltc, 0)} LTC</td><td className="num">{usdM(cp.loanCommit, 2)}</td></tr>
            </tbody></table>
          </div>
          <div>
            <h2>Schedule</h2>
            <table className="memo-t"><tbody>
              <tr><td>Predevelopment and approvals</td><td className="num">{cp.P} mo</td></tr>
              <tr><td>Construction</td><td className="num">{cp.B} mo</td></tr>
              <tr><td>Lease-up to stabilization</td><td className="num">{cp.L} mo</td></tr>
              <tr className="tot"><td>Site control to sale</td><td className="num">{cp.N} mo</td></tr>
            </tbody></table>
            <h2>Team</h2>
            <table className="memo-t"><tbody>
              <tr><td>Operator, first call</td><td>{fit?.first ?? "To be selected"}</td></tr>
              <tr><td>Operator, second</td><td>{fit?.second ?? "—"}</td></tr>
              <tr><td>General contractor</td><td>{g.primary.name} (alternate {g.alt.name})</td></tr>
            </tbody></table>
          </div>
        </div>
        {sc && <>
          <div className="memo-keep"><h2>Downside cases</h2>
          <table className="memo-t full"><thead><tr><th>Case</th><th className="num">YOC</th><th className="num">Unlev. IRR</th><th className="num">Lev. IRR</th><th className="num">Multiple</th><th className="num">Profit</th></tr></thead>
            <tbody>{sc.map((r) => <tr key={r.key} className={r.key === "all" ? "tot" : undefined}><td>{r.label}</td><td className="num">{pct(r.yoc)}</td><td className="num">{pct(r.irrU, 1)}</td><td className="num">{pct(r.irrL, 1)}</td><td className="num">{mult(r.em)}</td><td className="num">{usdM(r.profit, 1)}</td></tr>)}</tbody>
          </table>
          {all && <p className="memo-note">All four shocks at once (rents −10%, hard costs +10%, exit cap +50 bps, lease-up +6 months) take yield on cost to {pct(all.yoc)} and the levered IRR to {pct(all.irrL, 1)}{all.profit < 0 ? `, a ${usdM(-all.profit, 1)} loss on a sale at stabilization` : `, still ${usdM(all.profit, 1)} of profit at stabilization`}.</p>}
        </div></>}
        {st && <div className="memo-keep">
          <h2>Structuring the downside</h2>
          <div className={`memo-rec ic-${onHold(s) || st.nothing ? "bad" : st.rec.key === "fee" ? "warn" : "go"}`} style={{ marginBottom: 6 }}><b>{recLabel(st, onHold(s))}.</b> {structVerdict(st, s, onHold(s))}</div>
          <table className="memo-t full"><thead><tr><th>Structure</th><th className="num">Base YOC</th><th className="num">Base profit</th><th className="num">Downside YOC</th><th className="num">Downside profit</th><th>Breakeven?</th></tr></thead>
            <tbody>{st.opts.map((o) => <tr key={o.key} className={o.key === st.rec.key ? "tot" : undefined}><td>{o.label}</td><td className="num">{pct(o.base.yoc)}</td><td className="num">{usdM(o.base.profit, 1)}</td><td className="num">{pct(o.down.yoc)}</td><td className="num">{usdM(o.down.profit, 1)}</td><td>{o.ok ? "Yes" : "No"}</td></tr>)}</tbody>
          </table>
        </div>}
        <h2>Key risks and how we close them</h2>
        <table className="memo-t full"><tbody>{risks.map(([k, v]) => <tr key={k}><td style={{ width: 96, fontWeight: 700 }}>{k}</td><td>{v}</td></tr>)}</tbody></table>
        <h2>Next steps</h2>
        <ol>
          <li>{clean(s.next_step)}.</li>
          {pb.gates.slice(0, 2).map((gt) => <li key={gt.name}>{gt.name} by month {gt.month}, {usdM(gt.atRisk, 2)} at risk. {clean(gt.test)}.</li>)}
        </ol>
        <footer className="memo-foot">Model outputs for screening, not an appraisal, offer or investment advice. Estimates are replaced with NIC MAP and assessor data before LOI. Full dossier: senior-living-pipeline-1cia.vercel.app/sites/{s.id}. Excel model: senior-living-pipeline-1cia.vercel.app/models/ATCO-{s.id}-proforma.xlsx</footer>
      </article>
    </div>
  );
}
