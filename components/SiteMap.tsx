"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as MLMap } from "maplibre-gl";
import { useNear } from "@/lib/useNear";
import { baseStyle, setBasemap, usingMapbox } from "@/lib/mapstyle";
import { circle, pointInGeom, geomAcres, geomCentroid, haversineMi, bboxOf } from "@/lib/geo";
import { CATS, CAT_COLOR, fetchImageryDate, fetchOverlay, fetchPois, fetchParcels, parcelSourceFor, readField, type Cat, type Poi } from "@/lib/live";

interface Props { id: string; name: string; lat: number; lon: number; state: string; county: string; acres: number; verdictColor: string; pinBasis?: string; pinAddress?: string }
type Load<T> = { status: "idle" | "loading" | "ok" | "error" | "na"; data?: T; msg?: string };

const esc = (t: any) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" } as any)[c]);
const fmtMi = (m: number) => (m < 0.1 ? "<0.1 mi" : `${m.toFixed(1)} mi`);

export default function SiteMap(p: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const lib = useRef<any>(null);
  const parcelsRef = useRef<any[]>([]);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"streets" | "satellite">("satellite");
  const [parcels, setParcels] = useState<Load<any[]>>({ status: "idle" });
  const [sel, setSel] = useState<any | null>(null);
  const [pois, setPois] = useState<Load<{ pois: Poi[]; fetchedAt: string; source: string }>>({ status: "idle" });
  const [imgDate, setImgDate] = useState<string | null>(null);
  const [ov, setOv] = useState<Record<"flood" | "wetlands", { on: boolean; status: "idle" | "loading" | "ok" | "error"; n?: number }>>({ flood: { on: false, status: "idle" }, wetlands: { on: false, status: "idle" } });
  const [on, setOn] = useState<Record<Cat, boolean>>(Object.fromEntries(CATS.map((c) => [c.key, true])) as any);
  const [openCat, setOpenCat] = useState<Cat | null>("hospital");
  const center: [number, number] = [p.lon, p.lat];
  const parcelCfg = useMemo(() => parcelSourceFor(p.state, p.county), [p.state, p.county]);
  const envelopeMi = Math.sqrt((p.acres * 4046.86) / Math.PI) / 1609.34;

  // map init
  const near = useNear(el);
  useEffect(() => {
    if (!near) return;
    let dead = false;
    (async () => {
      const ml = (await import("maplibre-gl")).default;
      if (dead || !el.current) return;
      lib.current = ml;
      const m = new ml.Map({ container: el.current, style: baseStyle(), center, zoom: 15.6, attributionControl: { compact: true }, dragRotate: false });
      m.addControl(new ml.NavigationControl({ showCompass: false }), "bottom-right");
      m.addControl(new ml.FullscreenControl(), "bottom-right");
      m.addControl(new ml.ScaleControl({ unit: "imperial" }), "bottom-left");
      m.on("load", () => {
        setBasemap(m, "satellite");
        m.addSource("rings", { type: "geojson", data: { type: "FeatureCollection", features: [1, 3, 5].map((r) => circle(center, r)) } });
        m.addLayer({ id: "rings", type: "line", source: "rings", paint: { "line-color": "#ffffff", "line-width": 1.4, "line-dasharray": [2, 2], "line-opacity": 0.9 } });
        m.addLayer({ id: "rings-halo", type: "line", source: "rings", paint: { "line-color": "#403393", "line-width": 3, "line-opacity": 0.25 } }, "rings");
        m.addSource("envelope", { type: "geojson", data: circle(center, envelopeMi, 64) });
        m.addLayer({ id: "envelope", type: "line", source: "envelope", paint: { "line-color": "#f3d9a4", "line-width": 2, "line-dasharray": [1.5, 1.2] } });
        m.addSource("flood", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        m.addLayer({ id: "flood-fill", type: "fill", source: "flood", layout: { visibility: "none" }, paint: { "fill-color": ["case", ["==", ["get", "SFHA_TF"], "T"], "#2f7fd0", "#9cc7ef"] as any, "fill-opacity": ["case", ["==", ["get", "SFHA_TF"], "T"], 0.42, 0.22] as any } });
        m.addLayer({ id: "flood-line", type: "line", source: "flood", layout: { visibility: "none" }, paint: { "line-color": "#1d5fa8", "line-width": 1 } });
        m.addSource("wetlands", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        m.addLayer({ id: "wetlands-fill", type: "fill", source: "wetlands", layout: { visibility: "none" }, paint: { "fill-color": "#2fb39a", "fill-opacity": 0.38 } });
        m.addLayer({ id: "wetlands-line", type: "line", source: "wetlands", layout: { visibility: "none" }, paint: { "line-color": "#0d7d69", "line-width": 1.2 } });
        m.addSource("parcels", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        m.addLayer({ id: "parcels-fill", type: "fill", source: "parcels", paint: { "fill-color": "#ffffff", "fill-opacity": 0.04 } });
        m.addLayer({ id: "parcels-line", type: "line", source: "parcels", paint: { "line-color": "#ffffff", "line-width": 0.9, "line-opacity": 0.75 } });
        m.addSource("sel", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        m.addLayer({ id: "sel-fill", type: "fill", source: "sel", paint: { "fill-color": "#c9ad7d", "fill-opacity": 0.28 } });
        m.addLayer({ id: "sel-line", type: "line", source: "sel", paint: { "line-color": "#f3d9a4", "line-width": 3 } });
        m.addSource("pois", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        m.addLayer({
          id: "pois", type: "circle", source: "pois",
          paint: {
            "circle-color": ["match", ["get", "cat"], ...CATS.flatMap((c) => [c.key, c.color]), "#666"] as any,
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, ["case", ["get", "bus"], 2.5, 4.5], 15, ["case", ["get", "bus"], 4, 7]] as any,
            "circle-stroke-color": "#ffffff", "circle-stroke-width": 1.6,
          },
        });
        const pin = document.createElement("div");
        pin.className = "site-pin big"; pin.style.background = p.verdictColor;
        new ml.Marker({ element: pin }).setLngLat(center).addTo(m);
        const lab = document.createElement("div");
        lab.className = "pin-label"; lab.textContent = p.name.length > 34 ? p.name.slice(0, 32) + "…" : p.name;
        new ml.Marker({ element: lab, anchor: "bottom" }).setLngLat(center).addTo(m);

        m.on("click", "pois", (e: any) => {
          const f = e.features?.[0]; if (!f) return;
          const pr = f.properties;
          new ml.Popup({ offset: 10, closeButton: false }).setLngLat(f.geometry.coordinates)
            .setHTML(`<div class="label" style="color:${CAT_COLOR[pr.cat as Cat]}">${esc(pr.kind)}</div><h4>${esc(pr.name)}</h4><div class="small muted">${fmtMi(+pr.mi)} from site (straight line)</div>`).addTo(m);
        });
        m.on("click", "parcels-fill", (e: any) => {
          if (m.queryRenderedFeatures(e.point, { layers: ["pois"] }).length) return;
          const pt: [number, number] = [e.lngLat.lng, e.lngLat.lat];
          const full = parcelsRef.current.find((f) => pointInGeom(pt, f.geometry));
          if (full) setSel(full);
        });
        m.on("click", (e: any) => {
          const hit = m.queryRenderedFeatures(e.point, { layers: ["pois", "flood-fill", "wetlands-fill"].filter((l) => m.getLayer(l)) });
          if (!hit.length || hit[0].layer.id === "pois") return;
          const lines = hit.filter((f: any) => f.layer.id !== "pois").slice(0, 2).map((f: any) => f.layer.id === "flood-fill"
            ? `<div class="label" style="color:#1d5fa8">FEMA flood zone</div><h4>Zone ${esc(f.properties.FLD_ZONE)}${f.properties.SFHA_TF === "T" ? " · 1% annual chance (SFHA)" : f.properties.ZONE_SUBTY ? " · " + esc(String(f.properties.ZONE_SUBTY).toLowerCase()) : ""}</h4>`
            : `<div class="label" style="color:#0d7d69">NWI wetland</div><h4>${esc(f.properties.WETLAND_TYPE)}</h4><div class="xs muted">${esc(f.properties.ATTRIBUTE || "")}</div>`).join("");
          new ml.Popup({ offset: 6, closeButton: false }).setLngLat(e.lngLat).setHTML(lines + '<div class="xs muted">Screening only; confirm by survey and delineation.</div>').addTo(m);
        });
        ["pois", "parcels-fill"].forEach((l) => {
          m.on("mouseenter", l, () => (m.getCanvas().style.cursor = "pointer"));
          m.on("mouseleave", l, () => (m.getCanvas().style.cursor = ""));
        });
        setReady(true);
      });
      map.current = m;
    })();
    return () => { dead = true; map.current?.remove(); map.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [near]);

  useEffect(() => { if (ready && map.current) setBasemap(map.current, mode); }, [mode, ready]);

  // parcels
  useEffect(() => {
    if (!ready) return;
    if (!parcelCfg.src) { setParcels({ status: "na", msg: parcelCfg.reason }); return; }
    setParcels({ status: "loading" });
    fetchParcels(parcelCfg.src, p.lon, p.lat)
      .then((fs) => {
        parcelsRef.current = fs;
        setParcels({ status: "ok", data: fs });
        (map.current?.getSource("parcels") as any)?.setData({ type: "FeatureCollection", features: fs });
        const hit = fs.find((f) => pointInGeom(center, f.geometry));
        const nearest = hit || [...fs].sort((a, b) => haversineMi(center, geomCentroid(a.geometry)) - haversineMi(center, geomCentroid(b.geometry)))[0];
        if (nearest) setSel(nearest);
      })
      .catch((e) => setParcels({ status: "error", msg: String(e?.message || e) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const toggleOv = (k: "flood" | "wetlands") => {
    const m = map.current; if (!m) return;
    const next = !ov[k].on;
    [`${k}-fill`, `${k}-line`].forEach((l) => m.getLayer(l) && m.setLayoutProperty(l, "visibility", next ? "visible" : "none"));
    setOv((o) => ({ ...o, [k]: { ...o[k], on: next } }));
    if (next && ov[k].status !== "ok" && ov[k].status !== "loading") {
      setOv((o) => ({ ...o, [k]: { on: true, status: "loading" } }));
      fetchOverlay(k, p.lon, p.lat)
        .then((fs) => { (m.getSource(k) as any)?.setData({ type: "FeatureCollection", features: fs }); setOv((o) => ({ ...o, [k]: { ...o[k], status: "ok", n: fs.length } })); })
        .catch(() => setOv((o) => ({ ...o, [k]: { ...o[k], status: "error" } })));
    }
  };

  useEffect(() => {
    (map.current?.getSource("sel") as any)?.setData({ type: "FeatureCollection", features: sel ? [sel] : [] });
  }, [sel, ready]);

  // imagery capture date
  useEffect(() => {
    if (!ready) return;
    if (usingMapbox()) return; // capture date lookup is for the Esri imagery only
    fetchImageryDate(p.lon, p.lat).then(setImgDate).catch(() => setImgDate(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // amenities
  useEffect(() => {
    if (!ready) return;
    setPois({ status: "loading" });
    fetchPois(p.id, p.lat, p.lon)
      .then((d) => setPois({ status: "ok", data: d }))
      .catch((e) => setPois({ status: "error", msg: String(e?.message || e) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  useEffect(() => {
    const src = map.current?.getSource("pois") as any;
    if (!src) return;
    const list = (pois.data?.pois || []).filter((x) => on[x.cat]);
    src.setData({ type: "FeatureCollection", features: list.map((x) => ({ type: "Feature", properties: { cat: x.cat, name: x.name, kind: x.kind, mi: x.mi, bus: !!x.bus }, geometry: { type: "Point", coordinates: [x.lon, x.lat] } })) });
  }, [pois, on, ready]);

  const fit = (mi: number | "parcel") => {
    const m = map.current; if (!m) return;
    if (mi === "parcel") {
      const b = sel ? bboxOf([sel]) : null;
      if (b) m.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 80, maxZoom: 17.5, duration: 700 });
      else m.easeTo({ center, zoom: 16.5, duration: 700 });
      return;
    }
    const b = bboxOf([circle(center, mi)])!;
    m.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 24, duration: 700 });
  };
  const flyTo = (x: Poi) => {
    const m = map.current, ml = lib.current; if (!m || !ml) return;
    m.flyTo({ center: [x.lon, x.lat], zoom: Math.max(m.getZoom(), 14.5), duration: 800 });
    new ml.Popup({ offset: 10, closeButton: false }).setLngLat([x.lon, x.lat])
      .setHTML(`<div class="label" style="color:${CAT_COLOR[x.cat]}">${esc(x.kind)}</div><h4>${esc(x.name)}</h4><div class="small muted">${fmtMi(x.mi)} from site</div>`).addTo(m);
  };

  const list = pois.data?.pois || [];
  const byCat = (c: Cat) => list.filter((x) => x.cat === c && x.mi <= (CATS.find((k) => k.key === c)!.radiusMi));
  const nearest = (c: Cat, f?: (x: Poi) => boolean) => list.find((x) => x.cat === c && (!f || f(x)));
  const rail = nearest("transit", (x) => !x.bus);
  const hosp = nearest("hospital");
  const groc = nearest("grocery");
  const pharm = nearest("medical", (x) => x.kind === "Pharmacy");
  const score = [
    { k: "Nearest hospital", v: hosp ? fmtMi(hosp.mi) : "—", s: hosp?.name },
    { k: "Nearest rail station", v: rail ? fmtMi(rail.mi) : "—", s: rail?.name },
    { k: "Nearest grocery", v: groc ? fmtMi(groc.mi) : "—", s: groc?.name },
    { k: "Nearest pharmacy", v: pharm ? fmtMi(pharm.mi) : "—", s: pharm?.name },
    { k: "Senior / nursing within 5 mi", v: String(byCat("senior").length), s: "OSM-tagged competitors" },
    { k: "Bus stops within 0.6 mi", v: String(list.filter((x) => x.bus).length), s: "Staff and visitor access" },
  ];

  const parcelSrc = parcelCfg.src;
  const selAcres = sel ? geomAcres(sel.geometry) : 0;

  return (
    <div className="grid g-side" style={{ alignItems: "start" }}>
      <div className="map-sticky">
        <div className="map-shell">
          <div ref={el} role="region" className="map map-tall" aria-label={`Map of ${p.name} and its surroundings`} />
          <div className="map-overlay map-tools">
            <div className="seg" role="group" aria-label="Basemap">
              <button aria-pressed={mode === "satellite"} onClick={() => setMode("satellite")}>Satellite</button>
              <button aria-pressed={mode === "streets"} onClick={() => setMode("streets")}>Map</button>
            </div>
            <div className="seg" role="group" aria-label="Zoom to">
              <button onClick={() => fit("parcel")}>Parcel</button>
              <button onClick={() => fit(1)}>1 mi</button>
              <button onClick={() => fit(3)}>3 mi</button>
              <button onClick={() => fit(5)}>5 mi</button>
            </div>
            <div className="seg" role="group" aria-label="Environmental overlays">
              <button aria-pressed={ov.flood.on} onClick={() => toggleOv("flood")} title="FEMA National Flood Hazard Layer">Flood{ov.flood.status === "loading" ? "…" : ov.flood.status === "error" ? " ×" : ""}</button>
              <button aria-pressed={ov.wetlands.on} onClick={() => toggleOv("wetlands")} title="USFWS National Wetlands Inventory">Wetlands{ov.wetlands.status === "loading" ? "…" : ov.wetlands.status === "error" ? " ×" : ""}</button>
            </div>
          </div>
          {(parcels.status === "loading" || pois.status === "loading") && (
            <div className="map-overlay map-status small">Loading {parcels.status === "loading" ? "parcels" : ""}{parcels.status === "loading" && pois.status === "loading" ? " and " : ""}{pois.status === "loading" ? "nearby places" : ""}…</div>
          )}
          {imgDate && mode === "satellite" && <div className="map-overlay map-date xs">Imagery captured {imgDate}</div>}
          <div className="map-overlay map-legend">
            <div className="row"><span className="sw" style={{ background: p.verdictColor }} />Underwriting pin</div>
            <div className="row"><span style={{ width: 14, height: 10, background: "rgba(201,173,125,.45)", border: "2px solid #e8c88a", flex: "none" }} />Selected parcel</div>
            <div className="row"><span style={{ width: 14, borderTop: "2px dashed #d9b56e", flex: "none" }} />{p.acres}-acre program envelope (scale)</div>
            <div className="row"><span style={{ width: 14, borderTop: "2px dashed #888", flex: "none" }} />1 / 3 / 5 mile rings</div>
            {ov.flood.on && <div className="row"><span style={{ width: 14, height: 10, background: "rgba(47,127,208,.55)", flex: "none" }} />FEMA 1% flood zone (SFHA){ov.flood.status === "ok" && !ov.flood.n ? ": none nearby" : ""}</div>}
            {ov.flood.status === "error" && ov.flood.on && <div className="row xs">FEMA service did not respond</div>}
            {ov.wetlands.on && <div className="row"><span style={{ width: 14, height: 10, background: "rgba(47,179,154,.55)", flex: "none" }} />NWI wetlands{ov.wetlands.status === "ok" && !ov.wetlands.n ? ": none nearby" : ""}</div>}
            {ov.wetlands.status === "error" && ov.wetlands.on && <div className="row xs">Wetlands service did not respond</div>}
          </div>
        </div>
        <div className="xs muted" style={{ marginTop: 8 }}>
          Pin: {p.pinAddress ? <b>{p.pinAddress}</b> : "research coordinate"} ({p.pinBasis || "approximate"}). The parcel shown is the one under the pin; on campuses and carve-outs the pad may sit on an adjacent lot. Click any parcel line to inspect it, and confirm block/lot against the tax map before LOI. The envelope circle shows the {p.acres}-acre program footprint for scale only. Nearby places{pois.data ? `: ${pois.data.source}, as of ${pois.data.fetchedAt.slice(0, 10)}` : " load from Mapbox Search when configured, otherwise Esri and OpenStreetMap"}.
        </div>
      </div>

      <div className="grid" style={{ gap: 14 }}>
        <div className="card card-pad">
          <div className="label" style={{ marginBottom: 8 }}>Parcel at pin · {parcelSrc?.name || "County source"}</div>
          {parcels.status === "loading" && <div className="small muted">Querying the state parcel service…</div>}
          {parcels.status === "na" && <div className="small muted">{parcels.msg}</div>}
          {parcels.status === "error" && <div className="small muted">The parcel service did not respond ({parcels.msg}). Satellite imagery and the program envelope still show the site; retry by reloading.</div>}
          {parcels.status === "ok" && !sel && <div className="small muted">No parcel polygons returned at this coordinate.</div>}
          {sel && parcelSrc && (
            <>
              <table className="kv">
                <tbody>
                  {Object.entries(parcelSrc.fields).map(([label, spec]) => {
                    const v = readField(sel.properties || {}, spec);
                    if (!v) return null;
                    return <tr key={label}><td>{label}</td><td>{label === "Assessor card" && /^https?:/.test(v) ? <a href={v} target="_blank" rel="noreferrer">Open card ↗</a> : v}</td></tr>;
                  })}
                  <tr><td>GIS area (computed)</td><td>{selAcres.toFixed(2)} ac</td></tr>
                </tbody>
              </table>
              <div className="xs muted" style={{ marginTop: 8 }}>{parcels.data?.length} parcels loaded within ~300 m. Owner fields may be redacted under state privacy rules.</div>
            </>
          )}
        </div>

        <div className="card card-pad">
          <div className="label" style={{ marginBottom: 10 }}>Proximity scorecard</div>
          {pois.status === "error" && <div className="small muted">The nearby-places service did not respond ({pois.msg}). Reload to retry.</div>}
          <div className="grid" style={{ gap: 10, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
            {score.map((s) => (
              <div key={s.k} className="score-cell">
                <span className="xs muted">{s.k}</span>
                <span className="v">{pois.status === "loading" ? "…" : s.v}</span>
                <span className="xs muted" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={s.s}>{s.s || " "}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card card-pad">
          <div className="label" style={{ marginBottom: 4 }}>What is nearby</div>
          {CATS.map((c) => {
            const items = byCat(c.key).filter((x) => !x.bus);
            const isOpen = openCat === c.key;
            return (
              <div key={c.key}>
                <div className="amen-cat">
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input type="checkbox" checked={on[c.key]} onChange={() => setOn({ ...on, [c.key]: !on[c.key] })} aria-label={`Show ${c.label} on map`} />
                    <span className="sw" style={{ background: c.color }} />
                    <span>{c.label}</span>
                  </label>
                  <button className="status-chip" onClick={() => setOpenCat(isOpen ? null : c.key)} aria-expanded={isOpen}>
                    {pois.status === "loading" ? "…" : items.length} within {c.radiusMi} mi {isOpen ? "▴" : "▾"}
                  </button>
                </div>
                {isOpen && (
                  <div className="amen-list" style={{ padding: "4px 0 8px 26px" }}>
                    {items.slice(0, 40).map((x) => (
                      <div key={x.id} className="amen-item" onClick={() => flyTo(x)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && flyTo(x)}>
                        <span>{x.name}<span className="muted"> · {x.kind}</span></span><span className="tnum muted">{fmtMi(x.mi)}</span>
                      </div>
                    ))}
                    {pois.status === "ok" && !items.length && <div className="xs muted">None found within {c.radiusMi} mi.</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
