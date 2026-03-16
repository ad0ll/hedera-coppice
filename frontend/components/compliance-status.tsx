"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { zeroAddress, parseEther } from "viem";
import { useConnection, useConfig } from "wagmi";
import { usePublicClient } from "wagmi";
import { useIdentity } from "@/hooks/use-identity";
import { useCompliance } from "@/hooks/use-compliance";
import { signAuthMessage } from "@/lib/auth";
import { countryRestrictModuleAbi } from "@coppice/common";
import { CONTRACT_ADDRESSES, COUNTRY_RESTRICT_MODULE_ADDRESS } from "@/lib/constants";
import { COUNTRY_NAMES } from "@/lib/event-types";
import { getErrorMessage } from "@/lib/format";
import { CheckIcon, XIcon, Spinner, WarningIcon } from "@/components/ui/icons";
import type { OnboardEvent } from "@/app/api/onboard/route";

interface CheckResult {
  label: string;
  status: "pass" | "fail" | "loading";
  detail?: string;
}

/** Countries available for demo onboarding. Sorted by label for the dropdown. */
const ONBOARD_COUNTRIES = Object.entries(COUNTRY_NAMES)
  .map(([code, name]) => ({ code: Number(code), name }))
  .sort((a, b) => a.name.localeCompare(b.name));

/** Steps in the onboarding flow, shown progressively via SSE. */
const ONBOARD_STEP_KEYS = [
  "deployIdentity",
  "registerIdentity",
  "claimKYC",
  "claimAML",
  "claimAccredited",
] as const;

const ONBOARD_STEP_LABELS: Record<string, string> = {
  deployIdentity: "Deploy identity contract",
  registerIdentity: "Register in identity registry",
  claimKYC: "Issue KYC claim",
  claimAML: "Issue AML claim",
  claimAccredited: "Issue Accredited claim",
};

type OnboardStepStatus = "pending" | "active" | "success" | "error";

interface OnboardStep {
  key: string;
  label: string;
  status: OnboardStepStatus;
  txHash?: string;
}

interface OnboardResult {
  identityAddress: string;
  transactions: Record<string, string>;
}

function makeInitialSteps(): OnboardStep[] {
  return ONBOARD_STEP_KEYS.map((key) => ({
    key,
    label: ONBOARD_STEP_LABELS[key],
    status: "pending" as OnboardStepStatus,
  }));
}

export function ComplianceStatus({ onEligibilityChange }: { onEligibilityChange?: (eligible: boolean) => void }) {
  const { address } = useConnection();
  const config = useConfig();
  const publicClient = usePublicClient();
  const { isVerified, isRegistered, getCountry } = useIdentity();
  const { canTransfer } = useCompliance();
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [eligible, setEligible] = useState(false);

  // Demo onboarding state
  const [selectedCountry, setSelectedCountry] = useState(840);
  const [onboarding, setOnboarding] = useState(false);
  const [onboardSteps, setOnboardSteps] = useState<OnboardStep[]>([]);
  const [onboardResult, setOnboardResult] = useState<OnboardResult | null>(null);
  const [onboardError, setOnboardError] = useState<string | null>(null);
  const runChecksRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!address) return;

    async function runChecks() {
      if (!address) return;

      const results: CheckResult[] = [
        { label: "Identity Registered", status: "loading" },
        { label: "KYC / AML / Accredited", status: "loading" },
        { label: "Jurisdiction Check", status: "loading" },
        { label: "Compliance Module", status: "loading" },
      ];
      setChecks([...results]);

      const registered = await isRegistered(address);
      results[0] = {
        label: "Identity Registered",
        status: registered ? "pass" : "fail",
        detail: registered ? "ONCHAINID linked" : "No identity found",
      };
      setChecks([...results]);

      if (!registered) {
        results[1] = { label: "KYC / AML / Accredited", status: "fail", detail: "Not registered" };
        results[2] = { label: "Jurisdiction Check", status: "fail", detail: "Not registered" };
        results[3] = { label: "Compliance Module", status: "fail", detail: "Not registered" };
        setChecks([...results]);
        setEligible(false);
        onEligibilityChange?.(false);
        return;
      }

      // Checks 2-4 are independent once registration is confirmed — run in parallel
      const [verified, countryResult, transferAllowed] = await Promise.all([
        isVerified(address),
        (async () => {
          const country = await getCountry(address);
          let isRestricted = false;
          let countryCheckFailed = false;
          if (publicClient && country > 0) {
            try {
              isRestricted = await publicClient.readContract({
                address: COUNTRY_RESTRICT_MODULE_ADDRESS,
                abi: countryRestrictModuleAbi,
                functionName: "isCountryRestricted",
                args: [CONTRACT_ADDRESSES.compliance, country],
              // Typecast required: readContract returns unknown when ABI is imported as const from external package
              }) as boolean;
            } catch {
              countryCheckFailed = true;
            }
          }
          return { country, isRestricted, countryCheckFailed };
        })(),
        canTransfer(zeroAddress, address, parseEther("1")),
      ]);

      results[1] = {
        label: "KYC / AML / Accredited",
        status: verified ? "pass" : "fail",
        detail: verified ? "All claims verified" : "Missing required claims",
      };

      const { country, isRestricted, countryCheckFailed } = countryResult;
      const countryLabel = COUNTRY_NAMES[country] || `Code ${country}`;
      results[2] = {
        label: "Jurisdiction Check",
        status: countryCheckFailed ? "fail" : isRestricted ? "fail" : "pass",
        detail: countryCheckFailed
          ? `${countryLabel} - Could not verify (try again)`
          : isRestricted
            ? `${countryLabel} - Restricted`
            : `${countryLabel} - Approved`,
      };

      results[3] = {
        label: "Compliance Module",
        status: transferAllowed ? "pass" : "fail",
        detail: transferAllowed ? "Transfer permitted" : "Transfer blocked by compliance",
      };
      setChecks([...results]);

      const allPass = results.every((r) => r.status === "pass");
      setEligible(allPass);
      onEligibilityChange?.(allPass);
    }

    runChecksRef.current = runChecks;
    runChecks();
    const interval = setInterval(runChecks, 15000);
    return () => {
      clearInterval(interval);
      runChecksRef.current = null;
      setChecks([]);
      setEligible(false);
      onEligibilityChange?.(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isVerified, isRegistered, getCountry, canTransfer are useCallback-wrapped with [publicClient] deps, so they are stable when publicClient is stable
  }, [address, publicClient, onEligibilityChange]);

  const handleOnboard = useCallback(async () => {
    if (!address || onboarding) return;

    setOnboarding(true);
    setOnboardError(null);
    setOnboardResult(null);

    const steps = makeInitialSteps();
    setOnboardSteps([...steps]);

    try {
      const { message, signature } = await signAuthMessage(config, address, "Demo Onboarding");

      const res = await fetch("/api/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          investorAddress: address,
          country: selectedCountry,
          message,
          signature,
        }),
      });

      // Non-streaming error responses (validation, auth, already registered)
      if (res.headers.get("content-type")?.includes("application/json")) {
        const data = await res.json();
        throw new Error(data.error || "Onboarding failed");
      }

      if (!res.body) {
        throw new Error("No response stream");
      }

      // Read SSE stream
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const chunk of lines) {
          const dataLine = chunk.trim();
          if (!dataLine.startsWith("data: ")) continue;
          const json = dataLine.slice(6);

          let event: OnboardEvent;
          try {
            event = JSON.parse(json);
          } catch {
            continue;
          }

          if (event.type === "step") {
            const stepIndex = steps.findIndex((s) => s.key === event.step);
            if (stepIndex >= 0) {
              if (event.txHash) {
                // Step completed
                steps[stepIndex] = {
                  ...steps[stepIndex],
                  label: event.label ?? steps[stepIndex].label,
                  status: "success",
                  txHash: event.txHash,
                };
                // Activate next pending step
                const nextPending = steps.findIndex((s) => s.status === "pending");
                if (nextPending >= 0) {
                  steps[nextPending] = { ...steps[nextPending], status: "active" };
                }
              } else {
                // Step started
                steps[stepIndex] = {
                  ...steps[stepIndex],
                  label: event.label ?? steps[stepIndex].label,
                  status: "active",
                };
              }
              setOnboardSteps([...steps]);
            }
          } else if (event.type === "complete") {
            // Mark all steps as success (in case any were missed)
            for (const s of steps) {
              if (s.status !== "success") s.status = "success";
            }
            setOnboardSteps([...steps]);

            if (event.identityAddress && event.transactions) {
              setOnboardResult({
                identityAddress: event.identityAddress,
                transactions: event.transactions,
              });
            }
            // Trigger immediate compliance re-check
            setTimeout(() => runChecksRef.current?.(), 500);
          } else if (event.type === "error") {
            const failIndex = steps.findIndex((s) => s.status === "active");
            if (failIndex >= 0) {
              steps[failIndex] = { ...steps[failIndex], status: "error" };
            }
            setOnboardSteps([...steps]);
            setOnboardError(event.error ?? "Onboarding failed");
          }
        }
      }
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 100, "Onboarding failed");
      setOnboardError(msg);
    } finally {
      setOnboarding(false);
    }
  }, [address, config, onboarding, selectedCountry]);

  if (!address) {
    return (
      <div className="card">
        <h3 className="card-title">Compliance Status</h3>
        <p className="text-text-muted text-sm">Connect your wallet to check compliance status.</p>
      </div>
    );
  }

  const allDone = checks.length > 0 && checks.every((c) => c.status !== "loading");
  const passCount = checks.filter((c) => c.status === "pass").length;
  const showOnboarding = allDone && !eligible && !onboardResult;
  const showOnboardResult = onboardSteps.length > 0;

  return (
    <div className="card-flush">
      <div className={`px-6 py-4 border-b border-border/50 flex items-center justify-between ${
        allDone && eligible ? "bg-gradient-to-r from-bond-green/8 to-transparent" : allDone ? "bg-gradient-to-r from-bond-red/8 to-transparent" : ""
      }`}>
        <h3 className="text-lg font-semibold text-white">Compliance Status</h3>
        {allDone && (
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${
            eligible ? "bg-bond-green/15 text-bond-green" : "bg-bond-red/15 text-bond-red"
          }`}>
            {eligible ? "Eligible to Invest" : "Not Eligible"}
          </span>
        )}
        {!allDone && checks.length > 0 && (
          <span className="text-xs text-text-muted">{passCount}/{checks.length} checks</span>
        )}
      </div>
      <div className="px-6 py-4 space-y-1" aria-live="polite" aria-atomic="true">
        {checks.map((check) => (
          <div key={check.label} className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 flex items-center justify-center">
                {check.status === "loading" ? (
                  <Spinner aria-label="Checking" />
                ) : check.status === "pass" ? (
                  <CheckIcon className="w-5 h-5 text-bond-green" />
                ) : (
                  <XIcon className="w-5 h-5 text-bond-red" />
                )}
              </div>
              <span className="text-sm text-white">{check.label}</span>
            </div>
            {check.detail && (
              <span className={`text-xs ${check.status === "pass" ? "text-text-muted" : "text-bond-red/80"}`}>
                {check.detail}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Demo onboarding — shown when compliance checks fail and user hasn't onboarded yet */}
      {showOnboarding && (
        <div className="px-6 py-6 border-t border-border/50 bg-surface-2/40">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-bond-amber/15 text-bond-amber font-medium">
              Demo
            </span>
            <span className="text-xs text-text-muted">
              Register an on-chain identity to experience the full purchase flow.
            </span>
          </div>

          {!onboarding && (
            <>
              <div className="flex gap-3 items-end mb-3">
                <div className="flex-1">
                  <label htmlFor="onboard-country" className="sr-only">Select jurisdiction</label>
                  <select
                    id="onboard-country"
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(Number(e.target.value))}
                    className="input w-full text-sm"
                  >
                    {ONBOARD_COUNTRIES.map(({ code, name }) => (
                      <option key={code} value={code}>
                        {name} ({code}){code === 999 ? " — Restricted" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleOnboard}
                  className="btn-outline-amber px-4 whitespace-nowrap"
                >
                  Register Identity
                </button>
              </div>

              {selectedCountry === 999 && (
                <div className="flex items-start gap-2 mb-3 p-2.5 rounded-lg bg-bond-amber/8 border border-bond-amber/20">
                  <WarningIcon className="w-4 h-4 text-bond-amber shrink-0 mt-0.5" />
                  <p className="text-xs text-bond-amber/90">
                    Narnia is a restricted jurisdiction. Your identity will be registered but the jurisdiction check will still fail.
                    This demonstrates how ERC-3643 country restrictions work. Choose a non-restricted country to complete the full purchase flow.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Progressive onboarding steps — visible during and after onboarding */}
      {showOnboardResult && (
        <div className="px-6 py-4 border-t border-border/50 bg-surface-2/40" aria-live="polite">
          {!showOnboarding && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-bond-amber/15 text-bond-amber font-medium">
                Demo
              </span>
              <span className="text-xs text-text-muted">
                On-chain identity registration
              </span>
            </div>
          )}

          <div className="space-y-0.5">
            {onboardSteps.map((step) => (
              <div key={step.key} className="flex items-center gap-3 py-2">
                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  {step.status === "pending" && (
                    <div className="w-2 h-2 rounded-full bg-text-muted/30" />
                  )}
                  {step.status === "active" && (
                    <Spinner variant="amber" aria-label="Processing" />
                  )}
                  {step.status === "success" && (
                    <CheckIcon className="w-5 h-5 text-bond-green" />
                  )}
                  {step.status === "error" && (
                    <XIcon className="w-5 h-5 text-bond-red" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm ${
                    step.status === "pending" ? "text-text-muted/40" :
                    step.status === "error" ? "text-bond-red" :
                    "text-white"
                  }`}>
                    {step.label}
                  </span>
                </div>
                {step.txHash && (
                  <a
                    href={`https://hashscan.io/testnet/transaction/${step.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-mono text-text-muted hover:text-bond-green transition-colors shrink-0"
                    title={step.txHash}
                  >
                    {step.txHash.slice(0, 8)}...
                  </a>
                )}
              </div>
            ))}
          </div>

          {onboardResult && (
            <div className="mt-3 pt-3 border-t border-border/30">
              <a
                href={`https://hashscan.io/testnet/contract/${onboardResult.identityAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-bond-green hover:text-bond-green/80 transition-colors"
              >
                <CheckIcon className="w-3.5 h-3.5" />
                View identity contract on HashScan
              </a>
            </div>
          )}

          {onboardError && (
            <p className="text-xs text-bond-red mt-3">{onboardError}</p>
          )}
        </div>
      )}
    </div>
  );
}
