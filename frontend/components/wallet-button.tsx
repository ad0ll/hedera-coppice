"use client";

import { useAts } from "@/contexts/ats-context";
import { DEMO_WALLETS } from "@/lib/constants";
import { abbreviateAddress } from "@/lib/format";

export function WalletButton() {
  const { address, isConnecting, connect, disconnect } = useAts();

  const walletLabel = address
    ? DEMO_WALLETS[address.toLowerCase()]?.label || abbreviateAddress(address)
    : "";

  if (address) {
    return (
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2 bg-surface-3/80 border border-border rounded-lg px-2.5 py-1.5 sm:px-3">
          <span className="w-2 h-2 rounded-full bg-bond-green animate-pulse-dot" />
          <span className="text-sm font-medium text-text">{walletLabel}</span>
          <span className="text-xs font-mono text-text-muted hidden sm:inline">
            {abbreviateAddress(address)}
          </span>
        </div>
        <button
          onClick={() => disconnect()}
          className="text-xs text-text-muted hover:text-bond-red transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bond-green rounded"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => connect()}
      disabled={isConnecting}
      className="bg-bond-green text-black px-5 py-2 rounded-full text-sm font-semibold hover:bg-bond-green/90 transition-all disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bond-green whitespace-nowrap"
    >
      {isConnecting ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}
