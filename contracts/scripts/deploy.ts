import hre from "hardhat";
import OnchainID from "@onchain-id/solidity";
import {
  type Address,
  type Hex,
  encodeAbiParameters,
  encodeFunctionData,
  getAddress,
  getContract,
  keccak256,
  parseEther,
  zeroAddress,
  decodeEventLog,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { deployAndLog, saveAddresses, type DeployedAddresses } from "./helpers";

async function deployOnchainIDContract(
  abi: readonly unknown[],
  bytecode: Hex,
  args: unknown[] = []
): Promise<Address> {
  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();

  const startTime = Date.now();
  const hash = await deployer.deployContract({ abi, bytecode, args });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (!receipt.contractAddress) {
    throw new Error("Contract deployment failed — no address in receipt");
  }
  const address = getAddress(receipt.contractAddress);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`  Deployed at ${address} (${elapsed}s)`);
  return address;
}

async function main() {
  const publicClient = await hre.viem.getPublicClient();
  const [deployer] = await hre.viem.getWalletClients();
  console.log("Deployer:", deployer.account.address);
  const chainId = await publicClient.getChainId();
  console.log("Chain ID:", chainId);

  const addresses: Partial<DeployedAddresses> = {};
  const startTime = Date.now();

  try {
    // ================================================================
    // Phase 1: Deploy OnchainID infrastructure
    // ================================================================
    console.log("\n=== Phase 1: OnchainID Infrastructure ===");

    console.log("  Deploying Identity impl...");
    addresses.identityImplementation = await deployOnchainIDContract(
      OnchainID.contracts.Identity.abi,
      OnchainID.contracts.Identity.bytecode,
      [deployer.account.address, true]
    );

    console.log("  Deploying ImplementationAuthority...");
    addresses.identityImplAuthority = await deployOnchainIDContract(
      OnchainID.contracts.ImplementationAuthority.abi,
      OnchainID.contracts.ImplementationAuthority.bytecode,
      [addresses.identityImplementation]
    );

    console.log("  Deploying IdFactory...");
    addresses.idFactory = await deployOnchainIDContract(
      OnchainID.contracts.Factory.abi,
      OnchainID.contracts.Factory.bytecode,
      [addresses.identityImplAuthority]
    );

    saveAddresses(addresses);

    // ================================================================
    // Phase 2: Deploy T-REX implementation contracts
    // ================================================================
    console.log("\n=== Phase 2: T-REX Implementation Contracts ===");

    const tokenImpl = await deployAndLog("Token");
    addresses.tokenImpl = tokenImpl.address;

    const claimTopicsRegistryImpl = await deployAndLog("ClaimTopicsRegistry");
    addresses.claimTopicsRegistryImpl = claimTopicsRegistryImpl.address;

    const identityRegistryImpl = await deployAndLog("IdentityRegistry");
    addresses.identityRegistryImpl = identityRegistryImpl.address;

    const identityRegistryStorageImpl = await deployAndLog("IdentityRegistryStorage");
    addresses.identityRegistryStorageImpl = identityRegistryStorageImpl.address;

    const trustedIssuersRegistryImpl = await deployAndLog("TrustedIssuersRegistry");
    addresses.trustedIssuersRegistryImpl = trustedIssuersRegistryImpl.address;

    const modularComplianceImpl = await deployAndLog("ModularCompliance");
    addresses.modularComplianceImpl = modularComplianceImpl.address;

    saveAddresses(addresses);

    // ================================================================
    // Phase 3: TREXImplementationAuthority + version registration
    // ================================================================
    console.log("\n=== Phase 3: TREXImplementationAuthority ===");

    const trexImplAuthority = await deployAndLog("TREXImplementationAuthority", [
      true, zeroAddress, zeroAddress,
    ]);
    addresses.trexImplAuthority = trexImplAuthority.address;

    console.log("  Registering T-REX version 4.0.0...");
    const trexImplAuthContract = await hre.viem.getContractAt(
      "TREXImplementationAuthority", trexImplAuthority.address
    );
    let hash = await trexImplAuthContract.write.addAndUseTREXVersion([
      { major: 4, minor: 0, patch: 0 },
      {
        tokenImplementation: addresses.tokenImpl!,
        ctrImplementation: addresses.claimTopicsRegistryImpl!,
        irImplementation: addresses.identityRegistryImpl!,
        irsImplementation: addresses.identityRegistryStorageImpl!,
        tirImplementation: addresses.trustedIssuersRegistryImpl!,
        mcImplementation: addresses.modularComplianceImpl!,
      },
    ]);
    await publicClient.waitForTransactionReceipt({ hash });
    console.log("  Version 4.0.0 registered.");

    saveAddresses(addresses);

    // ================================================================
    // Phase 4: Deploy compliance modules
    // ================================================================
    console.log("\n=== Phase 4: Compliance Modules ===");

    const countryRestrictModule = await deployAndLog("CountryRestrictModule");
    addresses.countryRestrictModule = countryRestrictModule.address;

    const maxBalanceModule = await deployAndLog("MaxBalanceModule");
    addresses.maxBalanceModule = maxBalanceModule.address;

    const supplyLimitModule = await deployAndLog("SupplyLimitModule");
    addresses.supplyLimitModule = supplyLimitModule.address;

    saveAddresses(addresses);

    // ================================================================
    // Phase 5: Deploy TREXFactory and link to IdFactory
    // ================================================================
    console.log("\n=== Phase 5: TREXFactory ===");

    const trexFactoryResult = await deployAndLog("TREXFactory", [
      addresses.trexImplAuthority,
      addresses.idFactory,
    ]);
    addresses.trexFactory = trexFactoryResult.address;

    console.log("  Linking IdFactory to TREXFactory...");
    const idFactory = getContract({
      address: addresses.idFactory!,
      abi: OnchainID.contracts.Factory.abi,
      client: { public: publicClient, wallet: deployer },
    });
    hash = await idFactory.write.addTokenFactory([addresses.trexFactory!]);
    await publicClient.waitForTransactionReceipt({ hash });
    console.log("  IdFactory linked.");

    saveAddresses(addresses);

    // ================================================================
    // Phase 6: Deploy ClaimIssuer with signing key
    // ================================================================
    console.log("\n=== Phase 6: ClaimIssuer ===");

    const claimIssuerPrivateKey = generatePrivateKey();
    const claimIssuerAccount = privateKeyToAccount(claimIssuerPrivateKey);
    console.log(`  ClaimIssuer signing key address: ${claimIssuerAccount.address}`);

    const claimIssuerResult = await deployAndLog("ClaimIssuer", [deployer.account.address]);
    addresses.claimIssuer = claimIssuerResult.address;

    console.log("  Adding signing key (purpose=3/CLAIM, type=1/ECDSA)...");
    const claimIssuerContract = await hre.viem.getContractAt("ClaimIssuer", addresses.claimIssuer);
    const keyHash = keccak256(
      encodeAbiParameters([{ type: "address" }], [claimIssuerAccount.address])
    );
    hash = await claimIssuerContract.write.addKey([keyHash, 3n, 1n]);
    await publicClient.waitForTransactionReceipt({ hash });
    console.log("  Signing key added.");

    addresses.claimIssuerSigningKey = claimIssuerPrivateKey;
    saveAddresses(addresses);

    // ================================================================
    // Phase 7: Deploy TREX Suite via factory
    // ================================================================
    console.log("\n=== Phase 7: deployTREXSuite ===");

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

    const CLAIM_TOPICS = [1n, 2n, 7n]; // KYC, AML, ACCREDITED

    const trexFactory = await hre.viem.getContractAt("TREXFactory", addresses.trexFactory!);

    console.log("  Calling deployTREXSuite...");
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
        complianceModules: [
          addresses.countryRestrictModule!,
          addresses.maxBalanceModule!,
          addresses.supplyLimitModule!,
        ],
        complianceSettings: [countryRestrictCalldata, maxBalanceCalldata, supplyLimitCalldata],
      },
      {
        claimTopics: CLAIM_TOPICS,
        issuers: [addresses.claimIssuer!],
        issuerClaims: [CLAIM_TOPICS],
      },
    ]);
    const suiteReceipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`  Suite deployed! Gas used: ${suiteReceipt.gasUsed.toString()}`);

    // Extract addresses from TREXSuiteDeployed event
    const factoryArtifact = await hre.artifacts.readArtifact("TREXFactory");

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
          addresses.token = a._token;
          addresses.identityRegistry = a._ir;
          addresses.identityRegistryStorage = a._irs;
          addresses.trustedIssuersRegistry = a._tir;
          addresses.claimTopicsRegistry = a._ctr;
          addresses.modularCompliance = a._mc;
          break;
        }
      } catch {
        // Not a TREXFactory event
      }
    }

    if (!addresses.token) {
      throw new Error("TREXSuiteDeployed event not found in receipt");
    }

    console.log(`  Token: ${addresses.token}`);
    console.log(`  IdentityRegistry: ${addresses.identityRegistry}`);
    console.log(`  IdentityRegistryStorage: ${addresses.identityRegistryStorage}`);
    console.log(`  TrustedIssuersRegistry: ${addresses.trustedIssuersRegistry}`);
    console.log(`  ClaimTopicsRegistry: ${addresses.claimTopicsRegistry}`);
    console.log(`  ModularCompliance: ${addresses.modularCompliance}`);

    saveAddresses(addresses);

    // ================================================================
    // Summary
    // ================================================================
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n=== Deployment complete in ${elapsed}s ===`);
    console.log("All addresses saved to deployments/deployed-addresses.json");
  } catch (error: unknown) {
    console.error("\n!!! Deployment failed !!!");
    console.error(error instanceof Error ? error.message : String(error));
    saveAddresses(addresses);
    console.log("Partial addresses saved for debugging.");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
