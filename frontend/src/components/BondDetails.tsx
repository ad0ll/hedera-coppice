import { useTokenRead } from "../hooks/useToken";
import { BOND_DETAILS } from "../lib/constants";
import { formatEther } from "viem";

export function BondDetails() {
  const { totalSupply, paused } = useTokenRead();

  const supply = totalSupply.data != null
    ? Number(formatEther(totalSupply.data)).toLocaleString("en-US")
    : "--";
  const isPaused = paused.data ?? null;

  return (
    <div className="bg-surface-2 border border-border rounded-xl overflow-hidden card-glow">
      <div className="bg-gradient-to-r from-bond-green/8 to-transparent px-6 py-4 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-bond-green/15 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-bond-green" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">{BOND_DETAILS.name}</h1>
            <p className="text-xs text-text-muted">{BOND_DETAILS.issuer}</p>
          </div>
        </div>
        {isPaused !== null && (
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isPaused ? "bg-bond-red/15 text-bond-red" : "bg-bond-green/15 text-bond-green"}`}>
            {isPaused ? "Paused" : "Active"}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 px-6 py-5">
        <div>
          <p className="text-[11px] text-text-muted uppercase tracking-widest mb-1">Symbol</p>
          <p className="text-lg font-mono font-semibold text-white">{BOND_DETAILS.symbol}</p>
        </div>
        <div>
          <p className="text-[11px] text-text-muted uppercase tracking-widest mb-1">Coupon Rate</p>
          <p className="text-lg font-mono font-semibold text-bond-green">{BOND_DETAILS.couponRate}</p>
        </div>
        <div>
          <p className="text-[11px] text-text-muted uppercase tracking-widest mb-1">Maturity</p>
          <p className="text-lg font-mono font-semibold text-white">{BOND_DETAILS.maturity}</p>
        </div>
        <div>
          <p className="text-[11px] text-text-muted uppercase tracking-widest mb-1">Total Supply</p>
          <p className="text-lg font-mono font-semibold text-white">{supply} <span className="text-xs text-text-muted font-normal">CPC</span></p>
        </div>
      </div>
    </div>
  );
}
