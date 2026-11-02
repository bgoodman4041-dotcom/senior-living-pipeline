"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as MLMap } from "maplibre-gl";
import { baseStyle, setBasemap } from "@/lib/mapstyle";
import { buildMassing, CARE_STYLE, FACADE, type Line } from "@/lib/massing";
import { bboxOf } from "@/lib/geo";

interface Props { lat: number; lon: number; acres: number; lines: Line[]; gsfPerUnit: Record<string, number>; parking: number; units: number; name: string }

export default function Massing3D(p: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const spin = useRef<number | null>(null);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"satellite" | "streets">("satellite");
  const [rotating, setRotating] = useState(false);
  const [is3d, setIs3d] = useState(true);
  const [look, setLook] = useState<"render" | "program">("render");
  const [hover, setHover] = useState<{ care: string; stories: number } | null>(null);
  const m = useMemo(() => buildMassing([p.lon, p.lat], p.lines, p.gsfPerUnit, p.acres, p.parking), [p.lon, p.lat, p.lines, p.gsfPerUnit, p.acres, p.parking]);
  const bounds = useMemo(() => bboxOf(m.parts.features as any[])!, [m]);

  const frame = (mm: MLMap, animate = true, threeD = true) => {
    mm.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], { padding: 70, pitch: threeD ? 58 : 0, bearing: threeD ? -28 : 0, duration: animate ? 900 : 0, maxZoom: 18.2 });
  };

  useEffect(() => {
    let dead = false;
    (async () => {
      const ml = (await import("maplibre-gl")).default;
      if (dead || !el.current) return;
      const mm = new ml.Map({ container: el.current, style: baseStyle(), center: [p.lon, p.lat], zoom: 16.5, pitch: 58, bearing: -28, maxPitch: 75, attributionControl: { compact: true } });
      mm.addControl(new ml.NavigationControl({ visualizePitch: true }), "bottom-right");
      mm.addControl(new ml.FullscreenControl(), "bottom-right");
      mm.on("load", () => {
        setBasemap(mm, "satellite");
        mm.addSource("mass", { type: "geojson", data: m.parts });
        mm.addLayer({ id: "mass-flat", type: "fill", source: "mass", filter: ["!=", ["get", "kind"], "building"], paint: { "fill-color": ["get", "color"], "fill-opacity": 0.75 } });
        mm.addLayer({ id: "mass-flat-line", type: "line", source: "mass", filter: ["!=", ["get", "kind"], "building"], paint: { "line-color": "#ffffff", "line-width": 1, "line-opacity": 0.7 } });
        mm.addLayer({
          id: "mass-3d", type: "fill-extrusion", source: "mass", filter: ["==", ["get", "kind"], "building"],
          paint: { "fill-extrusion-color": ["get", "color"], "fill-extrusion-height": ["get", "height"], "fill-extrusion-base": ["get", "base"], "fill-extrusion-opacity": 0.94, "fill-extrusion-vertical-gradient": true },
        });
        mm.addSource("render", { type: "geojson", data: m.render });
        mm.addLayer({
          id: "render-3d", type: "fill-extrusion", source: "render", layout: { visibility: "visible" },
          paint: { "fill-extrusion-color": ["get", "color"], "fill-extrusion-height": ["get", "height"], "fill-extrusion-base": ["get", "base"], "fill-extrusion-opacity": 1, "fill-extrusion-vertical-gradient": false },
        });
        mm.setLayoutProperty("mass-3d", "visibility", "none");
        try { mm.setLight({ anchor: "map", position: [1.4, 215, 35], color: "#fff8ee", intensity: 0.42 }); } catch {}
        for (const id of ["mass-3d", "render-3d"]) {
          mm.on("mousemove", id, (e: any) => {
            const f = e.features?.find((x: any) => x.properties.care); mm.getCanvas().style.cursor = f ? "pointer" : "";
            setHover(f ? { care: f.properties.care, stories: +f.properties.stories } : null);
          });
          mm.on("mouseleave", id, () => { mm.getCanvas().style.cursor = ""; setHover(null); });
        }
        frame(mm, false);
        setReady(true);
      });
      ["dragstart", "zoomstart", "pitchstart"].forEach((ev) => mm.on(ev, (e: any) => { if (e.originalEvent) setRotating(false); }));
      map.current = mm;
    })();
    return () => { dead = true; if (spin.current) cancelAnimationFrame(spin.current); map.current?.remove(); map.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (ready && map.current) setBasemap(map.current, mode); }, [mode, ready]);
  useEffect(() => {
    const mm = map.current;
    if (!ready || !mm) return;
    mm.setLayoutProperty("render-3d", "visibility", look === "render" ? "visible" : "none");
    mm.setLayoutProperty("mass-3d", "visibility", look === "program" ? "visible" : "none");
  }, [look, ready]);
  useEffect(() => {
    const mm = map.current;
    if (!ready || !mm) return;
    if (!rotating) { if (spin.current) cancelAnimationFrame(spin.current); spin.current = null; return; }
    let last = performance.now();
    const tick = (t: number) => {
      mm.setBearing(mm.getBearing() + ((t - last) / 1000) * 9);
      last = t; spin.current = requestAnimationFrame(tick);
    };
    spin.current = requestAnimationFrame(tick);
    return () => { if (spin.current) cancelAnimationFrame(spin.current); };
  }, [rotating, ready]);

  const s = m.stats;
  const k = (n: number) => Math.round(n).toLocaleString("en-US");
  return (
    <div className="grid g-side" style={{ alignItems: "start" }}>
      <div className="map-shell">
        <div ref={el} className="map map-tall" aria-label={`3D concept massing for ${p.name}`} />
        <div className="map-overlay map-tools">
          <div className="seg" role="group" aria-label="Basemap">
            <button aria-pressed={mode === "satellite"} onClick={() => setMode("satellite")}>Satellite</button>
            <button aria-pressed={mode === "streets"} onClick={() => setMode("streets")}>Map</button>
          </div>
          <div className="seg" role="group" aria-label="Style">
            <button aria-pressed={look === "render"} onClick={() => setLook("render")}>Rendered</button>
            <button aria-pressed={look === "program"} onClick={() => setLook("program")}>By care level</button>
          </div>
          <div className="seg" role="group" aria-label="View">
            <button aria-pressed={is3d} onClick={() => { setIs3d(true); map.current && frame(map.current, true, true); }}>3D</button>
            <button aria-pressed={!is3d} onClick={() => { setIs3d(false); setRotating(false); map.current && frame(map.current, true, false); }}>Plan</button>
            <button aria-pressed={rotating} onClick={() => { if (!is3d) { setIs3d(true); map.current && frame(map.current, true, true); } setRotating(!rotating); }}>Orbit</button>
          </div>
        </div>
        {hover && (
          <div className="map-overlay map-status small"><b>{CARE_STYLE[hover.care]?.label || hover.care}</b> · {hover.stories} stories</div>
        )}
        <div className="map-overlay map-legend">
          {Array.from(new Set(s.wings.map((w) => w.care))).map((c) => (
            <div className="row" key={c}><span style={{ width: 14, height: 10, background: look === "render" ? FACADE[c]?.body : CARE_STYLE[c]?.color, border: "1px solid rgba(0,0,0,.25)", flex: "none" }} />{CARE_STYLE[c]?.label} · {CARE_STYLE[c]?.stories} st{look === "render" ? ` · ${FACADE[c]?.label.toLowerCase()}` : ""}</div>
          ))}
          <div className="row"><span style={{ width: 14, height: 10, background: "#76B96A", flex: "none" }} />Courtyard</div>
          <div className="row"><span style={{ width: 14, height: 10, background: "#6b7280", flex: "none" }} />Surface parking</div>
        </div>
      </div>
      <div className="grid" style={{ gap: 14 }}>
        <div className="card card-pad">
          <div className="label" style={{ marginBottom: 10 }}>Concept program on {p.acres} acres</div>
          <div className="grid" style={{ gap: 10, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
            {[
              ["Units", k(p.units)], ["Gross SF", k(s.gsf)],
              ["Building footprint", `${k(s.footprintSf)} SF`], ["Lot coverage", `${(s.coveragePct * 100).toFixed(0)}%`],
              ["FAR", s.far.toFixed(2)], ["Height", `${s.maxStories} st · ~${Math.round(s.heightFt)} ft`],
              ["Parking", `${s.parking} spaces`], ["Open space", `${(s.openSpacePct * 100).toFixed(0)}%`],
            ].map(([a, b]) => (
              <div key={a} className="score-cell"><span className="xs muted">{a}</span><span className="v" style={{ fontSize: 19 }}>{b}</span></div>
            ))}
          </div>
        </div>
        <div className="card card-pad">
          <div className="label" style={{ marginBottom: 6 }}>Wings</div>
          <table className="t"><thead><tr><th>Care</th><th className="num">Stories</th><th className="num">GSF</th><th className="num">Wing length</th></tr></thead>
            <tbody>{s.wings.map((w) => <tr key={w.care}><td><span style={{ display: "inline-block", width: 10, height: 10, background: CARE_STYLE[w.care]?.color, marginRight: 8, borderRadius: 2 }} />{w.care}</td><td className="num">{w.stories}</td><td className="num">{k(w.sf)}</td><td className="num">{k(w.lengthFt)} ft</td></tr>)}</tbody>
          </table>
          <p className="xs muted" style={{ marginTop: 10, marginBottom: 0 }}>
            Generated from the underwritten unit mix: double-loaded 65-ft wings around {s.blocks > 1 ? `${s.blocks} courtyards` : "a courtyard"}, IL at 4 stories, AL at 3, MC at 2, surface parking at ~320 SF per space. The rendered view adds a stone base, floor-by-floor glazing, cornice, rooftop units, a porte-cochère and landscape as a conceptual character study. It shows scale, height and coverage against the site. It is not a site plan; setbacks, grading and access come with the civil and zoning work.
          </p>
        </div>
      </div>
    </div>
  );
}
