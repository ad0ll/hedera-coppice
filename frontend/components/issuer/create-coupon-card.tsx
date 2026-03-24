"use client";

import { memo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { StatusMessage } from "@/components/ui/status-message";
import { WarningIcon } from "@/components/ui/icons";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { TxLink } from "@/components/ui/hashscan-link";
import { useOperationStatus } from "@/hooks/use-operation-status";
import { getErrorMessage } from "@/lib/format";
import { signAuthMessage } from "@/lib/auth";
import { fetchAPI } from "@/lib/api-client";
import { createCouponResponseSchema } from "@/app/api/issuer/create-coupon/route";
import type { getMinimumCouponRate } from "@/lib/spt-enforcement";

interface CreateCouponCardProps {
  address: string;
  sptRateInfo: ReturnType<typeof getMinimumCouponRate> | null;
}

export const CreateCouponCard = memo(function CreateCouponCard({
  address,
  sptRateInfo,
}: CreateCouponCardProps) {
  const queryClient = useQueryClient();
  const [couponRate, setCouponRate] = useState("");
  const [couponStartDate, setCouponStartDate] = useState("");
  const [couponRecordDate, setCouponRecordDate] = useState("");
  const [couponExecutionDate, setCouponExecutionDate] = useState("");
  const [couponEndDate, setCouponEndDate] = useState("");
  const [creating, setCreating] = useState(false);
  const createOp = useOperationStatus();
  const [lastTx, setLastTx] = useState<string | null>(null);

  function validateDates(): string | null {
    const now = Date.now();
    if (couponStartDate && new Date(couponStartDate).getTime() <= now) {
      return "Start date must be in the future";
    }
    if (couponStartDate && couponRecordDate && new Date(couponRecordDate) <= new Date(couponStartDate)) {
      return "Record date must be after start date";
    }
    if (couponRecordDate && couponExecutionDate && new Date(couponExecutionDate) <= new Date(couponRecordDate)) {
      return "Execution date must be after record date";
    }
    if (couponStartDate && couponEndDate && new Date(couponEndDate) <= new Date(couponStartDate)) {
      return "End date must be after start date";
    }
    return null;
  }

  const dateError = validateDates();

  async function handleCreate() {
    if (!couponRate || !couponStartDate || !couponRecordDate || !couponExecutionDate || !couponEndDate || creating) return;
    createOp.clear();
    setLastTx(null);
    setCreating(true);
    try {
      const { message: authMessage, signature } = await signAuthMessage(address, "Create Coupon");
      const result = await fetchAPI("/api/issuer/create-coupon", createCouponResponseSchema, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rate: Number(couponRate),
          startDate: new Date(couponStartDate).toISOString(),
          recordDate: new Date(couponRecordDate).toISOString(),
          executionDate: new Date(couponExecutionDate).toISOString(),
          endDate: new Date(couponEndDate).toISOString(),
          address,
          message: authMessage,
          signature,
        }),
      });
      setLastTx(result.txHash);
      createOp.setStatus({ type: "success", msg: `Coupon #${result.couponId} created at ${couponRate}%` });
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      setCouponRate("");
      setCouponStartDate("");
      setCouponRecordDate("");
      setCouponExecutionDate("");
      setCouponEndDate("");
    } catch (err: unknown) {
      createOp.setStatus({ type: "error", msg: getErrorMessage(err, 80, "Create coupon failed") });
    } finally {
      setCreating(false);
    }
  }

  return (
    <Card>
      <h3 className="card-title">Create Coupon</h3>
      <div className="space-y-3">
        {sptRateInfo && (
          <div className={`flex items-start gap-2 p-2.5 rounded-lg border text-left ${
            sptRateInfo.sptMet
              ? "bg-bond-green/8 border-bond-green/20"
              : "bg-bond-amber/8 border-bond-amber/20"
          }`}>
            <WarningIcon className={`w-4 h-4 shrink-0 mt-0.5 ${
              sptRateInfo.sptMet ? "text-bond-green" : "text-bond-amber"
            }`} />
            <p className={`text-xs ${sptRateInfo.sptMet ? "text-bond-green/90" : "text-bond-amber/90"}`}>
              {sptRateInfo.sptMet
                ? `SPT met — base rate ${sptRateInfo.baseRate}% applies.`
                : `SPT not met — minimum rate is ${sptRateInfo.minimumRate}% (${sptRateInfo.baseRate}% + ${Math.round((sptRateInfo.penaltyRate - sptRateInfo.baseRate) * 100)}bps penalty). Enforced by backend.`
              }
            </p>
          </div>
        )}
        <div>
          <label htmlFor="coupon-rate" className="text-xs text-text-muted mb-1 flex items-center">Annual Rate (%)<InfoTooltip text="Coupon rate as annual %. Base: 4.25%. Penalty: 4.50% (25bps step-up if SPT missed)." /></label>
          <input
            id="coupon-rate"
            type="number"
            value={couponRate}
            onChange={(e) => setCouponRate(e.target.value)}
            placeholder={sptRateInfo ? String(sptRateInfo.minimumRate) : "4.25"}
            min={sptRateInfo ? sptRateInfo.minimumRate : 0}
            step="0.01"
            className="input"
          />
        </div>
        <div>
          <label htmlFor="coupon-start" className="text-xs text-text-muted mb-1 flex items-center">
            Start Date
            <InfoTooltip text="When the coupon period begins. Must be in the future." />
          </label>
          <input
            id="coupon-start"
            type="datetime-local"
            value={couponStartDate}
            onChange={(e) => setCouponStartDate(e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label htmlFor="coupon-record" className="text-xs text-text-muted mb-1 flex items-center">
            Record Date
            <InfoTooltip text="Cutoff for determining holders. Must be after start date." />
          </label>
          <input
            id="coupon-record"
            type="datetime-local"
            value={couponRecordDate}
            onChange={(e) => setCouponRecordDate(e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label htmlFor="coupon-execution" className="text-xs text-text-muted mb-1 flex items-center">
            Execution Date
            <InfoTooltip text="When distribution can be executed. Must be after record date." />
          </label>
          <input
            id="coupon-execution"
            type="datetime-local"
            value={couponExecutionDate}
            onChange={(e) => setCouponExecutionDate(e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label htmlFor="coupon-end" className="text-xs text-text-muted mb-1 flex items-center">
            End Date
            <InfoTooltip text="End of the coupon period. Must be after start date." />
          </label>
          <input
            id="coupon-end"
            type="datetime-local"
            value={couponEndDate}
            onChange={(e) => setCouponEndDate(e.target.value)}
            className="input"
          />
        </div>
        {dateError && (
          <p className="text-xs text-bond-red">{dateError}</p>
        )}
        <button
          onClick={handleCreate}
          disabled={!couponRate || !couponStartDate || !couponRecordDate || !couponExecutionDate || !couponEndDate || creating || !!dateError}
          aria-busy={creating}
          className="w-full btn-primary"
        >
          {creating ? "Creating..." : "Create Coupon"}
        </button>
        <p className="text-xs text-text-muted">Creates a new coupon period on the bond contract. Requires CORPORATE_ACTION role (executed by deployer).</p>
        <StatusMessage status={createOp.status} />
        {lastTx && createOp.status?.type === "success" && (
          <TxLink hash={lastTx} label="View on HashScan" className="inline-flex items-center gap-1 text-xs text-bond-green hover:text-bond-green/80 transition-colors" />
        )}
      </div>
    </Card>
  );
});
