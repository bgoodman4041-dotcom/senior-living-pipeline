"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const NAV = [
  { href: "/", label: "Pipeline" },
  { href: "/anchor", label: "Anchor deal" },
  { href: "/markets", label: "Markets" },
  { href: "/operators", label: "Operators" },
  { href: "/news", label: "News" },
  { href: "/diligence", label: "Diligence" },
  { href: "/data-room", label: "Data room" },
  { href: "/model", label: "The Model" },
  { href: "/method", label: "Methodology" },
];

export default function Header() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const hdr = useRef<HTMLElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const isActive = (h: string) => (h === "/" ? path === "/" || path.startsWith("/sites") : path.startsWith(h));

  // the phone menu closes on navigation, on Escape and on a tap outside it
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btn.current?.focus(); } };
    const away = (e: PointerEvent) => { if (!hdr.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", away);
    return () => { document.removeEventListener("keydown", key); document.removeEventListener("pointerdown", away); };
  }, [open]);

  return (
    <header className="header" ref={hdr}>
      <div className="wrap">
        <Link href="/" className="brand" aria-label="ATCO Senior Living home">
          <img src="/brand/atco-logo.png" alt="ATCO" className="brand-logo" width="102" height="50" />
          <span className="brand-sub">Senior Living<br />Site Selection</span>
        </Link>
        <button ref={btn} type="button" className="menu-btn" aria-expanded={open} aria-controls="nav" onClick={() => setOpen(!open)}>
          <span className={`menu-ico${open ? " x" : ""}`} aria-hidden="true"><i /><i /><i /></span>{open ? "Close" : "Menu"}
        </button>
        <nav id="nav" aria-label="Main" className={`nav${open ? " open" : ""}`} onClick={() => setOpen(false)}>
          {NAV.map((n) => {
            const on = isActive(n.href);
            return <Link key={n.href} href={n.href} className={on ? "active" : ""} aria-current={on ? "page" : undefined}>{n.label}</Link>;
          })}
        </nav>
      </div>
    </header>
  );
}
