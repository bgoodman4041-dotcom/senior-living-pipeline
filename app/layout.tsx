import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Metadata, Viewport } from "next";
import Header from "@/components/Header";
import { meta, shortlist } from "@/lib/data";
import { longDate } from "@/lib/format";

export const metadata: Metadata = {
  title: { default: "Senior Living Site Selection | ATCO", template: "%s | ATCO Senior Living" },
  description: "ATCO senior living site pipeline, inspired by the RiverSpring model: 44 underwritten sites across NY, NJ and CT, screened against a 6.5% yield-on-cost floor.",
  openGraph: { title: "Senior Living Site Selection | ATCO", description: `44 underwritten sites, ${shortlist.length} shortlisted, underwritten to a 6.5% yield on cost.`, type: "website" },
};
export const viewport: Viewport = { themeColor: "#ffffff", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&family=Roboto:wght@300;400;500;700&family=Roboto+Condensed:wght@700&display=swap"
        />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body>
        <div className="topbar">
          <div className="wrap">
            <span>ATCO Properties &amp; Management · A family of real estate companies · New York</span>
            <span className="hide-sm">Senior Living Platform · Data as of {longDate(meta.as_of)}</span>
          </div>
        </div>
        <Header />
        <main>{children}</main>
        <footer className="footer">
          <div className="wrap">
            <div>
              <img src="/brand/atco-logo.png" alt="ATCO, a family of real estate companies" className="footer-logo" width="94" height="46" />
              <div style={{ marginTop: 8, maxWidth: 520 }}>
                Senior living site selection in New York, New Jersey and Connecticut, inspired by the RiverSpring model. ATCO is not affiliated with RiverSpring Living.
                Underwriting figures are model outputs for screening, not appraisals or offers. Indices marked
                <span className="badge-i">I</span> are calibrated estimates to be replaced with NIC MAP and assessor data before LOI. Not an offer or investment advice; see the <a href="/method#disclaimer" style={{ color: "inherit", textDecoration: "underline" }}>important notice</a>.
              </div>
            </div>
            <div className="links" style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "flex-start" }}>
              <a href="/">Pipeline</a><a href="/#shortlist">Shortlist</a><a href="/markets">Markets</a>
              <a href="/operators">Operators</a><a href="/news">News</a><a href="/anchor">Anchor deal</a><a href="/diligence">LP diligence</a><a href="/data-room">Data room</a><a href="/model">The Model</a><a href="/method">Methodology</a><a href="/method#assumptions">Assumptions</a>
            </div>
            <div className="xs" style={{ width: "100%", borderTop: "1px solid rgba(255,255,255,.14)", paddingTop: 14 }}>
              © {new Date().getFullYear()} ATCO Properties &amp; Management, LLC. Confidential deal flow. Basemaps and imagery © Esri, HERE, Garmin, Maxar, Earthstar Geographics and the GIS user community; © OpenStreetMap contributors. Parcels: NJGIN, NYS ITS GIS, CT OPM.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
