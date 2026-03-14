import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployGreenBondFixture } from "./fixtures/deploy-suite.fixture";

describe("Deployment", function () {
  it("should deploy token with correct name, symbol, decimals", async function () {
    const { token } = await loadFixture(deployGreenBondFixture);
    expect(await token.name()).to.equal("Coppice Green Bond");
    expect(await token.symbol()).to.equal("CPC");
    expect(await token.decimals()).to.equal(18);
  });

  it("should have non-zero addresses for all suite contracts", async function () {
    const { token, identityRegistry, compliance } = await loadFixture(deployGreenBondFixture);
    expect(await token.getAddress()).to.not.equal(ethers.ZeroAddress);
    expect(await identityRegistry.getAddress()).to.not.equal(ethers.ZeroAddress);
    expect(await compliance.getAddress()).to.not.equal(ethers.ZeroAddress);
  });

  it("should set deployer as token agent", async function () {
    const { token, deployer } = await loadFixture(deployGreenBondFixture);
    expect(await token.isAgent(deployer.address)).to.be.true;
  });

  it("should set deployer as identity registry agent", async function () {
    const { identityRegistry, deployer } = await loadFixture(deployGreenBondFixture);
    expect(await identityRegistry.isAgent(deployer.address)).to.be.true;
  });

  it("should have initial supply minted to deployer", async function () {
    const { token, deployer } = await loadFixture(deployGreenBondFixture);
    expect(await token.balanceOf(deployer.address)).to.equal(ethers.parseEther("100000"));
  });

  it("should be unpaused after setup", async function () {
    const { token } = await loadFixture(deployGreenBondFixture);
    expect(await token.paused()).to.be.false;
  });
});
