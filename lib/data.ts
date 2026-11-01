import raw from "@/data/site-data.json";

export type Verdict = "Pursue" | "Pursue-structured" | "Watch" | "Pass";
export type TaxKey = "full_tax" | "pilot" | "nonprofit_exempt";
export const data: any = raw;
export const sites: any[] = data.sites;
export const meta = data.meta;
export const funnel = data.funnel;
export const assumptions = data.assumptions;
export const markets: any[] = data.markets;
export const comps: any[] = data.comps;
export const regulatory = data.regulatory;
export const HURDLE: number = data.meta.hurdle_yoc;
export const TARGET = 0.075; // business-plan target for owned rentals (recommendation; Ben's floor is the JSON hurdle)

export const VERDICTS: Verdict[] = ["Pursue", "Pursue-structured", "Watch", "Pass"];
export const VERDICT_COLOR: Record<Verdict, string> = {
  Pursue: "#1E8A5A",
  "Pursue-structured": "#3B5FC4",
  Watch: "#C98A1E",
  Pass: "#98A1AB",
};
export const TAX_LABEL: Record<TaxKey, string> = { full_tax: "Fully taxed", pilot: "PILOT", nonprofit_exempt: "Nonprofit" };
export const STATE_NAME: Record<string, string> = { NY: "New York", NJ: "New Jersey", CT: "Connecticut" };

export const isShortlist = (s: any) => s.verdict === "Pursue" || s.verdict === "Pursue-structured";
export const shortlist = sites.filter(isShortlist).sort((a, b) => a.rank - b.rank);
export const siteById = (id: string) => sites.find((s) => s.id === id);
export const marketOf = (s: any) => markets.find((m) => m.state === s.state && m.county === s.county);

export function trackOf(s: any): "Rental AL/MC" | "Continuum" {
  const p = String(s.uw.prototype || "").replace("*", "");
  const il = Number(s.mix_IL || 0);
  if (p === "A" || il >= 80) return "Continuum";
  return "Rental AL/MC";
}

/** Plain-English read of the breakeven ratio. */
export function breakevenLine(s: any): string {
  const b = s.uw.breakeven_rent_ratio;
  if (b === null || b === undefined) return "Not yet verified";
  if (b < 1) return `Rents could fall ${Math.round((1 - b) * 100)}% from the modeled level and the deal would still hit ${(HURDLE * 100).toFixed(1)}% fully taxed.`;
  return `Rents would need to rise ${Math.round((b - 1) * 100)}% above the modeled level to reach ${(HURDLE * 100).toFixed(1)}% fully taxed.`;
}

/** Esri World Imagery still for a site (no key). */
export function satThumb(lat: number, lon: number, w = 640, h = 400, spanLon = 0.012) {
  const dLon = spanLon / 2;
  const dLat = (dLon * Math.cos((lat * Math.PI) / 180) * h) / w;
  const bbox = [lon - dLon, lat - dLat, lon + dLon, lat + dLat].map((v) => v.toFixed(6)).join(",");
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${bbox}&bboxSR=4326&imageSR=3857&size=${w},${h}&format=jpg&f=image`;
}

export const MIDTOWN = { lat: 40.7549, lon: -73.984 };
