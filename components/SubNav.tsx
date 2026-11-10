"use client";
import { useEffect, useRef, useState } from "react";

/** Sticky in-page section bar: highlights the section being read, keeps that link in view on phones,
 *  and fades whichever edge has more links scrolled out of sight. */
export default function SubNav({ items }: { items: [string, string][] }) {
  const bar = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<string | null>(null);
  const [edges, setEdges] = useState({ l: false, r: false });

  const measureEdges = () => {
    const b = bar.current;
    if (!b) return;
    const l = b.scrollLeft > 4, r = b.scrollLeft + b.clientWidth < b.scrollWidth - 4;
    setEdges((e) => (e.l === l && e.r === r ? e : { l, r }));
  };

  useEffect(() => {
    const els = items.map(([h]) => document.getElementById(h)).filter((e): e is HTMLElement => !!e);
    let raf = 0;
    const spy = () => {
      raf = 0;
      // the section whose heading has passed just under the sticky header and this bar
      const line = 160;
      let cur: string | null = null, best = -Infinity;
      for (const e of els) {
        const t = e.getBoundingClientRect().top - line;
        if (t <= 0 && t > best) { best = t; cur = e.id; }
      }
      // at the very bottom of the page the last short sections can't reach the line
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4 && els.length) cur = els[els.length - 1].id;
      setActive(cur);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(spy); };
    spy();
    measureEdges();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measureEdges);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", measureEdges); if (raf) cancelAnimationFrame(raf); };
  }, [items]);

  useEffect(() => {
    const b = bar.current;
    const a = active ? b?.querySelector<HTMLAnchorElement>(`a[href="#${CSS.escape(active)}"]`) : null;
    if (!b || !a) return;
    const left = a.offsetLeft, right = left + a.offsetWidth; // .subnav .wrap is position: relative, so this is scroll-independent
    if (left < b.scrollLeft + 24 || right > b.scrollLeft + b.clientWidth - 24) b.scrollTo({ left: Math.max(0, left - b.clientWidth / 3), behavior: "smooth" });
  }, [active]);

  return (
    <nav className="subnav no-print" aria-label="Sections">
      <div ref={bar} className={`wrap${edges.l ? " fade-l" : ""}${edges.r ? " fade-r" : ""}`} onScroll={measureEdges}>
        {items.map(([h, l]) => (
          <a key={h} href={`#${h}`} className={active === h ? "on" : undefined} aria-current={active === h ? "location" : undefined}>{l}</a>
        ))}
      </div>
    </nav>
  );
}
