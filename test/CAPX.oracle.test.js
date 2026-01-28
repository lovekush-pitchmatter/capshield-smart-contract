const { expect } = require("chai");
const hre = require("hardhat");

describe("CAPX Token - Chainlink Oracle Integration", function () {
  let capx;
  let mockMultisig;
  let mockV3Aggregator;
  let owner, treasury, dao, team, user1;
  let TREASURY_MINTER_ROLE;

  // Constants
  const DECIMALS = 8; // Chainlink decimals
  const INITIAL_PRICE = 100000000; // $1.00 (8 decimals)

  beforeEach(async function () {
    [owner, treasury, dao, team, user1] = await hre.ethers.getSigners();

    // 1. Deploy Mock Multisig
    const MockMultisig = await hre.ethers.getContractFactory("MockMultisig");
    mockMultisig = await MockMultisig.deploy(owner.address);

    // 2. Deploy Mock Oracle
    const MockV3Aggregator = await hre.ethers.getContractFactory("MockV3Aggregator");
    // Decimals: 8, Initial Answer: $1.00
    mockV3Aggregator = await MockV3Aggregator.deploy(DECIMALS, INITIAL_PRICE);

    // 3. Deploy CAPX with Oracle Address
    const CAPX = await hre.ethers.getContractFactory("CAPX");
    capx = await CAPX.deploy(treasury.address, dao.address, mockMultisig.target, mockV3Aggregator.target);

    TREASURY_MINTER_ROLE = await capx.TREASURY_MINTER_ROLE();
  });

  // Helper to execute multisig calls
  async function executeAsMultisig(targetContract, functionName, ...args) {
    const calldata = targetContract.interface.encodeFunctionData(functionName, args);
    return await mockMultisig.execute(targetContract.target, calldata);
  }

  describe("Deployment", function () {
    it("Should set the price feed address correctly", async function () {
      expect(await capx.priceFeed()).to.equal(mockV3Aggregator.target);
    });
  });

  describe("Trustless Revenue Minting", function () {
    it("Should mint correct amount when price is $1.00", async function () {
      const revenue = hre.ethers.parseEther("1000"); // $1000 revenue
      // Formula: Amount = (Revenue * 10^18) / (Price * 10^10)
      // Price = 1e8 ($1). Adjusted Price = 1e18.
      // Amount = 1000 * 1e18 * 1e18 / 1e18 = 1000 * 1e18

      await executeAsMultisig(capx, "revenueMint", user1.address, revenue);

      expect(await capx.balanceOf(user1.address)).to.equal(hre.ethers.parseEther("1000"));
    });

    it("Should mint correct amount when price is $2.00", async function () {
      // Update price to $2.00
      await mockV3Aggregator.updateAnswer(200000000); // 2e8

      const revenue = hre.ethers.parseEther("1000"); // $1000 revenue
      // Expected: 500 tokens
      
      await executeAsMultisig(capx, "revenueMint", user1.address, revenue);

      expect(await capx.balanceOf(user1.address)).to.equal(hre.ethers.parseEther("500"));
    });

    it("Should mint correct amount when price is $0.50", async function () {
      // Update price to $0.50
      await mockV3Aggregator.updateAnswer(50000000); // 0.5e8

      const revenue = hre.ethers.parseEther("1000"); // $1000 revenue
      // Expected: 2000 tokens

      await executeAsMultisig(capx, "revenueMint", user1.address, revenue);

      expect(await capx.balanceOf(user1.address)).to.equal(hre.ethers.parseEther("2000"));
    });

    it("Should emit RevenueMint event with oracle data", async function () {
      const revenue = hre.ethers.parseEther("100");
      // Current price is $1.00 (default)
      
      const calldata = capx.interface.encodeFunctionData("revenueMint", [user1.address, revenue]);
      
      // Calculate expected market value (1e18 adjusted)
      const expectedPrice = hre.ethers.parseEther("1");

      await expect(mockMultisig.execute(capx.target, calldata))
        .to.emit(capx, "RevenueMint")
        .withArgs(user1.address, revenue, revenue, expectedPrice); // amount == revenue when price is $1
    });

    it("Should revert if Oracle returns zero/negative price", async function () {
      await mockV3Aggregator.updateAnswer(0);

      const revenue = hre.ethers.parseEther("100");
      
      await expect(
        executeAsMultisig(capx, "revenueMint", user1.address, revenue)
      ).to.be.revertedWithCustomError(capx, "InvalidOraclePrice");

      await mockV3Aggregator.updateAnswer(-100);

      await expect(
        executeAsMultisig(capx, "revenueMint", user1.address, revenue)
      ).to.be.revertedWithCustomError(capx, "InvalidOraclePrice");
    });
  });

  describe("Admin Functions", function () {
    it("Should allow admin to update price feed", async function () {
      const newFeed = user1.address; // Random address
      await executeAsMultisig(capx, "setPriceFeed", newFeed);
      
      expect(await capx.priceFeed()).to.equal(newFeed);
    });

    it("Should prevent non-admin from updating price feed", async function () {
        await expect(
            capx.connect(user1).setPriceFeed(user1.address)
        ).to.be.reverted; // AccessControl revert
    });
  });
});
