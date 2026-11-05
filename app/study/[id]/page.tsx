import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ms from "@/data/market-studies.json";
import { siteById } from "@/lib/data";
import { rentEvidence } from "@/components/RentComps";
import { pct, int, longDate } from "@/lib/format";

type Run = { demand: number; unmet: number; capture: number | null };
type Study = (typeof ms.studies)["NJ-04"] & { il: any; local_comps: any; local_comps_src: any; tract: any; occupancy_doh: number | null; with_contingent: Run | null; supply_src_url: string | null };

const ORDER = ms.order as string[];
export function generateStaticParams() { return ORDER.map((id) => ({ id })); }
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const s = siteById((await params).id);
  return { title: s ? `Market study · ${s.municipality}` : "Market study", robots: { index: false } };
}

const cap = (r: Run | null | undefined) => (!r ? "—" : r.capture === null || r.capture === undefined ? "no unmet demand" : r.capture > 1 ? "> 100%" : pct(r.capture, 0));

/** Analyst conclusions per site. Headline capture figures quoted here are checked against data/market-studies.json by tests/run.ts. */
const READ: Record<string, { status: string; tone: "go" | "warn" | "bad" | "info"; lead: string; findings: string[]; absorb: string; next: string[] }> = {
  "NJ-04": {
    status: "Supported, thin", tone: "warn",
    lead: "The 7-mile market has the deepest income-qualified 75+ base of the five sites and the strongest Class A rents. The project needs about 30% of unmet AL/MC demand at a 10% need rate (16% at 12%). That is above the 10–15% lenders like, so the deal works only with pre-leasing and a confirmed rate shop. Woodmont's approved Parsippany building is the swing factor: if it is built, capture rises to about 38%.",
    findings: [
      "Rents are supported: the model's $10,780 private-pay AL rate sits 8% above the Class A median ($9,971) and below The Delaney at The Green ($10,800).",
      "Much of the stock is older product listing at $6,900–7,450 (Brighton Gardens, Brookdale, Juniper Village, Benchmark Roseland). The Delaney at The Green is the newest Class A building, so a new building competes on product, not just price.",
      "Arbor Terrace Florham Park (80 AL/MC, under construction) is counted. Benchmark Cedar Grove (about 9 miles) and Peapack Senior Living (about 15 miles) sit outside the PMA and are not counted, but both draw from the same adult-child catchment and should be tracked as lease-up comps.",
    ],
    absorb: "The model assumes 30 months to stabilization, about 3.5 net move-ins a month. That is at the 2–4 a month industry norm. With capture near 30%, pre-leasing of 30–40% of AL units before opening (deposits from a priority list) is the main mitigant.",
    next: ["Buy a NIC MAP PMA pull (occupancy, rents, pipeline) for the 7-mile ring before LOI.", "Call Woodmont: a JV or purchase of its approval removes the largest supply risk.", "Rate shop the nine comps, including care-level fees."],
  },
  "NJ-10": {
    status: "Not supported at model rents", tone: "bad",
    lead: "Montville's market has about as many 75+ residents as Florham Park's but lower incomes and a larger, cheaper existing stock. The project needs about 33% of unmet demand at a 10% need rate, about 43% if Woodmont is built, and the conservative case shows no unmet demand at all. The bigger problem is rent: listed prices inside this market are mostly $4,500–6,000 a month, far below the $9,680 the model takes from the Morris County Class A set.",
    findings: [
      "The model rent is borrowed from Florham Park's comp set (Madison, Livingston, Summit). Those towns are outside Montville's market. Only Sunrise of Mountain Lakes and Sunrise of West Essex list above $8,000 here.",
      "Weighted 65+ household income across the market is about $89,000, against about $103,000 around Florham Park. About 56% of 65+ households clear $75,000 (62% around Florham Park).",
      "Woodmont's 80 approved AL/MC units in Parsippany are about 4 miles from the site, closer than they are to Florham Park. Benchmark Cedar Grove (opening 2027) is at the eastern edge and is counted at about 90 AL/MC units.",
    ],
    absorb: "At 30 months and about 3.5 move-ins a month, the lease-up assumption is already at the norm, but with local rents 40% below the model a building priced like Florham Park would lease slower. Do not proceed on the Morris comp set.",
    next: ["Rate shop Mira Vie, the Bristal at Wayne, Sunrise of Wayne and Sunrise of Mountain Lakes before any further work.", "Re-underwrite at a local Class A rent (about $8,200) to see whether a PILOT still clears 6.5%.", "Hold behind Florham Park; the two compete for the same Woodmont units."],
  },
  "NY-03": {
    status: "Marginal; partner role only", tone: "warn",
    lead: "Northern Westchester has a solid, mid-income 75+ base, but state data show its licensed AL beds are not full. Across the eight private-pay residences in the market, the DOH-reported census is about 72% of certified beds. The base case needs about 31% of unmet demand (18% at 12% need); the conservative case shows none. The newest buildings lease well (Artis Briarcliff 98%, Artis Somers 92%, The Club at Briarcliff 81%), so the opportunity is product replacement, not unmet need.",
    findings: [
      "Cortlandt itself has no Class A AL. The model's $9,680 equals the Class A median, which comes from Briarcliff and Thornwood, 10–13 miles south.",
      "Weighted 65+ household income is about $97,000; Peekskill ($64,000) and Croton ($74,000) pull it down, Yorktown, Briarcliff and Chappaqua lift it.",
      "Benchmark at Mount Pleasant (114 units, opened November 2025) is the live comp: 46 residents seven months in. Benchmark is also the operator VS Construction has named for this site.",
      "Certified beds overstate operating units (semi-private rooms, wings held offline), so true unit occupancy is higher than 72%. A NIC MAP pull would settle it; NIC MAP is not available to ATCO today.",
    ],
    absorb: "The model's 29 months (about 3.5 a month) is at the norm. Benchmark Mount Pleasant's first seven months (about 6.5 a month gross) show a new Class A building can lease faster than older stock, but its absorption comes partly from this market.",
    next: ["Stay in the partner or fee role (capital or GC to VS Construction and Benchmark) rather than sponsor.", "Ask Benchmark for Mount Pleasant's lease-up curve and rate card.", "Track the Planning Board hearing on the MOD site plan."],
  },
  "CT-02": {
    status: "Supported for a life-plan campus", tone: "go",
    lead: "The Trumbull market's 75+ base is comparable to Florham Park's, incomes are lower, and AL/MC penetration is moderate. The 90 AL/MC units need about 14% of unmet demand at a 10% need rate (10% at 12%), inside the lender band. The 103 IL units need about 13% of income-qualified IL demand. The demand case holds; the conservative case is tighter (about 49% AL/MC capture), and Connecticut capacities are estimated because the state publishes no machine-readable unit counts.",
    findings: [
      "Class A AL lists at a median of $8,963 (Sturges Ridge $11,180, Maplewood at Southport $9,475). The model's $9,680 is 8% above that median, which is inside the 15–20% premium CBRE says new product needs.",
      "65+ incomes vary widely: Easton ($202,000) and Southport ($133,000) at the top, north Bridgeport ($60,000) and south Stratford ($54,000) at the bottom. An entrance-fee campus draws on home equity, so median home values matter more than income here.",
      "No approved-but-unbuilt AL/MC pad was found in the market. The approved Rivers Edge program at this site is the only pipeline item; its approval validity still needs to be confirmed.",
    ],
    absorb: "As an entrance-fee campus the test is presales, not monthly move-ins: 70% of IL units reserved with deposits before construction. The 24-month rental lease-up in the model (about 4 IL and 3.5 AL/MC a month) applies only if the campus is run as a rental, which does not clear the hurdle.",
    next: ["Confirm with Trumbull P&Z that the 4-1 approval is still valid.", "Get unit counts for the 11 competitors from CT DPH (elicense lookup) or a NIC MAP / CBRE study.", "Test presale depth with a nonprofit sponsor's priority-list campaign."],
  },
  "NY-01": {
    status: "Demand supported; rent and Erickson are the risks", tone: "warn",
    lead: "Rye Brook sits in the wealthiest market of the five: weighted 65+ household income of about $115,000, with Purchase, Armonk, Scarsdale and backcountry Greenwich well above that. The 85 AL units need about 10% of unmet demand, and the 126 IL units about 10% of IL demand. But licensed AL beds in the market report about 75% occupancy, recent openings have leased slowly, and Erickson's proposed 834-unit campus in the same village would take most of the IL headroom.",
    findings: [
      "The model's $11,550 AL rate is about 18% above the Class A median ($9,800), at the top of the 15–20% band CBRE gives for new product. Only The Ambassador at Scarsdale has listed higher.",
      "Brightview Harrison opened in November 2024 and reported 71 of 99 beds filled in mid-2026, about 3.7 a month. High Point at Broadview (an LCS campus) reported 20 of 68 after about 16 months.",
      "If Erickson's 834 units go ahead, IL capture at the high propensity case rises from about 7% to about 12%, still workable, but the two campuses would presell to the same households at the same time.",
      "Sunrise is already the contract vendee at 900 King Street, so ATCO's path is fee development or GC with a nonprofit sponsor, not ownership.",
    ],
    absorb: "As an entrance-fee campus, the test is presales: 70% of IL reserved before construction. River's Edge in Riverdale shows deep presale demand for a well-capitalized nonprofit sponsor in this region; the comparison is to the sponsor model, not to its numbers. The AL wing at $11,550 should be underwritten with a 30-month fill, not 24.",
    next: ["Track Erickson's SEQRA review; a denial or downsizing is the single biggest swing in this study.", "Rate shop The Ambassador, Brightview Harrison and Waterstone, including IL monthly fees.", "Keep the role to fee development and GC unless a nonprofit sponsor signs."],
  },
};

export default async function MarketStudy({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const s = siteById(id);
  const m = (ms.studies as unknown as Record<string, Study>)[id];
  if (!s || !m) notFound();
  const r = READ[id];
  const A = ms.method;
  const u = s.uw;
  const mix = (u.lines as { care: string; units: number }[]).map((l) => `${l.units} ${l.care}`).join(" · ");
  const re = rentEvidence(id);
  const comps: [string, string, number | null, string][] = m.local_comps ?? re?.base.comps ?? [];
  const classA = comps.filter((c) => /Class A/.test(c[3]) && c[2]).map((c) => c[2] as number).sort((a, b) => a - b);
  const med = (v: number[]) => (v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2);
  const classAMed = re && !m.local_comps ? re.base.classA_median : classA.length ? med(classA) : null;
  const rentModel = m.rent_model ?? (u.lines as { care: string; monthly_rate: number }[]).find((l) => l.care === "AL")?.monthly_rate;
  const lo = !m.tract;
  const pace = (m.almc_units * 0.91) / u.leaseup_months;
  const doh = m.supply.some((x: any) => x.census !== undefined && x.census !== null);
  const treat: Record<string, string> = { counted: "Counted", counted_part: "Counted (AL/MC share)", contingent: "Contingent: sensitivity", secondary: "Outside PMA: not counted", subject: "This site" };
  return (
    <div className="memo">
      <div className="memo-bar no-print"><a href="/diligence#market-studies">← LP diligence</a><a href={`/sites/${id}`}>Site dossier</a><a className="btn" href={`/studies/ATCO-${id}-market-study.pdf`} download>Download PDF</a></div>
      <article className="memo-page study">
        <header className="memo-head">
          <img src="/brand/atco-logo.png" alt="ATCO" width="94" height="46" />
          <div style={{ textAlign: "right" }}><div className="memo-eyebrow">Internal market study · Confidential</div><div className="xs">{longDate(ms.as_of)} · Site {id}</div></div>
        </header>
        <div className="study-flag">Prepared by ATCO for its own underwriting. This is not a third-party market study or an appraisal, and it is not a substitute for a NIC MAP pull or a study commissioned from CBRE, JLL or a similar firm.</div>
        <h1>Market study: {s.municipality}</h1>
        <div className="memo-sub">{s.name} · {s.county} County, {s.state} · {u.units} units ({mix}) · {s.acres} acres</div>
        <div className={`memo-rec ic-${r.tone}`}><b>Finding: {r.status}.</b> {r.lead}</div>
        <div className="memo-kpis">
          <div><span>Age 75+ in the PMA</span><b>{int(m.pop75)}</b></div>
          <div><span>Income-qualified 75+ households</span><b>{int(m.q75)}</b></div>
          <div><span>Competitive AL/MC units + pipeline</span><b>{int(m.existing)} + {int(m.pipeline_counted)}</b></div>
          <div><span>AL/MC capture · 10% (12%) need</span><b>{cap(m.base)} ({cap(m.hi)})</b></div>
          <div><span>Penetration with this project</span><b>{pct(m.penetration, 1)}</b></div>
          <div><span>Model AL rent vs Class A median</span><b>${int(rentModel)} vs {classAMed ? `$${int(classAMed)}` : "—"}</b></div>
        </div>

        <h2>1 · Primary market area</h2>
        <p className="memo-note" style={{ marginTop: 0 }}><b>{m.pma_label}.</b> {m.pma_why}</p>
        <table className="memo-t full"><thead><tr><th>Town</th><th className="num">Population counted</th><th className="num">75+ (est.)</th><th className="num">65+ household median income</th></tr></thead>
          <tbody>{m.towns.map((t: any) => <tr key={t.name}><td>{t.name}{t.frac < 1 ? <span className="xs muted"> ({Math.round(t.frac * 100)}%)</span> : null}</td><td className="num">{int(t.pop)}</td><td className="num">{int(t.pop75)}</td><td className="num">{t.med65 ? `$${int(t.med65)}` : "—"}{t.zips.length ? <span className="xs muted"> {t.zips.join(", ")}</span> : null}</td></tr>)}
            <tr className="tot"><td>PMA, town method</td><td className="num">{int(m.pma_pop)}</td><td className="num">{int(m.pma_pop75_town)}</td><td className="num">${int(m.med65_weighted)}</td></tr>
          </tbody></table>
        <p className="memo-note xs">Population: 2020 Census, rounded. 75+ by town is the county&apos;s 75+ share applied to town population, which understates affluent suburbs. 65+ medians: ACS 2024 5-year by ZIP, weighted by estimated 75+ population.</p>

        <h2>2 · Age 75+ demographics and income qualification</h2>
        <table className="memo-t full"><tbody>
          <tr><td>Age 75+ in the PMA{m.tract ? " (tract-level ACS, 7-mile ring)" : ` (town method × ${A.cal.toFixed(2)} calibration)`}</td><td className="num"><b>{int(m.pop75)}</b></td></tr>
          {!m.tract && <tr><td className="muted">Conservative case: town method, uncalibrated</td><td className="num muted">{int(m.pma_pop75_town)}</td></tr>}
          <tr><td>75+ households ({A.hh_per_75} per person)</td><td className="num">{int(m.hh75)}</td></tr>
          <tr><td>Share of 65+ households with income ≥ $75,000 (≥ $100,000 · ≥ $150,000)</td><td className="num">{pct(m.share75k, 0)} ({pct(m.share100k, 0)} · {pct(m.share150k, 0)})</td></tr>
          <tr className="tot"><td>Income-qualified 75+ households (≥ $75,000, before home equity)</td><td className="num">{int(m.q75)}</td></tr>
          {m.il && <tr><td>IL-qualified 75+ households (≥ $100,000)</td><td className="num">{int(m.q100)}</td></tr>}
        </tbody></table>
        <p className="memo-note xs">{m.tract ? `Primary figures are tract-level ACS 2024 (B01001, B19037) within 7 miles. The town method gives ${int(m.pma_pop75_town)} people 75+ and a ${pct(m.share75k_town, 0)} qualified share for the same area; this ratio (${A.cal.toFixed(2)}x) calibrates the other four studies.` : `Census tract tables could not be pulled for this study, so 75+ counts are scaled from the town method by the ratio observed at Florham Park (${A.cal.toFixed(2)}x), where both are available. Income shares come from ZIP-level 65+ medians, converted with an income spread calibrated to Florham Park's tract data (it reproduces 61.9% at $75,000 within half a point).`} A $75,000 floor with home equity supports roughly $9,000–10,000 a month of AL for 4–5 years in markets with $550,000+ home values.</p>

        <div className="memo-keep">
        <h2>3 · Existing competitive supply</h2>
        <table className="memo-t full"><thead><tr><th>Community</th><th>Town</th><th>Type</th><th className="num">Units / beds</th>{doh && <th className="num">Census</th>}<th className="num">Opened</th></tr></thead>
          <tbody>{m.supply.map((x: any) => <tr key={x.name}><td>{x.name}</td><td>{x.town}</td><td>{x.type}</td><td className="num">{int(x.units)}{x.basis === "I" ? <span className="xs muted"> est.</span> : null}</td>{doh && <td className="num">{x.census ? `${x.census} (${pct(x.census / x.beds, 0)})` : "—"}</td>}<td className="num">{x.opened ?? "—"}</td></tr>)}
            <tr className="tot"><td colSpan={3}>Existing competitive AL/MC</td><td className="num">{int(m.existing)}</td>{doh && <td className="num">{m.occupancy_doh ? pct(m.occupancy_doh, 0) : ""}</td>}<td></td></tr>
          </tbody></table>
        <p className="memo-note xs">Source: {m.supply_src_url ? <a href={m.supply_src_url}>{m.supply_src}</a> : m.supply_src}. &quot;est.&quot; marks ATCO estimates where capacity is not published.{m.excluded.length ? ` Excluded: ${m.excluded.map((e: any) => `${e[0]} (${e[1]})`).join("; ")}.` : ""}{doh ? " Census is residents reported to DOH against certified beds; certified beds exceed operating units, so this understates unit occupancy." : ""}</p>
        </div>

        <h2>4 · Pipeline</h2>
        <table className="memo-t full"><thead><tr><th>Project</th><th>Program</th><th className="num">Units</th><th className="num">Miles</th><th>Status</th><th>Treatment</th></tr></thead>
          <tbody>{m.pipeline.map((p: any) => <tr key={p.name}><td><a href={p.src}>{p.name}</a></td><td>{p.type}</td><td className="num">{int(p.units)}</td><td className="num">{p.treat === "subject" ? "—" : p.miles === null ? "in village" : p.miles.toFixed(1)}</td><td className="xs">{p.status}</td><td className="xs"><b>{treat[p.treat]}</b></td></tr>)}</tbody></table>
        {id === "NJ-04" || id === "NJ-10" ? <p className="memo-note xs">Woodmont Parsippany&apos;s 80 AL/MC units are approved but unbuilt, so they are treated as contingent supply. Peapack Senior Living (CN July 2026) and Benchmark Cedar Grove are tracked for both Morris County studies.</p> : null}

        <div className="memo-keep">
        <h2>5 · Demand, penetration and capture</h2>
        <table className="memo-t full"><thead><tr><th></th><th className="num">Base</th>{lo && <th className="num">Conservative</th>}</tr></thead><tbody>
          <tr><td>AL/MC demand at a {pct(A.need, 0)} need rate ÷ {pct(A.pma_share, 0)} PMA share</td><td className="num">{int(m.base.demand)}</td>{lo && <td className="num">{int(m.low.demand)}</td>}</tr>
          <tr><td>Less existing and counted pipeline</td><td className="num">−{int(m.existing + m.pipeline_counted)}</td>{lo && <td className="num">−{int(m.existing + m.pipeline_counted)}</td>}</tr>
          <tr className="tot"><td>Unmet AL/MC demand</td><td className="num">{int(m.base.unmet)}</td>{lo && <td className="num">{int(m.low.unmet)}</td>}</tr>
          <tr><td>Capture needed for {m.almc_units} AL/MC units, {pct(A.need, 0)} need</td><td className="num"><b>{cap(m.base)}</b></td>{lo && <td className="num">{cap(m.low)}</td>}</tr>
          <tr><td>Capture at a {pct(A.need_hi, 0)} need rate</td><td className="num">{cap(m.hi)}</td>{lo && <td className="num">{cap(m.low_hi)}</td>}</tr>
          {m.with_contingent && <tr><td>Capture if contingent supply is built (+{m.contingent} units)</td><td className="num">{cap(m.with_contingent)}</td>{lo && <td className="num">—</td>}</tr>}
          <tr><td>Penetration today (existing + pipeline ÷ qualified households)</td><td className="num">{pct(m.penetration_now, 1)}</td>{lo && <td className="num"></td>}</tr>
          <tr><td>Penetration with this project</td><td className="num">{pct(m.penetration, 1)}</td>{lo && <td className="num"></td>}</tr>
        </tbody></table>
        <p className="memo-note xs">Benchmarks: lenders want project capture under 10–15% for AL/MC and treat over 25% as a red flag; AL penetration of 6–10% of qualified households is typical of mature markets.{lo ? " The conservative case uses the uncalibrated town method." : " Demand uses tract-level ACS counts, so no calibrated range is needed."}</p>
        <table className="memo-t full" style={{ marginTop: 8 }}><thead><tr><th>Need rate (share of qualified 75+ households needing AL/MC)</th>{Object.keys(m.grid).map((k) => <th key={k} className="num">{pct(Number(k), 0)}</th>)}</tr></thead>
          <tbody><tr><td>Capture, base supply</td>{Object.values(m.grid).map((g: any, i) => <td key={i} className="num">{cap(g.base)}</td>)}</tr>
            {m.with_contingent && <tr><td>Capture with contingent supply</td>{Object.values(m.grid).map((g: any, i) => <td key={i} className="num">{cap(g.contingent)}</td>)}</tr>}</tbody></table>
        </div>

        {m.il && <div className="memo-keep">
          <h2>6 · Independent living demand (life-plan campus)</h2>
          <table className="memo-t full"><tbody>
            <tr><td>IL-qualified 75+ households (≥ $100,000 income, before home equity)</td><td className="num">{int(m.il.q100)}</td></tr>
            <tr><td>IL demand at {pct(A.il_propensity, 0)} ({pct(A.il_propensity_hi, 1)}) propensity ÷ {pct(A.il_pma_share, 0)} PMA share</td><td className="num">{int(m.il.base.demand)} ({int(m.il.hi.demand)})</td></tr>
            <tr><td>Less existing IL / CCRC units in the market (est.)</td><td className="num">−{int(m.il.supply)}</td></tr>
            <tr className="tot"><td>Capture needed for {m.il.units} IL units</td><td className="num">{cap(m.il.base)} ({cap(m.il.hi)})</td></tr>
            {m.il.with_pipeline && <tr><td>Capture if the {int(m.il.pipeline)}-unit contingent campus is built (high propensity)</td><td className="num">{cap(m.il.with_pipeline)}</td></tr>}
          </tbody></table>
          <p className="memo-note xs">IL supply: {m.il_supply.map((x: any) => `${x.name} ${int(x.units)}${x.basis === "I" ? " (est.)" : ""}`).join("; ")}. Lenders look for IL capture under 15–20%.</p>
        </div>}

        <div className="memo-keep">
        <h2>{m.il ? "7" : "6"} · Rent comparables</h2>
        <table className="memo-t full"><thead><tr><th>Community</th><th>Town</th><th className="num">Listed AL from</th><th>Note</th></tr></thead>
          <tbody><tr className="tot"><td>This site (model, private-pay AL)</td><td>—</td><td className="num">${int(rentModel)}</td><td className="xs">{classAMed ? `${pct(rentModel / classAMed - 1, 0)} vs Class A median` : ""}</td></tr>
            {comps.map((c) => <tr key={c[0]}><td>{c[0]}</td><td>{c[1]}</td><td className="num">{c[2] ? `$${int(c[2])}` : "n/p"}</td><td className="xs">{c[3]}</td></tr>)}</tbody></table>
        <p className="memo-note xs">Listed starting prices from public directories, before level-of-care fees ($1,000–3,500 a month); not a rate shop. Sources: {(m.local_comps_src ?? re?.base.src ?? []).map((x: any, i: number) => <span key={x[1]}>{i ? "; " : ""}<a href={x[1]}>{x[0]}</a></span>)}.{id === "NJ-10" ? " The Morris County Class A set used by the model (median $9,971) is in the Florham Park study." : ""}</p>
        </div>

        <h2>{m.il ? "8" : "7"} · Absorption</h2>
        <p className="memo-note" style={{ marginTop: 0 }}>{r.absorb} Implied pace for the AL/MC wing: about {pace.toFixed(1)} net move-ins a month to {pct(0.91, 0)} occupancy in {u.leaseup_months} months.</p>

        <div className="memo-keep">
        <h2>{m.il ? "9" : "8"} · Findings and next steps</h2>
        <ul>{r.findings.map((f) => <li key={f.slice(0, 40)}>{f}</li>)}</ul>
        <ol style={{ marginTop: 6 }}>{r.next.map((n) => <li key={n}>{n}</li>)}</ol>
        </div>

        <h2>Method, sources and limits</h2>
        <p className="memo-note xs" style={{ marginTop: 0 }}>Demand follows the standard AL/MC method: income-qualified 75+ households × share needing help with daily living ÷ share of move-ins from the PMA, less existing and pipeline competitive units (see /method). National context: NIC MAP reports senior housing occupancy above 90% in 3Q26 and the fewest units under construction since 2012; CBRE&apos;s H1 2026 survey puts Class A AL cap rates at 6.5% and says new development needs rents 15–20% above market. <b>NIC MAP PMA data (property-level occupancy, rents and pipeline) is not available to ATCO</b>; occupancy above comes from New York State DOH filings where they exist. CoStar was not used. Census API access was not available, so 75+ counts outside Florham Park are estimates calibrated to Florham Park&apos;s tract data. Every [est.] figure should be replaced by a NIC MAP pull or a third-party study before LOI. ATCO is not affiliated with RiverSpring Living; RiverSpring is referenced only as the inspiration for the program.</p>
        <footer className="memo-foot">ATCO Properties &amp; Management · Internal market study for screening, not a third-party study, appraisal, offer or investment advice. Site dossier: senior-living-pipeline-1cia.vercel.app/sites/{id} · IC memo: /memos/ATCO-{id}-IC-memo.pdf</footer>
      </article>
    </div>
  );
}
