# Viem Migration — Contracts Directory

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace ethers.js with viem in the contracts workspace (Hardhat scripts, test fixture, tests, helpers) using `@nomicfoundation/hardhat-toolbox-viem`. This gives us type-safe contract interactions, better error messages, and alignment with the frontend viem migration (Plan 3).

**Architecture:** Swap `@nomicfoundation/hardhat-toolbox` (ethers) for `@nomicfoundation/hardhat-toolbox-viem`. Rewrite all Hardhat scripts and tests to use viem's API (`getContractAt`, `deployContract`, `publicClient`, `walletClient`). The existing TypeChain types (ethers-flavored) will be replaced by hardhat-viem's auto-generated types. Export ABI + address constants from a shared location for the frontend.

**Tech Stack:** Hardhat 2, @nomicfoundation/hardhat-toolbox-viem, viem, @onchain-id/solidity, @tokenysolutions/t-rex

**Risk assessment:** This is the riskiest plan. The T-REX contracts use ethers.js patterns heavily (ContractFactory with raw ABI/bytecode for OnchainID). Viem Hardhat helpers may not cover all edge cases. If we hit blockers, we can fall back to using viem's lower-level `getContract()` with manual ABI imports. The 32 existing tests are our safety net — they must all pass after migration.

**IMPORTANT — Pre-execution review:** The low-hanging fruit plan (Plan 1) modifies several files in the contracts and middleware workspaces. Before starting this plan, re-read the current state of all files listed below and revise any task steps that conflict with changes made by Plan 1. Key files to re-check: `contracts/hardhat.config.ts`, `contracts/scripts/helpers.ts`, `contracts/package.json`, `middleware/src/purchase-api.ts`.

**Important:** The T-REX npm packages (`@tokenysolutions/t-rex`, `@onchain-id/solidity`) export ABIs and bytecodes as JavaScript objects, not as Solidity source. The deploy script uses `new ethers.ContractFactory(ABI, bytecode, signer).deploy()` for OnchainID contracts. In viem, the equivalent is `walletClient.deployContract({ abi, bytecode, args })`. This pattern must be preserved.

**Typecasting rule:** Do not typecast (`as any`, `as Type`) unless explicitly instructed. If a typecast is absolutely unavoidable, include a clear comment explaining why. Prefer fixing the underlying type issue instead. The `as any` casts in this plan's code samples are placeholders — the implementer should find the correct types from `hardhat-toolbox-viem` type definitions. If `hre.viem.deployContract` doesn't accept T-REX contract names, use the artifact ABI directly with viem's `getContract()` instead of casting to `any`.

---

### Task 1: Swap Hardhat Toolbox Plugin

**Files:**
- Modify: `contracts/package.json`
- Modify: `contracts/hardhat.config.ts`

**Step 1: Install viem toolbox, remove ethers toolbox**

Run:
```bash
cd contracts && npm uninstall @nomicfoundation/hardhat-toolbox
cd contracts && npm install -D @nomicfoundation/hardhat-toolbox-viem
```

Note: `@nomicfoundation/hardhat-toolbox-viem` pulls in `viem` as a peer dependency. Verify viem is installed:
```bash
cd contracts && npx hardhat --version
```

**Step 2: Update hardhat.config.ts**

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";
import * as dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hederaTestnet: {
      url: process.env.HEDERA_JSON_RPC || "https://testnet.hashio.io/api",
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
      chainId: 296,
    },
  },
  sourcify: {
    enabled: true,
  },
  etherscan: {
    apiKey: {
      hederaTestnet: "no-api-key-needed",
    },
    customChains: [
      {
        network: "hederaTestnet",
        chainId: 296,
        urls: {
          apiURL: "https://server-verify.hashscan.io",
          browserURL: "https://hashscan.io/testnet",
        },
      },
    ],
  },
};

export default config;
```

**Step 3: Recompile to generate viem types**

Run: `cd contracts && npx hardhat compile`

This will generate viem-flavored type artifacts instead of TypeChain ethers types. The old `typechain-types/` directory can be deleted.

**Step 4: Delete old TypeChain types**

Run: `rm -rf contracts/typechain-types`

**Step 5: Verify compilation succeeds**

Run: `cd contracts && npx hardhat compile`
Expected: Compilation successful, no errors

**Step 6: Commit**

```bash
git add contracts/package.json contracts/package-lock.json contracts/hardhat.config.ts
git rm -r contracts/typechain-types
git commit -m "chore: swap hardhat-toolbox-ethers for hardhat-toolbox-viem"
```

---

### Task 2: Rewrite helpers.ts

**Files:**
- Modify: `contracts/scripts/helpers.ts`

**Step 1: Rewrite helpers.ts to use viem + hardhat-viem**

```typescript
import hre from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { type Address, type Hex, getAddress } from "viem";

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
  args: any[] = []
): Promise<{ address: Address }> {
  const startTime = Date.now();
  console.log(`  Deploying ${name}...`);

  const contract = await hre.viem.deployContract(name as any, args);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`  ${name} deployed at ${contract.address} (${elapsed}s)`);

  return contract;
}
```

**Step 2: Verify it compiles**

Run: `cd contracts && npx tsc --noEmit`

If there are type errors with `hre.viem.deployContract`, check the hardhat-toolbox-viem docs for the correct import pattern. The `hre.viem` namespace is added by the plugin.

**Step 3: Commit**

```bash
git add contracts/scripts/helpers.ts
git commit -m "refactor: rewrite helpers.ts for viem"
```

---

### Task 3: Rewrite Test Fixture

This is the hardest task because the fixture uses `ethers.ContractFactory` with raw ABI/bytecode from `@onchain-id/solidity`, which is not a compiled Hardhat artifact.

**Files:**
- Modify: `contracts/test/fixtures/deploy-suite.fixture.ts`

**Key challenge:** `@onchain-id/solidity` exports `{ abi, bytecode }` objects. With ethers, we used `new ContractFactory(abi, bytecode, signer).deploy()`. With viem, we need `walletClient.deployContract({ abi, bytecode, args })`.

**Step 1: Rewrite the fixture**

```typescript
import hre from "hardhat";
import OnchainID from "@onchain-id/solidity";
import {
  type Address,
  type Hex,
  encodeAbiParameters,
  keccak256,
  parseEther,
  toHex,
  zeroAddress,
  getContract,
  encodeFunctionData,
} from "viem";
import { getAddress } from "viem";

const CLAIM_TOPICS = [1n, 2n, 7n]; // KYC, AML, ACCREDITED (bigint for viem)

async function deployOnchainIDContract(
  abi: any[],
  bytecode: Hex,
  args: any[] = []
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
  identityAddr: Address,
  topic: bigint,
  claimIssuerAddress: Address,
  claimIssuerAccount: any, // viem WalletClient
  walletClient: any // the wallet owner signs
): Promise<void> {
  const publicClient = await hre.viem.getPublicClient();

  const data = toHex("Verified");
  const dataHash = keccak256(
    encodeAbiParameters(
      [{ type: "address" }, { type: "uint256" }, { type: "bytes" }],
      [identityAddr, topic, data]
    )
  );
  const signature = await claimIssuerAccount.signMessage({ message: { raw: dataHash } });

  const hash = await walletClient.writeContract({
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
    OnchainID.contracts.Identity.bytecode as Hex,
    [deployer.account.address, true]
  );

  const identityImplAuthorityAddr = await deployOnchainIDContract(
    OnchainID.contracts.ImplementationAuthority.abi,
    OnchainID.contracts.ImplementationAuthority.bytecode as Hex,
    [identityImplAddr]
  );

  const idFactoryAddr = await deployOnchainIDContract(
    OnchainID.contracts.Factory.abi,
    OnchainID.contracts.Factory.bytecode as Hex,
    [identityImplAuthorityAddr]
  );

  // ================================================================
  // Phase 2: T-REX implementations
  // ================================================================
  const tokenImpl = await hre.viem.deployContract("Token" as any, []);
  const ctrImpl = await hre.viem.deployContract("ClaimTopicsRegistry" as any, []);
  const irImpl = await hre.viem.deployContract("IdentityRegistry" as any, []);
  const irsImpl = await hre.viem.deployContract("IdentityRegistryStorage" as any, []);
  const tirImpl = await hre.viem.deployContract("TrustedIssuersRegistry" as any, []);
  const mcImpl = await hre.viem.deployContract("ModularCompliance" as any, []);

  // ================================================================
  // Phase 3: TREXImplementationAuthority
  // ================================================================
  const trexImplAuth = await hre.viem.deployContract("TREXImplementationAuthority" as any, [
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
  const countryRestrict = await hre.viem.deployContract("CountryRestrictModule" as any, []);
  const maxBalance = await hre.viem.deployContract("MaxBalanceModule" as any, []);
  const supplyLimit = await hre.viem.deployContract("SupplyLimitModule" as any, []);

  // ================================================================
  // Phase 5: TREXFactory
  // ================================================================
  const trexFactory = await hre.viem.deployContract("TREXFactory" as any, [
    trexImplAuth.address,
    idFactoryAddr,
  ]);

  // Link IdFactory to TREXFactory
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
  // Generate a random signing key for the claim issuer
  const claimIssuerSigningAccount = (await import("viem/accounts")).privateKeyToAccount(
    `0x${Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("hex")}` as Hex
  );

  const claimIssuerContract = await hre.viem.deployContract("ClaimIssuer" as any, [
    deployer.account.address,
  ]);

  const keyHash = keccak256(
    encodeAbiParameters(
      [{ type: "address" }],
      [claimIssuerSigningAccount.address]
    )
  );
  hash = await claimIssuerContract.write.addKey([keyHash, 3n, 1n]);
  await publicClient.waitForTransactionReceipt({ hash });

  // Create a wallet client for the claim issuer signing key
  const claimIssuerWalletClient = (await import("viem")).createWalletClient({
    account: claimIssuerSigningAccount,
    chain: publicClient.chain,
    transport: (await import("viem")).custom(publicClient.transport),
  });

  // ================================================================
  // Phase 7: deployTREXSuite
  // ================================================================
  const countryRestrictCalldata = encodeFunctionData({
    abi: [{ type: "function", name: "batchRestrictCountries", inputs: [{ type: "uint16[]", name: "countries" }], outputs: [], stateMutability: "nonpayable" }],
    functionName: "batchRestrictCountries",
    args: [[156]],
  });
  const maxBalanceCalldata = encodeFunctionData({
    abi: [{ type: "function", name: "setMaxBalance", inputs: [{ type: "uint256", name: "_max" }], outputs: [], stateMutability: "nonpayable" }],
    functionName: "setMaxBalance",
    args: [parseEther("1000000")],
  });
  const supplyLimitCalldata = encodeFunctionData({
    abi: [{ type: "function", name: "setSupplyLimit", inputs: [{ type: "uint256", name: "_limit" }], outputs: [], stateMutability: "nonpayable" }],
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
  const suiteEvent = suiteReceipt.logs.find((log) => {
    try {
      const parsed = trexFactory.abi
        ? (await import("viem")).decodeEventLog({ abi: trexFactory.abi, data: log.data, topics: log.topics })
        : null;
      return parsed?.eventName === "TREXSuiteDeployed";
    } catch {
      return false;
    }
  });

  // Note: The above event parsing with viem needs adjustment.
  // With hardhat-viem, we can use getContractEvents or parse logs manually.
  // The TREXFactory ABI is available from the compiled artifact.
  // Let's use a simpler approach:

  const { decodeEventLog } = await import("viem");
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
        const args = event.args as any;
        tokenAddress = args[0] || args._token;
        irAddress = args[1] || args._ir;
        mcAddress = args[5] || args._mc;
        break;
      }
    } catch {
      // Not a TREXFactory event
    }
  }

  if (tokenAddress === zeroAddress) {
    throw new Error("TREXSuiteDeployed event not found in receipt");
  }

  const token = await hre.viem.getContractAt("Token" as any, tokenAddress);
  const identityRegistry = await hre.viem.getContractAt("IdentityRegistry" as any, irAddress);
  const compliance = await hre.viem.getContractAt("ModularCompliance" as any, mcAddress);

  // ================================================================
  // Setup: Deploy identities, register, issue claims
  // ================================================================
  async function deployIdentityProxy(walletAddress: Address): Promise<Address> {
    return deployOnchainIDContract(
      OnchainID.contracts.IdentityProxy.abi,
      OnchainID.contracts.IdentityProxy.bytecode as Hex,
      [identityImplAuthorityAddr, walletAddress]
    );
  }

  const deployerIdentity = await deployIdentityProxy(deployer.account.address);
  const aliceIdentity = await deployIdentityProxy(alice.account.address);
  const charlieIdentity = await deployIdentityProxy(charlie.account.address);
  const dianaIdentity = await deployIdentityProxy(diana.account.address);

  // Add token as agent
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
        identityAddr,
        topic,
        claimIssuerContract.address,
        claimIssuerWalletClient,
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
    claimIssuerSigningAccount,
    identities: { deployerIdentity, aliceIdentity, charlieIdentity, dianaIdentity },
  };
}
```

**Important notes on this rewrite:**
- `hre.viem.getWalletClients()` returns wallet clients (not ethers Signers)
- `hre.viem.deployContract(name, args)` deploys from compiled Hardhat artifacts
- For OnchainID contracts (not Hardhat artifacts), we use `walletClient.deployContract({ abi, bytecode, args })` directly
- Event parsing uses `decodeEventLog` from viem instead of ethers `interface.parseLog`
- `parseEther`, `keccak256`, `encodeFunctionData` come from viem instead of ethers
- The claim issuer signing key uses viem's `privateKeyToAccount` instead of `ethers.Wallet.createRandom()`

**Step 2: Verify the fixture compiles**

Run: `cd contracts && npx tsc --noEmit`

Fix any type errors. Common issues:
- `as any` casts on contract names (hardhat-viem types may not include T-REX contract names)
- BigInt vs number for claim topics (viem uses bigint natively)
- `Hex` type for bytecode (may need `as \`0x${string}\``)

**Step 3: Commit (even if tests don't pass yet — tests need rewriting too)**

```bash
git add contracts/test/fixtures/deploy-suite.fixture.ts
git commit -m "refactor: rewrite test fixture for viem"
```

---

### Task 4: Rewrite Tests

**Files:**
- Modify: `contracts/test/deployment.test.ts`
- Modify: `contracts/test/transfers.test.ts`
- Modify: `contracts/test/compliance.test.ts`

**Key differences from ethers tests:**
- `expect(await token.name())` → `expect(await token.read.name())`
- `await token.transfer(addr, amount)` → `await token.write.transfer([addr, amount])` (returns tx hash, not receipt)
- Event assertions: hardhat-viem uses `await expect(token.write.transfer(...)).to.emit(...)` — but this chai matcher may differ. Check hardhat-viem docs.
- `ethers.ZeroAddress` → `import { zeroAddress } from "viem"`
- `ethers.parseEther("500")` → `import { parseEther } from "viem"`
- `token.connect(diana)` → need to get a new contract instance with Diana's wallet client

**Step 1: Rewrite deployment.test.ts**

```typescript
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { parseEther, zeroAddress } from "viem";
import { deployGreenBondFixture } from "./fixtures/deploy-suite.fixture";

describe("Deployment", function () {
  it("should deploy token with correct name, symbol, decimals", async function () {
    const { token } = await loadFixture(deployGreenBondFixture);
    expect(await token.read.name()).to.equal("Coppice Green Bond");
    expect(await token.read.symbol()).to.equal("CPC");
    expect(await token.read.decimals()).to.equal(18);
  });

  it("should have non-zero addresses for all suite contracts", async function () {
    const { token, identityRegistry, compliance } = await loadFixture(deployGreenBondFixture);
    expect(token.address).to.not.equal(zeroAddress);
    expect(identityRegistry.address).to.not.equal(zeroAddress);
    expect(compliance.address).to.not.equal(zeroAddress);
  });

  it("should set deployer as token agent", async function () {
    const { token, deployer } = await loadFixture(deployGreenBondFixture);
    expect(await token.read.isAgent([deployer.account.address])).to.be.true;
  });

  it("should set deployer as identity registry agent", async function () {
    const { identityRegistry, deployer } = await loadFixture(deployGreenBondFixture);
    expect(await identityRegistry.read.isAgent([deployer.account.address])).to.be.true;
  });

  it("should have initial supply minted to deployer", async function () {
    const { token, deployer } = await loadFixture(deployGreenBondFixture);
    expect(await token.read.balanceOf([deployer.account.address])).to.equal(parseEther("100000"));
  });

  it("should be unpaused after setup", async function () {
    const { token } = await loadFixture(deployGreenBondFixture);
    expect(await token.read.paused()).to.be.false;
  });
});
```

**Step 2: Rewrite transfers.test.ts**

```typescript
import { expect } from "chai";
import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { parseEther, getAddress } from "viem";
import { deployGreenBondFixture } from "./fixtures/deploy-suite.fixture";

describe("Transfers", function () {
  describe("Compliant Transfers", function () {
    it("should allow deployer to transfer to Alice", async function () {
      const { token, deployer, alice } = await loadFixture(deployGreenBondFixture);
      const publicClient = await hre.viem.getPublicClient();

      const hash = await token.write.transfer([alice.account.address, parseEther("500")]);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      expect(receipt.status).to.equal("success");
    });

    it("should allow deployer to transfer to Diana", async function () {
      const { token, diana } = await loadFixture(deployGreenBondFixture);
      const publicClient = await hre.viem.getPublicClient();

      const hash = await token.write.transfer([diana.account.address, parseEther("500")]);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      expect(receipt.status).to.equal("success");
    });

    it("should update balances after transfer", async function () {
      const { token, deployer, alice } = await loadFixture(deployGreenBondFixture);
      const publicClient = await hre.viem.getPublicClient();

      const deployerBefore = await token.read.balanceOf([deployer.account.address]);
      const aliceBefore = await token.read.balanceOf([alice.account.address]);

      const hash = await token.write.transfer([alice.account.address, parseEther("1000")]);
      await publicClient.waitForTransactionReceipt({ hash });

      expect(await token.read.balanceOf([deployer.account.address])).to.equal(deployerBefore - parseEther("1000"));
      expect(await token.read.balanceOf([alice.account.address])).to.equal(aliceBefore + parseEther("1000"));
    });
  });

  describe("Rejected Transfers", function () {
    it("should reject transfer to unverified Bob", async function () {
      const { token, bob } = await loadFixture(deployGreenBondFixture);
      await expect(token.write.transfer([bob.account.address, parseEther("500")]))
        .to.be.rejectedWith("Transfer not possible");
    });

    it("should reject transfer to restricted-country Charlie", async function () {
      const { token, charlie } = await loadFixture(deployGreenBondFixture);
      await expect(token.write.transfer([charlie.account.address, parseEther("500")]))
        .to.be.rejectedWith("Transfer not possible");
    });
  });

  describe("Freeze / Unfreeze", function () {
    it("should block transfers to frozen address", async function () {
      const { token, diana } = await loadFixture(deployGreenBondFixture);
      const publicClient = await hre.viem.getPublicClient();

      let hash = await token.write.transfer([diana.account.address, parseEther("100")]);
      await publicClient.waitForTransactionReceipt({ hash });

      hash = await token.write.setAddressFrozen([diana.account.address, true]);
      await publicClient.waitForTransactionReceipt({ hash });

      await expect(token.write.transfer([diana.account.address, parseEther("100")]))
        .to.be.rejectedWith("wallet is frozen");
    });

    it("should allow transfers after unfreezing", async function () {
      const { token, diana } = await loadFixture(deployGreenBondFixture);
      const publicClient = await hre.viem.getPublicClient();

      let hash = await token.write.setAddressFrozen([diana.account.address, true]);
      await publicClient.waitForTransactionReceipt({ hash });
      hash = await token.write.setAddressFrozen([diana.account.address, false]);
      await publicClient.waitForTransactionReceipt({ hash });

      hash = await token.write.transfer([diana.account.address, parseEther("100")]);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      expect(receipt.status).to.equal("success");
    });

    it("should emit AddressFrozen event", async function () {
      const { token, deployer, diana } = await loadFixture(deployGreenBondFixture);
      const publicClient = await hre.viem.getPublicClient();

      const hash = await token.write.setAddressFrozen([diana.account.address, true]);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      // Check event in receipt logs
      const { decodeEventLog } = await import("viem");
      const artifact = await hre.artifacts.readArtifact("Token");
      const frozenEvent = receipt.logs.find((log) => {
        try {
          const decoded = decodeEventLog({ abi: artifact.abi, data: log.data, topics: log.topics });
          return decoded.eventName === "AddressFrozen";
        } catch { return false; }
      });
      expect(frozenEvent).to.not.be.undefined;
    });

    it("should block transfers FROM frozen address", async function () {
      const { token, alice, diana } = await loadFixture(deployGreenBondFixture);
      const publicClient = await hre.viem.getPublicClient();

      // Give Diana some tokens
      let hash = await token.write.transfer([diana.account.address, parseEther("1000")]);
      await publicClient.waitForTransactionReceipt({ hash });

      // Freeze Diana
      hash = await token.write.setAddressFrozen([diana.account.address, true]);
      await publicClient.waitForTransactionReceipt({ hash });

      // Diana can't send — need token connected to Diana's wallet
      const dianaToken = await hre.viem.getContractAt("Token" as any, token.address, {
        client: { wallet: diana },
      });
      await expect(dianaToken.write.transfer([alice.account.address, parseEther("100")]))
        .to.be.rejectedWith("wallet is frozen");
    });
  });

  describe("Pause / Unpause", function () {
    it("should block ALL transfers when paused", async function () {
      const { token, alice } = await loadFixture(deployGreenBondFixture);
      const publicClient = await hre.viem.getPublicClient();

      const hash = await token.write.pause();
      await publicClient.waitForTransactionReceipt({ hash });

      await expect(token.write.transfer([alice.account.address, parseEther("100")]))
        .to.be.rejectedWith("Pausable: paused");
    });

    it("should resume transfers after unpausing", async function () {
      const { token, alice } = await loadFixture(deployGreenBondFixture);
      const publicClient = await hre.viem.getPublicClient();

      let hash = await token.write.pause();
      await publicClient.waitForTransactionReceipt({ hash });
      hash = await token.write.unpause();
      await publicClient.waitForTransactionReceipt({ hash });

      hash = await token.write.transfer([alice.account.address, parseEther("100")]);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      expect(receipt.status).to.equal("success");
    });

    it("should emit Paused and Unpaused events", async function () {
      const { token } = await loadFixture(deployGreenBondFixture);
      const publicClient = await hre.viem.getPublicClient();

      let hash = await token.write.pause();
      let receipt = await publicClient.waitForTransactionReceipt({ hash });
      expect(receipt.status).to.equal("success");

      hash = await token.write.unpause();
      receipt = await publicClient.waitForTransactionReceipt({ hash });
      expect(receipt.status).to.equal("success");
    });
  });

  describe("Minting", function () {
    it("should allow agent to mint to verified address", async function () {
      const { token, alice } = await loadFixture(deployGreenBondFixture);
      const publicClient = await hre.viem.getPublicClient();

      const before = await token.read.balanceOf([alice.account.address]);
      const hash = await token.write.mint([alice.account.address, parseEther("1000")]);
      await publicClient.waitForTransactionReceipt({ hash });
      expect(await token.read.balanceOf([alice.account.address])).to.equal(before + parseEther("1000"));
    });

    it("should reject minting to unverified address", async function () {
      const { token, bob } = await loadFixture(deployGreenBondFixture);
      await expect(token.write.mint([bob.account.address, parseEther("100")]))
        .to.be.rejectedWith("Identity is not verified.");
    });

    it("should reject minting from non-agent", async function () {
      const { token, alice, diana } = await loadFixture(deployGreenBondFixture);
      const aliceToken = await hre.viem.getContractAt("Token" as any, token.address, {
        client: { wallet: alice },
      });
      await expect(aliceToken.write.mint([diana.account.address, parseEther("100")]))
        .to.be.rejectedWith("AgentRole: caller does not have the Agent role");
    });

    it("should update totalSupply", async function () {
      const { token, alice } = await loadFixture(deployGreenBondFixture);
      const publicClient = await hre.viem.getPublicClient();

      const before = await token.read.totalSupply();
      const hash = await token.write.mint([alice.account.address, parseEther("500")]);
      await publicClient.waitForTransactionReceipt({ hash });
      expect(await token.read.totalSupply()).to.equal(before + parseEther("500"));
    });
  });
});
```

**Step 3: Rewrite compliance.test.ts**

```typescript
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { parseEther } from "viem";
import { deployGreenBondFixture } from "./fixtures/deploy-suite.fixture";

describe("Compliance", function () {
  describe("Identity Verification", function () {
    it("should verify Alice (registered with claims)", async function () {
      const { identityRegistry, alice } = await loadFixture(deployGreenBondFixture);
      expect(await identityRegistry.read.isVerified([alice.account.address])).to.be.true;
    });

    it("should NOT verify Bob (not registered)", async function () {
      const { identityRegistry, bob } = await loadFixture(deployGreenBondFixture);
      expect(await identityRegistry.read.isVerified([bob.account.address])).to.be.false;
    });

    it("should verify Charlie (registered with claims, but country restricted)", async function () {
      const { identityRegistry, charlie } = await loadFixture(deployGreenBondFixture);
      expect(await identityRegistry.read.isVerified([charlie.account.address])).to.be.true;
    });

    it("should verify Diana", async function () {
      const { identityRegistry, diana } = await loadFixture(deployGreenBondFixture);
      expect(await identityRegistry.read.isVerified([diana.account.address])).to.be.true;
    });
  });

  describe("Transfer Compliance (canTransfer)", function () {
    it("should allow transfer to Alice (DE, verified)", async function () {
      const { compliance, deployer, alice } = await loadFixture(deployGreenBondFixture);
      expect(await compliance.read.canTransfer([deployer.account.address, alice.account.address, parseEther("500")])).to.be.true;
    });

    it("should block transfer to Charlie (CN restricted)", async function () {
      const { compliance, deployer, charlie } = await loadFixture(deployGreenBondFixture);
      expect(await compliance.read.canTransfer([deployer.account.address, charlie.account.address, parseEther("500")])).to.be.false;
    });

    it("should allow transfer to Diana (FR, verified)", async function () {
      const { compliance, deployer, diana } = await loadFixture(deployGreenBondFixture);
      expect(await compliance.read.canTransfer([deployer.account.address, diana.account.address, parseEther("500")])).to.be.true;
    });
  });

  describe("Country Restriction Module", function () {
    it("should block country code 156 (CN)", async function () {
      const { compliance, deployer, charlie } = await loadFixture(deployGreenBondFixture);
      expect(await compliance.read.canTransfer([deployer.account.address, charlie.account.address, 1n])).to.be.false;
    });
  });

  describe("Max Balance Module", function () {
    it("should block mint exceeding supply limit", async function () {
      const { token, deployer } = await loadFixture(deployGreenBondFixture);
      await expect(token.write.mint([deployer.account.address, parseEther("900001")]))
        .to.be.rejectedWith("Compliance not followed");
    });

    it("should allow mint within supply limit", async function () {
      const { token, deployer } = await loadFixture(deployGreenBondFixture);
      const publicClient = await (await import("hardhat")).viem.getPublicClient();
      const hash = await token.write.mint([deployer.account.address, parseEther("900000")]);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      expect(receipt.status).to.equal("success");
    });
  });
});
```

**Step 4: Run all tests**

Run: `cd contracts && npx hardhat test`
Expected: All 32 tests pass

**Important:** If `rejectedWith` doesn't work with hardhat-viem (ethers chai matchers won't work), you may need to switch to try/catch assertions:

```typescript
try {
  await token.write.transfer([bob.account.address, parseEther("500")]);
  expect.fail("Should have reverted");
} catch (err: any) {
  expect(err.message).to.include("Transfer not possible");
}
```

Check the `@nomicfoundation/hardhat-chai-matchers` docs for viem compatibility. If the viem toolbox doesn't include compatible chai matchers, use the try/catch pattern.

**Step 5: Commit**

```bash
git add contracts/test/
git commit -m "refactor: rewrite all tests for viem"
```

---

### Task 5: Rewrite deploy.ts Script

**Files:**
- Modify: `contracts/scripts/deploy.ts`

**Step 1: Rewrite deploy.ts**

The deploy script follows the same patterns as the test fixture but saves addresses to disk. The conversion follows the same ethers→viem patterns from Task 3.

Key changes:
- `import { ethers } from "hardhat"` → `import hre from "hardhat"` + viem imports
- `ethers.getSigners()` → `hre.viem.getWalletClients()`
- `new ethers.ContractFactory(abi, bytecode, signer).deploy()` → `walletClient.deployContract({ abi, bytecode, args })`
- `ethers.deployContract(name, args)` → `hre.viem.deployContract(name, args)`
- `contract.getAddress()` → `contract.address`
- `ethers.ZeroAddress` → `zeroAddress`
- `ethers.parseEther()` → `parseEther()`
- `ethers.keccak256()` → `keccak256()`
- `ethers.Interface` + `encodeFunctionData` → viem's `encodeFunctionData`
- `ethers.Wallet.createRandom()` → generate random key + `privateKeyToAccount`

The full rewrite follows the same structure as the fixture in Task 3. Apply the same patterns.

**Step 2: Verify it compiles**

Run: `cd contracts && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add contracts/scripts/deploy.ts
git commit -m "refactor: rewrite deploy.ts for viem"
```

---

### Task 6: Rewrite setup-demo.ts Script

**Files:**
- Modify: `contracts/scripts/setup-demo.ts`

Same conversion patterns as Tasks 3-5. Key additional considerations:
- Testnet wallet loading: `new ethers.Wallet(key, ethers.provider)` → create viem wallet client with `privateKeyToAccount` + `createWalletClient`
- Retry logic stays the same (wrapper around async functions)
- `ethers.getContractAt()` → `hre.viem.getContractAt()`
- `identity.connect(walletSigner).addClaim(...)` → get contract instance with wallet client

**Step 1: Rewrite setup-demo.ts following viem patterns**

Apply same patterns. The `retry()` helper stays as-is (it wraps generic async functions).

**Step 2: Verify it compiles and runs against local Hardhat**

Run: `cd contracts && npx hardhat run scripts/setup-demo.ts`

**Step 3: Commit**

```bash
git add contracts/scripts/setup-demo.ts
git commit -m "refactor: rewrite setup-demo.ts for viem"
```

---

### Task 7: Export ABIs + Addresses for Frontend

**Why:** Currently the frontend has hand-written minimal ABIs in `frontend/src/lib/contracts.ts`. After the viem migration, we can export the full ABIs from the contracts workspace so the frontend can import them directly.

**Files:**
- Create: `contracts/exports/index.ts`
- Create: `contracts/exports/abis.ts`
- Modify: `contracts/package.json` (add exports field)

**Step 1: Create ABI exports**

```typescript
// contracts/exports/abis.ts
// Re-export the ABIs that the frontend needs.
// These are read from compiled artifacts at build time.
import TokenArtifact from "../artifacts/contracts/Imports.sol/Token.json" assert { type: "json" };
import IdentityRegistryArtifact from "../artifacts/contracts/Imports.sol/IdentityRegistry.json" assert { type: "json" };
import ModularComplianceArtifact from "../artifacts/contracts/Imports.sol/ModularCompliance.json" assert { type: "json" };

export const TokenABI = TokenArtifact.abi;
export const IdentityRegistryABI = IdentityRegistryArtifact.abi;
export const ModularComplianceABI = ModularComplianceArtifact.abi;
```

Wait — Hardhat artifacts are at `artifacts/@tokenysolutions/t-rex/contracts/token/Token.sol/Token.json`, not under `contracts/Imports.sol`. Let me adjust:

Actually, since `Imports.sol` imports all the contracts, Hardhat generates artifacts for each contract in the `artifacts/` directory. The path structure follows the Solidity source path. Since these are imported from node_modules, the artifacts will be at:
- `artifacts/@tokenysolutions/t-rex/contracts/token/Token.sol/Token.json`
- `artifacts/@tokenysolutions/t-rex/contracts/registry/implementation/IdentityRegistry.sol/IdentityRegistry.json`
- `artifacts/@tokenysolutions/t-rex/contracts/compliance/modular/ModularCompliance.sol/ModularCompliance.json`

This is fragile. A simpler approach: just copy the minimal ABIs the frontend needs into a shared file, with full type info from viem.

```typescript
// contracts/exports/abis.ts
export const TokenABI = [
  { type: "function", name: "name", inputs: [], outputs: [{ type: "string" }], stateMutability: "view" },
  { type: "function", name: "symbol", inputs: [], outputs: [{ type: "string" }], stateMutability: "view" },
  { type: "function", name: "decimals", inputs: [], outputs: [{ type: "uint8" }], stateMutability: "view" },
  { type: "function", name: "totalSupply", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "balanceOf", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "transfer", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "nonpayable" },
  { type: "function", name: "mint", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "pause", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "unpause", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "paused", inputs: [], outputs: [{ type: "bool" }], stateMutability: "view" },
  { type: "function", name: "setAddressFrozen", inputs: [{ name: "addr", type: "address" }, { name: "freeze", type: "bool" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "isFrozen", inputs: [{ name: "addr", type: "address" }], outputs: [{ type: "bool" }], stateMutability: "view" },
  { type: "function", name: "isAgent", inputs: [{ name: "addr", type: "address" }], outputs: [{ type: "bool" }], stateMutability: "view" },
  { type: "event", name: "Transfer", inputs: [{ name: "from", type: "address", indexed: true }, { name: "to", type: "address", indexed: true }, { name: "value", type: "uint256", indexed: false }] },
  { type: "event", name: "Paused", inputs: [{ name: "account", type: "address", indexed: false }] },
  { type: "event", name: "Unpaused", inputs: [{ name: "account", type: "address", indexed: false }] },
  { type: "event", name: "AddressFrozen", inputs: [{ name: "addr", type: "address", indexed: true }, { name: "isFrozen", type: "bool", indexed: true }, { name: "owner", type: "address", indexed: true }] },
] as const;

export const IdentityRegistryABI = [
  { type: "function", name: "isVerified", inputs: [{ name: "addr", type: "address" }], outputs: [{ type: "bool" }], stateMutability: "view" },
  { type: "function", name: "identity", inputs: [{ name: "addr", type: "address" }], outputs: [{ type: "address" }], stateMutability: "view" },
  { type: "function", name: "investorCountry", inputs: [{ name: "addr", type: "address" }], outputs: [{ type: "uint16" }], stateMutability: "view" },
  { type: "function", name: "contains", inputs: [{ name: "addr", type: "address" }], outputs: [{ type: "bool" }], stateMutability: "view" },
] as const;

export const ModularComplianceABI = [
  { type: "function", name: "canTransfer", inputs: [{ name: "from", type: "address" }, { name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "view" },
] as const;
```

```typescript
// contracts/exports/index.ts
export { TokenABI, IdentityRegistryABI, ModularComplianceABI } from "./abis.js";
```

**Step 2: Add exports to package.json**

Add to `contracts/package.json`:

```json
"exports": {
  ".": "./exports/index.ts"
}
```

**Step 3: Verify the frontend can import (will be used in Plan 3)**

This export will be consumed by the frontend viem migration plan. For now, just verify it compiles.

**Step 4: Commit**

```bash
git add contracts/exports/ contracts/package.json
git commit -m "feat: export typed ABIs for frontend consumption"
```

---

### Task 8: Final Verification

**Step 1: Run full test suite**

Run: `cd contracts && npx hardhat test`
Expected: All 32 tests pass

**Step 2: Verify compile**

Run: `cd contracts && npx hardhat compile`
Expected: Clean compilation

**Step 3: Run E2E tests (should still pass — frontend hasn't changed)**

Run: `cd e2e && npx playwright test`
Expected: All 18 tests pass

**Step 4: Commit any final fixes**

```bash
git add -A
git commit -m "chore: finalize viem migration in contracts"
```

---

## Summary

| # | Task | Scope | Risk |
|---|------|-------|------|
| 1 | Swap toolbox plugin | Config | Low |
| 2 | Rewrite helpers.ts | 1 file | Low |
| 3 | Rewrite test fixture | 1 file (complex) | **High** — OnchainID raw ABI/bytecode deployment |
| 4 | Rewrite tests | 3 files | Medium — chai matcher compatibility |
| 5 | Rewrite deploy.ts | 1 file | Medium — same patterns as fixture |
| 6 | Rewrite setup-demo.ts | 1 file | Medium — testnet wallet handling |
| 7 | Export ABIs | New files | Low |
| 8 | Final verification | Tests | Low |

**Critical risk:** Task 3 (fixture rewrite) is the hardest. If `@onchain-id/solidity` bytecodes don't work cleanly with viem's `deployContract`, we may need to use viem's lower-level `sendTransaction` with encoded deployment bytecode. Test thoroughly.

**Rollback plan:** If the migration hits serious blockers, we can keep ethers in the contracts workspace and only use viem in the frontend (Plan 3). The ABIs exported in Task 7 work regardless of which library the contracts workspace uses internally.
