"use client";

import { memo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { StatusMessage } from "@/components/ui/status-message";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { useOperationStatus } from "@/hooks/use-operation-status";
import { getErrorMessage } from "@/lib/format";
import { signAuthMessage } from "@/lib/auth";
import { fetchAPI } from "@/lib/api-client";
import { registerProjectResponseSchema } from "@/app/api/issuer/register-project/route";

interface RegisterProjectCardProps {
  address: string;
  eligibleCategories: string[];
}

export const RegisterProjectCard = memo(function RegisterProjectCard({
  address,
  eligibleCategories,
}: RegisterProjectCardProps) {
  const queryClient = useQueryClient();
  const [projectName, setProjectName] = useState("");
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [country, setCountry] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");
  const [capacityUnit, setCapacityUnit] = useState("MW");
  const [lifetime, setLifetime] = useState("");
  const [targetCO2e, setTargetCO2e] = useState("");
  const [registering, setRegistering] = useState(false);
  const registerOp = useOperationStatus();

  async function handleRegister() {
    if (!projectName || !category || !subCategory || !country || !location || !capacity || !lifetime || !targetCO2e || registering) return;
    registerOp.clear();
    setRegistering(true);
    try {
      const { message: authMessage, signature } = await signAuthMessage(address, "Register Project");
      await fetchAPI("/api/issuer/register-project", registerProjectResponseSchema, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName,
          icmaCategory: category,
          subCategory,
          country,
          location,
          capacity: Number(capacity),
          capacityUnit,
          projectLifetimeYears: Number(lifetime),
          annualTargetCO2e: Number(targetCO2e),
          message: authMessage,
          signature,
        }),
      });
      registerOp.setStatus({ type: "success", msg: `"${projectName}" registered in Guardian` });
      queryClient.invalidateQueries({ queryKey: ["guardian"] });
      setProjectName("");
      setCategory("");
      setSubCategory("");
      setCountry("");
      setLocation("");
      setCapacity("");
      setLifetime("");
      setTargetCO2e("");
    } catch (err: unknown) {
      registerOp.setStatus({ type: "error", msg: getErrorMessage(err, 80, "Registration failed") });
    } finally {
      setRegistering(false);
    }
  }

  return (
    <Card>
      <h3 className="card-title">Register Project</h3>
      <div className="space-y-3">
        <div>
          <label htmlFor="reg-project-name" className="text-xs text-text-muted mb-1 block">Project Name</label>
          <input id="reg-project-name" type="text" value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="e.g. Sunridge Solar Farm" className="input" aria-required="true" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="reg-category" className="text-xs text-text-muted mb-1 flex items-center">ICMA Category<InfoTooltip text="Category per ICMA Green Bond Principles (June 2025). Only bond framework-eligible categories are shown." /></label>
            <select id="reg-category" value={category}
              onChange={(e) => setCategory(e.target.value)} className="input" aria-required="true">
              <option value="">Select...</option>
              {eligibleCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="reg-subcategory" className="text-xs text-text-muted mb-1 block">Sub-Category</label>
            <input id="reg-subcategory" type="text" value={subCategory}
              onChange={(e) => setSubCategory(e.target.value)}
              placeholder="e.g. Solar PV" className="input" aria-required="true" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="reg-country" className="text-xs text-text-muted mb-1 block">Country (ISO)</label>
            <input id="reg-country" type="text" value={country}
              onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 2))}
              placeholder="KE" maxLength={2} className="input" aria-required="true" />
          </div>
          <div>
            <label htmlFor="reg-location" className="text-xs text-text-muted mb-1 block">Location</label>
            <input id="reg-location" type="text" value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Nairobi, Kenya" className="input" aria-required="true" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="reg-capacity" className="text-xs text-text-muted mb-1 block">Capacity</label>
            <input id="reg-capacity" type="number" value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="50" min="0" className="input" aria-required="true" />
          </div>
          <div>
            <label htmlFor="reg-capacity-unit" className="text-xs text-text-muted mb-1 block">Unit</label>
            <input id="reg-capacity-unit" type="text" value={capacityUnit}
              onChange={(e) => setCapacityUnit(e.target.value)}
              placeholder="MW" className="input" />
          </div>
          <div>
            <label htmlFor="reg-lifetime" className="text-xs text-text-muted mb-1 block">Lifetime (yr)</label>
            <input id="reg-lifetime" type="number" value={lifetime}
              onChange={(e) => setLifetime(e.target.value)}
              placeholder="25" min="1" className="input" aria-required="true" />
          </div>
        </div>
        <div>
          <label htmlFor="reg-target-co2e" className="text-xs text-text-muted mb-1 flex items-center">Annual Target CO₂e (tonnes)<InfoTooltip text="Expected annual greenhouse gas reductions in tonnes CO₂ equivalent. Used to calculate SPT progress." /></label>
          <input id="reg-target-co2e" type="number" value={targetCO2e}
            onChange={(e) => setTargetCO2e(e.target.value)}
            placeholder="6000" min="0" className="input" aria-required="true" />
        </div>
        <button
          onClick={handleRegister}
          disabled={!projectName || !category || !subCategory || !country || !location || !capacity || !lifetime || !targetCO2e || registering}
          aria-busy={registering}
          className="w-full btn-primary"
        >
          {registering ? "Registering..." : "Register Project"}
        </button>
        <p className="text-xs text-text-muted">
          Registers a new project in Guardian as a Verifiable Credential. Once registered, it appears in the allocation dropdown.
        </p>
        <StatusMessage status={registerOp.status} />
      </div>
    </Card>
  );
});
