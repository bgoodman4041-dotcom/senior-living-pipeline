// Keyless raster basemaps. Light streets (CARTO / OSM) and satellite (Esri World Imagery).
export const ATTR_CARTO = '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions" target="_blank">CARTO</a>';
export const ATTR_ESRI = 'Imagery © <a href="https://www.esri.com" target="_blank">Esri</a>, Maxar, Earthstar Geographics';

export function baseStyle(): any {
  return {
    version: 8,
    sources: {
      carto: {
        type: "raster",
        tiles: ["a", "b", "c", "d"].map((s) => `https://${s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png`),
        tileSize: 256, maxzoom: 20, attribution: ATTR_CARTO,
      },
      esri: {
        type: "raster",
        tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
        tileSize: 256, maxzoom: 19, attribution: ATTR_ESRI,
      },
      esriRef: {
        type: "raster",
        tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"],
        tileSize: 256, maxzoom: 19,
      },
      esriRoads: {
        type: "raster",
        tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}"],
        tileSize: 256, maxzoom: 19,
      },
    },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": "#e9ece9" } },
      { id: "carto", type: "raster", source: "carto", paint: { "raster-saturation": -0.35, "raster-contrast": 0.02 } },
      { id: "esri", type: "raster", source: "esri", layout: { visibility: "none" } },
      { id: "esriRoads", type: "raster", source: "esriRoads", layout: { visibility: "none" }, paint: { "raster-opacity": 0.75 } },
      { id: "esriRef", type: "raster", source: "esriRef", layout: { visibility: "none" } },
    ],
  };
}

export function setBasemap(map: any, mode: "streets" | "satellite") {
  const sat = mode === "satellite";
  const vis = (id: string, on: boolean) => map.getLayer(id) && map.setLayoutProperty(id, "visibility", on ? "visible" : "none");
  vis("carto", !sat); vis("esri", sat); vis("esriRef", sat); vis("esriRoads", sat);
}
