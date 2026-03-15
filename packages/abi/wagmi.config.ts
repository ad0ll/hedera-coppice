import { defineConfig } from "@wagmi/cli";
import { hardhat } from "@wagmi/cli/plugins";

export default defineConfig({
  out: "src/generated.ts",
  plugins: [
    hardhat({
      project: "../../contracts",
      include: [
        "Token.json",
        "IToken.json",
        "IdentityRegistry.json",
        "IIdentityRegistry.json",
        "ModularCompliance.json",
        "IModularCompliance.json",
        "ClaimIssuer.json",
        "TREXFactory.json",
        "CountryRestrictModule.json",
        "MaxBalanceModule.json",
        "SupplyLimitModule.json",
        "IdentityRegistryStorage.json",
        "TrustedIssuersRegistry.json",
        "ClaimTopicsRegistry.json",
      ],
      deployments: {
        Token: {
          296: "0x17e19B53981370a904d0003Ba2D336837a43cbf0",
        },
        IdentityRegistry: {
          296: "0x03ecdB8673d65b81752AC14dAaCa797D846c1B31",
        },
        ModularCompliance: {
          296: "0xb6F624B66731AFeEE1443b3F857Cd73b682af4cf",
        },
        ClaimIssuer: {
          296: "0x6746C2A65b834F3A83Aa95eCAc9C80dF9Bf2AB7A",
        },
      },
    }),
  ],
});
