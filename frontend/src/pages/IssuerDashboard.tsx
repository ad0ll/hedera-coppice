import { useState } from "react";
import { ethers } from "ethers";
import { useWallet } from "../providers/WalletProvider";
import { useToken } from "../hooks/useToken";
import { ProjectAllocation } from "../components/ProjectAllocation";

export function IssuerDashboard() {
  const { account } = useWallet();
  const { mint, pause, unpause, paused, setAddressFrozen, loading } = useToken();

  // Mint state
  const [mintTo, setMintTo] = useState("");
  const [mintAmount, setMintAmount] = useState("");
  const [mintStatus, setMintStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Freeze state
  const [freezeAddr, setFreezeAddr] = useState("");
  const [freezeAction, setFreezeAction] = useState<"freeze" | "unfreeze">("freeze");
  const [freezeStatus, setFreezeStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Pause state
  const [isPaused, setIsPaused] = useState<boolean | null>(null);
  const [pauseStatus, setPauseStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Proceeds state
  const [project, setProject] = useState("");
  const [category, setCategory] = useState("Renewable Energy");
  const [proceedsAmount, setProceedsAmount] = useState("");
  const [proceedsStatus, setProceedsStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Load pause state
  useState(() => {
    paused().then(setIsPaused).catch(() => {});
  });

  async function handleMint() {
    if (!mintTo || !mintAmount) return;
    setMintStatus(null);
    try {
      await mint(mintTo, ethers.parseEther(mintAmount));
      setMintStatus({ type: "success", msg: `Minted ${mintAmount} CPC to ${mintTo.slice(0, 10)}...` });
      setMintTo("");
      setMintAmount("");
    } catch (err: any) {
      setMintStatus({ type: "error", msg: err.reason || err.message?.slice(0, 80) || "Mint failed" });
    }
  }

  async function handleFreeze() {
    if (!freezeAddr) return;
    setFreezeStatus(null);
    try {
      await setAddressFrozen(freezeAddr, freezeAction === "freeze");
      setFreezeStatus({
        type: "success",
        msg: `${freezeAction === "freeze" ? "Froze" : "Unfroze"} ${freezeAddr.slice(0, 10)}...`,
      });
    } catch (err: any) {
      setFreezeStatus({ type: "error", msg: err.reason || err.message?.slice(0, 80) || "Failed" });
    }
  }

  async function handlePauseToggle() {
    setPauseStatus(null);
    try {
      if (isPaused) {
        await unpause();
        setIsPaused(false);
        setPauseStatus({ type: "success", msg: "Token unpaused" });
      } else {
        await pause();
        setIsPaused(true);
        setPauseStatus({ type: "success", msg: "Token paused" });
      }
    } catch (err: any) {
      setPauseStatus({ type: "error", msg: err.reason || err.message?.slice(0, 80) || "Failed" });
    }
  }

  async function handleAllocateProceeds() {
    if (!project || !proceedsAmount) return;
    setProceedsStatus(null);
    try {
      // Submit to HCS impact topic via Mirror Node won't work from browser —
      // we'll need the middleware. For demo, we post directly using the Hedera SDK
      // or show it as a simulated action.
      // For now, display success and note it would go to HCS in production.
      setProceedsStatus({ type: "success", msg: `Allocated $${Number(proceedsAmount).toLocaleString()} to ${project} (HCS submission requires middleware)` });
      setProject("");
      setProceedsAmount("");
    } catch (err: any) {
      setProceedsStatus({ type: "error", msg: err.message?.slice(0, 80) || "Failed" });
    }
  }

  if (!account) {
    return (
      <div className="bg-surface-2 border border-border rounded-xl p-8 text-center">
        <h2 className="text-xl font-semibold text-white mb-2">Issuer Dashboard</h2>
        <p className="text-text-muted">Connect your issuer wallet to manage the bond.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-white">Issuer Dashboard</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mint Section */}
        <div className="bg-surface-2 border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Mint Tokens</h3>
          <div className="space-y-3">
            <input
              type="text"
              value={mintTo}
              onChange={(e) => setMintTo(e.target.value)}
              placeholder="Recipient address (0x...)"
              className="w-full bg-surface-3 border border-border rounded-lg px-4 py-2 text-white text-sm placeholder:text-text-muted focus:outline-none focus:border-bond-green/50"
            />
            <input
              type="number"
              value={mintAmount}
              onChange={(e) => setMintAmount(e.target.value)}
              placeholder="Amount (CPC)"
              className="w-full bg-surface-3 border border-border rounded-lg px-4 py-2 text-white text-sm placeholder:text-text-muted focus:outline-none focus:border-bond-green/50"
            />
            <button
              onClick={handleMint}
              disabled={loading || !mintTo || !mintAmount}
              className="w-full bg-bond-green text-black py-2 rounded-lg text-sm font-semibold hover:bg-bond-green/90 disabled:opacity-50"
            >
              {loading ? "Minting..." : "Mint"}
            </button>
            {mintStatus && (
              <p className={`text-xs ${mintStatus.type === "success" ? "text-bond-green" : "text-bond-red"}`}>
                {mintStatus.msg}
              </p>
            )}
          </div>
        </div>

        {/* Freeze / Unfreeze */}
        <div className="bg-surface-2 border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Freeze / Unfreeze Wallet</h3>
          <div className="space-y-3">
            <input
              type="text"
              value={freezeAddr}
              onChange={(e) => setFreezeAddr(e.target.value)}
              placeholder="Wallet address (0x...)"
              className="w-full bg-surface-3 border border-border rounded-lg px-4 py-2 text-white text-sm placeholder:text-text-muted focus:outline-none focus:border-bond-green/50"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setFreezeAction("freeze"); handleFreeze(); }}
                disabled={loading || !freezeAddr}
                className="flex-1 bg-bond-red/20 text-bond-red border border-bond-red/30 py-2 rounded-lg text-sm font-semibold hover:bg-bond-red/30 disabled:opacity-50"
              >
                Freeze
              </button>
              <button
                onClick={() => { setFreezeAction("unfreeze"); handleFreeze(); }}
                disabled={loading || !freezeAddr}
                className="flex-1 bg-bond-green/20 text-bond-green border border-bond-green/30 py-2 rounded-lg text-sm font-semibold hover:bg-bond-green/30 disabled:opacity-50"
              >
                Unfreeze
              </button>
            </div>
            {freezeStatus && (
              <p className={`text-xs ${freezeStatus.type === "success" ? "text-bond-green" : "text-bond-red"}`}>
                {freezeStatus.msg}
              </p>
            )}
          </div>
        </div>

        {/* Pause / Unpause */}
        <div className="bg-surface-2 border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Token Pause Control</h3>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-text-muted">
              Status: <span className={isPaused ? "text-bond-red" : "text-bond-green"}>{isPaused ? "Paused" : "Active"}</span>
            </span>
          </div>
          <button
            onClick={handlePauseToggle}
            disabled={loading}
            className={`w-full py-2 rounded-lg text-sm font-semibold disabled:opacity-50 ${
              isPaused
                ? "bg-bond-green/20 text-bond-green border border-bond-green/30 hover:bg-bond-green/30"
                : "bg-bond-red/20 text-bond-red border border-bond-red/30 hover:bg-bond-red/30"
            }`}
          >
            {isPaused ? "Unpause Token" : "Pause Token"}
          </button>
          {pauseStatus && (
            <p className={`text-xs mt-2 ${pauseStatus.type === "success" ? "text-bond-green" : "text-bond-red"}`}>
              {pauseStatus.msg}
            </p>
          )}
        </div>

        {/* Proceeds Allocation */}
        <div className="bg-surface-2 border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Allocate Proceeds</h3>
          <div className="space-y-3">
            <input
              type="text"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              placeholder="Project name"
              className="w-full bg-surface-3 border border-border rounded-lg px-4 py-2 text-white text-sm placeholder:text-text-muted focus:outline-none focus:border-bond-green/50"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-surface-3 border border-border rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-bond-green/50"
            >
              <option>Renewable Energy</option>
              <option>Energy Efficiency</option>
              <option>Clean Transportation</option>
              <option>Sustainable Water</option>
              <option>Green Buildings</option>
            </select>
            <input
              type="number"
              value={proceedsAmount}
              onChange={(e) => setProceedsAmount(e.target.value)}
              placeholder="Amount (USD)"
              className="w-full bg-surface-3 border border-border rounded-lg px-4 py-2 text-white text-sm placeholder:text-text-muted focus:outline-none focus:border-bond-green/50"
            />
            <button
              onClick={handleAllocateProceeds}
              disabled={!project || !proceedsAmount}
              className="w-full bg-bond-amber/20 text-bond-amber border border-bond-amber/30 py-2 rounded-lg text-sm font-semibold hover:bg-bond-amber/30 disabled:opacity-50"
            >
              Allocate to HCS
            </button>
            {proceedsStatus && (
              <p className={`text-xs ${proceedsStatus.type === "success" ? "text-bond-green" : "text-bond-red"}`}>
                {proceedsStatus.msg}
              </p>
            )}
          </div>
        </div>
      </div>

      <ProjectAllocation />
    </div>
  );
}
