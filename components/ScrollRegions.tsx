"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const SEL = ".table-wrap, .memo-scroll";
const FOCUSABLE = "a[href], button, input, select, textarea, [tabindex]";

/** The table's caption, else the nearest heading above it. */
function nameFor(el: HTMLElement): string {
  const cap = el.querySelector("caption")?.textContent?.trim();
  if (cap) return cap;
  let head: string | undefined;
  for (const h of document.querySelectorAll<HTMLElement>("main h1, main h2, main h3, main h4")) {
    if (!(h.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)) break;
    head = h.textContent?.trim() || head;
  }
  return head || "Table";
}

/** Wide tables scroll sideways on phones. When one actually overflows and has nothing focusable inside, make the
 *  scroll box itself focusable, and name it after its table (numbered when two share a heading), so keyboard users
 *  can scroll it too. */
export default function ScrollRegions() {
  const path = usePathname();
  useEffect(() => {
    const mark = () => {
      const used = new Map<string, number>();
      document.querySelectorAll<HTMLElement>(SEL).forEach((el) => {
        const scrolls = el.scrollWidth > el.clientWidth + 1;
        const managed = el.dataset.scrollRegion === "1";
        if (scrolls && (managed || (!el.hasAttribute("tabindex") && !el.querySelector(FOCUSABLE)))) {
          const name = nameFor(el);
          const n = (used.get(name) || 0) + 1;
          used.set(name, n);
          el.tabIndex = 0;
          el.setAttribute("role", "region");
          el.setAttribute("aria-label", `${n > 1 ? `${name}, table ${n}` : name} (scrolls sideways)`);
          el.dataset.scrollRegion = "1";
        } else if (!scrolls && managed) {
          el.removeAttribute("tabindex"); el.removeAttribute("role"); el.removeAttribute("aria-label");
          delete el.dataset.scrollRegion;
        }
      });
    };
    mark();
    const t = window.setTimeout(mark, 600); // after late layout (fonts, client tables)
    let raf = 0;
    const onResize = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; mark(); }); };
    window.addEventListener("resize", onResize);
    return () => { window.clearTimeout(t); window.removeEventListener("resize", onResize); if (raf) cancelAnimationFrame(raf); };
  }, [path]);
  return null;
}
