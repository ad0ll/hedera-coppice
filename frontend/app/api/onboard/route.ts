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

/** SSE event types streamed to the client during onboarding. */
export const onboardEventSchema = z.object({
  type: z.enum(["step", "complete", "error"]),
  step: z.string().optional(),
  label: z.string().optional(),
  txHash: z.string().optional(),
  identityAddress: z.string().optional(),
  transactions: z.record(z.string(), z.string()).optional(),
  error: z.string().optional(),
});
export type OnboardEvent = z.infer<typeof onboardEventSchema>;

function sseEncode(event: OnboardEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
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

  // Pre-flight: check env vars and registration status before starting SSE stream
  let implAuthorityAddress: Address;
  let claimIssuerAddress: Address;
  let claimIssuerSigningKey: Hex;
  try {
    implAuthorityAddress = getEnvAddress("IDENTITY_IMPL_AUTHORITY_ADDRESS");
    claimIssuerAddress = getEnvAddress("CLAIM_ISSUER_ADDRESS");
    claimIssuerSigningKey = getClaimIssuerSigningKey();
  } catch (err: unknown) {
    const msg = getErrorMessage(err, 0, "Server configuration error");
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const publicClient = getServerPublicClient();

  // Check if already registered before starting the stream
  try {
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
        { error: "Address already registered", identityAddress: existingIdentity },
        { status: 409 },
      );
    }
  } catch (err: unknown) {
    const msg = getErrorMessage(err, 0, "Failed to check registration");
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // Start SSE stream for the on-chain operations
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: OnboardEvent) => {
        controller.enqueue(encoder.encode(sseEncode(event)));
      };

      try {
        const walletClient = getDeployerWalletClient();
        const deployerAddress = walletClient.account.address;
        const transactions: Record<string, string> = {};

        // Step 1: Deploy IdentityProxy
        send({ type: "step", step: "deployIdentity", label: "Deploying identity contract..." });
        const deployHash = await withRetry(async () =>
          walletClient.deployContract({
            abi: identityProxyAbi,
            bytecode: identityProxyBytecode,
            args: [implAuthorityAddress, deployerAddress],
          }),
        );
        const deployReceipt = await publicClient.waitForTransactionReceipt({ hash: deployHash });
        if (!deployReceipt.contractAddress) {
          throw new Error("IdentityProxy deployment failed — no address in receipt");
        }
        const identityAddress = getAddress(deployReceipt.contractAddress);
        transactions["deployIdentity"] = deployReceipt.transactionHash;
        send({ type: "step", step: "deployIdentity", label: "Identity contract deployed", txHash: deployReceipt.transactionHash });

        // Step 2: Register identity
        send({ type: "step", step: "registerIdentity", label: "Registering in identity registry..." });
        const registerHash = await withRetry(async () =>
          walletClient.writeContract({
            address: CONTRACT_ADDRESSES.identityRegistry,
            abi: identityRegistryAbi,
            functionName: "registerIdentity",
            args: [investor, identityAddress, country],
          }),
        );
        const registerReceipt = await publicClient.waitForTransactionReceipt({ hash: registerHash });
        transactions["registerIdentity"] = registerReceipt.transactionHash;
        send({ type: "step", step: "registerIdentity", label: "Registered in identity registry", txHash: registerReceipt.transactionHash });

        // Steps 3-5: Issue claims
        const claimIssuerAccount = privateKeyToAccount(claimIssuerSigningKey);
        const claimData = toHex("Verified");

        for (const topic of CLAIM_TOPICS) {
          const key = CLAIM_TOPIC_NAMES[topic.toString()] ?? `claim${topic}`;
          const claimLabel = key.replace("claim", "");
          send({ type: "step", step: key, label: `Issuing ${claimLabel} claim...` });

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
          const claimReceipt = await publicClient.waitForTransactionReceipt({ hash: claimHash });
          transactions[key] = claimReceipt.transactionHash;
          send({ type: "step", step: key, label: `${claimLabel} claim issued`, txHash: claimReceipt.transactionHash });
        }

        // Final complete event
        send({
          type: "complete",
          identityAddress,
          transactions,
        });
      } catch (err: unknown) {
        const msg = getErrorMessage(err, 200, "Onboarding failed");
        console.error("Onboard SSE error:", msg);
        send({ type: "error", error: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store",
      Connection: "keep-alive",
    },
  });
}
