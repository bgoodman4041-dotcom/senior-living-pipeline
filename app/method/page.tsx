import type { Metadata } from "next";
import { assumptions as a, meta, HURDLE, TARGET } from "@/lib/data";
import { pct } from "@/lib/format";
import { readDoc, section, numbered, Inline, parseTable } from "@/lib/md";
import { CAP } from "@/lib/capital";

export const metadata: Metadata = { title: "Methodology", description: "Gates, approval rubric, rent-support and need scoring, max-land and breakeven formulas, verdict rules and data gaps." };

const F = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 13, background: "#f3f1ea", border: "1px solid var(--rule)", borderRadius: 5, padding: "10px 12px", margin: "8px 0 12px", overflowX: "auto" }}>{children}</div>
);

export default function Method() {
  const reg = parseTable(readDoc("model/ASSUMPTIONS.md")).slice(1);
  const capRows: [string, string, string][] = [
    ["Schedule", `${CAP.predevMonths} mo predevelopment; build ${CAP.buildMonths.C}–${CAP.buildMonths.A} mo; lease-up ${CAP.leaseupMonths.C}–${CAP.leaseupMonths.A} mo by prototype`, "[I] 114-unit AL/MC at 18 months is about 6 move-ins a month, above the 2–4 a month rule of thumb; Northeast lease-ups have run faster with occupancy above 90% [V NIC]"],
    ["Growth to sale", `${pct(CAP.trend, 0)} a year on rent and expense`, "[I] in line with recent AL rate increases"],
    ["Sale costs", pct(CAP.saleCostPct, 0), "[I]"],
    ["Equity split", `LP ${pct(CAP.lpShare, 0)} / GP ${pct(1 - CAP.lpShare, 0)}`, "[I] typical programmatic JV"],
    ["Permanent take-out", `${pct(CAP.permDebtYield, 0)} debt yield, ${pct(CAP.permMaxLtv, 0)} LTV, ${pct(CAP.permRate, 1)}, ${CAP.permAmortYears}-yr amortization`, "[I] HUD 232 style"],
    ["Entrance-fee IL monthly fee", `${pct(CAP.efMonthlyPct, 0)} of the rental IL rate`, "[I] life-plan contracts"],
  ];
  const gaps = numbered(section(readDoc("research/market-demand.md"), "9. Next steps"));
  const w = a.score_weights;
  return (
    <>
      <section className="hero"><div className="wrap">
        <div className="eyebrow">Methodology</div>
        <h1>How every site is screened, scored and priced</h1>
        <p className="lede">One model, applied identically to every site: hard gates, a pro forma off the local rent index, the maximum land price at the hurdle, then a verdict.</p>
      </div></section>
      <div className="wrap">
        <section className="section"><div className="grid g2">
          <div className="card card-pad prose">
            <h3>1. Gates (hard kills)</h3>
            <ul>
              <li>Drive time to Midtown above the state band: NY {a.gates.max_drive_min.NY}, NJ {a.gates.max_drive_min.NJ}, CT {a.gates.max_drive_min.CT} minutes.</li>
              <li>Site under {a.gates.min_acres} acres.</li>
              <li>Approval score under {a.gates.min_approval_score}: entitlement path not credible.</li>
            </ul>
            <h3>2. Town approval rubric (0–100, analyst-scored)</h3>
            <table className="kv"><tbody>
              <tr><td>90+</td><td>Entitled: zoning and site plan in hand for senior use</td></tr>
              <tr><td>75–89</td><td>Clear path: as-of-right or a floating zone with local precedent</td></tr>
              <tr><td>55–74</td><td>Credible discretionary path: special permit, amendment, redevelopment plan</td></tr>
              <tr><td>35–54</td><td>Uncertain: rezoning with mixed precedent or organized opposition</td></tr>
              <tr><td>&lt;35</td><td>Not credible today (gate failure)</td></tr>
            </tbody></table>
          </div>
          <div className="card card-pad prose">
            <h3>3. Pro forma</h3>
            <p>Rents are Westchester base rates × the submarket rent index; hard costs are ${a.hard_cost_psf}/SF × the county cost index. Opex is a margin on revenue by care level; property tax is added per unit because it varies five-fold by town.</p>
            <F>YOC = stabilized NOI ÷ all-in cost (incl. land)</F>
            <F>Max land = NOI ÷ {pct(HURDLE, 1)} − cost ex-land</F>
            <F>Land cushion = max land − land basis (ask → estimate → county comp per unit)</F>
            <F>Breakeven rent ratio = ({pct(HURDLE, 1)} × total cost + taxes + reserves) ÷ (revenue − opex)</F>
            <h3>4. Tax structures</h3>
            <p>Fully taxed; PILOT at {pct(a.tax_structures.pilot, 0)} of full taxes; nonprofit-exempt at {pct(a.tax_structures.nonprofit_exempt, 0)}. Same cost, different NOI.</p>
          </div>
        </div></section>

        <section className="section"><div className="grid g2">
          <div className="card card-pad prose">
            <h3>5. Scores</h3>
            <p><b>Rent support</b> = 0.6 × proven + 0.4 × capacity. Proven = 60 − (breakeven − 1.0) × 200; capacity blends home value against $650k and 65+ income against $90k.</p>
            <p><b>Need</b> = 25 × unmet-demand ratio + 25 (unmet income- and age-qualified demand per proposed unit).</p>
            <p><b>Yield</b> = 50 + (YOC − {pct(HURDLE, 1)}) × 2000, so ±25 bps moves 5 points.</p>
            <p><b>Composite</b> = approval {pct(w.approval, 0)} · rent support {pct(w.rent_support, 0)} · need {pct(w.need, 0)} · yield {pct(w.yield, 0)}.</p>
          </div>
          <div className="card card-pad prose">
            <h3>6. Verdict rules</h3>
            <ol>
              <li><b>Pass</b> if any gate fails.</li>
              <li><b>Pursue</b> if fully taxed YOC ≥ {pct(HURDLE, 1)} with a non-negative land cushion and approval ≥ 55.</li>
              <li><b>Pursue-structured</b> if PILOT YOC ≥ {pct(HURDLE, 1)}, or an IL-led campus whose entrance fees cover ≥ {pct(a.entrance_fee.min_coverage, 0)} of IL cost, with approval ≥ 55.</li>
              <li><b>Watch</b> if it clears but approval is under 55, clears only nonprofit-exempt, or is within {a.near_miss_bps} bps with a PILOT.</li>
              <li><b>Pass</b> otherwise.</li>
            </ol>
            <h3>7. Hurdle</h3>
            <p>{pct(HURDLE, 1)} is the floor. The plan recommends {pct(TARGET, 1)} for fee-simple rental, since Class A AL trades near a {pct(a.exit_cap)} exit cap and a {pct(HURDLE, 1)} YOC leaves almost no development spread.</p>
          </div>
        </div></section>

        <section className="section anchor" id="assumptions">
          <div className="section-head"><div><h2 className="rule-title">Assumptions register</h2><p>Every underwriting input, its value and its basis. [V] is a sourced figure; [I] is a calibrated estimate to replace before LOI. The Excel models carry the same inputs as blue cells.</p></div></div>
          <div className="card"><div className="table-wrap"><table className="t">
            <thead><tr><th>Input</th><th>Value</th><th>Basis</th></tr></thead>
            <tbody>
              {reg.map((r) => <tr key={r[0]}><td style={{ minWidth: 150 }}><b><Inline text={r[0]} /></b></td><td className="small" style={{ minWidth: 200 }}><Inline text={r[1]} /></td><td className="small"><Inline text={r[2] || ""} /></td></tr>)}
              {capRows.map((r) => <tr key={r[0]}><td><b>{r[0]}</b></td><td className="small">{r[1]}</td><td className="small">{r[2]}</td></tr>)}
            </tbody>
          </table></div></div>
        </section>

        <section className="section anchor" id="data-gaps">
          <div className="card card-pad prose">
            <h3>8. Data gaps <span className="badge-i">I</span></h3>
            <p>{meta.note}</p>
            <ol>{gaps.map((g, i) => <li key={i}><Inline text={g} /></li>)}</ol>
            <p className="small muted">Live layers on site pages (tax parcels from NJGIN, NYS ITS and CT OPM; places from OpenStreetMap) load in the viewer&apos;s browser from public services and can lag official records.</p>
          </div>
        </section>

        <section className="section anchor" id="disclaimer">
          <div className="card card-pad prose" style={{ borderLeft: "4px solid var(--atco-purple)" }}>
            <h3>Important notice</h3>
            <p className="small">This site and the linked Excel models are a screening tool prepared by ATCO Properties &amp; Management for internal discussion with prospective partners. They are not an offer to sell or a solicitation of an offer to buy any security or interest, and they are not investment, tax, legal or accounting advice. Figures are model outputs built on stated assumptions, many of them calibrated estimates marked [I]; they are not appraisals, market studies, bids or guarantees of future results. Rents, costs, taxes, absorption, entitlement odds and returns will differ from what is shown, possibly materially. Site information comes from public records, news reports and third-party data believed reliable but not independently verified; ATCO has no agreement with any landowner, operator or contractor named unless stated. Verify every figure before relying on it.</p>
          </div>
        </section>
      </div>
    </>
  );
}
