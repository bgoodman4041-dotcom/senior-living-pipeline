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
  const download = () => {
    const q = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [["Site", "Group", "Name", "Role", "Phone", "Email", "Source"], ...contacts.map((c) => [site, c.group, c.name, c.role, c.phone, c.email, c.src])];
    const blob = new Blob(["\ufeff" + rows.map((r) => r.map(q).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }); // BOM so Excel reads UTF-8
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `ATCO-contacts-${site.replace(/[^A-Za-z0-9]+/g, "-").slice(0, 40)}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
      <div className="chips" role="group" aria-label="Filter contacts" style={{ marginBottom: 12 }}>
        {["All", ...groups].map((x) => (
          <button key={x} className="chip" aria-pressed={g === x} onClick={() => setG(x)}>{x}{x !== "All" ? ` · ${contacts.filter((c) => c.group === x).length}` : ""}</button>
        ))}
      </div>
      <button className="btn btn-sm no-print" onClick={download}>Download contacts (CSV)</button>
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
