// Entitlement dossier: approval path, boards, review regimes, environmental screening, utilities,
// traffic, licensing, precedent, a 0–100 entitlement risk score and an entitlement budget and schedule.
// Path classification is analyst-assigned from the site research; screening comes from official GIS
// (data/screening.json, refreshed by scripts/screen-sites.mjs); everything else is derived here.
import screening from "@/data/screening.json";
import { buildMassing } from "./massing";

export type Path = "entitled" | "siteplan" | "special" | "amend" | "redev" | "rezone" | "variance" | "disposition" | "unknown";

export const PATH_INFO: Record<Path, { label: string; desc: string; months: [number, number]; cost: number; base: number }> = {
  entitled: { label: "Entitled", desc: "Use and density approved; confirm the approval covers this program and is vested, then building permits and conditions of approval.", months: [4, 8], cost: 350_000, base: 10 },
  siteplan: { label: "Site plan approval", desc: "Use is permitted (or a floating zone is already applied); discretionary review is limited to site plan, with conditions.", months: [6, 10], cost: 550_000, base: 25 },
  special: { label: "Special permit / conditional use", desc: "Use allowed by special permit, conditional use or floating zone; findings-based approval with public hearing.", months: [9, 15], cost: 850_000, base: 40 },
  amend: { label: "Amend existing approval", desc: "An approval exists for a different program; amend the plan, approval or settlement to add AL/MC.", months: [9, 15], cost: 900_000, base: 42 },
  redev: { label: "Redevelopment plan", desc: "Designated redevelopment or reuse area; the governing body adopts or amends the plan and designates a redeveloper.", months: [10, 18], cost: 1_000_000, base: 45 },
  rezone: { label: "Rezoning / text amendment", desc: "Legislative act by the governing body or commission, then site plan; widest discretion and most exposure to opposition.", months: [12, 24], cost: 1_250_000, base: 60 },
  variance: { label: "Use variance", desc: "Board of adjustment / ZBA use variance with a supermajority and positive-and-negative-criteria proofs; appeal risk.", months: [10, 18], cost: 1_100_000, base: 68 },
  disposition: { label: "Public land disposition", desc: "Municipal sale or lease (RFP, referendum or permissive referendum), then the zoning path.", months: [18, 30], cost: 1_400_000, base: 78 },
  unknown: { label: "Path not yet identified", desc: "Zoning not confirmed; treat as a rezoning until a zoning opinion says otherwise.", months: [12, 24], cost: 1_250_000, base: 65 },
};

/** Analyst assignment from each site's research record (see Sources on the site page). */
export const SITE_PATH: Record<string, Path> = {
  "NJ-04": "amend", "NJ-06": "amend", "NY-10": "entitled", "NJ-10": "amend", "NY-03": "special", "CT-02": "entitled", "NY-01": "entitled",
  "CT-09": "disposition", "NY-07": "rezone", "CT-08": "special", "NY-04": "special", "CT-03": "rezone", "NJ-13": "amend", "NY-02": "siteplan",
  "NJ-02": "entitled", "NJ-05": "entitled", "NJ-03": "amend", "NJ-11": "amend", "NY-13": "amend", "NJ-09": "rezone", "NJ-01": "redev",
  "CT-16": "unknown", "NY-08": "special", "NY-06": "rezone", "NY-11": "special", "CT-01": "rezone", "NY-12": "special", "NJ-07": "amend",
  "NJ-14": "redev", "CT-14": "unknown", "NY-05": "siteplan", "CT-05": "special", "NY-09": "rezone", "NJ-12": "variance", "CT-13": "unknown",
  "CT-07": "rezone", "CT-04": "unknown", "NY-16": "unknown", "CT-10": "unknown", "CT-06": "rezone", "CT-12": "unknown", "NJ-08": "redev",
  "NY-15": "unknown", "NY-14": "disposition",
};

const OPP: Record<string, number> = { low: 0, "low-medium": 5, medium: 10, "medium-high": 15, high: 20, unknown: 10 };
const oppKey = (s: string) => (String(s || "unknown").toLowerCase().match(/^(low-medium|medium-high|low|medium|high|unknown)/)?.[1] || "unknown");

export interface Board { body: string; role: string; vote?: string }
export interface Item { k: string; v: string; flag?: "ok" | "watch" | "risk"; src?: string }

function boards(s: any, path: Path): Board[] {
  const muni = String(s.municipality || "");
  const nyc = /NYC/.test(muni);
  const village = /^Village/.test(muni);
  if (s.state === "NJ") {
    const b: Board[] = [];
    if (path === "rezone" || path === "redev" || path === "amend") b.push({ body: "Governing body (council / committee)", role: path === "redev" ? "Adopts or amends the redevelopment plan (N.J.S.A. 40A:12A-7), designates the redeveloper, approves any PILOT financial agreement" : "Adopts the zoning ordinance or plan amendment after Planning Board consistency review (N.J.S.A. 40:55D-26)" });
    if (path === "variance") b.push({ body: "Zoning Board of Adjustment", role: "d(1) use variance with positive and negative criteria (N.J.S.A. 40:55D-70d)", vote: "5 of 7 members" });
    b.push({ body: "Planning Board", role: "Preliminary and final major site plan, conditional use findings, subdivision (N.J.S.A. 40:55D-46 to 50); 95-day clock after completeness" });
    b.push({ body: `${s.county} County Planning Board`, role: "Site plan review for county-road access and drainage (N.J.S.A. 40:27-6.6)" });
    b.push({ body: "NJDEP", role: "Freshwater wetlands LOI / permits, flood hazard area, stormwater (N.J.A.C. 7:8), sewer extension (TWA); Highlands applicability where relevant" });
    if (/Montgomery|Hopewell|Princeton/i.test(muni)) b.push({ body: "Delaware & Raritan Canal Commission", role: "Review Zone stormwater and corridor approval" });
    b.push({ body: "NJ Department of Health", role: "Expedited certificate of need for AL beds, then licensure (N.J.A.C. 8:33, 8:36)" });
    return b;
  }
  if (s.state === "NY") {
    if (nyc) return [
      { body: "NYC Department of City Planning / City Planning Commission", role: "ULURP modification of the prior disposition or zoning action" },
      { body: "City Council (Land Use)", role: "Final ULURP vote if the action is modified or called up" },
      { body: "NYC lead agency (CEQR)", role: "City Environmental Quality Review; EAS, possibly EIS" },
      { body: "NYS Department of Health", role: "ALR / EALR / SNALR licensure (10 NYCRR Parts 1001, 487)" },
    ];
    const gov = village ? "Village Board of Trustees" : "Town Board";
    const b: Board[] = [];
    if (path === "rezone" || path === "special" || path === "amend" || path === "disposition" || path === "unknown") b.push({ body: gov, role: path === "special" ? "Floating-zone application or special permit (where reserved to the board); SEQRA lead agency is common" : path === "disposition" ? "Authorizes sale or lease of municipal land (permissive or mandatory referendum where required), then zoning" : "Zoning map or text amendment (Town Law §264-265 / Village Law §7-706); usually SEQRA lead agency" });
    b.push({ body: "Planning Board", role: "Site plan and subdivision (Town Law §274-a / Village Law §7-725-a); special permit where delegated" });
    b.push({ body: "Zoning Board of Appeals", role: "Area variances (height, setbacks, parking) as needed (Town Law §267-b)" });
    b.push({ body: `${s.county} County Planning`, role: "GML §239-m referral; a disapproval needs a supermajority to override" });
    b.push({ body: "SEQRA lead agency", role: "6 NYCRR Part 617 review: Unlisted or Type I; positive declaration triggers a DEIS / FEIS" });
    b.push({ body: "NYSDEC", role: "Article 24 freshwater wetlands (2025 rules: 7.4+ acres or of unusual importance, 100-ft adjacent area), SPDES stormwater permit" });
    if (/Westchester|Putnam|Dutchess/.test(s.county)) b.push({ body: "NYC DEP (watershed)", role: "Watershed Rules: stormwater pollution prevention plan review in the East-of-Hudson Croton / Kensico basins where applicable" });
    b.push({ body: "NYS Department of Health", role: "ALR / EALR / SNALR licensure (10 NYCRR Parts 1001, 487); Article 46 Certificate of Authority for a CCRC" });
    return b;
  }
  // CT
  const b: Board[] = [];
  b.push({ body: "Inland Wetlands & Watercourses Agency", role: "Wetlands / upland-review-area permit; must decide before the zoning commission acts (CGS 8-3(g), 22a-42a)" });
  b.push({ body: /West Hartford/.test(muni) ? "Town Council (zoning authority)" : /Stamford/.test(muni) ? "Zoning Board / Planning Board" : "Planning & Zoning Commission", role: path === "rezone" || path === "unknown" ? "Text or map amendment (CGS 8-3) with plan-of-conservation-and-development consistency, then special permit and site plan" : "Special permit and site plan (CGS 8-2, 8-3c), public hearing" });
  b.push({ body: "Zoning Board of Appeals", role: "Variances (CGS 8-6)" });
  b.push({ body: "Water Pollution Control Authority", role: "Sewer capacity allocation and connection approval" });
  b.push({ body: "CT DOT Office of the State Traffic Administration", role: "Major traffic generator certificate if 100,000+ SF or 200+ parking spaces (CGS 14-311)" });
  b.push({ body: "CT DEEP", role: "Construction stormwater general permit; diversion / water permits as needed" });
  b.push({ body: "CT Department of Public Health", role: "Assisted living services agency licence and managed residential community; no CON for AL (CGS 19a-638)" });
  return b;
}

function review(s: any, path: Path, units: number): Item[] {
  const st = s.state;
  if (st === "NY") {
    const nyc = /NYC/.test(s.municipality);
    const typeI = units >= 250 || (path === "rezone" && units >= 100);
    return [{ k: nyc ? "CEQR" : "SEQRA", v: nyc ? "City Environmental Quality Review; EAS with a likely EIS for a modified disposition." : `${typeI ? "Likely Type I" : "Likely Unlisted"} action under 6 NYCRR 617.4; ${path === "rezone" || typeI ? "budget for a positive declaration and DEIS/FEIS (adds 6–9 months)" : "a negative declaration is achievable with traffic, stormwater and visual studies"}.`, flag: typeI || path === "rezone" ? "watch" : "ok" }];
  }
  if (st === "NJ") return [{ k: "Environmental review", v: "No state EIS for private projects; the municipal environmental impact statement checklist plus NJDEP permits (wetlands, flood hazard, stormwater) carry the review.", flag: "ok" }];
  return [{ k: "Environmental review", v: "No CEPA review for private projects without state action; wetlands agency, stormwater general permit and OSTA traffic review carry the load.", flag: "ok" }];
}

function licensing(s: any): Item[] {
  const u = s.uw; const lines: any[] = u.lines || [];
  const has = (c: string) => lines.some((l) => l.care === c && l.units > 0);
  const out: Item[] = [];
  if (s.state === "NJ") {
    if (has("AL") || has("MC")) out.push({ k: "AL / MC", v: "Expedited certificate of need (N.J.A.C. 8:33-5.1), about 12 months, run in parallel with site plan. 10% of AL residents on Medicaid within three years, held permanently (N.J.S.A. 26:2H-12.16). Memory care licensed as AL with a dementia program.", flag: "watch" });
    if (has("IL")) out.push({ k: "Independent living", v: "No health licence for rental IL. A CCRC with entrance fees registers with DCA under the Continuing Care Retirement Community Regulation and Financial Disclosure Act.", flag: "ok" });
  } else if (s.state === "NY") {
    if (has("AL") || has("MC")) out.push({ k: "AL / MC", v: "Adult home or enriched housing licence plus ALR, EALR (aging in place) and SNALR (memory care) certifications from DOH; no public-need test for private-pay ALR. Allow 9–18 months; file at schematic design.", flag: "watch" });
    if (has("IL")) out.push({ k: "Independent living", v: "Rental IL needs no DOH licence. Entrance-fee life-plan communities need an Article 46 Certificate of Authority before collecting more than 10% deposits.", flag: "ok" });
  } else {
    if (has("AL") || has("MC")) out.push({ k: "AL / MC", v: "Managed residential community registration plus an assisted living services agency licence from DPH; no certificate of need for AL (CGS 19a-638(b)). Memory care needs a dementia special care unit disclosure.", flag: "ok" });
    if (has("IL")) out.push({ k: "Independent living", v: "No licence for rental IL. A CCRC with entrance fees registers with DSS (CGS 17b-520 et seq.).", flag: "ok" });
  }
  return out;
}

export interface Screening {
  radius_m: number; flood_pin: any; flood_site: any; sfha_site: boolean | null; nwi_site: any; nwi_100ft: any;
  epa: { npl_1mi: any; brownfield_half_mi: any; rcra_adjacent: any; tri_half_mi: any };
  nj?: any; ny?: any;
}
export const SCREENED_AT: string | null = (screening as any).screened_at || null;
export const screeningFor = (id: string): Screening | null => ((screening as any).sites || {})[id] || null;

const isErr = (x: any) => x && typeof x === "object" && "err" in x;
const list = (x: any) => (Array.isArray(x) ? x : []);

function environmental(s: any, sc: Screening | null): Item[] {
  const r = s.research || {};
  if (!sc) return [{ k: "Screening", v: "Official GIS screening not yet run for this site; refreshed with the weekly data job.", flag: "watch" }];
  const out: Item[] = [];
  const fz = list(sc.flood_site).join(", ") || "none mapped";
  out.push({ k: "FEMA flood zone", v: isErr(sc.flood_site) ? "FEMA service did not respond at screening" : sc.sfha_site ? `Special Flood Hazard Area touches the site area (${fz}); at the pin: ${list(sc.flood_pin).join(", ") || "n/a"}. Keep the building out of the SFHA or budget flood-hazard permits and elevation.` : `Outside the 1% annual-chance floodplain (${fz}).`, flag: sc.sfha_site ? "risk" : "ok", src: "FEMA NFHL" });
  const nwi = list(sc.nwi_site);
  out.push({ k: "Wetlands (federal NWI)", v: isErr(sc.nwi_site) ? "NWI service did not respond at screening" : nwi.length ? `Mapped within the site area: ${nwi.join(", ")}. Order a field delineation before LOI.` : Number(sc.nwi_100ft) > 0 ? `None in the site area; ${sc.nwi_100ft} mapped within 100 ft (state buffers and upland review areas apply).` : "None mapped within 100 ft of the site area.", flag: nwi.length ? "risk" : Number(sc.nwi_100ft) > 0 ? "watch" : "ok", src: "USFWS NWI" });
  if (sc.ny && !isErr(sc.ny.dec_wetlands_within_100ft)) out.push({ k: "NYSDEC wetlands", v: sc.ny.dec_wetlands_within_100ft > 0 ? `${sc.ny.dec_wetlands_within_100ft} informational DEC wetland polygon(s) within 100 ft; under the 2025 rules a jurisdictional determination is needed.` : "No informational DEC freshwater wetland mapping within 100 ft.", flag: sc.ny.dec_wetlands_within_100ft > 0 ? "watch" : "ok", src: "NYSDEC" });
  const e = sc.epa || ({} as any);
  const n = (x: any) => (x && !isErr(x) ? x.n : 0);
  const names = (x: any) => (x && !isErr(x) && x.names?.length ? ` (${x.names.slice(0, 2).join("; ")})` : "");
  const npl = n(e.npl_1mi), bf = n(e.brownfield_half_mi), rc = n(e.rcra_adjacent), tri = n(e.tri_half_mi);
  out.push({ k: "EPA-listed sites", v: npl || bf || rc || tri ? [npl && `${npl} Superfund within 1 mi${names(e.npl_1mi)}`, bf && `${bf} brownfield within ½ mi${names(e.brownfield_half_mi)}`, rc && `${rc} RCRA hazardous-waste handler within 650 ft${names(e.rcra_adjacent)}`, tri && `${tri} toxic-release facility within ½ mi`].filter(Boolean).join("; ") + ". Phase I to assess vapor and groundwater pathways." : "No Superfund within 1 mi, brownfield or toxic-release facility within ½ mi, or RCRA handler adjacent.", flag: npl ? "risk" : bf || rc ? "watch" : "ok", src: "EPA EMEF" });
  if (sc.nj) {
    const j = sc.nj;
    out.push({ k: "NJ known contaminated sites", v: list(j.kcs_on_site).length ? `On or at the site area: ${list(j.kcs_on_site).join("; ")}. LSRP file review required.` : isErr(j.kcs_quarter_mi) ? "NJDEP service did not respond" : `${j.kcs_quarter_mi || 0} within ¼ mi; none at the site area.`, flag: list(j.kcs_on_site).length ? "risk" : j.kcs_quarter_mi > 0 ? "watch" : "ok", src: "NJDEP KCSL" });
    if (j.cafra === true) out.push({ k: "CAFRA", v: "Inside the CAFRA zone: Coastal Zone Management rules and a CAFRA permit apply.", flag: "watch", src: "NJDEP" });
    if (list(j.historic).length) out.push({ k: "Historic resources", v: `Listed or eligible resources at the site area: ${list(j.historic).join("; ")}. SHPO consultation if any state or federal nexus.`, flag: "watch", src: "NJDEP HPO" });
    if (j.overburdened_community === true) out.push({ k: "Environmental justice", v: "Inside an overburdened community under the NJ EJ Law; residential use is not a covered facility, but expect community-engagement scrutiny.", flag: "watch", src: "NJDEP" });
  }
  if (s.state === "NJ" && /Highlands/i.test(JSON.stringify(s))) out.push({ k: "NJ Highlands", v: "Highlands Act applicability: preservation-area major development needs a Highlands Preservation Area Approval; planning area follows the conformed municipal plan.", flag: "watch" });
  if (/Westchester|Putnam/.test(s.county) && s.state === "NY") out.push({ k: "NYC watershed", v: "Check whether the site drains to the Croton or Kensico basins; DEP Watershed Rules govern stormwater and sewage.", flag: "watch" });
  if (r.prior_use) out.push({ k: "Prior use", v: r.prior_use, flag: /industrial|gas|manufactur|landfill|dump/i.test(r.prior_use) ? "risk" : "ok" });
  return out;
}

function utilities(s: any, sc: Screening | null): Item[] {
  const r = s.research || {};
  const sw = String(r.sewer_water || "Unknown");
  const verified = /\(V\)|Verified/.test(sw);
  const out: Item[] = [{ k: "Sewer and water (research)", v: sw, flag: verified ? "ok" : /septic|STP|constraint|no sewer/i.test(sw) ? "risk" : "watch" }];
  if (sc?.nj) {
    const j = sc.nj;
    out.push({ k: "NJ sewer service area", v: j.in_sewer_service_area === true ? `Inside a mapped sewer service area: ${list(j.sewer_service_area).join("; ") || "named area"}. Confirm treatment-plant capacity and a TWA if extending.` : j.in_sewer_service_area === false ? "Outside mapped sewer service areas: a Water Quality Management Plan amendment or on-site treatment would be needed." : "Sewer service area lookup did not respond.", flag: j.in_sewer_service_area === true ? "ok" : j.in_sewer_service_area === false ? "risk" : "watch", src: "NJDEP WQMP" });
  }
  return out;
}

/** ITE Trip Generation (11th ed.) approximate rates per unit: IL 252, AL 254, MC 254, SNF 620. */
const TRIP: Record<string, { daily: number; pm: number }> = { IL: { daily: 3.24, pm: 0.25 }, AL: { daily: 2.6, pm: 0.24 }, MC: { daily: 2.0, pm: 0.2 }, SNF: { daily: 3.0, pm: 0.33 } };

export function dossier(s: any, a: any) {
  const u = s.uw;
  const path = SITE_PATH[s.id] || "unknown";
  const P = PATH_INFO[path];
  const sc = screeningFor(s.id);
  const lines: { care: string; units: number }[] = (u.lines || []).map((l: any) => ({ care: l.care, units: l.units }));
  const ilUnits = lines.find((l) => l.care === "IL")?.units || 0;
  const staff = Math.round(u.units * 0.35);
  const parking = Math.round(ilUnits * 1.0 + (u.units - ilUnits) * 0.25 + staff * 0.5);
  const gsfPer = Object.fromEntries(Object.entries<any>(a.care_levels).map(([k, v]) => [k, v.gsf_per_unit]));
  const m = buildMassing([Number(s.lon), Number(s.lat)], lines, gsfPer, Number(s.acres), parking).stats;
  const trips = lines.reduce((acc, l) => { const t = TRIP[l.care] || TRIP.AL; acc.daily += t.daily * l.units; acc.pm += t.pm * l.units; return acc; }, { daily: 0, pm: 0 });

  // risk score
  const flags: { t: string; pts: number }[] = [{ t: `Path: ${P.label}`, pts: P.base }];
  const ok = oppKey(s.opposition_risk); if (OPP[ok]) flags.push({ t: `Opposition: ${s.opposition_risk}`, pts: OPP[ok] });
  if (sc?.sfha_site) flags.push({ t: "Flood hazard area on the site area", pts: 8 });
  if (list(sc?.nwi_site).length) flags.push({ t: "Mapped wetlands on the site area", pts: 6 });
  else if (Number(sc?.nwi_100ft) > 0) flags.push({ t: "Wetlands within 100 ft", pts: 3 });
  if (sc?.epa && !isErr(sc.epa.npl_1mi) && sc.epa.npl_1mi?.n > 0) flags.push({ t: "Superfund site within 1 mile", pts: 6 });
  if (list(sc?.nj?.kcs_on_site).length) flags.push({ t: "Known contaminated site at the site area", pts: 8 });
  if (sc?.nj?.in_sewer_service_area === false) flags.push({ t: "Outside the sewer service area", pts: 8 });
  else if (!/\(V\)|Verified/.test(String(s.research?.sewer_water || ""))) flags.push({ t: "Utilities not verified", pts: 4 });
  if (s.state === "NY" && (path === "rezone" || u.units >= 250)) flags.push({ t: "SEQRA EIS likely", pts: 5 });
  if (/litigation|appeal|lawsuit|referendum|rejected|denied|withdrawn/i.test(`${s.entitlement_status} ${s.approval_case} ${s.research?.senior_use_path}`)) flags.push({ t: "Denial, appeal or litigation in the record", pts: 7 });
  if (s.pin_basis && /Approximate/i.test(s.pin_basis)) flags.push({ t: "Pin approximate: screening is indicative", pts: 2 });
  const score = Math.min(100, flags.reduce((x, f) => x + f.pts, 0));
  const band = score < 35 ? "Low" : score < 55 ? "Moderate" : score < 70 ? "Elevated" : "High";

  // schedule and budget
  let [lo, hi] = P.months; let cost = P.cost;
  const adders: { t: string; months: number; cost: number }[] = [];
  if (s.state === "NY" && (path === "rezone" || u.units >= 250)) adders.push({ t: "SEQRA DEIS / FEIS", months: 7, cost: 400_000 });
  if (list(sc?.nwi_site).length || sc?.sfha_site) adders.push({ t: "Wetlands / flood-hazard permits", months: 4, cost: 150_000 });
  if (sc?.nj?.in_sewer_service_area === false || /septic|STP/i.test(String(s.research?.sewer_water))) adders.push({ t: "Sewer: WQMP amendment or on-site treatment design", months: 6, cost: 250_000 });
  if (/litigation|appeal|lawsuit/i.test(`${s.entitlement_status} ${s.approval_case}`)) adders.push({ t: "Appeal period and defence", months: 4, cost: 200_000 });
  for (const x of adders) { lo += Math.round(x.months * 0.5); hi += x.months; cost += x.cost; }
  const budget = [
    { k: "Land-use counsel and hearings", pct: 0.24 }, { k: "Civil engineering, survey, stormwater", pct: 0.22 }, { k: "Architecture through approvals", pct: 0.18 },
    { k: "Traffic study", pct: 0.07 }, { k: "Environmental: Phase I/II, wetlands delineation", pct: 0.1 }, { k: "Market, fiscal-impact and need studies", pct: 0.06 },
    { k: "Application fees and escrows", pct: 0.08 }, { k: "Community outreach and visuals", pct: 0.05 },
  ].map((b) => ({ ...b, v: Math.round((cost * b.pct) / 5000) * 5000 }));

  const program: Item[] = [
    { k: "Building", v: `${Math.round(m.gsf).toLocaleString("en-US")} GSF, up to ${m.maxStories} stories (~${Math.round(m.heightFt)} ft)`, flag: m.maxStories >= 4 ? "watch" : "ok" },
    { k: "Coverage and FAR", v: `${(m.coveragePct * 100).toFixed(0)}% building coverage, FAR ${m.far.toFixed(2)} on ${s.acres} acres`, flag: m.coveragePct > 0.35 || m.far > 0.8 ? "watch" : "ok" },
    { k: "Parking", v: `~${parking} spaces (1.0 per IL, 0.25 per AL/MC unit, 0.5 per staff); confirm against the code minimum`, flag: "ok" },
    { k: "Open space", v: `${(m.openSpacePct * 100).toFixed(0)}% of the site`, flag: m.openSpacePct < 0.3 ? "watch" : "ok" },
  ];
  const traffic: Item[] = [
    { k: "Trip generation", v: `~${Math.round(trips.daily).toLocaleString("en-US")} weekday trips, ~${Math.round(trips.pm)} in the PM peak hour (ITE 252/254 rates); senior uses generate far fewer peak trips than market-rate housing.`, flag: trips.pm > 100 ? "watch" : "ok" },
  ];
  if (s.state === "CT" && (parking >= 200 || m.gsf >= 100_000)) traffic.push({ k: "OSTA certificate", v: `Major traffic generator (${parking >= 200 ? `${parking} spaces` : `${Math.round(m.gsf / 1000)}k SF`}): CT DOT OSTA review adds 3–4 months in parallel.`, flag: "watch" });

  return {
    path, pathLabel: P.label, pathDesc: P.desc, boards: boards(s, path), review: review(s, path, u.units), licensing: licensing(s),
    environmental: environmental(s, sc), utilities: utilities(s, sc), program, traffic, massing: m, parking,
    risk: { score, band, flags }, schedule: { lo, hi, adders, modelMonths: 9 }, budget, budgetTotal: budget.reduce((x, b) => x + b.v, 0),
    screenedAt: SCREENED_AT, screened: !!sc,
  };
}
