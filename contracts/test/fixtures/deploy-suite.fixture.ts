import { ethers } from "hardhat";
import OnchainID from "@onchain-id/solidity";

const CLAIM_TOPICS = [1, 2, 7]; // KYC, AML, ACCREDITED

async function deployIdentityProxy(
  implAuthorityAddress: string,
  walletAddress: string,
  deployer: any
): Promise<string> {
  const proxy = await new ethers.ContractFactory(
    OnchainID.contracts.IdentityProxy.abi,
    OnchainID.contracts.IdentityProxy.bytecode,
    deployer
  ).deploy(implAuthorityAddress, walletAddress);
  await proxy.waitForDeployment();
  return proxy.getAddress();
}

async function issueClaim(
  identityAddr: string,
  topic: number,
  claimIssuerAddress: string,
  claimIssuerSigningKey: any,
  walletSigner: any
): Promise<void> {
  const identity = new ethers.Contract(
    identityAddr,
    OnchainID.contracts.Identity.abi,
    walletSigner
  );
  const data = ethers.hexlify(ethers.toUtf8Bytes("Verified"));
  const dataHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", "bytes"],
      [identityAddr, topic, data]
    )
  );
  const signature = await claimIssuerSigningKey.signMessage(ethers.getBytes(dataHash));
  await (await identity.addClaim(
    topic, 1, claimIssuerAddress, signature, data, ""
  )).wait();
}

export async function deployGreenBondFixture() {
  const [deployer, alice, bob, charlie, diana] = await ethers.getSigners();

  // ================================================================
  // Phase 1: OnchainID infrastructure
  // ================================================================
  const identityImpl = await new ethers.ContractFactory(
    OnchainID.contracts.Identity.abi,
    OnchainID.contracts.Identity.bytecode,
    deployer
  ).deploy(deployer.address, true);
  await identityImpl.waitForDeployment();

  const identityImplAuthority = await new ethers.ContractFactory(
    OnchainID.contracts.ImplementationAuthority.abi,
    OnchainID.contracts.ImplementationAuthority.bytecode,
    deployer
  ).deploy(await identityImpl.getAddress());
  await identityImplAuthority.waitForDeployment();

  const idFactory = await new ethers.ContractFactory(
    OnchainID.contracts.Factory.abi,
    OnchainID.contracts.Factory.bytecode,
    deployer
  ).deploy(await identityImplAuthority.getAddress());
  await idFactory.waitForDeployment();

  // ================================================================
  // Phase 2: T-REX implementations
  // ================================================================
  const tokenImpl = await ethers.deployContract("Token");
  const ctrImpl = await ethers.deployContract("ClaimTopicsRegistry");
  const irImpl = await ethers.deployContract("IdentityRegistry");
  const irsImpl = await ethers.deployContract("IdentityRegistryStorage");
  const tirImpl = await ethers.deployContract("TrustedIssuersRegistry");
  const mcImpl = await ethers.deployContract("ModularCompliance");
  await Promise.all([
    tokenImpl.waitForDeployment(), ctrImpl.waitForDeployment(),
    irImpl.waitForDeployment(), irsImpl.waitForDeployment(),
    tirImpl.waitForDeployment(), mcImpl.waitForDeployment(),
  ]);

  // ================================================================
  // Phase 3: TREXImplementationAuthority
  // ================================================================
  const trexImplAuth = await ethers.deployContract("TREXImplementationAuthority", [
    true, ethers.ZeroAddress, ethers.ZeroAddress,
  ]);
  await trexImplAuth.waitForDeployment();
  await (await trexImplAuth.addAndUseTREXVersion(
    { major: 4, minor: 0, patch: 0 },
    {
      tokenImplementation: await tokenImpl.getAddress(),
      ctrImplementation: await ctrImpl.getAddress(),
      irImplementation: await irImpl.getAddress(),
      irsImplementation: await irsImpl.getAddress(),
      tirImplementation: await tirImpl.getAddress(),
      mcImplementation: await mcImpl.getAddress(),
    }
  )).wait();

  // ================================================================
  // Phase 4: Compliance modules
  // ================================================================
  const countryRestrict = await ethers.deployContract("CountryRestrictModule");
  const maxBalance = await ethers.deployContract("MaxBalanceModule");
  const supplyLimit = await ethers.deployContract("SupplyLimitModule");
  await Promise.all([
    countryRestrict.waitForDeployment(),
    maxBalance.waitForDeployment(),
    supplyLimit.waitForDeployment(),
  ]);

  // ================================================================
  // Phase 5: TREXFactory
  // ================================================================
  const trexFactory = await ethers.deployContract("TREXFactory", [
    await trexImplAuth.getAddress(),
    await idFactory.getAddress(),
  ]);
  await trexFactory.waitForDeployment();
  await (await idFactory.addTokenFactory(await trexFactory.getAddress())).wait();

  // ================================================================
  // Phase 6: ClaimIssuer
  // ================================================================
  const claimIssuerSigningKey = ethers.Wallet.createRandom();
  const claimIssuerContract = await ethers.deployContract("ClaimIssuer", [deployer.address]);
  await claimIssuerContract.waitForDeployment();
  const keyHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(["address"], [claimIssuerSigningKey.address])
  );
  await (await claimIssuerContract.addKey(keyHash, 3, 1)).wait();

  // ================================================================
  // Phase 7: deployTREXSuite
  // ================================================================
  const countryRestrictIface = new ethers.Interface([
    "function batchRestrictCountries(uint16[] calldata countries)",
  ]);
  const maxBalanceIface = new ethers.Interface([
    "function setMaxBalance(uint256 _max)",
  ]);
  const supplyLimitIface = new ethers.Interface([
    "function setSupplyLimit(uint256 _limit)",
  ]);

  const suiteTx = await trexFactory.deployTREXSuite(
    "coppice-green-bond",
    {
      owner: deployer.address,
      name: "Coppice Green Bond",
      symbol: "CPC",
      decimals: 18,
      irs: ethers.ZeroAddress,
      ONCHAINID: ethers.ZeroAddress,
      irAgents: [deployer.address],
      tokenAgents: [deployer.address],
      complianceModules: [
        await countryRestrict.getAddress(),
        await maxBalance.getAddress(),
        await supplyLimit.getAddress(),
      ],
      complianceSettings: [
        countryRestrictIface.encodeFunctionData("batchRestrictCountries", [[156]]),
        maxBalanceIface.encodeFunctionData("setMaxBalance", [ethers.parseEther("1000000")]),
        supplyLimitIface.encodeFunctionData("setSupplyLimit", [ethers.parseEther("1000000")]),
      ],
    },
    {
      claimTopics: CLAIM_TOPICS,
      issuers: [await claimIssuerContract.getAddress()],
      issuerClaims: [CLAIM_TOPICS],
    }
  );
  const suiteReceipt = await suiteTx.wait();

  // Extract suite addresses
  const factoryForParsing = await ethers.getContractAt("TREXFactory", await trexFactory.getAddress());
  const suiteEvents = suiteReceipt!.logs
    .map((log: any) => {
      try {
        return factoryForParsing.interface.parseLog({ topics: log.topics as string[], data: log.data });
      } catch { return null; }
    })
    .filter((e: any) => e && e.name === "TREXSuiteDeployed");

  const event = suiteEvents[0]!;
  const tokenAddress = event.args[0];
  const irAddress = event.args[1];
  const mcAddress = event.args[5];

  const token = await ethers.getContractAt("Token", tokenAddress);
  const identityRegistry = await ethers.getContractAt("IdentityRegistry", irAddress);
  const compliance = await ethers.getContractAt("ModularCompliance", mcAddress);

  // ================================================================
  // Setup: Deploy identities, register, issue claims
  // ================================================================
  const implAuthAddr = await identityImplAuthority.getAddress();
  const deployerIdentity = await deployIdentityProxy(implAuthAddr, deployer.address, deployer);
  const aliceIdentity = await deployIdentityProxy(implAuthAddr, alice.address, deployer);
  const charlieIdentity = await deployIdentityProxy(implAuthAddr, charlie.address, deployer);
  const dianaIdentity = await deployIdentityProxy(implAuthAddr, diana.address, deployer);

  // Add token as agent if not already
  const isTokenAgent = await identityRegistry.isAgent(tokenAddress);
  if (!isTokenAgent) {
    await (await identityRegistry.addAgent(tokenAddress)).wait();
  }

  // Register identities
  await (await identityRegistry.batchRegisterIdentity(
    [deployer.address, alice.address, charlie.address, diana.address],
    [deployerIdentity, aliceIdentity, charlieIdentity, dianaIdentity],
    [276, 276, 156, 250]
  )).wait();

  // Issue claims
  const claimIssuerAddr = await claimIssuerContract.getAddress();
  for (const [signer, identityAddr] of [
    [deployer, deployerIdentity],
    [alice, aliceIdentity],
    [charlie, charlieIdentity],
    [diana, dianaIdentity],
  ] as const) {
    for (const topic of CLAIM_TOPICS) {
      await issueClaim(identityAddr, topic, claimIssuerAddr, claimIssuerSigningKey, signer);
    }
  }

  // Mint initial supply and unpause
  await (await token.mint(deployer.address, ethers.parseEther("100000"))).wait();
  await (await token.unpause()).wait();

  return {
    token, identityRegistry, compliance, claimIssuerContract,
    trexFactory, countryRestrict, maxBalance, supplyLimit,
    deployer, alice, bob, charlie, diana,
    claimIssuerSigningKey,
    identities: { deployerIdentity, aliceIdentity, charlieIdentity, dianaIdentity },
  };
}
