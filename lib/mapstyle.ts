// Raster basemaps. With NEXT_PUBLIC_MAPBOX_TOKEN set in Vercel: Mapbox satellite-streets and streets.
// Without it: keyless Esri World Street Map and Esri World Imagery.
import { MAPBOX_PUBLIC_TOKEN } from "./mapbox";
export const ATTR_CARTO = '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions" target="_blank">CARTO</a>';
export const ATTR_STREETS = 'Map © <a href="https://www.esri.com" target="_blank">Esri</a>, HERE, Garmin, © OpenStreetMap contributors, and the GIS user community';
export const ATTR_ESRI = 'Imagery © <a href="https://www.esri.com" target="_blank">Esri</a>, Maxar, Earthstar Geographics';

export const ATTR_MAPBOX = '© <a href="https://www.mapbox.com/about/maps/" target="_blank">Mapbox</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> <a href="https://www.mapbox.com/map-feedback/" target="_blank">Improve this map</a> © Maxar';
export const usingMapbox = () => !!MAPBOX_PUBLIC_TOKEN;

const mbTiles = (style: string) => [`https://api.mapbox.com/styles/v1/mapbox/${style}/tiles/512/{z}/{x}/{y}@2x?access_token=${MAPBOX_PUBLIC_TOKEN}`];

// On high-DPI screens, ask for imagery one zoom level deeper so satellite views render at full retina sharpness.
const hiDpi = () => typeof window !== "undefined" && (window.devicePixelRatio || 1) > 1.25;

export function baseStyle(): any {
  if (MAPBOX_PUBLIC_TOKEN) {
    return {
      version: 8,
      sources: {
        carto: { type: "raster", tiles: mbTiles("light-v11"), tileSize: 512, maxzoom: 22, attribution: ATTR_MAPBOX },
        esri: { type: "raster", tiles: mbTiles("satellite-streets-v12"), tileSize: 512, maxzoom: 22, attribution: ATTR_MAPBOX },
      },
      layers: [
        { id: "bg", type: "background", paint: { "background-color": "#e9ece9" } },
        { id: "carto", type: "raster", source: "carto" },
        { id: "esri", type: "raster", source: "esri", layout: { visibility: "none" } },
      ],
    };
  }
  return {
    version: 8,
    sources: {
      carto: {
        type: "raster",
        // Esri World Street Map: keyless and served from the same host as the imagery.
        // (CARTO began returning "API key required" tiles to non-local sites in Nov 2026.)
        tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"],
        tileSize: hiDpi() ? 128 : 256, maxzoom: 19, attribution: ATTR_STREETS,
      },
      esri: {
        type: "raster",
        tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
        tileSize: hiDpi() ? 128 : 256, maxzoom: 19, attribution: ATTR_ESRI,
      },
      esriRef: {
        type: "raster",
        tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"],
        tileSize: 256, maxzoom: 16,
      },
      esriRoads: {
        type: "raster",
        tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}"],
        tileSize: 256, maxzoom: 16,
      },
    },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": "#e9ece9" } },
      { id: "carto", type: "raster", source: "carto", paint: { "raster-saturation": -0.45, "raster-contrast": -0.04, "raster-brightness-min": 0.04 } },
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
