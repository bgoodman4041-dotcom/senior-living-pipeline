"use client";
export default function PrintButton({ label = "Print / save PDF" }: { label?: string }) {
  return <button className="btn no-print" onClick={() => window.print()}>{label}</button>;
}
