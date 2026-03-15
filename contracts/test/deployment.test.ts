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
