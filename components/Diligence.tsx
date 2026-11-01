"use client";
import { useEffect, useState } from "react";
const STATES = ["Not started", "In progress", "Done", "Issue"];
export default function Diligence({ id, items }: { id: string; items: { key: string; item: string; status: string }[] }) {
  const key = `atco-dd-v1:${id}`;
  const [st, setSt] = useState<Record<string, string>>({});
  useEffect(() => { try { setSt(JSON.parse(localStorage.getItem(key) || "{}")); } catch { /* storage blocked */ } }, [key]);
  const cycle = (k: string, cur: string) => {
    const next = STATES[(STATES.indexOf(cur) + 1) % STATES.length];
    const ns = { ...st, [k]: next };
    setSt(ns);
    try { localStorage.setItem(key, JSON.stringify(ns)); } catch { /* storage blocked */ }
  };
  const done = items.filter((i) => (st[i.key] || i.status) === "Done").length;
  return (
    <>
      <div className="small muted" style={{ marginBottom: 10 }}>{done} of {items.length} complete. Click a status to advance it. Status is saved in this browser only and is not shared with other viewers.</div>
      <div className="table-wrap">
        <table className="t">
          <thead><tr><th>#</th><th>Item</th><th>Status</th></tr></thead>
          <tbody>
            {items.map((i, n) => {
              const s = st[i.key] || i.status;
              return (
                <tr key={i.key}><td className="num muted">{n + 1}</td><td>{i.item}</td>
                  <td><button className={`status-chip st-${s.replace(/\s/g, "-")}`} onClick={() => cycle(i.key, s)}>{s}</button></td></tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
