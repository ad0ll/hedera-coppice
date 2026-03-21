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
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}
