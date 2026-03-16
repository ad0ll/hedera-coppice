"use client";

import { useState } from "react";
import { isAddress, parseEther } from "viem";
import { useConnection, useConfig } from "wagmi";
import { useTokenRead, useTokenWrite, useIsAgent } from "@/hooks/use-token";
import { ProjectAllocation } from "@/components/project-allocation";
import { signAuthMessage } from "@/lib/auth";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { StatusMessage } from "@/components/ui/status-message";
import { ShieldCheckIcon, ProhibitIcon } from "@/components/ui/icons";
import { useOperationStatus } from "@/hooks/use-operation-status";
import { abbreviateAddress, getErrorMessage } from "@/lib/format";
import { BOND_CATEGORIES } from "@/lib/event-types";

export default function IssuerDashboard() {
  const { address } = useConnection();
  const config = useConfig();
  const { paused: pausedQuery } = useTokenRead();
  const { mint, pause, unpause, setAddressFrozen, loading } = useTokenWrite();
  const { data: isAuthorized, isLoading: isCheckingAgent } = useIsAgent(address);

  const isPaused = pausedQuery.data ?? null;

  const [mintTo, setMintTo] = useState("");
  const [mintAmount, setMintAmount] = useState("");
  const mintOp = useOperationStatus();

  const [freezeAddr, setFreezeAddr] = useState("");
  const freezeOp = useOperationStatus();

  const pauseOp = useOperationStatus();

  const [project, setProject] = useState("");
  const [category, setCategory] = useState("Renewable Energy");
  const [proceedsAmount, setProceedsAmount] = useState("");
  const proceedsOp = useOperationStatus();

  async function handleMint() {
    if (!mintTo || !mintAmount) return;
    if (!isAddress(mintTo)) {
      mintOp.setStatus({ type: "error", msg: "Invalid Ethereum address" });
      return;
    }
    mintOp.clear();
    try {
      await mint(mintTo, parseEther(mintAmount));
      mintOp.setStatus({ type: "success", msg: `Minted ${mintAmount} CPC to ${abbreviateAddress(mintTo, 10, 0)}` });
      setMintTo("");
      setMintAmount("");
    } catch (err: unknown) {
      mintOp.setStatus({ type: "error", msg: getErrorMessage(err, 80, "Mint failed") });
    }
  }

  async function handleFreeze(action: "freeze" | "unfreeze") {
    if (!freezeAddr) return;
    if (!isAddress(freezeAddr)) {
      freezeOp.setStatus({ type: "error", msg: "Invalid Ethereum address" });
      return;
    }
    freezeOp.clear();
    try {
      await setAddressFrozen(freezeAddr, action === "freeze");
      freezeOp.setStatus({
        type: "success",
        msg: `${action === "freeze" ? "Froze" : "Unfroze"} ${abbreviateAddress(freezeAddr, 10, 0)}`,
      });
    } catch (err: unknown) {
      freezeOp.setStatus({ type: "error", msg: getErrorMessage(err, 80, "Failed") });
    }
  }

  async function handlePauseToggle() {
    pauseOp.clear();
    try {
      if (isPaused) {
        await unpause();
        pauseOp.setStatus({ type: "success", msg: "Token unpaused" });
      } else {
        await pause();
        pauseOp.setStatus({ type: "success", msg: "Token paused" });
      }
    } catch (err: unknown) {
      pauseOp.setStatus({ type: "error", msg: getErrorMessage(err, 80, "Failed") });
    }
  }

  async function handleAllocateProceeds() {
    if (!project || !proceedsAmount || !address) return;
    proceedsOp.clear();
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
      proceedsOp.setStatus({ type: "success", msg: `Allocated $${Number(proceedsAmount).toLocaleString("en-US")} to ${project} (submitted to HCS)` });
      setProject("");
      setProceedsAmount("");
    } catch (err: unknown) {
      proceedsOp.setStatus({ type: "error", msg: getErrorMessage(err, 80, "Failed") });
    }
  }

  if (!address) {
    return (
      <EmptyState
        icon={<ShieldCheckIcon className="w-6 h-6 text-text-muted" />}
        title="Issuer Dashboard"
        description="Connect your issuer wallet to mint tokens, allocate proceeds, freeze wallets, and pause trading."
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
        icon={<ProhibitIcon className="w-6 h-6 text-bond-red" />}
        title="Not Authorized"
        description="Only the bond issuer can access this dashboard."
      />
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="page-title animate-entrance" style={{ "--index": 0 } as React.CSSProperties}>Issuer Dashboard</h1>

      <div className="space-y-4">
        <p className="stat-label animate-entrance" style={{ "--index": 1 } as React.CSSProperties}>Token Operations</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="animate-entrance" style={{ "--index": 2 } as React.CSSProperties}>
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
                <StatusMessage status={mintOp.status} />
              </div>
            </Card>
          </div>

          <div className="animate-entrance" style={{ "--index": 3 } as React.CSSProperties}>
            <Card>
              <h3 className="card-title">Allocate Proceeds</h3>
              <div className="space-y-3">
                <label className="sr-only" htmlFor="project-name">Project name</label>
                <input id="project-name" type="text" value={project} onChange={(e) => setProject(e.target.value)}
                  placeholder="Project name" className="input" />
                <label className="sr-only" htmlFor="project-category">Category</label>
                <select id="project-category" value={category} onChange={(e) => setCategory(e.target.value)} className="input">
                  {BOND_CATEGORIES.map((cat) => <option key={cat}>{cat}</option>)}
                </select>
                <label className="sr-only" htmlFor="proceeds-amount">Amount in USD</label>
                <input id="proceeds-amount" type="number" value={proceedsAmount} onChange={(e) => setProceedsAmount(e.target.value)}
                  placeholder="Amount (USD)" min="0" className="input" />
                <button onClick={handleAllocateProceeds} disabled={!project || !proceedsAmount}
                  className="w-full btn-outline-amber">
                  Record Allocation
                </button>
                <StatusMessage status={proceedsOp.status} />
              </div>
            </Card>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <p className="stat-label animate-entrance" style={{ "--index": 4 } as React.CSSProperties}>Risk Controls</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="animate-entrance" style={{ "--index": 5 } as React.CSSProperties}>
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
                <StatusMessage status={freezeOp.status} />
              </div>
            </Card>
          </div>

          <div className="animate-entrance" style={{ "--index": 6 } as React.CSSProperties}>
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
              <StatusMessage status={pauseOp.status} className="mt-2" />
            </Card>
          </div>
        </div>
      </div>

      <div className="animate-entrance" style={{ "--index": 7 } as React.CSSProperties}>
        <ProjectAllocation />
      </div>
    </div>
  );
}
