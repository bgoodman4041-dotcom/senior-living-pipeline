// Shared MapLibre plumbing for the three maps (pipeline overview, site map, 3D massing).

/** Keeps routine tile and data-source failures out of the console (a slow or blocked tile server is not a page error:
 *  the rest of the map still draws). Without a listener MapLibre prints every such failure with console.error. */
export function quietMapErrors(map: { on: (type: "error", fn: (e: any) => void) => unknown }) {
  map.on("error", (e: any) => {
    const msg = String(e?.error?.message || e?.error || "");
    if (e?.tile || e?.sourceId || e?.source || /tile|fetch|network|ajax|abort|status|load/i.test(msg)) return;
    console.warn(`Map: ${msg || "error"}`);
  });
}

/** Static Esri image of an area, shown when the browser can't draw the interactive map (WebGL off or blocked). */
export function staticMapUrl(lat: number, lon: number, spanLon: number, w: number, h: number, layer: "World_Imagery" | "World_Street_Map" = "World_Imagery") {
  const dLon = spanLon / 2;
  const dLat = (dLon * Math.cos((lat * Math.PI) / 180) * h) / w;
  const bbox = [lon - dLon, lat - dLat, lon + dLon, lat + dLat].map((v) => v.toFixed(6)).join(",");
  return `https://server.arcgisonline.com/ArcGIS/rest/services/${layer}/MapServer/export?bbox=${bbox}&bboxSR=4326&imageSR=3857&size=${w},${h}&format=jpg&f=image`;
}
