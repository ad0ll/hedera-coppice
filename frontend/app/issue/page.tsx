"use client";

import { useState } from "react";
import { isAddress, parseEther } from "viem";
import { useConnection, useConfig } from "wagmi";
import { useTokenRead, useTokenWrite, useIsAgent } from "@/hooks/use-token";
import { ProjectAllocation } from "@/components/project-allocation";
import { signAuthMessage } from "@/lib/auth";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";

export default function IssuerDashboard() {
  const { address } = useConnection();
  const config = useConfig();
  const { paused: pausedQuery } = useTokenRead();
  const { mint, pause, unpause, setAddressFrozen, loading } = useTokenWrite();
  const { data: isAuthorized, isLoading: isCheckingAgent } = useIsAgent(address);

  const isPaused = pausedQuery.data ?? null;

  const [mintTo, setMintTo] = useState("");
  const [mintAmount, setMintAmount] = useState("");
  const [mintStatus, setMintStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const [freezeAddr, setFreezeAddr] = useState("");
  const [freezeStatus, setFreezeStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const [pauseStatus, setPauseStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const [project, setProject] = useState("");
  const [category, setCategory] = useState("Renewable Energy");
  const [proceedsAmount, setProceedsAmount] = useState("");
  const [proceedsStatus, setProceedsStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  async function handleMint() {
    if (!mintTo || !mintAmount) return;
    if (!isAddress(mintTo)) {
      setMintStatus({ type: "error", msg: "Invalid Ethereum address" });
      return;
    }
    setMintStatus(null);
    try {
      await mint(mintTo, parseEther(mintAmount));
      setMintStatus({ type: "success", msg: `Minted ${mintAmount} CPC to ${mintTo.slice(0, 10)}...` });
      setMintTo("");
      setMintAmount("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message.slice(0, 80) : "Mint failed";
      setMintStatus({ type: "error", msg: message });
    }
  }

  async function handleFreeze(action: "freeze" | "unfreeze") {
    if (!freezeAddr) return;
    if (!isAddress(freezeAddr)) {
      setFreezeStatus({ type: "error", msg: "Invalid Ethereum address" });
      return;
    }
    setFreezeStatus(null);
    try {
      await setAddressFrozen(freezeAddr, action === "freeze");
      setFreezeStatus({
        type: "success",
        msg: `${action === "freeze" ? "Froze" : "Unfroze"} ${freezeAddr.slice(0, 10)}...`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message.slice(0, 80) : "Failed";
      setFreezeStatus({ type: "error", msg: message });
    }
  }

  async function handlePauseToggle() {
    setPauseStatus(null);
    try {
      if (isPaused) {
        await unpause();
        setPauseStatus({ type: "success", msg: "Token unpaused" });
      } else {
        await pause();
        setPauseStatus({ type: "success", msg: "Token paused" });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message.slice(0, 80) : "Failed";
      setPauseStatus({ type: "error", msg: message });
    }
  }

  async function handleAllocateProceeds() {
    if (!project || !proceedsAmount || !address) return;
    setProceedsStatus(null);
    try {
      const { message: authMessage, signature } = await signAuthMessage(config, address, "Allocate Proceeds");

      const res = await fetch("/api/allocate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project,
          category,
          amount: Number(proceedsAmount),
          currency: "USD",
          message: authMessage,
          signature,
        }),
      });
      const data: { error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error || "Allocation failed");
      setProceedsStatus({ type: "success", msg: `Allocated $${Number(proceedsAmount).toLocaleString("en-US")} to ${project} (submitted to HCS)` });
      setProject("");
      setProceedsAmount("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed";
      setProceedsStatus({ type: "error", msg: message.slice(0, 80) });
    }
  }

  if (!address) {
    return (
      <EmptyState
        icon={<svg className="w-6 h-6 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>}
        title="Issuer Dashboard"
        description="Connect your issuer wallet to manage the bond."
      />
    );
  }

  if (isCheckingAgent) {
    return (
      <div className="card p-12 text-center">
        <span className="spinner w-6 h-6" role="status" aria-label="Checking authorization" />
        <p className="text-text-muted text-sm mt-4">Checking authorization...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <EmptyState
        variant="danger"
        icon={<svg className="w-6 h-6 text-bond-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>}
        title="Not Authorized"
        description="Only the bond issuer can access this dashboard."
      />
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="page-title">Issuer Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mint Section */}
        <Card>
          <h3 className="card-title">Mint Tokens</h3>
          <div className="space-y-3">
            <label className="sr-only" htmlFor="mint-to">Recipient address</label>
            <input id="mint-to" type="text" value={mintTo} onChange={(e) => setMintTo(e.target.value)}
              placeholder="Recipient address (0x...)" className="input" />
            <label className="sr-only" htmlFor="mint-amount">Mint amount</label>
            <input id="mint-amount" type="number" value={mintAmount} onChange={(e) => setMintAmount(e.target.value)}
              placeholder="Amount (CPC)" min="0" className="input" />
            <button onClick={handleMint} disabled={loading || !mintTo || !mintAmount}
              className="w-full btn-primary">
              {loading ? "Minting..." : "Mint"}
            </button>
            {mintStatus && (
              <p className={mintStatus.type === "success" ? "status-msg-success" : "status-msg-error"}>
                {mintStatus.msg}
              </p>
            )}
          </div>
        </Card>

        {/* Freeze / Unfreeze */}
        <Card>
          <h3 className="card-title">Freeze / Unfreeze Wallet</h3>
          <div className="space-y-3">
            <label className="sr-only" htmlFor="freeze-addr">Wallet address to freeze/unfreeze</label>
            <input id="freeze-addr" type="text" value={freezeAddr} onChange={(e) => setFreezeAddr(e.target.value)}
              placeholder="Wallet address (0x...)" className="input" />
            <div className="flex gap-2">
              <button onClick={() => handleFreeze("freeze")}
                disabled={loading || !freezeAddr}
                className="flex-1 btn-outline-red">
                Freeze
              </button>
              <button onClick={() => handleFreeze("unfreeze")}
                disabled={loading || !freezeAddr}
                className="flex-1 btn-outline-green">
                Unfreeze
              </button>
            </div>
            {freezeStatus && (
              <p className={freezeStatus.type === "success" ? "status-msg-success" : "status-msg-error"}>
                {freezeStatus.msg}
              </p>
            )}
          </div>
        </Card>

        {/* Pause / Unpause */}
        <Card>
          <h3 className="card-title">Token Pause Control</h3>
          <div className="flex items-center justify-between mb-4 bg-surface-3/50 rounded-lg px-4 py-3">
            <span className="text-sm text-text-muted">Current Status</span>
            <span className={`text-sm font-medium flex items-center gap-2 ${isPaused ? "text-bond-red" : "text-bond-green"}`}>
              <span className={`w-2 h-2 rounded-full ${isPaused ? "bg-bond-red" : "bg-bond-green animate-pulse-dot"}`} />
              {isPaused ? "Paused" : "Active"}
            </span>
          </div>
          <button onClick={handlePauseToggle} disabled={loading}
            className={`w-full ${isPaused ? "btn-outline-green" : "btn-outline-red"}`}>
            {isPaused ? "Unpause Token" : "Pause Token"}
          </button>
          {pauseStatus && (
            <p className={`mt-2 ${pauseStatus.type === "success" ? "status-msg-success" : "status-msg-error"}`}>
              {pauseStatus.msg}
            </p>
          )}
        </Card>

        {/* Proceeds Allocation */}
        <Card>
          <h3 className="card-title">Allocate Proceeds</h3>
          <div className="space-y-3">
            <label className="sr-only" htmlFor="project-name">Project name</label>
            <input id="project-name" type="text" value={project} onChange={(e) => setProject(e.target.value)}
              placeholder="Project name" className="input" />
            <label className="sr-only" htmlFor="project-category">Category</label>
            <select id="project-category" value={category} onChange={(e) => setCategory(e.target.value)} className="input">
              <option>Renewable Energy</option>
              <option>Energy Efficiency</option>
              <option>Clean Transportation</option>
              <option>Sustainable Water</option>
              <option>Green Buildings</option>
            </select>
            <label className="sr-only" htmlFor="proceeds-amount">Amount in USD</label>
            <input id="proceeds-amount" type="number" value={proceedsAmount} onChange={(e) => setProceedsAmount(e.target.value)}
              placeholder="Amount (USD)" min="0" className="input" />
            <button onClick={handleAllocateProceeds} disabled={!project || !proceedsAmount}
              className="w-full btn-outline-amber">
              Allocate to HCS
            </button>
            {proceedsStatus && (
              <p className={proceedsStatus.type === "success" ? "status-msg-success" : "status-msg-error"}>
                {proceedsStatus.msg}
              </p>
            )}
          </div>
        </Card>
      </div>

      <ProjectAllocation />
    </div>
  );
}
