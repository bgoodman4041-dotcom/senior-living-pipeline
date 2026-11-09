"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const SEL = ".table-wrap, .memo-scroll";

/** Wide tables scroll sideways on phones. When one actually overflows and has nothing focusable inside, make the
 *  scroll box itself focusable (and name it after its table) so keyboard users can scroll it too. */
export default function ScrollRegions() {
  const path = usePathname();
  useEffect(() => {
    const mark = () => {
      document.querySelectorAll<HTMLElement>(SEL).forEach((el) => {
        const scrolls = el.scrollWidth > el.clientWidth + 1;
        const managed = el.dataset.scrollRegion === "1";
        if (scrolls && !el.hasAttribute("tabindex") && !el.querySelector("a[href], button, input, select, textarea, [tabindex]")) {
          const cap = el.querySelector("caption")?.textContent?.trim();
          const head = el.closest("section, .card")?.querySelector("h2, h3, .label")?.textContent?.trim();
          el.tabIndex = 0;
          el.setAttribute("role", "region");
          el.setAttribute("aria-label", `${cap || head || "Table"} (scrolls sideways)`);
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
