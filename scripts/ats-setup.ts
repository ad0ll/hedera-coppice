/**
 * Deploys a CPC green bond token via the ATS Factory on Hedera testnet,
 * then configures roles, KYC, and initial supply.
 *
 * Steps:
 *   1. Deploy bond via Factory.deployBond() (skipped if CPC_SECURITY_ADDRESS is set)
 *   2. Grant required roles to deployer (KYC_ROLE, ISSUER, etc.)
 *   3. Grant KYC to deployer + verified demo wallets
 *   4. Issue (mint) initial CPC supply to deployer
 *   5. Set initial coupon schedule
 *
 * Prerequisites:
 *   - ATS resolver + factory already deployed on testnet (by Hedera)
 *   - Demo wallets funded with HBAR
 *   - scripts/.env configured with all keys
 *
 * Usage:
 *   cd scripts && npx tsx ats-setup.ts
 *
 * To skip deployment and configure an existing bond:
 *   CPC_SECURITY_ADDRESS=0x... npx tsx ats-setup.ts
 */
import { ethers } from "ethers";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

// ============================================================================
// Constants
// ============================================================================

const JSON_RPC_URL = process.env.HEDERA_JSON_RPC || "https://testnet.hashio.io/api";
const MIRROR_NODE_URL = process.env.HEDERA_MIRROR_NODE || "https://testnet.mirrornode.hedera.com";

// ATS testnet addresses (real EVM addresses from mirror node)
const ATS_RESOLVER_EVM = "0xefef4cae9642631cfc6d997d6207ee48fa78fe42"; // 0.0.7707874
const ATS_FACTORY_EVM = "0x5fa65ca30d1984701f10476664327f97c864a9d3"; // 0.0.7708432

const BOND_CONFIG_ID = "0x0000000000000000000000000000000000000000000000000000000000000002";

// ATS role hashes (from atsRegistry.data)
const ROLES = {
  DEFAULT_ADMIN: "0x0000000000000000000000000000000000000000000000000000000000000000",
  ISSUER: "0x4be32e8849414d19186807008dabd451c1d87dae5f8e22f32f5ce94d486da842",
  AGENT: "0xc4aed0454da9bde6defa5baf93bb49d4690626fc243d138104e12d1def783ea6",
  KYC_ROLE: "0x6fbd421e041603fa367357d79ffc3b2f9fd37a6fc4eec661aa5537a9ae75f93d",
  KYC_MANAGER: "0x8ebae577938c1afa7fb3dc7b06459c79c86ffd2ac9805b6da92ee4cbbf080449",
  INTERNAL_KYC_MANAGER: "0x3916c5c9e68488134c2ee70660332559707c133d0a295a25971da4085441522e",
  SSI_MANAGER: "0x0995a089e16ba792fdf9ec5a4235cba5445a9fb250d6e96224c586678b81ebd0",
  CONTROL_LIST_ROLE: "0xca537e1c88c9f52dc5692c96c482841c3bea25aafc5f3bfe96f645b5f800cac3",
  CORPORATE_ACTION: "0x8a139eeb747b9809192ae3de1b88acfd2568c15241a5c4f85db0443a536d77d6",
  SNAPSHOT_ROLE: "0x3fbb44760c0954eea3f6cb9f1f210568f5ae959dcbbef66e72f749dbaa7cc2da",
};

const CURRENCY_USD = "0x555344"; // bytes3 "USD"

const GAS_LIMIT = {
  high: 10_000_000,
  default: 3_000_000,
};

// ============================================================================
// ABI fragments — the bond diamond proxy exposes all facets via a single address
// ============================================================================

const FACTORY_ABI = [
  "function deployBond(tuple(tuple(bool arePartitionsProtected, bool isMultiPartition, address resolver, tuple(bytes32 key, uint256 version) resolverProxyConfiguration, tuple(bytes32 role, address[] members)[] rbacs, bool isControllable, bool isWhiteList, uint256 maxSupply, tuple(string name, string symbol, string isin, uint8 decimals) erc20MetadataInfo, bool clearingActive, bool internalKycActivated, address[] externalPauses, address[] externalControlLists, address[] externalKycLists, bool erc20VotesActivated, address compliance, address identityRegistry) security, tuple(bytes3 currency, uint256 nominalValue, uint8 nominalValueDecimals, uint256 startingDate, uint256 maturityDate) bondDetails, address[] proceedRecipients, bytes[] proceedRecipientsData) _bondData, tuple(uint8 regulationType, uint8 regulationSubType, tuple(bool countriesControlListType, string listOfCountries, string info) additionalSecurityData) _factoryRegulationData) returns (address bondAddress_)",
  "event BondDeployed(address indexed deployer, address bondAddress, tuple(tuple(bool,bool,address,tuple(bytes32,uint256),tuple(bytes32,address[])[],bool,bool,uint256,tuple(string,string,string,uint8),bool,bool,address[],address[],address[],bool,address,address),tuple(bytes3,uint256,uint8,uint256,uint256),address[],bytes[]) bondData, tuple(uint8,uint8,tuple(bool,string,string)) regulationData)",
];

const ACCESS_CONTROL_ABI = [
  "function grantRole(bytes32 _role, address _account) returns (bool)",
  "function hasRole(bytes32 _role, address _account) view returns (bool)",
];

// SSI Management facet — addIssuer (required before grantKyc)
const SSI_ABI = [
  "function addIssuer(address _issuer) returns (bool)",
  "function isIssuer(address _issuer) view returns (bool)",
];

// ControlList facet — whitelist management
const CONTROL_LIST_ABI = [
  "function addToControlList(address _account) returns (bool)",
  "function isInControlList(address _account) view returns (bool)",
  "function getControlListType() view returns (bool)",
];

const KYC_ABI = [
  "function grantKyc(address _account, string _vcId, uint256 _validFrom, uint256 _validTo, address _issuer) returns (bool)",
  "function getKycStatusFor(address _account) view returns (uint256)",
];

const ERC1594_ABI = [
  "function issue(address _tokenHolder, uint256 _value, bytes _data)",
  "function isIssuable() view returns (bool)",
];

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
];

const BOND_ABI = [
  "function setCoupon(tuple(uint256 recordDate, uint256 executionDate, uint256 startDate, uint256 endDate, uint256 fixingDate, uint256 rate, uint8 rateDecimals, uint8 rateStatus) _newCoupon) returns (uint256)",
];

const ALL_CPC_ABI = [...ACCESS_CONTROL_ABI, ...SSI_ABI, ...CONTROL_LIST_ABI, ...KYC_ABI, ...ERC1594_ABI, ...ERC20_ABI, ...BOND_ABI];

// ============================================================================
// Helpers
// ============================================================================

function getWallet(): ethers.Wallet {
  const key = process.env.DEPLOYER_PRIVATE_KEY;
  if (!key) throw new Error("Missing DEPLOYER_PRIVATE_KEY");
  const hex = key.startsWith("0x") ? key : `0x${key}`;
  const provider = new ethers.JsonRpcProvider(JSON_RPC_URL);
  return new ethers.Wallet(hex, provider);
}

async function retry<T>(fn: () => Promise<T>, retries = 3, delay = 3000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      console.log(`  Retry ${i + 1}/${retries} after error: ${(err as Error).message?.slice(0, 80)}`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("unreachable");
}

async function evmToAccountId(evmAddress: string): Promise<string> {
  const resp = await fetch(`${MIRROR_NODE_URL}/api/v1/accounts/${evmAddress}`);
  if (!resp.ok) throw new Error(`Mirror node lookup failed for ${evmAddress}: ${resp.status}`);
  const data = await resp.json();
  return data.account;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const wallet = getWallet();
  console.log(`Deployer: ${wallet.address}`);
  console.log(`RPC:      ${JSON_RPC_URL}\n`);

  let cpcAddress = process.env.CPC_SECURITY_ADDRESS || "";
  let cpcAccountId = "";

  // ================================================================
  // Step 1: Deploy CPC bond (skip if already deployed)
  // ================================================================
  if (cpcAddress) {
    console.log(`Step 1: Using existing CPC bond at ${cpcAddress}`);
    try {
      cpcAccountId = await evmToAccountId(cpcAddress);
      console.log(`  Account ID: ${cpcAccountId}`);
    } catch {
      console.log("  (Could not resolve account ID)");
    }
  } else {
    console.log("Step 1: Deploying CPC Green Bond via ATS Factory...");

    const factory = new ethers.Contract(ATS_FACTORY_EVM, FACTORY_ABI, wallet);

    const now = Math.floor(Date.now() / 1000);
    const startingDate = now + 300; // must be > block.timestamp
    const maturityDate = Math.floor(new Date("2028-03-15T00:00:00Z").getTime() / 1000);

    const bondData = {
      security: {
        arePartitionsProtected: false,
        isMultiPartition: false,
        resolver: ATS_RESOLVER_EVM,
        resolverProxyConfiguration: { key: BOND_CONFIG_ID, version: 1 },
        rbacs: [
          { role: ROLES.DEFAULT_ADMIN, members: [wallet.address] },
          { role: ROLES.ISSUER, members: [wallet.address] },
          { role: ROLES.AGENT, members: [wallet.address] },
          { role: ROLES.KYC_ROLE, members: [wallet.address] },
          { role: ROLES.KYC_MANAGER, members: [wallet.address] },
          { role: ROLES.INTERNAL_KYC_MANAGER, members: [wallet.address] },
          { role: ROLES.SSI_MANAGER, members: [wallet.address] },
          { role: ROLES.CONTROL_LIST_ROLE, members: [wallet.address] },
          { role: ROLES.CORPORATE_ACTION, members: [wallet.address] },
          { role: ROLES.SNAPSHOT_ROLE, members: [wallet.address] },
        ],
        isControllable: true,
        isWhiteList: true,
        maxSupply: ethers.parseEther("1000000"),
        erc20MetadataInfo: {
          name: "Coppice Green Bond",
          symbol: "CPC",
          isin: "XS0000000009",
          decimals: 18,
        },
        clearingActive: false,
        internalKycActivated: true,
        externalPauses: [],
        externalControlLists: [],
        externalKycLists: [],
        erc20VotesActivated: false,
        compliance: ethers.ZeroAddress,
        identityRegistry: ethers.ZeroAddress,
      },
      bondDetails: {
        currency: CURRENCY_USD,
        nominalValue: 100000, // $1000.00 (raw integer, NOT parseEther)
        nominalValueDecimals: 2,
        startingDate,
        maturityDate,
      },
      proceedRecipients: [],
      proceedRecipientsData: [],
    };

    const regulationData = {
      regulationType: 1, // REG_S
      regulationSubType: 0, // NONE
      additionalSecurityData: {
        countriesControlListType: true,
        listOfCountries: "US,DE,FR,CN",
        info: "Coppice Green Bond - Hackathon Demo",
      },
    };

    const tx = await retry(() =>
      factory.deployBond(bondData, regulationData, { gasLimit: GAS_LIMIT.high })
    );
    console.log(`  TX submitted: ${tx.hash}`);

    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) {
      throw new Error("Bond deployment transaction reverted");
    }

    const iface = new ethers.Interface(FACTORY_ABI);
    let bondAddress: string | undefined;
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
        if (parsed?.name === "BondDeployed") {
          bondAddress = parsed.args.bondAddress || parsed.args[1];
          break;
        }
      } catch {
        // Not a Factory event
      }
    }

    if (!bondAddress || bondAddress === ethers.ZeroAddress) {
      throw new Error(`BondDeployed event not found. TX: ${receipt.hash}`);
    }

    cpcAddress = bondAddress;
    console.log(`  CPC Bond deployed at: ${cpcAddress}`);

    await new Promise((r) => setTimeout(r, 5000));
    try {
      cpcAccountId = await evmToAccountId(cpcAddress);
      console.log(`  CPC Account ID: ${cpcAccountId}`);
    } catch {
      console.log("  (Could not resolve CPC account ID yet)");
    }
  }

  const cpc = new ethers.Contract(cpcAddress, ALL_CPC_ABI, wallet);

  // ================================================================
  // Step 2: Verify bond metadata
  // ================================================================
  console.log("\nStep 2: Verifying bond metadata...");

  const [name, symbol, decimals, isIssuable] = await Promise.all([
    retry(() => cpc.name()),
    retry(() => cpc.symbol()),
    retry(() => cpc.decimals()),
    retry(() => cpc.isIssuable()),
  ]);

  console.log(`  Name:       ${name}`);
  console.log(`  Symbol:     ${symbol}`);
  console.log(`  Decimals:   ${decimals}`);
  console.log(`  Issuable:   ${isIssuable}`);

  // ================================================================
  // Step 3: Ensure deployer has all required roles
  // ================================================================
  console.log("\nStep 3: Ensuring deployer has required roles...");

  const rolesToCheck = [
    { name: "KYC_ROLE", hash: ROLES.KYC_ROLE },
    { name: "ISSUER", hash: ROLES.ISSUER },
    { name: "AGENT", hash: ROLES.AGENT },
    { name: "KYC_MANAGER", hash: ROLES.KYC_MANAGER },
    { name: "INTERNAL_KYC_MANAGER", hash: ROLES.INTERNAL_KYC_MANAGER },
    { name: "SSI_MANAGER", hash: ROLES.SSI_MANAGER },
    { name: "CONTROL_LIST_ROLE", hash: ROLES.CONTROL_LIST_ROLE },
    { name: "CORPORATE_ACTION", hash: ROLES.CORPORATE_ACTION },
    { name: "SNAPSHOT_ROLE", hash: ROLES.SNAPSHOT_ROLE },
  ];

  for (const role of rolesToCheck) {
    const has = await retry(() => cpc.hasRole(role.hash, wallet.address));
    if (!has) {
      console.log(`  Granting ${role.name} to deployer...`);
      const tx = await retry(() =>
        cpc.grantRole(role.hash, wallet.address, { gasLimit: GAS_LIMIT.default })
      );
      await tx.wait();
      console.log(`    Granted.`);
    } else {
      console.log(`  ${role.name}: already assigned`);
    }
  }

  // ================================================================
  // Step 3b: Register deployer as KYC issuer
  // ================================================================
  console.log("\n  Checking issuer registration...");
  const isIssuerRegistered = await retry(() => cpc.isIssuer(wallet.address));
  if (!isIssuerRegistered) {
    console.log("  Registering deployer as KYC issuer (addIssuer)...");
    const issuerTx = await retry(() =>
      cpc.addIssuer(wallet.address, { gasLimit: GAS_LIMIT.default })
    );
    await issuerTx.wait();
    console.log("    Registered.");
  } else {
    console.log("  Already registered as issuer.");
  }

  // ================================================================
  // Step 4: Grant KYC to deployer and verified demo wallets
  // ================================================================
  console.log("\nStep 4: Granting KYC to deployer and demo wallets...");

  const kycAccounts = [
    { label: "Deployer", address: wallet.address },
  ];

  const demoWallets = [
    { envKey: "ALICE_PRIVATE_KEY", label: "Alice" },
    { envKey: "CHARLIE_PRIVATE_KEY", label: "Charlie" },
    { envKey: "DIANA_PRIVATE_KEY", label: "Diana" },
  ];

  for (const dw of demoWallets) {
    const pk = process.env[dw.envKey];
    if (pk) {
      const hex = pk.startsWith("0x") ? pk : `0x${pk}`;
      const addr = new ethers.Wallet(hex).address;
      kycAccounts.push({ label: dw.label, address: addr });
    }
  }

  const now = Math.floor(Date.now() / 1000);
  const kycValidFrom = now;
  const kycValidTo = now + 365 * 24 * 60 * 60; // 1 year

  for (const acc of kycAccounts) {
    // Check if already KYC'd (status 1 = granted)
    const kycStatus = await retry(() => cpc.getKycStatusFor(acc.address));
    if (kycStatus === 1n) {
      console.log(`  ${acc.label}: already KYC'd`);
      continue;
    }

    console.log(`  Granting KYC to ${acc.label} (${acc.address.slice(0, 10)}...)...`);
    try {
      const kycTx = await retry(() =>
        cpc.grantKyc(
          acc.address,
          `vc-${acc.label.toLowerCase()}-demo`,
          kycValidFrom,
          kycValidTo,
          wallet.address,
          { gasLimit: GAS_LIMIT.default }
        )
      );
      await kycTx.wait();
      console.log(`    KYC granted.`);
    } catch (err) {
      console.error(`    KYC grant failed: ${(err as Error).message?.slice(0, 100)}`);
    }
  }

  // ================================================================
  // Step 4b: Add accounts to whitelist (control list)
  // ================================================================
  console.log("\nStep 4b: Whitelisting accounts...");

  // All KYC accounts + deployer need to be in the control list
  for (const acc of kycAccounts) {
    const isListed = await retry(() => cpc.isInControlList(acc.address));
    if (isListed) {
      console.log(`  ${acc.label}: already whitelisted`);
      continue;
    }
    console.log(`  Whitelisting ${acc.label} (${acc.address.slice(0, 10)}...)...`);
    try {
      const wlTx = await retry(() =>
        cpc.addToControlList(acc.address, { gasLimit: GAS_LIMIT.default })
      );
      await wlTx.wait();
      console.log(`    Whitelisted.`);
    } catch (err) {
      console.error(`    Whitelist failed: ${(err as Error).message?.slice(0, 100)}`);
    }
  }

  // ================================================================
  // Step 5: Issue (mint) initial CPC supply to deployer
  // ================================================================
  console.log("\nStep 5: Issuing initial CPC supply...");

  const currentSupply = await retry(() => cpc.totalSupply());
  if (currentSupply > 0n) {
    console.log(`  Already has ${ethers.formatEther(currentSupply)} CPC — skipping mint.`);
  } else {
    const mintAmount = ethers.parseEther("100000");
    console.log(`  Minting ${ethers.formatEther(mintAmount)} CPC to deployer...`);

    const issueTx = await retry(() =>
      cpc.issue(wallet.address, mintAmount, "0x", { gasLimit: GAS_LIMIT.high })
    );
    await issueTx.wait();

    const supply = await retry(() => cpc.totalSupply());
    console.log(`  Total supply: ${ethers.formatEther(supply)} CPC`);
  }

  // ================================================================
  // Step 6: Set initial coupon
  // ================================================================
  console.log("\nStep 6: Setting initial coupon (4.25% annual)...");

  const couponStartDate = now + 300; // must be in the future
  const couponEndDate = couponStartDate + 180 * 24 * 60 * 60; // ~6 months
  const couponRecordDate = couponEndDate - 7 * 24 * 60 * 60;
  const couponExecutionDate = couponEndDate + 1 * 24 * 60 * 60;

  const coupon = {
    recordDate: couponRecordDate,
    executionDate: couponExecutionDate,
    startDate: couponStartDate,
    endDate: couponEndDate,
    fixingDate: couponRecordDate,
    rate: 425, // 4.25% = 0.0425 as fraction (425 / 10^4)
    rateDecimals: 4,
    rateStatus: 1, // Active
  };

  try {
    const couponTx = await retry(() =>
      cpc.setCoupon(coupon, { gasLimit: GAS_LIMIT.default })
    );
    await couponTx.wait();
    console.log(`  Coupon set: 4.25% from ${new Date(couponStartDate * 1000).toISOString().split("T")[0]} to ${new Date(couponEndDate * 1000).toISOString().split("T")[0]}`);
  } catch (err) {
    console.error(`  Coupon set failed: ${(err as Error).message?.slice(0, 100)}`);
    console.log("  (Coupon can be set later via the issuer dashboard)");
  }

  // ================================================================
  // Step 7: Deploy LifeCycleCashFlow (mass-payout contract)
  // ================================================================
  console.log("\nStep 7: Deploying LifeCycleCashFlow...");

  // eUSD HTS token EVM address (long-zero format for HTS token 0.0.8214937)
  const eusdEvmAddress = "0x00000000000000000000000000000000007d5999";

  let lifeCycleCashFlowProxy = process.env.LIFECYCLE_CASH_FLOW_ADDRESS || "";

  if (lifeCycleCashFlowProxy) {
    console.log(`  Using existing LifeCycleCashFlow at ${lifeCycleCashFlowProxy}`);
  } else {
    // Load compiled artifacts
    const contractsDir = path.join(__dirname, "..", "contracts");
    const lccfArtifactPath = path.join(
      contractsDir,
      "artifacts/contracts/mass-payout/LifeCycleCashFlow.sol/LifeCycleCashFlow.json"
    );
    const proxyAdminArtifactPath = path.join(
      contractsDir,
      "artifacts/@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol/ProxyAdmin.json"
    );
    const proxyArtifactPath = path.join(
      contractsDir,
      "artifacts/@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol/TransparentUpgradeableProxy.json"
    );

    const lccfArtifact = JSON.parse(fs.readFileSync(lccfArtifactPath, "utf-8"));
    const proxyAdminArtifact = JSON.parse(fs.readFileSync(proxyAdminArtifactPath, "utf-8"));
    const proxyArtifact = JSON.parse(fs.readFileSync(proxyArtifactPath, "utf-8"));

    // 7a: Deploy LifeCycleCashFlow implementation
    console.log("  7a: Deploying implementation contract...");
    const implFactory = new ethers.ContractFactory(lccfArtifact.abi, lccfArtifact.bytecode, wallet);
    const implContract = await retry(() => implFactory.deploy({ gasLimit: GAS_LIMIT.high }));
    const implReceipt = await implContract.deploymentTransaction()?.wait();
    const implAddress = await implContract.getAddress();
    console.log(`      Implementation: ${implAddress}`);

    await new Promise((r) => setTimeout(r, 5000));

    // 7b: Deploy ProxyAdmin
    console.log("  7b: Deploying ProxyAdmin...");
    const adminFactory = new ethers.ContractFactory(proxyAdminArtifact.abi, proxyAdminArtifact.bytecode, wallet);
    const adminContract = await retry(() => adminFactory.deploy({ gasLimit: GAS_LIMIT.default }));
    await adminContract.deploymentTransaction()?.wait();
    const adminAddress = await adminContract.getAddress();
    console.log(`      ProxyAdmin: ${adminAddress}`);

    await new Promise((r) => setTimeout(r, 5000));

    // 7c: Deploy TransparentUpgradeableProxy
    console.log("  7c: Deploying TransparentUpgradeableProxy...");
    const proxyFactory = new ethers.ContractFactory(proxyArtifact.abi, proxyArtifact.bytecode, wallet);
    const proxyContract = await retry(() =>
      proxyFactory.deploy(implAddress, adminAddress, "0x", { gasLimit: GAS_LIMIT.high })
    );
    await proxyContract.deploymentTransaction()?.wait();
    lifeCycleCashFlowProxy = await proxyContract.getAddress();
    console.log(`      Proxy: ${lifeCycleCashFlowProxy}`);

    await new Promise((r) => setTimeout(r, 5000));

    // 7d: Initialize
    console.log("  7d: Initializing LifeCycleCashFlow...");

    // LifeCycleCashFlow roles
    const LCCF_ROLES = {
      DEFAULT_ADMIN: "0x0000000000000000000000000000000000000000000000000000000000000000",
      PAUSER_ROLE: "0x8943226357c41253cf6ffc651e04f2a3a7cf1255138972ce150e207c0393cbce",
      PAYOUT_ROLE: "0x88ad01da1e5558735d5b478c04a0f1667377fb68a98cb0278159d0b790f08c10",
      CASHOUT_ROLE: "0xe0d6eef1076057afbcdc5a0534cf7ab9071fa4fdd3750e202da3d49c8913a144",
      TRANSFERER_ROLE: "0x4a16419d45be80f6de7609caac23eb8c7bfe6336a71da3cefd43ea62183ad211",
      PAYMENT_TOKEN_MANAGER_ROLE: "0x15e92345f55818ea6e01143954b5841c1ba74302c2b157a2b4d0f21f9ad40286",
    };

    const rbac = Object.values(LCCF_ROLES).map((role) => ({
      role,
      members: [wallet.address],
    }));

    const lccf = new ethers.Contract(lifeCycleCashFlowProxy, lccfArtifact.abi, wallet);

    const initTx = await retry(() =>
      lccf.initialize(cpcAddress, eusdEvmAddress, rbac, { gasLimit: GAS_LIMIT.high })
    );
    await initTx.wait();
    console.log("      Initialized.");

    try {
      const lccfAccountId = await evmToAccountId(lifeCycleCashFlowProxy);
      console.log(`      LifeCycleCashFlow Account ID: ${lccfAccountId}`);
    } catch {
      console.log("      (Could not resolve account ID)");
    }
  }

  // ================================================================
  // Summary
  // ================================================================
  const finalSupply = await retry(() => cpc.totalSupply());

  console.log("\n" + "=".repeat(60));
  console.log("Setup Complete!");
  console.log("=".repeat(60));
  console.log(`\nCPC Bond Address (EVM): ${cpcAddress}`);
  if (cpcAccountId) console.log(`CPC Account ID:        ${cpcAccountId}`);
  console.log(`Total Supply:          ${ethers.formatEther(finalSupply)} CPC`);
  console.log(`Maturity:              2028-03-15`);
  console.log(`Coupon Rate:           4.25%`);
  console.log(`LifeCycleCashFlow:     ${lifeCycleCashFlowProxy}`);

  console.log("\nAdd to frontend/.env:");
  console.log(`NEXT_PUBLIC_CPC_SECURITY_ID=${cpcAddress}`);
  console.log(`LIFECYCLE_CASH_FLOW_ADDRESS=${lifeCycleCashFlowProxy}`);

  console.log("\nAdd to scripts/.env:");
  console.log(`LIFECYCLE_CASH_FLOW_ADDRESS=${lifeCycleCashFlowProxy}`);

  console.log("\nHashScan:");
  console.log(`https://hashscan.io/testnet/contract/${cpcAddress}`);
  console.log(`https://hashscan.io/testnet/contract/${lifeCycleCashFlowProxy}`);
}

main().catch((error) => {
  console.error("\nSetup failed:", error);
  process.exit(1);
});
