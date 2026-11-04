import type { Metadata } from "next";
import ev from "@/data/lp-evidence.json";
import icFlags from "@/data/ic-flags.json";
import { siteById, markets, assumptions, HURDLE } from "@/lib/data";
import { capitalPlan, CAP } from "@/lib/capital";
import { underwrite } from "@/lib/underwrite";
import { structuring } from "@/lib/structuring";
import { waterfall } from "@/lib/waterfall";
import { buildMassing } from "@/lib/massing";
import { absorptionFor } from "@/components/Absorption";
import abData from "@/data/absorption.json";
import { pct, usdM, int, mult } from "@/lib/format";

export const metadata: Metadata = { title: "Anchor deal · Florham Park", description: "The Florham Park AL/MC pad as an investable deal: test fit, sources and uses, schedule, PILOT path and risk register." };

const ID = "NJ-04";
const START_YEAR = 2027; // same calendar as the portfolio capital plan
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const when = (m: number) => `${MON[m % 12]} ${START_YEAR + Math.floor(m / 12)}`;

function PlanSvg({ m, acres }: { m: ReturnType<typeof buildMassing>; acres: number }) {
  const feats = m.parts.features as any[];
  const lat0 = m.center[1], mLat = 110540, mLon = 111320 * Math.cos((lat0 * Math.PI) / 180);
  const xy = ([lon, lat]: number[]) => [(lon - m.center[0]) * mLon, -(lat - lat0) * mLat];
  const side = Math.sqrt(acres * 4046.86); // square-equivalent site, m
  const pad = side / 2 + 8;
  const col: Record<string, string> = { AL: "#F7901E", MC: "#403393", IL: "#3D86C6" };
  return (
    <svg viewBox={`${-pad} ${-pad} ${pad * 2} ${pad * 2}`} role="img" aria-label={`Plan-view test fit on a ${acres}-acre site`} style={{ width: "100%", maxWidth: 460, display: "block", margin: "0 auto" }}>
      <rect x={-side / 2} y={-side / 2} width={side} height={side} fill="none" stroke="var(--muted, #888)" strokeDasharray="4 3" strokeWidth={0.8} />
      <text x={-side / 2} y={-side / 2 - 3} fontSize={3.6} fill="currentColor">{acres}-acre pad (square equivalent, {Math.round(side / 0.3048)} ft a side)</text>
      {feats.map((f, i) => {
        const pts = f.geometry.coordinates[0].map(xy).map((p: number[]) => p.join(",")).join(" ");
        const k = f.properties.kind, c = f.properties.care;
        return <polygon key={i} points={pts} fill={k === "building" ? col[c] || "#999" : k === "court" ? "#76B96A" : "#c9ccd3"} fillOpacity={k === "parking" ? 0.6 : 0.85} stroke="#fff" strokeWidth={0.6} />;
      })}
    </svg>
  );
}

export default function Anchor() {
  const s = siteById(ID)!;
  const a = assumptions, u = s.uw;
  const ft = capitalPlan(s, a, "Fully taxed"), pl = capitalPlan(s, a, "PILOT");
  const wft = waterfall(ft.levCF), wpl = waterfall(pl.levCF);
  const st = structuring(s, markets, a)!;
  const gmp = st.opts.find((o) => o.key === "gmp")!, gp = st.opts.find((o) => o.key === "gmp_pilot")!;
  const flag = (icFlags as Record<string, { text: string }>)[ID];
  const ctl = (ev.control as any)[ID], rdv = (ev.redevelopment as any)[ID];
  const lines = (u.lines as { care: string; units: number }[]).map((l) => ({ care: l.care, units: l.units }));
  const staff = Math.round(u.units * 0.35);
  const parking = Math.round(u.units * 0.25 + staff * 0.5);
  const mass = buildMassing([Number(s.lon), Number(s.lat)], lines, Object.fromEntries(Object.entries<any>(a.care_levels).map(([k, v]) => [k, v.gsf_per_unit])), Number(s.acres), parking);
  const ms = mass.stats;
  const P = ft.P, B = ft.B, L = ft.L, N = ft.N;
  const taxSave = u.taxes * (1 - a.tax_structures.pilot);
  const ab = absorptionFor(ID)!;
  const abBase = ab.run(abData.assumptions.needRate, u.units), abWood = ab.run(abData.assumptions.needRate, u.units, ab.contingent);
  const none = st.opts.find((o) => o.key === "none")!;
  // hard-cost overrun (with contingency, soft cost and carry that scale with it) that takes YOC to the floor
  let lo = 0, hi = 0.6;
  for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; if (underwrite(s, markets, a, { hardCostPsf: a.hard_cost_psf * (1 + mid) }).yoc >= HURDLE) lo = mid; else hi = mid; }
  const hcRoom = lo;

  const uses: [string, number][] = [["Land (pad carve-out)", ft.uses.land], ["Hard cost", ft.uses.hard], ["Site work", ft.uses.siteWork], ["Contingency", ft.uses.contingency], ["FF&E", ft.uses.ffe], ["Soft cost", ft.uses.soft], ["Construction interest", ft.uses.interest], ["Lease-up reserve", ft.uses.leaseup]];
  const src: [string, number, number][] = [["Senior construction loan", ft.loanCommit, pl.loanCommit], [`LP equity (${pct(CAP.lpShare, 0)})`, ft.lp, pl.lp], [`GP equity, ATCO and operator (${pct(1 - CAP.lpShare, 0)})`, ft.gp, pl.gp]];

  const gantt: [string, number, number, string][] = [
    ["Exclusive LOI with Garden Homes", 0, 3, "ctl"],
    ["Operator LOI (Engel Burman lead)", 1, 4, "ctl"],
    ["Redevelopment plan amended to add the AL/MC pad", 1, 7, "ent"],
    ["Expedited CN for AL beds (10% Medicaid commitment)", 2, 8, "ent"],
    ["Site plan approval, Planning Board", 4, P, "ent"],
    ["Redeveloper agreement and PILOT financial agreement", 5, P, "ent"],
    ["Design development, GC pricing to GMP", 2, P, "cap"],
    ["Financial close: GMP, construction loan, LP equity", P - 1, P, "cap"],
    ["Construction", P, P + B, "bld"],
    ["Pre-leasing (target 30% of AL deposits at opening; not credited)", P + B - 9, P + B, "lse"],
    ["Lease-up to stabilization", P + B, N, "lse"],
    ["Sale or HUD 232 take-out", N - 1, N + 1, "cap"],
  ];
  const gcol: Record<string, string> = { ctl: "#76B96A", ent: "#403393", cap: "#3D86C6", bld: "#F7901E", lse: "#BB2034" };
  const span = N + 2;

  const pilot: [string, string, string][] = [
    ["1", "Area in need of redevelopment", "Done. Borough Resolution 20-94 covers the ASCO site."],
    ["2", "Redevelopment plan", "The ASCO / 50 Hanover Road plan is in draft. Ask the Borough to permit AL/MC on a 4–5 acre pad inside it before adoption; the Planning Board reviews for consistency with the master plan, then Council adopts by ordinance."],
    ["3", "Designated redeveloper", "Council names ATCO (or the ATCO / Garden Homes JV) redeveloper for the pad and signs a redevelopment agreement: program, schedule, design standards and the 10% Medicaid AL commitment."],
    ["4", "Financial agreement (N.J.S.A. 40A:20)", "The project entity applies for a long-term tax exemption. Council approves the financial agreement by ordinance. The annual service charge is a percentage of gross revenue or of project cost, stepping up over a term of up to 30 years from completion; 5% goes to Morris County."],
    ["5", "Underwriting rule", `Model the PILOT at ${pct(a.tax_structures.pilot, 0)} of full taxes (about $${int(Math.round(taxSave / 1000))}K a year saved). Close fully taxed (${pct(u.yoc)} YOC, which already clears) and treat the PILOT as upside until the ordinance passes.`],
  ];

  const risks: [string, "High" | "Med" | "Low", "High" | "Med" | "Low", string, string][] = [
    ["Absorption: Arbor Terrace's 100 AL beds approved in the same borough", "High", "High", `The project needs about ${pct(abBase.capture, 0)} of unmet demand in the 7-mile market (lenders like 10–15%), or ${pct(abWood.capture, 0)} if Woodmont's approved, unbuilt 80 AL/MC units in Parsippany are built. This is the weakest point in the deal. Mitigants: NIC MAP pull before LOI, partner on Woodmont rather than compete with it, 9 months of pre-leasing (not credited in the model), and a lease-up reserve sized to ${u.leaseup_months} months.`, "Ben / operator"],
    ["Rents below the Class A comp range", "Low", "High", `Model AL rent $${int((ev.rents as any)[ID].model)} a month sits inside the public comp range (The Delaney, Sunrise, Brookdale). Breakeven at ${pct(u.breakeven_rent_ratio, 0)} of modeled rent. Operator rate shop before LOI.`, "Operator"],
    ["Hard-cost overrun", "Med", "High", `Model hard cost is $${int(Math.round(u.hard / u.gsf))}/SF, in Weitz's national mid-level AL range ($280–356) and below its high-level range ($363–452), before any New York-area premium. For a Class A building that is the most aggressive input after rents. Hard cost can rise about ${pct(hcRoom, 0)} before YOC falls to ${pct(HURDLE, 1)}. GMP at financial close; combined downside with a GMP still returns ${usdM(gmp.down.profit, 1)}. CSI budget outline is ready for KBE or IMC to price.`, "ATCO construction"],
    ["Redevelopment plan adopted without the AL/MC pad", "Med", "High", "Make the pad a condition of the Garden Homes LOI; brief the Borough planner before the draft plan goes to the Planning Board. Arbor Terrace shows the Borough has approved AL.", "Ben / land-use counsel"],
    ["PILOT not granted", "Med", "Low", `The deal clears ${pct(HURDLE, 1)} fully taxed; a PILOT is upside (YOC ${pct(u.yoc_by_tax_structure.pilot)}), not a condition.`, "Land-use counsel"],
    ["CN delay or Medicaid condition", "Low", "Med", "Expedited CN track for AL; the 10% Medicaid occupancy within 3 years is already in the underwriting.", "ATCO / operator"],
    ["Land price above max land", "Low", "High", `Land is underwritten at ${usdM(u.land_cost, 1)} (county comp per unit) against a max land of ${usdM(u.max_land, 1)}. Garden Homes' recorded basis is about $${int(Math.round(33.43e6 / 55 / 1000))}K–$${int(Math.round(45.81e6 / 55 / 1000))}K an acre, or ${usdM(33.43e6 / 55 * Number(s.acres), 1)}–${usdM(45.81e6 / 55 * Number(s.acres), 1)} for ${s.acres} acres pro rata, so the model's land price leaves room for Garden Homes' profit. Fix the price in the LOI.`, "Ben"],
    ["Rates and exit cap", "Med", "Med", `Exit at ${pct(a.exit_cap, 1)}; the +50 bps case is in the downside. Buy a rate cap at close; HUD 232 take-out at DSCR ${ft.perm.dscr.toFixed(2)}x.`, "ATCO capital markets"],
  ];
  const rc = { High: "bad", Med: "warn", Low: "go" } as const;

  return (
    <section className="section">
      <div className="wrap">
        <div className="section-head"><div>
          <div className="eyebrow">Anchor deal · {s.id}</div><h2>Florham Park: 114-unit AL/MC pad at the former ASCO HQ</h2>
          <p>{ctl.owner.split(" (")[0]} owns the 55-acre site. ATCO takes a {s.acres}-acre pad by JV or carve-out. This is the only site that clears {pct(HURDLE, 1)} fully taxed, and its redevelopment designation makes a PILOT available on top.</p>
          <p><b>Who it serves.</b> {lines.map((l) => `${l.units} ${l.care === "AL" ? "assisted living" : l.care === "MC" ? "memory care" : l.care} apartments`).join(" and ")}, about {Math.round((lines.find((l) => l.care === "AL")?.units || 0) * 0.1)} of the assisted living apartments held for Medicaid residents under New Jersey&apos;s certificate-of-need condition, next door to Garden Homes&apos; 305 age-restricted homes, so residents there can add care without leaving the community.</p>
        </div></div>

        <div className="card grid g4" style={{ marginBottom: 14 }}>
          <div className="kpi"><div className="label">Total capital</div><div className="v">{usdM(ft.uses.total, 1)}</div></div>
          <div className="kpi"><div className="label">YOC fully taxed · PILOT</div><div className="v">{pct(ft.yoc)} · {pct(pl.yoc)}</div></div>
          <div className="kpi"><div className="label">LP net IRR · fully taxed</div><div className="v">{pct(wft.lpIrr, 1)}</div></div>
          <div className="kpi"><div className="label">Downside profit, GMP · + PILOT</div><div className="v">{usdM(gmp.down.profit, 1)} · {usdM(gp.down.profit, 1)}</div></div>
        </div>
        <p className="small" style={{ marginBottom: 24 }}><a className="btn" href={`/memo/${ID}`}>IC memo</a> <a className="btn" href={`/sites/${ID}`}>Full dossier and 3D</a> <a className="btn" href="/models/ATCO-NJ-04-GC-budget.xlsx" download>GC budget (.xlsx)</a> <a className="btn" href={`/models/ATCO-${ID}-proforma.xlsx`} download>Pro forma (.xlsx)</a></p>

        <div className="callout" style={{ marginBottom: 24 }}><b>Where an LP will push.</b> (1) Absorption: about {pct(abBase.capture, 0)} capture of unmet demand, {pct(abWood.capture, 0)} if Woodmont builds, against a 10–15% lender norm; a NIC MAP pull decides it. (2) Rents and hard cost are public-comp checks, not a rate shop or a GC number. (3) No site control yet. (4) The thin {usdM(gmp.down.profit, 1)} GMP-only downside cushion widens to {usdM(gp.down.profit, 1)} only once the PILOT ordinance passes. Each has a gate below; nothing past pursuit cost is spent until they clear.</div>

        <h3 className="anchor" id="test-fit">1 · Test fit</h3>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 18, marginBottom: 24 }}>
          <div className="card card-pad"><PlanSvg m={mass} acres={Number(s.acres)} />
            <div className="xs muted" style={{ marginTop: 8 }}><span style={{ color: "#F7901E" }}>■</span> AL, 3 stories · <span style={{ color: "#403393" }}>■</span> MC, 2 stories · <span style={{ color: "#76B96A" }}>■</span> courtyard · <span style={{ color: "#9aa0a6" }}>■</span> parking. Illustrative massing from the unit mix, not a site plan.</div></div>
          <div className="card"><div className="table-wrap"><table className="t">
            <tbody>
              {lines.map((l) => <tr key={l.care}><td>{l.care === "AL" ? "Assisted living" : l.care === "MC" ? "Memory care" : l.care} units</td><td className="num">{l.units}</td></tr>)}
              <tr><td>Gross building area</td><td className="num">{int(Math.round(u.gsf))} SF ({int(Math.round(u.gsf / u.units))} SF a unit)</td></tr>
              <tr><td>Footprint · coverage</td><td className="num">{int(Math.round(ms.footprintSf))} SF · {pct(ms.coveragePct, 0)}</td></tr>
              <tr><td>FAR</td><td className="num">{ms.far.toFixed(2)}</td></tr>
              <tr><td>Height</td><td className="num">{ms.maxStories} stories, about {Math.round(ms.heightFt)} ft</td></tr>
              <tr><td>Parking</td><td className="num">{ms.parking} spaces (0.25 a unit + 0.5 a staff member)</td></tr>
              <tr><td>Open space</td><td className="num">{pct(ms.openSpacePct, 0)} of the pad</td></tr>
              <tr><td>Utilities</td><td className="num">Public water and sewer</td></tr>
            </tbody></table></div>
            <p className="xs muted card-pad" style={{ margin: 0 }}>The pad sits inside Garden Homes&apos; 305-unit age-restricted community, so AL and MC give its buyers a continuum of care on the same campus. Setbacks, grading and access come with the civil and zoning work.</p></div>
        </div>

        <h3 className="anchor" id="sources-uses">2 · Sources and uses</h3>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 18, marginBottom: 24 }}>
          <div className="card"><div className="table-wrap"><table className="t">
            <thead><tr><th>Uses</th><th className="num">Total</th><th className="num">$ / unit</th><th className="num">%</th></tr></thead>
            <tbody>{uses.map(([k, v]) => <tr key={k}><td>{k}</td><td className="num">{usdM(v, 2)}</td><td className="num">${int(Math.round(v / u.units / 1000))}K</td><td className="num">{pct(v / ft.uses.total, 0)}</td></tr>)}
              <tr className="row-base"><td><b>Total</b></td><td className="num"><b>{usdM(ft.uses.total, 2)}</b></td><td className="num"><b>${int(Math.round(ft.uses.total / u.units / 1000))}K</b></td><td className="num">100%</td></tr></tbody>
          </table></div></div>
          <div className="card"><div className="table-wrap"><table className="t">
            <thead><tr><th>Sources</th><th className="num">Fully taxed</th><th className="num">With PILOT</th></tr></thead>
            <tbody>{src.map(([k, a1, a2]) => <tr key={k}><td>{k}</td><td className="num">{usdM(a1, 2)}</td><td className="num">{usdM(a2, 2)}</td></tr>)}
              <tr className="row-base"><td><b>Total</b></td><td className="num"><b>{usdM(ft.loanCommit + ft.equityCommit, 2)}</b></td><td className="num"><b>{usdM(pl.loanCommit + pl.equityCommit, 2)}</b></td></tr>
              <tr><td>Loan to cost</td><td className="num">{pct(ft.loanCommit / ft.uses.total, 0)}</td><td className="num">{pct(pl.loanCommit / pl.uses.total, 0)}</td></tr>
              <tr><td>Stabilized NOI</td><td className="num">{usdM(ft.noi, 2)}</td><td className="num">{usdM(pl.noi, 2)}</td></tr>
              <tr><td>Project levered IRR · multiple</td><td className="num">{pct(ft.irrLevered, 1)} · {mult(ft.equityMultiple)}</td><td className="num">{pct(pl.irrLevered, 1)} · {mult(pl.equityMultiple)}</td></tr>
              <tr><td>LP net IRR · multiple</td><td className="num">{pct(wft.lpIrr, 1)} · {mult(wft.lpMultiple)}</td><td className="num">{pct(wpl.lpIrr, 1)} · {mult(wpl.lpMultiple)}</td></tr>
              <tr><td>Project levered IRR at 50% LTC</td><td className="num">{pct(none.base.irrL50, 1)}</td><td className="num">{pct(gp.base.irrL50, 1)}</td></tr>
              <tr><td>At risk before approvals</td><td className="num">{usdM(ft.atRiskPreEntitlement, 2)}</td><td className="num">{usdM(pl.atRiskPreEntitlement, 2)}</td></tr></tbody>
          </table></div></div>
        </div>

        <h3 className="anchor" id="schedule">3 · Schedule</h3>
        <div className="card card-pad" tabIndex={0} role="region" aria-label="Project schedule" style={{ marginBottom: 8, overflowX: "auto" }}>
          <div style={{ minWidth: 560 }}>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(170px, 34%) 1fr", fontSize: 11, color: "var(--muted)" }}>
              <div />
              <div style={{ position: "relative", height: 16 }}>{Array.from({ length: Math.ceil(span / 12) + 1 }, (_, y) => <span key={y} style={{ position: "absolute", left: `${(y * 12 / span) * 100}%` }}>{START_YEAR + y}</span>)}</div>
            </div>
            {gantt.map(([t, a0, a1, k]) => (
              <div key={t} style={{ display: "grid", gridTemplateColumns: "minmax(170px, 34%) 1fr", alignItems: "center", borderTop: "1px solid var(--line, #e5e7eb)", padding: "5px 0" }}>
                <div className="small" style={{ paddingRight: 8 }}>{t}<div className="xs muted">{when(a0)} – {when(Math.max(a0, a1 - 1))}</div></div>
                <div style={{ position: "relative", height: 14, background: "repeating-linear-gradient(90deg, transparent 0, transparent calc(100%/" + span + "*12 - 1px), var(--line, #e5e7eb) calc(100%/" + span + "*12 - 1px), var(--line, #e5e7eb) calc(100%/" + span + "*12))" }}>
                  <div style={{ position: "absolute", left: `${(a0 / span) * 100}%`, width: `${Math.max(1.2, ((a1 - a0) / span) * 100)}%`, top: 1, bottom: 1, background: gcol[k], borderRadius: 3 }} />
                </div>
              </div>))}
          </div>
        </div>
        <p className="small" style={{ marginBottom: 24 }}>{P} months from LOI to financial close, {B} months to build, {L} months of lease-up at the industry-norm pace, then a sale or HUD 232 take-out at month {N} ({when(N)}). Approvals run in parallel; the only critical-path items are the plan amendment and the CN, which both have to land before the GMP and the loan close. Month 0 is {when(0)}.</p>

        <h3 className="anchor" id="pilot">4 · PILOT path</h3>
        <p className="small">{rdv.text}</p>
        <div className="card" style={{ marginBottom: 24 }}><div className="table-wrap"><table className="t">
          <thead><tr><th>#</th><th>Step</th><th>What happens</th></tr></thead>
          <tbody>{pilot.map(([n, t, d]) => <tr key={n}><td>{n}</td><td style={{ minWidth: 150 }}><b>{t}</b>{n === "1" && <> <span className="ic-chip ic-go">Done</span></>}</td><td className="small">{d}</td></tr>)}</tbody>
        </table></div></div>

        <h3 className="anchor" id="risks">5 · Risk register</h3>
        <div className="card" style={{ marginBottom: 24 }}><div className="table-wrap"><table className="t">
          <thead><tr><th>Risk</th><th>Odds</th><th>Impact</th><th>Mitigant and evidence</th><th className="hide-sm">Owner</th></tr></thead>
          <tbody>{risks.map(([r, l, i, m, o]) => <tr key={r}><td style={{ minWidth: 150 }}><b>{r}</b></td><td><span className={`ic-chip ic-${rc[l]}`}>{l}</span></td><td><span className={`ic-chip ic-${rc[i]}`}>{i}</span></td><td className="small">{m}</td><td className="small hide-sm">{o}</td></tr>)}</tbody>
        </table></div></div>

        <h3 className="anchor" id="gates">6 · Gates before ATCO commits more capital</h3>
        <div className="card card-pad"><ol className="small" style={{ margin: 0, paddingLeft: 18 }}>
          <li><b>LOI gate:</b> NIC MAP pull confirms rents and occupancy; operator rate shop; Garden Homes exclusive LOI at a fixed land price at or below {usdM(u.max_land, 1)}.</li>
          <li><b>Approval gate:</b> redevelopment plan adopted with the pad; CN granted; site plan approved. About {usdM(ft.atRiskPreEntitlement, 2)} is spent before this gate.</li>
          <li><b>Close gate:</b> GMP from KBE or IMC within the budget; construction loan term sheet at {pct(ft.loanCommit / ft.uses.total, 0)} LTC or lower; operator management agreement signed.</li>
        </ol></div>
      </div>
    </section>
  );
}
