import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SiteMap from "@/components/SiteMap";
import WhatIf from "@/components/WhatIf";
import Diligence from "@/components/Diligence";
import { VerdictChip, I, NV, Bar, SectionHead, Evidence } from "@/components/ui";
import { sites, siteById, marketOf, markets, assumptions, comps, HURDLE, TARGET, VERDICT_COLOR, STATE_NAME, breakevenLine, trackOf, isShortlist } from "@/lib/data";
import { pct, usdM, usdK, usd, int, mult } from "@/lib/format";

export function generateStaticParams() {
  return sites.map((s) => ({ id: s.id }));
}
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const s = siteById(id);
  return s ? { title: `${s.name}, ${s.municipality}`, description: `${s.verdict}: ${s.verdict_reason}. YOC ${(s.uw.yoc * 100).toFixed(2)}% fully taxed.` } : {};
}

const COST_COLORS = ["#13243d", "#2a4468", "#43628c", "#6e8bb0", "#a3b6cf", "#c9ad7d", "#a8844a", "#7a5d2c"];

function Hbar({ items, max, hurdle, target }: { items: { label: string; v: number; note?: string }[]; max: number; hurdle: number; target?: number }) {
  const x = (v: number) => `${Math.max(0, Math.min(1, v / max)) * 100}%`;
  return (
    <div className="grid" style={{ gap: 12 }}>
      {items.map((it) => (
        <div key={it.label}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
            <span>{it.label}{it.note && <span className="muted xs"> · {it.note}</span>}</span>
            <b className="tnum" style={{ color: it.v >= hurdle ? "var(--pursue)" : "var(--danger)" }}>{pct(it.v)}</b>
          </div>
          <div style={{ position: "relative", height: 14, background: "#efebe3", borderRadius: 4 }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: x(it.v), background: it.v >= hurdle ? "#1E8A5A" : "#98A1AB", borderRadius: 4 }} />
            <div title={`${pct(hurdle, 1)} floor`} style={{ position: "absolute", left: x(hurdle), top: -3, bottom: -3, borderLeft: "2px dashed #b4372f" }} />
            {target && <div title={`${pct(target, 1)} target`} style={{ position: "absolute", left: x(target), top: -3, bottom: -3, borderLeft: "2px dashed #a8844a" }} />}
          </div>
        </div>
      ))}
      <div className="xs muted"><span style={{ borderLeft: "2px dashed #b4372f", paddingLeft: 6 }}>{pct(hurdle, 1)} floor</span>{target && <span style={{ borderLeft: "2px dashed #a8844a", paddingLeft: 6, marginLeft: 14 }}>{pct(target, 1)} target</span>}</div>
    </div>
  );
}

export default async function SitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = siteById(id);
  if (!s) notFound();
  const u = s.uw;
  const m = marketOf(s);
  const r = s.research || {};
  const reg = s.regulatory || {};
  const ef = u.entrance_fee;
  const a = assumptions;
  const idx = sites.findIndex((x) => x.id === s.id);
  const ordered = [...sites].sort((x, y) => x.rank - y.rank);
  const pos = ordered.findIndex((x) => x.id === s.id);
  const prev = ordered[pos - 1], next = ordered[pos + 1];
  void idx;

  const costItems = [
    { k: "Hard cost", v: u.hard, basis: `$${a.hard_cost_psf}/SF × ${int(u.gsf)} GSF × county cost index` },
    { k: "Site work", v: u.site_work, basis: `$${int(a.site_work_per_acre)}/acre × typical acres` },
    { k: "FF&E", v: u.ffe, basis: `$${int(a.ffe_per_unit)}/unit` },
    { k: "Soft cost", v: u.soft, basis: `${pct(a.soft_cost_pct, 0)} of hard + site` },
    { k: "Construction carry", v: u.carry, basis: `${pct(a.construction_interest_pct_of_cost, 1)} of pre-land cost` },
    { k: "Lease-up deficit", v: u.leaseup, basis: `${a.leaseup_deficit_months_of_noi} months of stabilized NOI` },
    { k: "Contingency", v: u.contingency, basis: `${pct(a.contingency_pct, 0)} of hard + site` },
    { k: "Land", v: u.land_cost, basis: `Basis: ${u.land_cost_basis}` },
  ];
  const acresUsed = String(u.prototype).endsWith("*")
    ? Math.min(Number(s.acres), a.prototypes[String(u.prototype).replace("*", "")].site_acres_typ * 1.5)
    : a.prototypes[String(u.prototype).replace("*", "")]?.site_acres_typ;
  const mix = u.lines as { care: string; units: number; monthly_rate: number; revenue: number; opex: number }[];
  const ilUnits = mix.find((l) => l.care === "IL")?.units || 0;
  const staff = Math.round(u.units * 0.35);
  const parking = Math.round(ilUnits * 1.0 + (u.units - ilUnits) * 0.25 + staff * 0.5);
  const stateComps = comps.filter((c) => c.town.includes(` ${s.state}`) || c.town.endsWith(s.state));
  const lp = u.equity * 0.9, gp = u.equity * 0.1;

  const risks: { t: string; d: string }[] = [];
  if (s.opposition_risk) risks.push({ t: `Opposition: ${s.opposition_risk}`, d: s.approval_case || "" });
  if (u.breakeven_rent_ratio > 0.95) risks.push({ t: "Thin rent cushion", d: breakevenLine(s) });
  if (!/Verified|\(V\)/.test(r.sewer_water || "")) risks.push({ t: "Utilities unverified", d: `Sewer/water: ${r.sewer_water || "Not yet verified"}. Will-serve letters needed.` });
  if (s.state === "NJ") risks.push({ t: "NJ Medicaid set-aside", d: "Expedited CN requires 10% of AL beds at Medicaid within 3 years, held permanently; already priced into AL rates." });
  if (/Highlands/i.test(JSON.stringify(s))) risks.push({ t: "NJ Highlands", d: "Highlands Act review may limit disturbance and septic density." });
  if (/litigation|appeal|lawsuit/i.test(JSON.stringify(s))) risks.push({ t: "Litigation history", d: "Prior appeal or litigation noted in the record; confirm it is resolved and the approval vested." });
  if (u.land_cost_basis === "market comp/unit") risks.push({ t: "Land basis is a market comp", d: "No ask or estimate on file; the land cost is the county comp per unit. Price discovery is the first diligence step." });
  if (s.kills?.length) risks.push({ t: "Gate failure", d: s.kills.join("; ") });
  const programRisks = [
    "Calibrated rent, tax and land indices [I]: confirm with NIC MAP, rate shops and an assessor letter.",
    "Lease-up pace: 9 months of NOI carried in budget; a slower absorption erodes equity returns, not YOC.",
    "Exit-cap spread: Class A AL trades near the 6.25% exit cap; development spread depends on clearing the target.",
    "Labor and agency cost in AL/MC operations; margin assumptions are operator-dependent.",
  ];

  const sub = [
    ["snapshot", "Snapshot"], ["location", "Site & surroundings"], ["entitlement", "Entitlement"], ["market", "Market & need"], ["program", "Program"],
    ["proforma", "Pro forma"], ["tax", "Tax structure"], ["stress", "Stress"], ...(ef ? [["fees", "Entrance fees"]] : []),
    ["whatif", "What-if"], ["capital", "Capital stack"], ["risks", "Risks"], ["diligence", "Diligence"], ["sources", "Sources"],
  ];
  let n = 0;
  const N = () => String(++n).padStart(2, "0");

  return (
    <>
      <section className="site-hero">
        <div className="wrap">
          <div className="crumbs"><a href="/">Pipeline</a> / <a href="/#pipeline">{STATE_NAME[s.state]}</a> / {s.id}</div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
            <VerdictChip v={s.verdict} />
            <span className="small" style={{ color: "#c9d2df" }}>Rank #{s.rank} of {sites.length}{isShortlist(s) ? " · Shortlist" : ""} · {trackOf(s)}</span>
          </div>
          <h1>{s.name}</h1>
          <div className="sub">{s.municipality} · {s.county} County, {STATE_NAME[s.state]} · {s.acres} acres · {s.drive_min_midtown} min to Midtown</div>
          <div className="verdict-bar">
            <div>
              <div className="label">Verdict</div>
              <div className="big" style={{ fontSize: 20 }}>{s.verdict_reason}</div>
              <div className="cap">Next step: <b style={{ color: "#fff" }}>{s.next_step}</b></div>
            </div>
            <div><div className="label">YOC · taxed</div><div className="big" style={{ color: u.yoc >= HURDLE ? "#8fd3b0" : "#f0b3ad" }}>{pct(u.yoc)}</div><div className="cap">PILOT {pct(u.yoc_by_tax_structure.pilot)}</div></div>
            <div><div className="label">Max land @ {pct(HURDLE, 1)}</div><div className="big">{usdM(u.max_land)}</div><div className="cap">vs {usdM(u.land_cost)} basis</div></div>
            <div><div className="label">Composite</div><div className="big">{s.scores.total}</div><div className="cap">A {s.scores.approval} · R {s.scores.rent_support} · N {s.scores.need} · Y {s.scores.yield}</div></div>
            <div><div className="label">Program</div><div className="big">{u.units} units</div><div className="cap">{u.prototype_name}</div></div>
          </div>
        </div>
      </section>
      <nav className="subnav" aria-label="Sections">
        <div className="wrap">{sub.map(([h, l]) => <a key={h} href={`#${h}`}>{l}</a>)}</div>
      </nav>

      <div className="wrap">
        {/* 1 Verdict detail + 2 Snapshot */}
        <section className="section">
          <SectionHead id="snapshot" n={N()} title="Verdict and snapshot" sub="The three owner tests, scored 0–100, with the composite weighting from the model." />
          <div className="grid g-side">
            <div className="card card-pad">
              <div className="grid g2" style={{ gap: 18 }}>
                {[
                  { k: "Town approval", v: s.scores.approval, w: a.score_weights.approval, d: s.entitlement_status },
                  { k: "Rent support", v: s.scores.rent_support, w: a.score_weights.rent_support, d: breakevenLine(s) },
                  { k: "Need", v: s.scores.need, w: a.score_weights.need, d: m ? `County unmet-demand ratio ${m.unmet_demand_ratio}` : "" },
                  { k: "Yield", v: s.scores.yield, w: a.score_weights.yield, d: `${Math.round((u.yoc - HURDLE) * 10000)} bps vs ${pct(HURDLE, 1)} floor, fully taxed` },
                ].map((g) => (
                  <div key={g.k} className="gauge">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span style={{ fontWeight: 600 }}>{g.k} <span className="xs muted">· weight {pct(g.w, 0)}</span></span>
                      <span style={{ fontFamily: "var(--serif)", fontSize: 24, fontWeight: 600 }}>{g.v}</span>
                    </div>
                    <Bar value={g.v} color={g.v >= 75 ? "#1E8A5A" : g.v >= 55 ? "#3B5FC4" : g.v >= 35 ? "#C98A1E" : "#98A1AB"} />
                    <div className="xs muted">{g.d}</div>
                  </div>
                ))}
              </div>
              {s.kills?.length > 0 && <div className="callout" style={{ marginTop: 16 }}><b>Gate failures:</b> {s.kills.join("; ")}</div>}
            </div>
            <div className="card card-pad">
              <table className="kv"><tbody>
                <tr><td>Municipality</td><td>{s.municipality}</td></tr>
                <tr><td>County / state</td><td>{s.county}, {s.state}</td></tr>
                <tr><td>Acres</td><td>{s.acres}</td></tr>
                <tr><td>Drive to Midtown</td><td>{s.drive_min_midtown} min</td></tr>
                <tr><td>Deal route</td><td><NV v={s.deal_route} /></td></tr>
                <tr><td>Land</td><td><NV v={s.land_note} /></td></tr>
                <tr><td>Land basis</td><td>{usdM(u.land_cost)} <span className="muted">({u.land_cost_basis})</span>{u.land_cost_basis === "market comp/unit" && <I tip="County land comp per unit; see Markets" />}</td></tr>
                <tr><td>Prior use</td><td><Evidence text={r.prior_use} /></td></tr>
                <tr><td>Coordinates</td><td className="tnum">{Number(s.lat).toFixed(4)}, {Number(s.lon).toFixed(4)}</td></tr>
              </tbody></table>
            </div>
          </div>
        </section>

        <section className="section">
          <SectionHead id="location" n={N()} title="Site and surroundings" sub="Satellite view with the tax parcel under the pin, the program footprint to scale, and the hospitals, transit, retail and competing senior communities around it." />
          <SiteMap id={s.id} name={s.name} lat={Number(s.lat)} lon={Number(s.lon)} state={s.state} county={s.county} acres={Number(s.acres)} verdictColor={VERDICT_COLOR[s.verdict as keyof typeof VERDICT_COLOR]} />
        </section>

        <section className="section">
          <SectionHead id="entitlement" n={N()} title="Entitlement and town approval" />
          <div className="grid g2">
            <div className="card card-pad">
              <table className="kv"><tbody>
                <tr><td>Current zoning</td><td><Evidence text={r.zoning} /></td></tr>
                <tr><td>Senior-use path</td><td><Evidence text={r.senior_use_path} /></td></tr>
                <tr><td>Entitlement status</td><td><NV v={s.entitlement_status} /></td></tr>
                <tr><td>Approval case</td><td><NV v={s.approval_case} /></td></tr>
                <tr><td>Approval evidence</td><td><Evidence text={r.approval_evidence} /></td></tr>
                <tr><td>Opposition risk</td><td><NV v={s.opposition_risk} /></td></tr>
                <tr><td>Approval score</td><td><b>{s.scores.approval}</b> / 100 <span className="muted small">({s.scores.approval >= 90 ? "entitled" : s.scores.approval >= 75 ? "clear path with precedent" : s.scores.approval >= 55 ? "credible discretionary path" : s.scores.approval >= 35 ? "uncertain" : "not credible"})</span></td></tr>
              </tbody></table>
            </div>
            <div className="card card-pad">
              <h3>State licensure path · {STATE_NAME[s.state]}</h3>
              <table className="kv"><tbody>
                <tr><td>Rental IL</td><td><NV v={reg.rental_il} /></td></tr>
                <tr><td>AL / MC</td><td><NV v={reg.al_mc} /></td></tr>
                <tr><td>Skilled nursing</td><td><NV v={reg.snf} /></td></tr>
                <tr><td>CCRC / life plan</td><td><NV v={reg.ccrc} /></td></tr>
                <tr><td>Tax tool</td><td><NV v={reg.tax_tool} /></td></tr>
              </tbody></table>
              <div className="callout navy" style={{ marginTop: 14 }}>
                <b>Indicative timeline</b> <I tip="Analyst estimate from the state licensure path and approval score" />: {s.scores.approval >= 90 ? "entitled now; 3–6 months to building permit" : s.scores.approval >= 75 ? "6–12 months to site plan approval" : "12–24 months of discretionary approvals"}, plus {s.state === "NJ" ? "~12-month expedited CN in parallel" : s.state === "NY" ? "9–18 months ALR/EALR licensure in parallel" : "ALSA licensing (no CON) in parallel"}, then 22–26 months construction and 18–24 months lease-up.
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <SectionHead id="market" n={N()} title="Market, rent support and need" sub={breakevenLine(s)} />
          <div className="grid g3">
            <div className="card card-pad">
              <h3>{s.county} County</h3>
              {m ? (
                <table className="kv"><tbody>
                  <tr><td>Population 75+</td><td className="num">{int(m.pop75)}</td></tr>
                  <tr><td>Median HH income 65+</td><td className="num">{usd(Number(m.med_hh_inc_65plus))}</td></tr>
                  <tr><td>Median home value</td><td className="num">{usd(Number(m.med_home_value))}</td></tr>
                  <tr><td>State AL median / mo</td><td className="num">{usd(Number(m.al_monthly_state_median))}</td></tr>
                  <tr><td>County rent index <I /></td><td className="num">{Number(m.rent_index).toFixed(2)}</td></tr>
                  <tr><td>Submarket rent index <I /></td><td className="num">{s.rent_index_site ? Number(s.rent_index_site).toFixed(2) : "County"}</td></tr>
                  <tr><td>Unmet-demand ratio <I /></td><td className="num">{m.unmet_demand_ratio}</td></tr>
                  <tr><td>Metro occupancy</td><td className="num" style={{ fontWeight: 400 }}>{m.metro_occupancy}</td></tr>
                </tbody></table>
              ) : <span className="muted">Not yet verified</span>}
            </div>
            <div className="card card-pad">
              <h3>Modeled rates by care level</h3>
              <table className="t"><thead><tr><th>Care</th><th className="num">Units</th><th className="num">$/mo</th><th className="num">Revenue</th></tr></thead>
                <tbody>{mix.map((l) => <tr key={l.care}><td>{l.care}</td><td className="num">{l.units}</td><td className="num">{usd(l.monthly_rate)}</td><td className="num">{usdM(l.revenue, 2)}</td></tr>)}</tbody></table>
              <div style={{ marginTop: 14 }}>
                <div className="label">Breakeven rent ratio</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 600 }}>{u.breakeven_rent_ratio?.toFixed(3) ?? "—"}</div>
                <div className="small muted">Rent needed for {pct(HURDLE, 1)} ÷ modeled rent. Below 1.00 means headroom.</div>
                {s.state === "NJ" && m?.al_medicaid_share && <div className="small" style={{ marginTop: 8 }}>NJ CN set-aside: {pct(Number(m.al_medicaid_share), 0)} of AL at {usd(Number(m.al_medicaid_monthly))}/mo is blended into the AL rate.</div>}
              </div>
            </div>
            <div className="card card-pad">
              <h3>Need</h3>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}><span style={{ fontFamily: "var(--serif)", fontSize: 34, fontWeight: 600 }}>{s.scores.need}</span><span className="muted">/ 100</span></div>
              <Bar value={s.scores.need} />
              <p className="small muted" style={{ marginTop: 10 }}>Need = 25 × unmet-demand ratio + 25, where the ratio is income- and age-qualified demand less existing and pipeline supply, per proposed unit. {m?.basis && <>Basis: {m.basis}</>}</p>
              <h4 style={{ marginTop: 14 }}>Benchmark communities</h4>
              <ul className="list-clean small">
                {(stateComps.length ? stateComps : comps.slice(0, 3)).slice(0, 4).map((c) => (
                  <li key={c.name}><a href={c.url} target="_blank" rel="noreferrer">{c.name}</a><div className="xs muted">{c.town} · {c.type} · {c.units} units · {c.pricing}</div></li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="section">
          <SectionHead id="program" n={N()} title="Program" />
          <div className="grid g2">
            <div className="card card-pad">
              <div className="label" style={{ marginBottom: 8 }}>Unit mix</div>
              <div style={{ display: "flex", height: 34, borderRadius: 5, overflow: "hidden", gap: 2, background: "#fff" }}>
                {mix.map((l, i) => (
                  <div key={l.care} title={`${l.care}: ${l.units} units`} style={{ flex: l.units, background: ["#13243d", "#43628c", "#a8844a", "#c9ad7d"][i % 4], color: "#fff", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 600 }}>
                    {l.care} {l.units}
                  </div>
                ))}
              </div>
              <table className="kv" style={{ marginTop: 14 }}><tbody>
                <tr><td>Prototype</td><td>{u.prototype} · {u.prototype_name}</td></tr>
                <tr><td>Units</td><td>{u.units}</td></tr>
                <tr><td>Gross SF</td><td>{int(u.gsf)} SF <span className="muted">({int(u.gsf / u.units)} SF/unit)</span></td></tr>
                <tr><td>Acres used vs available</td><td>{acresUsed?.toFixed(1)} of {s.acres} ac</td></tr>
                <tr><td>Parking (rule of thumb)</td><td>~{parking} spaces <span className="muted small">(1.0/IL, 0.25/AL-MC, 0.5/staff on {staff} FTE)</span> <I tip="Rule of thumb, not a zoning count" /></td></tr>
              </tbody></table>
            </div>
            <div className="card card-pad">
              <div className="label" style={{ marginBottom: 8 }}>Operating statement · stabilized</div>
              <table className="kv"><tbody>
                <tr><td>Revenue</td><td className="num">{usd(u.revenue)}</td></tr>
                <tr><td>Operating expenses</td><td className="num">({usd(u.opex)})</td></tr>
                <tr><td>Property taxes</td><td className="num">({usd(u.taxes)})</td></tr>
                <tr><td>Replacement reserves</td><td className="num">({usd(u.reserves)})</td></tr>
                <tr className="total"><td>Net operating income</td><td className="num">{usd(u.noi)}</td></tr>
                <tr><td>NOI margin</td><td className="num">{pct(u.noi_margin, 1)}</td></tr>
                <tr><td>NOI per unit</td><td className="num">{usd(u.noi / u.units)}</td></tr>
              </tbody></table>
            </div>
          </div>
        </section>

        <section className="section">
          <SectionHead id="proforma" n={N()} title="Development budget and returns" />
          <div className="grid g-side">
            <div className="card card-pad">
              <div className="label" style={{ marginBottom: 8 }}>All-in cost {usdM(u.total_cost)} · {usdK(u.total_cost / u.units)}/unit</div>
              <div style={{ display: "flex", height: 30, borderRadius: 5, overflow: "hidden", gap: 2, background: "#fff" }}>
                {costItems.map((c, i) => <div key={c.k} title={`${c.k}: ${usdM(c.v)}`} style={{ flex: c.v, background: COST_COLORS[i] }} />)}
              </div>
              <table className="t" style={{ marginTop: 14 }}>
                <thead><tr><th>Line</th><th className="num">Amount</th><th className="num">Per unit</th><th className="num">Share</th><th className="hide-sm">Basis</th></tr></thead>
                <tbody>
                  {costItems.map((c, i) => (
                    <tr key={c.k}><td><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: COST_COLORS[i], marginRight: 8 }} />{c.k}</td>
                      <td className="num">{usdM(c.v, 2)}</td><td className="num">{usdK(c.v / u.units)}</td><td className="num">{pct(c.v / u.total_cost, 1)}</td><td className="xs muted hide-sm">{c.basis}</td></tr>
                  ))}
                  <tr><td><b>Total development cost</b></td><td className="num"><b>{usdM(u.total_cost, 2)}</b></td><td className="num"><b>{usdK(u.total_cost / u.units)}</b></td><td className="num">100%</td><td className="hide-sm" /></tr>
                </tbody>
              </table>
            </div>
            <div className="card card-pad">
              <table className="kv"><tbody>
                <tr><td>Yield on cost</td><td className="num" style={{ color: u.yoc >= HURDLE ? "var(--pursue)" : "var(--danger)", fontSize: 18 }}>{pct(u.yoc)}</td></tr>
                <tr><td>Max land @ {pct(HURDLE, 1)}</td><td className="num">{usdM(u.max_land)}</td></tr>
                <tr><td>Max land per unit</td><td className="num">{usdK(u.max_land_per_unit)}</td></tr>
                <tr><td>Land basis</td><td className="num">{usdM(u.land_cost)}</td></tr>
                <tr className="total"><td>Land cushion</td><td className="num" style={{ color: (u.land_cushion ?? 0) >= 0 ? "var(--pursue)" : "var(--danger)" }}>{usdM(u.land_cushion)}</td></tr>
                <tr><td>Value at {pct(a.exit_cap)} exit cap</td><td className="num">{usdM(u.value_at_exit_cap)}</td></tr>
                <tr><td>Profit on cost</td><td className="num">{pct(u.profit_on_cost, 1)}</td></tr>
                <tr><td>Loan ({pct(a.debt.ltc, 0)} LTC)</td><td className="num">{usdM(u.loan)}</td></tr>
                <tr><td>Debt service ({pct(a.debt.rate)}, {a.debt.amort_years}-yr)</td><td className="num">{usdM(u.annual_debt_service, 2)}</td></tr>
                <tr><td>DSCR</td><td className="num">{mult(u.dscr)}</td></tr>
                <tr><td>Debt yield</td><td className="num">{pct(u.debt_yield)}</td></tr>
              </tbody></table>
            </div>
          </div>
        </section>

        <section className="section">
          <SectionHead id="tax" n={N()} title="Tax structure" sub={`The swing factor in this region. ${STATE_NAME[s.state]} tool: ${reg.tax_tool || "Not yet verified"}. PILOT models ${pct(a.tax_structures.pilot, 0)} of full taxes; nonprofit-exempt models ${pct(a.tax_structures.nonprofit_exempt, 0)}.`} />
          <div className="grid g2">
            <div className="card card-pad">
              <Hbar max={0.12} hurdle={HURDLE} target={TARGET} items={[
                { label: "Fully taxed", v: u.yoc_by_tax_structure.full_tax, note: `${usd(u.taxes / u.units)}/unit` },
                { label: "PILOT", v: u.yoc_by_tax_structure.pilot, note: reg.tax_tool },
                { label: "Nonprofit exempt", v: u.yoc_by_tax_structure.nonprofit_exempt, note: "RiverSpring-style sponsor" },
              ]} />
            </div>
            <div className="card card-pad">
              <table className="t"><thead><tr><th>Structure</th><th className="num">YOC</th><th className="num">Max land</th><th className="num">Cushion</th></tr></thead>
                <tbody>{(["full_tax", "pilot", "nonprofit_exempt"] as const).map((k) => (
                  <tr key={k}><td>{k === "full_tax" ? "Fully taxed" : k === "pilot" ? "PILOT" : "Nonprofit exempt"}</td>
                    <td className="num" style={{ fontWeight: 700, color: u.yoc_by_tax_structure[k] >= HURDLE ? "var(--pursue)" : "var(--ink-2)" }}>{pct(u.yoc_by_tax_structure[k])}</td>
                    <td className="num">{usdM(u.max_land_by_tax_structure[k])}</td>
                    <td className="num" style={{ color: u.max_land_by_tax_structure[k] - u.land_cost >= 0 ? "var(--pursue)" : "var(--danger)" }}>{usdM(u.max_land_by_tax_structure[k] - u.land_cost)}</td></tr>
                ))}</tbody></table>
            </div>
          </div>
        </section>

        <section className="section">
          <SectionHead id="stress" n={N()} title="Stress tests" sub="Fully taxed, against the floor. Rent stress cuts revenue 10% with opex as a margin; cost stress lifts cost ex-land 10%." />
          <div className="card card-pad">
            <Hbar max={0.12} hurdle={HURDLE} items={[
              { label: "Base case", v: u.yoc },
              { label: "Rents −10%", v: u.stress.yoc_rent_down_10 },
              { label: "Costs +10%", v: u.stress.yoc_cost_up_10 },
              { label: "Both", v: u.stress.yoc_both },
            ]} />
          </div>
        </section>

        {ef && (
          <section className="section">
            <SectionHead id="fees" n={N()} title="Entrance-fee test" sub="How River's Edge and Broadview pencil: the IL is judged on first-generation fee coverage, not on stabilized YOC." />
            <div className="grid g4">
              <div className="card kpi"><div className="label">Average fee</div><div className="v">{usdK(ef.avg_fee)}</div><div className="s">{pct(a.entrance_fee.fee_to_home_value, 0)} of submarket home value</div></div>
              <div className="card kpi"><div className="label">Fee pool</div><div className="v">{usdM(ef.fee_pool)}</div><div className="s">{ilUnits} IL × {pct(a.entrance_fee.presale_occupancy, 0)} presold</div></div>
              <div className="card kpi"><div className="label">IL cost</div><div className="v">{usdM(ef.il_cost)}</div><div className="s">IL share of all-in cost by GSF</div></div>
              <div className="card kpi"><div className="label">Coverage</div><div className="v" style={{ color: ef.viable ? "var(--pursue)" : "var(--danger)" }}>{Math.round(ef.coverage * 100)}%</div><div className="s">{ef.viable ? "Viable" : "Below"} vs {pct(a.entrance_fee.min_coverage, 0)} minimum · developer fee {usdM(ef.developer_fee)}</div></div>
            </div>
          </section>
        )}

        <section className="section">
          <SectionHead id="whatif" n={N()} title="What-if" sub="Move the inputs that decide this deal. YOC and max land recompute live with the underwriting model." />
          <div className="card card-pad"><WhatIf site={s} markets={markets} a={assumptions} /></div>
        </section>

        <section className="section">
          <SectionHead id="capital" n={N()} title="Capital stack" />
          <div className="grid g2">
            <div className="card card-pad">
              <div className="label" style={{ marginBottom: 8 }}>Sources · {usdM(u.total_cost)}</div>
              <div style={{ display: "flex", height: 30, borderRadius: 5, overflow: "hidden", gap: 2 }}>
                <div style={{ flex: u.loan, background: "#13243d" }} title="Senior construction loan" />
                <div style={{ flex: lp, background: "#6e8bb0" }} title="LP equity" />
                <div style={{ flex: gp, background: "#a8844a" }} title="GP equity" />
              </div>
              <table className="kv" style={{ marginTop: 12 }}><tbody>
                <tr><td><span style={{ display: "inline-block", width: 10, height: 10, background: "#13243d", marginRight: 8 }} />Senior construction loan ({pct(a.debt.ltc, 0)} LTC)</td><td className="num">{usdM(u.loan)}</td></tr>
                <tr><td><span style={{ display: "inline-block", width: 10, height: 10, background: "#6e8bb0", marginRight: 8 }} />LP equity (90%) <I tip="Illustrative 90/10 LP/GP split" /></td><td className="num">{usdM(lp)}</td></tr>
                <tr><td><span style={{ display: "inline-block", width: 10, height: 10, background: "#a8844a", marginRight: 8 }} />GP / ATCO co-invest (10%)</td><td className="num">{usdM(gp)}</td></tr>
              </tbody></table>
            </div>
            <div className="card card-pad">
              <div className="label" style={{ marginBottom: 8 }}>Exit and take-out</div>
              <ul className="list-clean small">
                <li><b>Stabilized sale to REIT or operator</b> at {pct(a.exit_cap)} cap: {usdM(u.value_at_exit_cap)}, {pct(u.profit_on_cost, 1)} profit on cost.</li>
                <li><b>HUD 232 refinance</b> after stabilization; long-term, non-recourse take-out of the construction loan.</li>
                <li><b>Hold with operator</b> under a management agreement; DSCR {mult(u.dscr)} on construction-loan terms.</li>
                {ef && <li><b>Entrance-fee life plan</b>: first-generation fees retire temporary debt; nonprofit sponsor plus fee developer is the financeable form.</li>}
              </ul>
            </div>
          </div>
        </section>

        <section className="section">
          <SectionHead id="risks" n={N()} title="Risks" />
          <div className="grid g2">
            <div className="card card-pad"><h3>Site-specific</h3>
              <ul className="list-clean small">{risks.map((x) => <li key={x.t}><b>{x.t}.</b> {x.d}</li>)}</ul></div>
            <div className="card card-pad"><h3>Program-level</h3>
              <ul className="list-clean small">{programRisks.map((x) => <li key={x}>{x}</li>)}</ul></div>
          </div>
        </section>

        <section className="section">
          <SectionHead id="diligence" n={N()} title="Diligence checklist" />
          <div className="card card-pad"><Diligence id={s.id} items={s.diligence} /></div>
        </section>

        <section className="section">
          <SectionHead id="sources" n={N()} title="Sources" />
          <div className="card card-pad">
            <ol className="sources small" style={{ paddingLeft: 18, margin: 0 }}>
              {(r.sources || []).map((u2: string) => <li key={u2} style={{ marginBottom: 6 }}><a href={u2} target="_blank" rel="noreferrer">{u2}</a></li>)}
            </ol>
            {!r.sources?.length && <span className="muted">Not yet verified</span>}
            <div className="xs muted" style={{ marginTop: 12 }}>Research files: research/sites-{s.state.toLowerCase()}.md, research/market-demand.md, research/riverspring-model.md. Model: model/underwrite.py with model/assumptions.json.</div>
          </div>
        </section>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0 30px", flexWrap: "wrap" }}>
          {prev ? <a className="btn" href={`/sites/${prev.id}`}>← #{prev.rank} {prev.name}</a> : <span />}
          {next ? <a className="btn" href={`/sites/${next.id}`}>#{next.rank} {next.name} →</a> : <span />}
        </div>
      </div>
    </>
  );
}
