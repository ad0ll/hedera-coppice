import { useState } from "react";
import { zeroAddress, parseEther } from "viem";
import { useWallet } from "../providers/WalletProvider";
import { useIdentity } from "../hooks/useIdentity";
import { useCompliance } from "../hooks/useCompliance";
import { API_URL, API_KEY } from "../lib/constants";

type StepStatus = "pending" | "active" | "success" | "error";

interface Step {
  label: string;
  status: StepStatus;
  detail?: string;
}

export function TransferFlow({ enabled }: { enabled: boolean }) {
  const { account } = useWallet();
  const { isVerified } = useIdentity();
  const { canTransfer } = useCompliance();
  const [amount, setAmount] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);
  const [running, setRunning] = useState(false);

  async function handlePurchase() {
    if (!account || !amount || running) return;

    const parsedAmount = parseEther(amount);
    setRunning(true);

    const newSteps: Step[] = [
      { label: "Verifying identity...", status: "active" },
      { label: "Checking compliance...", status: "pending" },
      { label: "Processing eUSD payment...", status: "pending" },
      { label: "Issuing bond tokens...", status: "pending" },
    ];
    setSteps([...newSteps]);

    try {
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

      const allowed = await canTransfer(zeroAddress, account, parsedAmount);
      if (!allowed) {
        newSteps[1] = { label: "Compliance check", status: "error", detail: "Transfer blocked by compliance" };
        setSteps([...newSteps]);
        setRunning(false);
        return;
      }
      newSteps[1] = { label: "Compliance verified", status: "success" };
      newSteps[2] = { ...newSteps[2], status: "active" };
      setSteps([...newSteps]);

      // Steps 3 & 4: Backend handles eUSD transfer + CPC mint
      const purchaseRes = await fetch(`${API_URL}/api/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
        body: JSON.stringify({ investorAddress: account, amount: Number(amount) }),
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

      newSteps[2] = { label: "eUSD payment processed", status: "success" };
      newSteps[3] = { ...newSteps[3], status: "active" };
      setSteps([...newSteps]);

      await new Promise((r) => setTimeout(r, 500));
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
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount (CPC)"
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
        <div className="space-y-1 mt-4 bg-surface-3/50 rounded-lg p-4">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3 py-1.5">
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                {step.status === "pending" && (
                  <div className="w-2 h-2 rounded-full bg-text-muted/30" />
                )}
                {step.status === "active" && (
                  <span className="inline-block w-4 h-4 border-2 border-bond-amber/40 border-t-bond-amber rounded-full animate-spin" />
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
