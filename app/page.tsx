import PipelineExplorer, { type Row } from "@/components/PipelineExplorer";
import { VerdictChip } from "@/components/ui";
import PortfolioDeployment from "@/components/PortfolioDeployment";
import NewsFeed from "@/components/NewsFeed";
import news from "@/data/news.json";
import ops from "@/data/operators.json";
import icFlags from "@/data/ic-flags.json";
import { gcFor } from "@/lib/contractors";
import { capitalPlan } from "@/lib/capital";
import { playbook } from "@/lib/playbook";
import { sites, shortlist, funnel, meta, HURDLE, TARGET, trackOf, satThumb, assumptions } from "@/lib/data";
import { pct, usdM, usdK, int, longDate } from "@/lib/format";

export default function Home() {
  const pursue = sites.filter((s) => s.verdict === "Pursue");
  const wYoc = pursue.reduce((a, s) => a + s.uw.noi, 0) / pursue.reduce((a, s) => a + s.uw.total_cost, 0);
  const headroom = pursue.reduce((a, s) => a + (s.uw.land_cushion || 0), 0);
  const shortUnits = shortlist.reduce((a, s) => a + s.uw.units, 0);
  const capRows = shortlist.map((s) => {
    const ef = /entrance-fee/.test(s.verdict_reason);
    const struct = ef ? "Entrance fee" : s.verdict === "Pursue-structured" ? "PILOT" : "Fully taxed";
    const noi = struct === "PILOT" ? s.uw.noi + s.uw.taxes * (1 - assumptions.tax_structures.pilot) : s.uw.noi;
    return { s, ef, struct, noi, y: noi / s.uw.total_cost, val: noi / assumptions.exit_cap };
  });
  const protoC = Object.values<number>(assumptions.prototypes.C.mix).reduce((x, y) => x + y, 0);
  const shortCost = shortlist.reduce((a, s) => a + s.uw.total_cost, 0);

  const rows: Row[] = sites.map((s) => { const cp = capitalPlan(s, assumptions); const pb = playbook(s, assumptions); const ed = pb.d; return {
    id: s.id, rank: s.rank, name: s.name, municipality: s.municipality, county: s.county, state: s.state,
    verdict: s.verdict, verdict_reason: s.verdict_reason, track: trackOf(s), units: s.uw.units, acres: Number(s.acres),
    drive: Number(s.drive_min_midtown), lat: Number(s.lat), lon: Number(s.lon),
    yoc: s.uw.yoc_by_tax_structure, max_land: s.uw.max_land_by_tax_structure, land_cost: s.uw.land_cost,
    land_basis: s.uw.land_cost_basis, dscr: s.uw.dscr, approval: s.scores.approval, rent: s.scores.rent_support,
    need: s.scores.need, total: s.scores.total, next_step: s.next_step, short: s.verdict === "Pursue" || s.verdict === "Pursue-structured",
    capital: cp.uses.total, equity: cp.equityCommit, debt: cp.loanCommit, entRisk: ed.risk.score, entBand: ed.risk.band, entPath: ed.pathLabel, like: pb.like, likeBand: pb.likeBand,
  }; });

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <div className="eyebrow">ATCO Senior Living · Site Selection Pipeline</div>
          <h1>RiverSpring-model communities, underwritten site by site across the New York region.</h1>
          <p className="lede">
            Every site answers the three questions an owner asks before an LOI: will the town approve it, are the rents and the need already proven, and does it clear {pct(HURDLE, 1)} yield on cost at a land price we can actually pay.
          </p>
          <div className="funnel">
            <div><div className="n">{funnel.sourced}</div><div className="t">Sourced</div><div className="d">NY ≤2 hr · NJ ≤2 hr · CT ≤2.5 hr</div></div>
            <div><div className="n">{funnel.underwritten}</div><div className="t">Underwritten</div><div className="d">Full pro forma, 3 tax structures</div></div>
            <div><div className="n">{funnel.survive}</div><div className="t">Survive</div><div className="d">Pass gates, viable structure</div></div>
            <div><div className="n" style={{ color: "var(--atco-orange)" }}>{funnel.shortlist}</div><div className="t">Shortlist</div><div className="d">Pursue / Pursue-structured</div></div>
          </div>
          <div className="hero-meta">
            <span>Hurdle <b>{pct(HURDLE, 1)} YOC floor · {pct(TARGET, 1)} target</b></span>
            <span>Drive bands <b>NY {meta.drive_bands_min.NY} · NJ {meta.drive_bands_min.NJ} · CT {meta.drive_bands_min.CT} min</b></span>
            <span>Data as of <b>{longDate(meta.as_of)}</b></span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="grid g4">
            <div className="card kpi"><div className="label">Shortlist</div><div className="v">{shortlist.length} sites</div><div className="s">{pursue.length} Pursue · {shortlist.length - pursue.length} Pursue-structured</div></div>
            <div className="card kpi"><div className="label">Shortlisted units</div><div className="v">{int(shortUnits)}</div><div className="s">{usdM(shortCost, 0)} all-in development cost</div></div>
            <div className="card kpi"><div className="label">Weighted YOC · Pursue</div><div className="v">{pct(wYoc)}</div><div className="s">Fully taxed, cost-weighted; {Math.round((wYoc - HURDLE) * 10000)} bps over floor</div></div>
            <div className="card kpi"><div className="label">Land headroom · Pursue</div><div className="v">{usdM(headroom)}</div><div className="s">Sum of max land at {pct(HURDLE, 1)} less land basis</div></div>
          </div>

          <div className="grid g3" style={{ marginTop: 18 }}>
            <div className="callout brand"><b>What clears.</b> Rental AL/MC pads of ~{protoC} units inside approved master plans clear {pct(HURDLE, 1)} fully taxed in Morris County NJ, Dutchess and northern Westchester.</div>
            <div className="callout brand"><b>What needs structure.</b> IL-led campuses miss as rentals everywhere. They work only with entrance fees, a nonprofit sponsor or PILOT, or ground-leased land: the RiverSpring structure.</div>
            <div className="callout brand"><b>Where the risk sits.</b> Calibrated rent, tax and land indices drive the spread. NIC MAP pulls, rate shops and assessor letters on the shortlist come before any LOI.</div>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="section-head">
            <div><div className="eyebrow">Capital summary</div><h2>The shortlist as a portfolio</h2>
              <p>Stabilized, fully taxed unless the verdict depends on a PILOT, in which case NOI, value and DSCR reflect it. Debt at {pct(assumptions.debt.ltc, 0)} LTC; value at a {pct(assumptions.exit_cap)} exit cap. Entrance-fee campuses are judged on fee coverage and presales, not on rental metrics (n/m), and sit outside the portfolio total.</p></div>
          </div>
          <div className="card"><div className="table-wrap"><table className="t">
            <thead><tr><th>#</th><th>Site</th><th>Structure</th><th className="num">Units</th><th className="num">Total cost</th><th className="num">Cost / unit</th><th className="num">NOI</th><th className="num">YOC</th><th className="num">Value @ exit</th><th className="num">Profit on cost</th><th className="num">Equity</th><th className="num">DSCR</th></tr></thead>
            <tbody>
              {capRows.map(({ s, struct, noi, y, val, ef }) => (
                <tr key={s.id}>
                  <td className="num">{s.rank}</td>
                  <td style={{ minWidth: 200 }}><a href={`/sites/${s.id}`} className="site-name">{s.name}</a><div className="xs muted">{s.municipality}, {s.state}</div></td>
                  <td>{ef ? <span className="tag">Entrance fee · {Math.round(s.uw.entrance_fee.coverage * 100)}% coverage</span> : struct}</td>
                  <td className="num">{s.uw.units}</td><td className="num">{usdM(s.uw.total_cost)}</td><td className="num">${Math.round(s.uw.total_cost / s.uw.units / 1000)}k</td>
                  <td className="num">{ef ? <span className="muted">n/m</span> : usdM(noi, 2)}</td>
                  <td className="num" style={{ fontWeight: 700, color: !ef && y >= HURDLE ? "var(--pursue)" : "var(--ink-2)" }}>{ef ? <span className="muted">n/m</span> : pct(y)}</td>
                  <td className="num">{ef ? <span className="muted">n/m</span> : usdM(val)}</td>
                  <td className="num">{ef ? <span className="muted">n/m</span> : pct(val / s.uw.total_cost - 1, 1)}</td>
                  <td className="num">{usdM(s.uw.equity)}</td>
                  <td className="num">{ef ? <span className="muted">n/m</span> : `${(noi / s.uw.annual_debt_service).toFixed(2)}x`}</td>
                </tr>
              ))}
              {(() => {
                const R = capRows.filter((r) => !r.ef);
                const units = R.reduce((a, r) => a + r.s.uw.units, 0), cost = R.reduce((a, r) => a + r.s.uw.total_cost, 0);
                const noi = R.reduce((a, r) => a + r.noi, 0), val = R.reduce((a, r) => a + r.val, 0), eq = R.reduce((a, r) => a + r.s.uw.equity, 0);
                return (
                  <tr style={{ background: "var(--surface-2)" }}>
                    <td /><td><b>Rental portfolio ({R.length} sites)</b></td><td className="small muted">As structured</td><td className="num"><b>{int(units)}</b></td>
                    <td className="num"><b>{usdM(cost)}</b></td><td className="num"><b>${Math.round(cost / units / 1000)}k</b></td><td className="num"><b>{usdM(noi, 2)}</b></td>
                    <td className="num"><b>{pct(noi / cost)}</b></td><td className="num"><b>{usdM(val)}</b></td><td className="num"><b>{pct(val / cost - 1, 1)}</b></td>
                    <td className="num"><b>{usdM(eq)}</b></td><td />
                  </tr>
                );
              })()}
            </tbody>
          </table></div></div>
        </div>
      </section>

      <section className="section anchor" id="capital" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="section-head">
            <div><div className="eyebrow">Capital deployment</div><h2>How the capital is used</h2>
              <p>Every dollar has a gate, a control and a return. Equity funds pursuit costs first and is committed in full only after approvals; senior loans fund behind it on certified draws. The Excel models show every month and every input.</p></div>
            <a className="btn" href="/models/ATCO-senior-living-portfolio.xlsx" download>Portfolio model (.xlsx)</a>
          </div>
          <PortfolioDeployment shortlist={shortlist} a={assumptions} />
        </div>
      </section>

      <section className="section anchor" id="shortlist">
        <div className="wrap">
          <div className="section-head">
            <div><div className="eyebrow">The Shortlist</div><h2>{["Zero","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten"][shortlist.length] ?? shortlist.length} sites that clear the model</h2>
              <p>Ranked by verdict and composite score. Imagery centers on the underwriting pin; open a dossier for parcel lines, what is nearby, the full pro forma and the live what-if.</p></div>
          </div>
          <div className="card" style={{ marginBottom: 18 }}><div className="table-wrap"><table className="t ic-table">
            <caption className="label" style={{ textAlign: "left", padding: "14px 16px 4px" }}>Investment committee view · base case, {pct(assumptions.exit_cap)} exit cap</caption>
            <thead><tr><th>Site</th><th>Recommendation</th><th className="num">Capital needed</th><th className="num">Equity</th><th className="num">YOC</th><th className="num">Levered IRR</th><th className="num">Approval odds</th><th className="hide-sm">Operator, first call</th><th className="hide-sm">General contractor</th></tr></thead>
            <tbody>{shortlist.map((s) => {
              const cp = capitalPlan(s, assumptions); const pb = playbook(s, assumptions); const f = (icFlags as Record<string, { tone: string; label: string }>)[s.id];
              const fit = (ops.fit as Record<string, { first: string }>)[s.id]; const g = gcFor(s);
              const irr = cp.efCase ? cp.efCase.nonprofit.irrL : cp.irrLevered;
              return (
                <tr key={s.id}>
                  <td style={{ minWidth: 170 }}><a href={`/sites/${s.id}`} className="site-name">{s.municipality}</a><div className="xs muted">{s.id} · {s.uw.units} units</div></td>
                  <td style={{ minWidth: 150 }}>{f ? <span className={`ic-chip ic-${f.tone}`}>{f.label}</span> : <span className="ic-chip ic-go">Advance to LOI</span>}</td>
                  <td className="num">{usdM(cp.uses.total, 1)}</td>
                  <td className="num">{usdM(cp.equityCommit, 1)}</td>
                  <td className="num" style={{ fontWeight: 700 }}>{cp.efCase ? <span className="muted">n/m</span> : pct(cp.yoc)}</td>
                  <td className="num">{pct(irr, 1)}{cp.efCase && <div className="xs muted">nonprofit case</div>}</td>
                  <td className="num">{pb.like}%</td>
                  <td className="small hide-sm">{fit?.first ?? "—"}</td>
                  <td className="small hide-sm">{g.primary.name}</td>
                </tr>); })}</tbody>
          </table></div></div>
          <div className="grid g3">
            {shortlist.map((s) => (
              <a key={s.id} href={`/sites/${s.id}`} className="card shortcard">
                <div className="img" style={{ backgroundImage: `url("${satThumb(Number(s.lat), Number(s.lon), 800, 500)}")` }}>
                  <span className="rank">{s.rank}</span>
                  <VerdictChip v={s.verdict} />
                </div>
                <div className="body">
                  <div>
                    <div className="xs muted" style={{ letterSpacing: ".06em", textTransform: "uppercase", fontWeight: 600 }}>{s.municipality} · {s.county} Co., {s.state}</div>
                    <h3 style={{ marginTop: 4, marginBottom: 0 }}>{s.name}</h3>
                  </div>
                  <div className="small muted">{s.verdict_reason}</div>
                  {(() => { const f = (icFlags as Record<string, { tone: string; label: string }>)[s.id]; return f ? <div className={`ic-chip ic-${f.tone}`}>IC: {f.label}</div> : null; })()}
                  <div className="stats">
                    <div><div className="xs muted">YOC taxed</div><div className="v">{pct(s.uw.yoc)}</div></div>
                    <div><div className="xs muted">{/entrance-fee/.test(s.verdict_reason) ? "Fee coverage" : "PILOT"}</div><div className="v">{/entrance-fee/.test(s.verdict_reason) ? `${Math.round(s.uw.entrance_fee.coverage * 100)}%` : pct(s.uw.yoc_by_tax_structure.pilot)}</div></div>
                    <div><div className="xs muted">Units · ac</div><div className="v">{s.uw.units} · {s.acres}</div></div>
                  </div>
                  {(() => { const pb = playbook(s, assumptions); const first = pb.contacts.find((c) => c.group === "Municipal staff"); return (
                    <div className="approve-strip">
                      <div><span className="xs muted">Town approval</span><b style={{ color: pb.like >= 65 ? "#33772a" : pb.like < 50 ? "#a85a06" : "#2a6ea3" }}>{pb.like}% · {pb.likeBand}</b></div>
                      <div className="xs muted">{pb.d.pathLabel} · ~{Math.round(pb.totalMonths)} mo · pursuit {usdK(pb.d.budgetTotal)}</div>
                      {first && <div className="xs muted">First call: <b style={{ color: "var(--ink-2)" }}>{first.name}</b>{first.phone ? ` · ${first.phone}` : ""}</div>}
                    </div>); })()}
                </div>
              </a>
            ))}
            <div className="card card-pad" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#2D2D2D", color: "#fff", borderColor: "#2D2D2D", position: "relative" }}>
              <div>
                <div className="eyebrow" style={{ color: "var(--atco-orange)" }}>Next 90 days</div>
                <h3 style={{ color: "#fff" }}>From shortlist to LOI</h3>
                <ul style={{ paddingLeft: 18, color: "#d6d6d6", fontSize: 13.5, margin: "10px 0 0" }}>
                  <li>Owner outreach on every shortlisted site; JV terms with master-plan developers on the pads</li>
                  <li>NIC MAP and rate shops for each primary market area</li>
                  <li>Assessor estimate and PILOT term sheet where the spread is thin</li>
                  <li>Zoning opinion and licensure path (NJ CN, NY ALR, CT ALSA)</li>
                </ul>
              </div>
              <a href="/method" className="btn" style={{ marginTop: 16, alignSelf: "flex-start" }}>How we underwrite →</a>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="section-head">
            <div><div className="eyebrow">Why now</div><h2>The market is short on new supply</h2>
              <p>{news.pulse.slice(0, 3).map((p) => `${p.k}: ${p.v}`).join(" · ")}. Latest coverage from the data houses, brokers and the business press.</p></div>
            <a href="/news" className="btn">All market news →</a>
          </div>
          <NewsFeed items={news.items} limit={3} />
          <div className="card card-pad op-teaser" style={{ marginTop: 18 }}>
            <div style={{ minWidth: 0 }}>
              <div className="label">Operator partners</div>
              <div className="small" style={{ marginTop: 4 }}>{ops.partners.map((p) => p.name).join(" · ")}</div>
              <div className="xs muted" style={{ marginTop: 4 }}>{ops.bottomLine}</div>
            </div>
            <a href="/operators" className="btn btn-primary">Who to build with →</a>
          </div>
        </div>
      </section>

      <section className="section anchor" id="pipeline">
        <div className="wrap">
          <div className="section-head">
            <div><div className="eyebrow">Full pipeline</div><h2>All {sites.length} underwritten sites</h2>
              <p>Filter by geography, verdict, track and thresholds. The tax toggle reprices every site under fully taxed, PILOT ({pct(assumptions.tax_structures.pilot, 0)} of taxes) or nonprofit-exempt ({pct(assumptions.tax_structures.nonprofit_exempt, 0)}) treatment.</p></div>
          </div>
          <PipelineExplorer rows={rows} hurdle={HURDLE} target={TARGET} />
        </div>
      </section>
    </>
  );
}
