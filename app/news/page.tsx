import type { Metadata } from "next";
import NewsFeed from "@/components/NewsFeed";
import news from "@/data/news.json";
import { longDate } from "@/lib/format";

export const metadata: Metadata = { title: "Market news", description: "Dated, sourced news on the senior housing supply gap, capital flows and costs, from NIC, CBRE, JLL, Senior Housing News, Bloomberg and others." };

export default function News() {
  const sources = Array.from(new Set(news.items.map((i) => i.source))).sort();
  return (
    <>
      <section className="hero"><div className="wrap">
        <div className="eyebrow">Market news</div>
        <h1>The push into senior housing, as it is being reported</h1>
        <p className="lede">Occupancy is at a cycle high, new supply has stalled, and capital is coming back. Every item below is dated, credited to its source and linked to the original, with a line on what it means for an ATCO site.</p>
        <div className="hero-meta">Updated {longDate(news.updated)} · {news.items.length} articles · {sources.length} sources</div>
      </div></section>

      <section className="section"><div className="wrap">
        <div className="section-head"><div><h2 className="rule-title">Market pulse</h2><p>The six numbers that frame the cycle, each with its source and period.</p></div></div>
        <div className="pulse-grid">
          {news.pulse.map((p) => (
            <div key={p.k} className="card kpi">
              <div className="label">{p.k}</div>
              <div className="v tnum">{p.v}</div>
              <div className="s">{p.d}</div>
              <div className="xs muted" style={{ marginTop: 8 }}>Source: {p.src}</div>
            </div>
          ))}
        </div>
      </div></section>

      <section className="section" style={{ paddingTop: 0 }}><div className="wrap">
        <div className="section-head"><div><h2 className="rule-title">Coverage</h2><p>Brokerage and data houses (NIC MAP, CBRE, JLL, Greystone, PwC/ULI), trade press (Senior Housing News, Bisnow, Commercial Observer) and the business press (Bloomberg). Filter by theme.</p></div></div>
        <NewsFeed items={news.items} />
        <p className="xs muted" style={{ marginTop: 16 }}>Sources: {sources.join(", ")}. Headlines and figures are as published by each outlet; summaries are ATCO&apos;s. Some outlets require a subscription.</p>
      </div></section>
    </>
  );
}
