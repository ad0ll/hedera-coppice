import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployGreenBondFixture } from "./fixtures/deploy-suite.fixture";

describe("Compliance", function () {
  describe("Identity Verification", function () {
    it("should verify Alice (registered with claims)", async function () {
      const { identityRegistry, alice } = await loadFixture(deployGreenBondFixture);
      expect(await identityRegistry.isVerified(alice.address)).to.be.true;
    });

    it("should NOT verify Bob (not registered)", async function () {
      const { identityRegistry, bob } = await loadFixture(deployGreenBondFixture);
      expect(await identityRegistry.isVerified(bob.address)).to.be.false;
    });

    it("should verify Charlie (registered with claims, but country restricted)", async function () {
      const { identityRegistry, charlie } = await loadFixture(deployGreenBondFixture);
      // Charlie IS verified by claims - the country restriction is at compliance level
      expect(await identityRegistry.isVerified(charlie.address)).to.be.true;
    });

    it("should verify Diana", async function () {
      const { identityRegistry, diana } = await loadFixture(deployGreenBondFixture);
      expect(await identityRegistry.isVerified(diana.address)).to.be.true;
    });
  });

  describe("Transfer Compliance (canTransfer)", function () {
    it("should allow transfer to Alice (DE, verified)", async function () {
      const { compliance, deployer, alice } = await loadFixture(deployGreenBondFixture);
      expect(await compliance.canTransfer(deployer.address, alice.address, ethers.parseEther("500"))).to.be.true;
    });

    it("should block transfer to Charlie (CN restricted)", async function () {
      const { compliance, deployer, charlie } = await loadFixture(deployGreenBondFixture);
      expect(await compliance.canTransfer(deployer.address, charlie.address, ethers.parseEther("500"))).to.be.false;
    });

    it("should allow transfer to Diana (FR, verified)", async function () {
      const { compliance, deployer, diana } = await loadFixture(deployGreenBondFixture);
      expect(await compliance.canTransfer(deployer.address, diana.address, ethers.parseEther("500"))).to.be.true;
    });
  });

  describe("Country Restriction Module", function () {
    it("should block country code 156 (CN)", async function () {
      const { compliance, deployer, charlie } = await loadFixture(deployGreenBondFixture);
      const canTransfer = await compliance.canTransfer(deployer.address, charlie.address, 1);
      expect(canTransfer).to.be.false;
    });
  });

  describe("Max Balance Module", function () {
    it("should block mint exceeding supply limit", async function () {
      const { token, deployer } = await loadFixture(deployGreenBondFixture);
      // Supply limit is 1,000,000. Already minted 100,000.
      // Minting 900,001 more would exceed supply limit.
      await expect(token.mint(deployer.address, ethers.parseEther("900001")))
        .to.be.revertedWith("Compliance not followed");
    });

    it("should allow mint within supply limit", async function () {
      const { token, deployer } = await loadFixture(deployGreenBondFixture);
      // Minting 900,000 more = 1,000,000 total = exactly at limit
      await expect(token.mint(deployer.address, ethers.parseEther("900000")))
        .to.emit(token, "Transfer");
    });
  });
});
