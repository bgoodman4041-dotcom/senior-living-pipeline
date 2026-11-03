import { VERDICT_COLOR, type Verdict } from "@/lib/data";

export function VerdictChip({ v, hold }: { v: Verdict; hold?: boolean }) {
  return (
    <span className={`chip v-${v}`}>
      <span className="dot" style={{ background: VERDICT_COLOR[v] }} />
      {v}{hold ? " · on hold" : ""}
    </span>
  );
}

export function I({ tip = "Calibrated estimate. See Methodology." }: { tip?: string }) {
  return <a href="/method#data-gaps" className="badge-i" title={tip}>I</a>;
}

export function NV({ v, children }: { v: any; children?: React.ReactNode }) {
  if (v === null || v === undefined || String(v).trim() === "") return <span className="muted">Not yet verified</span>;
  return <>{children ?? String(v)}</>;
}

export function Bar({ value, max = 100, color = "var(--navy-600)" }: { value: number; max?: number; color?: string }) {
  return (
    <div className="bar-track" role="img" aria-label={`${value} of ${max}`}>
      <div className="bar-fill" style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%`, background: color }} />
    </div>
  );
}

export function SectionHead({ n, title, sub, id }: { n?: string; title: string; sub?: React.ReactNode; id?: string }) {
  return (
    <div className="section-head anchor" id={id}>
      <div>
        <h2>{n && <span className="sec-num" aria-hidden="true">{n}</span>}{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
    </div>
  );
}

/** Render research text with its Verified / Inferred marker as a badge. */
export function Evidence({ text }: { text?: string }) {
  if (!text || !String(text).trim()) return <span className="muted">Not yet verified</span>;
  const t = String(text).trim();
  const m = t.match(/^(.*?)\s*[\(\[]\s*(V|I|V\/I|Verified|Inferred)\b([^\)\]]*)[\)\]]\s*$/);
  if (!m) return <>{t}</>;
  const verified = m[2] === "V" || m[2] === "Verified";
  const extra = m[3].replace(/^[,\s-]+/, "").trim();
  return (
    <>
      {m[1]}{extra ? ` (${extra})` : ""}{" "}
      {verified ? <span className="tag" title="Verified from a cited source">Verified</span> : <I tip="Inferred by analyst; verify before LOI" />}
    </>
  );
}
