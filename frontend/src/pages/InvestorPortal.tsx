import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { BondDetails } from "../components/BondDetails";
import { ComplianceStatus } from "../components/ComplianceStatus";
import { TransferFlow } from "../components/TransferFlow";
import { useWallet } from "../providers/WalletProvider";
import { useToken } from "../hooks/useToken";
import { useHTS } from "../hooks/useHTS";

export function InvestorPortal() {
  const { account } = useWallet();
  const { balanceOf } = useToken();
  const { getEusdBalance } = useHTS();
  const [eligible, setEligible] = useState(false);
  const [cpcBalance, setCpcBalance] = useState<string>("--");
  const [eusdBalance, setEusdBalance] = useState<string>("--");

  useEffect(() => {
    if (!account) {
      setCpcBalance("--");
      setEusdBalance("--");
      return;
    }

    async function loadBalances() {
      const cpc = await balanceOf(account!);
      setCpcBalance(Number(ethers.formatEther(cpc)).toLocaleString());
      const eusd = await getEusdBalance(account!);
      setEusdBalance(eusd.toLocaleString(undefined, { minimumFractionDigits: 2 }));
    }

    loadBalances();
    const interval = setInterval(loadBalances, 10000);
    return () => clearInterval(interval);
  }, [account]);

  return (
    <div className="space-y-6">
      <BondDetails />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ComplianceStatus onEligibilityChange={setEligible} />
          <TransferFlow enabled={eligible} />
        </div>

        <div className="space-y-6">
          {/* Portfolio */}
          <div className="bg-surface-2 border border-border rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Portfolio</h3>
            {!account ? (
              <p className="text-sm text-text-muted">Connect wallet to view portfolio.</p>
            ) : (
              <div className="space-y-4">
                <div className="bg-surface-3 rounded-lg p-4">
                  <p className="text-xs text-text-muted uppercase tracking-wider mb-1">CPC Balance</p>
                  <p className="text-2xl font-mono text-white">{cpcBalance}</p>
                  <p className="text-xs text-text-muted">Coppice Green Bond</p>
                </div>
                <div className="bg-surface-3 rounded-lg p-4">
                  <p className="text-xs text-text-muted uppercase tracking-wider mb-1">eUSD Balance</p>
                  <p className="text-2xl font-mono text-bond-green">{eusdBalance}</p>
                  <p className="text-xs text-text-muted">Coppice USD (HTS)</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
