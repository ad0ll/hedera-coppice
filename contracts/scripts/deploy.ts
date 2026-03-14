import { ethers } from "hardhat";
import OnchainID from "@onchain-id/solidity";
import { deployAndLog, saveAddresses, DeployedAddresses } from "./helpers";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Network:", (await ethers.provider.getNetwork()).name);

  const addresses: Partial<DeployedAddresses> = {};
  const startTime = Date.now();

  try {
    // ================================================================
    // Phase 1: Deploy OnchainID infrastructure
    // ================================================================
    console.log("\n=== Phase 1: OnchainID Infrastructure ===");

    const identityImpl = await new ethers.ContractFactory(
      OnchainID.contracts.Identity.abi,
      OnchainID.contracts.Identity.bytecode,
      deployer
    ).deploy(deployer.address, true);
    await identityImpl.waitForDeployment();
    addresses.identityImplementation = await identityImpl.getAddress();
    console.log(`  Identity impl: ${addresses.identityImplementation}`);

    const identityImplAuthority = await new ethers.ContractFactory(
      OnchainID.contracts.ImplementationAuthority.abi,
      OnchainID.contracts.ImplementationAuthority.bytecode,
      deployer
    ).deploy(addresses.identityImplementation);
    await identityImplAuthority.waitForDeployment();
    addresses.identityImplAuthority = await identityImplAuthority.getAddress();
    console.log(`  Identity ImplementationAuthority: ${addresses.identityImplAuthority}`);

    const idFactory = await new ethers.ContractFactory(
      OnchainID.contracts.Factory.abi,
      OnchainID.contracts.Factory.bytecode,
      deployer
    ).deploy(addresses.identityImplAuthority);
    await idFactory.waitForDeployment();
    addresses.idFactory = await idFactory.getAddress();
    console.log(`  IdFactory: ${addresses.idFactory}`);

    saveAddresses(addresses);

    // ================================================================
    // Phase 2: Deploy T-REX implementation contracts
    // ================================================================
    console.log("\n=== Phase 2: T-REX Implementation Contracts ===");

    const tokenImpl = await deployAndLog("Token");
    addresses.tokenImpl = await tokenImpl.getAddress();

    const claimTopicsRegistryImpl = await deployAndLog("ClaimTopicsRegistry");
    addresses.claimTopicsRegistryImpl = await claimTopicsRegistryImpl.getAddress();

    const identityRegistryImpl = await deployAndLog("IdentityRegistry");
    addresses.identityRegistryImpl = await identityRegistryImpl.getAddress();

    const identityRegistryStorageImpl = await deployAndLog("IdentityRegistryStorage");
    addresses.identityRegistryStorageImpl = await identityRegistryStorageImpl.getAddress();

    const trustedIssuersRegistryImpl = await deployAndLog("TrustedIssuersRegistry");
    addresses.trustedIssuersRegistryImpl = await trustedIssuersRegistryImpl.getAddress();

    const modularComplianceImpl = await deployAndLog("ModularCompliance");
    addresses.modularComplianceImpl = await modularComplianceImpl.getAddress();

    saveAddresses(addresses);

    // ================================================================
    // Phase 3: TREXImplementationAuthority + version registration
    // ================================================================
    console.log("\n=== Phase 3: TREXImplementationAuthority ===");

    const trexImplAuthority = await deployAndLog("TREXImplementationAuthority", [
      true,
      ethers.ZeroAddress,
      ethers.ZeroAddress,
    ]);
    addresses.trexImplAuthority = await trexImplAuthority.getAddress();

    console.log("  Registering T-REX version 4.0.0...");
    const versionTx = await trexImplAuthority.addAndUseTREXVersion(
      { major: 4, minor: 0, patch: 0 },
      {
        tokenImplementation: addresses.tokenImpl,
        ctrImplementation: addresses.claimTopicsRegistryImpl,
        irImplementation: addresses.identityRegistryImpl,
        irsImplementation: addresses.identityRegistryStorageImpl,
        tirImplementation: addresses.trustedIssuersRegistryImpl,
        mcImplementation: addresses.modularComplianceImpl,
      }
    );
    await versionTx.wait();
    console.log("  Version 4.0.0 registered.");

    saveAddresses(addresses);

    // ================================================================
    // Phase 4: Deploy compliance modules
    // ================================================================
    console.log("\n=== Phase 4: Compliance Modules ===");

    const countryRestrictModule = await deployAndLog("CountryRestrictModule");
    addresses.countryRestrictModule = await countryRestrictModule.getAddress();

    const maxBalanceModule = await deployAndLog("MaxBalanceModule");
    addresses.maxBalanceModule = await maxBalanceModule.getAddress();

    const supplyLimitModule = await deployAndLog("SupplyLimitModule");
    addresses.supplyLimitModule = await supplyLimitModule.getAddress();

    saveAddresses(addresses);

    // ================================================================
    // Phase 5: Deploy TREXFactory and link to IdFactory
    // ================================================================
    console.log("\n=== Phase 5: TREXFactory ===");

    const trexFactory = await deployAndLog("TREXFactory", [
      addresses.trexImplAuthority,
      addresses.idFactory,
    ]);
    addresses.trexFactory = await trexFactory.getAddress();

    console.log("  Linking IdFactory to TREXFactory...");
    const linkTx = await idFactory.addTokenFactory(addresses.trexFactory);
    await linkTx.wait();
    console.log("  IdFactory linked.");

    saveAddresses(addresses);

    // ================================================================
    // Phase 6: Deploy ClaimIssuer with signing key
    // ================================================================
    console.log("\n=== Phase 6: ClaimIssuer ===");

    const claimIssuerSigningKey = ethers.Wallet.createRandom();
    console.log(`  ClaimIssuer signing key address: ${claimIssuerSigningKey.address}`);

    const claimIssuerContract = await deployAndLog("ClaimIssuer", [deployer.address]);
    addresses.claimIssuer = await claimIssuerContract.getAddress();

    console.log("  Adding signing key (purpose=3/CLAIM, type=1/ECDSA)...");
    const keyHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(["address"], [claimIssuerSigningKey.address])
    );
    const addKeyTx = await claimIssuerContract.addKey(keyHash, 3, 1);
    await addKeyTx.wait();
    console.log("  Signing key added.");

    addresses.claimIssuerSigningKey = claimIssuerSigningKey.privateKey;
    saveAddresses(addresses);

    // ================================================================
    // Phase 7: Deploy TREX Suite via factory
    // ================================================================
    console.log("\n=== Phase 7: deployTREXSuite ===");

    // Encode compliance module settings
    const countryRestrictIface = new ethers.Interface([
      "function batchRestrictCountries(uint16[] calldata countries)",
    ]);
    const maxBalanceIface = new ethers.Interface([
      "function setMaxBalance(uint256 _max)",
    ]);
    const supplyLimitIface = new ethers.Interface([
      "function setSupplyLimit(uint256 _limit)",
    ]);

    const CLAIM_TOPICS = [1, 2, 7]; // KYC, AML, ACCREDITED

    const tokenDetails = {
      owner: deployer.address,
      name: "Coppice Green Bond",
      symbol: "CPC",
      decimals: 18,
      irs: ethers.ZeroAddress,
      ONCHAINID: ethers.ZeroAddress,
      irAgents: [deployer.address],
      tokenAgents: [deployer.address],
      complianceModules: [
        addresses.countryRestrictModule,
        addresses.maxBalanceModule,
        addresses.supplyLimitModule,
      ],
      complianceSettings: [
        countryRestrictIface.encodeFunctionData("batchRestrictCountries", [[156]]),
        maxBalanceIface.encodeFunctionData("setMaxBalance", [ethers.parseEther("1000000")]),
        supplyLimitIface.encodeFunctionData("setSupplyLimit", [ethers.parseEther("1000000")]),
      ],
    };

    const claimDetails = {
      claimTopics: CLAIM_TOPICS,
      issuers: [addresses.claimIssuer],
      issuerClaims: [CLAIM_TOPICS],
    };

    console.log("  Calling deployTREXSuite...");
    const suiteTx = await trexFactory.deployTREXSuite(
      "coppice-green-bond",
      tokenDetails,
      claimDetails
    );
    const suiteReceipt = await suiteTx.wait();
    console.log(`  Suite deployed! Gas used: ${suiteReceipt!.gasUsed.toString()}`);

    // Extract addresses from TREXSuiteDeployed event
    const trexFactoryContract = await ethers.getContractAt("TREXFactory", addresses.trexFactory);
    const suiteEvents = suiteReceipt!.logs
      .map((log: any) => {
        try {
          return trexFactoryContract.interface.parseLog({ topics: log.topics as string[], data: log.data });
        } catch {
          return null;
        }
      })
      .filter((e: any) => e && e.name === "TREXSuiteDeployed");

    if (suiteEvents.length === 0) {
      throw new Error("TREXSuiteDeployed event not found in receipt");
    }

    const suiteEvent = suiteEvents[0]!;
    addresses.token = suiteEvent.args[0];
    addresses.identityRegistry = suiteEvent.args[1];
    addresses.identityRegistryStorage = suiteEvent.args[2];
    addresses.trustedIssuersRegistry = suiteEvent.args[3];
    addresses.claimTopicsRegistry = suiteEvent.args[4];
    addresses.modularCompliance = suiteEvent.args[5];

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
  } catch (error: any) {
    console.error("\n!!! Deployment failed !!!");
    console.error(error.message || error);
    saveAddresses(addresses);
    console.log("Partial addresses saved for debugging.");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
