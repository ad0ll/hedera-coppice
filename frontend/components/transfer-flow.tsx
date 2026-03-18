"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useConnection, useAts } from "@/contexts/ats-context";
import { useIdentity } from "@/hooks/use-identity";
import { useCompliance } from "@/hooks/use-compliance";
import { useHTS } from "@/hooks/use-hts";
import { signAuthMessage } from "@/lib/auth";
import { fetchAPI } from "@/lib/api-client";
import { purchaseResponseSchema } from "@/app/api/purchase/route";
import { EUSD_EVM_ADDRESS, DEMO_WALLETS } from "@/lib/constants";
import { formatNumber, getErrorMessage } from "@/lib/format";
import { ERC20_ABI, EUSD_DECIMALS } from "@/lib/abis";
import { StepProgress } from "@/components/ui/step-progress";
import type { Step } from "@/components/ui/step-progress";

export function TransferFlow({ enabled }: { enabled: boolean }) {
  const { address } = useConnection();
  const { signer } = useAts();
  const { isVerified } = useIdentity();
  const { canTransfer } = useCompliance();
  const { getEusdBalance } = useHTS();
  const [amount, setAmount] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);
  const [running, setRunning] = useState(false);
  const [eusdBalance, setEusdBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    getEusdBalance(address).then((bal) => {
      if (!cancelled) setEusdBalance(bal);
    });
    return () => { cancelled = true; };
  }, [address, getEusdBalance]);

  // Look up the deployer address from DEMO_WALLETS
  const deployerEntry = Object.entries(DEMO_WALLETS).find(
    ([, info]) => info.role === "issuer",
  );
  const deployerAddress = deployerEntry ? ethers.getAddress(deployerEntry[0]) : undefined;

  async function handlePurchase() {
    if (!address || !amount || running || !deployerAddress || !signer) return;

    const parsedAmount = ethers.parseEther(amount);
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
        canTransfer(ethers.ZeroAddress, address, parsedAmount),
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
      const eusdAmount = BigInt(Math.round(Number(amount) * 10 ** EUSD_DECIMALS));
      const eusdContract = new ethers.Contract(EUSD_EVM_ADDRESS, ERC20_ABI, signer);
      const approveTx: ethers.TransactionResponse = await eusdContract.approve(
        deployerAddress,
        eusdAmount,
        { gasLimit: BigInt(800_000) },
      );
      const approveReceipt = await approveTx.wait();
      if (approveReceipt && approveReceipt.status === 0) {
        throw new Error("eUSD approval transaction reverted");
      }

      // Batch: mark approve as success and purchase as active in one setState
      newSteps[2] = { label: "eUSD spending approved", status: "success" };
      newSteps[3] = { ...newSteps[3], status: "active" };
      setSteps([...newSteps]);

      // Step 4: Sign auth message and call purchase API
      const { message, signature } = await signAuthMessage(address, "Purchase Bond Tokens");

      await fetchAPI("/api/purchase", purchaseResponseSchema, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          investorAddress: address,
          amount: Number(amount),
          message,
          signature,
        }),
      });

      newSteps[3] = { label: "Bond tokens issued", status: "success" };
      setSteps([...newSteps]);
      setAmount("");
    } catch (err: unknown) {
      const failIndex = newSteps.findIndex((s) => s.status === "active");
      if (failIndex >= 0) {
        const message = getErrorMessage(err, 200, "Transaction failed");
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
          disabled={!enabled || running || !amount || (eusdBalance !== null && Number(amount) > eusdBalance)}
          className="btn-primary px-6 disabled:cursor-not-allowed"
        >
          {running ? "Processing..." : "Purchase"}
        </button>
      </div>

      {amount && enabled && !running && steps.length === 0 && (
        <div>
          <p className="text-xs text-text-muted">
            Cost: <span className="text-white font-mono">{formatNumber(Number(amount))}</span> eUSD (1:1 exchange rate)
          </p>
          {eusdBalance !== null && Number(amount) > eusdBalance && (
            <p className="text-xs text-bond-red mt-1">
              Insufficient eUSD balance ({formatNumber(eusdBalance, { minimumFractionDigits: 2 })} available)
            </p>
          )}
        </div>
      )}

      {steps.length > 0 && (
        <div className="mt-4">
          <StepProgress steps={steps} />
        </div>
      )}
    </div>
  );
}
