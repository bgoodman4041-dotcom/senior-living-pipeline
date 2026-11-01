"use client";
import { useMemo, useState } from "react";
import { underwrite } from "@/lib/underwrite";
import { pct, usdM, usd } from "@/lib/format";

export default function WhatIf({ site, markets, a }: { site: any; markets: any[]; a: any }) {
  const base = useMemo(() => underwrite(site, markets, a), [site, markets, a]);
  const init = { rentIndex: base.rent_index, hardCostPsf: base.hard_cost_psf, taxPerUnit: base.tax_per_unit, landCost: base.land_cost, occupancyDelta: 0 };
  const [w, setW] = useState(init);
  const u = useMemo(() => underwrite(site, markets, a, w), [site, markets, a, w]);
  const h = a.hurdle_yoc;
  const dirty = JSON.stringify(w) !== JSON.stringify(init);
  const landMax = Math.max(base.land_cost * 2.5, base.max_land_by_tax_structure.nonprofit_exempt, 5e6);
  const sliders = [
    { k: "rentIndex", label: "Submarket rent index", min: 0.7, max: 1.4, step: 0.01, fmt: (v: number) => v.toFixed(2) + "x", help: "1.00 = Westchester base rates" },
    { k: "hardCostPsf", label: "Hard cost $/SF (before county index)", min: 260, max: 480, step: 5, fmt: (v: number) => `$${v}`, help: "Base $" + a.hard_cost_psf + "/SF" },
    { k: "taxPerUnit", label: "Property tax per unit / yr", min: 0, max: 22000, step: 250, fmt: (v: number) => usd(v), help: "Fully taxed case" },
    { k: "landCost", label: "Land price", min: 0, max: Math.round(landMax / 1e5) * 1e5, step: 100000, fmt: (v: number) => usdM(v), help: "Total, all-in" },
    { k: "occupancyDelta", label: "Stabilized occupancy vs model", min: -0.1, max: 0.04, step: 0.005, fmt: (v: number) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)} pts`, help: "Applied to every care level" },
  ] as const;
  const tile = (label: string, v: string, delta?: string, good?: boolean) => (
    <div className="score-cell">
      <span className="xs muted">{label}</span>
      <span className="v" style={{ color: good === undefined ? undefined : good ? "var(--pursue)" : "var(--danger)" }}>{v}</span>
      <span className="xs muted">{delta || " "}</span>
    </div>
  );
  const dB = (x: number, y: number) => `${x - y >= 0 ? "+" : "−"}${Math.abs(Math.round((x - y) * 10000))} bps vs base`;
  return (
    <div className="grid g2" style={{ alignItems: "start" }}>
      <div className="grid" style={{ gap: 16 }}>
        {sliders.map((s) => (
          <label key={s.k} style={{ display: "block" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span>{s.label}</span><b className="tnum">{s.fmt((w as any)[s.k])}</b>
            </div>
            <input type="range" min={s.min} max={s.max} step={s.step} value={(w as any)[s.k]}
              onChange={(e) => setW({ ...w, [s.k]: Number(e.target.value) })} aria-label={s.label} />
            <div className="xs muted">{s.help}</div>
          </label>
        ))}
        <div><button className="btn" onClick={() => setW(init)} disabled={!dirty}>Reset to underwritten case</button></div>
      </div>
      <div>
        <div className="grid g2" style={{ gap: 10 }}>
          {tile("YOC · fully taxed", pct(u.yoc), dB(u.yoc, base.yoc), u.yoc >= h)}
          {tile("YOC · PILOT", pct(u.yoc_by_tax_structure.pilot), dB(u.yoc_by_tax_structure.pilot, base.yoc_by_tax_structure.pilot), u.yoc_by_tax_structure.pilot >= h)}
          {tile("YOC · nonprofit", pct(u.yoc_by_tax_structure.nonprofit_exempt), dB(u.yoc_by_tax_structure.nonprofit_exempt, base.yoc_by_tax_structure.nonprofit_exempt), u.yoc_by_tax_structure.nonprofit_exempt >= h)}
          {tile(`Max land @ ${pct(h, 1)}`, usdM(u.max_land), `Base ${usdM(base.max_land)}`)}
          {tile("Land cushion", usdM(u.land_cushion), `At ${usdM(u.land_cost)} land`, u.land_cushion >= 0)}
          {tile("DSCR", `${(u.dscr ?? 0).toFixed(2)}x`, `NOI ${usdM(u.noi, 2)}`, (u.dscr ?? 0) >= 1.25)}
        </div>
        <div className="callout" style={{ marginTop: 14 }}>
          {u.yoc >= h
            ? <>At these inputs the deal clears the {pct(h, 1)} floor fully taxed, with {usdM(u.land_cushion)} of land headroom.</>
            : u.yoc_by_tax_structure.pilot >= h
              ? <>Fully taxed misses the floor; a PILOT carries it to {pct(u.yoc_by_tax_structure.pilot)}.</>
              : <>Below the floor under taxed and PILOT structures. Land would need to fall to {usdM(Math.max(0, u.max_land))} to reach {pct(h, 1)} fully taxed.</>}
        </div>
        <div className="xs muted" style={{ marginTop: 8 }}>Runs the same model as the underwriting (TypeScript port of underwrite.py, verified against all sites). Changes are not saved.</div>
      </div>
    </div>
  );
}
