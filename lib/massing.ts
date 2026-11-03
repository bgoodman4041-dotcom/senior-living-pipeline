// Concept massing generated from the underwritten program.
// Courtyard blocks of double-loaded wings (IL 4 stories, AL 3, MC 2), a surface lot and a green court.
// Illustrative only: it shows scale and coverage, not a site plan.

export interface Line { care: string; units: number }
export interface MassingPart { kind: "building" | "parking" | "court"; care?: string; stories?: number; height: number; base: number; coords: [number, number][] }
export interface Massing {
  parts: GeoJSON.FeatureCollection; render: GeoJSON.FeatureCollection; center: [number, number];
  /** camera anchors for the guided tour, in lng/lat */
  anchors: { entry: [number, number]; arrival: [number, number]; courts: [number, number][]; parking: [number, number]; extent: number };
  stats: { gsf: number; footprintSf: number; coveragePct: number; far: number; maxStories: number; heightFt: number; parking: number; parkingSf: number; openSpacePct: number; blocks: number; wings: { care: string; stories: number; sf: number; lengthFt: number }[] };
}

export const CARE_STYLE: Record<string, { color: string; stories: number; label: string }> = {
  IL: { color: "#8fb9e0", stories: 4, label: "Independent living" },
  AL: { color: "#f6b56a", stories: 3, label: "Assisted living" },
  MC: { color: "#9a90d3", stories: 2, label: "Memory care" },
  SNF: { color: "#d97585", stories: 2, label: "Skilled nursing" },
};
const FT = 0.3048, SF = 0.09290304;
const DEPTH = 20;            // m, double-loaded corridor wing (~65 ft)
const FLOOR = 3.4, GROUND = 4.6; // m floor-to-floor
const MAX_RING = 230;        // m of wing centreline per courtyard block
const GAP = 28;              // m between blocks

const heightOf = (st: number) => GROUND + FLOOR * (st - 1) + 1.2; // + parapet

export function buildMassing(center: [number, number], lines: Line[], gsfPerUnit: Record<string, number>, acres: number, parkingSpaces: number): Massing {
  // 1. wings by care level, with length from footprint / depth
  const segs: { care: string; stories: number; len: number; sf: number }[] = [];
  for (const l of lines) {
    if (!l.units) continue;
    const st = CARE_STYLE[l.care]?.stories || 3;
    const sf = l.units * (gsfPerUnit[l.care] || 900);
    const len = (sf * SF) / st / DEPTH;
    segs.push({ care: l.care, stories: st, len, sf });
  }
  // 2. pack into courtyard blocks, splitting long wings across blocks
  const totalLen = segs.reduce((a, s) => a + s.len, 0);
  const ring = totalLen / Math.max(1, Math.ceil(totalLen / MAX_RING)); // even blocks, no orphan stub
  const blocks: { care: string; stories: number; len: number }[][] = [[]];
  let used = 0;
  for (const s of segs) {
    let rem = s.len;
    while (rem > 0.5) {
      const room = ring + 0.5 - used;
      if (room < 1) { blocks.push([]); used = 0; continue; }
      const take = Math.min(rem, room);
      blocks[blocks.length - 1].push({ care: s.care, stories: s.stories, len: take });
      used += take; rem -= take;
    }
  }
  // 3. geometry in local metres, blocks laid out west → east
  const local: MassingPart[] = [];
  const wings: { care: string; stories: number; a: [number, number]; e: [number, number]; dir: [number, number] }[] = [];
  const courts: [number, number, number, number][] = [];
  let x0 = 0, maxH = 0;
  const dims = blocks.map((b) => {
    const P = Math.max(b.reduce((a, s) => a + s.len, 0), 60);
    const r = 1.35; // W/H aspect of the ring centreline
    const H = P / (2 * (1 + r)), W = H * r;
    return { W, H };
  });
  blocks.forEach((b, bi) => {
    const { W, H } = dims[bi];
    maxH = Math.max(maxH, H);
    const sides = [
      { len: W + DEPTH, start: [x0 - DEPTH / 2, 0], dir: [1, 0] },            // south, spans corners
      { len: H - DEPTH, start: [x0 + W, DEPTH / 2], dir: [0, 1] },             // east
      { len: W + DEPTH, start: [x0 + W + DEPTH / 2, H], dir: [-1, 0] },        // north
      { len: H - DEPTH, start: [x0, H - DEPTH / 2], dir: [0, -1] },            // west
    ];
    const total = sides.reduce((a, s) => a + s.len, 0);
    const want = b.reduce((a, s) => a + s.len, 0);
    const k = total / want; // stretch so the ring closes
    let si = 0, pos = 0;
    for (const seg of b) {
      let rem = seg.len * k;
      while (rem > 0.01 && si < sides.length) {
        const s = sides[si];
        const take = Math.min(rem, s.len - pos);
        const a = [s.start[0] + s.dir[0] * pos, s.start[1] + s.dir[1] * pos];
        const e = [s.start[0] + s.dir[0] * (pos + take), s.start[1] + s.dir[1] * (pos + take)];
        const nx = -s.dir[1] * (DEPTH / 2), ny = s.dir[0] * (DEPTH / 2);
        wings.push({ care: seg.care, stories: seg.stories, a: a as [number, number], e: e as [number, number], dir: s.dir as [number, number] });
        local.push({ kind: "building", care: seg.care, stories: seg.stories, base: 0, height: heightOf(seg.stories),
          coords: [[a[0] - nx, a[1] - ny], [e[0] - nx, e[1] - ny], [e[0] + nx, e[1] + ny], [a[0] + nx, a[1] + ny], [a[0] - nx, a[1] - ny]] });
        rem -= take; pos += take;
        if (pos >= s.len - 0.01) { si++; pos = 0; }
      }
    }
    const i = DEPTH / 2 + 2;
    courts.push([x0 + i, i, x0 + W - i, H - i]);
    local.push({ kind: "court", base: 0, height: 0.3, coords: [[x0 + i, i], [x0 + W - i, i], [x0 + W - i, H - i], [x0 + i, H - i], [x0 + i, i]] });
    x0 += W + DEPTH + GAP;
  });
  const totalW = x0 - GAP - DEPTH;
  // 4. surface parking south of the buildings (~30 m² per space incl. aisles)
  const parkM2 = parkingSpaces * 30;
  const pw = Math.max(totalW, 40), ph = parkM2 / pw;
  const py = -DEPTH / 2 - 14;
  local.push({ kind: "parking", base: 0, height: 0.15, coords: [[0, py], [pw, py], [pw, py - ph], [0, py - ph], [0, py]] });

  // 5. centre on the pin and convert to lng/lat
  const cx = totalW / 2, cy = (maxH + py - ph) / 2;
  const mPerLat = 110540, mPerLon = 111320 * Math.cos((center[1] * Math.PI) / 180);
  const toLL = ([x, y]: [number, number]): [number, number] => [center[0] + (x - cx) / mPerLon, center[1] + (y - cy) / mPerLat];
  const features: GeoJSON.Feature[] = local.map((p, n) => ({
    type: "Feature", id: n,
    properties: { kind: p.kind, care: p.care || "", stories: p.stories || 0, height: p.height, base: p.base, color: p.kind === "building" ? CARE_STYLE[p.care!]?.color || "#ccc" : p.kind === "court" ? "#76B96A" : "#6b7280" },
    geometry: { type: "Polygon", coordinates: [p.coords.map(toLL)] },
  }));

  const render = renderParts(wings, courts, { pw, py, ph, totalW }, toLL);
  const ex0 = Math.min(30, totalW / 4);
  const anchors = {
    entry: toLL([ex0, -DEPTH / 2 - 4]), arrival: toLL([ex0, py - Math.min(ph, 30) * 0.6]),
    courts: courts.map(([a, b, c, d]) => toLL([(a + c) / 2, (b + d) / 2])), parking: toLL([pw / 2, py - ph / 2]),
    extent: Math.max(totalW, maxH - py + ph),
  };

  const gsf = segs.reduce((a, s) => a + s.sf, 0);
  const footprintSf = segs.reduce((a, s) => a + s.sf / s.stories, 0);
  const siteSf = acres * 43560;
  const parkingSf = parkM2 / SF;
  const maxStories = Math.max(...segs.map((s) => s.stories));
  return {
    parts: { type: "FeatureCollection", features }, render, center, anchors,
    stats: {
      gsf, footprintSf, coveragePct: footprintSf / siteSf, far: gsf / siteSf, maxStories,
      heightFt: heightOf(maxStories) / FT, parking: parkingSpaces, parkingSf,
      openSpacePct: Math.max(0, 1 - (footprintSf + parkingSf) / siteSf), blocks: blocks.length,
      wings: segs.map((s) => ({ care: s.care, stories: s.stories, sf: s.sf, lengthFt: s.len / FT })),
    },
  };
}

// ---- architectural render: stone base, floor-by-floor spandrels and inset glazing, cornice, rooftop units,
// porte-cochere and landscape. Same footprint and heights as the program massing; illustrative only.
export const FACADE: Record<string, { body: string; label: string }> = {
  IL: { body: "#e8dfcc", label: "Cream fiber-cement / brick" },
  AL: { body: "#cdb08a", label: "Warm brick" },
  MC: { body: "#bcc6cf", label: "Gray-blue board and batten" },
  SNF: { body: "#d9cbbd", label: "Buff masonry" },
};
const SLATE = ["#5a5f66", "#62676e", "#6a6f76", "#72777e", "#7a7f86"], ASPHALT = "#3d4146", STRIPE = "#f2f2ee", PAVER = "#d9d1c1", LAWN = "#7da066", WATER = "#5d8fb3", RAIL = "#dfe6ea";
const STONE = "#9d958a", GLASS = "#2f4356", ROOF = "#8e9298", CORNICE = "#f4f2ec", RTU = "#8d939a", CANOPY = "#f7f5f0", TREE = ["#4f7a3f", "#5d8a47", "#46703a"];

function renderParts(
  wings: { care: string; stories: number; a: [number, number]; e: [number, number]; dir: [number, number] }[],
  courts: [number, number, number, number][],
  park: { pw: number; py: number; ph: number; totalW: number },
  toLL: (p: [number, number]) => [number, number],
): GeoJSON.FeatureCollection {
  const out: GeoJSON.Feature[] = [];
  let id = 0;
  const push = (coords: [number, number][], base: number, height: number, color: string, extra: Record<string, any> = {}) =>
    out.push({ type: "Feature", id: id++, properties: { base, height, color, ...extra }, geometry: { type: "Polygon", coordinates: [[...coords, coords[0]].map(toLL)] } });
  const rect = (a: [number, number], e: [number, number], dir: [number, number], half: number, inset: number): [number, number][] => {
    const nx = -dir[1] * half, ny = dir[0] * half;
    const ax = a[0] + dir[0] * inset, ay = a[1] + dir[1] * inset, ex = e[0] - dir[0] * inset, ey = e[1] - dir[1] * inset;
    return [[ax - nx, ay - ny], [ex - nx, ey - ny], [ex + nx, ey + ny], [ax + nx, ay + ny]];
  };
  const ring = (outer: [number, number][], inner: [number, number][], base: number, height: number, color: string, extra: Record<string, any>) =>
    out.push({ type: "Feature", id: id++, properties: { base, height, color, ...extra }, geometry: { type: "Polygon", coordinates: [[...outer, outer[0]].map(toLL), [...inner, inner[0]].reverse().map(toLL)] } });
  for (const w of wings) {
    const len = Math.hypot(w.e[0] - w.a[0], w.e[1] - w.a[1]);
    if (len < 0.5) continue;
    const props = { care: w.care, stories: w.stories };
    const full = rect(w.a, w.e, w.dir, DEPTH / 2, 0);
    const body = FACADE[w.care]?.body || "#ddd";
    const top = GROUND + FLOOR * (w.stories - 1);
    push(full, 0, 1.2, STONE, props);                       // stone water table
    push(full, 1.2, top, body, props);                      // facade body
    for (let f = 1; f < w.stories; f++) {                   // floor-line trim
      const z = GROUND + FLOOR * (f - 1);
      push(rect(w.a, w.e, w.dir, DEPTH / 2 + 0.08, -0.08), z - 0.12, z + 0.18, CORNICE, props);
    }
    const pitched = w.care !== "MC";
    if (pitched) {
      // residential wings: eave band, then a stepped hip roof rising ~4 m to the ridge (slate)
      push(rect(w.a, w.e, w.dir, DEPTH / 2 + 0.45, -0.45), top, top + 0.45, CORNICE, props);
      const steps = 5;
      for (let i = 0; i < steps; i++) {
        const half = DEPTH / 2 + 0.3 - (i + 1) * ((DEPTH / 2 - 1.4) / steps);
        const inset = Math.min(len / 2 - 1, -0.3 + (i + 0.6) * ((DEPTH / 2 - 1.4) / steps));
        if (half <= 0.5 || len - 2 * inset < 1) break;
        push(rect(w.a, w.e, w.dir, half, inset), top + 0.45 + i * 0.8, top + 0.45 + (i + 1) * 0.8, SLATE[i], props);
      }
    } else {
      push(full, top, top + 0.7, ROOF, props);              // roof membrane
      ring(rect(w.a, w.e, w.dir, DEPTH / 2 + 0.3, -0.3), rect(w.a, w.e, w.dir, DEPTH / 2 - 0.5, 0.5), top, top + 1.2, CORNICE, props); // cornice / parapet
    }
    // punched windows on both long faces, every ~3.4 m, set slightly proud as glazing frames
    const n = Math.floor((len - 2) / 3.4);
    const off = (len - n * 3.4) / 2;
    for (let f = 0; f < w.stories; f++) {
      const z0 = f === 0 ? 0 : GROUND + FLOOR * (f - 1);
      const h = f === 0 ? GROUND : FLOOR;
      const zb = z0 + (f === 0 ? 1.4 : 0.9), zt = z0 + h - (f === 0 ? 0.9 : 0.6);
      for (let i = 0; i < n; i++) {
        const d0 = off + i * 3.4 + 0.95, d1 = d0 + 1.5;
        for (const sgn of [1, -1]) {
          const nx = -w.dir[1] * sgn, ny = w.dir[0] * sgn;
          const P = (d: number, o: number): [number, number] => [w.a[0] + w.dir[0] * d + nx * o, w.a[1] + w.dir[1] * d + ny * o];
          push([P(d0, DEPTH / 2 - 0.05), P(d1, DEPTH / 2 - 0.05), P(d1, DEPTH / 2 + 0.1), P(d0, DEPTH / 2 + 0.1)], zb, zt, GLASS, props);
        }
      }
    }
    // balconies on IL wings: every other bay, floors 2+, both faces, with a glass rail
    if (w.care === "IL") {
      for (let f = 1; f < w.stories; f++) {
        const z = GROUND + FLOOR * (f - 1);
        for (let i = f % 2; i < n; i += 2) {
          const d0 = off + i * 3.4 + 0.4, d1 = d0 + 2.6;
          for (const sgn of [1, -1]) {
            const nx = -w.dir[1] * sgn, ny = w.dir[0] * sgn;
            const P = (d: number, o: number): [number, number] => [w.a[0] + w.dir[0] * d + nx * o, w.a[1] + w.dir[1] * d + ny * o];
            push([P(d0, DEPTH / 2), P(d1, DEPTH / 2), P(d1, DEPTH / 2 + 1.6), P(d0, DEPTH / 2 + 1.6)], z - 0.05, z + 0.2, CORNICE, props);
            push([P(d0, DEPTH / 2 + 1.5), P(d1, DEPTH / 2 + 1.5), P(d1, DEPTH / 2 + 1.6), P(d0, DEPTH / 2 + 1.6)], z + 0.2, z + 1.15, RAIL, props);
          }
        }
      }
    }
    // rooftop units on the flat (memory-care) roofs, every ~18 m, set back from the edge
    for (let d = 6; !pitched && d < len - 4; d += 18) {
      const c: [number, number] = [w.a[0] + w.dir[0] * d, w.a[1] + w.dir[1] * d];
      const c2: [number, number] = [c[0] + w.dir[0] * 3.2, c[1] + w.dir[1] * 3.2];
      push(rect(c, c2, w.dir, 1.6, 0), top + 0.7, top + 2.2, RTU, props);
    }
  }
  // trees: octagonal canopies in each courtyard and along the parking edge
  const tree = (x: number, y: number, r: number, k: number) => {
    const pts: [number, number][] = Array.from({ length: 8 }, (_, i) => [x + r * Math.cos((i * Math.PI) / 4 + 0.39), y + r * Math.sin((i * Math.PI) / 4 + 0.39)]);
    const oct = (rr: number): [number, number][] => Array.from({ length: 8 }, (_, i) => [x + rr * Math.cos((i * Math.PI) / 4 + 0.39), y + rr * Math.sin((i * Math.PI) / 4 + 0.39)]);
    const ht = 7 + (k % 3) * 1.4;
    push(oct(0.25), 0, 2.6, "#6b5340", { kind: "tree" });
    push(pts, 2.6, ht - 1.6, TREE[k % 3], { kind: "tree" });
    push(oct(r * 0.65), ht - 1.6, ht, TREE[(k + 1) % 3], { kind: "tree" });
  };
  // courtyards: lawn, a paver loop and cross paths, and a water feature at the centre
  for (const [x1, y1, x2, y2] of courts) {
    const sq = (a: number, b: number, c: number, d: number): [number, number][] => [[a, b], [c, b], [c, d], [a, d]];
    push(sq(x1, y1, x2, y2), 0, 0.12, LAWN, { kind: "court" });
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    ring(sq(x1 + 2.5, y1 + 2.5, x2 - 2.5, y2 - 2.5), sq(x1 + 4.7, y1 + 4.7, x2 - 4.7, y2 - 4.7), 0, 0.2, PAVER, { kind: "court" });
    push(sq(mx - 1.1, y1 + 2.5, mx + 1.1, y2 - 2.5), 0, 0.2, PAVER, { kind: "court" });
    push(sq(x1 + 2.5, my - 1.1, x2 - 2.5, my + 1.1), 0, 0.2, PAVER, { kind: "court" });
    const oct = (r: number): [number, number][] => Array.from({ length: 8 }, (_, i) => [mx + r * Math.cos((i * Math.PI) / 4 + 0.39), my + r * Math.sin((i * Math.PI) / 4 + 0.39)]);
    push(oct(4.2), 0, 0.5, STONE, { kind: "court" });
    push(oct(3.5), 0.5, 0.55, WATER, { kind: "court" });
  }
  // parking field: asphalt, double-loaded stall rows (2.7 m x 5.5 m) on 6.7 m aisles, plus the drive to the porte-cochere
  {
    const { pw, py, ph } = park;
    push([[0, py], [pw, py], [pw, py - ph], [0, py - ph]], 0, 0.1, ASPHALT, { kind: "parking" });
    const mod = 5.5 * 2 + 6.7;
    for (let y0 = py - 0.6; y0 - mod > py - ph - 0.5; y0 -= mod) {
      for (const [ya, yb] of [[y0, y0 - 5.5], [y0 - 5.5 - 6.7, y0 - mod]]) {
        for (let x = 1.5; x <= pw - 1.5; x += 2.7) push([[x - 0.06, ya], [x + 0.06, ya], [x + 0.06, yb], [x - 0.06, yb]], 0.1, 0.13, STRIPE, { kind: "parking" });
      }
    }
    const ex = Math.min(30, park.totalW / 4);
    push([[ex - 4, py], [ex + 4, py], [ex + 4, -DEPTH / 2 - 9], [ex - 4, -DEPTH / 2 - 9]], 0, 0.1, ASPHALT, { kind: "parking" });
    push([[0, -DEPTH / 2 - 0.1], [Math.max(park.totalW, pw), -DEPTH / 2 - 0.1], [Math.max(park.totalW, pw), -DEPTH / 2 - 2.6], [0, -DEPTH / 2 - 2.6]], 0, 0.16, PAVER, { kind: "walk" });
  }
  let k = 0;
  for (const [x1, y1, x2, y2] of courts) {
    for (let x = x1 + 7; x < x2 - 5; x += 13) for (let y = y1 + 7; y < y2 - 5; y += 13) if ((Math.round((x - x1) / 13) + Math.round((y - y1) / 13)) % 2 === 0) {
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      if (Math.hypot(x - mx, y - my) < 8 || Math.abs(x - mx) < 3.5 || Math.abs(y - my) < 3.5) continue;
      tree(x, y, 3.1, k++);
    }
  }
  const ty = park.py + 4;
  const ex = Math.min(30, park.totalW / 4);
  for (let x = 4; x < Math.max(park.totalW, park.pw); x += 11) if (Math.abs(x - ex) > 11) tree(x, ty - 1, 2.6, k++);
  for (let x = 4; x < park.pw; x += 22) tree(x, park.py - park.ph / 2, 2.4, k++);  // parking islands
  // porte-cochere at the main entry, on the south face of the first block
  push([[ex - 7, -DEPTH / 2], [ex + 7, -DEPTH / 2], [ex + 7, -DEPTH / 2 - 9], [ex - 7, -DEPTH / 2 - 9]], 4.2, 4.9, CANOPY, { kind: "canopy" });
  for (const [cx, cy] of [[ex - 6.4, -DEPTH / 2 - 8.4], [ex + 6.4, -DEPTH / 2 - 8.4]]) push([[cx - 0.3, cy - 0.3], [cx + 0.3, cy - 0.3], [cx + 0.3, cy + 0.3], [cx - 0.3, cy + 0.3]], 0, 4.2, STONE, { kind: "canopy" });
  return { type: "FeatureCollection", features: out };
}
