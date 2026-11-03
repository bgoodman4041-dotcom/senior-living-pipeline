// Approval playbook: likelihood, step-by-step path, who to talk to, means and methods, and the case to make.
// Shortlist sites carry researched contacts and notes (data/playbook.json); every site gets the derived path,
// sequencing, framing numbers and role-based contacts.
import pb from "@/data/playbook.json";
import { dossier, type Path } from "./entitlement";

export interface Contact { group: string; name: string; role: string; phone?: string; email?: string; src?: string }
export interface Step { t: string; d: string; who: string; start: number; end: number; gate?: boolean; parallel?: boolean }

const CURATED: Record<string, any> = (pb as any).sites || {};
export const PLAYBOOK_DATE: string = (pb as any).researched_at;

const govTitle = (s: any) => {
  const m = String(s.municipality || "");
  if (s.state === "CT") return /West Hartford|Stamford|Wallingford|Windsor|Torrington/.test(m) ? "Mayor / Town Manager" : "First Selectman";
  if (s.state === "NY") return /NYC/.test(m) ? "Borough President" : /^Village/.test(m) ? "Mayor" : "Town Supervisor";
  return "Mayor";
};

function roleContacts(s: any, path: Path, owner: string | null): Contact[] {
  const town = s.municipality;
  const out: Contact[] = [];
  if (owner) out.push({ group: "Counterparty", name: owner, role: "Owner / current applicant: site control, existing approvals and JV terms" });
  out.push({ group: "Municipal staff", name: s.state === "CT" ? `${town} Town Planner / Land Use Office` : s.state === "NY" ? `${town} Planning Department` : `${town} Land Use Administrator / Board Secretary`, role: "First call: path, submission checklist, escrow, consultants and calendar" });
  out.push({ group: "Municipal staff", name: s.state === "NJ" ? "Zoning Officer" : s.state === "NY" ? "Building Inspector / Code Enforcement" : "Zoning Enforcement Officer", role: "Written zoning determination on the use" });
  out.push({ group: "Elected", name: `${town} ${govTitle(s)}`, role: path === "rezone" || path === "redev" || path === "disposition" || path === "amend" ? "Legislative sponsor: brief before any filing" : "Courtesy briefing before the public hearing" });
  out.push({ group: "Boards", name: s.state === "CT" ? "Planning & Zoning Commission chair" : "Planning Board chair", role: "Through staff only: concept review on the record" });
  out.push({ group: "Counsel and consultants", name: s.state === "NJ" ? "Morris / Somerset / Bergen land-use counsel with local board history" : s.state === "NY" ? "Westchester / Hudson Valley land-use counsel with SEQRA experience" : "Connecticut land-use counsel with wetlands-commission experience", role: "Retain counsel who has appeared before this board on a recent approval; confirm conflicts" });
  out.push({ group: "State and county", name: s.state === "NJ" ? "NJ DOH Certificate of Need and Licensing; county planning board" : s.state === "NY" ? "NYS DOH Adult Care Facilities; county planning (GML 239-m)" : "CT DPH Facility Licensing; CT DOT OSTA; regional COG", role: "Licensure and referral agencies" });
  return out;
}

function steps(s: any, d: ReturnType<typeof dossier>): Step[] {
  const st = s.state, path = d.path;
  const legislative = path === "rezone" || path === "redev" || path === "amend" || path === "special" || path === "disposition" || path === "unknown";
  const out: Step[] = [];
  let t = 0;
  const add = (x: Omit<Step, "start" | "end">, months: number, overlap = 0) => { const start = Math.max(0, t - overlap); const end = start + months; out.push({ ...x, start, end }); t = Math.max(t, end); };
  add({ t: "Site control with an entitlement contingency", d: `LOI and option or JV with ${d.schedule.hi + 3}+ months of approval period, extension rights, seller cooperation on applications and a pursuit-cost cap of ${Math.round(d.budgetTotal / 1000)}k.`, who: "ATCO, owner, counsel", gate: true }, 1.5);
  add({ t: "Zoning opinion and concept", d: "Counsel's written zoning opinion; bulk check of the massing against the district; Phase I, wetlands flagging and survey ordered.", who: "Counsel, civil engineer, architect" }, 1.5);
  add({ t: "Staff pre-application meeting", d: st === "NJ" ? "Meet the land use administrator, planner and engineer; optional informal concept review before the board (N.J.S.A. 40:55D-10.1, non-binding)." : st === "NY" ? "Meet the planning director; ask how lead agency and SEQRA classification will be handled and which consultants review." : "Meet the town planner; for wetlands, the IWWA agent; optional informal pre-application review by the commission (CGS 8-7d(e)).", who: "Planning staff" }, 1);
  if (legislative) add({ t: "Brief elected leadership", d: `Private briefing of the ${govTitle(s).toLowerCase()} and the board majority before anything is public. Bring the fiscal summary and the operator.`, who: "Elected officials" }, 0.5);
  add({ t: "Neighbor and community outreach", d: "Meet abutters (200-ft list from the assessor), HOAs, senior centers, clergy and the hospital before the first hearing; hold an open house with renderings.", who: "ATCO, operator, outreach consultant" }, 2, 0.5);
  if (st === "CT" && path !== "entitled") add({ t: "Inland wetlands permit", d: "Wetlands / upland-review-area application; the commission must decide before Planning & Zoning acts (CGS 8-3(g)).", who: "IWWA" }, 3);
  if (legislative) add({ t: path === "redev" ? "Redevelopment plan adoption / amendment" : path === "disposition" ? "Municipal disposition (RFP / referendum)" : path === "special" ? "Special permit / floating-zone application" : path === "amend" ? "Amend the existing approval" : "Zoning text or map amendment", d: d.pathDesc, who: d.boards[0]?.body || "Governing body" }, Math.max(3, Math.round((d.schedule.lo + d.schedule.hi) / 2) - 7));
  if (st === "NY" && path !== "entitled") add({ t: "SEQRA", d: d.review[0]?.v || "Environmental review", who: "Lead agency" }, d.schedule.adders.some((a) => /SEQRA/.test(a.t)) ? 8 : 3, 3);
  if (path === "entitled") add({ t: "Remaining approvals and conditions", d: "Confirm the approvals run with the land, are not near expiry and transfer to the buyer; then architectural review, construction management plan and resolution conditions.", who: st === "CT" ? "Planning & Zoning staff" : "Planning Board / building department", gate: true }, 3);
  else   add({ t: "Site plan approval", d: st === "NJ" ? "Preliminary and final major site plan; 95-day decision clock after completeness; county planning board sign-off." : st === "NY" ? "Planning Board site plan with public hearing; GML 239-m county referral; ZBA area variances if needed." : "Special permit and site plan public hearing (CGS 8-3c); OSTA certificate if a major traffic generator.", who: st === "CT" ? "Planning & Zoning Commission" : "Planning Board", gate: true }, 4);
  add({ t: st === "NJ" ? "DOH expedited certificate of need" : st === "NY" ? "DOH ALR / EALR licensure" : "DPH ALSA / MRC licensing", d: d.licensing[0]?.v || "State licensing", who: st === "CT" ? "CT DPH" : `${st} DOH`, parallel: true }, st === "NJ" ? 12 : st === "NY" ? 12 : 6, 8);
  add({ t: "Appeal period and conditions", d: st === "NJ" ? "45 days from publication of the decision (R. 4:69-6); satisfy resolution conditions; developer's agreement and PILOT if any." : st === "NY" ? "Article 78 window of 30 days from filing of the decision (4 months for legislative acts); satisfy conditions." : "15 days from publication of the decision (CGS 8-8(b)); satisfy conditions; 12-65b abatement agreement.", who: "Counsel", gate: true }, 1.5);
  add({ t: "Building permits and financial close", d: "Construction documents, permits, GMP, lender closing; the capital model's financial close.", who: "ATCO, GC, lender" }, 3);
  return out;
}

const PM_MF = 0.39; // ITE 221 multifamily mid-rise, PM peak per unit (comparison only)

export function playbook(s: any, a: any) {
  const d = dossier(s, a);
  const u = s.uw;
  const cur = CURATED[s.id];
  const owner = /JV with|Pad from|Buy/.test(s.deal_route || "") ? String(s.deal_route).replace(/^(JV with|Pad from|Buy or JV with|Buy entitlement or JV with owner \(|Buy AL pad or JV with)\s*/i, "").replace(/\)$/, "").replace(/ to add.*$/, "") : null;
  const contacts: Contact[] = cur?.contacts || roleContacts(s, d.path, owner);

  // likelihood: town approval score blended with the inverse of entitlement risk
  const like = Math.max(5, Math.min(95, Math.round(0.65 * s.scores.approval + 0.35 * (100 - d.risk.score))));
  const likeBand = like >= 80 ? "Very likely" : like >= 65 ? "Likely" : like >= 50 ? "Even" : like >= 35 ? "Uphill" : "Unlikely";
  const reasons: string[] = [];
  if (s.approval_case) reasons.push(s.approval_case);
  if (s.research?.approval_evidence) reasons.push(`Precedent: ${String(s.research.approval_evidence).replace(/\s*\((V|I)\)\s*/g, " ").trim()}`);
  reasons.push(`Opposition risk: ${s.opposition_risk || "unknown"}`);
  d.risk.flags.filter((f) => !/^Path|^Opposition/.test(f.t)).slice(0, 3).forEach((f) => reasons.push(f.t));

  // the case to make, with this site's numbers
  const lines: any[] = u.lines || [];
  const staff = Math.round(u.units * 0.35);
  const pmTrips = lines.reduce((x, l) => x + ({ IL: 0.25, AL: 0.24, MC: 0.2, SNF: 0.33 } as any)[l.care] * l.units, 0);
  const pmMf = PM_MF * u.units;
  const framing = [
    { k: "Property taxes", v: u.taxes >= 1e6 ? `$${(u.taxes / 1e6).toFixed(2)}M / yr` : `$${Math.round(u.taxes / 1000)}k / yr`, d: "Fully taxed, paid to a town that sends no children to its schools from this site." },
    { k: "School children", v: "0", d: "Age-qualified and licensed care residents; no school cost." },
    { k: "PM peak trips", v: `~${Math.round(pmTrips)}`, d: `About ${Math.round((1 - pmTrips / pmMf) * 100)}% fewer than ${u.units} market-rate apartments (~${Math.round(pmMf)}); shift changes fall outside the commuter peak.` },
    { k: "Local jobs", v: `~${staff} FTE`, d: "Permanent care, dining and maintenance jobs, plus construction work." },
    { k: "Who lives here", v: "Local parents", d: "Most AL/MC residents move within 5–10 miles to be near adult children who already live in town." },
    { k: "EMS", v: "Mitigate", d: "Senior communities raise EMS calls. Offer an on-site clinical protocol, a non-emergency transport contract and a voluntary EMS contribution." },
  ];
  const methods: string[] = cur?.methods || [
    "Call staff before anyone else. Ask which path they see, who reviews for the town, the escrow amount and the next open agenda.",
    d.path === "rezone" || d.path === "unknown" ? "Do not file a rezoning cold. Line up the governing body's sponsor and a staff memo of support first; a legislative act can be refused for any rational reason." : "Keep the program inside what the code or approval already allows, so review stays administrative and findings-based.",
    "Lead with the operator and the residents: licensed care for the town's own older residents, near their families.",
    "Bring fiscal impact, traffic (ITE 252/254) and EMS studies to the first hearing, not in response to objections.",
    s.state === "CT" ? "Sequence wetlands first. Planning & Zoning cannot act until the wetlands commission decides." : s.state === "NY" ? "Settle lead agency and SEQRA classification at the first meeting; a positive declaration adds two quarters." : "File the CN as soon as site control and a site plan exist; it runs about 12 months in parallel.",
  ];
  const plan = steps(s, d);
  const gates = gatesFor(s, d, plan);
  const loi = loiTerms(s, d, plan, owner);
  return {
    d, like, likeBand, reasons, contacts, curated: !!cur, pathNote: cur?.path_note || null, likelihoodNote: cur?.likelihood_note || null,
    methods, framing, steps: plan, gates, loi, totalMonths: Math.max(...plan.map((x) => x.end)), sources: cur?.sources || [],
  };
}

// Pursuit spend accrues by step; each gate is a go / no-go with the cumulative dollars at risk if we walk there.
const WEIGHT: [RegExp, number][] = [
  [/^Site control/, 0.03], [/^Zoning opinion/, 0.1], [/^Staff pre/, 0.02], [/^Brief elected/, 0.01], [/^Neighbor/, 0.05],
  [/^Inland wetlands/, 0.1], [/SEQRA/, 0.16], [/^Site plan|^Remaining approvals/, 0.24], [/licens|certificate of need/i, 0.04], [/^Appeal/, 0.03], [/^Building permits/, 0],
];
export interface Gate { name: string; month: number; atRisk: number; test: string; kill: string }
function gatesFor(s: any, d: ReturnType<typeof dossier>, plan: Step[]): Gate[] {
  const w = plan.map((st) => WEIGHT.find(([r]) => r.test(st.t))?.[1] ?? 0.22); // legislative step falls through to 0.22
  const sum = w.reduce((a, b) => a + b, 0) || 1;
  const spentBy = (i: number) => d.budgetTotal * plan.slice(0, i + 1).reduce((a, _, j) => a + w[j], 0) / sum;
  const at = (re: RegExp) => plan.findIndex((x) => re.test(x.t));
  const out: Gate[] = [];
  const g = (i: number, name: string, test: string, kill: string) => { if (i >= 0) out.push({ name, month: plan[i].end, atRisk: spentBy(i), test, kill }); };
  g(at(/^Zoning opinion/), "Gate 1 · Feasibility", `Counsel confirms the ${d.pathLabel.toLowerCase()} path; the massing fits bulk and parking; Phase I and wetlands flagging are clean.`, "Walk if the use needs a rezoning the code does not contemplate, or wetlands cut the buildable area below the program.");
  const pol = Math.max(at(/^Neighbor/), at(/^Brief elected/));
  g(pol, "Gate 2 · Political read", `Staff sees a path; ${govTitle(s).toLowerCase()} and a board majority are neutral or supportive; no organized opposition after abutter meetings.`, "Walk or re-scope if the governing body will not sponsor a legislative step, or an HOA retains counsel before filing.");
  let leg = -1; plan.forEach((x, i) => { if (i > pol && !/^Inland|^Site plan|^Remaining approvals|licens|certificate|^Appeal|^Building/i.test(x.t)) leg = i; });
  g(leg >= 0 ? leg : at(/^Inland wetlands/), s.state === "NY" ? "Gate 3 · Zoning and SEQRA" : s.state === "CT" ? "Gate 3 · Wetlands and zoning" : "Gate 3 · Zoning in place", s.state === "NY" ? "Negative declaration or a scoped EIS that fits the schedule; the legislative act or special permit is adopted." : "The zoning action is adopted or the wetlands permit issues with workable conditions.", "Walk if a positive declaration or conditions add more than two quarters or push yield on cost below the floor.");
  g(at(/^Site plan|^Remaining approvals/), "Gate 4 · Approval resolution", "Resolution adopted; conditions priced (off-site traffic, utilities, EMS contribution, affordable set-aside) and still clearing the hurdle.", "Renegotiate land or walk if conditions add more than 3% to cost ex-land.");
  g(at(/^Appeal/), "Gate 5 · Unappealed and licensed path", "Appeal window runs with no filing, or the appeal is assessed as weak by counsel; state licensing on track.", "Close land only on unappealed approvals; extend under the contract if an appeal is filed.");
  return out;
}
function loiTerms(s: any, d: ReturnType<typeof dossier>, plan: Step[], owner: string | null): { k: string; v: string }[] {
  const months = Math.ceil(Math.max(...plan.map((x) => x.end)));
  const cap = Math.round(d.budgetTotal / 1000);
  return [
    { k: "Structure", v: owner ? `JV or option with ${owner}; land contributed or priced at the residual, closing on approvals` : "Contract of sale or option, closing on final unappealed approvals" },
    { k: "Approval period", v: `${months} months from contract, plus two 90-day extensions for a fee credited to price; tolled during any appeal or litigation` },
    { k: "Deposits", v: "Small initial deposit, refundable through feasibility; further deposits released only at the zoning and approval gates" },
    { k: "Seller cooperation", v: "Owner signs applications, joins in the petition and does not oppose or object; access for borings, survey and wetlands flagging" },
    { k: "Approval definition", v: `Final unappealed approvals for at least ${s.uw.units} units of the modeled mix on conditions acceptable to buyer, plus ${s.state === "NJ" ? "DOH certificate of need" : s.state === "NY" ? "DOH licensure path" : "DPH licensing path"} confirmed` },
    { k: "Price protection", v: "Price per approved unit, with a floor and a cap; credit for off-site improvements required as conditions" },
    { k: "Pursuit budget", v: `About $${cap.toLocaleString("en-US")}k at risk before approval; ATCO controls consultants and the application` },
    { k: "Exclusivity", v: "No-shop through approvals; right of first refusal on adjacent parcels and any later phase" },
  ];
}
