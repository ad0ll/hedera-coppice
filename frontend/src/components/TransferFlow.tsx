import { useState } from "react";
import { ethers } from "ethers";
import { useWallet } from "../providers/WalletProvider";
import { useToken } from "../hooks/useToken";
import { useIdentity } from "../hooks/useIdentity";
import { useCompliance } from "../hooks/useCompliance";

type StepStatus = "pending" | "active" | "success" | "error";

interface Step {
  label: string;
  status: StepStatus;
  detail?: string;
}

export function TransferFlow({ enabled }: { enabled: boolean }) {
  const { account } = useWallet();
  const { mint } = useToken();
  const { isVerified } = useIdentity();
  const { canTransfer } = useCompliance();
  const [amount, setAmount] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);
  const [running, setRunning] = useState(false);

  async function handlePurchase() {
    if (!account || !amount || running) return;

    const parsedAmount = ethers.parseEther(amount);
    setRunning(true);

    const newSteps: Step[] = [
      { label: "Verifying identity...", status: "active" },
      { label: "Checking compliance...", status: "pending" },
      { label: "Processing eUSD payment...", status: "pending" },
      { label: "Issuing bond tokens...", status: "pending" },
    ];
    setSteps([...newSteps]);

    try {
      // Step 1: Identity verification
      const verified = await isVerified(account);
      if (!verified) {
        newSteps[0] = { label: "Identity verification", status: "error", detail: "Identity not verified" };
        setSteps([...newSteps]);
        setRunning(false);
        return;
      }
      newSteps[0] = { label: "Identity verified", status: "success" };
      newSteps[1] = { ...newSteps[1], status: "active" };
      setSteps([...newSteps]);

      // Step 2: Compliance check
      const allowed = await canTransfer(ethers.ZeroAddress, account, parsedAmount);
      if (!allowed) {
        newSteps[1] = { label: "Compliance check", status: "error", detail: "Transfer blocked by compliance" };
        setSteps([...newSteps]);
        setRunning(false);
        return;
      }
      newSteps[1] = { label: "Compliance verified", status: "success" };
      newSteps[2] = { ...newSteps[2], status: "active" };
      setSteps([...newSteps]);

      // Step 3: eUSD payment (simulated for demo — in production would be HTS transfer)
      await new Promise((r) => setTimeout(r, 1500));
      newSteps[2] = { label: "eUSD payment processed", status: "success" };
      newSteps[3] = { ...newSteps[3], status: "active" };
      setSteps([...newSteps]);

      // Step 4: Mint bond tokens
      await mint(account, parsedAmount);
      newSteps[3] = { label: "Bond tokens issued", status: "success" };
      setSteps([...newSteps]);
      setAmount("");
    } catch (err: any) {
      const failIndex = newSteps.findIndex((s) => s.status === "active");
      if (failIndex >= 0) {
        newSteps[failIndex] = {
          label: newSteps[failIndex].label,
          status: "error",
          detail: err.reason || err.message?.slice(0, 60) || "Transaction failed",
        };
        setSteps([...newSteps]);
      }
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="bg-surface-2 border border-border rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Purchase Bond Tokens</h3>

      {!enabled && (
        <p className="text-sm text-bond-red/80 mb-4">
          You must pass all compliance checks before purchasing.
        </p>
      )}

      <div className="flex gap-3 mb-6">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount (CPC)"
          disabled={!enabled || running}
          className="flex-1 bg-surface-3 border border-border rounded-lg px-4 py-2 text-white text-sm placeholder:text-text-muted focus:outline-none focus:border-bond-green/50 disabled:opacity-50"
        />
        <button
          onClick={handlePurchase}
          disabled={!enabled || running || !amount}
          className="bg-bond-green text-black px-6 py-2 rounded-lg text-sm font-semibold hover:bg-bond-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {running ? "Processing..." : "Purchase"}
        </button>
      </div>

      {amount && enabled && !running && steps.length === 0 && (
        <p className="text-xs text-text-muted">
          Cost: {Number(amount).toLocaleString()} eUSD (1:1 exchange rate)
        </p>
      )}

      {steps.length > 0 && (
        <div className="space-y-3 mt-4">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-6 text-center">
                {step.status === "pending" && <span className="text-text-muted/50">&#9679;</span>}
                {step.status === "active" && (
                  <span className="inline-block w-4 h-4 border-2 border-bond-amber border-t-transparent rounded-full animate-spin" />
                )}
                {step.status === "success" && <span className="text-bond-green">&#10003;</span>}
                {step.status === "error" && <span className="text-bond-red">&#10007;</span>}
              </span>
              <div>
                <span className={`text-sm ${
                  step.status === "pending" ? "text-text-muted/50" :
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
