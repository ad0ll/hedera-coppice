import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const ADDRESSES_FILE = path.join(__dirname, "..", "deployments", "deployed-addresses.json");

export interface DeployedAddresses {
  // OnchainID infrastructure
  identityImplementation: string;
  identityImplAuthority: string;
  idFactory: string;

  // T-REX implementation contracts
  tokenImpl: string;
  claimTopicsRegistryImpl: string;
  identityRegistryImpl: string;
  identityRegistryStorageImpl: string;
  trustedIssuersRegistryImpl: string;
  modularComplianceImpl: string;

  // T-REX infrastructure
  trexImplAuthority: string;
  trexFactory: string;

  // Compliance modules
  countryRestrictModule: string;
  maxBalanceModule: string;
  supplyLimitModule: string;

  // Claim issuer
  claimIssuer: string;
  claimIssuerSigningKey: string;

  // Suite (from TREXSuiteDeployed event)
  token: string;
  identityRegistry: string;
  identityRegistryStorage: string;
  trustedIssuersRegistry: string;
  claimTopicsRegistry: string;
  modularCompliance: string;
}

export function saveAddresses(addresses: Partial<DeployedAddresses>): void {
  const dir = path.dirname(ADDRESSES_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Merge with existing if any
  let existing: Partial<DeployedAddresses> = {};
  if (fs.existsSync(ADDRESSES_FILE)) {
    existing = JSON.parse(fs.readFileSync(ADDRESSES_FILE, "utf8"));
  }

  const merged = { ...existing, ...addresses };
  fs.writeFileSync(ADDRESSES_FILE, JSON.stringify(merged, null, 2));
  console.log(`  Addresses saved to ${ADDRESSES_FILE}`);
}

export function loadAddresses(): DeployedAddresses {
  if (!fs.existsSync(ADDRESSES_FILE)) {
    throw new Error(`No deployed addresses found at ${ADDRESSES_FILE}. Run deploy.ts first.`);
  }
  return JSON.parse(fs.readFileSync(ADDRESSES_FILE, "utf8"));
}

export async function deployAndLog(
  name: string,
  args: any[] = []
): Promise<any> {
  const startTime = Date.now();
  console.log(`  Deploying ${name}...`);

  const contract = await ethers.deployContract(name, args);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`  ${name} deployed at ${address} (${elapsed}s)`);

  return contract;
}
