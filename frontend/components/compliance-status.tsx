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

interface CheckResult {
  label: string;
  status: "pass" | "fail" | "loading";
  detail?: string;
}

/** Countries available for demo onboarding. Sorted by label for the dropdown. */
const ONBOARD_COUNTRIES = Object.entries(COUNTRY_NAMES)
  .map(([code, name]) => ({ code: Number(code), name }))
  .sort((a, b) => a.name.localeCompare(b.name));

/** Format camelCase transaction keys to human-readable labels */
function formatTxLabel(key: string): string {
  return key
    // Insert space before uppercase runs: "claimKYC" → "claim KYC", "deployIdentity" → "deploy Identity"
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

interface OnboardResult {
  identityAddress: string;
  transactions: Record<string, string>;
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
  const [onboardResult, setOnboardResult] = useState<OnboardResult | null>(null);
  const [onboardError, setOnboardError] = useState<string | null>(null);
  const runChecksRef = useRef<(() => void) | null>(null);
  const minDelay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

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
      await minDelay(300);

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

      let data: { success?: boolean; error?: string; identityAddress?: string; transactions?: Record<string, string> };
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server error (${res.status})`);
      }

      if (!res.ok) {
        throw new Error(data.error || "Onboarding failed");
      }

      if (data.identityAddress && data.transactions) {
        setOnboardResult({
          identityAddress: data.identityAddress,
          transactions: data.transactions,
        });
      }

      // Trigger immediate compliance re-check
      setTimeout(() => runChecksRef.current?.(), 500);
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 100, "Onboarding failed");
      setOnboardError(msg);
    } finally {
      setOnboarding(false);
    }
  }, [address, config, onboarding, selectedCountry]);

  if (!address) {
    return (
      <div className="card-flush">
        <div className="px-6 py-4 border-b border-border/50">
          <h3 className="text-lg font-semibold text-white">Compliance Status</h3>
        </div>
        <div className="px-6 py-4 space-y-1">
          {["Identity Registered", "KYC / AML / Accredited", "Jurisdiction Check", "Compliance Module"].map((label) => (
            <div key={label} className="flex items-center gap-3 py-2.5 border-b border-border/30 last:border-0 opacity-40">
              <div className="w-5 h-5 rounded-full bg-surface-3" />
              <span className="text-sm text-text-muted">{label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const allDone = checks.length > 0 && checks.every((c) => c.status !== "loading");
  const passCount = checks.filter((c) => c.status === "pass").length;

  return (
    <div className="card-flush">
      <div className={`px-6 py-4 border-b border-border/50 flex items-center justify-between transition-all duration-300 ${
        allDone && eligible ? "bg-gradient-to-r from-bond-green/8 to-transparent" : allDone ? "bg-gradient-to-r from-bond-red/8 to-transparent" : ""
      }`}>
        <h3 className="text-lg font-semibold text-white">Compliance Status</h3>
        {allDone && (
          <span className={`animate-badge-enter text-xs px-3 py-1 rounded-full font-medium ${
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
                  <span className="animate-icon-enter"><CheckIcon className="w-5 h-5 text-bond-green" /></span>
                ) : (
                  <span className="animate-icon-enter"><XIcon className="w-5 h-5 text-bond-red" /></span>
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

      {/* Demo onboarding — shown when compliance checks fail */}
      {allDone && !eligible && (
        <div className="px-6 py-6 border-t border-border/50 border-l-2 border-l-bond-amber bg-bond-amber/5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-bond-amber/15 text-bond-amber font-medium">
              Demo
            </span>
            <span className="text-xs text-text-muted">
              Register an on-chain identity to experience the full purchase flow.
            </span>
          </div>

          {!onboardResult && (
            <>
              <div className="flex gap-3 items-end mb-3">
                <div className="flex-1">
                  <label htmlFor="onboard-country" className="sr-only">Select jurisdiction</label>
                  <select
                    id="onboard-country"
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(Number(e.target.value))}
                    disabled={onboarding}
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
                  disabled={onboarding}
                  className="btn-primary px-4 whitespace-nowrap disabled:cursor-not-allowed"
                >
                  {onboarding ? "Registering..." : "Register Identity"}
                </button>
              </div>

              {selectedCountry === 999 && !onboarding && (
                <div className="flex items-start gap-2 mb-3 p-2.5 rounded-lg bg-bond-amber/8 border border-bond-amber/20">
                  <WarningIcon className="w-4 h-4 text-bond-amber shrink-0 mt-0.5" />
                  <p className="text-xs text-bond-amber/90">
                    Narnia is a restricted jurisdiction. Your identity will be registered, but the jurisdiction compliance check will still fail.
                  </p>
                </div>
              )}
            </>
          )}

          {onboarding && (
            <div className="flex items-center gap-3 mb-3 p-3 rounded-lg bg-surface-3/50">
              <Spinner variant="amber" aria-label="Registering identity" />
              <span className="text-sm text-white">Deploying identity and issuing claims on-chain...</span>
            </div>
          )}

          {onboardError && (
            <p className="text-xs text-bond-red mb-3">{onboardError}</p>
          )}

          {onboardResult && (
            <div className="bg-surface-3/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckIcon className="w-5 h-5 text-bond-green" />
                <p className="text-sm text-bond-green font-medium">You're now eligible to invest in Coppice Green Bonds</p>
              </div>
              <p className="text-xs text-text-muted pl-7">
                Your compliance checks are updating above. Once complete, scroll down to purchase.
              </p>
              <details className="pl-7">
                <summary className="text-xs text-text-muted cursor-pointer hover:text-white transition-colors">
                  View on-chain transaction details
                </summary>
                <div className="mt-2 space-y-1">
                  <a
                    href={`https://hashscan.io/testnet/contract/${onboardResult.identityAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-bond-green hover:text-bond-green/80 underline underline-offset-2 block"
                  >
                    Identity contract on HashScan
                  </a>
                  {Object.entries(onboardResult.transactions).map(([label, hash]) => (
                    <a
                      key={label}
                      href={`https://hashscan.io/testnet/transaction/${hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-white/70 hover:text-white underline underline-offset-2 block"
                      title={hash}
                    >
                      {formatTxLabel(label)}: {hash.slice(0, 10)}...{hash.slice(-6)}
                    </a>
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
