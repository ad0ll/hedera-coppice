import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../providers/WalletProvider";
import { useToken } from "../hooks/useToken";
import { ProjectAllocation } from "../components/ProjectAllocation";

export function IssuerDashboard() {
  const { account } = useWallet();
  const { mint, pause, unpause, paused, setAddressFrozen, loading } = useToken();

  const [mintTo, setMintTo] = useState("");
  const [mintAmount, setMintAmount] = useState("");
  const [mintStatus, setMintStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const [freezeAddr, setFreezeAddr] = useState("");
  const [freezeAction, setFreezeAction] = useState<"freeze" | "unfreeze">("freeze");
  const [freezeStatus, setFreezeStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const [isPaused, setIsPaused] = useState<boolean | null>(null);
  const [pauseStatus, setPauseStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const [project, setProject] = useState("");
  const [category, setCategory] = useState("Renewable Energy");
  const [proceedsAmount, setProceedsAmount] = useState("");
  const [proceedsStatus, setProceedsStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    paused().then(setIsPaused).catch(() => {});
  }, []);

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

  async function handleFreeze(action: "freeze" | "unfreeze") {
    if (!freezeAddr) return;
    setFreezeAction(action);
    setFreezeStatus(null);
    try {
      await setAddressFrozen(freezeAddr, action === "freeze");
      setFreezeStatus({
        type: "success",
        msg: `${action === "freeze" ? "Froze" : "Unfroze"} ${freezeAddr.slice(0, 10)}...`,
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
      setProceedsStatus({ type: "success", msg: `Allocated $${Number(proceedsAmount).toLocaleString("en-US")} to ${project} (HCS submission requires middleware)` });
      setProject("");
      setProceedsAmount("");
    } catch (err: any) {
      setProceedsStatus({ type: "error", msg: err.message?.slice(0, 80) || "Failed" });
    }
  }

  if (!account) {
    return (
      <div className="bg-surface-2 border border-border rounded-xl p-12 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-surface-3 flex items-center justify-center">
          <svg className="w-6 h-6 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-white mb-2">Issuer Dashboard</h1>
        <p className="text-text-muted text-sm">Connect your issuer wallet to manage the bond.</p>
      </div>
    );
  }

  const inputClass = "w-full bg-surface-3 border border-border rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-text-muted/60 focus:outline-none focus:border-bond-green/40 focus:ring-1 focus:ring-bond-green/20 transition-colors";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">Issuer Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mint Section */}
        <div className="bg-surface-2 border border-border rounded-xl p-6 card-glow">
          <h3 className="text-lg font-semibold text-white mb-4">Mint Tokens</h3>
          <div className="space-y-3">
            <input type="text" value={mintTo} onChange={(e) => setMintTo(e.target.value)}
              placeholder="Recipient address (0x...)" className={inputClass} />
            <input type="number" value={mintAmount} onChange={(e) => setMintAmount(e.target.value)}
              placeholder="Amount (CPC)" className={inputClass} />
            <button onClick={handleMint} disabled={loading || !mintTo || !mintAmount}
              className="w-full bg-bond-green text-black py-2.5 rounded-lg text-sm font-semibold hover:bg-bond-green/90 disabled:opacity-40 transition-all shadow-[0_0_12px_rgba(34,197,94,0.1)]">
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
        <div className="bg-surface-2 border border-border rounded-xl p-6 card-glow">
          <h3 className="text-lg font-semibold text-white mb-4">Freeze / Unfreeze Wallet</h3>
          <div className="space-y-3">
            <input type="text" value={freezeAddr} onChange={(e) => setFreezeAddr(e.target.value)}
              placeholder="Wallet address (0x...)" className={inputClass} />
            <div className="flex gap-2">
              <button onClick={() => handleFreeze("freeze")}
                disabled={loading || !freezeAddr}
                className="flex-1 bg-bond-red/15 text-bond-red border border-bond-red/20 py-2.5 rounded-lg text-sm font-semibold hover:bg-bond-red/25 disabled:opacity-40 transition-colors">
                Freeze
              </button>
              <button onClick={() => handleFreeze("unfreeze")}
                disabled={loading || !freezeAddr}
                className="flex-1 bg-bond-green/15 text-bond-green border border-bond-green/20 py-2.5 rounded-lg text-sm font-semibold hover:bg-bond-green/25 disabled:opacity-40 transition-colors">
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
        <div className="bg-surface-2 border border-border rounded-xl p-6 card-glow">
          <h3 className="text-lg font-semibold text-white mb-4">Token Pause Control</h3>
          <div className="flex items-center justify-between mb-4 bg-surface-3/50 rounded-lg px-4 py-3">
            <span className="text-sm text-text-muted">Current Status</span>
            <span className={`text-sm font-medium flex items-center gap-2 ${isPaused ? "text-bond-red" : "text-bond-green"}`}>
              <span className={`w-2 h-2 rounded-full ${isPaused ? "bg-bond-red" : "bg-bond-green animate-pulse-dot"}`} />
              {isPaused ? "Paused" : "Active"}
            </span>
          </div>
          <button onClick={handlePauseToggle} disabled={loading}
            className={`w-full py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40 transition-colors ${
              isPaused
                ? "bg-bond-green/15 text-bond-green border border-bond-green/20 hover:bg-bond-green/25"
                : "bg-bond-red/15 text-bond-red border border-bond-red/20 hover:bg-bond-red/25"
            }`}>
            {isPaused ? "Unpause Token" : "Pause Token"}
          </button>
          {pauseStatus && (
            <p className={`text-xs mt-2 ${pauseStatus.type === "success" ? "text-bond-green" : "text-bond-red"}`}>
              {pauseStatus.msg}
            </p>
          )}
        </div>

        {/* Proceeds Allocation */}
        <div className="bg-surface-2 border border-border rounded-xl p-6 card-glow">
          <h3 className="text-lg font-semibold text-white mb-4">Allocate Proceeds</h3>
          <div className="space-y-3">
            <input type="text" value={project} onChange={(e) => setProject(e.target.value)}
              placeholder="Project name" className={inputClass} />
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
              <option>Renewable Energy</option>
              <option>Energy Efficiency</option>
              <option>Clean Transportation</option>
              <option>Sustainable Water</option>
              <option>Green Buildings</option>
            </select>
            <input type="number" value={proceedsAmount} onChange={(e) => setProceedsAmount(e.target.value)}
              placeholder="Amount (USD)" className={inputClass} />
            <button onClick={handleAllocateProceeds} disabled={!project || !proceedsAmount}
              className="w-full bg-bond-amber/15 text-bond-amber border border-bond-amber/20 py-2.5 rounded-lg text-sm font-semibold hover:bg-bond-amber/25 disabled:opacity-40 transition-colors">
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
