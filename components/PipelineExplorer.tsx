"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import OverviewMap, { type MapSite } from "./OverviewMap";
import YocDotPlot from "./YocDotPlot";
import { pct, usdM } from "@/lib/format";

type TaxKey = "full_tax" | "pilot" | "nonprofit_exempt";
const TAX_LABEL: Record<TaxKey, string> = { full_tax: "Fully taxed", pilot: "PILOT", nonprofit_exempt: "Nonprofit" };
const VERDICT_COLOR: Record<string, string> = { Pursue: "#33772a", "Pursue-structured": "#3079B3", Watch: "#F7901E", Pass: "#A3A3A3" };
const VERDICTS = ["Pursue", "Pursue-structured", "Watch", "Pass"];
const YOC_BANDS = [
  { label: "≥ 7.5% target", min: 0.075, color: "#33772a" },
  { label: "6.5% – 7.5%", min: 0.065, color: "#3079B3" },
  { label: "6.0% – 6.5% (near miss)", min: 0.06, color: "#F7901E" },
  { label: "< 6.0%", min: -1, color: "#A3A3A3" },
];

export interface Row {
  id: string; rank: number; name: string; municipality: string; county: string; state: string;
  verdict: string; verdict_reason: string; track: string; units: number; acres: number; drive: number;
  lat: number; lon: number; yoc: Record<TaxKey, number>; max_land: Record<TaxKey, number>;
  land_cost: number; land_basis: string; dscr: number; approval: number; rent: number; need: number; total: number;
  next_step: string; short: boolean; capital: number; equity: number; debt: number; entRisk: number; entBand: string; entPath: string; like: number; likeBand: string;
}

type SortKey = "rank" | "name" | "state" | "units" | "capital" | "entRisk" | "like" | "yoc" | "max_land" | "land_cost" | "cushion" | "dscr" | "approval" | "rent" | "need";

export default function PipelineExplorer({ rows, hurdle, target }: { rows: Row[]; hurdle: number; target: number }) {
  const router = useRouter();
  const [state, setState] = useState("All");
  const [county, setCounty] = useState("All");
  const [verdicts, setVerdicts] = useState<string[]>(VERDICTS);
  const [track, setTrack] = useState("All");
  const [minApproval, setMinApproval] = useState(0);
  const [minYoc, setMinYoc] = useState(0);
  const [maxDrive, setMaxDrive] = useState(150);
  const [tax, setTax] = useState<TaxKey>("full_tax");
  const [colorBy, setColorBy] = useState<"verdict" | "yoc">("verdict");
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: "rank", dir: 1 });
  const [q, setQ] = useState("");

  const counties = useMemo(() => Array.from(new Set(rows.filter((r) => state === "All" || r.state === state).map((r) => `${r.county}`))).sort(), [rows, state]);

  const filtered = useMemo(() => rows.filter((r) =>
    (state === "All" || r.state === state) &&
    (county === "All" || r.county === county) &&
    verdicts.includes(r.verdict) &&
    (track === "All" || r.track === track) &&
    r.approval >= minApproval &&
    r.yoc[tax] >= minYoc / 100 &&
    r.drive <= maxDrive &&
    (!q || `${r.name} ${r.municipality} ${r.county}`.toLowerCase().includes(q.toLowerCase()))
  ), [rows, state, county, verdicts, track, minApproval, minYoc, maxDrive, tax, q]);

  const sorted = useMemo(() => {
    const val = (r: Row): any => {
      switch (sort.k) {
        case "yoc": return r.yoc[tax];
        case "max_land": return r.max_land[tax];
        case "capital": return r.capital;
        case "cushion": return r.max_land[tax] - r.land_cost;
        default: return (r as any)[sort.k];
      }
    };
    return [...filtered].sort((a, b) => {
      const x = val(a), y = val(b);
      return (typeof x === "string" ? x.localeCompare(y) : x - y) * sort.dir;
    });
  }, [filtered, sort, tax]);

  const colorOf = (r: Row) => colorBy === "verdict" ? VERDICT_COLOR[r.verdict] : YOC_BANDS.find((b) => r.yoc[tax] >= b.min)!.color;
  const mapSites: MapSite[] = filtered.map((r) => ({
    id: r.id, name: r.name, municipality: r.municipality, state: r.state, lat: r.lat, lon: r.lon,
    color: colorOf(r), verdict: r.verdict, yoc: r.yoc[tax], rank: r.rank, units: r.units, short: r.short,
  }));
  const legend = colorBy === "verdict"
    ? VERDICTS.map((v) => ({ label: `${v} (${filtered.filter((r) => r.verdict === v).length})`, color: VERDICT_COLOR[v] }))
    : YOC_BANDS.map((b, i) => ({ label: `${b.label} (${filtered.filter((r) => r.yoc[tax] >= b.min && (i === 0 || r.yoc[tax] < YOC_BANDS[i - 1].min)).length})`, color: b.color }));
  const clearing = filtered.filter((r) => r.yoc[tax] >= hurdle).length;

  const th = (k: SortKey, label: string, num = false, title?: string) => (
    <th className={`sortable${num ? " num" : ""}`} title={title} aria-sort={sort.k === k ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
      onClick={() => setSort((s) => ({ k, dir: s.k === k ? (s.dir === 1 ? -1 : 1) : (num ? -1 : 1) }))}>
      {label}{sort.k === k ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
    </th>
  );
  const exportCsv = () => {
    const head = ["Rank", "ID", "Site", "Municipality", "County", "State", "Verdict", "Track", "Units", "Total capitalization $", "Equity $", "Construction debt $", "Acres", "Drive min", `YOC ${TAX_LABEL[tax]}`, "YOC fully taxed", "YOC PILOT", "YOC nonprofit", `Max land ${TAX_LABEL[tax]}`, "Land basis $", "Land basis source", "Cushion $", "DSCR", "Approval", "Entitlement path", "Entitlement risk", "Approval likelihood %", "Rent support", "Need", "Composite", "Verdict reason", "Next step"];
    const q = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = sorted.map((r) => [r.rank, r.id, r.name, r.municipality, r.county, r.state, r.verdict, r.track, r.units, Math.round(r.capital), Math.round(r.equity), Math.round(r.debt), r.acres, r.drive,
      (r.yoc[tax] * 100).toFixed(2) + "%", (r.yoc.full_tax * 100).toFixed(2) + "%", (r.yoc.pilot * 100).toFixed(2) + "%", (r.yoc.nonprofit_exempt * 100).toFixed(2) + "%",
      Math.round(r.max_land[tax]), Math.round(r.land_cost), r.land_basis, Math.round(r.max_land[tax] - r.land_cost), r.dscr.toFixed(2), r.approval, r.entPath, r.entRisk, r.like, r.rent, r.need, r.total, r.verdict_reason, r.next_step].map(q).join(","));
    const blob = new Blob([[head.map(q).join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `atco-senior-living-pipeline-${tax}.csv`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const reset = () => { setState("All"); setCounty("All"); setVerdicts(VERDICTS); setTrack("All"); setMinApproval(0); setMinYoc(0); setMaxDrive(150); setQ(""); };

  return (
    <>
      <div className="card filters" style={{ marginBottom: 14 }}>
        <label className="f"><span>Search</span><input type="search" placeholder="Site, town, county" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 170 }} /></label>
        <label className="f"><span>State</span>
          <select value={state} onChange={(e) => { setState(e.target.value); setCounty("All"); }}>
            {["All", "NY", "NJ", "CT"].map((s) => <option key={s}>{s}</option>)}
          </select></label>
        <label className="f"><span>County</span>
          <select value={county} onChange={(e) => setCounty(e.target.value)}>
            <option>All</option>{counties.map((c) => <option key={c}>{c}</option>)}
          </select></label>
        <label className="f"><span>Track</span>
          <select value={track} onChange={(e) => setTrack(e.target.value)}>
            {["All", "Rental AL/MC", "Continuum"].map((s) => <option key={s}>{s}</option>)}
          </select></label>
        <label className="f"><span>Min approval</span><input type="number" min={0} max={100} step={5} value={minApproval} onChange={(e) => setMinApproval(+e.target.value || 0)} style={{ width: 80 }} /></label>
        <label className="f"><span>Min YOC %</span><input type="number" min={0} max={12} step={0.25} value={minYoc} onChange={(e) => setMinYoc(+e.target.value || 0)} style={{ width: 80 }} /></label>
        <label className="f"><span>Max drive (min)</span><input type="number" min={15} max={150} step={15} value={maxDrive} onChange={(e) => setMaxDrive(+e.target.value || 150)} style={{ width: 90 }} /></label>
        <div className="f"><span>Tax structure</span>
          <div className="seg" role="group" aria-label="Tax structure">
            {(Object.keys(TAX_LABEL) as TaxKey[]).map((k) => <button key={k} aria-pressed={tax === k} onClick={() => setTax(k)}>{TAX_LABEL[k]}</button>)}
          </div></div>
        <div className="f" style={{ width: "100%" }}><span>Verdict</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            {VERDICTS.map((v) => {
              const on = verdicts.includes(v);
              return (
                <button key={v} className={`chip v-${v}`} style={{ opacity: on ? 1 : 0.4, cursor: "pointer", font: "inherit", fontSize: 12, fontWeight: 600 }} aria-pressed={on}
                  onClick={() => setVerdicts(on ? verdicts.filter((x) => x !== v) : [...verdicts, v])}>
                  <span className="dot" style={{ background: VERDICT_COLOR[v] }} />{v} · {rows.filter((r) => r.verdict === v).length}
                </button>
              );
            })}
            <button className="btn" style={{ padding: "4px 10px", fontSize: 12 }} onClick={reset}>Reset filters</button>
            <span className="small muted" style={{ marginLeft: "auto" }}>
              <b style={{ color: "var(--ink)" }}>{filtered.length}</b> of {rows.length} sites · <b style={{ color: "var(--ink)" }}>{clearing}</b> clear {pct(hurdle, 1)} {tax === "pilot" ? "with PILOT" : TAX_LABEL[tax].toLowerCase()}
            </span>
          </div></div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, alignItems: "center", marginBottom: 8 }}>
        <span className="label">Color pins by</span>
        <div className="seg" role="group" aria-label="Color pins by">
          <button aria-pressed={colorBy === "verdict"} onClick={() => setColorBy("verdict")}>Verdict</button>
          <button aria-pressed={colorBy === "yoc"} onClick={() => setColorBy("yoc")}>YOC · {TAX_LABEL[tax]}</button>
        </div>
      </div>
      <OverviewMap sites={mapSites} legend={legend} yocLabel={`YOC (${TAX_LABEL[tax]})`} />

      <div className="section-head" style={{ marginTop: 34 }}>
        <div><h2 className="rule-title">Ranked pipeline</h2>
          <p>Every underwritten site, ranked by verdict then composite score. YOC, max land and cushion follow the tax-structure toggle. Click a row for the full dossier.</p></div>
        <button className="btn" onClick={exportCsv}>Export {filtered.length} sites to CSV</button>
      </div>
      <div className="card hide-sm">
        <div className="table-wrap">
          <table className="t">
            <thead><tr>
              {th("rank", "#", true)}{th("name", "Site")}{th("state", "State")}<th>Verdict</th>{th("units", "Units", true)}
              {th("capital", "Capital needed", true, "Total capitalization; equity and 60% LTC construction debt below")}
              {th("yoc", `YOC · ${TAX_LABEL[tax]}`, true, "Stabilized NOI / all-in cost incl. land")}
              {th("max_land", "Max land @ 6.5%", true, "NOI / 6.5% − cost ex-land")}
              {th("land_cost", "Land basis", true)}{th("cushion", "Cushion", true, "Max land − land basis")}
              {th("dscr", "DSCR", true, "60% LTC, 6.75%, 30-yr amortization")}
              {th("approval", "Appr.", true, "Town approval score (0–100)")}{th("entRisk", "Ent. risk", true, "Entitlement risk score (0–100, higher is riskier): path, opposition, environmental screening, utilities")}{th("like", "Odds", true, "Town approval likelihood (%): approval score blended with inverse entitlement risk")}{th("rent", "Rent", true, "Rent support score")}{th("need", "Need", true, "Need score")}
              <th>Next step</th>
            </tr></thead>
            <tbody>
              {sorted.map((r) => {
                const cushion = r.max_land[tax] - r.land_cost;
                return (
                  <tr key={r.id} className={`row-link${r.short ? " short" : ""}`} onClick={() => router.push(`/sites/${r.id}`)}>
                    <td className="num">{r.rank}</td>
                    <td style={{ minWidth: 230 }}><a href={`/sites/${r.id}`} className="site-name" onClick={(e) => e.stopPropagation()}>{r.name}</a><div className="xs muted">{r.municipality} · {r.county} · {r.acres} ac · {r.drive} min</div></td>
                    <td>{r.state}</td>
                    <td><span className={`chip v-${r.verdict}`}><span className="dot" style={{ background: VERDICT_COLOR[r.verdict] }} />{r.verdict}</span></td>
                    <td className="num">{r.units}</td>
                    <td className="num" style={{ whiteSpace: "nowrap" }}><b>{usdM(r.capital)}</b><div className="xs muted">Eq {usdM(r.equity)} · Debt {usdM(r.debt)}</div></td>
                    <td className="num" style={{ fontWeight: 700, color: r.yoc[tax] >= hurdle ? "var(--pursue)" : "var(--ink-2)" }}>{pct(r.yoc[tax])}</td>
                    <td className="num">{usdM(r.max_land[tax])}</td>
                    <td className="num" title={`Land basis: ${r.land_basis}`}>{usdM(r.land_cost)}<div className="xs muted">{r.land_basis}</div></td>
                    <td className="num" style={{ color: cushion >= 0 ? "var(--pursue)" : "var(--danger)" }}>{usdM(cushion)}</td>
                    <td className="num">{r.dscr.toFixed(2)}x</td>
                    <td className="num">{r.approval}</td><td className="num" title={`${r.entPath} · ${r.entBand}`} style={{ color: r.entRisk >= 70 ? "var(--danger)" : r.entRisk >= 55 ? "#c46f0a" : "var(--ink-2)" }}>{r.entRisk}</td><td className="num" title={r.likeBand} style={{ color: r.like >= 65 ? "#33772a" : r.like < 50 ? "#c46f0a" : "var(--ink-2)" }}>{r.like}%</td><td className="num">{r.rent}</td><td className="num">{r.need}</td>
                    <td className="small" style={{ minWidth: 220 }}>{r.next_step}</td>
                  </tr>
                );
              })}
              {!sorted.length && <tr><td colSpan={17} className="muted" style={{ padding: 24, textAlign: "center" }}>No sites match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <div className="only-sm">
        <div className="mcards">
          {sorted.map((r) => (
            <a key={r.id} href={`/sites/${r.id}`} className="card mcard" style={{ color: "var(--ink)" }}>
              <div className="top">
                <div><div className="xs muted">#{r.rank} · {r.state} · {r.municipality}</div><div style={{ fontWeight: 600 }}>{r.name}</div></div>
                <span className={`chip v-${r.verdict}`}><span className="dot" style={{ background: VERDICT_COLOR[r.verdict] }} />{r.verdict}</span>
              </div>
              <div className="row3">
                <div><span className="muted">YOC</span><b>{pct(r.yoc[tax])}</b></div>
                <div><span className="muted">Max land</span><b>{usdM(r.max_land[tax])}</b></div>
                <div><span className="muted">Capital</span><b>{usdM(r.capital)}</b></div>
              </div>
            </a>
          ))}
        </div>
      </div>

      <div className="section-head" style={{ marginTop: 40 }}>
        <div><h2 className="rule-title">Yield on cost by tax structure</h2>
          <p>Each row is a site that survived the gates or is entitled but short. The swing from fully taxed to nonprofit-exempt is the RiverSpring advantage, measured site by site.</p></div>
      </div>
      <div className="card card-pad">
        <YocDotPlot rows={rows.filter((r) => r.verdict !== "Pass" || r.yoc.nonprofit_exempt >= hurdle - 0.005)} hurdle={hurdle} target={target} highlight={tax} />
      </div>
    </>
  );
}
