import PipelineExplorer, { type Row } from "@/components/PipelineExplorer";
import { VerdictChip } from "@/components/ui";
import { sites, shortlist, funnel, meta, HURDLE, TARGET, trackOf, satThumb, assumptions } from "@/lib/data";
import { pct, usdM, int } from "@/lib/format";

export default function Home() {
  const pursue = sites.filter((s) => s.verdict === "Pursue");
  const wYoc = pursue.reduce((a, s) => a + s.uw.noi, 0) / pursue.reduce((a, s) => a + s.uw.total_cost, 0);
  const headroom = pursue.reduce((a, s) => a + (s.uw.land_cushion || 0), 0);
  const shortUnits = shortlist.reduce((a, s) => a + s.uw.units, 0);
  const protoC = Object.values<number>(assumptions.prototypes.C.mix).reduce((x, y) => x + y, 0);
  const shortCost = shortlist.reduce((a, s) => a + s.uw.total_cost, 0);

  const rows: Row[] = sites.map((s) => ({
    id: s.id, rank: s.rank, name: s.name, municipality: s.municipality, county: s.county, state: s.state,
    verdict: s.verdict, verdict_reason: s.verdict_reason, track: trackOf(s), units: s.uw.units, acres: Number(s.acres),
    drive: Number(s.drive_min_midtown), lat: Number(s.lat), lon: Number(s.lon),
    yoc: s.uw.yoc_by_tax_structure, max_land: s.uw.max_land_by_tax_structure, land_cost: s.uw.land_cost,
    land_basis: s.uw.land_cost_basis, dscr: s.uw.dscr, approval: s.scores.approval, rent: s.scores.rent_support,
    need: s.scores.need, total: s.scores.total, next_step: s.next_step, short: s.verdict === "Pursue" || s.verdict === "Pursue-structured",
  }));

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
            <div><div className="n" style={{ color: "var(--brass-soft)" }}>{funnel.shortlist}</div><div className="t">Shortlist</div><div className="d">Pursue / Pursue-structured</div></div>
          </div>
          <div className="hero-meta">
            <span>Hurdle <b>{pct(HURDLE, 1)} YOC floor · {pct(TARGET, 1)} target</b></span>
            <span>Drive bands <b>NY {meta.drive_bands_min.NY} · NJ {meta.drive_bands_min.NJ} · CT {meta.drive_bands_min.CT} min</b></span>
            <span>Data as of <b>{meta.as_of}</b></span>
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
            <div className="callout navy"><b>What clears.</b> Rental AL/MC pads of ~{protoC} units inside approved master plans clear {pct(HURDLE, 1)} fully taxed in Morris County NJ, Dutchess and northern Westchester.</div>
            <div className="callout navy"><b>What needs structure.</b> IL-led campuses miss as rentals everywhere. They work only with entrance fees, a nonprofit sponsor or PILOT, or ground-leased land: the RiverSpring structure.</div>
            <div className="callout navy"><b>Where the risk sits.</b> Calibrated rent, tax and land indices drive the spread. NIC MAP pulls, rate shops and assessor letters on the shortlist come before any LOI.</div>
          </div>
        </div>
      </section>

      <section className="section anchor" id="shortlist">
        <div className="wrap">
          <div className="section-head">
            <div><div className="eyebrow">The Shortlist</div><h2>{["Zero","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten"][shortlist.length] ?? shortlist.length} sites that clear the model</h2>
              <p>Ranked by verdict and composite score. Imagery centers on the underwriting pin; open a dossier for parcel lines, what is nearby, the full pro forma and the live what-if.</p></div>
          </div>
          <div className="grid g3">
            {shortlist.map((s) => (
              <a key={s.id} href={`/sites/${s.id}`} className="card shortcard">
                <div className="img" style={{ backgroundImage: `url("${satThumb(Number(s.lat), Number(s.lon))}")` }}>
                  <span className="rank">{s.rank}</span>
                  <VerdictChip v={s.verdict} />
                </div>
                <div className="body">
                  <div>
                    <div className="xs muted" style={{ letterSpacing: ".06em", textTransform: "uppercase", fontWeight: 600 }}>{s.municipality} · {s.county} Co., {s.state}</div>
                    <h3 style={{ marginTop: 4, marginBottom: 0 }}>{s.name}</h3>
                  </div>
                  <div className="small muted">{s.verdict_reason}</div>
                  <div className="stats">
                    <div><div className="xs muted">YOC taxed</div><div className="v">{pct(s.uw.yoc)}</div></div>
                    <div><div className="xs muted">{/entrance-fee/.test(s.verdict_reason) ? "Fee coverage" : "PILOT"}</div><div className="v">{/entrance-fee/.test(s.verdict_reason) ? `${Math.round(s.uw.entrance_fee.coverage * 100)}%` : pct(s.uw.yoc_by_tax_structure.pilot)}</div></div>
                    <div><div className="xs muted">Units · ac</div><div className="v">{s.uw.units} · {s.acres}</div></div>
                  </div>
                </div>
              </a>
            ))}
            <div className="card card-pad" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", background: "var(--navy-800)", color: "#fff", borderColor: "var(--navy-800)" }}>
              <div>
                <div className="eyebrow" style={{ color: "var(--brass-soft)" }}>Next 90 days</div>
                <h3 style={{ color: "#fff" }}>From shortlist to LOI</h3>
                <ul style={{ paddingLeft: 18, color: "#c9d2df", fontSize: 13.5, margin: "10px 0 0" }}>
                  <li>Owner outreach on all seven; JV terms with master-plan developers on the pads</li>
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
