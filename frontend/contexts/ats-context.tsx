"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { ethers } from "ethers";

interface AtsContextValue {
  address: string | undefined;
  isConnected: boolean;
  isConnecting: boolean;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const AtsContext = createContext<AtsContextValue>({
  address: undefined,
  isConnected: false,
  isConnecting: false,
  provider: null,
  signer: null,
  connect: async () => {},
  disconnect: () => {},
});

export function AtsProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | undefined>();
  const [isConnecting, setIsConnecting] = useState(false);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);

  // Listen for MetaMask account changes — update address AND signer
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;
    const eth = window.ethereum;

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      if (accounts.length === 0) {
        setAddress(undefined);
        setProvider(null);
        setSigner(null);
      } else {
        const bp = new ethers.BrowserProvider(eth);
        bp.getSigner().then((s) => {
          setProvider(bp);
          setSigner(s);
          return s.getAddress();
        }).then((addr) => {
          setAddress(ethers.getAddress(addr));
        }).catch(() => {
          // Fallback: at minimum update the address from the event
          setAddress(ethers.getAddress(accounts[0]));
        });
      }
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
    };
  }, []);

  // Check if already connected on mount.
  // Use eth_accounts (passive, no popup) to see if the wallet has authorized
  // accounts, then getSigner() to resolve the CURRENTLY ACTIVE account.
  // Previously used listAccounts() which returns cached accounts and can
  // reconnect to the wrong wallet after the user switches in MetaMask.
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;
    const eth = window.ethereum;

    const checkConnection = async () => {
      try {
        const bp = new ethers.BrowserProvider(eth);
        const accounts = await bp.send("eth_accounts", []) as string[];
        if (accounts.length > 0) {
          const s = await bp.getSigner();
          setProvider(bp);
          setSigner(s);
          setAddress(await s.getAddress());
        }
      } catch {
        // Not connected
      }
    };
    checkConnection();
  }, []);

  const connect = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("MetaMask not found");
    }
    const eth = window.ethereum;
    setIsConnecting(true);
    try {
      const bp = new ethers.BrowserProvider(eth);
      await bp.send("eth_requestAccounts", []);
      const s = await bp.getSigner();
      const addr = await s.getAddress();
      setProvider(bp);
      setSigner(s);
      setAddress(ethers.getAddress(addr));
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(undefined);
    setProvider(null);
    setSigner(null);
  }, []);

  return (
    <AtsContext.Provider
      value={{
        address,
        isConnected: !!address,
        isConnecting,
        provider,
        signer,
        connect,
        disconnect,
      }}
    >
      {children}
    </AtsContext.Provider>
  );
}

export function useAts() {
  return useContext(AtsContext);
}

// Drop-in replacement for wagmi's useConnection shape
export function useConnection() {
  const { address, isConnecting } = useAts();
  return { address, isConnecting };
}
