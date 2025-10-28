const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CAPX and ANGEL Tokens", function () {
  let capx, angel;
  let owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy CAPX
    const CAPX = await ethers.getContractFactory("CAPX");
    capx = await CAPX.deploy();
    await capx.deployed();

    // Deploy ANGEL
    const ANGEL = await ethers.getContractFactory("ANGEL");
    angel = await ANGEL.deploy();
    await angel.deployed();
  });

  describe("CAPX Token", function () {
    it("Should have correct initial values", async function () {
      expect(await capx.name()).to.equal("CAPShield Token");
      expect(await capx.symbol()).to.equal("CAPX");
      expect(await capx.decimals()).to.equal(18);
      expect(await capx.totalSupply()).to.equal(
        ethers.utils.parseUnits("100000000", 18)
      );
    });

    it("Should mint total supply to owner", async function () {
      const ownerBalance = await capx.balanceOf(owner.address);
      expect(ownerBalance).to.equal(await capx.totalSupply());
    });

    it("Should transfer tokens between accounts", async function () {
      await capx.transfer(addr1.address, ethers.utils.parseUnits("1000", 18));
      expect(await capx.balanceOf(addr1.address)).to.equal(
        ethers.utils.parseUnits("1000", 18)
      );
    });

    it("Should allow burning tokens", async function () {
      const initialSupply = await capx.totalSupply();
      await capx.burn(ethers.utils.parseUnits("1000", 18));
      expect(await capx.totalSupply()).to.equal(
        initialSupply.sub(ethers.utils.parseUnits("1000", 18))
      );
    });

    it("Should not allow minting after deployment", async function () {
      // CAPX doesn't have a mint function, so this should fail
      expect(capx.mint).to.be.undefined;
    });
  });

  describe("ANGEL Token", function () {
    it("Should have correct initial values", async function () {
      expect(await angel.name()).to.equal("AngleSeed Token");
      expect(await angel.symbol()).to.equal("ANGEL");
      expect(await angel.decimals()).to.equal(18);
      expect(await angel.totalSupply()).to.equal(
        ethers.utils.parseUnits("10000000000", 18)
      );
    });

    it("Should mint initial supply to owner", async function () {
      const ownerBalance = await angel.balanceOf(owner.address);
      expect(ownerBalance).to.equal(await angel.totalSupply());
    });

    it("Should allow owner to mint more tokens", async function () {
      const initialSupply = await angel.totalSupply();
      await angel.mint(addr1.address, ethers.utils.parseUnits("1000", 18));
      expect(await angel.totalSupply()).to.equal(
        initialSupply.add(ethers.utils.parseUnits("1000", 18))
      );
      expect(await angel.balanceOf(addr1.address)).to.equal(
        ethers.utils.parseUnits("1000", 18)
      );
    });

    it("Should not allow non-owner to mint tokens", async function () {
      await expect(
        angel
          .connect(addr1)
          .mint(addr1.address, ethers.utils.parseUnits("1000", 18))
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow anyone to burn their tokens", async function () {
      // First transfer some tokens to addr1
      await angel.transfer(addr1.address, ethers.utils.parseUnits("1000", 18));

      // Then burn from addr1
      await angel.connect(addr1).burn(ethers.utils.parseUnits("500", 18));
      expect(await angel.balanceOf(addr1.address)).to.equal(
        ethers.utils.parseUnits("500", 18)
      );
    });
  });
});
