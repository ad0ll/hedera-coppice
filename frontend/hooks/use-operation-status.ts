"use client";

import { useState, useCallback } from "react";

export interface OperationStatus {
  type: "success" | "error";
  msg: string;
}

export function useOperationStatus() {
  const [status, setStatus] = useState<OperationStatus | null>(null);
  const clear = useCallback(() => setStatus(null), []);
  return { status, setStatus, clear } as const;
}
