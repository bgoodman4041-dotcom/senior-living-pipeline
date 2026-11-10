"use client";
import { useEffect, useRef, useState } from "react";
import type { Map as MLMap, Marker } from "maplibre-gl";
import { useNear } from "@/lib/useNear";
import { baseStyle, setBasemap } from "@/lib/mapstyle";
import { circle } from "@/lib/geo";
import { quietMapErrors, staticMapUrl } from "@/lib/mapkit";
import MapState from "@/components/MapState";

export interface MapSite {
  id: string; name: string; municipality: string; state: string; lat: number; lon: number;
  color: string; verdict: string; yoc: number; rank: number; units: number; short: boolean;
}

const esc = (t: any) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" } as any)[c]);
const MIDTOWN: [number, number] = [-73.984, 40.7549];
// Straight-line radius that roughly matches observed drive times in the data (~0.55 mi per minute off-peak).
const RINGS = [{ min: 60, mi: 33 }, { min: 90, mi: 50 }, { min: 120, mi: 66 }, { min: 150, mi: 83 }];

export default function OverviewMap({ sites, legend, yocLabel }: { sites: MapSite[]; legend: { label: string; color: string }[]; yocLabel: string }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const lib = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [mode, setMode] = useState<"streets" | "satellite">("streets");
  const [rings, setRings] = useState(true);

  const near = useNear(el);
  useEffect(() => {
    if (!near) return;
    let dead = false;
    (async () => {
      let ml: any, m: MLMap;
      try {
        ml = (await import("maplibre-gl")).default;
        if (dead || !el.current) return;
        m = new ml.Map({
          container: el.current, style: baseStyle(), center: [-73.95, 41.0], zoom: 7.2,
          attributionControl: { compact: true }, cooperativeGestures: false, dragRotate: false,
          locale: { "Map.Title": "Map of candidate sites" },
        });
      } catch { if (!dead) setFailed(true); return; }
      lib.current = ml;
      quietMapErrors(m);
      m.addControl(new ml.NavigationControl({ showCompass: false }), "bottom-right");
      m.addControl(new ml.FullscreenControl(), "bottom-right");
      if (el.current.clientWidth < 560 && sites.length) {
        const xs = sites.map((s) => s.lon), ys = sites.map((s) => s.lat);
        m.fitBounds([[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]], { padding: { top: 60, bottom: 24, left: 14, right: 14 }, duration: 0 });
      }
      m.on("load", () => {
        m.addSource("rings", { type: "geojson", data: { type: "FeatureCollection", features: RINGS.map((r) => circle(MIDTOWN, r.mi)) } });
        m.addLayer({ id: "rings-line", type: "line", source: "rings", paint: { "line-color": "#403393", "line-width": 1.2, "line-dasharray": [3, 3], "line-opacity": 0.55 } });
        RINGS.forEach((r) => {
          const d = document.createElement("div");
          d.className = "ring-label"; d.textContent = `≈${r.min} min`; d.setAttribute("aria-hidden", "true");
          new ml.Marker({ element: d }).setLngLat([MIDTOWN[0] + (r.mi / 69.172 / Math.cos((MIDTOWN[1] * Math.PI) / 180)) * 0.7071, MIDTOWN[1] - (r.mi / 69) * 0.7071]).addTo(m);
        });
        const mt = document.createElement("div");
        mt.className = "ring-label"; mt.textContent = "Midtown"; mt.style.background = "#403393"; mt.style.color = "#fff"; mt.setAttribute("aria-hidden", "true");
        new ml.Marker({ element: mt }).setLngLat(MIDTOWN).addTo(m);
        setReady(true);
      });
      map.current = m;
    })();
    return () => { dead = true; map.current?.remove(); map.current = null; };
  }, [near]);

  useEffect(() => { if (ready && map.current) setBasemap(map.current, mode); }, [mode, ready]);
  useEffect(() => {
    if (ready && map.current?.getLayer("rings-line")) map.current.setLayoutProperty("rings-line", "visibility", rings ? "visible" : "none");
  }, [rings, ready]);

  useEffect(() => {
    const m = map.current, ml = lib.current;
    if (!ready || !m || !ml) return;
    markers.current.forEach((k) => k.remove());
    markers.current = [];
    // Pass sites first so shortlisted pins sit on top.
    const ordered = [...sites].sort((a, b) => Number(a.short) - Number(b.short) || b.rank - a.rank);
    for (const s of ordered) {
      const d = document.createElement("div");
      d.className = `site-pin${s.short ? " big" : ""}`;
      d.style.background = s.color;
      d.setAttribute("role", "button");
      d.setAttribute("aria-label", `${s.name}, ${s.municipality}: ${s.verdict}. Press Enter for details`);
      const html = `<div class="label" style="margin-bottom:2px">#${s.rank} · ${s.state}</div>
        <h4>${esc(s.name)}</h4><div class="small muted">${esc(s.municipality)}</div>
        <div class="pop-grid"><span>Verdict</span><b>${s.verdict}</b><span>${yocLabel}</span><b>${(s.yoc * 100).toFixed(2)}%</b><span>Units</span><b>${s.units}</b></div>
        <a href="/sites/${s.id}" style="font-weight:600;font-size:12.5px">Open site dossier →</a>`;
      const pop = new ml.Popup({ offset: 16, closeButton: false, maxWidth: "280px" }).setHTML(html);
      const mk = new ml.Marker({ element: d }).setLngLat([s.lon, s.lat]).setPopup(pop).addTo(m);
      markers.current.push(mk);
    }
  }, [sites, ready, yocLabel]);

  return (
    <div className="map-shell">
      <div ref={el} className="map" />
      <MapState state={failed ? "failed" : ready ? "ready" : "loading"} still={staticMapUrl(41.05, -73.9, 3.4, 1000, 560, "World_Street_Map")} alt="Street map of the New York, New Jersey and Connecticut search area" />
      <div className="map-overlay map-tools">
        <div className="seg" role="group" aria-label="Basemap">
          <button aria-pressed={mode === "streets"} onClick={() => setMode("streets")}>Map</button>
          <button aria-pressed={mode === "satellite"} onClick={() => setMode("satellite")}>Satellite</button>
        </div>
        <div className="seg"><button aria-pressed={rings} onClick={() => setRings(!rings)}>Drive rings</button></div>
      </div>
      <div className="map-overlay map-legend">
        {legend.map((l) => (
          <div className="row" key={l.label}><span className="sw" style={{ background: l.color }} />{l.label}</div>
        ))}
        <div className="xs muted" style={{ marginTop: 6 }}>Large pins = shortlist. Rings are approximate straight-line drive bands from Midtown.</div>
      </div>
    </div>
  );
}
