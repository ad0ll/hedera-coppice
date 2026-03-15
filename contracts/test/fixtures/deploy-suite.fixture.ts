import hre from "hardhat";
import OnchainID from "@onchain-id/solidity";
import {
  type Address,
  type Hex,
  type PublicClient,
  encodeAbiParameters,
  encodeFunctionData,
  keccak256,
  parseEther,
  toHex,
  zeroAddress,
  getAddress,
  getContract,
  decodeEventLog,
} from "viem";
import {
  type PrivateKeyAccount,
  generatePrivateKey,
  privateKeyToAccount,
} from "viem/accounts";
import type { WalletClient } from "@nomicfoundation/hardhat-viem/types";

const CLAIM_TOPICS = [1n, 2n, 7n]; // KYC, AML, ACCREDITED

async function deployOnchainIDContract(
  abi: readonly unknown[],
  bytecode: Hex,
  args: unknown[] = []
): Promise<Address> {
  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();

  const hash = await deployer.deployContract({
    abi,
    bytecode,
    args,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (!receipt.contractAddress) {
    throw new Error("Contract deployment failed — no address in receipt");
  }
  return getAddress(receipt.contractAddress);
}

async function issueClaim(
  publicClient: PublicClient,
  identityAddr: Address,
  topic: bigint,
  claimIssuerAddress: Address,
  claimIssuerAccount: PrivateKeyAccount,
  ownerWalletClient: WalletClient
): Promise<void> {
  const data = toHex("Verified");
  const dataHash = keccak256(
    encodeAbiParameters(
      [{ type: "address" }, { type: "uint256" }, { type: "bytes" }],
      [identityAddr, topic, data]
    )
  );
  const signature = await claimIssuerAccount.signMessage({
    message: { raw: dataHash },
  });

  const hash = await ownerWalletClient.writeContract({
    address: identityAddr,
    abi: OnchainID.contracts.Identity.abi,
    functionName: "addClaim",
    args: [topic, 1n, claimIssuerAddress, signature, data, "0x"],
  });
  await publicClient.waitForTransactionReceipt({ hash });
}

export async function deployGreenBondFixture() {
  const publicClient = await hre.viem.getPublicClient();
  const [deployer, alice, bob, charlie, diana] = await hre.viem.getWalletClients();

  // ================================================================
  // Phase 1: OnchainID infrastructure
  // ================================================================
  const identityImplAddr = await deployOnchainIDContract(
    OnchainID.contracts.Identity.abi,
    OnchainID.contracts.Identity.bytecode,
    [deployer.account.address, true]
  );

  const identityImplAuthorityAddr = await deployOnchainIDContract(
    OnchainID.contracts.ImplementationAuthority.abi,
    OnchainID.contracts.ImplementationAuthority.bytecode,
    [identityImplAddr]
  );

  const idFactoryAddr = await deployOnchainIDContract(
    OnchainID.contracts.Factory.abi,
    OnchainID.contracts.Factory.bytecode,
    [identityImplAuthorityAddr]
  );

  // ================================================================
  // Phase 2: T-REX implementations
  // ================================================================
  const tokenImpl = await hre.viem.deployContract("Token", []);
  const ctrImpl = await hre.viem.deployContract("ClaimTopicsRegistry", []);
  const irImpl = await hre.viem.deployContract("IdentityRegistry", []);
  const irsImpl = await hre.viem.deployContract("IdentityRegistryStorage", []);
  const tirImpl = await hre.viem.deployContract("TrustedIssuersRegistry", []);
  const mcImpl = await hre.viem.deployContract("ModularCompliance", []);

  // ================================================================
  // Phase 3: TREXImplementationAuthority
  // ================================================================
  const trexImplAuth = await hre.viem.deployContract("TREXImplementationAuthority", [
    true, zeroAddress, zeroAddress,
  ]);

  let hash = await trexImplAuth.write.addAndUseTREXVersion([
    { major: 4, minor: 0, patch: 0 },
    {
      tokenImplementation: tokenImpl.address,
      ctrImplementation: ctrImpl.address,
      irImplementation: irImpl.address,
      irsImplementation: irsImpl.address,
      tirImplementation: tirImpl.address,
      mcImplementation: mcImpl.address,
    },
  ]);
  await publicClient.waitForTransactionReceipt({ hash });

  // ================================================================
  // Phase 4: Compliance modules
  // ================================================================
  const countryRestrict = await hre.viem.deployContract("CountryRestrictModule", []);
  const maxBalance = await hre.viem.deployContract("MaxBalanceModule", []);
  const supplyLimit = await hre.viem.deployContract("SupplyLimitModule", []);

  // ================================================================
  // Phase 5: TREXFactory
  // ================================================================
  const trexFactory = await hre.viem.deployContract("TREXFactory", [
    trexImplAuth.address,
    idFactoryAddr,
  ]);

  const idFactory = getContract({
    address: idFactoryAddr,
    abi: OnchainID.contracts.Factory.abi,
    client: { public: publicClient, wallet: deployer },
  });
  hash = await idFactory.write.addTokenFactory([trexFactory.address]);
  await publicClient.waitForTransactionReceipt({ hash });

  // ================================================================
  // Phase 6: ClaimIssuer
  // ================================================================
  const claimIssuerPrivateKey = generatePrivateKey();
  const claimIssuerAccount = privateKeyToAccount(claimIssuerPrivateKey);

  const claimIssuerContract = await hre.viem.deployContract("ClaimIssuer", [
    deployer.account.address,
  ]);

  const keyHash = keccak256(
    encodeAbiParameters([{ type: "address" }], [claimIssuerAccount.address])
  );
  hash = await claimIssuerContract.write.addKey([keyHash, 3n, 1n]);
  await publicClient.waitForTransactionReceipt({ hash });

  // ================================================================
  // Phase 7: deployTREXSuite
  // ================================================================
  const countryRestrictCalldata = encodeFunctionData({
    abi: [{ type: "function", name: "batchRestrictCountries", inputs: [{ type: "uint16[]", name: "countries" }], outputs: [], stateMutability: "nonpayable" }] as const,
    functionName: "batchRestrictCountries",
    args: [[156]],
  });
  const maxBalanceCalldata = encodeFunctionData({
    abi: [{ type: "function", name: "setMaxBalance", inputs: [{ type: "uint256", name: "_max" }], outputs: [], stateMutability: "nonpayable" }] as const,
    functionName: "setMaxBalance",
    args: [parseEther("1000000")],
  });
  const supplyLimitCalldata = encodeFunctionData({
    abi: [{ type: "function", name: "setSupplyLimit", inputs: [{ type: "uint256", name: "_limit" }], outputs: [], stateMutability: "nonpayable" }] as const,
    functionName: "setSupplyLimit",
    args: [parseEther("1000000")],
  });

  hash = await trexFactory.write.deployTREXSuite([
    "coppice-green-bond",
    {
      owner: deployer.account.address,
      name: "Coppice Green Bond",
      symbol: "CPC",
      decimals: 18,
      irs: zeroAddress,
      ONCHAINID: zeroAddress,
      irAgents: [deployer.account.address],
      tokenAgents: [deployer.account.address],
      complianceModules: [countryRestrict.address, maxBalance.address, supplyLimit.address],
      complianceSettings: [countryRestrictCalldata, maxBalanceCalldata, supplyLimitCalldata],
    },
    {
      claimTopics: CLAIM_TOPICS,
      issuers: [claimIssuerContract.address],
      issuerClaims: [CLAIM_TOPICS],
    },
  ]);

  const suiteReceipt = await publicClient.waitForTransactionReceipt({ hash });

  // Extract suite addresses from TREXSuiteDeployed event
  const factoryArtifact = await hre.artifacts.readArtifact("TREXFactory");

  let tokenAddress: Address = zeroAddress;
  let irAddress: Address = zeroAddress;
  let mcAddress: Address = zeroAddress;

  for (const log of suiteReceipt.logs) {
    try {
      const event = decodeEventLog({
        abi: factoryArtifact.abi,
        data: log.data,
        topics: log.topics,
      });
      if (event.eventName === "TREXSuiteDeployed") {
        // Typecast required: decodeEventLog returns a generic args type, but TREXSuiteDeployed
        // emits named address fields (_token, _ir, _irs, _tir, _ctr, _mc) that we need to access by name
        const a = event.args as unknown as Record<string, Address>;
        tokenAddress = a._token;
        irAddress = a._ir;
        mcAddress = a._mc;
        break;
      }
    } catch {
      // Not a TREXFactory event — skip
    }
  }

  if (tokenAddress === zeroAddress) {
    throw new Error("TREXSuiteDeployed event not found in receipt");
  }

  const token = await hre.viem.getContractAt("Token", tokenAddress);
  const identityRegistry = await hre.viem.getContractAt("IdentityRegistry", irAddress);
  const compliance = await hre.viem.getContractAt("ModularCompliance", mcAddress);

  // ================================================================
  // Setup: Deploy identities, register, issue claims
  // ================================================================
  async function deployIdentityProxy(walletAddress: Address): Promise<Address> {
    return deployOnchainIDContract(
      OnchainID.contracts.IdentityProxy.abi,
      OnchainID.contracts.IdentityProxy.bytecode,
      [identityImplAuthorityAddr, walletAddress]
    );
  }

  const deployerIdentity = await deployIdentityProxy(deployer.account.address);
  const aliceIdentity = await deployIdentityProxy(alice.account.address);
  const charlieIdentity = await deployIdentityProxy(charlie.account.address);
  const dianaIdentity = await deployIdentityProxy(diana.account.address);

  // Add token as agent if needed
  const isTokenAgent = await identityRegistry.read.isAgent([tokenAddress]);
  if (!isTokenAgent) {
    hash = await identityRegistry.write.addAgent([tokenAddress]);
    await publicClient.waitForTransactionReceipt({ hash });
  }

  // Register identities
  hash = await identityRegistry.write.batchRegisterIdentity([
    [deployer.account.address, alice.account.address, charlie.account.address, diana.account.address],
    [deployerIdentity, aliceIdentity, charlieIdentity, dianaIdentity],
    [276, 276, 156, 250],
  ]);
  await publicClient.waitForTransactionReceipt({ hash });

  // Issue claims
  for (const [walletClient, identityAddr] of [
    [deployer, deployerIdentity],
    [alice, aliceIdentity],
    [charlie, charlieIdentity],
    [diana, dianaIdentity],
  ] as const) {
    for (const topic of CLAIM_TOPICS) {
      await issueClaim(
        publicClient,
        identityAddr,
        topic,
        claimIssuerContract.address,
        claimIssuerAccount,
        walletClient
      );
    }
  }

  // Mint initial supply and unpause
  hash = await token.write.mint([deployer.account.address, parseEther("100000")]);
  await publicClient.waitForTransactionReceipt({ hash });
  hash = await token.write.unpause();
  await publicClient.waitForTransactionReceipt({ hash });

  return {
    token, identityRegistry, compliance, claimIssuerContract,
    trexFactory, countryRestrict, maxBalance, supplyLimit,
    deployer, alice, bob, charlie, diana,
    claimIssuerAccount,
    identities: { deployerIdentity, aliceIdentity, charlieIdentity, dianaIdentity },
  };
}
