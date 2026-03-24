"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { useConnection } from "@/contexts/ats-context";
import { useTokenRead, useTokenWrite, useIsAgent, useIsAdmin } from "@/hooks/use-token";
import { useHolders } from "@/hooks/use-holders";
import { IssuerStats } from "@/components/issuer-stats";
import { HoldersTable } from "@/components/holders-table";
import { AuditEventFeed } from "@/components/audit-event-feed";
import { GuardianEvents } from "@/components/guardian/guardian-events";
import { COUPON_STATUS_VARIANT, COUPON_STATUS_LABEL } from "@/lib/event-types";
import { ProjectAllocation } from "@/components/project-allocation";
import { CreateCouponCard } from "@/components/issuer/create-coupon-card";
import { RegisterProjectCard } from "@/components/issuer/register-project-card";
import { signAuthMessage } from "@/lib/auth";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { StatusMessage } from "@/components/ui/status-message";
import { StatusBadge } from "@/components/ui/status-badge";
import { ShieldCheckIcon, WarningIcon } from "@/components/ui/icons";
import { TxLink } from "@/components/ui/hashscan-link";
import { useOperationStatus } from "@/hooks/use-operation-status";
import { abbreviateAddress, formatNumber, getErrorMessage } from "@/lib/format";
import { fetchAPI } from "@/lib/api-client";
import { grantAgentRoleResponseSchema } from "@/app/api/demo/grant-agent-role/route";
import { allocateResponseSchema } from "@/app/api/issuer/allocate/route";
import { distributeResponseSchema } from "@/app/api/issuer/distribute-coupon/route";
import { useQueryClient } from "@tanstack/react-query";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { useCoupons } from "@/hooks/use-coupons";
import { useGuardian } from "@/hooks/use-guardian";
import { SptStatus } from "@/components/guardian/spt-status";
import { SectionErrorBoundary } from "@/components/section-error-boundary";
import { entranceProps } from "@/lib/animation";
import { getMinimumCouponRate } from "@/lib/spt-enforcement";

export default function IssuerDashboard() {
  const queryClient = useQueryClient();
  const { address } = useConnection();
  const { totalSupply, paused: pausedQuery } = useTokenRead();
  const { mint, pause, unpause, setAddressFrozen, loading } = useTokenWrite();
  const { data: isAuthorized, isLoading: isCheckingAgent, refetch: refetchIsAgent } = useIsAgent(address);
  const { data: isAdmin } = useIsAdmin(address);
  const isOwner = isAdmin ?? false;

  const DEPLOYER_ADDRESS = "0xeb974ba96c4912499c3b3bbd5a40617e1f6eecee";
  const isDeployer = address?.toLowerCase() === DEPLOYER_ADDRESS;

  const { holders, loading: holdersLoading } = useHolders();

  const isPaused = pausedQuery.data ?? null;
  const supply = totalSupply.data;

  // Form state — only for cards that remain inline
  const [mintTo, setMintTo] = useState("");
  const [mintAmount, setMintAmount] = useState("");
  const mintOp = useOperationStatus();

  const [freezeAddr, setFreezeAddr] = useState("");
  const freezeOp = useOperationStatus();

  const pauseOp = useOperationStatus();

  const [project, setProject] = useState("");
  const [proceedsAmount, setProceedsAmount] = useState("");
  const proceedsOp = useOperationStatus();

  const [selectedCouponId, setSelectedCouponId] = useState<number | null>(null);
  const [distributing, setDistributing] = useState(false);
  const distributeOp = useOperationStatus();
  const [lastDistributeTx, setLastDistributeTx] = useState<string | null>(null);
  const { data: coupons = [] } = useCoupons();
  const selectedCoupon = coupons.find((c) => c.id === selectedCouponId) ?? null;

  const { data: guardianData } = useGuardian();
  const totalAllocated = guardianData?.totalAllocatedEUSD ?? 0;
  const [eventTab, setEventTab] = useState<"onchain" | "guardian">("onchain");

  // Compute SPT-enforced minimum coupon rate from bond framework
  const sptRateInfo = guardianData?.bondFramework
    ? getMinimumCouponRate({
        couponRate: guardianData.bondFramework.CouponRate,
        stepUpBps: guardianData.bondFramework.CouponStepUpBps,
        sptMet: guardianData.sptMet,
      })
    : null;

  // Derive eligible categories from bond framework
  const eligibleCategories = (guardianData?.bondFramework?.EligibleICMACategories ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

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
        body: JSON.stringify({ message, signature }),
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
      mintOp.setStatus({ type: "success", msg: `Issued ${mintAmount} CPC to ${abbreviateAddress(mintTo, 10, 0)}` });
      setMintTo("");
      setMintAmount("");
      queryClient.invalidateQueries({ queryKey: ["token", "totalSupply"] });
      queryClient.invalidateQueries({ queryKey: ["token", "balanceOf"] });
      queryClient.invalidateQueries({ queryKey: ["holders"] });
      queryClient.invalidateQueries({ queryKey: ["contract-events"] });
    } catch (err: unknown) {
      mintOp.setStatus({ type: "error", msg: getErrorMessage(err, 80, "Issuance failed") });
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
      queryClient.invalidateQueries({ queryKey: ["holders"] });
      queryClient.invalidateQueries({ queryKey: ["token", "isFrozen"] });
      queryClient.invalidateQueries({ queryKey: ["contract-events"] });
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
      await pausedQuery.refetch();
      queryClient.invalidateQueries({ queryKey: ["token", "paused"] });
      queryClient.invalidateQueries({ queryKey: ["contract-events"] });
    } catch (err: unknown) {
      pauseOp.setStatus({ type: "error", msg: getErrorMessage(err, 80, "Failed") });
    }
  }

  async function handleAllocateProceeds() {
    if (!project || !proceedsAmount || !address) return;
    const selectedProject = guardianData?.projects.find((p) => p.registration.ProjectName === project);
    const category = selectedProject?.registration.ICMACategory ?? "Renewable Energy";
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
          message: authMessage,
          signature,
        }),
      });
      proceedsOp.setStatus({ type: "success", msg: `Allocated $${formatNumber(Number(proceedsAmount))} to ${project}` });
      setProject("");
      setProceedsAmount("");
      queryClient.invalidateQueries({ queryKey: ["guardian-data"] });
    } catch (err: unknown) {
      proceedsOp.setStatus({ type: "error", msg: getErrorMessage(err, 80, "Failed") });
    }
  }

  async function handleDistribute() {
    if (selectedCouponId === null || !address || distributing) return;
    distributeOp.clear();
    setLastDistributeTx(null);
    setDistributing(true);
    try {
      const { message: authMessage, signature } = await signAuthMessage(address, "Distribute Coupon");
      const result = await fetchAPI("/api/issuer/distribute-coupon", distributeResponseSchema, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          couponId: selectedCouponId,
          message: authMessage,
          signature,
        }),
      });
      setLastDistributeTx(result.txHash);
      distributeOp.setStatus({ type: "success", msg: `Coupon #${selectedCouponId} distributed successfully.` });
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      queryClient.invalidateQueries({ queryKey: ["eusd-balance"] });
    } catch (err: unknown) {
      distributeOp.setStatus({ type: "error", msg: getErrorMessage(err, 80, "Distribution failed") });
    } finally {
      setDistributing(false);
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
      <div className="card-static p-12 text-center">
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
        description="Grant yourself the agent role to manage tokens, view holders, and control trading. This demonstrates ATS (Asset Tokenization Studio) role-based access control."
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
        <div {...entranceProps(idx++, "flex items-start gap-2 p-3 rounded-lg bg-bond-amber/8 border border-bond-amber/20")}>
          <StatusBadge label="Demo" variant="amber" className="text-[11px] sm:text-xs uppercase tracking-wider shrink-0 mt-0.5" />
          <p className="text-xs text-text-muted">
            You have the agent role for this demo session. In production, agent roles are managed by the token owner.
          </p>
        </div>
      )}

      <h1 {...entranceProps(idx++, "page-title")}>Issuer Dashboard</h1>

      {/* Stats Banner */}
      <div {...entranceProps(idx++)}>
        <SectionErrorBoundary section="issuer stats">
          <IssuerStats totalSupply={supply} isPaused={isPaused} holders={holders} totalAllocated={totalAllocated} />
        </SectionErrorBoundary>
      </div>

      {/* SPT Status */}
      {guardianData && (
        <div {...entranceProps(idx++)}>
          <SptStatus
            totalVerified={guardianData.totalVerifiedCO2e}
            target={guardianData.sptTarget}
            met={guardianData.sptMet}
            projectCount={guardianData.projects.length}
            baseRate={sptRateInfo ? `${sptRateInfo.baseRate}%` : undefined}
            penaltyRate={sptRateInfo ? `${sptRateInfo.penaltyRate}%` : undefined}
          />
        </div>
      )}

      {/* Holders Table */}
      <div {...entranceProps(idx++)}>
        <SectionErrorBoundary section="token holders">
          <HoldersTable holders={holders} loading={holdersLoading} />
        </SectionErrorBoundary>
      </div>

      {/* Use of Proceeds */}
      <div {...entranceProps(idx++)}>
        <ProjectAllocation />
      </div>

      {/* Operation Cards — 2x2 grid */}
      <div className="space-y-4">
        <p {...entranceProps(idx++, "stat-label")}>Operations</p>
        <div className="columns-1 sm:columns-2 gap-6 space-y-6 [&>div]:break-inside-avoid">
          {/* Mint */}
          <div {...entranceProps(idx++)}>
            <Card>
              <h3 className="card-title flex items-center">Issue Tokens<InfoTooltip text="Issues new CPC tokens via ATS ERC-1594 issue(). Recipients must pass KYC and whitelist checks on-chain." /></h3>
              <div className="space-y-3">
                <label className="sr-only" htmlFor="mint-to">Recipient address</label>
                <input id="mint-to" type="text" value={mintTo} onChange={(e) => setMintTo(e.target.value)}
                  placeholder="Recipient address (0x...)" className="input" aria-required="true" />
                <label className="sr-only" htmlFor="mint-amount">Issuance amount</label>
                <input id="mint-amount" type="number" value={mintAmount} onChange={(e) => setMintAmount(e.target.value)}
                  placeholder="Amount (CPC)" min="0" className="input" aria-required="true" />
                <button onClick={handleMint} disabled={loading || !mintTo || !mintAmount}
                  aria-busy={loading} className="w-full btn-primary">
                  {loading ? "Issuing..." : "Issue"}
                </button>
                <StatusMessage status={mintOp.status} />
                <p className="text-xs text-text-muted">Issues new CPC bond tokens to a recipient (issuer operation). Investors purchase CPC with eUSD on the Invest page.</p>
              </div>
            </Card>
          </div>

          {/* Allocate Proceeds — visible to all agents */}
          <div {...entranceProps(idx++)}>
            <Card>
              <h3 className="card-title flex items-center">Allocate Proceeds<InfoTooltip text="Records fund allocation as a Guardian Verifiable Credential for verified use-of-proceeds tracking." /></h3>
              {guardianData && (
                <p className="text-xs text-text-muted -mt-1 mb-2">
                  {formatNumber(totalAllocated)} / {formatNumber(guardianData.totalIssuanceEUSD)} eUSD allocated
                  ({guardianData.allocationPercent}%)
                </p>
              )}
              <div className="space-y-3">
                <label className="sr-only" htmlFor="project-name">Project</label>
                <select
                  id="project-name"
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  className="input"
                  aria-required="true"
                >
                  <option value="">Select a project...</option>
                  {(guardianData?.projects ?? []).map((p) => {
                    const existing = p.allocation?.AllocatedAmountEUSD ?? 0;
                    return (
                      <option key={p.registration.ProjectName} value={p.registration.ProjectName}>
                        {p.registration.ProjectName} — {p.registration.ICMACategory}
                        {existing > 0 ? ` (${formatNumber(existing)} eUSD allocated)` : ""}
                      </option>
                    );
                  })}
                </select>
                <label className="sr-only" htmlFor="proceeds-amount">Amount in eUSD</label>
                <input id="proceeds-amount" type="number" value={proceedsAmount} onChange={(e) => setProceedsAmount(e.target.value)}
                  placeholder="Amount (eUSD)" min="0" className="input" aria-required="true" />
                <button onClick={handleAllocateProceeds} disabled={!project || !proceedsAmount}
                  className="w-full btn-outline-amber">
                  Record Allocation
                </button>
                <p className="text-xs text-text-muted">
                  Submits allocation to Guardian as a Verifiable Credential. Projects must be registered in Guardian before allocating.
                </p>
                <StatusMessage status={proceedsOp.status} />
              </div>
            </Card>
          </div>

          {/* Freeze/Unfreeze */}
          <div {...entranceProps(idx++)}>
            <Card>
              <h3 className="card-title flex items-center">Freeze / Unfreeze Wallet<InfoTooltip text="Restricts a wallet from sending or receiving CPC tokens. An ERC-3643 compliance mechanism." /></h3>
              <div className="space-y-3">
                <label className="sr-only" htmlFor="freeze-addr">Wallet address to freeze/unfreeze</label>
                <input id="freeze-addr" type="text" value={freezeAddr} onChange={(e) => setFreezeAddr(e.target.value)}
                  placeholder="Wallet address (0x...)" className="input" list="holder-addresses" />
                <datalist id="holder-addresses">
                  {holders.map((h) => (
                    <option key={h.address} value={h.address} />
                  ))}
                </datalist>
                <div className="flex gap-2">
                  <button onClick={() => handleFreeze("freeze")}
                    disabled={loading || !freezeAddr || !isDeployer}
                    className="flex-1 btn-outline-red disabled:opacity-50">
                    Freeze
                  </button>
                  <button onClick={() => handleFreeze("unfreeze")}
                    disabled={loading || !freezeAddr}
                    className="flex-1 btn-outline-green">
                    Unfreeze
                  </button>
                </div>
                {!isDeployer && (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-bond-amber/8 border border-bond-amber/20">
                    <WarningIcon className="w-4 h-4 text-bond-amber shrink-0 mt-0.5" />
                    <p className="text-xs text-bond-amber/90">Freeze requires the bond issuer role (DEFAULT_ADMIN). Unfreeze is available to all agents.</p>
                  </div>
                )}
                <StatusMessage status={freezeOp.status} />
              </div>
            </Card>
          </div>

          {/* Pause Control */}
          <div {...entranceProps(idx++)}>
            <Card>
              <h3 className="card-title flex items-center">Token Pause Control<InfoTooltip text="Halts all CPC transfers globally. An ERC-3643 compliance mechanism for regulatory holds." /></h3>
              <div className="flex items-center justify-between mb-4 bg-surface-3/50 rounded-lg px-4 py-3">
                <span className="text-sm text-text-muted">Current Status</span>
                <span className={`text-sm font-medium flex items-center gap-2 ${isPaused ? "text-bond-red" : "text-bond-green"}`}>
                  <span className={`w-2 h-2 rounded-full ${isPaused ? "bg-bond-red" : "bg-bond-green animate-pulse-dot"}`} />
                  {isPaused ? "Paused" : "Active"}
                </span>
              </div>
              <button onClick={handlePauseToggle} disabled={loading || !isDeployer}
                className={`w-full ${isPaused ? "btn-outline-green" : "btn-outline-red"} disabled:opacity-50`}>
                {isPaused ? "Unpause Token" : "Pause Token"}
              </button>
              {!isDeployer && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-bond-amber/8 border border-bond-amber/20 mt-2">
                  <WarningIcon className="w-4 h-4 text-bond-amber shrink-0 mt-0.5" />
                  <p className="text-xs text-bond-amber/90">Pause/unpause requires the bond issuer role (DEFAULT_ADMIN).</p>
                </div>
              )}
              <StatusMessage status={pauseOp.status} className="mt-2" />
            </Card>
          </div>

          {/* Distribute Coupon */}
          <div {...entranceProps(idx++)}>
            <Card>
              <h3 className="card-title flex items-center">Distribute Coupon<InfoTooltip text="Pays coupon to all holders via ATS LifeCycleCashFlow contract. Snapshots balances at record date, distributes in eUSD." /></h3>
              <div className="space-y-3">
                <label className="sr-only" htmlFor="coupon-select">Select coupon</label>
                <select
                  id="coupon-select"
                  value={selectedCouponId ?? ""}
                  onChange={(e) => setSelectedCouponId(e.target.value === "" ? null : Number(e.target.value))}
                  className="input"
                >
                  <option value="">Select a coupon...</option>
                  {coupons
                    .filter((c) => c.snapshotId === 0)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        Coupon #{c.id} — {c.rateDisplay} ({c.status})
                      </option>
                    ))}
                </select>
                <button
                  onClick={handleDistribute}
                  disabled={selectedCouponId === null || selectedCoupon?.status === "upcoming" || distributing}
                  aria-busy={distributing}
                  className="w-full btn-primary"
                >
                  {distributing ? "Distributing..." : "Distribute"}
                </button>
                {selectedCoupon && (
                  <p className="text-xs text-text-muted">
                    {selectedCoupon.status === "upcoming" && `Record date: ${new Date(selectedCoupon.recordDate * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}. Distribution available after execution date.`}
                    {selectedCoupon.status === "record" && `Record date passed. Execution date: ${new Date(selectedCoupon.executionDate * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.`}
                    {selectedCoupon.status === "executable" && "Ready for distribution."}
                    {selectedCoupon.status === "paid" && "This coupon has already been distributed."}
                  </p>
                )}
                <StatusMessage status={distributeOp.status} />
                {lastDistributeTx && distributeOp.status?.type === "success" && (
                  <TxLink hash={lastDistributeTx} label="View on HashScan" className="inline-flex items-center gap-1 text-xs text-bond-green hover:text-bond-green/80 transition-colors" />
                )}
              </div>
            </Card>
          </div>

          {/* Create Coupon — extracted to own component for render isolation */}
          <div {...entranceProps(idx++)}>
            <CreateCouponCard address={address} sptRateInfo={sptRateInfo} />
          </div>

          {/* Register Project — extracted to own component for render isolation */}
          <div {...entranceProps(idx++)}>
            <RegisterProjectCard address={address} eligibleCategories={eligibleCategories} />
          </div>
        </div>
      </div>

      {/* Coupon Activity */}
      {coupons.length > 0 && (
        <section {...entranceProps(idx++)}>
          <h2 className="card-title">Coupon Activity</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {coupons.map((c) => (
              <div key={c.id} className="card-static text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-text text-sm">Coupon #{c.id}</span>
                  <StatusBadge
                    label={COUPON_STATUS_LABEL[c.status] ?? c.status}
                    variant={COUPON_STATUS_VARIANT[c.status] ?? "amber"}
                  />
                </div>
                <div className="space-y-1 text-text-muted">
                  <div className="flex justify-between">
                    <span>Rate</span>
                    <span className="font-mono text-text">{c.rateDisplay}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Period</span>
                    <span className="font-mono text-text">{c.periodDays}d</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Record</span>
                    <span className="font-mono text-text">
                      {new Date(c.recordDate * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Record Status</span>
                    <span className={`font-mono ${c.snapshotId > 0 ? "text-bond-green" : "text-text-muted"}`}>
                      {c.snapshotId > 0 ? "Captured" : "Pending"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Event Feed — On-Chain + Guardian tabs */}
      <div {...entranceProps(idx++)}>
        <div role="tablist" aria-label="Event source" className="flex gap-1 bg-surface-2 rounded-lg p-1 w-fit mb-4">
          <button
            id="tab-onchain"
            role="tab"
            aria-selected={eventTab === "onchain"}
            aria-controls="panel-onchain"
            onClick={() => setEventTab("onchain")}
            className={`px-4 py-2 text-sm rounded-md transition-all duration-200 ${
              eventTab === "onchain" ? "bg-surface-3 text-text font-medium shadow-sm" : "text-text-muted hover:text-text"
            }`}
          >
            On-Chain Events
          </button>
          <button
            id="tab-guardian"
            role="tab"
            aria-selected={eventTab === "guardian"}
            aria-controls="panel-guardian"
            onClick={() => setEventTab("guardian")}
            className={`px-4 py-2 text-sm rounded-md transition-all duration-200 ${
              eventTab === "guardian" ? "bg-surface-3 text-text font-medium shadow-sm" : "text-text-muted hover:text-text"
            }`}
          >
            Guardian Verification
          </button>
        </div>
        <div id={`panel-${eventTab}`} role="tabpanel" aria-labelledby={`tab-${eventTab}`}>
          <div key={eventTab} className="animate-tab-enter">
            <SectionErrorBoundary section="event feed">
              {eventTab === "onchain" ? (
                <AuditEventFeed />
              ) : (
                <GuardianEvents />
              )}
            </SectionErrorBoundary>
          </div>
        </div>
      </div>
    </div>
  );
}
