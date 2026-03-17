"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AtsProvider } from "@/contexts/ats-context";
import { ErrorBoundary } from "@/components/error-boundary";
import { useState, type ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <AtsProvider>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </QueryClientProvider>
    </AtsProvider>
  );
}
