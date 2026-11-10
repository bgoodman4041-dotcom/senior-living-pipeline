import ev from "@/data/lp-evidence.json";
import { int } from "@/lib/format";

type Comp = [string, string, number | null, string];
type R = { area?: string; comps?: Comp[]; classA_median?: number; area_avg?: [string, number][]; model: number; verdict: string; src?: [string, string][]; same_as?: string };

export function rentEvidence(id: string): (R & { base: R }) | null {
  const all = ev.rents as unknown as Record<string, R>;
  const r = all[id];
  if (!r) return null;
  return { ...r, base: r.same_as ? all[r.same_as] : r };
}

/** Public comp set behind the site's AL rent, and how the model compares. */
export default function RentComps({ id, compact = false }: { id: string; compact?: boolean }) {
  const r = rentEvidence(id);
  if (!r) return null;
  const b = r.base;
  const max = Math.max(r.model, ...(b.comps || []).map((c) => c[2] || 0));
  return (
    <div className="card">
      <div className="card-pad" style={{ paddingBottom: 6 }}>
        <div className="label">Rent check · assisted living starting prices, {b.area}</div>
        <p className="small" style={{ margin: "6px 0 0" }}><b>Model ${int(r.model)}/mo private pay.</b> {r.verdict}</p>
      </div>
      <div className="table-wrap"><table className="t">
        <thead><tr><th>Community</th><th className="hide-sm">Town</th><th className="num">Starting price</th>{!compact && <th className="hide-sm" style={{ width: "34%" }}><span className="sr-only">Price against the model rent</span></th>}<th className="hide-sm">Note</th></tr></thead>
        <tbody>
          <tr className="row-base"><td><b>This site (model)</b></td><td className="hide-sm">—</td><td className="num"><b>${int(r.model)}</b></td>{!compact && <td className="hide-sm"><div style={{ height: 10, width: `${(r.model / max) * 100}%`, background: "#403393" }} /></td>}<td className="hide-sm xs">Private-pay AL base rent</td></tr>
          {(b.comps || []).map((c) => (
            <tr key={c[0]}><td>{c[0]}</td><td className="hide-sm">{c[1]}</td><td className="num">{c[2] ? `$${int(c[2])}` : <span className="muted">not published</span>}</td>
              {!compact && <td className="hide-sm">{c[2] ? <div style={{ height: 10, width: `${(c[2] / max) * 100}%`, background: /Class A/.test(c[3]) ? "#F7901E" : "#c9cdd0" }} /> : null}</td>}<td className="hide-sm xs">{c[3]}</td></tr>))}
          {(b.area_avg || []).map((x) => <tr key={x[0]}><td className="small muted">{x[0]}</td><td className="hide-sm"></td><td className="num muted">${int(x[1])}</td>{!compact && <td className="hide-sm" />}<td className="hide-sm" /></tr>)}
        </tbody>
      </table></div>
      <div className="xs muted card-pad" style={{ paddingTop: 8 }}>Listed starting prices exclude level-of-care fees ($1,000–3,500/mo). Sources: {(b.src || []).map((s, i) => <span key={s[1]}>{i ? "; " : ""}<a href={s[1]} target="_blank" rel="noopener">{s[0]}</a></span>)}, pulled {ev.as_of}. A NIC MAP pull and a rate shop replace these before LOI.</div>
    </div>
  );
}
