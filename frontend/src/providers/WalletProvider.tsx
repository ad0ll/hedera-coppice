import { createContext, useContext, type ReactNode } from "react";
import { WagmiProvider, useAccount, useConnect, useDisconnect } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "../lib/wagmi";
import { DEMO_WALLETS } from "../lib/constants";

const queryClient = new QueryClient();

interface WalletContextType {
  account: `0x${string}` | null;
  chainId: number | undefined;
  walletLabel: string;
  connect: () => void;
  disconnect: () => void;
  isConnecting: boolean;
}

const WalletContext = createContext<WalletContextType>({
  account: null,
  chainId: undefined,
  walletLabel: "",
  connect: () => {},
  disconnect: () => {},
  isConnecting: false,
});

export function useWallet() {
  return useContext(WalletContext);
}

function WalletContextBridge({ children }: { children: ReactNode }) {
  const { address, chainId, isConnecting: accountConnecting } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const account = address ?? null;
  const walletLabel = account
    ? DEMO_WALLETS[account.toLowerCase()]?.label || `${account.slice(0, 6)}...${account.slice(-4)}`
    : "";

  const handleConnect = () => {
    const connector = connectors.find((c) => c.id === "injected");
    if (connector) {
      connect({ connector });
    }
  };

  return (
    <WalletContext.Provider
      value={{
        account,
        chainId,
        walletLabel,
        connect: handleConnect,
        disconnect,
        isConnecting: accountConnecting || isPending,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <WalletContextBridge>{children}</WalletContextBridge>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
