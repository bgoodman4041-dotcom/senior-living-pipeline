import type { Metadata } from "next";
import { assumptions as a, meta, HURDLE, TARGET } from "@/lib/data";
import { pct } from "@/lib/format";
import { readDoc, section, numbered, Inline } from "@/lib/md";

export const metadata: Metadata = { title: "Methodology", description: "Gates, approval rubric, rent-support and need scoring, max-land and breakeven formulas, verdict rules and data gaps." };

const F = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 13, background: "#f3f1ea", border: "1px solid var(--rule)", borderRadius: 5, padding: "10px 12px", margin: "8px 0 12px", overflowX: "auto" }}>{children}</div>
);

export default function Method() {
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

        <section className="section anchor" id="data-gaps">
          <div className="card card-pad prose">
            <h3>8. Data gaps <span className="badge-i">I</span></h3>
            <p>{meta.note}</p>
            <ol>{gaps.map((g, i) => <li key={i}><Inline text={g} /></li>)}</ol>
            <p className="small muted">Live layers on site pages (tax parcels from NJGIN, NYS ITS and CT OPM; places from OpenStreetMap) load in the viewer&apos;s browser from public services and can lag official records.</p>
          </div>
        </section>
      </div>
    </>
  );
}
