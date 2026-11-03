"use client";
import { useEffect, useState, type RefObject } from "react";

/** true once the element is within `margin` of the viewport; maps initialise only then, keeping first paint light. */
export function useNear(ref: RefObject<HTMLElement | null>, margin = "400px") {
  const [near, setNear] = useState(false);
  useEffect(() => {
    if (near || !ref.current) return;
    if (typeof IntersectionObserver === "undefined") { setNear(true); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setNear(true); io.disconnect(); } }, { rootMargin: margin });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [ref, margin, near]);
  return near;
}
