"use client";
import { useState } from "react";

export type NewsItem = { date: string; source: string; kind: string; tag: string; title: string; url: string; take: string; why: string };
const fmt = (iso: string) => new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const TAG_COLOR: Record<string, string> = { Capital: "#403393", Supply: "#F7901E", Demand: "#76B96A", Costs: "#BB2034", Region: "#3D86C6" };

export default function NewsFeed({ items, limit }: { items: NewsItem[]; limit?: number }) {
  const tags = ["All", ...Array.from(new Set(items.map((i) => i.tag)))];
  const [tag, setTag] = useState("All");
  const list = [...items].sort((a, b) => b.date.localeCompare(a.date)).filter((i) => tag === "All" || i.tag === tag).slice(0, limit ?? 999);
  return (
    <>
      {!limit && (
        <div className="chips no-print" role="group" aria-label="Filter by theme" style={{ marginBottom: 16 }}>
          {tags.map((t) => <button key={t} className="chip" aria-pressed={tag === t} onClick={() => setTag(t)}>{t}{t !== "All" && <span className="muted"> · {items.filter((i) => i.tag === t).length}</span>}</button>)}
        </div>
      )}
      <div className="news-grid">
        {list.map((n) => (
          <article key={n.url} className="card news-card">
            <div className="news-top" style={{ borderTopColor: TAG_COLOR[n.tag] || "#3079B3" }}>
              <span className="news-tag" style={{ color: TAG_COLOR[n.tag] || "#3079B3" }}>{n.tag}</span>
              <time dateTime={n.date} className="xs muted">{fmt(n.date)}</time>
            </div>
            <div className="news-src"><b>{n.source}</b> <span className="muted">· {n.kind}</span></div>
            <h3 className="news-title"><a href={n.url} target="_blank" rel="noreferrer">{n.title}</a></h3>
            <p className="small">{n.take}</p>
            <p className="small news-why"><b>Why it matters for ATCO:</b> {n.why}</p>
            <a className="xs news-link" href={n.url} target="_blank" rel="noreferrer">Read at {n.source} ↗</a>
          </article>
        ))}
      </div>
    </>
  );
}
