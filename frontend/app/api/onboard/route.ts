import { NextRequest, NextResponse } from "next/server";
import {
  getAddress,
  encodeAbiParameters,
  keccak256,
  toHex,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { z } from "zod";
import { identityRegistryAbi } from "@coppice/common";
import { CONTRACT_ADDRESSES } from "@/lib/constants";
import { getDeployerWalletClient, getServerPublicClient } from "@/lib/deployer";
import { getErrorMessage } from "@/lib/format";
import {
  identityProxyAbi,
  identityProxyBytecode,
  identityAddClaimAbi,
} from "@/lib/onchain-id";
import { verifyAuth } from "@/lib/auth";
import { withRetry } from "@/lib/retry";

const onboardBodySchema = z.object({
  investorAddress: z.string().nonempty(),
  country: z.number().int().positive(),
  message: z.string().nonempty(),
  signature: z.string().nonempty(),
});

// Claim topics: 1=KYC, 2=AML, 7=ACCREDITED
const CLAIM_TOPICS = [BigInt(1), BigInt(2), BigInt(7)];
const CLAIM_TOPIC_NAMES: Record<string, string> = {
  "1": "claimKYC",
  "2": "claimAML",
  "7": "claimAccredited",
};

function getClaimIssuerSigningKey(): Hex {
  const key = process.env.CLAIM_ISSUER_SIGNING_KEY;
  if (!key) throw new Error("Missing CLAIM_ISSUER_SIGNING_KEY");
  return (key.startsWith("0x") ? key : `0x${key}`) as Hex;
}

function getEnvAddress(name: string): Address {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return getAddress(value);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = onboardBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { investorAddress, country, message, signature } = parsed.data;

  let investor: Address;
  try {
    investor = getAddress(investorAddress);
  } catch {
    return NextResponse.json({ error: "Invalid investor address" }, { status: 400 });
  }

  // Verify wallet signature — proves caller owns the investor wallet
  try {
    await verifyAuth(message, signature, investor);
  } catch (err: unknown) {
    const msg = getErrorMessage(err, 0, "Auth failed");
    return NextResponse.json({ error: msg }, { status: 401 });
  }

  try {
    const implAuthorityAddress = getEnvAddress("IDENTITY_IMPL_AUTHORITY_ADDRESS");
    const claimIssuerAddress = getEnvAddress("CLAIM_ISSUER_ADDRESS");
    const claimIssuerSigningKey = getClaimIssuerSigningKey();

    const walletClient = getDeployerWalletClient();
    const publicClient = getServerPublicClient();
    const deployerAddress = walletClient.account.address;

    // 1. Check if already registered
    const alreadyRegistered = await withRetry(async () =>
      publicClient.readContract({
        address: CONTRACT_ADDRESSES.identityRegistry,
        abi: identityRegistryAbi,
        functionName: "contains",
        args: [investor],
      }),
    );

    if (alreadyRegistered) {
      const existingIdentity = await withRetry(async () =>
        publicClient.readContract({
          address: CONTRACT_ADDRESSES.identityRegistry,
          abi: identityRegistryAbi,
          functionName: "identity",
          args: [investor],
        }),
      );
      return NextResponse.json(
        {
          error: "Address already registered",
          identityAddress: existingIdentity,
        },
        { status: 409 },
      );
    }

    const transactions: Record<string, string> = {};

    // 2. Deploy IdentityProxy
    // Use deployer as initialManagementKey so the server can call addClaim
    // (the user doesn't have a server-side private key)
    const deployHash = await withRetry(async () =>
      walletClient.deployContract({
        abi: identityProxyAbi,
        bytecode: identityProxyBytecode,
        args: [implAuthorityAddress, deployerAddress],
      }),
    );

    const deployReceipt = await publicClient.waitForTransactionReceipt({
      hash: deployHash,
    });
    if (!deployReceipt.contractAddress) {
      throw new Error("IdentityProxy deployment failed — no address in receipt");
    }
    const identityAddress = getAddress(deployReceipt.contractAddress);
    transactions["deployIdentity"] = deployReceipt.transactionHash;

    // 3. Register identity in IdentityRegistry
    const registerHash = await withRetry(async () =>
      walletClient.writeContract({
        address: CONTRACT_ADDRESSES.identityRegistry,
        abi: identityRegistryAbi,
        functionName: "registerIdentity",
        args: [investor, identityAddress, country],
      }),
    );
    const registerReceipt = await publicClient.waitForTransactionReceipt({
      hash: registerHash,
    });
    transactions["registerIdentity"] = registerReceipt.transactionHash;

    // 4. Issue claims (KYC, AML, Accredited)
    const claimIssuerAccount = privateKeyToAccount(claimIssuerSigningKey);
    const claimData = toHex("Verified");

    for (const topic of CLAIM_TOPICS) {
      const dataHash = keccak256(
        encodeAbiParameters(
          [{ type: "address" }, { type: "uint256" }, { type: "bytes" }],
          [identityAddress, topic, claimData],
        ),
      );
      const claimSignature = await claimIssuerAccount.signMessage({
        message: { raw: dataHash },
      });

      const claimHash = await withRetry(async () =>
        walletClient.writeContract({
          address: identityAddress,
          abi: identityAddClaimAbi,
          functionName: "addClaim",
          args: [topic, BigInt(1), claimIssuerAddress, claimSignature, claimData, ""],
        }),
      );
      const claimReceipt = await publicClient.waitForTransactionReceipt({
        hash: claimHash,
      });
      const key = CLAIM_TOPIC_NAMES[topic.toString()] ?? `claim${topic}`;
      transactions[key] = claimReceipt.transactionHash;
    }

    return NextResponse.json({
      success: true,
      identityAddress,
      transactions,
    });
  } catch (err: unknown) {
    const message = getErrorMessage(err, 200, "Onboarding failed");
    console.error("Onboard API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
