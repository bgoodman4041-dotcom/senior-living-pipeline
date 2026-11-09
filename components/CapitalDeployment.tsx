import { capitalPlan, quarterly, CAP } from "@/lib/capital";
import { pct, usdM, usdK, mult } from "@/lib/format";

const C = { equity: "#F7901E", loan: "#403393", pre: "#efedf8", build: "#eaf2fa", lease: "#edf6eb" };

function DrawChart({ plan }: { plan: ReturnType<typeof capitalPlan> }) {
  const q = quarterly(plan.months);
  const W = 760, H = 230, pl = 56, pr = 12, pt = 14, pb = 34;
  const max = plan.uses.total;
  const x = (i: number) => pl + (i / Math.max(1, q.length - 1)) * (W - pl - pr);
  const y = (v: number) => pt + (1 - v / max) * (H - pt - pb);
  const eqPath = q.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.cumEquity).toFixed(1)}`).join(" ");
  const totPath = q.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.cumEquity + d.cumLoan).toFixed(1)}`).join(" ");
  const base = `L${x(q.length - 1).toFixed(1)},${y(0)} L${x(0)},${y(0)} Z`;
  const loanArea = `${totPath} ${q.slice().reverse().map((d, i) => `L${x(q.length - 1 - i).toFixed(1)},${y(d.cumEquity).toFixed(1)}`).join(" ")} Z`;
  const qx = (m: number) => x(m / 3);
  const bands = [
    { from: 0, to: plan.P, fill: C.pre, label: "Predevelopment" },
    { from: plan.P, to: plan.P + plan.B, fill: C.build, label: "Construction" },
    { from: plan.P + plan.B, to: plan.N, fill: C.lease, label: "Lease-up" },
  ];
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="svg-chart" role="img" aria-label="Cumulative capital drawn by quarter, equity then senior loan" style={{ width: "100%", height: "auto" }}>
      {bands.map((b) => (
        <g key={b.label}>
          <rect x={qx(b.from)} y={pt} width={Math.max(0, qx(b.to) - qx(b.from))} height={H - pt - pb} fill={b.fill} />
          <text x={(qx(b.from) + qx(b.to)) / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="#555F61">{b.label}</text>
        </g>
      ))}
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pl} x2={W - pr} y1={y(t)} y2={y(t)} stroke="#e6e6e6" />
          <text x={pl - 6} y={y(t) + 4} textAnchor="end" fontSize="10.5" fill="#6f7779">{usdM(t, 0)}</text>
        </g>
      ))}
      <path d={loanArea} fill={C.loan} opacity="0.85" />
      <path d={`${eqPath} ${base}`} fill={C.equity} opacity="0.9" />
      <line x1={qx(plan.P)} x2={qx(plan.P)} y1={pt} y2={H - pb} stroke="#2D2D2D" strokeDasharray="3 3" />
      <text x={qx(plan.P) + 4} y={pt + 12} fontSize="10.5" fill="#2D2D2D">Financial close</text>
    </svg>
  );
}

export default function CapitalDeployment({ site, a }: { site: any; a: any }) {
  const p = capitalPlan(site, a);
  const u = site.uw;
  const ef = p.struct === "Entrance fee";
  const usesRows: [string, number][] = [
    ["Land", p.uses.land], ["Hard costs", p.uses.hard], ["Site work", p.uses.siteWork], ["Hard-cost contingency", p.uses.contingency],
    ["FF&E", p.uses.ffe], ["Soft costs", p.uses.soft], ["Construction interest reserve", p.uses.interest], ["Lease-up / operating deficit reserve", p.uses.leaseup],
  ];
  const ret: [string, string, string][] = [
    ["Yield on cost", pct(p.yoc), `Today's rents, ${p.struct === "PILOT" ? "PILOT" : "fully taxed"}`],
    ["Yield on cost, trended", pct(p.yocTrended), `${pct(CAP.trend, 0)} growth to stabilization`],
    ["Unlevered IRR", Number.isFinite(p.irrUnlevered) ? pct(p.irrUnlevered, 1) : "n/m", `Sale at month ${p.N}, ${pct(a.exit_cap)} cap`],
    ["Levered IRR", Number.isFinite(p.irrLevered) ? pct(p.irrLevered, 1) : "n/m", `${pct(a.debt.ltc, 0)} LTC, equity first`],
    ["Equity multiple", mult(p.equityMultiple), "Net sale less loan, over equity"],
    ["Value per $1 of cost", `$${p.valuePerDollar.toFixed(2)}`, "Trended NOI at the exit cap"],
  ];
  return (
    <div className="grid" style={{ gap: 18, gridTemplateColumns: "minmax(0, 1fr)" }}>
      {ef && p.efCase && (
        <div className="card card-pad">
          <h3>Entrance-fee returns: the case this site is judged on</h3>
          <p className="small" style={{ marginTop: 0 }}>First-generation IL fees ({usdM(p.efCase.taxable.feePool)} at {pct(a.entrance_fee.presale_occupancy, 0)} presale) arrive as units fill during lease-up and retire the construction loan first. IL monthly service fees are modeled at {pct(CAP.efMonthlyPct, 0)} of the rental rate. The rental returns further down are shown for reference only.</p>
          <div className="table-wrap"><table className="t"><thead><tr><th><span className="sr-only">Line item</span></th><th className="num">For-profit<br />owner</th><th className="num">Nonprofit<br />sponsor</th></tr></thead><tbody>
            {([
              ["Stabilized NOI (today)", usdM(p.efCase.taxable.noi, 1), usdM(p.efCase.nonprofit.noi, 1)],
              ["Construction loan retired by fees", pct(p.efCase.taxable.loanRetiredPct, 0), pct(p.efCase.nonprofit.loanRetiredPct, 0)],
              ["Fees plus sale value, less total cost", usdM(p.efCase.taxable.profit, 1), usdM(p.efCase.nonprofit.profit, 1)],
              ["Unlevered IRR", pct(p.efCase.taxable.irrU, 1), pct(p.efCase.nonprofit.irrU, 1)],
              ["Levered IRR", pct(p.efCase.taxable.irrL, 1), pct(p.efCase.nonprofit.irrL, 1)],
              ["Equity multiple", mult(p.efCase.taxable.em), mult(p.efCase.nonprofit.em)],
            ] as [string, string, string][]).map(([k, x, y]) => <tr key={k}><td>{k}</td><td className="num">{x}</td><td className="num">{y}</td></tr>)}
          </tbody></table></div>
          <div className={`callout${p.efCase.taxable.profit < 0 ? " warn" : ""}`} style={{ marginTop: 12 }}>
            {p.efCase.taxable.profit < 0
              ? <>As a for-profit owner this campus does not return its cost even with entrance fees. It works the way River&apos;s Edge and Broadview did: a nonprofit sponsor owns it tax-exempt, and ATCO earns the {usdM(u.entrance_fee.developer_fee, 1)} development fee ({pct(a.entrance_fee.developer_fee_pct, 1)} of cost) with limited capital at risk.</>
              : <>Entrance fees retire most of the construction loan, so the equity is back early. A nonprofit sponsor structure adds about {pct(p.efCase.nonprofit.irrL - p.efCase.taxable.irrL, 1)} of levered IRR; ATCO&apos;s development fee would be {usdM(u.entrance_fee.developer_fee, 1)}.</>}
          </div>
        </div>
      )}
      <div className="grid g4">
        <div className="card kpi"><div className="label">Total capitalization</div><div className="v">{usdM(p.uses.total)}</div><div className="s">{usdK(p.uses.total / u.units)} per unit</div></div>
        <div className="card kpi"><div className="label">Equity commitment</div><div className="v">{usdM(p.equityCommit)}</div><div className="s">LP {usdM(p.lp)} · GP / ATCO {usdM(p.gp)}</div></div>
        <div className="card kpi"><div className="label">Senior construction loan</div><div className="v">{usdM(p.loanCommit)}</div><div className="s">{pct(a.debt.ltc, 0)} LTC, funds after equity is fully in</div></div>
        <div className="card kpi"><div className="label">At risk before entitlement</div><div className="v">{usdM(p.atRiskPreEntitlement)}</div><div className="s">{pct(p.atRiskPreEntitlement / p.equityCommit, 1)} of equity: deposit plus design and approvals</div></div>
      </div>

      <div className="grid g-side" style={{ alignItems: "start" }}>
        <div className="card card-pad">
          <div className="label" style={{ marginBottom: 8 }}>Cumulative capital drawn · equity first, then the senior loan</div>
          <DrawChart plan={p} />
          <div className="xs muted" style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 6 }}>
            <span><span style={{ display: "inline-block", width: 10, height: 10, background: C.equity, marginRight: 6 }} />Equity {usdM(p.equityCommit)}, fully in by month {p.peakEquityMonth}</span>
            <span><span style={{ display: "inline-block", width: 10, height: 10, background: C.loan, marginRight: 6 }} />Senior loan {usdM(p.loanCommit)}</span>
            <span>{p.P} months predevelopment · {p.B} construction · {p.L} lease-up</span>
          </div>
        </div>
        <div className="card card-pad">
          <div className="label" style={{ marginBottom: 8 }}>Sources and uses</div>
          <table className="kv"><tbody>
            {usesRows.map(([k, v]) => <tr key={k}><td>{k}</td><td className="num">{usdM(v, 2)}</td><td className="num muted" style={{ width: 52, fontWeight: 400 }}>{pct(v / p.uses.total, 0)}</td></tr>)}
            <tr className="total"><td>Total uses</td><td className="num">{usdM(p.uses.total, 2)}</td><td /></tr>
            <tr><td>Senior loan</td><td className="num">{usdM(p.loanCommit, 2)}</td><td className="num muted" style={{ fontWeight: 400 }}>{pct(a.debt.ltc, 0)}</td></tr>
            <tr><td>LP equity</td><td className="num">{usdM(p.lp, 2)}</td><td className="num muted" style={{ fontWeight: 400 }}>{pct((1 - a.debt.ltc) * CAP.lpShare, 0)}</td></tr>
            <tr><td>GP / ATCO co-invest</td><td className="num">{usdM(p.gp, 2)}</td><td className="num muted" style={{ fontWeight: 400 }}>{pct((1 - a.debt.ltc) * (1 - CAP.lpShare), 0)}</td></tr>
          </tbody></table>
        </div>
      </div>

      <div className="card card-pad">
        <div className="label" style={{ marginBottom: 8 }}>Capital is released only at gates</div>
        <div className="table-wrap"><table className="t">
          <thead><tr><th>Gate</th><th>Timing</th><th className="num">Released</th><th className="num">% of total</th><th>Release test</th></tr></thead>
          <tbody>{p.gates.map((g) => (
            <tr key={g.gate}><td className="site-name">{g.gate}</td><td>{g.when}</td><td className="num">{usdM(g.released, 2)}</td><td className="num">{pct(g.released / p.uses.total, 1)}</td><td className="small">{g.test}</td></tr>
          ))}</tbody>
        </table></div>
      </div>

      <div className="card card-pad">
        <div className="label" style={{ marginBottom: 4 }}>Exit cap sensitivity{ef ? " · rental basis" : ""}</div>
        <p className="xs muted" style={{ marginTop: 0 }}>Base case {pct(a.exit_cap)} matches CBRE&apos;s H1 2026 Class A assisted living cap; Northeast AL/MC has traded 6.75–7.25%. Yield on cost and max land do not depend on the exit cap; value, profit and IRR do.</p>
        <div className="table-wrap"><table className="t">
          <thead><tr><th>Exit cap</th><th className="num">Value at stabilization</th><th className="num">Profit on cost</th><th className="num">Unlevered IRR</th><th className="num">Levered IRR</th><th className="num">Equity multiple</th></tr></thead>
          <tbody>{[0.0625, 0.065, 0.0675, 0.07].map((c) => { const q = capitalPlan(site, { ...a, exit_cap: c }); const base = Math.abs(c - a.exit_cap) < 1e-9; return (
            <tr key={c} className={base ? "row-base" : undefined}>
              <td><b>{pct(c)}</b>{base && <span className="xs muted"> · base</span>}</td>
              <td className="num">{usdM(q.value, 1)}</td>
              <td className="num" style={{ color: q.profitOnCost < 0 ? "var(--danger)" : undefined }}>{pct(q.profitOnCost, 1)}</td>
              <td className="num">{Number.isFinite(q.irrUnlevered) ? pct(q.irrUnlevered, 1) : "n/m"}</td>
              <td className="num" style={{ color: q.irrLevered < 0 ? "var(--danger)" : undefined }}>{Number.isFinite(q.irrLevered) ? pct(q.irrLevered, 1) : "n/m"}</td>
              <td className="num">{mult(q.equityMultiple)}</td>
            </tr>); })}</tbody>
        </table></div>
      </div>

      <div className="grid g3">
        <div className="card card-pad">
          <h3>Returns per dollar</h3>
          <table className="kv"><tbody>
            {ret.map(([k, v, n]) => <tr key={k}><td>{k}<div className="xs muted">{n}</div></td><td className="num" style={{ fontSize: 16 }}>{v}</td></tr>)}
          </tbody></table>
        </div>
        <div className="card card-pad">
          <h3>Cost controls</h3>
          <ul className="list-clean small">
            <li><b>GMP contract</b> with the general contractor; the {pct(a.contingency_pct, 0)} hard-cost contingency ({usdM(p.uses.contingency, 2)}) is held by the owner, not the GC.</li>
            <li><b>Carry and ramp-up are pre-funded:</b> {usdM(p.uses.interest, 2)} interest reserve and {usdM(p.uses.leaseup, 2)} operating deficit reserve, so no capital calls.</li>
            <li><b>Draws certified</b> monthly by the lender&apos;s construction monitor, with {pct(CAP.retainagePct, 0)} retainage to substantial completion.</li>
            <li><b>Change orders</b> above ${CAP.coRepThreshold.toLocaleString("en-US")} need investment-committee approval.</li>
            <li><b>GP completion and cost-overrun guarantee</b> through certificate of occupancy.</li>
          </ul>
        </div>
        <div className="card card-pad">
          <h3>Downside protection and reporting</h3>
          <ul className="list-clean small">
            <li><b>Land cushion</b> {usdM(p.landCushion, 1)}: max land at {pct(a.hurdle_yoc, 1)} is {usdM(p.maxLand, 1)} against a {usdM(u.land_cost, 1)} basis.</li>
            <li><b>Stress:</b> rents −10% {pct(u.stress.yoc_rent_down_10)}, costs +10% {pct(u.stress.yoc_cost_up_10)}, both {pct(u.stress.yoc_both)} YOC.</li>
            <li><b>Take-out:</b> HUD 232-style perm at a {pct(CAP.permDebtYield, 0)} debt yield, {mult(p.perm.dscr)} DSCR, returns {usdM(Math.max(0, p.perm.cashOut), 1)} of equity at refinance.</li>
            <li><b>Investors get</b> a quarterly report (budget vs actual, draw log, schedule, occupancy, rate, labor %) and annual audited financials.</li>
          </ul>
        </div>
      </div>
      <div className="xs muted">Schedule and release rules are ATCO standard terms applied to this site&apos;s underwriting; the Excel model shows every month and lets you change any input.</div>
    </div>
  );
}
