"use client";

import { useState, useEffect } from "react";
import { zeroAddress, parseEther } from "viem";
import { useConnection } from "wagmi";
import { usePublicClient } from "wagmi";
import { useIdentity } from "@/hooks/use-identity";
import { useCompliance } from "@/hooks/use-compliance";
import { countryRestrictModuleAbi } from "@coppice/common";
import { CONTRACT_ADDRESSES, COUNTRY_RESTRICT_MODULE_ADDRESS } from "@/lib/constants";
import { COUNTRY_NAMES } from "@/lib/event-types";
import { CheckIcon, XIcon, Spinner } from "@/components/ui/icons";

interface CheckResult {
  label: string;
  status: "pass" | "fail" | "loading";
  detail?: string;
}

export function ComplianceStatus({ onEligibilityChange }: { onEligibilityChange?: (eligible: boolean) => void }) {
  const { address } = useConnection();
  const publicClient = usePublicClient();
  const { isVerified, isRegistered, getCountry } = useIdentity();
  const { canTransfer } = useCompliance();
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [eligible, setEligible] = useState(false);

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

    runChecks();
    const interval = setInterval(runChecks, 15000);
    return () => {
      clearInterval(interval);
      setChecks([]);
      setEligible(false);
      onEligibilityChange?.(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isVerified, isRegistered, getCountry, canTransfer are useCallback-wrapped with [publicClient] deps, so they are stable when publicClient is stable
  }, [address, publicClient, onEligibilityChange]);

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
    </div>
  );
}
