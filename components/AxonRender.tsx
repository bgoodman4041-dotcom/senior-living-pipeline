// Concept rendering: an axonometric drawing generated from the same massing as the 3D view
// (lib/massing.ts: wing lengths from the underwritten unit mix, AL 3 stories, MC 2, parking at ~30 m² a space).
// Pure SVG, server-rendered, no map tiles. It is a character study of scale, not a design.
import type { ReactElement } from "react";
import { buildMassing, FACADE, type Line } from "@/lib/massing";

type P3 = [number, number, number];
const C30 = Math.cos(Math.PI / 6), S30 = Math.sin(Math.PI / 6);
// viewer to the south-west, looking north-east
const proj = ([x, y, z]: P3): [number, number] => [(x - y) * C30, -(x + y) * S30 - z];
const pts = (ps: P3[]) => ps.map(proj).map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(" ");
const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k))));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
};
// deterministic pseudo-random for tree placement
const rnd = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export default function AxonRender({ lat, lon, lines, gsfPerUnit, acres, parking, title }: { lat: number; lon: number; lines: Line[]; gsfPerUnit: Record<string, number>; acres: number; parking: number; title: string }) {
  const m = buildMassing([lon, lat], lines, gsfPerUnit, acres, parking);
  const mLat = 110540, mLon = 111320 * Math.cos((lat * Math.PI) / 180);
  const toM = ([lo, la]: number[]): [number, number] => [(lo - m.center[0]) * mLon, (la - m.center[1]) * mLat];
  type Face = { key: number; el: ReactElement };
  const faces: Face[] = [];
  const feats = m.parts.features as any[];
  // site extent
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const f of feats) for (const c of f.geometry.coordinates[0]) { const [x, y] = toM(c); minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  const pad = 16;
  const G: P3[] = [[minX - pad, minY - pad, 0], [maxX + pad, minY - pad, 0], [maxX + pad, maxY + pad, 0], [minX - pad, maxY + pad, 0]];
  let n = 0;
  const ground: ReactElement[] = [<polygon key="g" points={pts(G)} fill="#8fb276" />];
  // ground features: parking (with stripes) and courtyards
  for (const f of feats) {
    const ring = (f.geometry.coordinates[0] as number[][]).map(toM);
    if (f.properties.kind === "parking") {
      const xs = ring.map((p) => p[0]), ys = ring.map((p) => p[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      ground.push(<polygon key={`pk${n++}`} points={pts(ring.map(([x, y]) => [x, y, 0.05] as P3))} fill="#585d63" />);
      for (let x = x0 + 2.6; x < x1 - 1; x += 2.7) {
        for (const [ya, yb] of [[y0 + 1, y0 + 5.5], [y1 - 5.5, y1 - 1]]) if (yb - ya > 0 && y1 - y0 > 12) ground.push(<polyline key={`st${n++}`} points={pts([[x, ya, 0.1], [x, yb, 0.1]])} stroke="#e9e9e4" strokeWidth={0.25} fill="none" />);
      }
    } else if (f.properties.kind === "court") {
      ground.push(<polygon key={`ct${n++}`} points={pts(ring.map(([x, y]) => [x, y, 0.05] as P3))} fill="#a9c58f" />);
      const xs = ring.map((p) => p[0]), ys = ring.map((p) => p[1]);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      ground.push(<polygon key={`pa${n++}`} points={pts([[cx - 6, cy - 6, 0.1], [cx + 6, cy - 6, 0.1], [cx + 6, cy + 6, 0.1], [cx - 6, cy + 6, 0.1]])} fill="#e3d9c6" />);
      for (let k = 0; k < 6; k++) {
        const tx = Math.min(...xs) + 5 + rnd(k + n) * (Math.max(...xs) - Math.min(...xs) - 10), ty = Math.min(...ys) + 5 + rnd(k * 3 + n) * (Math.max(...ys) - Math.min(...ys) - 10);
        if (Math.abs(tx - cx) < 8 && Math.abs(ty - cy) < 8) continue;
        faces.push(tree(tx, ty, 3 + rnd(k) * 1.5, k + n));
      }
    }
  }
  // perimeter trees
  for (let k = 0; k < 22; k++) {
    const side = k % 4, t = rnd(k * 7.3);
    const [x, y] = side === 0 ? [minX - pad + 4 + t * (maxX - minX + 2 * pad - 8), maxY + pad - 5] : side === 1 ? [maxX + pad - 5, minY - pad + 4 + t * (maxY - minY + 2 * pad - 8)] : side === 2 ? [minX - pad + 5, minY - pad + 4 + t * (maxY - minY + 2 * pad - 8)] : [minX - pad + 4 + t * (maxX - minX + 2 * pad - 8), minY - pad + 5];
    if (side === 3 && y < minY + 2) { /* keep the front edge mostly open */ if (rnd(k) > 0.4) continue; }
    faces.push(tree(x, y, 3.5 + rnd(k + 2) * 2, k + 100));
  }
  function tree(x: number, y: number, r: number, seed: number): Face {
    const h = r * 2.2;
    const [sx, sy] = proj([x, y, h]), [bx, by] = proj([x, y, 0]);
    const col = ["#4f7a3f", "#5d8a47", "#46703a"][seed % 3];
    return { key: x + y, el: <g key={`t${seed}-${x.toFixed(1)}`}><ellipse cx={bx + r * 0.5} cy={by + 0.6} rx={r * 0.9} ry={r * 0.45} fill="rgba(0,0,0,.16)" /><line x1={bx} y1={by} x2={sx} y2={sy + r * 0.4} stroke="#6b5440" strokeWidth={0.6} /><circle cx={sx} cy={sy} r={r} fill={col} /><circle cx={sx - r * 0.3} cy={sy - r * 0.3} r={r * 0.45} fill="rgba(255,255,255,.12)" /></g> };
  }
  // buildings: walls facing the viewer, windows by floor, roof with parapet
  for (const f of feats) {
    if (f.properties.kind !== "building") continue;
    const ring = (f.geometry.coordinates[0] as number[][]).map(toM).slice(0, 4);
    const H = f.properties.height as number, st = f.properties.stories as number, care = f.properties.care as string;
    const body = FACADE[care]?.body || "#d9cbbd";
    // orientation: make the ring counter-clockwise
    const area = ring.reduce((a, p, i) => { const q = ring[(i + 1) % ring.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0);
    const R = area < 0 ? [...ring].reverse() : ring;
    for (let i = 0; i < R.length; i++) {
      const p = R[i], q = R[(i + 1) % R.length];
      const ex = q[0] - p[0], ey = q[1] - p[1], L = Math.hypot(ex, ey);
      const nx = ey / L, ny = -ex / L; // outward normal for a CCW ring
      if (nx * -1 + ny * -1 <= 0.01) continue; // faces away from the viewer
      const light = ny < -0.5 ? 0.12 : -0.12; // south faces lit, west faces in shade
      const wall = shade(body, light);
      const els: ReactElement[] = [];
      els.push(<polygon key="w" points={pts([[p[0], p[1], 0], [q[0], q[1], 0], [q[0], q[1], H], [p[0], p[1], H]])} fill={wall} stroke={shade(body, -0.35)} strokeWidth={0.2} />);
      els.push(<polygon key="b" points={pts([[p[0], p[1], 0], [q[0], q[1], 0], [q[0], q[1], 1.3], [p[0], p[1], 1.3]])} fill={shade("#9d958a", light)} />);
      const at = (t: number, z: number): P3 => [p[0] + (ex * t) / L, p[1] + (ey * t) / L, z];
      for (let fl = 0; fl < st; fl++) {
        const z0 = fl === 0 ? 1.6 : 4.6 + 3.4 * (fl - 1) + 0.9;
        const wh = fl === 0 ? 2.0 : 1.7;
        for (let t = 2.2; t < L - 2.4; t += 3.7) {
          els.push(<polygon key={`g${fl}-${t.toFixed(1)}`} points={pts([at(t, z0), at(t + 1.7, z0), at(t + 1.7, z0 + wh), at(t, z0 + wh)])} fill={light > 0 ? "#3a536a" : "#2b3d4f"} stroke={shade(body, 0.5)} strokeWidth={0.18} />);
        }
        if (fl > 0) els.push(<polyline key={`fl${fl}`} points={pts([at(0, 4.6 + 3.4 * (fl - 1)), at(L, 4.6 + 3.4 * (fl - 1))])} stroke={shade(body, -0.18)} strokeWidth={0.18} fill="none" />);
      }
      els.push(<polygon key="c" points={pts([[p[0], p[1], H - 0.6], [q[0], q[1], H - 0.6], [q[0], q[1], H], [p[0], p[1], H]])} fill="#f4f2ec" />);
      const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
      faces.push({ key: mx + my - 0.001, el: <g key={`f${n++}`}>{els}</g> });
    }
    const cx = R.reduce((a, p) => a + p[0], 0) / R.length, cy = R.reduce((a, p) => a + p[1], 0) / R.length;
    const roof = <g key={`r${n++}`}><polygon points={pts(R.map(([x, y]) => [x, y, H] as P3))} fill="#8e9298" stroke="#f4f2ec" strokeWidth={0.5} />
      {[0.3, 0.62].map((t, k) => { const x = R[0][0] + (R[2][0] - R[0][0]) * t, y = R[0][1] + (R[2][1] - R[0][1]) * t; return <polygon key={k} points={pts([[x - 1.2, y - 1.2, H + 1.4], [x + 1.2, y - 1.2, H + 1.4], [x + 1.2, y + 1.2, H + 1.4], [x - 1.2, y + 1.2, H + 1.4]])} fill="#a3a8ae" stroke="#7a7f86" strokeWidth={0.15} />; })}</g>;
    faces.push({ key: cx + cy - 1000, el: roof }); // roofs above every wall
  }
  // draw: farther (larger x+y) first; roofs last
  faces.sort((a, b) => b.key - a.key);
  const roofs = faces.filter((f) => f.key < -500), rest = faces.filter((f) => f.key >= -500);
  // bounds
  const corners = [...G, [minX, minY, 20] as P3, [maxX, maxY, 20] as P3].map(proj);
  const bx0 = Math.min(...corners.map((c) => c[0])) - 4, bx1 = Math.max(...corners.map((c) => c[0])) + 4;
  const by0 = Math.min(...corners.map((c) => c[1])) - 8, by1 = Math.max(...corners.map((c) => c[1])) + 4;
  return (
    <svg viewBox={`${bx0.toFixed(0)} ${by0.toFixed(0)} ${(bx1 - bx0).toFixed(0)} ${(by1 - by0).toFixed(0)}`} role="img" aria-label={`Concept rendering of ${title}`} preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%", display: "block" }}>
      <defs><linearGradient id="axsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#dfe9f2" /><stop offset="1" stopColor="#f4f1ea" /></linearGradient></defs>
      <rect x={bx0} y={by0} width={bx1 - bx0} height={by1 - by0} fill="url(#axsky)" />
      {ground}
      {rest.map((f) => f.el)}
      {roofs.map((f) => f.el)}
    </svg>
  );
}
