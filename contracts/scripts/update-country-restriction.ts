/**
 * Swap restricted country from China (156) to Narnia (999).
 *
 * Narnia is a fictional country — demos jurisdiction banning without
 * targeting a real nation. Run once against testnet after initial deployment.
 *
 * Usage: npx hardhat run scripts/update-country-restriction.ts --network hederaTestnet
 */
import hre from "hardhat";
import { encodeFunctionData } from "viem";
import { loadAddresses } from "./helpers";

const COUNTRY_RESTRICT_ABI = [
  {
    type: "function",
    name: "removeCountryRestriction",
    inputs: [{ type: "uint16", name: "_country" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "addCountryRestriction",
    inputs: [{ type: "uint16", name: "_country" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

async function main() {
  const addresses = loadAddresses();
  const publicClient = await hre.viem.getPublicClient();
  const [deployer] = await hre.viem.getWalletClients();

  const compliance = await hre.viem.getContractAt(
    "ModularCompliance",
    addresses.modularCompliance,
  );

  console.log("Deployer:", deployer.account.address);
  console.log("ModularCompliance:", addresses.modularCompliance);
  console.log("CountryRestrictModule:", addresses.countryRestrictModule);

  // 1. Remove China (156) restriction
  console.log("\n1. Removing China (156) from restricted countries...");
  const removeCalldata = encodeFunctionData({
    abi: COUNTRY_RESTRICT_ABI,
    functionName: "removeCountryRestriction",
    args: [156],
  });
  const removeHash = await compliance.write.callModuleFunction([
    removeCalldata,
    addresses.countryRestrictModule,
  ]);
  const removeReceipt = await publicClient.waitForTransactionReceipt({ hash: removeHash });
  console.log(`   TX: ${removeReceipt.transactionHash} (${removeReceipt.status})`);

  // 2. Add Narnia (999) restriction
  // Fictional country — demos jurisdiction banning without targeting a real nation
  console.log("2. Adding Narnia (999) to restricted countries...");
  const addCalldata = encodeFunctionData({
    abi: COUNTRY_RESTRICT_ABI,
    functionName: "addCountryRestriction",
    args: [999],
  });
  const addHash = await compliance.write.callModuleFunction([
    addCalldata,
    addresses.countryRestrictModule,
  ]);
  const addReceipt = await publicClient.waitForTransactionReceipt({ hash: addHash });
  console.log(`   TX: ${addReceipt.transactionHash} (${addReceipt.status})`);

  console.log("\nDone! China is now unrestricted, Narnia (999) is restricted.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
