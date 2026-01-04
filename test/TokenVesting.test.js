const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("TokenVesting", function () {
  let tokenVesting;
  let capx;
  let angel;
  let mockAdmin;
  let deployer;
  let admin;
  let treasury;
  let dao;
  let beneficiary1;
  let beneficiary2;
  let beneficiary3;

  // Time constants
  const ONE_MINUTE = 60;
  const ONE_HOUR = 3600;
  const ONE_DAY = 86400;
  const ONE_MONTH = 30 * ONE_DAY;
  const ONE_YEAR = 365 * ONE_DAY;

  beforeEach(async function () {
    [deployer, admin, treasury, dao, beneficiary1, beneficiary2, beneficiary3] =
      await ethers.getSigners();

    // Deploy MockAdmin
    const MockAdmin = await ethers.getContractFactory("MockAdmin");
    mockAdmin = await MockAdmin.deploy();
    await mockAdmin.waitForDeployment();

    // Deploy CAPX
    const CAPX = await ethers.getContractFactory("CAPX");
    capx = await CAPX.deploy(
      treasury.address,
      dao.address,
      await mockAdmin.getAddress()
    );
    await capx.waitForDeployment();

    // Deploy ANGEL
    const ANGEL = await ethers.getContractFactory("ANGEL");
    angel = await ANGEL.deploy(await mockAdmin.getAddress());
    await angel.waitForDeployment();

    // Deploy TokenVesting
    const TokenVesting = await ethers.getContractFactory("TokenVesting");
    tokenVesting = await TokenVesting.deploy(await mockAdmin.getAddress());
    await tokenVesting.waitForDeployment();

    // Grant roles to deployer for testing
    const TEAM_MINTER_ROLE = ethers.keccak256(
      ethers.toUtf8Bytes("TEAM_MINTER_ROLE")
    );
    const REWARD_MINTER_ROLE = ethers.keccak256(
      ethers.toUtf8Bytes("REWARD_MINTER_ROLE")
    );

    await mockAdmin.grantRole(
      await capx.getAddress(),
      TEAM_MINTER_ROLE,
      deployer.address
    );
    await mockAdmin.grantRole(
      await angel.getAddress(),
      REWARD_MINTER_ROLE,
      deployer.address
    );

    // Mint tokens for testing
    await capx
      .connect(deployer)
      .teamMint(deployer.address, ethers.parseEther("1000000"));
    await angel
      .connect(deployer)
      .rewardMint(deployer.address, ethers.parseEther("1000000"), "Testing");
  });

  describe("Deployment", function () {
    it("Should deploy with correct admin", async function () {
      const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
      expect(
        await tokenVesting.hasRole(
          DEFAULT_ADMIN_ROLE,
          await mockAdmin.getAddress()
        )
      ).to.be.true;
    });

    it("Should revert if admin is zero address", async function () {
      const TokenVesting = await ethers.getContractFactory("TokenVesting");
      await expect(TokenVesting.deploy(ethers.ZeroAddress)).to.be.revertedWith(
        "Admin address cannot be zero"
      );
    });

    it("Should revert if admin is not a contract", async function () {
      const TokenVesting = await ethers.getContractFactory("TokenVesting");
      await expect(TokenVesting.deploy(deployer.address)).to.be.revertedWith(
        "Admin must be multisig/contract"
      );
    });
  });

  describe("Linear Vesting", function () {
    let startTime;
    const cliffDuration = 3 * ONE_MONTH; // 3 months cliff
    const vestingDuration = 12 * ONE_MONTH; // 12 months vesting
    const totalAmount = ethers.parseEther("10000");

    beforeEach(async function () {
      startTime = (await time.latest()) + ONE_DAY;

      // Approve tokens
      await capx
        .connect(deployer)
        .approve(await tokenVesting.getAddress(), totalAmount);
    });

    it("Should create linear vesting schedule", async function () {
      const VESTING_ADMIN_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("VESTING_ADMIN_ROLE")
      );
      await mockAdmin.grantRole(
        await tokenVesting.getAddress(),
        VESTING_ADMIN_ROLE,
        deployer.address
      );

      const tx = await tokenVesting.connect(deployer).createVestingSchedule(
        beneficiary1.address,
        await capx.getAddress(),
        totalAmount,
        startTime,
        cliffDuration,
        vestingDuration,
        0, // LINEAR vesting (stepDuration = 0)
        false // not revocable
      );

      await expect(tx).to.emit(tokenVesting, "VestingScheduleCreated");

      const schedule = await tokenVesting.getVestingSchedule(0);
      expect(schedule.beneficiary).to.equal(beneficiary1.address);
      expect(schedule.totalAmount).to.equal(totalAmount);
      expect(schedule.vestingType).to.equal(0); // LINEAR
    });

    it("Should not vest tokens before cliff", async function () {
      const VESTING_ADMIN_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("VESTING_ADMIN_ROLE")
      );
      await mockAdmin.grantRole(
        await tokenVesting.getAddress(),
        VESTING_ADMIN_ROLE,
        deployer.address
      );

      await tokenVesting
        .connect(deployer)
        .createVestingSchedule(
          beneficiary1.address,
          await capx.getAddress(),
          totalAmount,
          startTime,
          cliffDuration,
          vestingDuration,
          0,
          false
        );

      // Move to start time + 1 month (still in cliff)
      await time.increaseTo(startTime + ONE_MONTH);

      const vestedAmount = await tokenVesting.getVestedAmount(0);
      const claimableAmount = await tokenVesting.getClaimableAmount(0);

      expect(vestedAmount).to.equal(0);
      expect(claimableAmount).to.equal(0);
    });

    it("Should vest tokens linearly after cliff", async function () {
      const VESTING_ADMIN_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("VESTING_ADMIN_ROLE")
      );
      await mockAdmin.grantRole(
        await tokenVesting.getAddress(),
        VESTING_ADMIN_ROLE,
        deployer.address
      );

      await tokenVesting
        .connect(deployer)
        .createVestingSchedule(
          beneficiary1.address,
          await capx.getAddress(),
          totalAmount,
          startTime,
          cliffDuration,
          vestingDuration,
          0,
          false
        );

      // Move to cliff end + 6 months (50% of vesting period)
      await time.increaseTo(startTime + cliffDuration + 6 * ONE_MONTH);

      const vestedAmount = await tokenVesting.getVestedAmount(0);
      const expectedVested = totalAmount / 2n; // 50%

      expect(vestedAmount).to.be.closeTo(
        expectedVested,
        ethers.parseEther("1")
      );
    });

    it("Should allow beneficiary to claim vested tokens", async function () {
      const VESTING_ADMIN_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("VESTING_ADMIN_ROLE")
      );
      await mockAdmin.grantRole(
        await tokenVesting.getAddress(),
        VESTING_ADMIN_ROLE,
        deployer.address
      );

      await tokenVesting
        .connect(deployer)
        .createVestingSchedule(
          beneficiary1.address,
          await capx.getAddress(),
          totalAmount,
          startTime,
          cliffDuration,
          vestingDuration,
          0,
          false
        );

      // Move to cliff end + 6 months
      await time.increaseTo(startTime + cliffDuration + 6 * ONE_MONTH);

      const balanceBefore = await capx.balanceOf(beneficiary1.address);
      const claimableAmount = await tokenVesting.getClaimableAmount(0);

      await tokenVesting.connect(beneficiary1).claim(0);

      const balanceAfter = await capx.balanceOf(beneficiary1.address);
      expect(balanceAfter - balanceBefore).to.equal(claimableAmount);
    });

    it("Should vest all tokens after vesting period ends", async function () {
      const VESTING_ADMIN_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("VESTING_ADMIN_ROLE")
      );
      await mockAdmin.grantRole(
        await tokenVesting.getAddress(),
        VESTING_ADMIN_ROLE,
        deployer.address
      );

      await tokenVesting
        .connect(deployer)
        .createVestingSchedule(
          beneficiary1.address,
          await capx.getAddress(),
          totalAmount,
          startTime,
          cliffDuration,
          vestingDuration,
          0,
          false
        );

      // Move past vesting end
      await time.increaseTo(
        startTime + cliffDuration + vestingDuration + ONE_DAY
      );

      const vestedAmount = await tokenVesting.getVestedAmount(0);
      expect(vestedAmount).to.equal(totalAmount);

      await tokenVesting.connect(beneficiary1).claim(0);

      const schedule = await tokenVesting.getVestingSchedule(0);
      expect(schedule.claimed).to.equal(totalAmount);
    });

    it("Should prevent double claiming", async function () {
      const VESTING_ADMIN_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("VESTING_ADMIN_ROLE")
      );
      await mockAdmin.grantRole(
        await tokenVesting.getAddress(),
        VESTING_ADMIN_ROLE,
        deployer.address
      );

      await tokenVesting
        .connect(deployer)
        .createVestingSchedule(
          beneficiary1.address,
          await capx.getAddress(),
          totalAmount,
          startTime,
          cliffDuration,
          vestingDuration,
          0,
          false
        );

      // Move to cliff end + 6 months
      await time.increaseTo(startTime + cliffDuration + 6 * ONE_MONTH);

      await tokenVesting.connect(beneficiary1).claim(0);

      // Try to claim again immediately
      await expect(
        tokenVesting.connect(beneficiary1).claim(0)
      ).to.be.revertedWith("No tokens available to claim");
    });

    it("Should prevent non-beneficiary from claiming", async function () {
      const VESTING_ADMIN_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("VESTING_ADMIN_ROLE")
      );
      await mockAdmin.grantRole(
        await tokenVesting.getAddress(),
        VESTING_ADMIN_ROLE,
        deployer.address
      );

      await tokenVesting
        .connect(deployer)
        .createVestingSchedule(
          beneficiary1.address,
          await capx.getAddress(),
          totalAmount,
          startTime,
          cliffDuration,
          vestingDuration,
          0,
          false
        );

      await time.increaseTo(startTime + cliffDuration + 6 * ONE_MONTH);

      await expect(
        tokenVesting.connect(beneficiary2).claim(0)
      ).to.be.revertedWith("Only beneficiary can claim");
    });
  });

  describe("Step Vesting", function () {
    let startTime;
    const cliffDuration = ONE_MONTH;
    const vestingDuration = 12 * ONE_MONTH;
    const stepDuration = 3 * ONE_MONTH; // Unlock every 3 months
    const totalAmount = ethers.parseEther("12000");

    beforeEach(async function () {
      startTime = (await time.latest()) + ONE_DAY;
      await capx
        .connect(deployer)
        .approve(await tokenVesting.getAddress(), totalAmount);
    });

    it("Should create step vesting schedule", async function () {
      const VESTING_ADMIN_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("VESTING_ADMIN_ROLE")
      );
      await mockAdmin.grantRole(
        await tokenVesting.getAddress(),
        VESTING_ADMIN_ROLE,
        deployer.address
      );

      const tx = await tokenVesting
        .connect(deployer)
        .createVestingSchedule(
          beneficiary1.address,
          await capx.getAddress(),
          totalAmount,
          startTime,
          cliffDuration,
          vestingDuration,
          stepDuration,
          false
        );

      await expect(tx).to.emit(tokenVesting, "VestingScheduleCreated");

      const schedule = await tokenVesting.getVestingSchedule(0);
      expect(schedule.vestingType).to.equal(1); // STEP
    });

    it("Should vest tokens in steps", async function () {
      const VESTING_ADMIN_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("VESTING_ADMIN_ROLE")
      );
      await mockAdmin.grantRole(
        await tokenVesting.getAddress(),
        VESTING_ADMIN_ROLE,
        deployer.address
      );

      await tokenVesting
        .connect(deployer)
        .createVestingSchedule(
          beneficiary1.address,
          await capx.getAddress(),
          totalAmount,
          startTime,
          cliffDuration,
          vestingDuration,
          stepDuration,
          false
        );

      // After cliff + 1 step (3 months)
      await time.increaseTo(startTime + cliffDuration + stepDuration);

      const vestedAmount = await tokenVesting.getVestedAmount(0);
      const expectedVested = totalAmount / 4n; // 25% (1 of 4 steps)

      expect(vestedAmount).to.equal(expectedVested);
    });

    it("Should vest correct amount after 2 steps", async function () {
      const VESTING_ADMIN_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("VESTING_ADMIN_ROLE")
      );
      await mockAdmin.grantRole(
        await tokenVesting.getAddress(),
        VESTING_ADMIN_ROLE,
        deployer.address
      );

      await tokenVesting
        .connect(deployer)
        .createVestingSchedule(
          beneficiary1.address,
          await capx.getAddress(),
          totalAmount,
          startTime,
          cliffDuration,
          vestingDuration,
          stepDuration,
          false
        );

      // After cliff + 2 steps (6 months)
      await time.increaseTo(startTime + cliffDuration + 2 * stepDuration);

      const vestedAmount = await tokenVesting.getVestedAmount(0);
      const expectedVested = totalAmount / 2n; // 50% (2 of 4 steps)

      expect(vestedAmount).to.equal(expectedVested);
    });

    it("Should not vest partially within a step", async function () {
      const VESTING_ADMIN_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("VESTING_ADMIN_ROLE")
      );
      await mockAdmin.grantRole(
        await tokenVesting.getAddress(),
        VESTING_ADMIN_ROLE,
        deployer.address
      );

      await tokenVesting
        .connect(deployer)
        .createVestingSchedule(
          beneficiary1.address,
          await capx.getAddress(),
          totalAmount,
          startTime,
          cliffDuration,
          vestingDuration,
          stepDuration,
          false
        );

      // Halfway through first step
      await time.increaseTo(startTime + cliffDuration + stepDuration / 2);

      const vestedAmount = await tokenVesting.getVestedAmount(0);
      expect(vestedAmount).to.equal(0); // No tokens vested yet
    });

    it("Should revert if duration not divisible by step duration", async function () {
      const VESTING_ADMIN_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("VESTING_ADMIN_ROLE")
      );
      await mockAdmin.grantRole(
        await tokenVesting.getAddress(),
        VESTING_ADMIN_ROLE,
        deployer.address
      );

      const invalidStepDuration = 5 * ONE_MONTH; // 12 not divisible by 5

      await expect(
        tokenVesting
          .connect(deployer)
          .createVestingSchedule(
            beneficiary1.address,
            await capx.getAddress(),
            totalAmount,
            startTime,
            cliffDuration,
            vestingDuration,
            invalidStepDuration,
            false
          )
      ).to.be.revertedWith("Duration must be divisible by step duration");
    });
  });

  describe("Batch Operations", function () {
    let startTime;
    const cliffDuration = ONE_MONTH;
    const vestingDuration = 6 * ONE_MONTH;
    const amount1 = ethers.parseEther("5000");
    const amount2 = ethers.parseEther("3000");
    const amount3 = ethers.parseEther("2000");

    beforeEach(async function () {
      startTime = (await time.latest()) + ONE_DAY;
      const totalAmount = amount1 + amount2 + amount3;
      await capx
        .connect(deployer)
        .approve(await tokenVesting.getAddress(), totalAmount);
    });

    it("Should batch create vesting schedules", async function () {
      const VESTING_ADMIN_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("VESTING_ADMIN_ROLE")
      );
      await mockAdmin.grantRole(
        await tokenVesting.getAddress(),
        VESTING_ADMIN_ROLE,
        deployer.address
      );

      const beneficiaries = [
        beneficiary1.address,
        beneficiary2.address,
        beneficiary3.address,
      ];
      const amounts = [amount1, amount2, amount3];

      const tx = await tokenVesting
        .connect(deployer)
        .batchCreateVestingSchedules(
          beneficiaries,
          await capx.getAddress(),
          amounts,
          startTime,
          cliffDuration,
          vestingDuration,
          0,
          false
        );

      await expect(tx).to.emit(tokenVesting, "VestingScheduleCreated");

      // Verify all schedules created
      const schedule1 = await tokenVesting.getVestingSchedule(0);
      const schedule2 = await tokenVesting.getVestingSchedule(1);
      const schedule3 = await tokenVesting.getVestingSchedule(2);

      expect(schedule1.beneficiary).to.equal(beneficiary1.address);
      expect(schedule2.beneficiary).to.equal(beneficiary2.address);
      expect(schedule3.beneficiary).to.equal(beneficiary3.address);

      expect(schedule1.totalAmount).to.equal(amount1);
      expect(schedule2.totalAmount).to.equal(amount2);
      expect(schedule3.totalAmount).to.equal(amount3);
    });

    it("Should batch claim from multiple schedules", async function () {
      const VESTING_ADMIN_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("VESTING_ADMIN_ROLE")
      );
      await mockAdmin.grantRole(
        await tokenVesting.getAddress(),
        VESTING_ADMIN_ROLE,
        deployer.address
      );

      // Create multiple schedules for same beneficiary
      await tokenVesting
        .connect(deployer)
        .createVestingSchedule(
          beneficiary1.address,
          await capx.getAddress(),
          amount1,
          startTime,
          cliffDuration,
          vestingDuration,
          0,
          false
        );

      await capx
        .connect(deployer)
        .approve(await tokenVesting.getAddress(), amount2);
      await tokenVesting
        .connect(deployer)
        .createVestingSchedule(
          beneficiary1.address,
          await capx.getAddress(),
          amount2,
          startTime,
          cliffDuration,
          vestingDuration,
          0,
          false
        );

      // Move time to vest 50%
      await time.increaseTo(startTime + cliffDuration + vestingDuration / 2);

      const balanceBefore = await capx.balanceOf(beneficiary1.address);

      await tokenVesting.connect(beneficiary1).batchClaim([0, 1]);

      const balanceAfter = await capx.balanceOf(beneficiary1.address);
      const expectedClaim = (amount1 + amount2) / 2n;

      expect(balanceAfter - balanceBefore).to.be.closeTo(
        expectedClaim,
        ethers.parseEther("1")
      );
    });

    it("Should revert batch create if arrays length mismatch", async function () {
      const VESTING_ADMIN_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("VESTING_ADMIN_ROLE")
      );
      await mockAdmin.grantRole(
        await tokenVesting.getAddress(),
        VESTING_ADMIN_ROLE,
        deployer.address
      );

      const beneficiaries = [beneficiary1.address, beneficiary2.address];
      const amounts = [amount1, amount2, amount3]; // Mismatch

      await expect(
        tokenVesting
          .connect(deployer)
          .batchCreateVestingSchedules(
            beneficiaries,
            await capx.getAddress(),
            amounts,
            startTime,
            cliffDuration,
            vestingDuration,
            0,
            false
          )
      ).to.be.revertedWith("Arrays length mismatch");
    });
  });

  describe("Revocable Vesting", function () {
    let startTime;
    const cliffDuration = ONE_MONTH;
    const vestingDuration = 12 * ONE_MONTH;
    const totalAmount = ethers.parseEther("10000");

    beforeEach(async function () {
      startTime = (await time.latest()) + ONE_DAY;
      await capx
        .connect(deployer)
        .approve(await tokenVesting.getAddress(), totalAmount);
    });

    it("Should create revocable vesting schedule", async function () {
      const VESTING_ADMIN_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("VESTING_ADMIN_ROLE")
      );
      await mockAdmin.grantRole(
        await tokenVesting.getAddress(),
        VESTING_ADMIN_ROLE,
        deployer.address
      );

      await tokenVesting.connect(deployer).createVestingSchedule(
        beneficiary1.address,
        await capx.getAddress(),
        totalAmount,
        startTime,
        cliffDuration,
        vestingDuration,
        0,
        true // revocable
      );

      const schedule = await tokenVesting.getVestingSchedule(0);
      expect(schedule.revocable).to.be.true;
    });

    it("Should revoke vesting and transfer vested tokens to beneficiary", async function () {
      const VESTING_ADMIN_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("VESTING_ADMIN_ROLE")
      );
      await mockAdmin.grantRole(
        await tokenVesting.getAddress(),
        VESTING_ADMIN_ROLE,
        deployer.address
      );

      await tokenVesting
        .connect(deployer)
        .createVestingSchedule(
          beneficiary1.address,
          await capx.getAddress(),
          totalAmount,
          startTime,
          cliffDuration,
          vestingDuration,
          0,
          true
        );

      // Move to 25% vested
      await time.increaseTo(startTime + cliffDuration + vestingDuration / 4);

      const balanceBefore = await capx.balanceOf(beneficiary1.address);
      const adminBalanceBefore = await capx.balanceOf(deployer.address);

      await tokenVesting.connect(deployer).revokeVesting(0);

      const balanceAfter = await capx.balanceOf(beneficiary1.address);
      const adminBalanceAfter = await capx.balanceOf(deployer.address);

      const beneficiaryGained = balanceAfter - balanceBefore;
      const adminGained = adminBalanceAfter - adminBalanceBefore;

      // Beneficiary should get ~25% (vested amount)
      expect(beneficiaryGained).to.be.closeTo(
        totalAmount / 4n,
        ethers.parseEther("1")
      );

      // Admin should get ~75% (unvested amount)
      expect(adminGained).to.be.closeTo(
        (totalAmount * 3n) / 4n,
        ethers.parseEther("1")
      );
    });

    it("Should prevent claiming after revocation", async function () {
      const VESTING_ADMIN_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("VESTING_ADMIN_ROLE")
      );
      await mockAdmin.grantRole(
        await tokenVesting.getAddress(),
        VESTING_ADMIN_ROLE,
        deployer.address
      );

      await tokenVesting
        .connect(deployer)
        .createVestingSchedule(
          beneficiary1.address,
          await capx.getAddress(),
          totalAmount,
          startTime,
          cliffDuration,
          vestingDuration,
          0,
          true
        );

      await time.increaseTo(startTime + cliffDuration + vestingDuration / 4);
      await tokenVesting.connect(deployer).revokeVesting(0);

      await expect(
        tokenVesting.connect(beneficiary1).claim(0)
      ).to.be.revertedWith("Vesting has been revoked");
    });

    it("Should revert if trying to revoke non-revocable vesting", async function () {
      const VESTING_ADMIN_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("VESTING_ADMIN_ROLE")
      );
      await mockAdmin.grantRole(
        await tokenVesting.getAddress(),
        VESTING_ADMIN_ROLE,
        deployer.address
      );

      await tokenVesting.connect(deployer).createVestingSchedule(
        beneficiary1.address,
        await capx.getAddress(),
        totalAmount,
        startTime,
        cliffDuration,
        vestingDuration,
        0,
        false // not revocable
      );

      await time.increaseTo(startTime + cliffDuration + ONE_MONTH);

      await expect(
        tokenVesting.connect(deployer).revokeVesting(0)
      ).to.be.revertedWith("Vesting is not revocable");
    });

    it("Should revert if trying to revoke already revoked vesting", async function () {
      const VESTING_ADMIN_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("VESTING_ADMIN_ROLE")
      );
      await mockAdmin.grantRole(
        await tokenVesting.getAddress(),
        VESTING_ADMIN_ROLE,
        deployer.address
      );

      await tokenVesting
        .connect(deployer)
        .createVestingSchedule(
          beneficiary1.address,
          await capx.getAddress(),
          totalAmount,
          startTime,
          cliffDuration,
          vestingDuration,
          0,
          true
        );

      await time.increaseTo(startTime + cliffDuration + ONE_MONTH);
      await tokenVesting.connect(deployer).revokeVesting(0);

      await expect(
        tokenVesting.connect(deployer).revokeVesting(0)
      ).to.be.revertedWith("Vesting already revoked");
    });
  });

  describe("ANGEL Token Integration", function () {
    let startTime;
    const totalAmount = ethers.parseEther("50000");

    beforeEach(async function () {
      startTime = (await time.latest()) + ONE_DAY;
      await angel
        .connect(deployer)
        .approve(await tokenVesting.getAddress(), totalAmount);
    });

    it("Should create vesting schedule with ANGEL token", async function () {
      const VESTING_ADMIN_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("VESTING_ADMIN_ROLE")
      );
      await mockAdmin.grantRole(
        await tokenVesting.getAddress(),
        VESTING_ADMIN_ROLE,
        deployer.address
      );

      await tokenVesting
        .connect(deployer)
        .createVestingSchedule(
          beneficiary1.address,
          await angel.getAddress(),
          totalAmount,
          startTime,
          ONE_MONTH,
          6 * ONE_MONTH,
          0,
          false
        );

      const schedule = await tokenVesting.getVestingSchedule(0);
      expect(schedule.token).to.equal(await angel.getAddress());
    });

    it("Should allow claiming ANGEL tokens", async function () {
      const VESTING_ADMIN_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("VESTING_ADMIN_ROLE")
      );
      await mockAdmin.grantRole(
        await tokenVesting.getAddress(),
        VESTING_ADMIN_ROLE,
        deployer.address
      );

      await tokenVesting
        .connect(deployer)
        .createVestingSchedule(
          beneficiary1.address,
          await angel.getAddress(),
          totalAmount,
          startTime,
          ONE_MONTH,
          6 * ONE_MONTH,
          0,
          false
        );

      await time.increaseTo(startTime + ONE_MONTH + 3 * ONE_MONTH);

      const balanceBefore = await angel.balanceOf(beneficiary1.address);
      await tokenVesting.connect(beneficiary1).claim(0);
      const balanceAfter = await angel.balanceOf(beneficiary1.address);

      expect(balanceAfter).to.be.gt(balanceBefore);
    });
  });

  describe("Access Control", function () {
    it("Should only allow VESTING_ADMIN_ROLE to create schedules", async function () {
      const totalAmount = ethers.parseEther("1000");
      const startTime = (await time.latest()) + ONE_DAY;

      await capx
        .connect(deployer)
        .approve(await tokenVesting.getAddress(), totalAmount);

      await expect(
        tokenVesting
          .connect(beneficiary1)
          .createVestingSchedule(
            beneficiary2.address,
            await capx.getAddress(),
            totalAmount,
            startTime,
            ONE_MONTH,
            6 * ONE_MONTH,
            0,
            false
          )
      ).to.be.reverted;
    });

    it("Should only allow PAUSER_ROLE to pause", async function () {
      await expect(tokenVesting.connect(beneficiary1).pause()).to.be.reverted;
    });

    it("Should only allow DEFAULT_ADMIN_ROLE to withdraw excess tokens", async function () {
      await expect(
        tokenVesting
          .connect(beneficiary1)
          .withdrawExcessTokens(
            await capx.getAddress(),
            beneficiary2.address,
            ethers.parseEther("100")
          )
      ).to.be.reverted;
    });
  });

  describe("Pause Functionality", function () {
    it("Should prevent creating schedules when paused", async function () {
      const VESTING_ADMIN_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("VESTING_ADMIN_ROLE")
      );
      const PAUSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PAUSER_ROLE"));

      await mockAdmin.grantRole(
        await tokenVesting.getAddress(),
        VESTING_ADMIN_ROLE,
        deployer.address
      );
      await mockAdmin.grantRole(
        await tokenVesting.getAddress(),
        PAUSER_ROLE,
        deployer.address
      );

      await tokenVesting.connect(deployer).pause();

      const totalAmount = ethers.parseEther("1000");
      const startTime = (await time.latest()) + ONE_DAY;

      await capx
        .connect(deployer)
        .approve(await tokenVesting.getAddress(), totalAmount);

      await expect(
        tokenVesting
          .connect(deployer)
          .createVestingSchedule(
            beneficiary1.address,
            await capx.getAddress(),
            totalAmount,
            startTime,
            ONE_MONTH,
            6 * ONE_MONTH,
            0,
            false
          )
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should prevent claiming when paused", async function () {
      const VESTING_ADMIN_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("VESTING_ADMIN_ROLE")
      );
      const PAUSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PAUSER_ROLE"));

      await mockAdmin.grantRole(
        await tokenVesting.getAddress(),
        VESTING_ADMIN_ROLE,
        deployer.address
      );
      await mockAdmin.grantRole(
        await tokenVesting.getAddress(),
        PAUSER_ROLE,
        deployer.address
      );

      const totalAmount = ethers.parseEther("1000");
      const startTime = (await time.latest()) + ONE_DAY;

      await capx
        .connect(deployer)
        .approve(await tokenVesting.getAddress(), totalAmount);

      await tokenVesting
        .connect(deployer)
        .createVestingSchedule(
          beneficiary1.address,
          await capx.getAddress(),
          totalAmount,
          startTime,
          ONE_MONTH,
          6 * ONE_MONTH,
          0,
          false
        );

      await time.increaseTo(startTime + ONE_MONTH + 3 * ONE_MONTH);
      await tokenVesting.connect(deployer).pause();

      await expect(
        tokenVesting.connect(beneficiary1).claim(0)
      ).to.be.revertedWith("Pausable: paused");
    });
  });

  describe("View Functions", function () {
    let startTime;
    const totalAmount = ethers.parseEther("12000");

    beforeEach(async function () {
      startTime = (await time.latest()) + ONE_DAY;
      await capx
        .connect(deployer)
        .approve(await tokenVesting.getAddress(), totalAmount);

      const VESTING_ADMIN_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("VESTING_ADMIN_ROLE")
      );
      await mockAdmin.grantRole(
        await tokenVesting.getAddress(),
        VESTING_ADMIN_ROLE,
        deployer.address
      );
    });

    it("Should return correct vesting schedule IDs for beneficiary", async function () {
      await tokenVesting
        .connect(deployer)
        .createVestingSchedule(
          beneficiary1.address,
          await capx.getAddress(),
          totalAmount,
          startTime,
          ONE_MONTH,
          6 * ONE_MONTH,
          0,
          false
        );

      const scheduleIds = await tokenVesting.getVestingScheduleIds(
        beneficiary1.address,
        await capx.getAddress()
      );
      expect(scheduleIds.length).to.equal(1);
      expect(scheduleIds[0]).to.equal(0);
    });

    it("Should return correct total vesting schedules count", async function () {
      await tokenVesting
        .connect(deployer)
        .createVestingSchedule(
          beneficiary1.address,
          await capx.getAddress(),
          totalAmount,
          startTime,
          ONE_MONTH,
          6 * ONE_MONTH,
          0,
          false
        );

      const count = await tokenVesting.getTotalVestingSchedules();
      expect(count).to.equal(1);
    });
  });

  describe("Edge Cases", function () {
    it("Should revert if creating schedule with zero amount", async function () {
      const VESTING_ADMIN_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("VESTING_ADMIN_ROLE")
      );
      await mockAdmin.grantRole(
        await tokenVesting.getAddress(),
        VESTING_ADMIN_ROLE,
        deployer.address
      );

      const startTime = (await time.latest()) + ONE_DAY;

      await expect(
        tokenVesting.connect(deployer).createVestingSchedule(
          beneficiary1.address,
          await capx.getAddress(),
          0, // zero amount
          startTime,
          ONE_MONTH,
          6 * ONE_MONTH,
          0,
          false
        )
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should revert if creating schedule with zero duration", async function () {
      const VESTING_ADMIN_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("VESTING_ADMIN_ROLE")
      );
      await mockAdmin.grantRole(
        await tokenVesting.getAddress(),
        VESTING_ADMIN_ROLE,
        deployer.address
      );

      const totalAmount = ethers.parseEther("1000");
      const startTime = (await time.latest()) + ONE_DAY;

      await capx
        .connect(deployer)
        .approve(await tokenVesting.getAddress(), totalAmount);

      await expect(
        tokenVesting.connect(deployer).createVestingSchedule(
          beneficiary1.address,
          await capx.getAddress(),
          totalAmount,
          startTime,
          ONE_MONTH,
          0, // zero duration
          0,
          false
        )
      ).to.be.revertedWith("Duration must be greater than 0");
    });

    it("Should revert if beneficiary is zero address", async function () {
      const VESTING_ADMIN_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("VESTING_ADMIN_ROLE")
      );
      await mockAdmin.grantRole(
        await tokenVesting.getAddress(),
        VESTING_ADMIN_ROLE,
        deployer.address
      );

      const totalAmount = ethers.parseEther("1000");
      const startTime = (await time.latest()) + ONE_DAY;

      await capx
        .connect(deployer)
        .approve(await tokenVesting.getAddress(), totalAmount);

      await expect(
        tokenVesting
          .connect(deployer)
          .createVestingSchedule(
            ethers.ZeroAddress,
            await capx.getAddress(),
            totalAmount,
            startTime,
            ONE_MONTH,
            6 * ONE_MONTH,
            0,
            false
          )
      ).to.be.revertedWith("Beneficiary cannot be zero address");
    });

    it("Should handle multiple claims correctly", async function () {
      const VESTING_ADMIN_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("VESTING_ADMIN_ROLE")
      );
      await mockAdmin.grantRole(
        await tokenVesting.getAddress(),
        VESTING_ADMIN_ROLE,
        deployer.address
      );

      const totalAmount = ethers.parseEther("12000");
      const startTime = (await time.latest()) + ONE_DAY;

      await capx
        .connect(deployer)
        .approve(await tokenVesting.getAddress(), totalAmount);

      await tokenVesting
        .connect(deployer)
        .createVestingSchedule(
          beneficiary1.address,
          await capx.getAddress(),
          totalAmount,
          startTime,
          ONE_MONTH,
          12 * ONE_MONTH,
          0,
          false
        );

      // Claim at 25%
      await time.increaseTo(startTime + ONE_MONTH + 3 * ONE_MONTH);
      await tokenVesting.connect(beneficiary1).claim(0);

      const claimed1 = (await tokenVesting.getVestingSchedule(0)).claimed;

      // Claim at 50%
      await time.increaseTo(startTime + ONE_MONTH + 6 * ONE_MONTH);
      await tokenVesting.connect(beneficiary1).claim(0);

      const claimed2 = (await tokenVesting.getVestingSchedule(0)).claimed;

      // Claim at 100%
      await time.increaseTo(startTime + ONE_MONTH + 12 * ONE_MONTH);
      await tokenVesting.connect(beneficiary1).claim(0);

      const claimed3 = (await tokenVesting.getVestingSchedule(0)).claimed;

      expect(claimed2).to.be.gt(claimed1);
      expect(claimed3).to.equal(totalAmount);
    });
  });
});
