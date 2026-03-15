"use client";

import { useState } from "react";
import { zeroAddress, parseEther, erc20Abi } from "viem";
import { useConnection, useConfig } from "wagmi";
import { writeContract, waitForTransactionReceipt } from "@wagmi/core";
import { useIdentity } from "@/hooks/use-identity";
import { useCompliance } from "@/hooks/use-compliance";
import { signAuthMessage } from "@/lib/auth";
import { EUSD_EVM_ADDRESS, DEMO_WALLETS } from "@/lib/constants";

type StepStatus = "pending" | "active" | "success" | "error";

interface Step {
  label: string;
  status: StepStatus;
  detail?: string;
}

export function TransferFlow({ enabled }: { enabled: boolean }) {
  const { address } = useConnection();
  const config = useConfig();
  const { isVerified } = useIdentity();
  const { canTransfer } = useCompliance();
  const [amount, setAmount] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);
  const [running, setRunning] = useState(false);

  // Look up the deployer address from DEMO_WALLETS
  const deployerEntry = Object.entries(DEMO_WALLETS).find(
    ([, info]) => info.role === "issuer",
  );
  const deployerAddress = deployerEntry?.[0] as `0x${string}` | undefined;

  async function handlePurchase() {
    if (!address || !amount || running || !deployerAddress) return;

    const parsedAmount = parseEther(amount);
    setRunning(true);

    const newSteps: Step[] = [
      { label: "Verifying identity...", status: "active" },
      { label: "Checking compliance...", status: "pending" },
      { label: "Approving eUSD spending...", status: "pending" },
      { label: "Processing purchase...", status: "pending" },
    ];
    setSteps([...newSteps]);

    try {
      const verified = await isVerified(address);
      if (!verified) {
        newSteps[0] = { label: "Identity verification", status: "error", detail: "Identity not verified" };
        setSteps([...newSteps]);
        setRunning(false);
        return;
      }
      newSteps[0] = { label: "Identity verified", status: "success" };
      newSteps[1] = { ...newSteps[1], status: "active" };
      setSteps([...newSteps]);

      const allowed = await canTransfer(zeroAddress, address, parsedAmount);
      if (!allowed) {
        newSteps[1] = { label: "Compliance check", status: "error", detail: "Transfer blocked by compliance" };
        setSteps([...newSteps]);
        setRunning(false);
        return;
      }
      newSteps[1] = { label: "Compliance verified", status: "success" };
      newSteps[2] = { ...newSteps[2], status: "active" };
      setSteps([...newSteps]);

      // Step 3: Approve eUSD spending — investor signs in MetaMask
      const eusdAmount = BigInt(Math.round(Number(amount) * 100)); // eUSD has 2 decimals
      const approveHash = await writeContract(config, {
        address: EUSD_EVM_ADDRESS,
        abi: erc20Abi,
        functionName: "approve",
        args: [deployerAddress, eusdAmount],
        gas: BigInt(100_000),
      });
      await waitForTransactionReceipt(config, { hash: approveHash });

      newSteps[2] = { label: "eUSD spending approved", status: "success" };
      newSteps[3] = { ...newSteps[3], status: "active" };
      setSteps([...newSteps]);

      // Step 4: Sign auth message and call purchase API
      const { message, signature } = await signAuthMessage(config, address, "Purchase Bond Tokens");

      const purchaseRes = await fetch("/api/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          investorAddress: address,
          amount: Number(amount),
          message,
          signature,
        }),
      });

      let purchaseData: { error?: string; success?: boolean };
      try {
        purchaseData = await purchaseRes.json();
      } catch {
        throw new Error(`Server error (${purchaseRes.status})`);
      }

      if (!purchaseRes.ok) {
        throw new Error(purchaseData.error || "Purchase failed");
      }

      newSteps[3] = { label: "Bond tokens issued", status: "success" };
      setSteps([...newSteps]);
      setAmount("");
    } catch (err: unknown) {
      const failIndex = newSteps.findIndex((s) => s.status === "active");
      if (failIndex >= 0) {
        const message = err instanceof Error ? err.message.slice(0, 60) : "Transaction failed";
        newSteps[failIndex] = {
          label: newSteps[failIndex].label,
          status: "error",
          detail: message,
        };
        setSteps([...newSteps]);
      }
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="bg-surface-2 border border-border rounded-xl p-6 card-glow">
      <h3 className="text-lg font-semibold text-white mb-4">Purchase Bond Tokens</h3>

      {!enabled && (
        <p className="text-sm text-text-muted mb-4">
          You <span className="text-bond-red">must pass all compliance checks</span> before purchasing.
        </p>
      )}

      <div className="flex gap-3 mb-4">
        <label className="sr-only" htmlFor="purchase-amount">Purchase amount in CPC</label>
        <input
          id="purchase-amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount (CPC)"
          min="0"
          disabled={!enabled || running}
          className="flex-1 bg-surface-3 border border-border rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-text-muted/60 focus:outline-none focus:border-bond-green/40 focus:ring-1 focus:ring-bond-green/20 disabled:opacity-40 transition-colors"
        />
        <button
          onClick={handlePurchase}
          disabled={!enabled || running || !amount}
          className="bg-bond-green text-black px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-bond-green/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_12px_rgba(34,197,94,0.15)]"
        >
          {running ? "Processing..." : "Purchase"}
        </button>
      </div>

      {amount && enabled && !running && steps.length === 0 && (
        <p className="text-xs text-text-muted">
          Cost: <span className="text-white font-mono">{Number(amount).toLocaleString("en-US")}</span> eUSD (1:1 exchange rate)
        </p>
      )}

      {steps.length > 0 && (
        <div className="space-y-1 mt-4 bg-surface-3/50 rounded-lg p-4" aria-live="polite" aria-atomic="true">
          {steps.map((step) => (
            <div key={step.label} className="flex items-center gap-3 py-1.5">
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                {step.status === "pending" && (
                  <div className="w-2 h-2 rounded-full bg-text-muted/30" />
                )}
                {step.status === "active" && (
                  <span className="inline-block w-4 h-4 border-2 border-bond-amber/40 border-t-bond-amber rounded-full animate-spin" role="status" aria-label="Processing" />
                )}
                {step.status === "success" && (
                  <svg className="w-5 h-5 text-bond-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {step.status === "error" && (
                  <svg className="w-5 h-5 text-bond-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <div className="min-w-0">
                <span className={`text-sm ${
                  step.status === "pending" ? "text-text-muted/40" :
                  step.status === "error" ? "text-bond-red" :
                  "text-white"
                }`}>
                  {step.label}
                </span>
                {step.detail && (
                  <p className="text-xs text-bond-red/80 mt-0.5">{step.detail}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
