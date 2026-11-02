// Concept massing generated from the underwritten program.
// Courtyard blocks of double-loaded wings (IL 4 stories, AL 3, MC 2), a surface lot and a green court.
// Illustrative only: it shows scale and coverage, not a site plan.

export interface Line { care: string; units: number }
export interface MassingPart { kind: "building" | "parking" | "court"; care?: string; stories?: number; height: number; base: number; coords: [number, number][] }
export interface Massing {
  parts: GeoJSON.FeatureCollection; center: [number, number];
  stats: { gsf: number; footprintSf: number; coveragePct: number; far: number; maxStories: number; heightFt: number; parking: number; parkingSf: number; openSpacePct: number; blocks: number; wings: { care: string; stories: number; sf: number; lengthFt: number }[] };
}

export const CARE_STYLE: Record<string, { color: string; stories: number; label: string }> = {
  IL: { color: "#9fb3cc", stories: 4, label: "Independent living" },
  AL: { color: "#d9c19a", stories: 3, label: "Assisted living" },
  MC: { color: "#b98f55", stories: 2, label: "Memory care" },
  SNF: { color: "#c98a8a", stories: 2, label: "Skilled nursing" },
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
        local.push({ kind: "building", care: seg.care, stories: seg.stories, base: 0, height: heightOf(seg.stories),
          coords: [[a[0] - nx, a[1] - ny], [e[0] - nx, e[1] - ny], [e[0] + nx, e[1] + ny], [a[0] + nx, a[1] + ny], [a[0] - nx, a[1] - ny]] });
        rem -= take; pos += take;
        if (pos >= s.len - 0.01) { si++; pos = 0; }
      }
    }
    const i = DEPTH / 2 + 2;
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
    properties: { kind: p.kind, care: p.care || "", stories: p.stories || 0, height: p.height, base: p.base, color: p.kind === "building" ? CARE_STYLE[p.care!]?.color || "#ccc" : p.kind === "court" ? "#7fa36b" : "#6b7280" },
    geometry: { type: "Polygon", coordinates: [p.coords.map(toLL)] },
  }));

  const gsf = segs.reduce((a, s) => a + s.sf, 0);
  const footprintSf = segs.reduce((a, s) => a + s.sf / s.stories, 0);
  const siteSf = acres * 43560;
  const parkingSf = parkM2 / SF;
  const maxStories = Math.max(...segs.map((s) => s.stories));
  return {
    parts: { type: "FeatureCollection", features }, center,
    stats: {
      gsf, footprintSf, coveragePct: footprintSf / siteSf, far: gsf / siteSf, maxStories,
      heightFt: heightOf(maxStories) / FT, parking: parkingSpaces, parkingSf,
      openSpacePct: Math.max(0, 1 - (footprintSf + parkingSf) / siteSf), blocks: blocks.length,
      wings: segs.map((s) => ({ care: s.care, stories: s.stories, sf: s.sf, lengthFt: s.len / FT })),
    },
  };
}
