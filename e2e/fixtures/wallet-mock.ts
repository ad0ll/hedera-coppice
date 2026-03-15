import { type Page } from "@playwright/test";
import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hederaTestnet } from "viem/chains";

const RPC_URL = "https://testnet.hashio.io/api";
const CHAIN_ID = 296;

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
  // Typecast required: raw hex string needs to be narrowed to viem's branded Hex type for privateKeyToAccount
  const keyHex = (privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`) as Hex;
  const account = privateKeyToAccount(keyHex);
  const address = account.address;

  const walletClient = createWalletClient({
    account,
    chain: hederaTestnet,
    transport: http(rpcUrl),
  });

  // Expose a function that the browser mock can call to sign+send transactions
  try {
    await page.exposeFunction(
      "__signAndSendTransaction",
      async (txJson: string): Promise<string> => {
        const txParams = JSON.parse(txJson);

        const hash = await walletClient.sendTransaction({
          to: txParams.to as Hex,
          data: txParams.data as Hex | undefined,
          value: txParams.value ? BigInt(txParams.value) : 0n,
        });
        return hash;
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
        return account.signMessage({
          message: { raw: message as Hex },
        });
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
  abi: readonly { name: string; type: string; inputs: readonly { type: string }[]; outputs: readonly { type: string }[]; stateMutability: string }[],
  functionName: string,
  args: unknown[] = []
): Promise<unknown> {
  const publicClient = createPublicClient({
    chain: hederaTestnet,
    transport: http(RPC_URL),
  });

  return publicClient.readContract({
    // Typecast required: dynamic contract address string needs to be narrowed to viem's branded Hex type
    address: contractAddress as Hex,
    abi,
    functionName,
    args,
  });
}

/**
 * Helper: get token balance formatted as a number string
 */
export async function getTokenBalance(
  tokenAddress: string,
  walletAddress: string
): Promise<string> {
  const publicClient = createPublicClient({
    chain: hederaTestnet,
    transport: http(RPC_URL),
  });

  const balance = await publicClient.readContract({
    // Typecast required: dynamic contract address string needs to be narrowed to viem's branded Hex type
    address: tokenAddress as Hex,
    abi: [
      {
        name: "balanceOf",
        type: "function",
        inputs: [{ name: "account", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
      },
    ] as const,
    functionName: "balanceOf",
    args: [walletAddress as Hex],
  });

  return formatEther(balance);
}
