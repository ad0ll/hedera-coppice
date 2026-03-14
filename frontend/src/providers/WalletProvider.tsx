import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { ethers } from "ethers";
import { HEDERA_CHAIN_ID, HEDERA_CHAIN_ID_HEX, JSON_RPC_URL, DEMO_WALLETS } from "../lib/constants";

interface WalletContextType {
  account: string | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
  chainId: number | null;
  walletLabel: string;
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnecting: boolean;
}

const WalletContext = createContext<WalletContextType>({
  account: null,
  provider: null,
  signer: null,
  chainId: null,
  walletLabel: "",
  connect: async () => {},
  disconnect: () => {},
  isConnecting: false,
});

export function useWallet() {
  return useContext(WalletContext);
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const walletLabel = account
    ? DEMO_WALLETS[account.toLowerCase()]?.label || `${account.slice(0, 6)}...${account.slice(-4)}`
    : "";

  const connect = useCallback(async () => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      console.error("MetaMask not detected. Please install MetaMask to use this application.");
      return;
    }

    setIsConnecting(true);
    try {
      const browserProvider = new ethers.BrowserProvider(ethereum);
      const accounts = await browserProvider.send("eth_requestAccounts", []);

      // Check chain
      const network = await browserProvider.getNetwork();
      if (Number(network.chainId) !== HEDERA_CHAIN_ID) {
        try {
          await ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: HEDERA_CHAIN_ID_HEX }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            await ethereum.request({
              method: "wallet_addEthereumChain",
              params: [{
                chainId: HEDERA_CHAIN_ID_HEX,
                chainName: "Hedera Testnet",
                rpcUrls: [JSON_RPC_URL],
                nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
                blockExplorerUrls: ["https://hashscan.io/testnet"],
              }],
            });
          }
        }
      }

      const walletSigner = await browserProvider.getSigner();
      setAccount(accounts[0]);
      setProvider(browserProvider);
      setSigner(walletSigner);
      setChainId(HEDERA_CHAIN_ID);
    } catch (err) {
      console.error("Failed to connect wallet:", err);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setChainId(null);
  }, []);

  // Listen for account/chain changes
  useEffect(() => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        setAccount(accounts[0]);
        // Refresh signer
        const browserProvider = new ethers.BrowserProvider(ethereum);
        setProvider(browserProvider);
        browserProvider.getSigner().then(setSigner);
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    ethereum.on("accountsChanged", handleAccountsChanged);
    ethereum.on("chainChanged", handleChainChanged);

    return () => {
      ethereum.removeListener("accountsChanged", handleAccountsChanged);
      ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [disconnect]);

  return (
    <WalletContext.Provider value={{ account, provider, signer, chainId, walletLabel, connect, disconnect, isConnecting }}>
      {children}
    </WalletContext.Provider>
  );
}
