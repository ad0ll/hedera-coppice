"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { useConnection } from "@/contexts/ats-context";
import { useTokenRead, useTokenWrite, useIsAgent, useTokenOwner } from "@/hooks/use-token";
import { useHolders } from "@/hooks/use-holders";
import { useHCSAudit } from "@/hooks/use-hcs-audit";
import { IssuerStats } from "@/components/issuer-stats";
import { HoldersTable } from "@/components/holders-table";
import { IssuerActivityFeed } from "@/components/issuer-activity-feed";
import { ProjectAllocation } from "@/components/project-allocation";
import { signAuthMessage } from "@/lib/auth";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { StatusMessage } from "@/components/ui/status-message";
import { StatusBadge } from "@/components/ui/status-badge";
import { ShieldCheckIcon, WarningIcon } from "@/components/ui/icons";
import { useOperationStatus } from "@/hooks/use-operation-status";
import { abbreviateAddress, getErrorMessage } from "@/lib/format";
import { BOND_CATEGORIES, EVENT_TYPES } from "@/lib/event-types";
import { fetchAPI } from "@/lib/api-client";
import { grantAgentRoleResponseSchema } from "@/app/api/demo/grant-agent-role/route";
import { allocateResponseSchema } from "@/app/api/issuer/allocate/route";

export default function IssuerDashboard() {
  const { address } = useConnection();
  const { totalSupply, paused: pausedQuery } = useTokenRead();
  const { mint, pause, unpause, setAddressFrozen, loading } = useTokenWrite();
  const { data: isAuthorized, isLoading: isCheckingAgent, refetch: refetchIsAgent } = useIsAgent(address);
  const { data: tokenOwner } = useTokenOwner();
  const isOwner = address && tokenOwner ? address.toLowerCase() === tokenOwner.toLowerCase() : false;

  // HCS events — used for holders table and activity feed
  const { events: auditEvents, loading: auditLoading } = useHCSAudit("audit");
  const { events: impactEvents } = useHCSAudit("impact");
  const { holders, loading: holdersLoading } = useHolders(auditEvents);

  const isPaused = pausedQuery.data ?? null;
  const supply = totalSupply.data;

  // Calculate total allocated from impact events
  const totalAllocated = impactEvents
    .filter((e) => e.type === EVENT_TYPES.PROCEEDS_ALLOCATED)
    .reduce((sum, e) => sum + parseFloat(e.data.amount || "0"), 0);

  // Form state
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

  const [promoting, setPromoting] = useState(false);
  const promoteOp = useOperationStatus();

  async function handlePromote() {
    if (!address || promoting) return;
    setPromoting(true);
    promoteOp.clear();
    try {
      const { message, signature } = await signAuthMessage(address, "Grant Agent Role");
      await fetchAPI("/api/demo/grant-agent-role", grantAgentRoleResponseSchema, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ investorAddress: address, message, signature }),
      });
      promoteOp.setStatus({ type: "success", msg: "Agent role granted — loading dashboard..." });
      await refetchIsAgent();
    } catch (err: unknown) {
      promoteOp.setStatus({ type: "error", msg: getErrorMessage(err, 80, "Failed") });
    } finally {
      setPromoting(false);
    }
  }

  async function handleMint() {
    if (!mintTo || !mintAmount) return;
    if (!ethers.isAddress(mintTo)) {
      mintOp.setStatus({ type: "error", msg: "Invalid Ethereum address" });
      return;
    }
    mintOp.clear();
    try {
      await mint(mintTo, ethers.parseEther(mintAmount));
      mintOp.setStatus({ type: "success", msg: `Minted ${mintAmount} CPC to ${abbreviateAddress(mintTo, 10, 0)}` });
      setMintTo("");
      setMintAmount("");
    } catch (err: unknown) {
      mintOp.setStatus({ type: "error", msg: getErrorMessage(err, 80, "Mint failed") });
    }
  }

  async function handleFreeze(action: "freeze" | "unfreeze") {
    if (!freezeAddr) return;
    if (!ethers.isAddress(freezeAddr)) {
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
      const { message: authMessage, signature } = await signAuthMessage(address, "Allocate Proceeds");

      await fetchAPI("/api/issuer/allocate", allocateResponseSchema, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project,
          category,
          amount: Number(proceedsAmount),
          currency: "USD",
          signerAddress: address,
          message: authMessage,
          signature,
        }),
      });
      proceedsOp.setStatus({ type: "success", msg: `Allocated $${Number(proceedsAmount).toLocaleString("en-US")} to ${project}` });
      setProject("");
      setProceedsAmount("");
    } catch (err: unknown) {
      proceedsOp.setStatus({ type: "error", msg: getErrorMessage(err, 80, "Failed") });
    }
  }

  // --- Render gates ---

  if (!address) {
    return (
      <EmptyState
        icon={<ShieldCheckIcon className="w-6 h-6 text-text-muted" />}
        title="Issuer Dashboard"
        description="Connect your issuer wallet to manage tokens, view holders, allocate proceeds, and control trading."
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
        icon={<ShieldCheckIcon className="w-6 h-6 text-bond-amber" />}
        title="Become an Issuer"
        description="Grant yourself the agent role to manage tokens, view holders, and control trading. This demonstrates ERC-3643 role-based access control."
        variant="default"
        action={
          <div className="space-y-3 max-w-sm mx-auto">
            <button onClick={handlePromote} disabled={promoting} aria-busy={promoting} className="w-full btn-primary">
              {promoting ? "Granting role..." : "Grant Agent Role"}
            </button>
            <StatusMessage status={promoteOp.status} />
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-bond-amber/8 border border-bond-amber/20 text-left">
              <WarningIcon className="w-4 h-4 text-bond-amber shrink-0 mt-0.5" />
              <p className="text-xs text-bond-amber/90">
                Demo only — in production, agent roles are assigned by the token owner, not self-service.
              </p>
            </div>
          </div>
        }
      />
    );
  }

  // --- Main dashboard ---

  let idx = 0;

  return (
    <div className="space-y-6">
      {!isOwner && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-bond-amber/8 border border-bond-amber/20 animate-entrance" style={{ "--index": idx++ } as React.CSSProperties}>
          <StatusBadge label="Demo" variant="amber" className="text-[10px] uppercase tracking-wider shrink-0 mt-0.5" />
          <p className="text-xs text-text-muted">
            You have the agent role for this demo session. In production, agent roles are managed by the token owner.
          </p>
        </div>
      )}

      <h1 className="page-title animate-entrance" style={{ "--index": idx++ } as React.CSSProperties}>Issuer Dashboard</h1>

      {/* Stats Banner */}
      <div className="animate-entrance" style={{ "--index": idx++ } as React.CSSProperties}>
        <IssuerStats totalSupply={supply} isPaused={isPaused} holders={holders} totalAllocated={totalAllocated} />
      </div>

      {/* Holders Table */}
      <div className="animate-entrance" style={{ "--index": idx++ } as React.CSSProperties}>
        <HoldersTable holders={holders} loading={holdersLoading} />
      </div>

      {/* Operation Cards — 2x2 grid */}
      <div className="space-y-4">
        <p className="stat-label animate-entrance" style={{ "--index": idx++ } as React.CSSProperties}>Operations</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mint */}
          <div className="animate-entrance" style={{ "--index": idx++ } as React.CSSProperties}>
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

          {/* Allocate Proceeds — visible to all agents */}
          <div className="animate-entrance" style={{ "--index": idx++ } as React.CSSProperties}>
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

          {/* Freeze/Unfreeze */}
          <div className="animate-entrance" style={{ "--index": idx++ } as React.CSSProperties}>
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

          {/* Pause Control */}
          <div className="animate-entrance" style={{ "--index": idx++ } as React.CSSProperties}>
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

      {/* Use of Proceeds */}
      <div className="animate-entrance" style={{ "--index": idx++ } as React.CSSProperties}>
        <ProjectAllocation />
      </div>

      {/* Activity Feed */}
      <div className="animate-entrance" style={{ "--index": idx++ } as React.CSSProperties}>
        <IssuerActivityFeed events={auditEvents} loading={auditLoading} />
      </div>
    </div>
  );
}
