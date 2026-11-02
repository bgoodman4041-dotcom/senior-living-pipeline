"use client";
import { useMemo, useState } from "react";
import type { Contact } from "@/lib/playbook";

const ORDER = ["Counterparty", "Municipal staff", "Elected", "Boards", "Counsel and consultants", "State and county", "Opposition"];

export default function ContactBook({ contacts, site }: { contacts: Contact[]; site: string }) {
  const groups = useMemo(() => ORDER.filter((g) => contacts.some((c) => c.group === g)), [contacts]);
  const [g, setG] = useState<string>("All");
  const [copied, setCopied] = useState<string | null>(null);
  const list = contacts.filter((c) => g === "All" || c.group === g);
  const copy = async (c: Contact) => {
    const txt = [c.name, c.role, c.phone, c.email].filter(Boolean).join(" · ");
    try { await navigator.clipboard.writeText(txt); setCopied(c.name); setTimeout(() => setCopied(null), 1500); } catch { /* clipboard blocked */ }
  };
  return (
    <div>
      <div className="chips" role="group" aria-label="Filter contacts" style={{ marginBottom: 12 }}>
        {["All", ...groups].map((x) => (
          <button key={x} className="chip" aria-pressed={g === x} onClick={() => setG(x)}>{x}{x !== "All" ? ` · ${contacts.filter((c) => c.group === x).length}` : ""}</button>
        ))}
      </div>
      <div className="contact-grid">
        {list.map((c) => (
          <div key={c.group + c.name} className={`contact${c.group === "Opposition" ? " opp" : ""}`}>
            <div className="xs muted cg">{c.group}</div>
            <div className="cn">{c.name}</div>
            <div className="small muted">{c.role}</div>
            <div className="cl">
              {c.phone && <a href={`tel:${c.phone.replace(/[^0-9+]/g, "")}`}>{c.phone}</a>}
              {c.email && <a href={`mailto:${c.email}?subject=${encodeURIComponent(`ATCO: senior living proposal, ${site}`)}`}>{c.email}</a>}
              {c.src && <a href={c.src} target="_blank" rel="noopener noreferrer" className="xs">Source ↗</a>}
              <button className="linkish xs no-print" onClick={() => copy(c)}>{copied === c.name ? "Copied" : "Copy"}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
