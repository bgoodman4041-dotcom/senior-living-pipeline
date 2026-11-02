import { siteById, sites } from "@/lib/data";
import { overpassPois } from "@/lib/live";
import { mapboxPois } from "@/lib/mapbox";

// Nearby places for one site, fetched server side from OpenStreetMap and cached at Vercel's CDN,
// so visitors never hit the rate-limited public Overpass servers directly. Uses Mapbox when MAPBOX_TOKEN is set.
export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const s = siteById(id);
  if (!s) return Response.json({ error: "unknown site", known: sites.length }, { status: 404 });
  try {
    const lat = Number(s.lat), lon = Number(s.lon);
    // Keyed provider first when a token is configured in Vercel; OpenStreetMap otherwise or as fallback.
    const token = (process.env.MAPBOX_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "").trim();
    let res;
    if (token) { try { res = await mapboxPois(lat, lon, token); if (!res.pois.length) res = undefined; } catch { res = undefined; } }
    if (!res) res = await overpassPois(lat, lon, 40000);
    return Response.json(res, { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" } });
  } catch (e: any) {
    return Response.json({ error: String(e?.message || e) }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
