import { useQuery } from "@tanstack/react-query";
import type { GuardianData } from "@/lib/guardian-types";

export function useGuardian() {
  return useQuery({
    queryKey: ["guardian-data"],
    queryFn: async (): Promise<GuardianData> => {
      const res = await fetch("/api/guardian/data");
      if (!res.ok) {
        throw new Error(`Guardian API returned ${res.status}`);
      }
      return res.json() as Promise<GuardianData>;
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}
