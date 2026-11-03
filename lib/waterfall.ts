// LP / GP distribution waterfall on a site's levered cash flows (capitalPlan().levCF).
// Illustrative terms until Ben sets them: LP 90% / GP 10% of equity, pari passu; 8% compounding preferred return;
// then 80% LP / 20% GP. One sale at stabilization, so a single distribution event.
import { irr, annualize } from "./capital.ts";

export const WF = { lpShare: 0.9, pref: 0.08, lpSplit: 0.8 };

export function waterfall(levCF: number[], terms = WF) {
  const N = levCF.length - 1;
  const draws = levCF.map((v) => Math.max(0, -v));
  const dist = Math.max(0, levCF[N]); // net sale proceeds to equity after the loan payoff
  const mr = Math.pow(1 + terms.pref, 1 / 12) - 1;
  // capital plus pref accrued to the sale month, all equity
  const hurdle = draws.reduce((acc, d, i) => acc + d * Math.pow(1 + mr, N - i), 0);
  const toHurdle = Math.min(dist, hurdle);
  const resid = Math.max(0, dist - hurdle);
  const lpDist = toHurdle * terms.lpShare + resid * terms.lpSplit;
  const gpDist = dist - lpDist;
  const lpCF = draws.map((d) => -d * terms.lpShare); lpCF[N] += lpDist;
  const gpCF = draws.map((d) => -d * (1 - terms.lpShare)); gpCF[N] += gpDist;
  const lpIn = draws.reduce((a, b) => a + b, 0) * terms.lpShare, gpIn = draws.reduce((a, b) => a + b, 0) * (1 - terms.lpShare);
  return {
    lpIrr: annualize(irr(lpCF)), gpIrr: annualize(irr(gpCF)),
    lpMultiple: lpIn ? lpDist / lpIn : NaN, gpMultiple: gpIn ? gpDist / gpIn : NaN,
    lpIn, gpIn, lpDist, gpDist, promote: resid * (terms.lpSplit < 1 ? (1 - terms.lpSplit) - (1 - terms.lpShare) : 0),
  };
}
