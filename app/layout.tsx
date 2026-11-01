import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Metadata, Viewport } from "next";
import Header from "@/components/Header";
import { meta } from "@/lib/data";

export const metadata: Metadata = {
  title: { default: "Senior Living Site Selection | ATCO", template: "%s | ATCO Senior Living" },
  description: "ATCO's RiverSpring-model senior living site pipeline: 44 underwritten sites across NY, NJ and CT, screened against a 6.5% yield-on-cost floor.",
  openGraph: { title: "Senior Living Site Selection | ATCO", description: "44 underwritten sites, 7 shortlisted, underwritten to a 6.5% yield on cost.", type: "website" },
};
export const viewport: Viewport = { themeColor: "#13243d", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,500;8..60,600;8..60,700&display=swap"
        />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body>
        <div className="topbar">
          <div className="wrap">
            <span>ATCO Properties &amp; Management · A family of real estate companies</span>
            <span className="hide-sm">Senior Living Platform · Data as of {meta.as_of}</span>
          </div>
        </div>
        <Header />
        <main>{children}</main>
        <footer className="footer">
          <div className="wrap">
            <div>
              <div className="wordmark">ATCO</div>
              <div style={{ marginTop: 8, maxWidth: 520 }}>
                Senior living site selection for RiverSpring-model communities in New York, New Jersey and Connecticut.
                Underwriting figures are model outputs for screening, not appraisals or offers. Indices marked
                <span className="badge-i">I</span> are calibrated estimates to be replaced with NIC MAP and assessor data before LOI.
              </div>
            </div>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "flex-start" }}>
              <a href="/">Pipeline</a><a href="/#shortlist">Shortlist</a><a href="/markets">Markets</a>
              <a href="/model">The Model</a><a href="/method">Methodology</a>
            </div>
            <div className="xs" style={{ width: "100%", borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: 14 }}>
              © {new Date().getFullYear()} ATCO Properties &amp; Management, LLC. Confidential deal flow. Basemaps © OpenStreetMap contributors, © CARTO; imagery © Esri, Maxar, Earthstar Geographics. Parcels: NJGIN, NYS ITS GIS, CT OPM.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
