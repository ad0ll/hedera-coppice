import { type Page } from "@playwright/test";

/**
 * Injects a mock `window.ethereum` provider into the page.
 * This simulates MetaMask connected to Hedera testnet.
 */
export async function injectWalletMock(
  page: Page,
  privateKey: string,
  rpcUrl: string = "https://testnet.hashio.io/api",
  chainId: number = 296
) {
  // We inject a script that creates a mock EIP-1193 provider using inline ethers
  // Since we can't import ethers in the browser injection, we use raw JSON-RPC calls
  await page.addInitScript(`
    (function() {
      const PRIVATE_KEY = "${privateKey}";
      const RPC_URL = "${rpcUrl}";
      const CHAIN_ID = ${chainId};
      const CHAIN_ID_HEX = "0x" + CHAIN_ID.toString(16);

      // Derive address from private key using simple ECDSA
      // We'll compute it via the first eth_requestAccounts call
      let cachedAddress = null;

      const listeners = {};

      async function jsonRpc(method, params = []) {
        const response = await fetch(RPC_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.result;
      }

      // Simple keccak256 and ECDSA signer using SubtleCrypto is too complex.
      // Instead, we'll use the approach of querying the RPC for the account address
      // and routing sign requests through a different mechanism.

      // For the mock, we compute the address from the private key by sending
      // a transaction estimate or using a known mapping.
      // Actually, the simplest approach: pre-compute the address.

      // Import ethers from the app's own bundle by waiting for it
      // This is a hackathon-grade mock - we just need the address.

      function getAddressFromKey(key) {
        // Remove 0x prefix
        const hex = key.startsWith("0x") ? key.slice(2) : key;
        // We can't easily compute secp256k1 in raw JS without a lib.
        // Instead, we'll use a mapping of known test keys to addresses.
        const KEY_MAP = {
          // Deployer
          "DEPLOYER_KEY_REDACTED": "0xEB974bA96c4912499C3B3bBD5A40617E1f6EEceE",
          // Alice
          "ALICE_KEY_REDACTED": "0x4f9ad4Fd6623b23beD45e47824B1F224dA21D762",
          // Bob
          "BOB_KEY_REDACTED": "0xad33bd43bd3c93ec956f00c2d9782b7ae929e2f7",
          // Charlie
          "CHARLIE_KEY_REDACTED": "0xFf3a3D1fEc979BB1C6b3b368752b61B249a76F90",
          // Diana
          "DIANA_KEY_REDACTED": "0x35bccFFf4fCaFD35fF5b3c412d85Fba6ee04bCdf",
        };
        return KEY_MAP[hex.toLowerCase()] || null;
      }

      cachedAddress = getAddressFromKey(PRIVATE_KEY);

      window.ethereum = {
        isMetaMask: true,
        chainId: CHAIN_ID_HEX,
        networkVersion: String(CHAIN_ID),
        selectedAddress: cachedAddress,

        request: async function({ method, params }) {
          switch (method) {
            case "eth_requestAccounts":
            case "eth_accounts":
              return cachedAddress ? [cachedAddress] : [];

            case "eth_chainId":
              return CHAIN_ID_HEX;

            case "net_version":
              return String(CHAIN_ID);

            case "wallet_switchEthereumChain":
              return null;

            case "wallet_addEthereumChain":
              return null;

            case "eth_getBalance":
            case "eth_getCode":
            case "eth_getTransactionCount":
            case "eth_call":
            case "eth_estimateGas":
            case "eth_blockNumber":
            case "eth_getBlockByNumber":
            case "eth_getTransactionReceipt":
            case "eth_getTransactionByHash":
            case "eth_getLogs":
            case "eth_gasPrice":
            case "eth_maxPriorityFeePerGas":
            case "eth_feeHistory":
              // Proxy read-only calls to the real RPC
              return jsonRpc(method, params);

            case "eth_sendTransaction": {
              // For send transaction, we need to sign and send
              // This is where we'd need ethers.js, but for E2E tests
              // against the real testnet, we proxy through the RPC
              // after signing with the private key.
              // For now, proxy unsigned (this works for read-only demo tests)
              return jsonRpc("eth_sendRawTransaction", params);
            }

            case "personal_sign":
            case "eth_sign":
              // For demo tests, return a dummy signature
              return "0x" + "00".repeat(65);

            default:
              // Proxy unknown methods to RPC
              return jsonRpc(method, params);
          }
        },

        on: function(event, callback) {
          if (!listeners[event]) listeners[event] = [];
          listeners[event].push(callback);
        },

        removeListener: function(event, callback) {
          if (listeners[event]) {
            listeners[event] = listeners[event].filter(cb => cb !== callback);
          }
        },

        removeAllListeners: function(event) {
          if (event) {
            delete listeners[event];
          } else {
            Object.keys(listeners).forEach(k => delete listeners[k]);
          }
        },
      };
    })();
  `);
}
