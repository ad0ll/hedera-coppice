import { type Page } from "@playwright/test";
import { ethers } from "ethers";

const RPC_URL = "https://testnet.hashio.io/api";
const CHAIN_ID = 296;

// Known test wallet addresses (pre-computed from private keys)
const KEY_TO_ADDRESS: Record<string, string> = {
  "DEPLOYER_KEY_REDACTED":
    "0xEB974bA96c4912499C3B3bBD5A40617E1f6EEceE",
  ALICE_KEY_REDACTED:
    "0x4f9ad4Fd6623b23beD45e47824B1F224dA21D762",
  "BOB_KEY_REDACTED":
    "0xad33bd43bd3c93ec956f00c2d9782b7ae929e2f7",
  "CHARLIE_KEY_REDACTED":
    "0xFf3a3D1fEc979BB1C6b3b368752b61B249a76F90",
  DIANA_KEY_REDACTED:
    "0x35bccFFf4fCaFD35fF5b3c412d85Fba6ee04bCdf",
};

function stripHexPrefix(key: string): string {
  return key.startsWith("0x") ? key.slice(2) : key;
}

/**
 * Injects a mock `window.ethereum` provider into the page.
 * Read-only RPC calls are proxied to the real Hedera testnet.
 * Write calls (eth_sendTransaction) are signed server-side via
 * page.exposeFunction, then broadcast as raw signed transactions.
 */
export async function injectWalletMock(
  page: Page,
  privateKey: string,
  rpcUrl: string = RPC_URL,
  chainId: number = CHAIN_ID
) {
  const rawKey = stripHexPrefix(privateKey);
  const address = KEY_TO_ADDRESS[rawKey.toLowerCase()];
  if (!address) {
    throw new Error(`Unknown private key — add to KEY_TO_ADDRESS map: ${rawKey.slice(0, 8)}...`);
  }

  // Create a server-side signer for this wallet
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  // Expose a function that the browser mock can call to sign+send transactions
  // We need to handle the case where this is called multiple times (re-injection)
  try {
    await page.exposeFunction(
      "__signAndSendTransaction",
      async (txJson: string): Promise<string> => {
        const txParams = JSON.parse(txJson);

        // Build the transaction for ethers
        const tx: ethers.TransactionRequest = {
          to: txParams.to,
          data: txParams.data,
          value: txParams.value ? BigInt(txParams.value) : 0n,
          from: wallet.address,
        };

        // Let ethers handle gas estimation and nonce
        const response = await wallet.sendTransaction(tx);
        return response.hash;
      }
    );
  } catch {
    // Function may already be exposed from a previous injection — that's OK
  }

  // Expose a function for personal_sign / eth_sign
  try {
    await page.exposeFunction(
      "__personalSign",
      async (message: string): Promise<string> => {
        return wallet.signMessage(
          ethers.getBytes(message)
        );
      }
    );
  } catch {
    // Already exposed
  }

  await page.addInitScript(
    ({ addr, rpc, chain }) => {
      const CHAIN_ID_HEX = "0x" + chain.toString(16);
      const listeners: Record<string, Array<(...args: unknown[]) => void>> = {};

      async function jsonRpc(method: string, params: unknown[] = []) {
        const response = await fetch(rpc, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: Date.now(),
            method,
            params,
          }),
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.result;
      }

      (window as any).ethereum = {
        isMetaMask: true,
        chainId: CHAIN_ID_HEX,
        networkVersion: String(chain),
        selectedAddress: addr,

        request: async function ({
          method,
          params,
        }: {
          method: string;
          params?: unknown[];
        }) {
          switch (method) {
            case "eth_requestAccounts":
            case "eth_accounts":
              return [addr];

            case "eth_chainId":
              return CHAIN_ID_HEX;

            case "net_version":
              return String(chain);

            case "wallet_switchEthereumChain":
            case "wallet_addEthereumChain":
              return null;

            case "eth_sendTransaction": {
              // Delegate to server-side signer via exposed function
              const txParams = (params as any[])?.[0] || {};
              const txHash = await (window as any).__signAndSendTransaction(
                JSON.stringify(txParams)
              );
              return txHash;
            }

            case "personal_sign": {
              const message = (params as string[])?.[0] || "";
              return (window as any).__personalSign(message);
            }

            case "eth_sign": {
              const message = (params as string[])?.[1] || "";
              return (window as any).__personalSign(message);
            }

            // Proxy all read-only calls to the real RPC
            case "eth_getBalance":
            case "eth_getCode":
            case "eth_getTransactionCount":
            case "eth_call":
            case "eth_estimateGas":
            case "eth_blockNumber":
            case "eth_getBlockByNumber":
            case "eth_getBlockByHash":
            case "eth_getTransactionReceipt":
            case "eth_getTransactionByHash":
            case "eth_getLogs":
            case "eth_gasPrice":
            case "eth_maxPriorityFeePerGas":
            case "eth_feeHistory":
              return jsonRpc(method, params);

            default:
              return jsonRpc(method, params);
          }
        },

        on: function (
          event: string,
          callback: (...args: unknown[]) => void
        ) {
          if (!listeners[event]) listeners[event] = [];
          listeners[event].push(callback);
        },

        removeListener: function (
          event: string,
          callback: (...args: unknown[]) => void
        ) {
          if (listeners[event]) {
            listeners[event] = listeners[event].filter(
              (cb) => cb !== callback
            );
          }
        },

        removeAllListeners: function (event?: string) {
          if (event) {
            delete listeners[event];
          } else {
            Object.keys(listeners).forEach((k) => delete listeners[k]);
          }
        },
      };
    },
    { addr: address, rpc: rpcUrl, chain: chainId }
  );
}

/**
 * Helper: read a contract value directly from the testnet RPC.
 * Useful for asserting on-chain state in tests.
 */
export async function readContract(
  contractAddress: string,
  abi: string[],
  method: string,
  args: unknown[] = []
): Promise<unknown> {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(contractAddress, abi, provider);
  return contract[method](...args);
}

/**
 * Helper: get token balance formatted as a number string
 */
export async function getTokenBalance(
  tokenAddress: string,
  walletAddress: string
): Promise<string> {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(
    tokenAddress,
    ["function balanceOf(address) view returns (uint256)"],
    provider
  );
  const balance = await contract.balanceOf(walletAddress);
  return ethers.formatEther(balance);
}
