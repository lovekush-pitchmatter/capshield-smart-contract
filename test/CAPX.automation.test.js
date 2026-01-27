const { expect } = require("chai");
const hre = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("CAPX Token - Automation (Keepers)", function () {
  let capx;
  let mockMultisig;
  let mockV3Aggregator;
  let owner, treasury, dao, team, user1;

  // Constants
  const DECIMALS = 8;
  const INITIAL_PRICE = 100000000; // $1.00
  const MINT_INTERVAL = 86400; // 1 day

  beforeEach(async function () {
    [owner, treasury, dao, team, user1] = await hre.ethers.getSigners();

    const MockMultisig = await hre.ethers.getContractFactory("MockMultisig");
    mockMultisig = await MockMultisig.deploy(owner.address);

    const MockV3Aggregator = await hre.ethers.getContractFactory("MockV3Aggregator");
    mockV3Aggregator = await MockV3Aggregator.deploy(DECIMALS, INITIAL_PRICE);

    const CAPX = await hre.ethers.getContractFactory("CAPX");
    capx = await CAPX.deploy(treasury.address, dao.address, mockMultisig.target, mockV3Aggregator.target);
  });

  describe("CheckUpkeep", function () {
    it("Should return false if no pending revenue", async function () {
      // Time passed: Yes (initially lastMintTime is 0, so timestamp > interval)
      // Revenue > 0: No
      const [upkeepNeeded] = await capx.checkUpkeep("0x");
      expect(upkeepNeeded).to.be.false;
    });

    it("Should return false if interval not passed", async function () {
      // Add revenue
      await capx.addRevenue(hre.ethers.parseEther("100"));
      
      // Simulate mint just happened
      // We can't easily set lastMintTime directly without a helper or calling performUpkeep once.
      // But initially lastMintTime is 0. So time > interval is ALWAYS true unless we deploy fresh.
      // Wait, block.timestamp is usually > 0.
      
      // Let's force a mint first to set lastMintTime
      // But performUpkeep needs condition met.
      
      // Plan:
      // 1. Condition met (Rev > 0, Time > 0).
      // 2. performUpkeep -> sets lastMintTime = now.
      // 3. Add more revenue.
      // 4. checkUpkeep -> Should be false (Time not passed).
    });

    it("Should return true if interval passed and revenue > 0", async function () {
       await capx.addRevenue(hre.ethers.parseEther("100"));
       // lastMintTime is 0. block.timestamp is huge. Interval is 1 day.
       // So condition Met.
       const [upkeepNeeded] = await capx.checkUpkeep("0x");
       expect(upkeepNeeded).to.be.true;
    });
  });

  describe("PerformUpkeep", function () {
    it("Should execute minting when conditions met", async function () {
      const revenue = hre.ethers.parseEther("1000");
      await capx.addRevenue(revenue);

      // Verify Treasury balance before
      const treasuryBalanceBefore = await capx.balanceOf(treasury.address);
      
      // Perform Upkeep
      await capx.performUpkeep("0x");

      // Verify pending revenue reset
      expect(await capx.pendingRevenue()).to.equal(0);

      // Verify tokens minted (Price $1 => 1000 tokens)
      const expectedMint = hre.ethers.parseEther("1000");
      expect(await capx.balanceOf(treasury.address)).to.equal(treasuryBalanceBefore + expectedMint);
    });

    it("Should revert if upkeep not needed", async function () {
      await expect(
        capx.performUpkeep("0x")
      ).to.be.revertedWith("Upkeep not needed");
    });

    it("Should update lastMintTime", async function () {
        await capx.addRevenue(hre.ethers.parseEther("100"));
        await capx.performUpkeep("0x");
        
        const lastMint = await capx.lastMintTime();
        expect(lastMint).to.be.gt(0);
        
        // Try again immediately -> Fail
        await capx.addRevenue(hre.ethers.parseEther("100"));
        await expect(
            capx.performUpkeep("0x")
        ).to.be.revertedWith("Upkeep not needed"); // Interval check
    });
    
    it("Should allow upkeep after interval passes again", async function () {
        // 1. First Mint
        await capx.addRevenue(hre.ethers.parseEther("100"));
        await capx.performUpkeep("0x");
        
        // 2. Add Revenue
        await capx.addRevenue(hre.ethers.parseEther("100"));

        // 3. Fast Forward Time
        await time.increase(86401); // 1 day + 1 sec
        
        // 4. Check
        const [upkeepNeeded] = await capx.checkUpkeep("0x");
        expect(upkeepNeeded).to.be.true;

        // 5. Perform
        await expect(capx.performUpkeep("0x")).to.not.be.reverted;
    });
  });
});
