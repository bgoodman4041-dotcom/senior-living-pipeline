import type { Metadata } from "next";
import { shortlist } from "@/lib/data";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <section className="section">
      <div className="wrap nf">
        <div className="eyebrow">404 · Page not found</div>
        <h1>This page isn't here</h1>
        <p className="muted" style={{ maxWidth: 640 }}>
          The link may be out of date, or the site may have been renamed or retired from the pipeline. Everything current is reachable from the pipeline overview.
        </p>
        <div className="links-row">
          <a className="btn btn-primary" href="/">Pipeline overview</a>
          <a className="btn" href="/#shortlist">Shortlist</a>
          <a className="btn" href="/anchor">Anchor deal</a>
          <a className="btn" href="/data-room">Data room</a>
        </div>
        <div className="small muted" style={{ marginTop: 22 }}>
          Shortlisted sites: {shortlist.map((s, i) => (
            <span key={s.id}>{i ? " · " : ""}<a href={`/sites/${s.id}`}>{s.name}</a></span>
          ))}
        </div>
      </div>
    </section>
  );
}
