export const R_MI = 3958.8;
export function haversineMi(a: [number, number], b: [number, number]) {
  // a, b = [lon, lat]
  const toR = Math.PI / 180;
  const dLat = (b[1] - a[1]) * toR, dLon = (b[0] - a[0]) * toR;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * toR) * Math.cos(b[1] * toR) * Math.sin(dLon / 2) ** 2;
  return 2 * R_MI * Math.asin(Math.sqrt(h));
}
/** Geodesic-ish circle polygon (radius in miles). */
export function circle(center: [number, number], radiusMi: number, steps = 96): GeoJSON.Feature<GeoJSON.Polygon> {
  const [lon, lat] = center;
  const coords: [number, number][] = [];
  const dLat = radiusMi / 69.0;
  const dLon = radiusMi / (69.172 * Math.cos((lat * Math.PI) / 180));
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    coords.push([lon + dLon * Math.cos(t), lat + dLat * Math.sin(t)]);
  }
  return { type: "Feature", properties: { r: radiusMi }, geometry: { type: "Polygon", coordinates: [coords] } };
}
export function pointInRing(pt: [number, number], ring: number[][]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
export function pointInGeom(pt: [number, number], g: any): boolean {
  if (!g) return false;
  const polys = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
  return polys.some((p: number[][][]) => pointInRing(pt, p[0]) && !p.slice(1).some((h) => pointInRing(pt, h)));
}
/** Planar ring area in acres using a local equirectangular projection. */
export function geomAcres(g: any): number {
  if (!g) return 0;
  const polys = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
  let m2 = 0;
  for (const p of polys) {
    p.forEach((ring: number[][], idx: number) => {
      const lat0 = ring[0][1] * Math.PI / 180;
      const kx = 111320 * Math.cos(lat0), ky = 110540;
      let a = 0;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += (ring[j][0] * kx) * (ring[i][1] * ky) - (ring[i][0] * kx) * (ring[j][1] * ky);
      m2 += (idx === 0 ? 1 : -1) * Math.abs(a / 2);
    });
  }
  return m2 / 4046.8564224;
}
export function geomCentroid(g: any): [number, number] {
  const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  let x = 0, y = 0, n = 0;
  for (const p of polys) for (const c of p[0]) { x += c[0]; y += c[1]; n++; }
  return [x / n, y / n];
}
export function bboxOf(features: any[]): [number, number, number, number] | null {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const walk = (c: any) => { if (typeof c[0] === "number") { x0 = Math.min(x0, c[0]); x1 = Math.max(x1, c[0]); y0 = Math.min(y0, c[1]); y1 = Math.max(y1, c[1]); } else c.forEach(walk); };
  features.forEach((f) => f.geometry && walk(f.geometry.coordinates));
  return Number.isFinite(x0) ? [x0, y0, x1, y1] : null;
}
