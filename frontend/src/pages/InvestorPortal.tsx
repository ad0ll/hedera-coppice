import { useState, useEffect } from "react";
import { formatEther } from "viem";
import { BondDetails } from "../components/BondDetails";
import { ComplianceStatus } from "../components/ComplianceStatus";
import { TransferFlow } from "../components/TransferFlow";
import { useWallet } from "../providers/WalletProvider";
import { useTokenBalance } from "../hooks/useToken";
import { useHTS } from "../hooks/useHTS";

export function InvestorPortal() {
  const { account } = useWallet();
  const { data: cpcBalanceRaw } = useTokenBalance(account ?? undefined);
  const { getEusdBalance } = useHTS();
  const [eligible, setEligible] = useState(false);
  const [eusdBalance, setEusdBalance] = useState<string>("--");

  const cpcBalance = cpcBalanceRaw != null
    ? Number(formatEther(cpcBalanceRaw)).toLocaleString("en-US")
    : "--";

  useEffect(() => {
    if (!account) {
      setEusdBalance("--");
      return;
    }
    const load = async () => {
      const eusd = await getEusdBalance(account);
      setEusdBalance(eusd.toLocaleString("en-US", { minimumFractionDigits: 2 }));
    };
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [account, getEusdBalance]);

  return (
    <div className="space-y-6">
      <BondDetails />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ComplianceStatus onEligibilityChange={setEligible} />
          <TransferFlow enabled={eligible} />
        </div>

        <div className="space-y-6">
          <div className="bg-surface-2 border border-border rounded-xl p-6 card-glow">
            <h3 className="text-lg font-semibold text-white mb-4">Portfolio</h3>
            {!account ? (
              <p className="text-sm text-text-muted">Connect wallet to view portfolio.</p>
            ) : (
              <div className="space-y-3">
                <div className="bg-surface-3/70 rounded-lg p-4 border border-border/30">
                  <p className="text-[11px] text-text-muted uppercase tracking-widest mb-1">CPC Balance</p>
                  <p className="text-2xl font-mono font-semibold text-white">{cpcBalance}</p>
                  <p className="text-xs text-text-muted mt-1">Coppice Green Bond</p>
                </div>
                <div className="bg-surface-3/70 rounded-lg p-4 border border-border/30">
                  <p className="text-[11px] text-text-muted uppercase tracking-widest mb-1">eUSD Balance</p>
                  <p className="text-2xl font-mono font-semibold text-bond-green">{eusdBalance}</p>
                  <p className="text-xs text-text-muted mt-1">Coppice USD (HTS)</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
