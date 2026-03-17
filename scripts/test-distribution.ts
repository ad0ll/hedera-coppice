/**
 * End-to-end test of the LifeCycleCashFlow coupon distribution flow.
 *
 * Steps:
 *   1. Check CPC holder balances, transfer CPC to Alice if needed
 *   2. Fund LifeCycleCashFlow contract with eUSD
 *   3. Set a test coupon with near-future dates on the CPC bond
 *   4. Wait for record date, then call takeSnapshot() to trigger lazy snapshot
 *   5. Call executeAmountSnapshot() to distribute eUSD proportionally
 *   6. Verify holders received eUSD payments
 *
 * Key insight: ATS snapshots are LAZY — they don't fire automatically at
 * recordDate. Must call takeSnapshot() on the bond after recordDate passes
 * to trigger pending scheduled snapshot tasks.
 *
 * Uses executeDistribution which reads coupon amounts from the bond's formula:
 *   amount = tokenBalance * nominalValue * rate * period / (10^(dec+nomDec+rateDec) * 365d)
 * Requires correct nominalValue on the bond (raw integer, NOT parseEther).
 *
 * Prerequisites:
 *   - CPC bond deployed with holders who have CPC balance
 *   - LifeCycleCashFlow deployed and initialized
 *   - Deployer has eUSD balance and _SNAPSHOT_ROLE on the bond
 *
 * Usage:
 *   cd scripts && npx tsx test-distribution.ts
 */
import { ethers } from "ethers";
import { TransferTransaction, TokenId, AccountId, PrivateKey, Client, TokenMintTransaction } from "@hashgraph/sdk";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

// ============================================================================
// Config
// ============================================================================

const JSON_RPC_URL = "https://testnet.hashio.io/api";
const MIRROR_NODE_URL = "https://testnet.mirrornode.hedera.com";

const CPC_ADDRESS = process.env.CPC_SECURITY_ADDRESS!;
const LCCF_ADDRESS = process.env.LIFECYCLE_CASH_FLOW_ADDRESS!;
const EUSD_TOKEN_ID = "0.0.8214937";
const LCCF_ACCOUNT_ID = "0.0.8254941";

// Amount of eUSD to fund the contract with (in smallest unit, 2 decimals)
// For 100k CPC * $1000 nominal * 4.25% * ~1 day, the payout is ~$11,644
// We need enough to cover that plus margin.
// 15000.00 eUSD = 1500000
const FUND_AMOUNT = 1_500_000;

const GAS_LIMIT = {
  high: 10_000_000,
  default: 3_000_000,
};

// ============================================================================
// ABI fragments
// ============================================================================

const BOND_ABI = [
  "function setCoupon(tuple(uint256 recordDate, uint256 executionDate, uint256 startDate, uint256 endDate, uint256 fixingDate, uint256 rate, uint8 rateDecimals, uint8 rateStatus) _newCoupon) returns (uint256)",
  "function getCouponCount() view returns (uint256)",
  "function getCoupon(uint256 couponID) view returns (tuple(tuple(uint256 recordDate, uint256 executionDate, uint256 startDate, uint256 endDate, uint256 fixingDate, uint256 rate, uint8 rateDecimals, uint8 rateStatus) coupon, uint256 snapshotId))",
  "function getCouponAmountFor(uint256 couponID, address account) view returns (tuple(uint256 numerator, uint256 denominator, bool recordDateReached))",
  "function getCouponHolders(uint256 couponID, uint256 pageIndex, uint256 pageLength) view returns (address[])",
  "function getTotalCouponHolders(uint256 couponID) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  // Snapshot: triggers lazy scheduled snapshots (including coupon record-date snapshots)
  "function takeSnapshot() returns (uint256 snapshotID)",
];

const LCCF_ABI_PATH = path.join(
  __dirname,
  "..",
  "contracts",
  "artifacts/contracts/mass-payout/LifeCycleCashFlow.sol/LifeCycleCashFlow.json"
);

// ============================================================================
// Helpers
// ============================================================================

function getWallet(): ethers.Wallet {
  const key = process.env.DEPLOYER_PRIVATE_KEY!;
  const hex = key.startsWith("0x") ? key : `0x${key}`;
  const provider = new ethers.JsonRpcProvider(JSON_RPC_URL);
  return new ethers.Wallet(hex, provider);
}

function getHederaClient(): Client {
  const accountId = process.env.HEDERA_ACCOUNT_ID!;
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY!;
  const keyHex = privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;
  const client = Client.forTestnet();
  client.setOperator(
    AccountId.fromString(accountId),
    PrivateKey.fromStringECDSA(keyHex)
  );
  return client;
}

async function retry<T>(fn: () => Promise<T>, retries = 3, delay = 3000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      console.log(`  Retry ${i + 1}/${retries}: ${(err as Error).message?.slice(0, 100)}`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("unreachable");
}

async function getEusdBalance(accountId: string): Promise<number> {
  const resp = await fetch(`${MIRROR_NODE_URL}/api/v1/accounts/${accountId}/tokens?token.id=${EUSD_TOKEN_ID}`);
  const data = await resp.json();
  const token = data.tokens?.find((t: { token_id: string }) => t.token_id === EUSD_TOKEN_ID);
  return token?.balance ?? 0;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const wallet = getWallet();
  const client = getHederaClient();
  const operatorAccountId = process.env.HEDERA_ACCOUNT_ID!;

  console.log("=== LifeCycleCashFlow Distribution Test ===\n");
  console.log(`CPC Bond:              ${CPC_ADDRESS}`);
  console.log(`LifeCycleCashFlow:     ${LCCF_ADDRESS}`);
  console.log(`Deployer:              ${wallet.address}\n`);

  // Load LCCF ABI
  const lccfArtifact = JSON.parse(fs.readFileSync(LCCF_ABI_PATH, "utf-8"));
  const lccf = new ethers.Contract(LCCF_ADDRESS, lccfArtifact.abi, wallet);
  const cpc = new ethers.Contract(CPC_ADDRESS, BOND_ABI, wallet);

  // ================================================================
  // Step 1: Check current CPC holder balances
  // ================================================================
  console.log("Step 1: Checking CPC holder balances...");

  const totalSupply = await retry(() => cpc.totalSupply());
  console.log(`  Total CPC supply: ${ethers.formatEther(totalSupply)}`);

  const deployerBalance = await retry(() => cpc.balanceOf(wallet.address));
  console.log(`  Deployer CPC balance: ${ethers.formatEther(deployerBalance)}`);

  // Check Alice's balance (she's a demo wallet)
  const alicePk = process.env.ALICE_PRIVATE_KEY;
  let aliceAddress = "";
  if (alicePk) {
    const hex = alicePk.startsWith("0x") ? alicePk : `0x${alicePk}`;
    aliceAddress = new ethers.Wallet(hex).address;
    const aliceBalance = await retry(() => cpc.balanceOf(aliceAddress));
    console.log(`  Alice CPC balance:    ${ethers.formatEther(aliceBalance)}`);
  }

  // ================================================================
  // Step 2: Transfer some CPC to Alice (if she has none)
  // ================================================================
  if (aliceAddress) {
    const aliceCpc = await retry(() => cpc.balanceOf(aliceAddress));
    if (aliceCpc === 0n) {
      console.log("\nStep 2: Transferring 1000 CPC to Alice for test...");

      // Use forcedTransfer since the deployer is the agent
      const transferAbi = ["function forcedTransfer(address from, address to, uint256 value) returns (bool)"];
      const cpcTransfer = new ethers.Contract(CPC_ADDRESS, transferAbi, wallet);

      const transferTx = await retry(() =>
        cpcTransfer.forcedTransfer(wallet.address, aliceAddress, ethers.parseEther("1000"), {
          gasLimit: GAS_LIMIT.default,
        })
      );
      await transferTx.wait();
      const newBalance = await retry(() => cpc.balanceOf(aliceAddress));
      console.log(`  Alice now has: ${ethers.formatEther(newBalance)} CPC`);
    } else {
      console.log(`\nStep 2: Alice already has ${ethers.formatEther(aliceCpc)} CPC — skipping transfer.`);
    }
  }

  // ================================================================
  // Step 3: Fund LifeCycleCashFlow with eUSD (minting more if needed)
  // ================================================================
  console.log("\nStep 3: Funding LifeCycleCashFlow with eUSD...");

  // Check deployer's eUSD balance first; mint more if insufficient
  const deployerEusdCurrent = await getEusdBalance(operatorAccountId);
  console.log(`  Deployer eUSD balance: ${(deployerEusdCurrent / 100).toFixed(2)}`);

  const lccfEusdBefore = await getEusdBalance(LCCF_ACCOUNT_ID);
  console.log(`  LCCF eUSD balance before: ${(lccfEusdBefore / 100).toFixed(2)}`);

  const totalNeeded = FUND_AMOUNT - lccfEusdBefore;
  if (totalNeeded > 0 && deployerEusdCurrent < totalNeeded) {
    const mintAmount = totalNeeded - deployerEusdCurrent + 100000; // extra $1000 buffer
    console.log(`  Minting ${(mintAmount / 100).toFixed(2)} eUSD...`);
    const mintTx = new TokenMintTransaction()
      .setTokenId(TokenId.fromString(EUSD_TOKEN_ID))
      .setAmount(mintAmount);
    const mintReceipt = await (await mintTx.execute(client)).getReceipt(client);
    console.log(`  Mint status: ${mintReceipt.status.toString()}`);
    await sleep(3000);
  }

  if (lccfEusdBefore < FUND_AMOUNT) {
    const transferAmount = FUND_AMOUNT - lccfEusdBefore;
    console.log(`  Transferring ${(transferAmount / 100).toFixed(2)} eUSD to LCCF...`);

    const tx = new TransferTransaction()
      .addTokenTransfer(TokenId.fromString(EUSD_TOKEN_ID), AccountId.fromString(operatorAccountId), -transferAmount)
      .addTokenTransfer(TokenId.fromString(EUSD_TOKEN_ID), AccountId.fromString(LCCF_ACCOUNT_ID), transferAmount);

    const receipt = await (await tx.execute(client)).getReceipt(client);
    console.log(`  Transfer status: ${receipt.status.toString()}`);

    await sleep(5000);
    const lccfEusdAfter = await getEusdBalance(LCCF_ACCOUNT_ID);
    console.log(`  LCCF eUSD balance after: ${(lccfEusdAfter / 100).toFixed(2)}`);
  } else {
    console.log(`  LCCF already has sufficient eUSD (${(lccfEusdBefore / 100).toFixed(2)}).`);
  }

  // ================================================================
  // Step 4: Set a test coupon with near-future dates
  // ================================================================
  console.log("\nStep 4: Setting test coupon with near-future dates...");

  const now = Math.floor(Date.now() / 1000);

  // Record date: 2 minutes from now (snapshot captures balances)
  // Execution date: 4 minutes from now (when distribution can be called)
  // Start/end date: a 1-day period for simplicity
  const testCoupon = {
    recordDate: now + 120,      // 2 minutes
    executionDate: now + 240,   // 4 minutes
    startDate: now + 60,        // 1 minute from now (must be future)
    endDate: now + 86400,       // 1 day period
    fixingDate: now + 120,      // same as record date
    rate: 425,                  // 4.25%
    rateDecimals: 2,
    rateStatus: 1,              // SET
  };

  console.log(`  Record date:    ${new Date(testCoupon.recordDate * 1000).toISOString()}`);
  console.log(`  Execution date: ${new Date(testCoupon.executionDate * 1000).toISOString()}`);

  const couponTx = await retry(() =>
    cpc.setCoupon(testCoupon, { gasLimit: GAS_LIMIT.default })
  );
  const couponReceipt = await couponTx.wait();
  console.log(`  Coupon set. TX: ${couponReceipt.hash}`);

  // Get the coupon ID (it's the count - 1, since setCoupon returns the ID)
  const couponCount = await retry(() => cpc.getCouponCount());
  const testCouponId = couponCount - 1n;
  console.log(`  Coupon ID: ${testCouponId} (total coupons: ${couponCount})`);

  // ================================================================
  // Step 5: Wait for record date, trigger snapshot, then verify
  // ================================================================
  console.log("\nStep 5: Waiting for record date...");

  // Wait until recordDate has definitively passed.
  // Use a generous buffer — Hedera block timestamps can lag wall clock slightly.
  while (true) {
    const nowSec = Math.floor(Date.now() / 1000);
    const remaining = testCoupon.recordDate - nowSec;
    if (remaining <= -15) break; // 15s past recordDate
    console.log(`  ${remaining > 0 ? remaining : 0}s until record date...`);
    await sleep(Math.min(15000, (remaining + 20) * 1000));
  }

  // Verify via on-chain block timestamp
  const provider = wallet.provider!;
  const block = await provider.getBlock("latest");
  console.log(`  Block timestamp: ${block?.timestamp} vs recordDate: ${testCoupon.recordDate} (diff: ${(block?.timestamp ?? 0) - testCoupon.recordDate}s)`);

  // ATS snapshots are LAZY: they're scheduled at recordDate but only fire
  // when _triggerScheduledCrossOrderedTasks() runs, which happens during
  // token state changes or when takeSnapshot() is called.
  // Calling takeSnapshot() triggers pending scheduled tasks first, which
  // processes the coupon's scheduled snapshot and links the snapshotId.
  console.log("  Triggering takeSnapshot() to process scheduled coupon snapshot...");
  const snapshotTx = await retry(() =>
    cpc.takeSnapshot({ gasLimit: GAS_LIMIT.default })
  );
  const snapshotReceipt = await snapshotTx.wait();
  console.log(`  takeSnapshot TX: ${snapshotReceipt.hash}`);

  // Verify the coupon now has a snapshotId
  const registeredCoupon = await retry(() => cpc.getCoupon(testCouponId));
  console.log(`  Coupon snapshot ID: ${registeredCoupon.snapshotId}`);

  // Check holder count
  const holderCount = await retry(() => cpc.getTotalCouponHolders(testCouponId));
  console.log(`  Total holders at snapshot: ${holderCount}`);

  // Check amounts
  const deployerAmount = await retry(() =>
    cpc.getCouponAmountFor(testCouponId, wallet.address)
  );
  console.log(
    `  Deployer coupon amount: numerator=${deployerAmount.numerator}, denominator=${deployerAmount.denominator}, recordDateReached=${deployerAmount.recordDateReached}`
  );

  if (deployerAmount.denominator > 0n) {
    const amountEusd = (deployerAmount.numerator * 100n) / deployerAmount.denominator; // 2 decimal eUSD
    console.log(`  Deployer would receive: ${(Number(amountEusd) / 100).toFixed(2)} eUSD`);
  }

  if (aliceAddress) {
    const aliceAmount = await retry(() =>
      cpc.getCouponAmountFor(testCouponId, aliceAddress)
    );
    console.log(
      `  Alice coupon amount: numerator=${aliceAmount.numerator}, denominator=${aliceAmount.denominator}, recordDateReached=${aliceAmount.recordDateReached}`
    );
    if (aliceAmount.denominator > 0n) {
      const amountEusd = (aliceAmount.numerator * 100n) / aliceAmount.denominator;
      console.log(`  Alice would receive:    ${(Number(amountEusd) / 100).toFixed(2)} eUSD`);
    }
  }

  // ================================================================
  // Step 6: Wait for execution date, then call executeDistribution
  // ================================================================
  console.log("\nStep 6: Waiting for execution date...");

  while (true) {
    const nowSec = Math.floor(Date.now() / 1000);
    const remaining = testCoupon.executionDate - nowSec;
    if (remaining <= -5) break; // 5s past executionDate
    console.log(`  ${remaining > 0 ? remaining : 0}s until execution date...`);
    await sleep(Math.min(15000, (remaining + 10) * 1000));
  }

  console.log("  Calling executeDistribution...");

  // Record eUSD balances before distribution
  const deployerEusdBefore = await getEusdBalance(operatorAccountId);
  let aliceEusdBefore = 0;
  if (aliceAddress) {
    aliceEusdBefore = await getEusdBalance(process.env.ALICE_ACCOUNT_ID!);
  }

  try {
    const distTx = await retry(() =>
      lccf.executeDistribution(CPC_ADDRESS, testCouponId, 0, 100, {
        gasLimit: GAS_LIMIT.high,
      })
    );
    const distReceipt = await distTx.wait();
    console.log(`  Distribution TX: ${distReceipt.hash}`);
    console.log(`  Status: ${distReceipt.status === 1 ? "SUCCESS" : "FAILED"}`);

    // Parse events
    const iface = new ethers.Interface(lccfArtifact.abi);
    for (const log of distReceipt.logs) {
      try {
        const parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
        if (parsed?.name === "DistributionExecuted") {
          console.log(`\n  Event: DistributionExecuted`);
          console.log(`    Distribution ID: ${parsed.args[0]}`);
          console.log(`    Page index: ${parsed.args[1]}`);
          console.log(`    Page length: ${parsed.args[2]}`);
          const failed = parsed.args[3] as string[];
          const succeeded = parsed.args[4] as string[];
          const amounts = parsed.args[5] as bigint[];
          console.log(`    Failed: ${failed.filter((a: string) => a !== ethers.ZeroAddress).length}`);
          console.log(`    Succeeded: ${succeeded.filter((a: string) => a !== ethers.ZeroAddress).length}`);
          for (let i = 0; i < succeeded.length; i++) {
            if (succeeded[i] !== ethers.ZeroAddress) {
              console.log(`      ${succeeded[i].slice(0, 10)}... received ${(Number(amounts[i]) / 100).toFixed(2)} eUSD`);
            }
          }
        }
      } catch {
        // Not a LCCF event
      }
    }
  } catch (err) {
    console.error(`  Distribution FAILED: ${(err as Error).message?.slice(0, 200)}`);

    // Try to decode the error
    const errorData = (err as { data?: string }).data;
    if (errorData) {
      const iface = new ethers.Interface(lccfArtifact.abi);
      try {
        const decoded = iface.parseError(errorData);
        console.error(`  Decoded error: ${decoded?.name}(${decoded?.args.join(", ")})`);
      } catch {
        console.error(`  Raw error data: ${errorData}`);
      }
    }
  }

  // ================================================================
  // Step 7: Verify eUSD balances after distribution
  // ================================================================
  console.log("\nStep 7: Verifying eUSD balances after distribution...");

  await sleep(5000); // Wait for mirror node to index

  const deployerEusdAfter = await getEusdBalance(operatorAccountId);
  console.log(`  Deployer eUSD: ${(deployerEusdBefore / 100).toFixed(2)} → ${(deployerEusdAfter / 100).toFixed(2)} (diff: +${((deployerEusdAfter - deployerEusdBefore) / 100).toFixed(2)})`);

  if (aliceAddress) {
    const aliceEusdAfter = await getEusdBalance(process.env.ALICE_ACCOUNT_ID!);
    console.log(`  Alice eUSD:    ${(aliceEusdBefore / 100).toFixed(2)} → ${(aliceEusdAfter / 100).toFixed(2)} (diff: +${((aliceEusdAfter - aliceEusdBefore) / 100).toFixed(2)})`);
  }

  const lccfEusdFinal = await getEusdBalance(LCCF_ACCOUNT_ID);
  console.log(`  LCCF eUSD:     ${(lccfEusdFinal / 100).toFixed(2)} remaining`);

  console.log("\n=== Test Complete ===");

  client.close();
}

main().catch((err) => {
  console.error("\nTest failed:", err);
  process.exit(1);
});
