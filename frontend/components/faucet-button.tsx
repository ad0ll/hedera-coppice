"use client";

import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { useConnection, useAts } from "@/contexts/ats-context";
import { EUSD_EVM_ADDRESS, EUSD_TOKEN_ID } from "@/lib/constants";
import { getErrorMessage } from "@/lib/format";
import { fetchAPI } from "@/lib/api-client";
import { faucetResponseSchema } from "@/app/api/faucet/route";
import { getHederaAccountId, getHtsTokenBalance } from "@/lib/mirror-node";

const HTS_PRECOMPILE_ADDRESS = "0x0000000000000000000000000000000000000167";

const ASSOCIATE_TOKEN_ABI = [
  "function associateToken(address account, address token) returns (int64 responseCode)",
];

type FaucetState = "idle" | "associating" | "claiming" | "success";

const BUTTON_LABELS: Record<FaucetState, string> = {
  idle: "Get 1,000 Test eUSD",
  associating: "Associating token...",
  claiming: "Claiming eUSD...",
  success: "1,000 eUSD claimed!",
};

async function checkTokenAssociation(evmAddress: string): Promise<boolean> {
  try {
    const accountId = await getHederaAccountId(evmAddress);
    const balance = await getHtsTokenBalance(accountId, EUSD_TOKEN_ID);
    return balance > 0;
  } catch {
    return false;
  }
}

interface FaucetButtonProps {
  onSuccess?: () => void;
}

export function FaucetButton({ onSuccess }: FaucetButtonProps) {
  const { address } = useConnection();
  const { signer } = useAts();
  const [state, setState] = useState<FaucetState>("idle");
  const [error, setError] = useState<string | null>(null);

  const handleClaim = useCallback(async () => {
    if (!address || state !== "idle" || !signer) return;
    setError(null);

    try {
      // Check if wallet is associated with eUSD
      const isAssociated = await checkTokenAssociation(address);

      if (!isAssociated) {
        setState("associating");
        try {
          const htsContract = new ethers.Contract(
            HTS_PRECOMPILE_ADDRESS,
            ASSOCIATE_TOKEN_ABI,
            signer,
          );
          const tx: ethers.TransactionResponse = await htsContract.associateToken(
            address,
            EUSD_EVM_ADDRESS,
            { gasLimit: BigInt(800_000) },
          );
          await tx.wait();
        } catch (err: unknown) {
          const msg = getErrorMessage(err, 100, "Token association failed");
          if (!msg.includes("TOKEN_ALREADY_ASSOCIATED")) {
            throw err;
          }
        }
      }

      // Claim eUSD from faucet
      setState("claiming");
      await fetchAPI("/api/faucet", faucetResponseSchema, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address }),
      });

      setState("success");
      onSuccess?.();
      setTimeout(() => setState("idle"), 3000);
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 100, "Failed to claim eUSD");
      setError(msg);
      setState("idle");
    }
  }, [address, state, signer, onSuccess]);

  if (!address) return null;

  const isActive = state !== "idle" && state !== "success";

  return (
    <div className="inline-block mt-2" aria-live="polite">
      <button
        onClick={handleClaim}
        disabled={isActive}
        aria-busy={isActive}
        className={`text-xs font-medium px-3 py-1.5 rounded transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bond-green ${
          state === "success"
            ? "text-bond-green bg-bond-green/10 border border-bond-green/20"
            : "text-text-muted hover:text-white bg-surface-3 hover:bg-surface-3/80 border border-border"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {BUTTON_LABELS[state]}
      </button>
      {error && (
        <p className="status-msg-error mt-1.5" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
