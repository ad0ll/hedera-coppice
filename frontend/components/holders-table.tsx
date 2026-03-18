"use client";

import { formatBalance, abbreviateAddress } from "@/lib/format";
import { DEMO_WALLETS } from "@/lib/constants";
import { StatusBadge } from "@/components/ui/status-badge";
import { Spinner, ExternalLinkIcon } from "@/components/ui/icons";
import type { HolderInfo } from "@/hooks/use-holders";

function holderLabel(address: string): string | null {
  return DEMO_WALLETS[address.toLowerCase()]?.label ?? null;
}

export function HoldersTable({ holders, loading }: { holders: HolderInfo[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="card-flush">
        <div className="px-6 py-4 border-b border-border/50">
          <h2 className="text-lg font-semibold text-white">Token Holders</h2>
        </div>
        <div className="px-6 py-8 flex items-center justify-center gap-3 text-text-muted text-sm" role="status">
          <Spinner aria-hidden />
          Loading holder data...
        </div>
      </div>
    );
  }

  return (
    <div className="card-flush">
      <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Token Holders</h2>
        <span className="text-xs text-text-muted font-mono">{holders.length} addresses</span>
      </div>

      {holders.length === 0 ? (
        <div className="px-6 py-8 text-center text-sm text-text-muted">
          No holders yet. Mint tokens to add the first holder.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="px-3 sm:px-6 py-3 text-left stat-label font-medium">Address</th>
                <th className="px-3 sm:px-6 py-3 text-right stat-label font-medium">Balance</th>
                <th className="px-3 sm:px-6 py-3 text-center stat-label font-medium">Verified</th>
                <th className="px-3 sm:px-6 py-3 text-center stat-label font-medium">Status</th>
                <th className="px-3 sm:px-6 py-3 text-right stat-label font-medium w-10"><span className="sr-only">Links</span></th>
              </tr>
            </thead>
            <tbody>
              {holders.map((h) => {
                const label = holderLabel(h.address);
                return (
                  <tr key={h.address} className="border-b border-border/20 last:border-0 hover:bg-surface-3/30 transition-colors">
                    <td className="px-3 sm:px-6 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-white">{abbreviateAddress(h.address)}</span>
                        {label && (
                          <span className="text-xs text-text-muted">({label})</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 text-right font-mono text-white">
                      {formatBalance(h.balance)}
                    </td>
                    <td className="px-3 sm:px-6 py-3 text-center">
                      <StatusBadge
                        label={h.verified ? "Verified" : "Unverified"}
                        variant={h.verified ? "green" : "red"}
                      />
                    </td>
                    <td className="px-3 sm:px-6 py-3 text-center">
                      {h.frozen ? (
                        <StatusBadge label="Frozen" variant="red" />
                      ) : (
                        <StatusBadge label="Active" variant="green" />
                      )}
                    </td>
                    <td className="px-3 sm:px-6 py-3 text-right">
                      <a
                        href={`https://hashscan.io/testnet/account/${h.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-text-muted hover:text-bond-green transition-colors"
                        aria-label="View on HashScan"
                      >
                        <ExternalLinkIcon />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
