import { usdK } from "@/lib/format";
import { playbook, PLAYBOOK_DATE } from "@/lib/playbook";
import ContactBook from "./ContactBook";

const BAND_C: Record<string, string> = { "Very likely": "#3f8a35", Likely: "#3f8a35", Even: "#3079B3", Uphill: "#F7901E", Unlikely: "#BB2034" };

function Gauge({ v, c }: { v: number; c: string }) {
  const r = 70, cx = 90, cy = 86;
  const a = Math.PI * (1 - v / 100);
  const x = cx + r * Math.cos(a), y = cy - r * Math.sin(a);
  return (
    <svg viewBox="0 0 180 100" style={{ width: 180, height: 100 }} role="img" aria-label={`Approval likelihood ${v} percent`}>
      <path d={`M${cx - r},${cy} A${r},${r} 0 0 1 ${cx + r},${cy}`} fill="none" stroke="#ebe9f3" strokeWidth="14" strokeLinecap="round" />
      <path d={`M${cx - r},${cy} A${r},${r} 0 0 1 ${x.toFixed(1)},${y.toFixed(1)}`} fill="none" stroke={c} strokeWidth="14" strokeLinecap="round" />
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize="30" fontWeight="300" fill="#2D2D2D">{v}%</text>
    </svg>
  );
}

function Timeline({ steps, total }: { steps: ReturnType<typeof playbook>["steps"]; total: number }) {
  const W = 1100, row = 26, pl = 290, pr = 16, top = 24;
  const H = top + steps.length * row + 10;
  const x = (m: number) => pl + (m / total) * (W - pl - pr);
  const ticks = Array.from({ length: Math.floor(total / 3) + 1 }, (_, i) => i * 3);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="svg-chart timeline" role="img" aria-label="Approval path timeline in months" style={{ width: "100%", height: "auto" }}>
      {ticks.map((m) => <g key={m}><line x1={x(m)} x2={x(m)} y1={top - 6} y2={H - 6} stroke="#eee" /><text x={x(m)} y={14} textAnchor="middle" fontSize="10.5" fill="#6f7779">M{m}</text></g>)}
      {steps.map((s, i) => (
        <g key={s.t} className="tl-row">
          <title>{`${s.t} · months ${s.start.toFixed(1)}–${s.end.toFixed(1)} · ${s.who}\n${s.d}`}</title>
          <text x={8} y={top + i * row + 18} fontSize="12" fill="#2D2D2D">{i + 1}. {s.t.length > 40 ? s.t.slice(0, 39) + "…" : s.t}</text>
          <rect x={x(s.start)} y={top + i * row + 6} width={Math.max(4, x(s.end) - x(s.start))} height={16} rx={3} fill={s.gate ? "#403393" : s.parallel ? "#76B96A" : "#3D86C6"} opacity={0.9} />
        </g>
      ))}
    </svg>
  );
}

export default function ApprovalPlaybook({ site, a }: { site: any; a: any }) {
  const p = playbook(site, a);
  const c = BAND_C[p.likeBand];
  return (
    <div className="grid" style={{ gap: 18, gridTemplateColumns: "minmax(0, 1fr)" }}>
      <div className="grid g-side" style={{ alignItems: "start" }}>
        <div className="card card-pad">
          <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
            <Gauge v={p.like} c={c} />
            <div style={{ flex: "1 1 260px", minWidth: 0 }}>
              <div className="label">Town approval likelihood</div>
              <div style={{ fontSize: 22, color: c, fontWeight: 600 }}>{p.likeBand}</div>
              <div className="small muted">{p.d.pathLabel} · about {Math.round(p.totalMonths)} months from LOI to permits · entitlement risk {p.d.risk.score}/100</div>
            </div>
          </div>
          {p.likelihoodNote && <p style={{ marginTop: 12 }}>{p.likelihoodNote}</p>}
          <ul className="list-clean small" style={{ marginTop: 8 }}>{p.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
          <div className="xs muted">Likelihood blends the town approval score (65%) with the inverse of the entitlement risk score (35%).</div>
        </div>
        <div className="card card-pad">
          <h3>The case to make</h3>
          <div className="framing">
            {p.framing.map((f) => <div key={f.k}><div className="label">{f.k}</div><div className="fv">{f.v}</div><div className="xs muted">{f.d}</div></div>)}
          </div>
        </div>
      </div>

      <div className="card card-pad">
        <h3>Path to approval</h3>
        {p.pathNote && <p className="small" style={{ marginTop: 0 }}>{p.pathNote}</p>}
        <Timeline steps={p.steps} total={Math.ceil(p.totalMonths)} />
        <div className="xs muted" style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 4 }}>
          <span><span className="sw-i" style={{ background: "#403393" }} />Gate: go / no-go</span>
          <span><span className="sw-i" style={{ background: "#3D86C6" }} />Step</span>
          <span><span className="sw-i" style={{ background: "#76B96A" }} />Runs in parallel</span>
          <span>Hover a bar for detail.</span>
        </div>
        <ol className="step-list">
          {p.steps.map((s) => <li key={s.t}><b>{s.t}</b> <span className="xs muted">M{s.start.toFixed(0)}–{s.end.toFixed(0)} · {s.who}</span><div className="small muted">{s.d}</div></li>)}
        </ol>
      </div>

      <div className="grid g2" style={{ alignItems: "start" }}>
        <div className="card card-pad">
          <h3>Go / no-go gates and capital at risk</h3>
          <table className="t gates"><thead><tr><th>Gate</th><th className="num">By</th><th className="num">Spent if we walk</th></tr></thead>
            <tbody>{p.gates.map((g) => (
              <tr key={g.name}><td><b>{g.name}</b><div className="xs muted"><span style={{ color: "#3f8a35" }}>Go:</span> {g.test}</div><div className="xs muted"><span style={{ color: "#BB2034" }}>Stop:</span> {g.kill}</div></td><td className="num">M{Math.round(g.month)}</td><td className="num">{usdK(g.atRisk)}</td></tr>
            ))}</tbody>
          </table>
          <div className="xs muted" style={{ marginTop: 8 }}>Cumulative share of the {usdK(p.d.budgetTotal)} pursuit budget spent by each gate. Land is not at risk until Gate 5.</div>
        </div>
        <div className="card card-pad">
          <h3>Contract terms to protect the pursuit</h3>
          <table className="kv"><tbody>{p.loi.map((x) => <tr key={x.k}><td style={{ width: "34%" }}>{x.k}</td><td>{x.v}</td></tr>)}</tbody></table>
        </div>
      </div>

      <div className="card card-pad">
        <h3>Who to talk to{p.curated ? "" : " (roles to staff)"}</h3>
        {!p.curated && <div className="small muted" style={{ marginBottom: 10 }}>Named contacts are researched for the shortlist. For this site, the roles below map to the town&apos;s offices; pull names from the municipal directory before outreach.</div>}
        <ContactBook contacts={p.contacts} site={site.name} />
        {p.curated && <div className="xs muted" style={{ marginTop: 10 }}>From official municipal, county and state pages and the public record as of {PLAYBOOK_DATE}. Boards reorganize each January; confirm before outreach.</div>}
      </div>

      <div className="card card-pad">
        <h3>Means and methods</h3>
        <ol className="step-list">{p.methods.map((m) => <li key={m}>{m}</li>)}</ol>
        <div className="grid g3" style={{ marginTop: 14 }}>
          <div className="mm"><b>Pre-application</b><div className="small muted">Staff first, then a non-binding concept review. Ask staff what the board needs to say yes, and build the submission around that list.</div></div>
          <div className="mm"><b>Community</b><div className="small muted">Abutters and HOAs before the hearing, an open house with renderings, and a single point of contact. Offer buffers, lighting and delivery-hour commitments early, not as concessions.</div></div>
          <div className="mm"><b>Hearing team</b><div className="small muted">Land-use counsel, a licensed planner, a traffic engineer, a civil engineer, the architect and the operator. The operator speaks to care, staffing and EMS.</div></div>
        </div>
      </div>
    </div>
  );
}
