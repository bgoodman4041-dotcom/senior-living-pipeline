import { structuring, structVerdict, recLabel, STRUCT } from "@/lib/structuring";
import { onHold } from "@/lib/data";
import { pct, usdM } from "@/lib/format";

/** Which deal structure keeps the combined downside at or above breakeven. */
export default function Structuring({ site, markets, a }: { site: any; markets: any[]; a: any }) {
  const r = structuring(site, markets, a);
  if (!r) return null;
  const hold = onHold(site);
  const tone = hold || r.nothing ? "bad" : r.rec.key === "fee" ? "warn" : "go";
  return (
    <div className="card structuring">
      <div className="card-pad" style={{ paddingBottom: 6 }}>
        <div className="label">Structuring the downside · base and combined downside, with and without each fix</div>
        <div className={`memo-rec ic-${tone}`} style={{ marginTop: 10, marginBottom: 0 }}><b>{recLabel(r, hold)}.</b> {structVerdict(r, site, hold)}</div>
      </div>
      <div className="table-wrap"><table className="t">
        <thead><tr><th>Structure</th><th className="num">Base YOC</th><th className="num">Base lev. IRR</th><th className="num">Base profit</th><th className="num">Downside YOC</th><th className="num">Downside lev. IRR</th><th className="num">Downside profit</th><th className="num">Equity</th><th>Breakeven?</th></tr></thead>
        <tbody>{r.opts.map((o) => (
          <tr key={o.key} className={o.key === r.rec.key ? "row-base" : undefined}>
            <td style={{ minWidth: 220 }}><b>{o.label}</b><div className="xs muted">{o.what}</div>{o.note && <div className="xs" style={{ marginTop: 2 }}>{o.note}</div>}</td>
            <td className="num">{pct(o.base.yoc)}</td><td className="num">{pct(o.base.irrL, 1)}</td><td className="num">{usdM(o.base.profit, 1)}</td>
            <td className="num">{pct(o.down.yoc)}</td><td className="num">{pct(o.down.irrL, 1)}</td>
            <td className="num" style={{ fontWeight: 700, color: o.down.profit < 0 ? "#8a1a2a" : "#33772a" }}>{usdM(o.down.profit, 1)}</td>
            <td className="num">{usdM(o.base.equity, 1)}{o.key === "fee" && <div className="xs muted">sponsor&apos;s</div>}</td>
            <td>{o.ok ? (o.available ? "Yes" : "Yes, if available") : "No"}</td>
          </tr>))}</tbody>
      </table></div>
      <div className="xs muted card-pad" style={{ paddingTop: 8 }}>
        Combined downside: rents −10%, hard costs +10%, exit cap +50 bps, lease-up +6 months. A GMP signed at financial close leaves the owner about {Math.round(STRUCT.gmpOwnerShare * 100)}% of a hard-cost overrun. Ground rent is {Math.round(STRUCT.groundRentYield * 100)}% of land value. The master lease pays {Math.round(STRUCT.leaseRentShare * 100)}% of base NOI and is sold {Math.round(STRUCT.leaseCapPremium * 10000)} bps wider.
        {" "}<b>Lower leverage</b> does not change project profit; at {pct(STRUCT.lowLtc, 0)} LTC the recommended structure&apos;s downside levered IRR is {pct(r.rec.down.irrL50, 1)} vs. {pct(r.rec.down.irrL, 1)} at {pct(a.debt.ltc, 0)}.
        {" "}<b>Rate cap:</b> construction interest is underwritten at a fixed {pct(a.debt.rate, 2)}; buy a SOFR cap at close so a rate spike cannot add to this downside.
        {" "}<b>Phasing</b> does not apply: a {site.uw.units}-unit pad is one building.
      </div>
    </div>
  );
}
