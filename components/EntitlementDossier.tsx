import { dossier, type Item } from "@/lib/entitlement";
import { usdM, usdK } from "@/lib/format";

const FLAG = { ok: { c: "#33772a", t: "Clear" }, watch: { c: "#d9780c", t: "Watch" }, risk: { c: "#BB2034", t: "Issue" } };
const BAND_C: Record<string, string> = { Low: "#33772a", Moderate: "#3079B3", Elevated: "#a85a06", High: "#BB2034" };

function Items({ items }: { items: Item[] }) {
  return (
    <ul className="dossier-list">
      {items.map((x) => {
        const f = FLAG[x.flag || "ok"];
        return (
          <li key={x.k}>
            <span className="flag" role="img" style={{ background: f.c }} title={f.t} aria-label={f.t} />
            <div><div className="k">{x.k}{x.src && <span className="src">{x.src}</span>}</div><div className="v">{x.v}</div></div>
          </li>
        );
      })}
    </ul>
  );
}

export default function EntitlementDossier({ site, a, evidence }: { site: any; a: any; evidence: React.ReactNode }) {
  const d = dossier(site, a);
  const bandC = BAND_C[d.risk.band];
  const dateStr = d.screenedAt ? new Date(d.screenedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;
  return (
    <div className="grid" style={{ gap: 18, gridTemplateColumns: "minmax(0, 1fr)" }}>
      <div className="grid g4">
        <div className="card kpi"><div className="label">Approval path</div><div className="v" style={{ fontSize: 20 }}>{d.pathLabel}</div><div className="s">{d.pathDesc}</div></div>
        <div className="card kpi"><div className="label">Entitlement risk</div><div className="v" style={{ color: bandC }}>{d.risk.score}<span style={{ fontSize: 14, color: "var(--ink-3)" }}> / 100</span></div><div className="s"><b style={{ color: bandC }}>{d.risk.band}</b> · higher is riskier; breakdown below</div></div>
        <div className="card kpi"><div className="label">Entitlement schedule</div><div className="v">{d.schedule.lo}–{d.schedule.hi} mo</div><div className="s">Site control to approvals{d.schedule.hi > d.schedule.modelMonths ? ` · the capital model carries ${d.schedule.modelMonths} months of predevelopment, so longer paths add carry` : ""}</div></div>
        <div className="card kpi"><div className="label">Entitlement budget</div><div className="v">{usdM(d.budgetTotal, 2)}</div><div className="s">Pursuit cost at risk before approval, by discipline below</div></div>
      </div>

      <div className="grid g2" style={{ alignItems: "start" }}>
        <div className="card card-pad">
          <h3>Zoning and the record</h3>
          {evidence}
        </div>
        <div className="card card-pad">
          <h3>Approving bodies and sequence</h3>
          <ol className="board-list">
            {d.boards.map((b) => <li key={b.body}><b>{b.body}</b>{b.vote && <span className="pill">{b.vote}</span>}<div className="small muted">{b.role}</div></li>)}
          </ol>
        </div>
      </div>

      <div className="grid g3" style={{ alignItems: "start" }}>
        <div className="card card-pad">
          <h3>Environmental screening</h3>
          <Items items={d.environmental} />
        </div>
        <div className="card card-pad">
          <h3>Program against zoning</h3>
          <Items items={d.program} />
          <div className="xs muted" style={{ marginTop: 8 }}>From the 3D concept massing. Height, coverage, setbacks and parking must be checked against the district&apos;s bulk table in the zoning opinion.</div>
          <h3 style={{ marginTop: 18 }}>Traffic</h3>
          <Items items={d.traffic} />
        </div>
        <div className="card card-pad">
          <h3>Utilities</h3>
          <Items items={d.utilities} />
          <h3 style={{ marginTop: 18 }}>Review regime and licensing</h3>
          <Items items={[...d.review, ...d.licensing]} />
        </div>
      </div>

      <div className="grid g2" style={{ alignItems: "start" }}>
        <div className="card card-pad">
          <h3>Risk score build-up</h3>
          <table className="kv"><tbody>
            {d.risk.flags.map((f) => <tr key={f.t}><td>{f.t}</td><td className="num">+{f.pts}</td></tr>)}
            <tr className="total"><td>Entitlement risk ({d.risk.band})</td><td className="num" style={{ color: bandC }}>{d.risk.score}</td></tr>
          </tbody></table>
          <div className="xs muted" style={{ marginTop: 8 }}>Bands: under 35 low, 35–54 moderate, 55–69 elevated, 70+ high. The path sets the base; opposition, environmental, utility and litigation findings add to it.</div>
        </div>
        <div className="card card-pad">
          <h3>Entitlement budget and schedule</h3>
          <table className="kv"><tbody>
            {d.budget.map((b) => <tr key={b.k}><td>{b.k}</td><td className="num">{usdK(b.v)}</td></tr>)}
            <tr className="total"><td>Total pursuit budget</td><td className="num">{usdM(d.budgetTotal, 2)}</td></tr>
          </tbody></table>
          {d.schedule.adders.length > 0 && (
            <div className="small" style={{ marginTop: 10 }}>
              <b>Included adders:</b> {d.schedule.adders.map((x) => `${x.t} (+${x.months} mo, ${usdK(x.cost)})`).join("; ")}.
            </div>
          )}
        </div>
      </div>
      <div className="xs muted">
        Screening {dateStr ? `run ${dateStr}` : "pending"} against official GIS: FEMA National Flood Hazard Layer, USFWS National Wetlands Inventory, EPA EMEF (Superfund, brownfields, RCRA, TRI){site.state === "NJ" ? ", NJDEP (known contaminated sites, sewer service areas, redevelopment areas, CAFRA, historic properties, overburdened communities)" : site.state === "NY" ? ", NYSDEC informational freshwater wetland mapping" : ""}. It screens the pin and a circle of the site acreage around it{site.pin_basis && /Approximate/i.test(site.pin_basis) ? " (pin approximate for this site)" : ""}; it is not a Phase I, a wetlands delineation or a zoning opinion.
      </div>
    </div>
  );
}
