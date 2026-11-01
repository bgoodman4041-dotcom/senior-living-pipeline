export const pct = (x: number | null | undefined, dp = 2) =>
  x === null || x === undefined || !Number.isFinite(x) ? "—" : `${(x * 100).toFixed(dp)}%`;
export const bps = (x: number) => `${x >= 0 ? "+" : "−"}${Math.abs(Math.round(x * 10000))} bps`;
export const usdM = (x: number | null | undefined, dp = 1) =>
  x === null || x === undefined || !Number.isFinite(x) ? "—" : `${x < 0 ? "−" : ""}$${(Math.abs(x) / 1e6).toFixed(dp)}M`;
export const usdK = (x: number | null | undefined) =>
  x === null || x === undefined || !Number.isFinite(x) ? "—" : `${x < 0 ? "−" : ""}$${Math.round(Math.abs(x) / 1000).toLocaleString("en-US")}k`;
export const usd = (x: number | null | undefined) =>
  x === null || x === undefined || !Number.isFinite(x) ? "—" : `${x < 0 ? "−" : ""}$${Math.round(Math.abs(x)).toLocaleString("en-US")}`;
export const int = (x: number | string | null | undefined) => {
  const n = Number(x);
  return x === null || x === undefined || x === "" || !Number.isFinite(n) ? "—" : Math.round(n).toLocaleString("en-US");
};
export const mult = (x: number | null | undefined) => (x === null || x === undefined ? "—" : `${x.toFixed(2)}x`);
export const miles = (m: number) => (m < 0.1 ? "<0.1 mi" : `${m.toFixed(1)} mi`);
