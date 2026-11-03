import gc from "@/data/contractors.json";

type Proj = { p: string; where: string; what: string; url: string };
type GC = { name: string; hq: string; role: string; projects: Proj[] };
const G = gc.gcs as Record<string, GC>;
const ST: Record<string, string> = { NY: "NY", NJ: "NJ", CT: "CT" };

export function gcFor(s: { id: string; state: string; county: string }) {
  const key = `${s.state} ${s.county}`;
  const [a, b] = (gc.byCounty as Record<string, string[]>)[key] || (s.state === "NJ" ? ["IMC", "KBE"] : s.state === "CT" ? ["KBE", "Floyd"] : ["KBE", "Andron"]);
  const rank = (p: Proj) => (p.where.includes(`${s.county} County`) ? 0 : p.where.endsWith(ST[s.state]) ? 1 : 2);
  const comps = (k: string) => [...G[k].projects].sort((x, y) => rank(x) - rank(y));
  const near = (gc.atcoNear as string[]).includes(key);
  const ov = (gc.override as Record<string, { atco: string; mode: string }>)[s.id];
  const atco = ov?.atco ?? (near
    ? `Self-perform: ATCO builds as GC/CM, inside its New York metro subcontractor base. Take a competitive number from ${G[a].name} to benchmark price and lean on their senior-living preconstruction (licensure-driven MEP, nurse call, memory-care security).`
    : `Hire ${G[a].name} as GC with ATCO as owner's rep and construction monitor; the site sits outside ATCO's core New York metro subcontractor base, so a contractor with a local senior-living record carries less schedule risk.`);
  const mode = ov?.mode ?? (near ? "self" : "third");
  return { primary: { key: a, ...G[a], comps: comps(a) }, alt: { key: b, ...G[b], comps: comps(b) }, atco, mode, note: gc.note };
}
export const allGCs = () => Object.entries(G).map(([k, v]) => ({ key: k, ...v }));
