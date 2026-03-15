import hre from "hardhat";
import OnchainID from "@onchain-id/solidity";
import {
  type Address,
  type Hex,
  createWalletClient,
  encodeAbiParameters,
  formatEther,
  getAddress,
  getContract,
  http,
  keccak256,
  parseEther,
  toHex,
  zeroAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { loadAddresses } from "./helpers";
import type { WalletClient } from "@nomicfoundation/hardhat-viem/types";

// Demo wallet config — on testnet these come from .env,
// on local Hardhat network we use Hardhat's signers
const DEMO_WALLETS = {
  alice: { country: 276, label: "Alice (DE)" }, // Germany
  charlie: { country: 156, label: "Charlie (CN)" }, // China (restricted)
  diana: { country: 250, label: "Diana (FR)" }, // France
};

// Claim topics: 1=KYC, 2=AML, 7=ACCREDITED
const CLAIM_TOPICS = [1n, 2n, 7n];

async function retry<T>(fn: () => Promise<T>, retries = 3, delayMs = 5000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (i < retries - 1 && (msg.includes("502") || msg.includes("ETIMEDOUT") || msg.includes("rate limit"))) {
        console.log(`    Retrying (${i + 1}/${retries}) after error: ${msg.slice(0, 80)}`);
        await new Promise(r => setTimeout(r, delayMs));
      } else {
        throw err;
      }
    }
  }
  throw new Error("Unreachable");
}

async function deployIdentityProxy(
  implAuthorityAddress: Address,
  walletAddress: Address
): Promise<Address> {
  return retry(async () => {
    const [deployer] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();

    const hash = await deployer.deployContract({
      abi: OnchainID.contracts.IdentityProxy.abi,
      bytecode: OnchainID.contracts.IdentityProxy.bytecode as Hex,
      args: [implAuthorityAddress, walletAddress],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (!receipt.contractAddress) {
      throw new Error("IdentityProxy deployment failed — no address in receipt");
    }
    return getAddress(receipt.contractAddress);
  });
}

async function issueClaim(
  identityAddress: Address,
  topic: bigint,
  claimIssuerAddress: Address,
  claimIssuerPrivateKey: Hex,
  ownerWalletClient: WalletClient
): Promise<void> {
  await retry(async () => {
    const publicClient = await hre.viem.getPublicClient();
    const claimIssuerAccount = privateKeyToAccount(claimIssuerPrivateKey);

    const data = toHex("Verified");
    const dataHash = keccak256(
      encodeAbiParameters(
        [{ type: "address" }, { type: "uint256" }, { type: "bytes" }],
        [identityAddress, topic, data]
      )
    );
    const signature = await claimIssuerAccount.signMessage({ message: { raw: dataHash } });

    const hash = await ownerWalletClient.writeContract({
      address: identityAddress,
      abi: OnchainID.contracts.Identity.abi,
      functionName: "addClaim",
      args: [topic, 1n, claimIssuerAddress, signature, data, "0x"],
    });
    await publicClient.waitForTransactionReceipt({ hash });
  });
}

async function main() {
  const addresses = loadAddresses();
  const publicClient = await hre.viem.getPublicClient();
  const walletClients = await hre.viem.getWalletClients();
  const deployer = walletClients[0];

  console.log("Deployer:", deployer.account.address);
  console.log("Loading deployed addresses...");

  // Get wallet signers — on Hardhat local, use signers[1-3]
  // On testnet, these would be loaded from .env private keys
  const chainId = await publicClient.getChainId();
  const isLocal = chainId === 31337;

  let aliceWallet: WalletClient;
  let charlieWallet: WalletClient;
  let dianaWallet: WalletClient;

  if (isLocal) {
    aliceWallet = walletClients[1];
    charlieWallet = walletClients[2];
    dianaWallet = walletClients[3];
  } else {
    const aliceKey = process.env.ALICE_PRIVATE_KEY;
    const charlieKey = process.env.CHARLIE_PRIVATE_KEY;
    const dianaKey = process.env.DIANA_PRIVATE_KEY;
    if (!aliceKey || !charlieKey || !dianaKey) {
      throw new Error("Missing ALICE/CHARLIE/DIANA_PRIVATE_KEY in .env");
    }
    const chain = publicClient.chain;
    const transport = http(chain?.rpcUrls?.default?.http?.[0]);
    aliceWallet = createWalletClient({ account: privateKeyToAccount(aliceKey as Hex), chain: chain!, transport });
    charlieWallet = createWalletClient({ account: privateKeyToAccount(charlieKey as Hex), chain: chain!, transport });
    dianaWallet = createWalletClient({ account: privateKeyToAccount(dianaKey as Hex), chain: chain!, transport });
  }

  const walletSigners: Record<string, WalletClient> = {
    alice: aliceWallet,
    charlie: charlieWallet,
    diana: dianaWallet,
  };

  // Reconstruct the claim issuer signing key
  const claimIssuerAccount = privateKeyToAccount(addresses.claimIssuerSigningKey);
  console.log(`ClaimIssuer signing key: ${claimIssuerAccount.address}`);

  // Connect to deployed contracts
  const token = await hre.viem.getContractAt("Token", addresses.token);
  const identityRegistry = await hre.viem.getContractAt("IdentityRegistry", addresses.identityRegistry);

  // ================================================================
  // Phase 1: Deploy ONECHAINIDs for deployer + demo wallets
  // (Skip if already registered in identity registry)
  // ================================================================
  console.log("\n=== Phase 1: Deploy Identity Proxies ===");

  let deployerIdentity: Address;
  const identities: Record<string, Address> = {};

  const deployerAlreadyRegistered = await retry(() =>
    identityRegistry.read.contains([deployer.account.address])
  );

  if (deployerAlreadyRegistered) {
    console.log("  Deployer already registered, fetching existing identity...");
    deployerIdentity = await retry(() =>
      identityRegistry.read.identity([deployer.account.address])
    );
    for (const [name, wallet] of Object.entries(walletSigners)) {
      const addr = wallet.account!.address;
      const registered = await retry(() => identityRegistry.read.contains([addr]));
      if (registered) {
        identities[name] = await retry(() => identityRegistry.read.identity([addr]));
        console.log(`  ${DEMO_WALLETS[name as keyof typeof DEMO_WALLETS].label} already registered: ${identities[name]}`);
      }
    }
  } else {
    // Deploy fresh identities
    console.log(`  Deploying ONCHAINID for Deployer (${deployer.account.address})...`);
    deployerIdentity = await deployIdentityProxy(
      addresses.identityImplAuthority,
      deployer.account.address
    );
    console.log(`  Identity: ${deployerIdentity}`);

    for (const [name, wallet] of Object.entries(walletSigners)) {
      const addr = wallet.account!.address;
      console.log(`  Deploying ONCHAINID for ${DEMO_WALLETS[name as keyof typeof DEMO_WALLETS].label} (${addr})...`);
      identities[name] = await deployIdentityProxy(
        addresses.identityImplAuthority,
        addr
      );
      console.log(`  Identity: ${identities[name]}`);
    }

    // ================================================================
    // Phase 2: Register identities in IdentityRegistry
    // ================================================================
    console.log("\n=== Phase 2: Register Identities ===");

    // Add token as agent on identity registry
    try {
      const isTokenAgent = await identityRegistry.read.isAgent([addresses.token]);
      if (!isTokenAgent) {
        console.log("  Adding token as IR agent...");
        await retry(async () => {
          const hash = await identityRegistry.write.addAgent([addresses.token]);
          await publicClient.waitForTransactionReceipt({ hash });
        });
      }
    } catch {
      // May already be set
    }

    // Batch register identities (including deployer)
    const walletAddresses: Address[] = [deployer.account.address];
    const identityAddresses: Address[] = [deployerIdentity];
    const countryCodes: number[] = [276]; // deployer = DE

    for (const [name, wallet] of Object.entries(walletSigners)) {
      const addr = wallet.account!.address;
      const config = DEMO_WALLETS[name as keyof typeof DEMO_WALLETS];
      walletAddresses.push(addr);
      identityAddresses.push(identities[name]);
      countryCodes.push(config.country);
    }

    console.log("  Batch registering identities...");
    await retry(async () => {
      const hash = await identityRegistry.write.batchRegisterIdentity([
        walletAddresses,
        identityAddresses,
        countryCodes,
      ]);
      await publicClient.waitForTransactionReceipt({ hash });
    });
    console.log("  Identities registered.");
  }

  // ================================================================
  // Phase 3: Issue claims to verified wallets
  // (Check if claims already exist before issuing)
  // ================================================================
  console.log("\n=== Phase 3: Issue Claims ===");

  async function hasClaimForTopic(identityAddr: Address, topic: bigint): Promise<boolean> {
    try {
      const identity = getContract({
        address: identityAddr,
        abi: OnchainID.contracts.Identity.abi,
        client: { public: publicClient },
      });
      const claimIds = await identity.read.getClaimIdsByTopic([topic]);
      return (claimIds as unknown[]).length > 0;
    } catch {
      return false;
    }
  }

  // Issue claims for deployer
  console.log(`  Issuing claims for Deployer...`);
  for (const topic of CLAIM_TOPICS) {
    const topicLabel = topic === 1n ? "KYC" : topic === 2n ? "AML" : "ACCREDITED";
    process.stdout.write(`    Topic ${topic} (${topicLabel})... `);

    const alreadyHas = await retry(() => hasClaimForTopic(deployerIdentity, topic));
    if (alreadyHas) {
      console.log("already exists, skipping");
      continue;
    }

    await issueClaim(
      deployerIdentity,
      topic,
      addresses.claimIssuer,
      addresses.claimIssuerSigningKey,
      deployer
    );
    console.log("done");
  }

  // Issue claims for demo wallets
  for (const [name, wallet] of Object.entries(walletSigners)) {
    const config = DEMO_WALLETS[name as keyof typeof DEMO_WALLETS];
    console.log(`  Issuing claims for ${config.label}...`);

    for (const topic of CLAIM_TOPICS) {
      const topicLabel = topic === 1n ? "KYC" : topic === 2n ? "AML" : "ACCREDITED";
      process.stdout.write(`    Topic ${topic} (${topicLabel})... `);

      const alreadyHas = await retry(() => hasClaimForTopic(identities[name], topic));
      if (alreadyHas) {
        console.log("already exists, skipping");
        continue;
      }

      await issueClaim(
        identities[name],
        topic,
        addresses.claimIssuer,
        addresses.claimIssuerSigningKey,
        wallet
      );
      console.log("done");
    }
  }

  // ================================================================
  // Phase 4: Mint tokens and unpause
  // ================================================================
  console.log("\n=== Phase 4: Mint & Unpause ===");

  const currentSupply = await retry(() => token.read.totalSupply());
  if (currentSupply === 0n) {
    console.log("  Minting 100,000 CPC to deployer...");
    await retry(async () => {
      const hash = await token.write.mint([deployer.account.address, parseEther("100000")]);
      await publicClient.waitForTransactionReceipt({ hash });
    });
  } else {
    console.log(`  Already minted: ${formatEther(currentSupply)} CPC`);
  }

  const isPaused = await retry(() => token.read.paused());
  if (isPaused) {
    console.log("  Unpausing token...");
    await retry(async () => {
      const hash = await token.write.unpause();
      await publicClient.waitForTransactionReceipt({ hash });
    });
  } else {
    console.log("  Token already unpaused.");
  }

  // ================================================================
  // Phase 5: Verification checks
  // ================================================================
  console.log("\n=== Phase 5: Verification ===");

  const aliceAddr = aliceWallet.account!.address;
  const charlieAddr = charlieWallet.account!.address;

  // Bob is NOT registered — use a random address as stand-in on local
  const bobAddr: Address = isLocal
    ? walletClients[4].account.address
    : ((process.env.BOB_ADDRESS || zeroAddress) as Address);

  const aliceVerified = await retry(() => identityRegistry.read.isVerified([aliceAddr]));
  console.log(`  Alice isVerified: ${aliceVerified} (expected: true)`);

  let bobVerified = false;
  try {
    bobVerified = await retry(() => identityRegistry.read.isVerified([bobAddr]));
  } catch {
    bobVerified = false;
  }
  console.log(`  Bob isVerified: ${bobVerified} (expected: false)`);

  const charlieVerified = await retry(() => identityRegistry.read.isVerified([charlieAddr]));
  console.log(`  Charlie isVerified: ${charlieVerified} (expected: true)`);

  // Check compliance (canTransfer)
  const compliance = await hre.viem.getContractAt("ModularCompliance", addresses.modularCompliance);

  const canTransferAlice = await retry(() =>
    compliance.read.canTransfer([deployer.account.address, aliceAddr, parseEther("500")])
  );
  console.log(`  canTransfer(deployer->Alice, 500): ${canTransferAlice} (expected: true)`);

  const canTransferCharlie = await retry(() =>
    compliance.read.canTransfer([deployer.account.address, charlieAddr, parseEther("500")])
  );
  console.log(`  canTransfer(deployer->Charlie, 500): ${canTransferCharlie} (expected: false)`);

  // Check token state
  const totalSupply = await retry(() => token.read.totalSupply());
  console.log(`  Total supply: ${formatEther(totalSupply)} CPC`);

  const finalPaused = await retry(() => token.read.paused());
  console.log(`  Paused: ${finalPaused} (expected: false)`);

  // Verify checks pass
  if (!aliceVerified) throw new Error("Alice should be verified!");
  if (bobVerified) throw new Error("Bob should NOT be verified!");
  if (!charlieVerified) throw new Error("Charlie should be verified (but country restricted)!");
  if (!canTransferAlice) throw new Error("Should be able to transfer to Alice!");
  if (canTransferCharlie) throw new Error("Should NOT be able to transfer to Charlie (CN restricted)!");

  console.log("\n=== All verification checks passed! ===");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
