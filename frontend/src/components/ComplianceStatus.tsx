import { useState, useEffect } from "react";
import { useWallet } from "../providers/WalletProvider";
import { useIdentity } from "../hooks/useIdentity";
import { useCompliance } from "../hooks/useCompliance";
import { ethers } from "ethers";

interface CheckResult {
  label: string;
  status: "pass" | "fail" | "loading";
  detail?: string;
}

export function ComplianceStatus({ onEligibilityChange }: { onEligibilityChange?: (eligible: boolean) => void }) {
  const { account } = useWallet();
  const { isVerified, isRegistered, getCountry } = useIdentity();
  const { canTransfer } = useCompliance();
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [eligible, setEligible] = useState(false);

  useEffect(() => {
    if (!account) {
      setChecks([]);
      setEligible(false);
      onEligibilityChange?.(false);
      return;
    }

    async function runChecks() {
      const results: CheckResult[] = [
        { label: "Identity Registered", status: "loading" },
        { label: "KYC / AML / Accredited", status: "loading" },
        { label: "Jurisdiction Check", status: "loading" },
        { label: "Compliance Module", status: "loading" },
      ];
      setChecks([...results]);

      // Check 1: Registration
      const registered = await isRegistered(account!);
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

      // Check 2: Verified (has required claims)
      const verified = await isVerified(account!);
      results[1] = {
        label: "KYC / AML / Accredited",
        status: verified ? "pass" : "fail",
        detail: verified ? "All claims verified" : "Missing required claims",
      };
      setChecks([...results]);

      // Check 3: Country
      const country = await getCountry(account!);
      const RESTRICTED_COUNTRIES = [156]; // CN
      const countryNames: Record<number, string> = { 276: "Germany", 250: "France", 156: "China", 840: "United States" };
      const isRestricted = RESTRICTED_COUNTRIES.includes(country);
      results[2] = {
        label: "Jurisdiction Check",
        status: isRestricted ? "fail" : "pass",
        detail: isRestricted
          ? `${countryNames[country] || `Code ${country}`} - Restricted`
          : `${countryNames[country] || `Code ${country}`} - Approved`,
      };
      setChecks([...results]);

      // Check 4: Compliance canTransfer
      const transferAllowed = await canTransfer(
        ethers.ZeroAddress,
        account!,
        ethers.parseEther("1")
      );
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
  }, [account]);

  if (!account) {
    return (
      <div className="bg-surface-2 border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Compliance Status</h3>
        <p className="text-text-muted text-sm">Connect your wallet to check compliance status.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-2 border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Compliance Status</h3>
        {checks.length > 0 && checks.every((c) => c.status !== "loading") && (
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${
            eligible ? "bg-bond-green/20 text-bond-green" : "bg-bond-red/20 text-bond-red"
          }`}>
            {eligible ? "Eligible to Invest" : "Not Eligible"}
          </span>
        )}
      </div>
      <div className="space-y-3">
        {checks.map((check, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
            <div className="flex items-center gap-3">
              <span className="text-lg">
                {check.status === "loading" ? (
                  <span className="inline-block w-5 h-5 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
                ) : check.status === "pass" ? (
                  <span className="text-bond-green">&#10003;</span>
                ) : (
                  <span className="text-bond-red">&#10007;</span>
                )}
              </span>
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
