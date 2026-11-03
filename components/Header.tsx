"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/", label: "Pipeline" },
  { href: "/anchor", label: "Anchor deal" },
  { href: "/markets", label: "Markets" },
  { href: "/operators", label: "Operators" },
  { href: "/news", label: "News" },
  { href: "/investors", label: "Investor FAQ" },
  { href: "/diligence", label: "Diligence" },
  { href: "/data-room", label: "Data room" },
  { href: "/model", label: "The Model" },
  { href: "/method", label: "Methodology" },
];

export default function Header() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (h: string) => (h === "/" ? path === "/" || path.startsWith("/sites") : h.startsWith("/#") ? false : path.startsWith(h));
  return (
    <header className="header">
      <div className="wrap">
        <Link href="/" className="brand" aria-label="ATCO Senior Living home">
          <img src="/brand/atco-logo.png" alt="ATCO" className="brand-logo" width="102" height="50" />
          <span className="brand-sub">Senior Living<br />Site Selection</span>
        </Link>
        <button className="menu-btn" aria-expanded={open} aria-controls="nav" onClick={() => setOpen(!open)}>Menu</button>
        <nav id="nav" className={`nav${open ? " open" : ""}`} onClick={() => setOpen(false)}>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={isActive(n.href) ? "active" : ""}>{n.label}</Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
