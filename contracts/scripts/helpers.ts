import hre from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { type Address, type Hex } from "viem";

const ADDRESSES_FILE = path.join(__dirname, "..", "deployments", "deployed-addresses.json");

export interface DeployedAddresses {
  // OnchainID infrastructure
  identityImplementation: Address;
  identityImplAuthority: Address;
  idFactory: Address;

  // T-REX implementation contracts
  tokenImpl: Address;
  claimTopicsRegistryImpl: Address;
  identityRegistryImpl: Address;
  identityRegistryStorageImpl: Address;
  trustedIssuersRegistryImpl: Address;
  modularComplianceImpl: Address;

  // T-REX infrastructure
  trexImplAuthority: Address;
  trexFactory: Address;

  // Compliance modules
  countryRestrictModule: Address;
  maxBalanceModule: Address;
  supplyLimitModule: Address;

  // Claim issuer
  claimIssuer: Address;
  claimIssuerSigningKey: Hex;

  // Suite (from TREXSuiteDeployed event)
  token: Address;
  identityRegistry: Address;
  identityRegistryStorage: Address;
  trustedIssuersRegistry: Address;
  claimTopicsRegistry: Address;
  modularCompliance: Address;
}

export function saveAddresses(addresses: Partial<DeployedAddresses>): void {
  const dir = path.dirname(ADDRESSES_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

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
  constructorArgs: unknown[] = []
): Promise<{ address: Address }> {
  const startTime = Date.now();
  console.log(`  Deploying ${name}...`);

  const contract = await hre.viem.deployContract(name, constructorArgs);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`  ${name} deployed at ${contract.address} (${elapsed}s)`);

  return contract;
}
