import ab from "@/data/absorption.json";
import { pct, int } from "@/lib/format";

export function absorptionFor(id: string) {
  const s = (ab.sites as Record<string, { pop75: number; share75k: number }>)[id];
  if (!s) return null;
  const A = ab.assumptions;
  const hh = s.pop75 * A.hhPerPerson75, q = hh * s.share75k;
  const existing = ab.supply.reduce((x, r) => x + (r[1] as number), 0);
  const pipe = ab.pipeline.reduce((x, r) => x + (r[1] as number), 0);
  const run = (need: number, units: number) => { const demand = (q * need) / A.pmaShare; const unmet = demand - existing - pipe; return { demand, unmet, capture: unmet > 0 ? units / unmet : Infinity }; };
  return { s, hh, q, existing, pipe, run, v: (ab.verdict as Record<string, { status: string; text: string }>)[id] };
}

export default function Absorption({ id, units }: { id: string; units: number }) {
  const r = absorptionFor(id);
  if (!r) return null;
  const base = r.run(ab.assumptions.needRate, units), hi = r.run(ab.assumptions.needRateHigh, units);
  const pen = (r.existing + r.pipe + units) / r.q;
  const cap = (c: number) => (Number.isFinite(c) ? pct(c, 0) : "no unmet demand");
  const rows: [string, string, string][] = [
    ["75+ population, 7-mile PMA", int(r.s.pop75), "ACS 2024 5-year, tract level"],
    ["75+ households (est.)", int(r.hh), `${ab.assumptions.hhPerPerson75} households per person [I]`],
    ["Income-qualified (≥ $75k with home equity)", int(r.q), `${pct(r.s.share75k, 0)} of 65+ householders`],
    ["Existing competitive AL/MC units", int(r.existing), "10 licensed (county list) + 4 estimated [I]"],
    ["Pipeline", int(r.pipe), "Arbor Terrace Florham Park"],
    ["AL/MC demand at 10% need (12%)", `${int(base.demand)} (${int(hi.demand)})`, "÷ 75% PMA share"],
    ["Unmet demand after supply and pipeline", `${int(base.unmet)} (${int(hi.unmet)})`, ""],
    [`Capture needed for ${units} units`, `${cap(base.capture)} (${cap(hi.capture)})`, "Lenders want < 10–15%; > 25% is a red flag"],
    ["Penetration with this project", pct(pen, 1), "AL typical 6–10% of qualified households"],
  ];
  const bad = r.v?.status === "Hold";
  return (
    <div className="card card-pad">
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
        <div className="label">Absorption with Arbor Terrace in the supply set</div>
        <span className={`ic-chip ${bad ? "ic-bad" : "ic-warn"}`}>{r.v?.status}</span>
      </div>
      <p className="small" style={{ marginTop: 0 }}>{r.v?.text}</p>
      <div className="table-wrap"><table className="t">
        <tbody>{rows.map(([k, v, n]) => <tr key={k}><td>{k}{n && <div className="xs muted">{n}</div>}</td><td className="num"><b>{v}</b></td></tr>)}</tbody>
      </table></div>
      <details className="xs muted" style={{ marginTop: 10 }}>
        <summary>Supply set and sources</summary>
        <p>{ab.supply.map((x) => `${x[0]} ${x[1]}${x[2] === "i" ? " [est.]" : ""}`).join(" · ")} · {ab.pipeline.map((x) => `${x[0]} ${x[1]}`).join(" · ")}</p>
        <ul className="list-clean">{ab.sources.map(([l, u]) => <li key={u}><a href={u} target="_blank" rel="noreferrer">{l}</a></li>)}</ul>
        <p>{ab.method} Screening estimate: replace with a NIC MAP PMA pull before LOI.</p>
      </details>
    </div>
  );
}
