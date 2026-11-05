// Landing-page story for a first-time visitor (an operator, a nonprofit partner or an LP):
// mission first, the lead opportunity above the fold, where a partner fits, then the evidence.
import { siteById, shortlist, markets, assumptions, onHold, HURDLE } from "@/lib/data";
import { capitalPlan } from "@/lib/capital";
import { structuring } from "@/lib/structuring";
import { absorptionFor } from "@/components/Absorption";
import ab from "@/data/absorption.json";
import { pct, usdM, int } from "@/lib/format";
import AxonRender from "@/components/AxonRender";

const CARE: Record<string, string> = { IL: "independent living", AL: "assisted living", MC: "memory care" };

export default function HomeStory() {
  const a = assumptions;
  const fp = siteById("NJ-04")!, mv = siteById("NJ-10")!, rb = siteById("NY-01")!, tb = siteById("CT-02")!;
  const cpFP = capitalPlan(fp, a), stFP = structuring(fp, markets, a)!, stMV = structuring(mv, markets, a)!;
  const gmp = stFP.opts.find((o) => o.key === "gmp")!;
  const cpRB = capitalPlan(rb, a), cpTB = capitalPlan(tb, a);
  const fee = (s: any) => s.uw.total_cost * a.entrance_fee.developer_fee_pct;
  const abFP = absorptionFor("NJ-04")!;
  const live = shortlist.filter((s) => !onHold(s));
  const byCare: Record<string, number> = {};
  for (const s of live) for (const l of s.uw.lines as { care: string; units: number }[]) byCare[l.care] = (byCare[l.care] || 0) + l.units;
  const homes = Object.values(byCare).reduce((x, y) => x + y, 0);
  const njAL = live.filter((s) => s.state === "NJ").reduce((t, s) => t + ((s.uw.lines as any[]).find((l) => l.care === "AL")?.units || 0), 0);
  const medicaid = Math.round(njAL * Number(markets.find((m) => m.state === "NJ" && m.county === "Morris")?.al_medicaid_share || 0.1));
  const fpLines = (fp.uw.lines as { care: string; units: number }[]).map((l) => `${l.units} ${CARE[l.care]}`).join(" and ");

  return (
    <>
      <section className="hero hero-story">
        <div className="wrap hero-grid">
          <div>
            <div className="eyebrow">ATCO Senior Living · New York region</div>
            <h1>Care close to home, where families already live.</h1>
            <p className="lede">For more than a century, RiverSpring Living has shown what a full continuum of care on one campus does for older New Yorkers. ATCO is bringing that idea to the suburbs of New York, New Jersey and Connecticut. Every site is tested on three things before an LOI: the town will approve it, residents need it and can afford it, and it pays for itself.</p>
            <div className="hero-ctas">
              <a className="btn btn-xl" href="/anchor">The Florham Park plan</a>
              <a className="btn btn-ghost" href="#partner">Where a partner fits</a>
            </div>
            <p className="hero-note"><a href="/briefs/ATCO-senior-living-partnership-brief.pdf" className="hero-link">Download the one-page partnership brief (PDF)</a><br />ATCO is not affiliated with RiverSpring Living. We refer to its public record with respect, as the model we learn from.</p>
          </div>
          <a className="feature-card" href="/anchor" aria-label="Lead opportunity: Florham Park, New Jersey">
            <div className="feature-img feature-render">
              <AxonRender lat={Number(fp.lat)} lon={Number(fp.lon)} acres={Number(fp.acres)} title="the Florham Park building" parking={Math.round(fp.uw.units * 0.25 + Math.round(fp.uw.units * 0.35) * 0.5)}
                lines={(fp.uw.lines as { care: string; units: number }[]).map((l) => ({ care: l.care, units: l.units }))}
                gsfPerUnit={Object.fromEntries(Object.entries<any>(a.care_levels).map(([k, v]) => [k, v.gsf_per_unit]))} />
              <span className="feature-tag">Lead opportunity</span>
              <span className="feature-cap">Concept massing from the unit mix · not a design</span>
            </div>
            <div className="feature-body">
              <div className="xs feature-place">Florham Park · Morris County, NJ · {fp.drive_min_midtown} min to Midtown</div>
              <h2 className="feature-title">{fp.uw.units} apartments: {fpLines}</h2>
              <div className="feature-stats">
                <div><span>Total capital</span><b>{usdM(cpFP.uses.total, 1)}</b></div>
                <div><span>Yield on cost, fully taxed</span><b>{pct(fp.uw.yoc)}</b></div>
                <div><span>Downside profit, with a GMP</span><b>{gmp.down.profit >= 0 ? "+" : "−"}{usdM(Math.abs(gmp.down.profit), 1)}</b></div>
              </div>
              <div className="xs feature-next"><b>Before an LOI:</b> a market study, since the project needs about {pct(abFP.run(ab.assumptions.needRate, fp.uw.units).capture, 0)} of unmet demand, and a land deal with Garden Homes.</div>
            </div>
          </a>
        </div>
      </section>

      <section className="section mission">
        <div className="wrap">
          <div className="grid g4 mission-stats">
            <div><b>{int(homes)}</b><span>apartments on the active shortlist</span><em>{["IL", "AL", "MC"].filter((c) => byCare[c]).map((c) => `${byCare[c]} ${c}`).join(" · ")}</em></div>
            <div><b>{int(byCare.MC || 0)}</b><span>memory care apartments</span><em>in secured wings of each AL building</em></div>
            <div><b>~{medicaid}</b><span>Medicaid assisted living apartments</span><em>New Jersey's 10% commitment on {int(njAL)} AL apartments, held permanently</em></div>
            <div><b>{int(abFP.q)}</b><span>qualified households 75+ near Florham Park</span><em>within 7 miles, with the income or home equity to pay privately</em></div>
          </div>
        </div>
      </section>

      <section className="section lessons" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="section-head"><div>
            <div className="eyebrow">What we learned from RiverSpring</div>
            <h2>Four ideas from Riverdale, and how each one travels</h2>
            <p>RiverSpring's 32-acre campus on the Hudson brings housing, assisted living, memory care, rehabilitation and nursing care together. Some of that can be carried to a suburban site by a developer, and some belongs with a mission-driven partner.</p>
          </div><a className="btn" href="/model">The model in full →</a></div>
          <div className="grid g4">
            {[
              ["Care in one place", "Residents move between levels of care without leaving their community.", "The lead pads sit inside approved age-restricted communities (305 homes in Florham Park, 266 in Montville), so assisted living and memory care complete a continuum next door."],
              ["Land held for the long term", "Long-owned land makes the economics work. River's Edge sits on about 3 acres ground-leased within the campus.", "ATCO buys and owns its pads fee simple, inside approved master plans, and holds them for the long term."],
              ["Mission ownership for life plan communities", "River's Edge, New York City's first life plan community, was financed with about $633M of tax-exempt bonds and more than 85% of its 260 apartments were reserved before construction.", "On the two entrance-fee campuses, a nonprofit sponsor owns and ATCO develops and builds for a fee."],
              ["Clinical partnership", "The 79-bed Hauser Rehabilitation Center opened in 2025 with NewYork-Presbyterian clinicians on campus.", "Each operator agreement would name a clinical and referral partner, as Hauser does with NewYork-Presbyterian."],
            ].map(([t, rs, us]) => (
              <div key={t} className="card card-pad lesson">
                <h3>{t}</h3>
                <p className="small"><span className="label">At RiverSpring</span>{rs}</p>
                <p className="small"><span className="label">In this pipeline</span>{us}</p>
              </div>))}
          </div>
          <p className="xs muted" style={{ marginTop: 10 }}>Sources: <a href="https://www.ziegler.com/media/n2apxp4y/ziegler-press-release_riversedge_final_022726.pdf" target="_blank" rel="noopener">Ziegler, Feb 2026</a>; <a href="https://www.nyp.org/news/riverspring-living-opens-state-of-the-art-hauser-rehabilitation-center-in-collaboration-with-nyp" target="_blank" rel="noopener">NewYork-Presbyterian, Oct 2025</a>; <a href="https://edc.nyc/sites/default/files/2025-01/River's%20Edge%20PHP_Redacted.pdf" target="_blank" rel="noopener">Build NYC, Jan 2025</a>.</p>
        </div>
      </section>

      <section className="section anchor partner" id="partner" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="section-head"><div>
            <div className="eyebrow">Where a partner fits</div>
            <h2>Three roles for a mission-driven operator</h2>
            <p>ATCO brings land, approvals, construction at a guaranteed maximum price, and capital. A partner brings care, licensing and the trust of families. These are the places where the numbers say a partner changes the outcome.</p>
          </div></div>
          <div className="grid g3">
            <div className="card role">
              <div className="role-n">1</div>
              <h3>Operator and co-owner of AL / memory care</h3>
              <p className="small">Florham Park and Montville: two {fp.uw.units}-apartment buildings in Morris County, each inside an approved age-restricted community (305 and 266 homes).</p>
              <table className="kv small"><tbody>
                <tr><td>Florham Park · capital</td><td className="num">{usdM(cpFP.uses.total, 1)}</td></tr>
                <tr><td>Yield on cost, fully taxed</td><td className="num">{pct(fp.uw.yoc)}</td></tr>
                <tr><td>Montville · yield with a PILOT</td><td className="num">{pct(mv.uw.yoc_by_tax_structure.pilot)}</td></tr>
                <tr><td>Profit in the downside, with a GMP</td><td className="num">{usdM(gmp.down.profit, 1)} · {usdM(stMV.rec.down.profit, 1)}</td></tr>
              </tbody></table>
              <p className="xs muted">A partner operates, holds a share of GP equity, and takes a management fee subordinated through lease-up.</p>
              <a href="/anchor" className="role-link">Florham Park plan →</a>
            </div>
            <div className="card role role-hi">
              <div className="role-n">2</div>
              <h3>Nonprofit sponsor of a life plan community</h3>
              <p className="small">Two approved campuses miss as rentals and work as entrance-fee life plan communities. Tax-exempt ownership, the River&apos;s Edge structure, is what makes Rye Brook work and roughly triples Trumbull&apos;s result.</p>
              <table className="kv small"><tbody>
                <tr><td>Rye Brook, NY · {rb.uw.units} apartments</td><td className="num">{Math.round(rb.uw.entrance_fee.coverage * 100)}% fee coverage</td></tr>
                <tr><td>&nbsp;&nbsp;Profit if nonprofit-owned</td><td className="num">{usdM(cpRB.efCase!.nonprofit.profit, 1)}</td></tr>
                <tr><td>&nbsp;&nbsp;Profit if for-profit-owned</td><td className="num">{cpRB.efCase!.taxable.profit < 0 ? "−" : ""}{usdM(Math.abs(cpRB.efCase!.taxable.profit), 1)}</td></tr>
                <tr><td>Trumbull, CT · {tb.uw.units} apartments</td><td className="num">{Math.round(tb.uw.entrance_fee.coverage * 100)}% fee coverage</td></tr>
                <tr><td>&nbsp;&nbsp;Profit if nonprofit-owned</td><td className="num">{usdM(cpTB.efCase!.nonprofit.profit, 1)}</td></tr>
                <tr><td>&nbsp;&nbsp;Profit if for-profit-owned</td><td className="num">{usdM(cpTB.efCase!.taxable.profit, 1)}</td></tr>
              </tbody></table>
              <p className="xs muted">ATCO develops and builds for a fee (about {usdM(fee(rb), 1)} and {usdM(fee(tb), 1)}) and holds no ownership. Rye Brook&apos;s site is under contract to Sunrise; Trumbull&apos;s approved plan is called &ldquo;Rivers Edge&rdquo; and is unrelated to RiverSpring.</p>
              <a href="/sites/NY-01#fees" className="role-link">Entrance-fee test →</a>
            </div>
            <div className="card role">
              <div className="role-n">3</div>
              <h3>Clinical and memory care partner</h3>
              <p className="small">For communities a commercial operator runs, a nonprofit with deep clinical programs can provide memory care design and programming, rehabilitation and referral pathways, and elder-justice and family support.</p>
              <ul className="small list-clean role-list">
                <li>{int(byCare.MC || 0)} memory care apartments on the active shortlist</li>
                <li>Referral relationships with nearby hospitals, built site by site</li>
                <li>Terms to be shaped together; nothing is modeled yet</li>
              </ul>
              <a href="/operators" className="role-link">Operator partners →</a>
            </div>
          </div>
          <p className="small" style={{ marginTop: 14 }}><a href="/brief">One-page partnership brief</a> (PDF to leave behind). Every figure comes from the live underwriting model and updates with it. Floor for owned rentals: {pct(HURDLE, 1)} yield on cost. Entrance-fee campuses are judged on fee coverage and presales, not rental yield.</p>
        </div>
      </section>

    </>
  );
}
