import type { Metadata } from "next";
import { siteById, shortlist, markets, assumptions, onHold, funnel, meta, HURDLE } from "@/lib/data";
import { capitalPlan } from "@/lib/capital";
import { structuring } from "@/lib/structuring";
import { absorptionFor } from "@/components/Absorption";
import AxonRender from "@/components/AxonRender";
import ab from "@/data/absorption.json";
import { pct, usdM, int, longDate } from "@/lib/format";

export const metadata: Metadata = { title: "Partnership brief", description: "One-page leave-behind: ATCO's senior living pipeline, the Florham Park lead opportunity, and where a mission-driven partner fits.", robots: { index: false } };

export default function Brief() {
  const a = assumptions;
  const fp = siteById("NJ-04")!, mv = siteById("NJ-10")!, rb = siteById("NY-01")!, tb = siteById("CT-02")!;
  const cp = capitalPlan(fp, a), st = structuring(fp, markets, a)!, gmp = st.opts.find((o) => o.key === "gmp")!;
  const cpRB = capitalPlan(rb, a), cpTB = capitalPlan(tb, a);
  const abFP = absorptionFor("NJ-04")!, cap = abFP.run(ab.assumptions.needRate, fp.uw.units).capture;
  const live = shortlist.filter((s) => !onHold(s));
  const mcUnits = live.reduce((t, s) => t + ((s.uw.lines as any[]).find((l) => l.care === "MC")?.units || 0), 0);
  const homes = live.reduce((t, s) => t + s.uw.units, 0);
  const m = (v: number) => <span style={{ whiteSpace: "nowrap" }}>{v < 0 ? "−" : ""}{usdM(Math.abs(v), 1)}</span>;
  const rows = live.map((s) => {
    const c = capitalPlan(s, a), ef = c.efCase;
    const r = ef ? null : structuring(s, markets, a);
    return { s, c, ef, label: ef ? "Life plan, entrance fee" : r?.rec.key === "fee" ? "Partner or fee role" : c.struct === "PILOT" ? "AL / MC rental, with PILOT" : "AL / MC rental" };
  });
  return (
    <div className="memo brief">
      <div className="memo-bar no-print"><a href="/">← Back to the site</a><a className="btn" href="/briefs/ATCO-senior-living-partnership-brief.pdf" download>Download PDF</a></div>
      <article className="memo-page">
        <header className="memo-head">
          <img src="/brand/atco-logo.png" alt="ATCO" width="94" height="46" />
          <div style={{ textAlign: "right" }}><div className="memo-eyebrow">Senior living · Partnership brief</div><div className="xs">{longDate(meta.as_of)} · Confidential</div></div>
        </header>
        <h1>Care close to home, where families already live</h1>
        <p className="memo-sub" style={{ fontSize: 13 }}>ATCO Properties &amp; Management is building a pipeline of assisted living and memory care communities in the suburbs of New York, New Jersey and Connecticut, drawing on what RiverSpring Living has shown in Riverdale: care in one place, land held for the long term, mission ownership where it matters, and a hospital partner close by.</p>

        <div className="brief-top">
          <div className="brief-render"><AxonRender lat={Number(fp.lat)} lon={Number(fp.lon)} acres={Number(fp.acres)} title="the Florham Park building" parking={Math.round(fp.uw.units * 0.25 + Math.round(fp.uw.units * 0.35) * 0.5)}
            lines={(fp.uw.lines as { care: string; units: number }[]).map((l) => ({ care: l.care, units: l.units }))}
            gsfPerUnit={Object.fromEntries(Object.entries<any>(a.care_levels).map(([k, v]) => [k, v.gsf_per_unit]))} /><span>Concept massing from the unit mix, not a design</span></div>
          <div>
            <h2 style={{ marginTop: 0 }}>Lead opportunity · Florham Park, NJ</h2>
            <p className="memo-note" style={{ marginTop: 0 }}>{fp.uw.units} apartments ({(fp.uw.lines as any[]).map((l) => `${l.units} ${l.care}`).join(", ")}) on a {fp.acres}-acre pad inside Garden Homes&apos; 305-home age-restricted community at the former ASCO headquarters, {fp.drive_min_midtown} minutes from Midtown.</p>
            <div className="memo-kpis" style={{ marginTop: 8 }}>
              <div><span>Total capital</span><b>{usdM(cp.uses.total, 1)}</b></div>
              <div><span>Yield on cost, taxed</span><b>{pct(fp.uw.yoc)}</b></div>
              <div><span>With a PILOT</span><b>{pct(fp.uw.yoc_by_tax_structure.pilot)}</b></div>
              <div><span>Downside, with GMP</span><b>{m(gmp.down.profit)}</b></div>
              <div><span>Medicaid AL (NJ CN)</span><b>~{Math.round(((fp.uw.lines as any[]).find((l) => l.care === "AL")?.units || 0) * 0.1)} apts</b></div>
              <div><span>Market capture needed</span><b>~{pct(cap, 0)}</b></div>
            </div>
            <p className="memo-note">The open question is demand: about {pct(cap, 0)} of unmet demand against a 10–15% lender norm. A market study comes before any LOI.</p>
          </div>
        </div>

        <h2>Where a partner fits</h2>
        <table className="memo-t">
          <thead><tr><th>Role</th><th>Sites</th><th>What the numbers say</th></tr></thead>
          <tbody>
            <tr><td><b>Operator and co-owner</b> of AL / memory care</td><td>Florham Park, Montville (NJ)</td><td>{pct(fp.uw.yoc)} fully taxed at Florham Park; {pct(mv.uw.yoc_by_tax_structure.pilot)} at Montville with a PILOT. Management fee subordinated through lease-up.</td></tr>
            <tr><td><b>Nonprofit sponsor</b> of a life plan community</td><td>Rye Brook, NY ({rb.uw.units} apts); Trumbull, CT ({tb.uw.units})</td><td>Profit if nonprofit-owned: {m(cpRB.efCase!.nonprofit.profit)} and {m(cpTB.efCase!.nonprofit.profit)}; if for-profit-owned: {m(cpRB.efCase!.taxable.profit)} and {m(cpTB.efCase!.taxable.profit)}. ATCO develops and builds for a fee, with no ownership.</td></tr>
            <tr><td><b>Clinical and memory care partner</b></td><td>All {int(mcUnits)} memory care apartments</td><td>Programming, rehabilitation and referral pathways for communities a commercial operator runs. Terms to shape together.</td></tr>
          </tbody>
        </table>

        <div className="memo-cols">
          <div>
            <h2>The pipeline</h2>
            <p className="memo-note" style={{ marginTop: 0 }}>{funnel.sourced} sites sourced, {funnel.underwritten} underwritten with full pro formas, {funnel.shortlist} shortlisted. Active today: {int(homes)} apartments.</p>
            <table className="memo-t" style={{ marginTop: 4 }}>
              <tbody>{rows.map(({ s, c, ef, label }) => (
                <tr key={s.id}><td>{s.municipality.replace(/^(Town of|Village of) /, "").replace(/ Twp$/, "")}, {s.state}</td><td>{s.uw.units}</td><td>{label}</td><td className="num">{ef ? `${Math.round(s.uw.entrance_fee.coverage * 100)}% fees` : pct(c.yoc)}</td></tr>))}</tbody>
            </table>
          </div>
          <div>
            <h2>What ATCO brings</h2>
            <ul>
              <li>Land and approvals: ATCO buys and owns the land fee simple, on pads inside approved master plans, with a playbook for each town</li>
              <li>Construction at a guaranteed maximum price, with open books</li>
              <li>Capital: equity and construction debt, released in gates</li>
              <li>Underwriting a partner can check: every input sourced, Excel models for each site</li>
            </ul>
            <h2>Next step</h2>
            <p className="memo-note" style={{ marginTop: 0 }}>A working session on Florham Park and the two life plan campuses: which role fits, and what a partner would need to see.</p>
            <p className="memo-note"><b>Contact:</b> Ben Goodman, CEO, ATCO Properties &amp; Management · <span className="ph">[phone] · [email]</span></p>
          </div>
        </div>
        <div className="memo-foot">Figures are screening outputs from ATCO&apos;s underwriting model as of {longDate(meta.as_of)}, not appraisals or offers. Owned-rental floor {pct(HURDLE, 1)} yield on cost. ATCO is not affiliated with RiverSpring Living; references to RiverSpring describe public information. Full detail: senior-living-pipeline-1cia.vercel.app</div>
      </article>
    </div>
  );
}
