"use client";
export default function PrintButton({ label = "Print / save PDF" }: { label?: string }) {
  return <button className="btn no-print" style={{ background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,.35)" }} onClick={() => window.print()}>{label}</button>;
}
