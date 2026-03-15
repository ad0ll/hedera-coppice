import { Client, AccountId, PrivateKey } from "@hashgraph/sdk";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });

export function getClient(): Client {
  const accountId = process.env.HEDERA_ACCOUNT_ID;
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;

  if (!accountId || !privateKey) {
    throw new Error("Missing HEDERA_ACCOUNT_ID or DEPLOYER_PRIVATE_KEY in .env");
  }

  const client = Client.forTestnet();
  // Strip 0x prefix if present - Hedera SDK expects raw hex for ECDSA keys
  const keyHex = privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;
  client.setOperator(
    AccountId.fromString(accountId),
    PrivateKey.fromStringECDSA(keyHex)
  );
  return client;
}

export function getOperatorKey(): PrivateKey {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("Missing DEPLOYER_PRIVATE_KEY in .env");
  }
  const keyHex = privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;
  return PrivateKey.fromStringECDSA(keyHex);
}

export function getOperatorAccountId(): AccountId {
  const accountId = process.env.HEDERA_ACCOUNT_ID;
  if (!accountId) {
    throw new Error("Missing HEDERA_ACCOUNT_ID in .env");
  }
  return AccountId.fromString(accountId);
}

export const MIRROR_NODE_URL = process.env.HEDERA_MIRROR_NODE || "https://testnet.mirrornode.hedera.com";
export const JSON_RPC_URL = process.env.HEDERA_JSON_RPC || "https://testnet.hashio.io/api";
