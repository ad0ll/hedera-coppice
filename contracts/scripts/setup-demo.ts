import { ethers } from "hardhat";
import OnchainID from "@onchain-id/solidity";
import { loadAddresses } from "./helpers";

// Demo wallet config — on testnet these come from .env,
// on local Hardhat network we use Hardhat's signers
const DEMO_WALLETS = {
  alice: { country: 276, label: "Alice (DE)" }, // Germany
  charlie: { country: 156, label: "Charlie (CN)" }, // China (restricted)
  diana: { country: 250, label: "Diana (FR)" }, // France
};

// Claim topics: 1=KYC, 2=AML, 7=ACCREDITED
const CLAIM_TOPICS = [1, 2, 7];

async function retry<T>(fn: () => Promise<T>, retries = 3, delayMs = 5000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      const msg = err?.message || "";
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
  implAuthorityAddress: string,
  walletAddress: string,
  deployer: any
): Promise<string> {
  return retry(async () => {
    const identity = await new ethers.ContractFactory(
      OnchainID.contracts.IdentityProxy.abi,
      OnchainID.contracts.IdentityProxy.bytecode,
      deployer
    ).deploy(implAuthorityAddress, walletAddress);
    await identity.waitForDeployment();
    return identity.getAddress();
  });
}

async function issueClaim(
  identityAddress: string,
  topic: number,
  claimIssuerAddress: string,
  claimIssuerSigningKey: ethers.Wallet,
  walletSigner: any
): Promise<void> {
  await retry(async () => {
    const identity = await ethers.getContractAt(
      OnchainID.contracts.Identity.abi,
      identityAddress
    );

    const data = ethers.hexlify(ethers.toUtf8Bytes("Verified"));

    // Sign: keccak256(abi.encode(identity, topic, data))
    const dataHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256", "bytes"],
        [identityAddress, topic, data]
      )
    );
    const signature = await claimIssuerSigningKey.signMessage(ethers.getBytes(dataHash));

    // The wallet owner adds the claim to their own ONCHAINID
    const tx = await identity.connect(walletSigner).addClaim(
      topic,
      1, // scheme: ECDSA
      claimIssuerAddress,
      signature,
      data,
      ""
    );
    await tx.wait();
  });
}

async function main() {
  const addresses = loadAddresses();
  const signers = await ethers.getSigners();
  const deployer = signers[0];

  console.log("Deployer:", deployer.address);
  console.log("Loading deployed addresses...");

  // Get wallet signers — on Hardhat local, use signers[1-4]
  // On testnet, these would be loaded from .env private keys
  const network = (await ethers.provider.getNetwork()).name;
  let aliceSigner: any, charlieSigner: any, dianaSigner: any;

  if (network === "hardhat" || network === "unknown") {
    // Local network: use Hardhat signers
    aliceSigner = signers[1];
    charlieSigner = signers[2];
    dianaSigner = signers[3];
  } else {
    // Testnet: load from .env
    const aliceKey = process.env.ALICE_PRIVATE_KEY;
    const charlieKey = process.env.CHARLIE_PRIVATE_KEY;
    const dianaKey = process.env.DIANA_PRIVATE_KEY;
    if (!aliceKey || !charlieKey || !dianaKey) {
      throw new Error("Missing ALICE/CHARLIE/DIANA_PRIVATE_KEY in .env");
    }
    aliceSigner = new ethers.Wallet(aliceKey, ethers.provider);
    charlieSigner = new ethers.Wallet(charlieKey, ethers.provider);
    dianaSigner = new ethers.Wallet(dianaKey, ethers.provider);
  }

  const walletSigners = {
    alice: aliceSigner,
    charlie: charlieSigner,
    diana: dianaSigner,
  };

  // Reconstruct the claim issuer signing key from saved private key
  const claimIssuerSigningKey = new ethers.Wallet(addresses.claimIssuerSigningKey);
  console.log(`ClaimIssuer signing key: ${claimIssuerSigningKey.address}`);

  // Connect to deployed contracts
  const token = await ethers.getContractAt("Token", addresses.token);
  const identityRegistry = await ethers.getContractAt("IdentityRegistry", addresses.identityRegistry);

  // ================================================================
  // Phase 1: Deploy ONECHAINIDs for deployer + demo wallets
  // (Skip if already registered in identity registry)
  // ================================================================
  console.log("\n=== Phase 1: Deploy Identity Proxies ===");

  // Check if deployer is already registered
  let deployerIdentity: string;
  let identities: Record<string, string> = {};

  const deployerAlreadyRegistered = await retry(() => identityRegistry.contains(deployer.address));
  if (deployerAlreadyRegistered) {
    console.log("  Deployer already registered, fetching existing identity...");
    deployerIdentity = await retry(() => identityRegistry.identity(deployer.address));
    for (const [name, signer] of Object.entries(walletSigners)) {
      const addr = await signer.getAddress();
      const registered = await retry(() => identityRegistry.contains(addr));
      if (registered) {
        identities[name] = await retry(() => identityRegistry.identity(addr));
        console.log(`  ${DEMO_WALLETS[name as keyof typeof DEMO_WALLETS].label} already registered: ${identities[name]}`);
      }
    }
  } else {
    // Deploy fresh identities
    console.log(`  Deploying ONCHAINID for Deployer (${deployer.address})...`);
    deployerIdentity = await deployIdentityProxy(
      addresses.identityImplAuthority,
      deployer.address,
      deployer
    );
    console.log(`  Identity: ${deployerIdentity}`);

    for (const [name, signer] of Object.entries(walletSigners)) {
      const addr = await signer.getAddress();
      console.log(`  Deploying ONCHAINID for ${DEMO_WALLETS[name as keyof typeof DEMO_WALLETS].label} (${addr})...`);
      identities[name] = await deployIdentityProxy(
        addresses.identityImplAuthority,
        addr,
        deployer
      );
      console.log(`  Identity: ${identities[name]}`);
    }

    // ================================================================
    // Phase 2: Register identities in IdentityRegistry
    // ================================================================
    console.log("\n=== Phase 2: Register Identities ===");

    // Add token as agent on identity registry
    try {
      const isTokenAgent = await identityRegistry.isAgent(addresses.token);
      if (!isTokenAgent) {
        console.log("  Adding token as IR agent...");
        await retry(async () => {
          await (await identityRegistry.addAgent(addresses.token)).wait();
        });
      }
    } catch {
      // May already be set
    }

    // Batch register identities (including deployer)
    const walletAddresses = [deployer.address];
    const identityAddresses = [deployerIdentity];
    const countryCodes = [276]; // deployer = DE

    for (const [name, signer] of Object.entries(walletSigners)) {
      const addr = await signer.getAddress();
      const config = DEMO_WALLETS[name as keyof typeof DEMO_WALLETS];
      walletAddresses.push(addr);
      identityAddresses.push(identities[name]);
      countryCodes.push(config.country);
    }

    console.log("  Batch registering identities...");
    await retry(async () => {
      const regTx = await identityRegistry.batchRegisterIdentity(
        walletAddresses,
        identityAddresses,
        countryCodes
      );
      await regTx.wait();
    });
    console.log("  Identities registered.");
  }

  // ================================================================
  // Phase 3: Issue claims to verified wallets
  // (Check if claims already exist before issuing)
  // ================================================================
  console.log("\n=== Phase 3: Issue Claims ===");

  // Helper to check if a claim already exists for a given topic
  async function hasClaimForTopic(identityAddr: string, topic: number): Promise<boolean> {
    try {
      const identity = await ethers.getContractAt(
        OnchainID.contracts.Identity.abi,
        identityAddr
      );
      const claimIds = await identity.getClaimIdsByTopic(topic);
      return claimIds.length > 0;
    } catch {
      return false;
    }
  }

  // Issue claims for deployer
  console.log(`  Issuing claims for Deployer...`);
  for (const topic of CLAIM_TOPICS) {
    const topicLabel = topic === 1 ? "KYC" : topic === 2 ? "AML" : "ACCREDITED";
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
      claimIssuerSigningKey,
      deployer
    );
    console.log("done");
  }

  // Issue claims for demo wallets
  for (const [name, signer] of Object.entries(walletSigners)) {
    const config = DEMO_WALLETS[name as keyof typeof DEMO_WALLETS];
    console.log(`  Issuing claims for ${config.label}...`);

    for (const topic of CLAIM_TOPICS) {
      const topicLabel = topic === 1 ? "KYC" : topic === 2 ? "AML" : "ACCREDITED";
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
        claimIssuerSigningKey,
        signer
      );
      console.log("done");
    }
  }

  // ================================================================
  // Phase 4: Mint tokens and unpause
  // ================================================================
  console.log("\n=== Phase 4: Mint & Unpause ===");

  const currentSupply = await retry(() => token.totalSupply());
  if (currentSupply === 0n) {
    console.log("  Minting 100,000 CPC to deployer...");
    await retry(async () => {
      await (await token.mint(deployer.address, ethers.parseEther("100000"))).wait();
    });
  } else {
    console.log(`  Already minted: ${ethers.formatEther(currentSupply)} CPC`);
  }

  const isPaused = await retry(() => token.paused());
  if (isPaused) {
    console.log("  Unpausing token...");
    await retry(async () => {
      await (await token.unpause()).wait();
    });
  } else {
    console.log("  Token already unpaused.");
  }

  // ================================================================
  // Phase 5: Verification checks
  // ================================================================
  console.log("\n=== Phase 5: Verification ===");

  const aliceAddr = await aliceSigner.getAddress();
  const charlieAddr = await charlieSigner.getAddress();

  // Bob is NOT registered — use a random address as stand-in on local
  const bobAddr = network === "hardhat" || network === "unknown"
    ? (await signers[4].getAddress())
    : (process.env.BOB_ADDRESS || ethers.ZeroAddress);

  const aliceVerified = await retry(() => identityRegistry.isVerified(aliceAddr));
  console.log(`  Alice isVerified: ${aliceVerified} (expected: true)`);

  let bobVerified = false;
  try {
    bobVerified = await retry(() => identityRegistry.isVerified(bobAddr));
  } catch {
    bobVerified = false;
  }
  console.log(`  Bob isVerified: ${bobVerified} (expected: false)`);

  const charlieVerified = await retry(() => identityRegistry.isVerified(charlieAddr));
  console.log(`  Charlie isVerified: ${charlieVerified} (expected: true)`);

  // Check compliance (canTransfer)
  const compliance = await ethers.getContractAt("ModularCompliance", addresses.modularCompliance);

  const canTransferAlice = await retry(() => compliance.canTransfer(deployer.address, aliceAddr, ethers.parseEther("500")));
  console.log(`  canTransfer(deployer->Alice, 500): ${canTransferAlice} (expected: true)`);

  const canTransferCharlie = await retry(() => compliance.canTransfer(deployer.address, charlieAddr, ethers.parseEther("500")));
  console.log(`  canTransfer(deployer->Charlie, 500): ${canTransferCharlie} (expected: false)`);

  // Check token state
  const totalSupply = await retry(() => token.totalSupply());
  console.log(`  Total supply: ${ethers.formatEther(totalSupply)} CPC`);

  const finalPaused = await retry(() => token.paused());
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
