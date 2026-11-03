import type { Metadata } from "next";
import { siteById, shortlist, markets, assumptions, HURDLE, onHold, funnel } from "@/lib/data";
import { capitalPlan, CAP } from "@/lib/capital";
import { structuring, STRUCT } from "@/lib/structuring";
import { waterfall, WF } from "@/lib/waterfall";
import { SHOCKS } from "@/lib/scenarios";
import { absorptionFor } from "@/components/Absorption";
import ab from "@/data/absorption.json";
import { pct, usdM, int } from "@/lib/format";

export const metadata: Metadata = { title: "Investor FAQ", description: "The questions an LP or lender asks on first review, answered with the evidence on this site, and the items only ATCO can answer." };

type St = "Answered" | "Partly answered" | "Needs Ben";
type Q = { q: string; a: string; st: St; links: [string, string][] };

export default function Investors() {
  const s = siteById("NJ-04")!, u = s.uw, a = assumptions;
  const cp = capitalPlan(s, a), w = waterfall(cp.levCF), st = structuring(s, markets, a)!;
  const gmp = st.opts.find((o) => o.key === "gmp")!, none = st.opts.find((o) => o.key === "none")!, gpil = st.opts.find((o) => o.key === "gmp_pilot")!;
  const abs = absorptionFor("NJ-04")!, cap0 = abs.run(ab.assumptions.needRate, u.units), capW = abs.run(ab.assumptions.needRate, u.units, abs.contingent);
  const al = u.lines.find((l: any) => l.care === "AL"), mc = u.lines.find((l: any) => l.care === "MC");
  const active = shortlist.filter((x) => !onHold(x) && !/entrance-fee/.test(x.verdict_reason) && structuring(x, markets, a)?.rec.key !== "fee"); // owned rentals only: not on hold, not entrance-fee, not fee-only
  const plans = active.map((x) => capitalPlan(x, a));
  const eqAll = plans.reduce((t, p) => t + p.equityCommit, 0), costAll = plans.reduce((t, p) => t + p.uses.total, 0);

  const groups: [string, Q[]][] = [
    ["Sponsor and alignment", [
      { q: "What is ATCO's track record in senior housing or comparable ground-up work?", a: "[Placeholder for Ben] Projects delivered, units, cost, schedule against budget, and realized returns. LPs will want at least three comparable ground-up projects with audited outcomes.", st: "Needs Ben", links: [] },
      { q: "How much is ATCO investing alongside LPs?", a: `The model assumes the GP side funds ${pct(1 - WF.lpShare, 0)} of equity (${usdM(cp.gp, 1)} on Florham Park), shared between ATCO and the operator. [Placeholder for Ben] Confirm ATCO's own cash commitment and whether any of it is fee-funded.`, st: "Needs Ben", links: [["Sources and uses", "/anchor#sources-uses"]] },
      { q: "Who are the key people, and what happens if one leaves?", a: "[Placeholder for Ben] Named deal team, time commitment, and a key-person clause (for example, a suspension of new investments if Ben or a named principal stops devoting substantial time).", st: "Needs Ben", links: [] },
      { q: "ATCO is developer and GC. How are conflicts handled?", a: `Proposed controls: an open-book GMP signed at financial close, third-party review of the GMP by the lender's construction consultant, monthly draws certified by that monitor with ${pct(CAP.retainagePct, 0)} retainage, and investment-committee approval for any change order over $${int(CAP.coRepThreshold)}. LPs should also get a right to bid out the GC contract if the GMP comes in above budget. Ben to confirm these terms.`, st: "Partly answered", links: [["Capital gates", "/sites/NJ-04#capital"]] },
    ]],
    ["Fees, waterfall and structure", [
      { q: "What do LPs net after the promote?", a: `On illustrative terms (${pct(WF.pref, 0)} compounding pref, then ${Math.round(WF.lpSplit * 100)}/${Math.round((1 - WF.lpSplit) * 100)}), Florham Park's LP net IRR is ${pct(w.lpIrr, 1)} on a ${pct(cp.irrLevered, 1)} project levered IRR, with a sale at stabilization.`, st: "Partly answered", links: [["LP waterfall", "/diligence#waterfall"]] },
      { q: "What fees does ATCO charge?", a: "The model carries soft cost at 20% of hard and site cost and does not break out a developer fee, an acquisition fee or an asset-management fee. [Placeholder for Ben] Fee schedule, and whether the development fee sits inside the 20% soft-cost budget.", st: "Needs Ben", links: [["Assumptions", "/method#assumptions"]] },
      { q: "Is this a fund or deal-by-deal?", a: `[Placeholder for Ben] Vehicle (deal-by-deal JV, programmatic JV or blind pool), domicile, term and GP commitment. For scale: the ${active.length} active owned-rental sites (${active.map((x) => x.municipality).join(" and ")}) need about ${usdM(eqAll, 0)} of equity on ${usdM(costAll, 0)} of cost.`, st: "Needs Ben", links: [["Capital calendar", "/#capital"]] },
      { q: "How often will LPs get reports?", a: "[Placeholder for Ben] A typical package is quarterly reports (budget against actual, draw status, schedule, leasing once open), annual audited financials and K-1s by a set date.", st: "Needs Ben", links: [] },
    ]],
    ["Market and demand", [
      { q: "Is there enough demand for another building?", a: `This is the weakest point. In Florham Park's 7-mile market the project needs about ${pct(cap0.capture, 0)} of unmet demand (lenders like 10–15%), or ${pct(capW.capture, 0)} if Woodmont's approved Parsippany building goes ahead. A NIC MAP pull is the first gate before any LOI.`, st: "Partly answered", links: [["Absorption", "/sites/NJ-04#absorption"], ["Risk register", "/anchor#risks"]] },
      { q: "What competing supply is coming?", a: "Arbor Terrace Florham Park (100-bed CN, May 2024), Woodmont Parsippany (approved 2022, not built) and Benchmark Cedar Grove (138 units, opening 2027, about 8–9 miles away, just outside the 7-mile market) are tracked, with sources.", st: "Answered", links: [["New candidates and supply", "/diligence#pipeline"]] },
      { q: "Are the rents real?", a: `Florham Park's private-pay AL rate (about $${int(Math.round(a.care_levels.AL.base_monthly_rate * Number(s.rent_index_site)))} a month) sits inside a public Class A comp set of listed prices. Listed prices are not a rate shop; an operator rate shop and NIC MAP confirm before LOI.`, st: "Partly answered", links: [["Rent comps", "/diligence#rents"]] },
      { q: "What are the demographics?", a: `About ${int(abs.s.pop75)} people 75+ in the 7-mile market, ${pct(abs.s.share75k, 0)} of 65+ householders above $75K income (ACS 2024).`, st: "Answered", links: [["Market", "/sites/NJ-04#market"], ["Markets", "/markets"]] },
    ]],
    ["Underwriting", [
      { q: "How was each site chosen, and what was rejected?", a: `${funnel.sourced} sites sourced, ${funnel.underwritten} fully underwritten, ${funnel.survive} survive the gates and ${funnel.shortlist} are on the shortlist. Every rejected site shows its reason. Watch sites and outside candidates were re-screened on the tougher assumptions; none was promoted.`, st: "Answered", links: [["Pipeline", "/#pipeline"], ["Re-screen", "/diligence#pipeline"]] },
      { q: "What is the yield on cost, and what is it measured on?", a: `Stabilized NOI over all-in cost including land, lease-up deficit and interest: ${pct(u.yoc)} fully taxed for Florham Park (${pct(u.yoc_by_tax_structure.pilot)} with a PILOT), against a ${pct(HURDLE, 1)} floor.`, st: "Answered", links: [["Pro forma", "/sites/NJ-04#proforma"], ["Excel model", "/models/ATCO-NJ-04-proforma.xlsx"]] },
      { q: "Is the construction cost realistic?", a: `Hard cost is $${int(Math.round(u.hard / u.gsf))}/SF, in Weitz's national mid-level AL range and below its high-level range, before a New York-area premium. All-in cost is about $${int(Math.round(u.total_cost / u.units / 1000))}K a unit against public NJ/NY comps of $327K–$596K. A GC price on the budget outline is the remaining test.`, st: "Partly answered", links: [["Cost comps", "/diligence#costs"], ["GC budget", "/models/ATCO-NJ-04-GC-budget.xlsx"]] },
      { q: "What about labor and operating costs?", a: `Operating cost is modeled as a share of revenue by care level (AL ${pct(al.opex / al.revenue, 0)}, MC ${pct(mc.opex / mc.revenue, 0)} of revenue before tax and reserves), not line by line. Labor, the largest line, is not modeled separately; the operator's staffing plan and wage survey are a gap.`, st: "Partly answered", links: [["Assumptions", "/method#assumptions"]] },
      { q: "How long is lease-up?", a: `${u.leaseup_months} months at the industry-norm pace of net move-ins, funded by a ${usdM(u.leaseup, 1)} reserve in the budget. The downside adds ${SHOCKS.leaseupMonths} months. Pre-leasing is not credited.`, st: "Answered", links: [["Schedule", "/anchor#schedule"]] },
      { q: "What if it goes wrong?", a: `Each shock is run alone and combined (rent ${pct(SHOCKS.rent, 0)}, hard cost +${pct(SHOCKS.hard, 0)}, exit cap +${SHOCKS.exitBps} bps, lease-up +${SHOCKS.leaseupMonths} months). Combined, Florham Park loses ${usdM(Math.abs(none.down.profit), 1)} as underwritten, makes ${usdM(gmp.down.profit, 1)} with a GMP and ${usdM(gpil.down.profit, 1)} with a GMP and PILOT.`, st: "Answered", links: [["Downside", "/sites/NJ-04#downside"], ["Structuring", "/sites/NJ-04#structuring"]] },
    ]],
    ["Capital stack and exit", [
      { q: "How is it financed, and will lenders do it?", a: `Senior construction loan at ${pct(a.debt.ltc, 0)} LTC and ${pct(a.debt.rate, 2)}, LP and GP equity for the rest. In 2026 JLL arranged $35.1M (East Brunswick, NJ) and $41.1M (East Islip, NY) construction loans for comparable AL/MC buildings. At ${pct(STRUCT.lowLtc, 0)} LTC the project levered IRR is ${pct(none.base.irrL50, 1)}.`, st: "Answered", links: [["Sources and uses", "/anchor#sources-uses"], ["Cost comps", "/diligence#costs"]] },
      { q: "How much is at risk before approvals?", a: `About ${usdM(cp.atRiskPreEntitlement, 2)} on Florham Park (deposit and pre-development soft cost), released in gates. Nothing past pursuit cost is spent until the LOI gate clears.`, st: "Answered", links: [["Capital gates", "/anchor#gates"]] },
      { q: "How do LPs get out?", a: `Sale at stabilization (month ${cp.N}) at a ${pct(a.exit_cap, 1)} cap, or a HUD 232 take-out at about ${cp.perm.dscr.toFixed(2)}x DSCR to hold. The investment is illiquid for about five years.`, st: "Answered", links: [["Capital deployment", "/sites/NJ-04#capital"]] },
    ]],
    ["Approvals and regulation", [
      { q: "What approvals are needed, and how likely are they?", a: "Each site has an approval path, odds, the decision-makers and a playbook. Florham Park needs the redevelopment plan to include the pad, site plan approval and an expedited CN for the AL beds.", st: "Answered", links: [["Approval playbook", "/sites/NJ-04#playbook"], ["PILOT path", "/anchor#pilot"]] },
      { q: "What licensing applies?", a: "New Jersey: a certificate of need (expedited for AL) and a 10% Medicaid occupancy commitment within 3 years, held permanently, which the model carries. New York: an adult care facility license (Social Services Law Article 7) and an assisted living residence license (Public Health Law Article 46-B), with enhanced or special-needs certification for memory care. Connecticut: a licensed assisted living services agency inside a registered managed residential community.", st: "Answered", links: [["Entitlement and licensing", "/sites/NJ-04#entitlement"]] },
      { q: "Is the property-tax deal real?", a: "Florham Park's site is a declared redevelopment area (Res. 20-94), so a 40A:20 PILOT is legally available once the plan is adopted. The deal clears fully taxed, so the PILOT is upside.", st: "Partly answered", links: [["NJ redevelopment status", "/diligence#redevelopment"]] },
    ]],
    ["Operations, risk and ESG", [
      { q: "Who operates it, and can they be replaced?", a: "Engel Burman leads for Florham Park, with Benchmark / National Development second. Outreach letters and term-sheet outlines are drafted, with the management fee subordinated in lease-up. No operator is signed yet. Replacement rights belong in the management agreement.", st: "Partly answered", links: [["Operators", "/operators"]] },
      { q: "Who controls the land?", a: "Garden Homes owns the 55-acre site. The plan is a 90-day exclusive LOI for a pad at a fixed price inside the model's max land. Nothing is signed.", st: "Needs Ben", links: [["Site control", "/diligence#control"]] },
      { q: "What insurance is carried?", a: "[Placeholder for Ben and the operator] Builder's risk and GC liability in construction; property, general and professional liability, and abuse and molestation coverage in operations. Premiums sit inside the operating-cost margin and are not modeled separately.", st: "Needs Ben", links: [] },
      { q: "What is the ESG position?", a: "[Placeholder for Ben] Energy target (for example all-electric or ENERGY STAR), brownfield reuse (Florham Park reuses a corporate campus), the 10% Medicaid AL commitment, and local hiring. None is in the model yet.", st: "Needs Ben", links: [] },
      { q: "Where do the numbers come from, and are they independent?", a: "Every input is tagged verified [V] or calibrated estimate [I], with sources on each page. This is ATCO's own screening model, not an appraisal or third-party market study.", st: "Answered", links: [["Methodology", "/method"], ["Data gaps", "/method#data-gaps"]] },
    ]],
  ];
  const all = groups.flatMap(([, qs]) => qs);
  const cnt = (x: St) => all.filter((q) => q.st === x).length;
  const tone = { "Answered": "go", "Partly answered": "warn", "Needs Ben": "bad" } as const;
  const ben = all.filter((q) => q.st === "Needs Ben");
  return (
    <section className="section">
      <div className="wrap">
        <div className="section-head"><div>
          <div className="eyebrow">Investor FAQ</div><h2>The questions LPs and lenders ask first</h2>
          <p>{all.length} questions an institutional LP or construction lender asks on first review. Each answer links to the evidence. Figures are for the lead site, Florham Park, unless stated, and update with the model. Items marked for Ben are placeholders that only ATCO can fill.</p>
        </div></div>
        <div className="card grid g3" style={{ marginBottom: 22 }}>
          <div className="kpi"><div className="label">Answered with evidence</div><div className="v">{cnt("Answered")}</div></div>
          <div className="kpi"><div className="label">Partly answered</div><div className="v">{cnt("Partly answered")}</div></div>
          <div className="kpi"><div className="label">Needs Ben</div><div className="v">{cnt("Needs Ben")}</div></div>
        </div>
        {groups.map(([g, qs]) => (
          <div key={g} style={{ marginBottom: 22 }}>
            <h3 className="anchor" id={g.toLowerCase().replace(/[^a-z]+/g, "-")}>{g}</h3>
            <div className="card"><div className="table-wrap"><table className="t">
              <tbody>{qs.map((x) => (
                <tr key={x.q}><td style={{ width: "32%", minWidth: 160 }}><b>{x.q}</b><div style={{ marginTop: 4 }}><span className={`ic-chip ic-${tone[x.st]}`}>{x.st}</span></div></td>
                  <td className="small">{x.a}{x.links.length > 0 && <div className="xs" style={{ marginTop: 4 }}>{x.links.map(([l, h], i) => <span key={h}>{i ? " · " : ""}<a href={h}>{l}</a></span>)}</div>}</td></tr>))}</tbody>
            </table></div></div>
          </div>))}
        <h3 className="anchor" id="for-ben">What only ATCO can answer</h3>
        <div className="card card-pad"><ul className="list-clean small">{ben.map((x) => <li key={x.q}>{x.q}</li>)}
          <li>Also open: NIC MAP pull, GC pricing of the Florham Park budget, operator LOIs, PILOT conversations, and the Rye Brook structure decision.</li></ul></div>
      </div>
    </section>
  );
}
