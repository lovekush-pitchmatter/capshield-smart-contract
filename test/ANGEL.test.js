// test/ANGEL.test.js
// Comprehensive test suite for ANGEL (AngleSeed Token)
// Covers all Phase 2 validation requirements

const { expect } = require("chai");
const hre = require("hardhat");

describe("ANGEL Token - Community Reward Token", function () {
  let angel;
  let mockAdmin;
  let user1, user2, user3, user4, user5;
  let DEFAULT_ADMIN_ROLE, REWARD_MINTER_ROLE, PAUSER_ROLE;

  // Deploy MockAdmin contract before tests
  before(async function () {
    const MockAdminFactory = await hre.ethers.getContractFactory(
      "MockAdmin",
      (
        await hre.ethers.getSigners()
      )[0]
    );
    mockAdmin = await MockAdminFactory.deploy();
  });

  beforeEach(async function () {
    [, user1, user2, user3, user4, user5] = await hre.ethers.getSigners();

    const ANGEL = await hre.ethers.getContractFactory("ANGEL");
    angel = await ANGEL.deploy(await mockAdmin.getAddress());

    DEFAULT_ADMIN_ROLE = await angel.DEFAULT_ADMIN_ROLE();
    REWARD_MINTER_ROLE = await angel.REWARD_MINTER_ROLE();
    PAUSER_ROLE = await angel.PAUSER_ROLE();

    // Grant roles to user1 for testing (via mockAdmin)
    await mockAdmin.grantRole(
      await angel.getAddress(),
      REWARD_MINTER_ROLE,
      user1.address
    );
    await mockAdmin.grantRole(
      await angel.getAddress(),
      PAUSER_ROLE,
      user1.address
    );
  });

  describe("1. Deployment & Initial State", function () {
    it("Should have correct name", async function () {
      expect(await angel.name()).to.equal("AngleSeed Token");
    });

    it("Should have correct symbol (SEED)", async function () {
      expect(await angel.symbol()).to.equal("SEED");
    });

    it("Should have correct decimals (18)", async function () {
      expect(await angel.decimals()).to.equal(18);
    });

    it("Should start with zero totalSupply", async function () {
      expect(await angel.totalSupply()).to.equal(0);
    });

    it("Should start with zero totalMinted", async function () {
      expect(await angel.totalMinted()).to.equal(0);
    });

    it("Should have correct MAX_SUPPLY (10 Billion)", async function () {
      const maxSupply = await angel.MAX_SUPPLY();
      expect(maxSupply).to.equal(hre.ethers.parseEther("10000000000"));
    });

    it("Should start unpaused", async function () {
      expect(await angel.paused()).to.be.false;
    });

    describe("Constructor Validation", function () {
      it("Should revert if admin address is zero", async function () {
        const ANGEL = await hre.ethers.getContractFactory("ANGEL");
        await expect(ANGEL.deploy(hre.ethers.ZeroAddress)).to.be.revertedWith(
          "Admin address cannot be zero"
        );
      });

      it("Should revert if admin is not a contract (EOA)", async function () {
        const ANGEL = await hre.ethers.getContractFactory("ANGEL");
        await expect(ANGEL.deploy(user1.address)).to.be.revertedWith(
          "Admin must be multisig/contract"
        );
      });
    });
  });

  describe("2. Access Control", function () {
    it("Should assign DEFAULT_ADMIN_ROLE to multisig admin", async function () {
      expect(
        await angel.hasRole(DEFAULT_ADMIN_ROLE, await mockAdmin.getAddress())
      ).to.be.true;
    });

    it("Should assign REWARD_MINTER_ROLE to admin", async function () {
      expect(
        await angel.hasRole(REWARD_MINTER_ROLE, await mockAdmin.getAddress())
      ).to.be.true;
    });

    it("Should assign PAUSER_ROLE to admin", async function () {
      expect(await angel.hasRole(PAUSER_ROLE, await mockAdmin.getAddress())).to
        .be.true;
    });

    it("Should not assign roles to non-admin addresses initially", async function () {
      expect(await angel.hasRole(REWARD_MINTER_ROLE, user2.address)).to.be
        .false;
      expect(await angel.hasRole(PAUSER_ROLE, user2.address)).to.be.false;
    });

    it("Should allow admin to grant REWARD_MINTER_ROLE", async function () {
      await mockAdmin.grantRole(
        await angel.getAddress(),
        REWARD_MINTER_ROLE,
        user2.address
      );
      expect(await angel.hasRole(REWARD_MINTER_ROLE, user2.address)).to.be.true;
    });

    it("Should allow admin to revoke REWARD_MINTER_ROLE", async function () {
      await mockAdmin.grantRole(
        await angel.getAddress(),
        REWARD_MINTER_ROLE,
        user2.address
      );
      await mockAdmin.revokeRole(
        await angel.getAddress(),
        REWARD_MINTER_ROLE,
        user2.address
      );
      expect(await angel.hasRole(REWARD_MINTER_ROLE, user2.address)).to.be
        .false;
    });

    it("Should allow admin to grant PAUSER_ROLE", async function () {
      await mockAdmin.grantRole(
        await angel.getAddress(),
        PAUSER_ROLE,
        user2.address
      );
      expect(await angel.hasRole(PAUSER_ROLE, user2.address)).to.be.true;
    });

    it("Should allow admin to revoke PAUSER_ROLE", async function () {
      await mockAdmin.grantRole(
        await angel.getAddress(),
        PAUSER_ROLE,
        user2.address
      );
      await mockAdmin.revokeRole(
        await angel.getAddress(),
        PAUSER_ROLE,
        user2.address
      );
      expect(await angel.hasRole(PAUSER_ROLE, user2.address)).to.be.false;
    });

    it("Should prevent non-admin from granting roles", async function () {
      await expect(
        angel.connect(user2).grantRole(REWARD_MINTER_ROLE, user3.address)
      ).to.be.reverted;
    });

    it("Should prevent non-admin from revoking roles", async function () {
      await expect(
        angel.connect(user2).revokeRole(REWARD_MINTER_ROLE, user1.address)
      ).to.be.reverted;
    });

    it("Should emit RoleGranted event when granting roles", async function () {
      await expect(
        mockAdmin.grantRole(
          await angel.getAddress(),
          REWARD_MINTER_ROLE,
          user2.address
        )
      )
        .to.emit(angel, "RoleGranted")
        .withArgs(
          REWARD_MINTER_ROLE,
          user2.address,
          await mockAdmin.getAddress()
        );
    });

    it("Should emit RoleRevoked event when revoking roles", async function () {
      await mockAdmin.grantRole(
        await angel.getAddress(),
        REWARD_MINTER_ROLE,
        user2.address
      );

      await expect(
        mockAdmin.revokeRole(
          await angel.getAddress(),
          REWARD_MINTER_ROLE,
          user2.address
        )
      )
        .to.emit(angel, "RoleRevoked")
        .withArgs(
          REWARD_MINTER_ROLE,
          user2.address,
          await mockAdmin.getAddress()
        );
    });

    it("Should allow new minter to mint after role granted", async function () {
      await mockAdmin.grantRole(
        await angel.getAddress(),
        REWARD_MINTER_ROLE,
        user2.address
      );

      await angel
        .connect(user2)
        .rewardMint(
          user3.address,
          hre.ethers.parseEther("500"),
          "Granted role mint"
        );

      expect(await angel.balanceOf(user3.address)).to.equal(
        hre.ethers.parseEther("500")
      );
    });

    it("Should prevent minting after role revoked", async function () {
      await mockAdmin.grantRole(
        await angel.getAddress(),
        REWARD_MINTER_ROLE,
        user2.address
      );
      await mockAdmin.revokeRole(
        await angel.getAddress(),
        REWARD_MINTER_ROLE,
        user2.address
      );

      await expect(
        angel
          .connect(user2)
          .rewardMint(user3.address, hre.ethers.parseEther("100"), "Test")
      ).to.be.reverted;
    });
  });

  describe("3. Hard Cap Enforcement", function () {
    it("Should allow minting up to MAX_SUPPLY", async function () {
      const maxSupply = await angel.MAX_SUPPLY();
      await angel
        .connect(user1)
        .rewardMint(user2.address, maxSupply, "Maximum mint");

      expect(await angel.totalMinted()).to.equal(maxSupply);
      expect(await angel.balanceOf(user2.address)).to.equal(maxSupply);
    });

    it("Should prevent minting beyond MAX_SUPPLY", async function () {
      const maxSupply = await angel.MAX_SUPPLY();
      await angel
        .connect(user1)
        .rewardMint(user2.address, maxSupply, "Full supply");

      await expect(
        angel.connect(user1).rewardMint(user3.address, 1, "Over limit")
      ).to.be.revertedWith("Minting would exceed max supply");
    });

    it("Should prevent minting exactly 1 wei over MAX_SUPPLY", async function () {
      const maxSupply = await angel.MAX_SUPPLY();
      const almostMax = maxSupply - 100n;
      await angel
        .connect(user1)
        .rewardMint(user2.address, almostMax, "Almost max");

      await expect(
        angel.connect(user1).rewardMint(user3.address, 101n, "Over by 1")
      ).to.be.revertedWith("Minting would exceed max supply");
    });

    it("Should track remaining mintable supply correctly", async function () {
      const maxSupply = await angel.MAX_SUPPLY();
      expect(await angel.remainingMintableSupply()).to.equal(maxSupply);

      const amount = hre.ethers.parseEther("1000000000"); // 1B
      await angel
        .connect(user1)
        .rewardMint(user2.address, amount, "Large mint");

      expect(await angel.remainingMintableSupply()).to.equal(
        maxSupply - amount
      );
    });

    it("Should NOT free mint capacity when burning", async function () {
      const maxSupply = await angel.MAX_SUPPLY();
      await angel
        .connect(user1)
        .rewardMint(user2.address, maxSupply, "Full mint");

      // Burn some tokens
      await angel.connect(user2).burn(hre.ethers.parseEther("1000000"));

      // totalMinted should still be maxSupply
      expect(await angel.totalMinted()).to.equal(maxSupply);

      // Should still not be able to mint
      await expect(
        angel.connect(user1).rewardMint(user3.address, 1, "Should fail")
      ).to.be.revertedWith("Minting would exceed max supply");
    });

    it("Should NOT allow cap to be increased (no setter exists)", async function () {
      const maxSupply1 = await angel.MAX_SUPPLY();
      const maxSupply2 = await angel.MAX_SUPPLY();
      expect(maxSupply1).to.equal(maxSupply2);
      expect(maxSupply1).to.equal(hre.ethers.parseEther("10000000000"));
    });

    it("Should return correct canMint status", async function () {
      expect(await angel.canMint(hre.ethers.parseEther("1000000"))).to.be.true;

      const maxSupply = await angel.MAX_SUPPLY();
      await angel
        .connect(user1)
        .rewardMint(user2.address, maxSupply, "Full mint");

      expect(await angel.canMint(1)).to.be.false;
      expect(await angel.canMint(0)).to.be.true; // Edge case
    });

    it("Should prevent batch mint if total exceeds cap", async function () {
      const maxSupply = await angel.MAX_SUPPLY();
      const halfSupply = maxSupply / 2n;

      await angel
        .connect(user1)
        .rewardMint(user2.address, halfSupply, "Half supply");

      const recipients = [user3.address, user4.address];
      const amounts = [halfSupply, hre.ethers.parseEther("100")];

      await expect(
        angel
          .connect(user1)
          .batchRewardMint(recipients, amounts, "Over cap batch")
      ).to.be.revertedWith("Minting would exceed max supply");
    });
  });

  describe("4. Reward Minting - Single Recipient", function () {
    it("Should allow REWARD_MINTER_ROLE to mint tokens with reason", async function () {
      const amount = hre.ethers.parseEther("1000");
      const reason = "Community engagement reward";

      await angel.connect(user1).rewardMint(user2.address, amount, reason);

      expect(await angel.balanceOf(user2.address)).to.equal(amount);
      expect(await angel.totalMinted()).to.equal(amount);
      expect(await angel.totalSupply()).to.equal(amount);
    });

    it("Should emit RewardMint event with correct parameters", async function () {
      const amount = hre.ethers.parseEther("500");
      const reason = "Bug bounty reward";

      await expect(
        angel.connect(user1).rewardMint(user2.address, amount, reason)
      )
        .to.emit(angel, "RewardMint")
        .withArgs(user2.address, amount, reason);
    });

    it("Should revert if reason is empty", async function () {
      const amount = hre.ethers.parseEther("100");

      await expect(
        angel.connect(user1).rewardMint(user2.address, amount, "")
      ).to.be.revertedWith("Reason cannot be empty");
    });

    it("Should revert if amount is zero", async function () {
      await expect(
        angel.connect(user1).rewardMint(user2.address, 0, "Test reward")
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should revert if recipient is zero address", async function () {
      await expect(
        angel
          .connect(user1)
          .rewardMint(
            hre.ethers.ZeroAddress,
            hre.ethers.parseEther("100"),
            "Test"
          )
      ).to.be.revertedWith("Cannot mint to zero address");
    });

    it("Should prevent unauthorized minting", async function () {
      const amount = hre.ethers.parseEther("1000");

      await expect(
        angel
          .connect(user2)
          .rewardMint(user3.address, amount, "Unauthorized mint")
      ).to.be.reverted;
    });

    it("Should prevent minting after role is revoked", async function () {
      await mockAdmin.revokeRole(
        await angel.getAddress(),
        REWARD_MINTER_ROLE,
        user1.address
      );

      await expect(
        angel
          .connect(user1)
          .rewardMint(user2.address, hre.ethers.parseEther("100"), "Test")
      ).to.be.reverted;
    });
  });

  describe("5. Batch Reward Minting", function () {
    it("Should mint tokens to multiple recipients", async function () {
      const recipients = [user2.address, user3.address, user4.address];
      const amounts = [
        hre.ethers.parseEther("100"),
        hre.ethers.parseEther("200"),
        hre.ethers.parseEther("300"),
      ];
      const reason = "Community contest winners";

      await angel.connect(user1).batchRewardMint(recipients, amounts, reason);

      expect(await angel.balanceOf(user2.address)).to.equal(amounts[0]);
      expect(await angel.balanceOf(user3.address)).to.equal(amounts[1]);
      expect(await angel.balanceOf(user4.address)).to.equal(amounts[2]);

      const totalMinted = amounts[0] + amounts[1] + amounts[2];
      expect(await angel.totalMinted()).to.equal(totalMinted);
    });

    it("Should emit RewardMint event for each recipient", async function () {
      const recipients = [user2.address, user3.address];
      const amounts = [
        hre.ethers.parseEther("50"),
        hre.ethers.parseEther("75"),
      ];
      const reason = "Batch reward test";

      const tx = await angel
        .connect(user1)
        .batchRewardMint(recipients, amounts, reason);

      await expect(tx)
        .to.emit(angel, "RewardMint")
        .withArgs(user2.address, amounts[0], reason);

      await expect(tx)
        .to.emit(angel, "RewardMint")
        .withArgs(user3.address, amounts[1], reason);
    });

    it("Should revert if arrays length mismatch", async function () {
      const recipients = [user2.address, user3.address];
      const amounts = [hre.ethers.parseEther("100")];

      await expect(
        angel
          .connect(user1)
          .batchRewardMint(recipients, amounts, "Mismatch test")
      ).to.be.revertedWith("Arrays length mismatch");
    });

    it("Should revert if arrays are empty", async function () {
      await expect(
        angel.connect(user1).batchRewardMint([], [], "Empty arrays")
      ).to.be.revertedWith("Empty arrays");
    });

    it("Should revert if reason is empty in batch mint", async function () {
      const recipients = [user2.address];
      const amounts = [hre.ethers.parseEther("100")];

      await expect(
        angel.connect(user1).batchRewardMint(recipients, amounts, "")
      ).to.be.revertedWith("Reason cannot be empty");
    });

    it("Should revert if any recipient is zero address", async function () {
      const recipients = [user2.address, hre.ethers.ZeroAddress];
      const amounts = [
        hre.ethers.parseEther("100"),
        hre.ethers.parseEther("100"),
      ];

      await expect(
        angel
          .connect(user1)
          .batchRewardMint(recipients, amounts, "Zero address test")
      ).to.be.revertedWith("Cannot mint to zero address");
    });

    it("Should revert if any amount is zero", async function () {
      const recipients = [user2.address, user3.address];
      const amounts = [hre.ethers.parseEther("100"), 0n];

      await expect(
        angel
          .connect(user1)
          .batchRewardMint(recipients, amounts, "Zero amount test")
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should handle large batch efficiently", async function () {
      const recipients = [];
      const amounts = [];

      for (let i = 0; i < 10; i++) {
        recipients.push(user2.address);
        amounts.push(hre.ethers.parseEther("10"));
      }

      await angel
        .connect(user1)
        .batchRewardMint(recipients, amounts, "Large batch test");

      expect(await angel.balanceOf(user2.address)).to.equal(
        hre.ethers.parseEther("100")
      );
      expect(await angel.totalMinted()).to.equal(hre.ethers.parseEther("100"));
    });

    it("Should prevent unauthorized batch minting", async function () {
      const recipients = [user3.address];
      const amounts = [hre.ethers.parseEther("100")];

      await expect(
        angel
          .connect(user2)
          .batchRewardMint(recipients, amounts, "Unauthorized")
      ).to.be.reverted;
    });
  });

  describe("6. Pause & Emergency Stop", function () {
    beforeEach(async function () {
      await angel
        .connect(user1)
        .rewardMint(user2.address, hre.ethers.parseEther("10000"), "Test mint");
    });

    it("Should allow PAUSER_ROLE to pause contract", async function () {
      await angel.connect(user1).pause();
      expect(await angel.paused()).to.be.true;
    });

    it("Should allow PAUSER_ROLE to unpause contract", async function () {
      await angel.connect(user1).pause();
      await angel.connect(user1).unpause();
      expect(await angel.paused()).to.be.false;
    });

    it("Should emit Paused event", async function () {
      await expect(angel.connect(user1).pause())
        .to.emit(angel, "Paused")
        .withArgs(user1.address);
    });

    it("Should emit Unpaused event", async function () {
      await angel.connect(user1).pause();

      await expect(angel.connect(user1).unpause())
        .to.emit(angel, "Unpaused")
        .withArgs(user1.address);
    });

    it("Should prevent transfers when paused", async function () {
      await angel.connect(user1).pause();

      await expect(
        angel
          .connect(user2)
          .transfer(user3.address, hre.ethers.parseEther("100"))
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should prevent rewardMint when paused", async function () {
      await angel.connect(user1).pause();

      await expect(
        angel
          .connect(user1)
          .rewardMint(user3.address, hre.ethers.parseEther("1000"), "Test")
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should prevent batchRewardMint when paused", async function () {
      await angel.connect(user1).pause();

      const recipients = [user3.address, user4.address];
      const amounts = [
        hre.ethers.parseEther("100"),
        hre.ethers.parseEther("200"),
      ];

      await expect(
        angel.connect(user1).batchRewardMint(recipients, amounts, "Paused test")
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should prevent burn when paused", async function () {
      await angel.connect(user1).pause();

      await expect(
        angel.connect(user2).burn(hre.ethers.parseEther("100"))
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should prevent burnFrom when paused", async function () {
      await angel
        .connect(user2)
        .approve(user3.address, hre.ethers.parseEther("100"));
      await angel.connect(user1).pause();

      await expect(
        angel
          .connect(user3)
          .burnFrom(user2.address, hre.ethers.parseEther("100"))
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should prevent non-pauser from pausing", async function () {
      await expect(angel.connect(user2).pause()).to.be.reverted;
    });

    it("Should prevent non-pauser from unpausing", async function () {
      await angel.connect(user1).pause();

      await expect(angel.connect(user2).unpause()).to.be.reverted;
    });

    it("Should allow transfers after unpausing", async function () {
      await angel.connect(user1).pause();
      await angel.connect(user1).unpause();

      await angel
        .connect(user2)
        .transfer(user3.address, hre.ethers.parseEther("100"));
      expect(await angel.balanceOf(user3.address)).to.equal(
        hre.ethers.parseEther("100")
      );
    });

    it("Should allow minting after unpausing", async function () {
      await angel.connect(user1).pause();
      await angel.connect(user1).unpause();

      await angel
        .connect(user1)
        .rewardMint(
          user3.address,
          hre.ethers.parseEther("1000"),
          "After unpause"
        );
      expect(await angel.balanceOf(user3.address)).to.equal(
        hre.ethers.parseEther("1000")
      );
    });

    it("Should prevent pausing after PAUSER_ROLE is revoked", async function () {
      await mockAdmin.revokeRole(
        await angel.getAddress(),
        PAUSER_ROLE,
        user1.address
      );

      await expect(angel.connect(user1).pause()).to.be.reverted;
    });
  });

  describe("7. Burn Logic", function () {
    beforeEach(async function () {
      await angel
        .connect(user1)
        .rewardMint(user2.address, hre.ethers.parseEther("10000"), "Test mint");
    });

    it("Should allow users to burn their own tokens", async function () {
      const burnAmount = hre.ethers.parseEther("1000");
      await angel.connect(user2).burn(burnAmount);

      expect(await angel.balanceOf(user2.address)).to.equal(
        hre.ethers.parseEther("9000")
      );
    });

    it("Should reduce totalSupply when burning", async function () {
      const initialSupply = await angel.totalSupply();
      const burnAmount = hre.ethers.parseEther("2000");

      await angel.connect(user2).burn(burnAmount);

      expect(await angel.totalSupply()).to.equal(initialSupply - burnAmount);
    });

    it("Should NOT reduce totalMinted when burning", async function () {
      const totalMintedBefore = await angel.totalMinted();
      const burnAmount = hre.ethers.parseEther("3000");

      await angel.connect(user2).burn(burnAmount);

      const totalMintedAfter = await angel.totalMinted();
      expect(totalMintedAfter).to.equal(totalMintedBefore);
    });

    it("Should emit Burn event", async function () {
      const burnAmount = hre.ethers.parseEther("1000");

      await expect(angel.connect(user2).burn(burnAmount))
        .to.emit(angel, "Burn")
        .withArgs(user2.address, burnAmount);
    });

    it("Should allow burnFrom with sufficient allowance", async function () {
      const burnAmount = hre.ethers.parseEther("500");
      await angel.connect(user2).approve(user3.address, burnAmount);
      await angel.connect(user3).burnFrom(user2.address, burnAmount);

      expect(await angel.balanceOf(user2.address)).to.equal(
        hre.ethers.parseEther("9500")
      );
    });

    it("Should emit BurnFrom event", async function () {
      const burnAmount = hre.ethers.parseEther("500");
      await angel.connect(user2).approve(user3.address, burnAmount);

      await expect(angel.connect(user3).burnFrom(user2.address, burnAmount))
        .to.emit(angel, "BurnFrom")
        .withArgs(user3.address, user2.address, burnAmount);
    });

    it("Should revert burnFrom without sufficient allowance", async function () {
      await expect(
        angel
          .connect(user3)
          .burnFrom(user2.address, hre.ethers.parseEther("500"))
      ).to.be.reverted;
    });

    it("Should NOT free up mint capacity when burning", async function () {
      const mintedBefore = await angel.totalMinted();
      const burnAmount = hre.ethers.parseEther("5000");

      await angel.connect(user2).burn(burnAmount);

      const remainingBefore = (await angel.MAX_SUPPLY()) - mintedBefore;
      const remainingAfter = await angel.remainingMintableSupply();

      expect(remainingAfter).to.equal(remainingBefore);
    });

    it("Should revert if burning more than balance", async function () {
      await expect(angel.connect(user2).burn(hre.ethers.parseEther("20000"))).to
        .be.reverted;
    });

    it("Should show difference between totalSupply and totalMinted after burn", async function () {
      const mintAmount = hre.ethers.parseEther("10000");
      const burnAmount = hre.ethers.parseEther("3000");

      await angel.connect(user2).burn(burnAmount);

      expect(await angel.totalMinted()).to.equal(mintAmount);
      expect(await angel.totalSupply()).to.equal(mintAmount - burnAmount);
    });
  });

  describe("8. Multisig Admin Security", function () {
    it("Should have admin role held by contract (multisig)", async function () {
      const adminAddress = await mockAdmin.getAddress();
      expect(await angel.hasRole(DEFAULT_ADMIN_ROLE, adminAddress)).to.be.true;

      // Verify it's a contract
      const code = await hre.ethers.provider.getCode(adminAddress);
      expect(code).to.not.equal("0x");
    });

    it("Should not allow EOA to be admin at deployment", async function () {
      const ANGEL = await hre.ethers.getContractFactory("ANGEL");
      await expect(ANGEL.deploy(user1.address)).to.be.revertedWith(
        "Admin must be multisig/contract"
      );
    });

    it("Should restrict critical functions to admin", async function () {
      // grantRole
      await expect(
        angel.connect(user2).grantRole(REWARD_MINTER_ROLE, user3.address)
      ).to.be.reverted;

      // revokeRole
      await expect(
        angel.connect(user2).revokeRole(REWARD_MINTER_ROLE, user1.address)
      ).to.be.reverted;
    });
  });

  describe("9. Standard ERC20 Functions", function () {
    beforeEach(async function () {
      await angel
        .connect(user1)
        .rewardMint(user2.address, hre.ethers.parseEther("10000"), "Setup");
    });

    it("Should allow standard transfers", async function () {
      await angel
        .connect(user2)
        .transfer(user3.address, hre.ethers.parseEther("500"));
      expect(await angel.balanceOf(user3.address)).to.equal(
        hre.ethers.parseEther("500")
      );
    });

    it("Should allow approve and transferFrom", async function () {
      await angel
        .connect(user2)
        .approve(user3.address, hre.ethers.parseEther("1000"));

      await angel
        .connect(user3)
        .transferFrom(
          user2.address,
          user4.address,
          hre.ethers.parseEther("300")
        );

      expect(await angel.balanceOf(user4.address)).to.equal(
        hre.ethers.parseEther("300")
      );
    });

    it("Should track allowances correctly", async function () {
      const allowanceAmount = hre.ethers.parseEther("2000");
      await angel.connect(user2).approve(user3.address, allowanceAmount);

      expect(await angel.allowance(user2.address, user3.address)).to.equal(
        allowanceAmount
      );
    });

    it("Should reduce allowance after transferFrom", async function () {
      const allowanceAmount = hre.ethers.parseEther("1000");
      await angel.connect(user2).approve(user3.address, allowanceAmount);

      await angel
        .connect(user3)
        .transferFrom(
          user2.address,
          user4.address,
          hre.ethers.parseEther("400")
        );

      expect(await angel.allowance(user2.address, user3.address)).to.equal(
        hre.ethers.parseEther("600")
      );
    });

    it("Should emit Transfer events", async function () {
      await expect(
        angel
          .connect(user2)
          .transfer(user3.address, hre.ethers.parseEther("100"))
      )
        .to.emit(angel, "Transfer")
        .withArgs(user2.address, user3.address, hre.ethers.parseEther("100"));
    });

    it("Should emit Approval events", async function () {
      await expect(
        angel
          .connect(user2)
          .approve(user3.address, hre.ethers.parseEther("100"))
      )
        .to.emit(angel, "Approval")
        .withArgs(user2.address, user3.address, hre.ethers.parseEther("100"));
    });

    it("Should revert transfer to zero address", async function () {
      await expect(
        angel
          .connect(user2)
          .transfer(hre.ethers.ZeroAddress, hre.ethers.parseEther("100"))
      ).to.be.reverted;
    });

    it("Should revert transferFrom to zero address", async function () {
      await angel
        .connect(user2)
        .approve(user3.address, hre.ethers.parseEther("1000"));

      await expect(
        angel
          .connect(user3)
          .transferFrom(
            user2.address,
            hre.ethers.ZeroAddress,
            hre.ethers.parseEther("100")
          )
      ).to.be.reverted;
    });
  });

  describe("10. View Functions", function () {
    it("Should return correct canMint status for various amounts", async function () {
      const amount = hre.ethers.parseEther("1000000");
      expect(await angel.canMint(amount)).to.be.true;

      const maxSupply = await angel.MAX_SUPPLY();
      await angel
        .connect(user1)
        .rewardMint(user2.address, maxSupply, "Max mint");

      expect(await angel.canMint(1)).to.be.false;
    });

    it("Should return correct remaining mintable supply", async function () {
      const maxSupply = await angel.MAX_SUPPLY();
      expect(await angel.remainingMintableSupply()).to.equal(maxSupply);

      const mintAmount = hre.ethers.parseEther("1000000000"); // 1B
      await angel
        .connect(user1)
        .rewardMint(user2.address, mintAmount, "Large mint");

      expect(await angel.remainingMintableSupply()).to.equal(
        maxSupply - mintAmount
      );
    });

    it("Should show totalMinted never decreases after burn", async function () {
      const mintAmount = hre.ethers.parseEther("10000");
      await angel
        .connect(user1)
        .rewardMint(user2.address, mintAmount, "Test mint");

      const totalMintedBefore = await angel.totalMinted();

      await angel.connect(user2).burn(hre.ethers.parseEther("5000"));

      expect(await angel.totalMinted()).to.equal(totalMintedBefore);
    });
  });

  describe("11. Edge Cases", function () {
    it("Should handle multiple mints to same address", async function () {
      await angel
        .connect(user1)
        .rewardMint(user2.address, hre.ethers.parseEther("100"), "First");
      await angel
        .connect(user1)
        .rewardMint(user2.address, hre.ethers.parseEther("200"), "Second");
      await angel
        .connect(user1)
        .rewardMint(user2.address, hre.ethers.parseEther("300"), "Third");

      expect(await angel.balanceOf(user2.address)).to.equal(
        hre.ethers.parseEther("600")
      );
      expect(await angel.totalMinted()).to.equal(hre.ethers.parseEther("600"));
    });

    it("Should handle very small amounts (1 wei)", async function () {
      await angel.connect(user1).rewardMint(user2.address, 1, "Tiny amount");
      expect(await angel.balanceOf(user2.address)).to.equal(1);
    });

    it("Should handle long reason strings", async function () {
      const longReason = "A".repeat(1000);
      await angel
        .connect(user1)
        .rewardMint(user2.address, hre.ethers.parseEther("100"), longReason);
      expect(await angel.balanceOf(user2.address)).to.equal(
        hre.ethers.parseEther("100")
      );
    });

    it("Should handle transfer of 1 wei", async function () {
      await angel
        .connect(user1)
        .rewardMint(user2.address, hre.ethers.parseEther("1000"), "Setup");

      await angel.connect(user2).transfer(user3.address, 1n);

      expect(await angel.balanceOf(user3.address)).to.equal(1n);
    });

    it("Should handle exact MAX_SUPPLY mint", async function () {
      const maxSupply = await angel.MAX_SUPPLY();
      await angel
        .connect(user1)
        .rewardMint(user2.address, maxSupply, "Exact max");

      expect(await angel.totalMinted()).to.equal(maxSupply);
      expect(await angel.remainingMintableSupply()).to.equal(0);
      expect(await angel.canMint(1)).to.be.false;
    });

    it("Should handle transfer to self", async function () {
      await angel
        .connect(user1)
        .rewardMint(user2.address, hre.ethers.parseEther("1000"), "Setup");

      const initialBalance = await angel.balanceOf(user2.address);
      await angel
        .connect(user2)
        .transfer(user2.address, hre.ethers.parseEther("100"));

      // Balance should remain the same (no fees in ANGEL)
      expect(await angel.balanceOf(user2.address)).to.equal(initialBalance);
    });

    it("Should handle multiple burns", async function () {
      await angel
        .connect(user1)
        .rewardMint(user2.address, hre.ethers.parseEther("10000"), "Setup");

      await angel.connect(user2).burn(hre.ethers.parseEther("1000"));
      await angel.connect(user2).burn(hre.ethers.parseEther("2000"));
      await angel.connect(user2).burn(hre.ethers.parseEther("3000"));

      expect(await angel.balanceOf(user2.address)).to.equal(
        hre.ethers.parseEther("4000")
      );
      expect(await angel.totalSupply()).to.equal(hre.ethers.parseEther("4000"));
      expect(await angel.totalMinted()).to.equal(
        hre.ethers.parseEther("10000")
      ); // Unchanged
    });
  });
});
