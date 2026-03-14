import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployGreenBondFixture } from "./fixtures/deploy-suite.fixture";

describe("Transfers", function () {
  describe("Compliant Transfers", function () {
    it("should allow deployer to transfer to Alice", async function () {
      const { token, deployer, alice } = await loadFixture(deployGreenBondFixture);
      await expect(token.transfer(alice.address, ethers.parseEther("500")))
        .to.emit(token, "Transfer")
        .withArgs(deployer.address, alice.address, ethers.parseEther("500"));
    });

    it("should allow deployer to transfer to Diana", async function () {
      const { token, deployer, diana } = await loadFixture(deployGreenBondFixture);
      await expect(token.transfer(diana.address, ethers.parseEther("500")))
        .to.emit(token, "Transfer");
    });

    it("should update balances after transfer", async function () {
      const { token, deployer, alice } = await loadFixture(deployGreenBondFixture);
      const deployerBefore = await token.balanceOf(deployer.address);
      const aliceBefore = await token.balanceOf(alice.address);

      await token.transfer(alice.address, ethers.parseEther("1000"));

      expect(await token.balanceOf(deployer.address)).to.equal(deployerBefore - ethers.parseEther("1000"));
      expect(await token.balanceOf(alice.address)).to.equal(aliceBefore + ethers.parseEther("1000"));
    });
  });

  describe("Rejected Transfers", function () {
    it("should reject transfer to unverified Bob", async function () {
      const { token, bob } = await loadFixture(deployGreenBondFixture);
      await expect(token.transfer(bob.address, ethers.parseEther("500")))
        .to.be.revertedWith("Transfer not possible");
    });

    it("should reject transfer to restricted-country Charlie", async function () {
      const { token, charlie } = await loadFixture(deployGreenBondFixture);
      await expect(token.transfer(charlie.address, ethers.parseEther("500")))
        .to.be.revertedWith("Transfer not possible");
    });
  });

  describe("Freeze / Unfreeze", function () {
    it("should block transfers to frozen address", async function () {
      const { token, deployer, diana } = await loadFixture(deployGreenBondFixture);
      // First transfer succeeds
      await token.transfer(diana.address, ethers.parseEther("100"));

      // Freeze Diana
      await (await token.setAddressFrozen(diana.address, true)).wait();

      // Transfer to frozen address fails
      await expect(token.transfer(diana.address, ethers.parseEther("100")))
        .to.be.revertedWith("wallet is frozen");
    });

    it("should allow transfers after unfreezing", async function () {
      const { token, deployer, diana } = await loadFixture(deployGreenBondFixture);
      await (await token.setAddressFrozen(diana.address, true)).wait();
      await (await token.setAddressFrozen(diana.address, false)).wait();

      await expect(token.transfer(diana.address, ethers.parseEther("100")))
        .to.emit(token, "Transfer");
    });

    it("should emit AddressFrozen event", async function () {
      const { token, deployer, diana } = await loadFixture(deployGreenBondFixture);
      await expect(token.setAddressFrozen(diana.address, true))
        .to.emit(token, "AddressFrozen")
        .withArgs(diana.address, true, deployer.address);
    });

    it("should block transfers FROM frozen address", async function () {
      const { token, deployer, alice, diana } = await loadFixture(deployGreenBondFixture);
      // Give Diana some tokens
      await token.transfer(diana.address, ethers.parseEther("1000"));

      // Freeze Diana
      await (await token.setAddressFrozen(diana.address, true)).wait();

      // Diana can't send
      await expect(token.connect(diana).transfer(alice.address, ethers.parseEther("100")))
        .to.be.revertedWith("wallet is frozen");
    });
  });

  describe("Pause / Unpause", function () {
    it("should block ALL transfers when paused", async function () {
      const { token, deployer, alice } = await loadFixture(deployGreenBondFixture);
      await (await token.pause()).wait();
      await expect(token.transfer(alice.address, ethers.parseEther("100")))
        .to.be.revertedWith("Pausable: paused");
    });

    it("should resume transfers after unpausing", async function () {
      const { token, deployer, alice } = await loadFixture(deployGreenBondFixture);
      await (await token.pause()).wait();
      await (await token.unpause()).wait();
      await expect(token.transfer(alice.address, ethers.parseEther("100")))
        .to.emit(token, "Transfer");
    });

    it("should emit Paused and Unpaused events", async function () {
      const { token } = await loadFixture(deployGreenBondFixture);
      await expect(token.pause()).to.emit(token, "Paused");
      await expect(token.unpause()).to.emit(token, "Unpaused");
    });
  });

  describe("Minting", function () {
    it("should allow agent to mint to verified address", async function () {
      const { token, deployer, alice } = await loadFixture(deployGreenBondFixture);
      const before = await token.balanceOf(alice.address);
      await (await token.mint(alice.address, ethers.parseEther("1000"))).wait();
      expect(await token.balanceOf(alice.address)).to.equal(before + ethers.parseEther("1000"));
    });

    it("should reject minting to unverified address", async function () {
      const { token, bob } = await loadFixture(deployGreenBondFixture);
      await expect(token.mint(bob.address, ethers.parseEther("100")))
        .to.be.revertedWith("Identity is not verified.");
    });

    it("should reject minting from non-agent", async function () {
      const { token, alice, diana } = await loadFixture(deployGreenBondFixture);
      await expect(token.connect(alice).mint(diana.address, ethers.parseEther("100")))
        .to.be.revertedWith("AgentRole: caller does not have the Agent role");
    });

    it("should update totalSupply", async function () {
      const { token, alice } = await loadFixture(deployGreenBondFixture);
      const before = await token.totalSupply();
      await (await token.mint(alice.address, ethers.parseEther("500"))).wait();
      expect(await token.totalSupply()).to.equal(before + ethers.parseEther("500"));
    });
  });
});
