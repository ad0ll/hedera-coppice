import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useToken } from "../hooks/useToken";
import { BOND_DETAILS } from "../lib/constants";

export function BondDetails() {
  const { totalSupply, paused } = useToken();
  const [supply, setSupply] = useState<string>("--");
  const [isPaused, setIsPaused] = useState<boolean | null>(null);

  useEffect(() => {
    totalSupply().then((s) => setSupply(Number(ethers.formatEther(s)).toLocaleString()));
    paused().then(setIsPaused);
  }, []);

  return (
    <div className="bg-surface-2 border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">{BOND_DETAILS.name}</h2>
        {isPaused !== null && (
          <span className={`text-xs px-2 py-1 rounded-full ${isPaused ? "bg-bond-red/20 text-bond-red" : "bg-bond-green/20 text-bond-green"}`}>
            {isPaused ? "Paused" : "Active"}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wider">Symbol</p>
          <p className="text-lg font-mono text-white">{BOND_DETAILS.symbol}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wider">Coupon Rate</p>
          <p className="text-lg font-mono text-bond-green">{BOND_DETAILS.couponRate}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wider">Maturity</p>
          <p className="text-lg font-mono text-white">{BOND_DETAILS.maturity}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wider">Total Supply</p>
          <p className="text-lg font-mono text-white">{supply} CPC</p>
        </div>
      </div>
    </div>
  );
}
