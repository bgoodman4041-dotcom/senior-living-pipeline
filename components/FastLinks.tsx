"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Files and endpoints that must load as real requests (downloads, PDFs, data), never as in-app page changes.
const FILE = /\.(pdf|xlsx|xls|csv|json|png|jpe?g|svg|webp|gif|zip|txt|xml|ico)$/i;

function routeFor(a: HTMLAnchorElement): string | null {
  if ((a.target && a.target !== "_self") || a.hasAttribute("download") || a.dataset.hard !== undefined) return null;
  const raw = a.getAttribute("href");
  if (!raw || raw.startsWith("#") || /^(mailto|tel|sms|javascript):/i.test(raw)) return null;
  let u: URL;
  try { u = new URL(a.href, window.location.href); } catch { return null; }
  if (u.origin !== window.location.origin || FILE.test(u.pathname) || u.pathname.startsWith("/api/")) return null;
  return u.pathname + u.search + u.hash;
}

/** Plain <a> links between pages of this site navigate in place (no full reload) and are prefetched on hover or focus,
 *  so moving around the site is instant. Downloads, new-tab links and modified clicks behave as normal links. */
export default function FastLinks() {
  const router = useRouter();
  useEffect(() => {
    const done = new Set<string>();
    const anchorOf = (e: Event) => (e.target instanceof Element ? e.target.closest("a") : null);
    const warm = (e: Event) => {
      const a = anchorOf(e);
      const r = a && routeFor(a);
      if (!r) return;
      const path = r.split("#")[0];
      if (done.has(path) || path === window.location.pathname + window.location.search) return;
      done.add(path);
      router.prefetch(path);
    };
    const click = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = anchorOf(e);
      const r = a && routeFor(a);
      if (!r) return;
      const u = new URL(r, window.location.href);
      // a jump within the current page stays a native anchor scroll
      if (u.pathname === window.location.pathname && u.search === window.location.search && u.hash) return;
      e.preventDefault();
      router.push(r);
    };
    document.addEventListener("mouseover", warm, { passive: true });
    document.addEventListener("touchstart", warm, { passive: true });
    document.addEventListener("focusin", warm);
    document.addEventListener("click", click);
    return () => {
      document.removeEventListener("mouseover", warm);
      document.removeEventListener("touchstart", warm);
      document.removeEventListener("focusin", warm);
      document.removeEventListener("click", click);
    };
  }, [router]);
  return null;
}
