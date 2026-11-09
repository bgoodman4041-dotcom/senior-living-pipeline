"use client";
import { useEffect, useState } from "react";

/** Small "back to top" button that appears once the reader is well down a long page. */
export default function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let raf = 0;
    const check = () => { raf = 0; setShow(window.scrollY > window.innerHeight * 1.5); };
    const on = () => { if (!raf) raf = requestAnimationFrame(check); };
    check();
    window.addEventListener("scroll", on, { passive: true });
    return () => { window.removeEventListener("scroll", on); if (raf) cancelAnimationFrame(raf); };
  }, []);
  const top = () => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: still ? "auto" : "smooth" });
    document.getElementById("main")?.focus({ preventScroll: true });
  };
  return (
    <button type="button" className={`to-top no-print${show ? " show" : ""}`} onClick={top} aria-label="Back to top" title="Back to top">
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M8 3.5 2.5 9l1.4 1.4L7 7.3V13h2V7.3l3.1 3.1L13.5 9z" fill="currentColor" /></svg>
    </button>
  );
}
