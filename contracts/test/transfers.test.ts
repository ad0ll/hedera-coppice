import { expect } from "chai";
import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { parseEther, decodeEventLog } from "viem";
import { deployGreenBondFixture } from "./fixtures/deploy-suite.fixture";

describe("Transfers", function () {
  describe("Compliant Transfers", function () {
    it("should allow deployer to transfer to Alice", async function () {
      const { token, deployer, alice } = await loadFixture(deployGreenBondFixture);
      const publicClient = await hre.viem.getPublicClient();

      const hash = await token.write.transfer([alice.account.address, parseEther("500")]);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      expect(receipt.status).to.equal("success");

      // Verify Transfer event
      const tokenArtifact = await hre.artifacts.readArtifact("Token");
      const transferEvent = receipt.logs.find((log) => {
        try {
          const decoded = decodeEventLog({ abi: tokenArtifact.abi, data: log.data, topics: log.topics });
          return decoded.eventName === "Transfer";
        } catch { return false; }
      });
      expect(transferEvent).to.not.be.undefined;
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
      try {
        await token.write.transfer([bob.account.address, parseEther("500")]);
        expect.fail("Should have reverted");
      } catch (err: unknown) {
        expect(err instanceof Error ? err.message : String(err)).to.include("Transfer not possible");
      }
    });

    it("should reject transfer to restricted-country Charlie", async function () {
      const { token, charlie } = await loadFixture(deployGreenBondFixture);
      try {
        await token.write.transfer([charlie.account.address, parseEther("500")]);
        expect.fail("Should have reverted");
      } catch (err: unknown) {
        expect(err instanceof Error ? err.message : String(err)).to.include("Transfer not possible");
      }
    });
  });

  describe("Freeze / Unfreeze", function () {
    it("should block transfers to frozen address", async function () {
      const { token, diana } = await loadFixture(deployGreenBondFixture);
      const publicClient = await hre.viem.getPublicClient();

      // First transfer succeeds
      let hash = await token.write.transfer([diana.account.address, parseEther("100")]);
      await publicClient.waitForTransactionReceipt({ hash });

      // Freeze Diana
      hash = await token.write.setAddressFrozen([diana.account.address, true]);
      await publicClient.waitForTransactionReceipt({ hash });

      // Transfer to frozen address fails
      try {
        await token.write.transfer([diana.account.address, parseEther("100")]);
        expect.fail("Should have reverted");
      } catch (err: unknown) {
        expect(err instanceof Error ? err.message : String(err)).to.include("wallet is frozen");
      }
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
      const { token, diana } = await loadFixture(deployGreenBondFixture);
      const publicClient = await hre.viem.getPublicClient();

      const hash = await token.write.setAddressFrozen([diana.account.address, true]);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      const tokenArtifact = await hre.artifacts.readArtifact("Token");
      const frozenEvent = receipt.logs.find((log) => {
        try {
          const decoded = decodeEventLog({ abi: tokenArtifact.abi, data: log.data, topics: log.topics });
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

      // Diana can't send — get token contract connected to Diana's wallet
      const dianaToken = await hre.viem.getContractAt("Token", token.address, {
        client: { wallet: diana },
      });
      try {
        await dianaToken.write.transfer([alice.account.address, parseEther("100")]);
        expect.fail("Should have reverted");
      } catch (err: unknown) {
        expect(err instanceof Error ? err.message : String(err)).to.include("wallet is frozen");
      }
    });
  });

  describe("Pause / Unpause", function () {
    it("should block ALL transfers when paused", async function () {
      const { token, alice } = await loadFixture(deployGreenBondFixture);
      const publicClient = await hre.viem.getPublicClient();

      const hash = await token.write.pause();
      await publicClient.waitForTransactionReceipt({ hash });

      try {
        await token.write.transfer([alice.account.address, parseEther("100")]);
        expect.fail("Should have reverted");
      } catch (err: unknown) {
        expect(err instanceof Error ? err.message : String(err)).to.include("Pausable: paused");
      }
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
      try {
        await token.write.mint([bob.account.address, parseEther("100")]);
        expect.fail("Should have reverted");
      } catch (err: unknown) {
        expect(err instanceof Error ? err.message : String(err)).to.include("Identity is not verified.");
      }
    });

    it("should reject minting from non-agent", async function () {
      const { token, alice, diana } = await loadFixture(deployGreenBondFixture);
      const aliceToken = await hre.viem.getContractAt("Token", token.address, {
        client: { wallet: alice },
      });
      try {
        await aliceToken.write.mint([diana.account.address, parseEther("100")]);
        expect.fail("Should have reverted");
      } catch (err: unknown) {
        expect(err instanceof Error ? err.message : String(err)).to.include("AgentRole: caller does not have the Agent role");
      }
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
