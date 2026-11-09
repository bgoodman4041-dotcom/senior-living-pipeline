/** Placeholder over a map while it loads, or a still image when the browser can't draw WebGL maps. */
export default function MapState({ state, still, alt }: { state: "loading" | "ready" | "failed"; still?: string; alt: string }) {
  if (state === "ready") return null;
  if (state === "loading") return <div className="map-loading" aria-hidden="true"><span>Loading map…</span></div>;
  return (
    <div className="map-fallback">
      {still && <img src={still} alt={alt} loading="lazy" decoding="async" />}
      <div className="map-fallback-note small">
        This browser can't draw the interactive map (WebGL is off or unavailable){still ? ", so a still image is shown" : ""}. Everything else on the page works as normal.
      </div>
    </div>
  );
}
