"use client";

import { useState } from "react";
import { zeroAddress, parseEther, erc20Abi, getAddress } from "viem";
import { useConnection, useConfig } from "wagmi";
import { writeContract, waitForTransactionReceipt } from "@wagmi/core";
import { useIdentity } from "@/hooks/use-identity";
import { useCompliance } from "@/hooks/use-compliance";
import { signAuthMessage } from "@/lib/auth";
import { EUSD_EVM_ADDRESS, DEMO_WALLETS } from "@/lib/constants";
import { getErrorMessage } from "@/lib/format";
import { CheckIcon, XIcon, Spinner } from "@/components/ui/icons";

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
  const deployerAddress = deployerEntry ? getAddress(deployerEntry[0]) : undefined;

  async function handlePurchase() {
    if (!address || !amount || running || !deployerAddress) return;

    const parsedAmount = parseEther(amount);
    setRunning(true);

    const newSteps: Step[] = [
      { label: "Verifying identity...", status: "active" },
      { label: "Checking compliance...", status: "active" },
      { label: "Approving eUSD spending...", status: "pending" },
      { label: "Processing purchase...", status: "pending" },
    ];
    setSteps([...newSteps]);

    try {
      // Run identity and compliance checks in parallel — they are independent
      const [verified, allowed] = await Promise.all([
        isVerified(address),
        canTransfer(zeroAddress, address, parsedAmount),
      ]);

      if (!verified) {
        newSteps[0] = { label: "Identity verification", status: "error", detail: "Identity not verified" };
        newSteps[1] = { label: "Checking compliance...", status: "pending" };
        setSteps([...newSteps]);
        setRunning(false);
        return;
      }
      if (!allowed) {
        newSteps[0] = { label: "Identity verified", status: "success" };
        newSteps[1] = { label: "Compliance check", status: "error", detail: "Transfer blocked by compliance" };
        setSteps([...newSteps]);
        setRunning(false);
        return;
      }
      newSteps[0] = { label: "Identity verified", status: "success" };
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

      // Batch: mark approve as success and purchase as active in one setState
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
        const message = getErrorMessage(err, 60, "Transaction failed");
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
    <div className="card">
      <h3 className="card-title">Purchase Bond Tokens</h3>

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
          className="input flex-1"
        />
        <button
          onClick={handlePurchase}
          disabled={!enabled || running || !amount}
          className="btn-primary px-6 disabled:cursor-not-allowed"
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
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3 py-1.5">
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                {step.status === "pending" && (
                  <div className="w-2 h-2 rounded-full bg-text-muted/30" />
                )}
                {step.status === "active" && (
                  <Spinner variant="amber" aria-label="Processing" />
                )}
                {step.status === "success" && (
                  <CheckIcon className="w-5 h-5 text-bond-green" />
                )}
                {step.status === "error" && (
                  <XIcon className="w-5 h-5 text-bond-red" />
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
