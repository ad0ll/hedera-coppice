import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { z } from "zod";
import { identityRegistryAbi } from "@coppice/common";
import { CONTRACT_ADDRESSES } from "@/lib/constants";
import { getDeployerWallet, getServerProvider } from "@/lib/deployer";
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

function getClaimIssuerSigningKey(): string {
  const key = process.env.CLAIM_ISSUER_SIGNING_KEY;
  if (!key) throw new Error("Missing CLAIM_ISSUER_SIGNING_KEY");
  return key.startsWith("0x") ? key : `0x${key}`;
}

function getEnvAddress(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return ethers.getAddress(value);
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

  let investor: string;
  try {
    investor = ethers.getAddress(investorAddress);
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
  let implAuthorityAddress: string;
  let claimIssuerAddress: string;
  let claimIssuerSigningKey: string;
  try {
    implAuthorityAddress = getEnvAddress("IDENTITY_IMPL_AUTHORITY_ADDRESS");
    claimIssuerAddress = getEnvAddress("CLAIM_ISSUER_ADDRESS");
    claimIssuerSigningKey = getClaimIssuerSigningKey();
  } catch (err: unknown) {
    const msg = getErrorMessage(err, 0, "Server configuration error");
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const provider = getServerProvider();
  const registryReadOnly = new ethers.Contract(
    CONTRACT_ADDRESSES.identityRegistry,
    identityRegistryAbi,
    provider,
  );

  // Check if already registered before starting the stream
  try {
    const alreadyRegistered = await withRetry(async () =>
      registryReadOnly.contains(investor),
    );

    if (alreadyRegistered) {
      const existingIdentity = await withRetry(async () =>
        registryReadOnly.identity(investor),
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
        const wallet = getDeployerWallet();
        const deployerAddress = wallet.address;
        const transactions: Record<string, string> = {};

        // Step 1: Deploy IdentityProxy
        send({ type: "step", step: "deployIdentity", label: "Deploying identity contract..." });
        const identityFactory = new ethers.ContractFactory(
          identityProxyAbi,
          identityProxyBytecode,
          wallet,
        );
        const deployedContract = await withRetry(async () =>
          identityFactory.deploy(implAuthorityAddress, deployerAddress),
        );
        const deployReceipt = await deployedContract.deploymentTransaction()?.wait();
        if (!deployReceipt || deployReceipt.status !== 1) {
          throw new Error("IdentityProxy deployment failed");
        }
        const identityAddress = ethers.getAddress(await deployedContract.getAddress());
        const deployTxHash = deployReceipt.hash;
        transactions["deployIdentity"] = deployTxHash;
        send({ type: "step", step: "deployIdentity", label: "Identity contract deployed", txHash: deployTxHash });

        // Step 2: Register identity
        send({ type: "step", step: "registerIdentity", label: "Registering in identity registry..." });
        const registryContract = new ethers.Contract(
          CONTRACT_ADDRESSES.identityRegistry,
          identityRegistryAbi,
          wallet,
        );
        const registerTx = await withRetry(async () =>
          registryContract.registerIdentity(investor, identityAddress, country),
        );
        const registerReceipt = await registerTx.wait();
        if (!registerReceipt || registerReceipt.status !== 1) {
          throw new Error("registerIdentity transaction failed");
        }
        transactions["registerIdentity"] = registerReceipt.hash;
        send({ type: "step", step: "registerIdentity", label: "Registered in identity registry", txHash: registerReceipt.hash });

        // Steps 3-5: Issue claims
        const claimIssuerWallet = new ethers.Wallet(claimIssuerSigningKey);
        const claimData = ethers.hexlify(ethers.toUtf8Bytes("Verified"));
        const abiCoder = ethers.AbiCoder.defaultAbiCoder();

        for (const topic of CLAIM_TOPICS) {
          const key = CLAIM_TOPIC_NAMES[topic.toString()] ?? `claim${topic}`;
          const claimLabel = key.replace("claim", "");
          send({ type: "step", step: key, label: `Issuing ${claimLabel} claim...` });

          const dataHash = ethers.keccak256(
            abiCoder.encode(
              ["address", "uint256", "bytes"],
              [identityAddress, topic, claimData],
            ),
          );
          // signMessage with raw bytes (EIP-191 personal sign over the hash)
          const claimSignature = await claimIssuerWallet.signMessage(
            ethers.getBytes(dataHash),
          );

          const identityContract = new ethers.Contract(
            identityAddress,
            identityAddClaimAbi,
            wallet,
          );
          const claimTx = await withRetry(async () =>
            identityContract.addClaim(
              topic,
              BigInt(1),
              claimIssuerAddress,
              claimSignature,
              claimData,
              "",
            ),
          );
          const claimReceipt = await claimTx.wait();
          if (!claimReceipt || claimReceipt.status !== 1) {
            throw new Error(`addClaim transaction failed for topic ${topic}`);
          }
          transactions[key] = claimReceipt.hash;
          send({ type: "step", step: key, label: `${claimLabel} claim issued`, txHash: claimReceipt.hash });
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
