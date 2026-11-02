"use client";
import { useState } from "react";
import type { Row } from "./PipelineExplorer";

const X0 = 0.03, X1 = 0.11;
const xp = (v: number) => `${((Math.max(X0, Math.min(X1, v)) - X0) / (X1 - X0)) * 100}%`;
const VERDICT_COLOR: Record<string, string> = { Pursue: "#3f8a35", "Pursue-structured": "#3079B3", Watch: "#F7901E", Pass: "#A3A3A3" };

export default function YocDotPlot({ rows, hurdle, target, highlight }: { rows: Row[]; hurdle: number; target: number; highlight: string }) {
  const [tip, setTip] = useState<{ x: number; y: number; r: Row } | null>(null);
  const sorted = [...rows].sort((a, b) => b.yoc.full_tax - a.yoc.full_tax);
  const ticks = [0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.1, 0.11];
  return (
    <div className="svg-chart" style={{ position: "relative" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 18px", fontSize: 12, color: "var(--ink-2)", marginBottom: 14 }}>
        <span><svg width="12" height="12"><circle cx="6" cy="6" r="5" fill="#403393" /></svg> Fully taxed</span>
        <span><svg width="12" height="12"><rect x="5" y="0" width="2.5" height="12" fill="#403393" /></svg> PILOT</span>
        <span><svg width="12" height="12"><circle cx="6" cy="6" r="4.5" fill="#fff" stroke="#403393" strokeWidth="1.8" /></svg> Nonprofit exempt</span>
        <span><svg width="22" height="10"><line x1="0" y1="5" x2="22" y2="5" stroke="#BB2034" strokeWidth="1.6" strokeDasharray="4 3" /></svg> {(hurdle * 100).toFixed(1)}% floor</span>
        <span><svg width="22" height="10"><line x1="0" y1="5" x2="22" y2="5" stroke="#F7901E" strokeWidth="1.6" strokeDasharray="4 3" /></svg> {(target * 100).toFixed(1)}% target</span>
        <span className="muted">Name color = verdict. Active toggle: <b>{highlight === "full_tax" ? "Fully taxed" : highlight === "pilot" ? "PILOT" : "Nonprofit"}</b></span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(120px, 260px) 1fr", columnGap: 14 }}>
        <div />
        <div style={{ position: "relative", height: 18, fontSize: 11, color: "var(--ink-3)" }}>
          {ticks.map((t) => <span key={t} style={{ position: "absolute", left: xp(t), transform: "translateX(-50%)" }}>{(t * 100).toFixed(0)}%</span>)}
        </div>
        {sorted.map((r) => {
          const y = r.yoc;
          return (
            <div key={r.id} style={{ display: "contents" }}>
              <a href={`/sites/${r.id}`} className="small" style={{ padding: "5px 0", borderTop: "1px solid var(--rule)", color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={r.name}>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: VERDICT_COLOR[r.verdict], marginRight: 7 }} />
                {r.municipality.replace(/^(Town|Village|City) of /, "")} <span className="muted">· {r.name}</span>
              </a>
              <div style={{ position: "relative", borderTop: "1px solid var(--rule)", height: 28 }}
                onMouseMove={(e) => setTip({ x: e.clientX, y: e.clientY, r })} onMouseLeave={() => setTip(null)}>
                {ticks.map((t) => <span key={t} style={{ position: "absolute", left: xp(t), top: 0, bottom: 0, width: 1, background: "#f0ece4" }} />)}
                <span style={{ position: "absolute", left: xp(hurdle), top: 0, bottom: 0, borderLeft: "1.6px dashed #BB2034" }} />
                <span style={{ position: "absolute", left: xp(target), top: 0, bottom: 0, borderLeft: "1.6px dashed #F7901E" }} />
                <span style={{ position: "absolute", left: xp(y.full_tax), width: `calc(${xp(y.nonprofit_exempt)} - ${xp(y.full_tax)})`, top: 13, height: 2, background: "#9aa6b8" }} />
                <span style={{ position: "absolute", left: xp(y.pilot), top: 6, width: 3, height: 16, marginLeft: -1.5, background: "#403393", outline: highlight === "pilot" ? "2px solid #F7901E" : "none", borderRadius: 1 }} />
                <span style={{ position: "absolute", left: xp(y.nonprofit_exempt), top: 8, width: 12, height: 12, marginLeft: -6, borderRadius: "50%", background: "#fff", border: "2px solid #403393", boxShadow: highlight === "nonprofit_exempt" ? "0 0 0 2px #F7901E" : "none" }} />
                <span style={{ position: "absolute", left: xp(y.full_tax), top: 8, width: 12, height: 12, marginLeft: -6, borderRadius: "50%", background: "#403393", border: "2px solid #fff", boxShadow: highlight === "full_tax" ? "0 0 0 2px #F7901E" : "0 0 0 1px #403393" }} />
              </div>
            </div>
          );
        })}
      </div>
      {tip && (
        <div className="tip" style={{ left: Math.min(tip.x + 14, (typeof window !== "undefined" ? window.innerWidth : 1200) - 290), top: tip.y + 14 }}>
          <b>{tip.r.name}</b><br />{tip.r.municipality}, {tip.r.state} · {tip.r.verdict}<br />
          Fully taxed {(tip.r.yoc.full_tax * 100).toFixed(2)}% · PILOT {(tip.r.yoc.pilot * 100).toFixed(2)}% · Nonprofit {(tip.r.yoc.nonprofit_exempt * 100).toFixed(2)}%
        </div>
      )}
    </div>
  );
}
