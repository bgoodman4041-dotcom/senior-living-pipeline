import "./globals.css";
// map styles stay global: split per page, Next prefetches them on pages without a map and Chrome warns about the unused preload
import "maplibre-gl/dist/maplibre-gl.css";
import type { Metadata, Viewport } from "next";
import { Open_Sans, Roboto } from "next/font/google";
import Header from "@/components/Header";
import BackToTop from "@/components/BackToTop";
import FastLinks from "@/components/FastLinks";
import ScrollRegions from "@/components/ScrollRegions";
import { meta, sites } from "@/lib/data";
import { longDate } from "@/lib/format";

// Brand type, self-hosted at build time (no third-party font request, no layout shift while fonts load)
const openSans = Open_Sans({ subsets: ["latin"], display: "swap", variable: "--font-open-sans" });
const roboto = Roboto({ subsets: ["latin"], display: "swap", variable: "--font-roboto" });

const SITE_URL = "https://senior-living-pipeline-1cia.vercel.app";
const DESCRIPTION = `ATCO senior living site pipeline, inspired by the RiverSpring model (ATCO is not affiliated with RiverSpring Living): ${sites.length} underwritten sites across NY, NJ and CT, screened against a 6.5% yield-on-cost floor.`;
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Senior Living Site Selection | ATCO", template: "%s | ATCO Senior Living" },
  description: DESCRIPTION,
  applicationName: "ATCO Senior Living",
  icons: { icon: [{ url: "/favicon.svg", type: "image/svg+xml" }, { url: "/favicon.ico", sizes: "48x48" }], apple: "/apple-touch-icon.png" },
  // no og:title or og:description here, so link previews use each page's own title and description
  openGraph: {
    siteName: "ATCO Senior Living", type: "website", locale: "en_US",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "ATCO senior living site selection: New York, New Jersey, Connecticut" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
  formatDetection: { telephone: false, address: false, email: false },
};
export const viewport: Viewport = { themeColor: "#ffffff", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${openSans.variable} ${roboto.variable}`} data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://images.squarespace-cdn.com" />
        <link rel="preconnect" href="https://server.arcgisonline.com" crossOrigin="" />
      </head>
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <div className="topbar" role="region" aria-label="Platform">
          <div className="wrap">
            <span>ATCO Properties &amp; Management · A family of real estate companies · New York</span>
            <span className="hide-sm">Senior Living Platform · Data as of {longDate(meta.as_of)}</span>
          </div>
        </div>
        <Header />
        <main id="main" tabIndex={-1}>{children}</main>
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
            <nav className="links" aria-label="Footer" style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "flex-start" }}>
              <a href="/">Pipeline</a><a href="/#shortlist">Shortlist</a><a href="/markets">Markets</a>
              <a href="/operators">Operators</a><a href="/news">News</a><a href="/anchor">Anchor deal</a><a href="/diligence">LP diligence</a><a href="/data-room">Data room</a><a href="/model">The Model</a><a href="/method">Methodology</a><a href="/method#assumptions">Assumptions</a>
            </nav>
            <div className="xs" style={{ width: "100%", borderTop: "1px solid rgba(255,255,255,.14)", paddingTop: 14 }}>
              © {new Date().getFullYear()} ATCO Properties &amp; Management, LLC. Confidential deal flow. Basemaps and imagery © Esri, HERE, Garmin, Maxar, Earthstar Geographics and the GIS user community; © OpenStreetMap contributors. Parcels: NJGIN, NYS ITS GIS, CT OPM.
            </div>
          </div>
        </footer>
        <BackToTop />
        <FastLinks />
        <ScrollRegions />
      </body>
    </html>
  );
}
