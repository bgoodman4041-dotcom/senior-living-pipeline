import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";

export const readDoc = (rel: string) =>
  readFileSync(path.join(process.cwd(), rel), "utf8").replace(/\bBen's\b/g, "ATCO's").replace(/\bBen\b/g, "ATCO");

/** Section of a markdown file between a heading that starts with `start` and the next heading of the same or higher level. */
export function section(md: string, start: string): string {
  const lines = md.split("\n");
  const i = lines.findIndex((l) => /^#+\s/.test(l) && l.replace(/^#+\s*/, "").startsWith(start));
  if (i < 0) return "";
  const level = (lines[i].match(/^#+/) || ["#"])[0].length;
  let j = i + 1;
  while (j < lines.length && !(/^#+\s/.test(lines[j]) && (lines[j].match(/^#+/) || [""])[0].length <= level)) j++;
  return lines.slice(i + 1, j).join("\n").trim();
}

/** A readable label for a bare URL: host and path, shortened. */
function shortUrl(url: string) {
  try {
    const u = new URL(url);
    const s = u.host.replace(/^www\./, "") + (u.pathname.length > 1 ? decodeURI(u.pathname).replace(/\/$/, "") : "");
    return s.length > 56 ? s.slice(0, 54) + "…" : s;
  } catch { return url; }
}
const external = (href: string) => /^https?:\/\//.test(href);

/** Inline markdown: **bold**, [text](url), bare URLs, `code`, [V]/[I] tags. */
export function Inline({ text }: { text: string }) {
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|`[^`]+`|\[(?:V|I|V-2|V\/I)\]|https?:\/\/[^\s<>()\]]+)/g;
  let last = 0, m: RegExpExecArray | null, k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("**")) out.push(<b key={k++}><Inline text={t.slice(2, -2)} /></b>);
    else if (t.startsWith("`")) out.push(<code key={k++}>{t.slice(1, -1)}</code>);
    else if (/^\[(V|V-2)\]$/.test(t)) out.push(<span key={k++} className="tag" title="Verified">V</span>);
    else if (/^\[(I|V\/I)\]$/.test(t)) out.push(<span key={k++} className="badge-i" title="Inferred / calibrated">I</span>);
    else if (external(t)) {
      // bare URL: keep trailing punctuation out of the link
      const tail = (t.match(/[.,;:!?'"]+$/) || [""])[0];
      const url = tail ? t.slice(0, -tail.length) : t;
      out.push(<a key={k++} href={url} target="_blank" rel="noreferrer" title={url}>{shortUrl(url)}</a>);
      if (tail) out.push(tail);
    } else {
      const mm = t.match(/^\[([^\]]+)\]\(([^)]+)\)$/)!;
      out.push(external(mm[2]) ? <a key={k++} href={mm[2]} target="_blank" rel="noreferrer">{mm[1]}</a> : <a key={k++} href={mm[2]}>{mm[1]}</a>);
    }
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}

export function parseTable(md: string): string[][] {
  return md.split("\n").filter((l) => /^\|/.test(l.trim()) && !/^\|\s*-/.test(l.trim()))
    .map((l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
}

export function numbered(md: string): string[] {
  const items: string[] = [];
  for (const l of md.split("\n")) {
    if (/^\d+\.\s/.test(l)) items.push(l.replace(/^\d+\.\s/, ""));
    else if (items.length && l.trim() && !/^[#>|-]/.test(l.trim())) items[items.length - 1] += " " + l.trim();
  }
  return items;
}
export function bullets(md: string): string[] {
  return md.split("\n").filter((l) => /^\s*-\s/.test(l)).map((l) => l.replace(/^\s*-\s/, ""));
}
