const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("SEED Token", function () {
  async function deployTokenFixture() {
    const [adminSigner, rewardMinter, user1, user2, user3] =
      await ethers.getSigners();

    // Deploy MockMultisig to act as admin (satisfies contract requirement)
    const MockMultisig = await ethers.getContractFactory("MockMultisig");
    const multisig = await MockMultisig.deploy(adminSigner.address);

    const SEED = await ethers.getContractFactory("SEED");
    const seed = await SEED.deploy(multisig.target);

    // Get role identifiers
    const DEFAULT_ADMIN_ROLE = await seed.DEFAULT_ADMIN_ROLE();
    const REWARD_MINTER_ROLE = await seed.REWARD_MINTER_ROLE();

    // Helper function to execute SEED functions through the multisig
    const executeAsAdmin = async (functionName, ...args) => {
      const data = seed.interface.encodeFunctionData(functionName, args);
      return multisig.connect(adminSigner).execute(seed.target, data);
    };

    // Create wrapper for seed.connect(admin) pattern
    // When tests call seed.connect(admin).function(), it will execute through multisig
    const originalConnect = seed.connect.bind(seed);
    seed.connect = (signer) => {
      // If connecting as admin (multisig), return wrapped contract
      if (signer && signer.address === multisig.target) {
        return {
          rewardMint: (to, amount) => executeAsAdmin("rewardMint", to, amount),
          grantRoles: (user, roles) =>
            executeAsAdmin("grantRoles", user, roles),
          revokeRoles: (user, roles) =>
            executeAsAdmin("revokeRoles", user, roles),
          pause: () => executeAsAdmin("pause"),
          unpause: () => executeAsAdmin("unpause"),
        };
      }
      // Otherwise use original connect
      return originalConnect(signer);
    };

    // Create admin object with address property
    const admin = {
      address: multisig.target,
    };

    return {
      seed,
      admin,
      adminSigner,
      executeAsAdmin,
      rewardMinter,
      user1,
      user2,
      user3,
      DEFAULT_ADMIN_ROLE,
      REWARD_MINTER_ROLE,
    };
  }

  describe("1. Deployment & Initial State", function () {
    it("Should have correct name, symbol, and decimals", async function () {
      const { seed } = await loadFixture(deployTokenFixture);

      expect(await seed.name()).to.equal("SEED");
      expect(await seed.symbol()).to.equal("SEED");
      expect(await seed.decimals()).to.equal(18);
    });

    it("Should start with totalSupply = 0", async function () {
      const { seed } = await loadFixture(deployTokenFixture);

      expect(await seed.totalSupply()).to.equal(0);
    });

    it("Should have MAX_SUPPLY enforced", async function () {
      const { seed } = await loadFixture(deployTokenFixture);

      const maxSupply = await seed.getMaxSupply();
      expect(maxSupply).to.equal(ethers.parseUnits("10000000000", 18)); // 10 billion
    });

    it("Should start unpaused", async function () {
      const { seed } = await loadFixture(deployTokenFixture);

      expect(await seed.paused()).to.equal(false);
    });

    it("Should enforce admin is a contract (multisig)", async function () {
      const { seed } = await loadFixture(deployTokenFixture);

      // Verify the owner is a contract (multisig)
      expect(await seed.isOwnerMultisig()).to.equal(true);
    });

    it("Should revert if admin is an EOA during deployment", async function () {
      const [eoaAdmin] = await ethers.getSigners();

      const SEED = await ethers.getContractFactory("SEED");

      // Should revert because eoaAdmin is not a contract
      await expect(SEED.deploy(eoaAdmin.address)).to.be.revertedWithCustomError(
        SEED,
        "AdminMustBeContract"
      );
    });
  });

  describe("2. Access Control", function () {
    it("Should assign DEFAULT_ADMIN_ROLE to admin (multisig)", async function () {
      const { seed, admin, DEFAULT_ADMIN_ROLE } = await loadFixture(
        deployTokenFixture
      );

      expect(await seed.owner()).to.equal(admin.address);
    });

    it("Should assign REWARD_MINTER_ROLE to admin", async function () {
      const { seed, admin, REWARD_MINTER_ROLE } = await loadFixture(
        deployTokenFixture
      );

      expect(await seed.hasRole(REWARD_MINTER_ROLE, admin.address)).to.equal(
        true
      );
    });

    it("Should prevent unauthorized users from minting", async function () {
      const { seed, user1 } = await loadFixture(deployTokenFixture);

      const amount = ethers.parseUnits("1000", 18);

      await expect(
        seed.connect(user1).rewardMint(user1.address, amount)
      ).to.be.revertedWithCustomError(seed, "Unauthorized");
    });

    it("Should allow admin to grant and revoke roles", async function () {
      const { seed, admin, user1, REWARD_MINTER_ROLE, executeAsAdmin } =
        await loadFixture(deployTokenFixture);

      await executeAsAdmin("grantRoles", user1.address, REWARD_MINTER_ROLE);
      expect(await seed.hasRole(REWARD_MINTER_ROLE, user1.address)).to.equal(
        true
      );

      await executeAsAdmin("revokeRoles", user1.address, REWARD_MINTER_ROLE);
      expect(await seed.hasRole(REWARD_MINTER_ROLE, user1.address)).to.equal(
        false
      );
    });
  });

  describe("3. Hard Cap Enforcement", function () {
    it("Should allow minting up to cap", async function () {
      const { seed, admin, user1 } = await loadFixture(deployTokenFixture);

      const maxSupply = await seed.getMaxSupply();
      await seed.connect(admin).rewardMint(user1.address, maxSupply);

      expect(await seed.totalSupply()).to.equal(maxSupply);
      expect(await seed.getTotalMinted()).to.equal(maxSupply);
    });

    it("Should revert when minting above cap", async function () {
      const { seed, admin, user1 } = await loadFixture(deployTokenFixture);

      const maxSupply = await seed.getMaxSupply();
      const overAmount = maxSupply + 1n;

      await expect(
        seed.connect(admin).rewardMint(user1.address, overAmount)
      ).to.be.revertedWithCustomError(seed, "MaxSupplyExceeded");
    });

    it("Should confirm burn does not free mint capacity", async function () {
      const { seed, admin, user1 } = await loadFixture(deployTokenFixture);

      const maxSupply = await seed.getMaxSupply();

      // Mint to cap
      await seed.connect(admin).rewardMint(user1.address, maxSupply);

      // User burns 1000 tokens
      const burnAmount = ethers.parseUnits("1000", 18);
      await seed.connect(user1).burn(burnAmount);

      // Try to mint 1 more token (should fail because totalMinted = cap)
      await expect(
        seed.connect(admin).rewardMint(user1.address, 1n)
      ).to.be.revertedWithCustomError(seed, "MaxSupplyExceeded");

      // Verify totalMinted hasn't changed despite burn
      expect(await seed.getTotalMinted()).to.equal(maxSupply);
    });
  });

  describe("4. Reward Minting", function () {
    it("Should allow reward mint within cap", async function () {
      const { seed, admin, user1 } = await loadFixture(deployTokenFixture);

      const amount = ethers.parseUnits("1000", 18);
      await seed.connect(admin).rewardMint(user1.address, amount);

      expect(await seed.balanceOf(user1.address)).to.equal(amount);
      expect(await seed.totalSupply()).to.equal(amount);
    });

    it("Should allow granted reward minter to mint", async function () {
      const {
        seed,
        admin,
        rewardMinter,
        user1,
        REWARD_MINTER_ROLE,
        executeAsAdmin,
      } = await loadFixture(deployTokenFixture);

      // Grant reward minter role
      await executeAsAdmin(
        "grantRoles",
        rewardMinter.address,
        REWARD_MINTER_ROLE
      );

      const amount = ethers.parseUnits("1000", 18);
      await seed.connect(rewardMinter).rewardMint(user1.address, amount);

      expect(await seed.balanceOf(user1.address)).to.equal(amount);
    });

    it("Should revert when minting to zero address", async function () {
      const { seed, admin } = await loadFixture(deployTokenFixture);

      const amount = ethers.parseUnits("1000", 18);

      await expect(
        seed.connect(admin).rewardMint(ethers.ZeroAddress, amount)
      ).to.be.revertedWithCustomError(seed, "ZeroAddress");
    });

    it("Should revert when minting zero amount", async function () {
      const { seed, admin, user1 } = await loadFixture(deployTokenFixture);

      await expect(
        seed.connect(admin).rewardMint(user1.address, 0)
      ).to.be.revertedWithCustomError(seed, "InvalidAmount");
    });
  });

  describe("5. Pause & Emergency Stop", function () {
    it("Should allow admin to pause and unpause", async function () {
      const { seed, admin } = await loadFixture(deployTokenFixture);

      await seed.connect(admin).pause();
      expect(await seed.paused()).to.equal(true);

      await seed.connect(admin).unpause();
      expect(await seed.paused()).to.equal(false);
    });

    it("Should block transfers when paused", async function () {
      const { seed, admin, user1, user2 } = await loadFixture(
        deployTokenFixture
      );

      const amount = ethers.parseUnits("1000", 18);
      await seed.connect(admin).rewardMint(user1.address, amount);

      await seed.connect(admin).pause();

      await expect(
        seed.connect(user1).transfer(user2.address, amount)
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should block minting when paused", async function () {
      const { seed, admin, user1 } = await loadFixture(deployTokenFixture);

      await seed.connect(admin).pause();

      const amount = ethers.parseUnits("1000", 18);
      await expect(
        seed.connect(admin).rewardMint(user1.address, amount)
      ).to.be.revertedWith("Pausable: paused");
    });
  });

  describe("6. Burn Logic", function () {
    it("Should allow user to burn own tokens", async function () {
      const { seed, admin, user1 } = await loadFixture(deployTokenFixture);

      const mintAmount = ethers.parseUnits("1000", 18);
      await seed.connect(admin).rewardMint(user1.address, mintAmount);

      const burnAmount = ethers.parseUnits("100", 18);
      await seed.connect(user1).burn(burnAmount);

      expect(await seed.balanceOf(user1.address)).to.equal(
        mintAmount - burnAmount
      );
      expect(await seed.totalSupply()).to.equal(mintAmount - burnAmount);
    });

    it("Should respect allowance in burnFrom", async function () {
      const { seed, admin, user1, user2 } = await loadFixture(
        deployTokenFixture
      );

      const mintAmount = ethers.parseUnits("1000", 18);
      await seed.connect(admin).rewardMint(user1.address, mintAmount);

      const burnAmount = ethers.parseUnits("100", 18);
      await seed.connect(user1).approve(user2.address, burnAmount);
      await seed.connect(user2).burnFrom(user1.address, burnAmount);

      expect(await seed.balanceOf(user1.address)).to.equal(
        mintAmount - burnAmount
      );
    });

    it("Should reduce totalSupply when burning", async function () {
      const { seed, admin, user1 } = await loadFixture(deployTokenFixture);

      const mintAmount = ethers.parseUnits("1000", 18);
      await seed.connect(admin).rewardMint(user1.address, mintAmount);

      const burnAmount = ethers.parseUnits("500", 18);
      await seed.connect(user1).burn(burnAmount);

      expect(await seed.totalSupply()).to.equal(mintAmount - burnAmount);
    });

    it("Should not reduce totalMinted when burning", async function () {
      const { seed, admin, user1 } = await loadFixture(deployTokenFixture);

      const mintAmount = ethers.parseUnits("1000", 18);
      await seed.connect(admin).rewardMint(user1.address, mintAmount);

      const burnAmount = ethers.parseUnits("500", 18);
      await seed.connect(user1).burn(burnAmount);

      expect(await seed.getTotalMinted()).to.equal(mintAmount);
    });
  });

  describe("7. Ownership Security", function () {
    it("Should prevent transferring ownership to an EOA", async function () {
      const { seed, admin, user1, adminSigner } = await loadFixture(
        deployTokenFixture
      );

      // Try to transfer ownership to an EOA (should revert)
      const data = seed.interface.encodeFunctionData("transferOwnership", [
        user1.address,
      ]);
      const MockMultisig = await ethers.getContractFactory("MockMultisig");
      const multisig = MockMultisig.attach(admin.address);

      await expect(
        multisig.connect(adminSigner).execute(seed.target, data)
      ).to.be.revertedWithCustomError(seed, "AdminMustBeContract");
    });

    it("Should allow transferring ownership to another multisig", async function () {
      const { seed, admin, adminSigner } = await loadFixture(
        deployTokenFixture
      );

      // Deploy a new multisig
      const MockMultisig = await ethers.getContractFactory("MockMultisig");
      const newMultisig = await MockMultisig.deploy(adminSigner.address);

      // Transfer ownership to the new multisig
      const data = seed.interface.encodeFunctionData("transferOwnership", [
        newMultisig.target,
      ]);
      const currentMultisig = MockMultisig.attach(admin.address);

      await currentMultisig.connect(adminSigner).execute(seed.target, data);

      // Verify ownership changed
      expect(await seed.owner()).to.equal(newMultisig.target);
      expect(await seed.isOwnerMultisig()).to.equal(true);
    });

    it("Should prevent completing ownership handover to an EOA", async function () {
      const { seed, admin, user1, adminSigner } = await loadFixture(
        deployTokenFixture
      );

      // User1 requests ownership handover
      await seed.connect(user1).requestOwnershipHandover();

      // Admin tries to complete handover (should revert because user1 is EOA)
      const data = seed.interface.encodeFunctionData(
        "completeOwnershipHandover",
        [user1.address]
      );
      const MockMultisig = await ethers.getContractFactory("MockMultisig");
      const multisig = MockMultisig.attach(admin.address);

      await expect(
        multisig.connect(adminSigner).execute(seed.target, data)
      ).to.be.revertedWithCustomError(seed, "AdminMustBeContract");
    });

    it("Should prevent renouncing ownership", async function () {
      const { seed, admin, adminSigner } = await loadFixture(
        deployTokenFixture
      );

      const data = seed.interface.encodeFunctionData("renounceOwnership", []);
      const MockMultisig = await ethers.getContractFactory("MockMultisig");
      const multisig = MockMultisig.attach(admin.address);

      await expect(
        multisig.connect(adminSigner).execute(seed.target, data)
      ).to.be.revertedWith("Ownership cannot be renounced");
    });
  });

  describe("8. Event Logging", function () {
    it("Should emit RewardMint events", async function () {
      const { seed, admin, user1, REWARD_MINTER_ROLE } = await loadFixture(
        deployTokenFixture
      );

      const amount = ethers.parseUnits("1000", 18);

      await expect(seed.connect(admin).rewardMint(user1.address, amount))
        .to.emit(seed, "RewardMint")
        .withArgs(user1.address, amount, REWARD_MINTER_ROLE);
    });

    it("Should emit RoleGranted/RoleRevoked events", async function () {
      const { seed, admin, user1, REWARD_MINTER_ROLE } = await loadFixture(
        deployTokenFixture
      );

      await expect(
        seed.connect(admin).grantRoles(user1.address, REWARD_MINTER_ROLE)
      )
        .to.emit(seed, "RoleGranted")
        .withArgs(REWARD_MINTER_ROLE, user1.address, admin.address);

      await expect(
        seed.connect(admin).revokeRoles(user1.address, REWARD_MINTER_ROLE)
      )
        .to.emit(seed, "RoleRevoked")
        .withArgs(REWARD_MINTER_ROLE, user1.address, admin.address);
    });

    it("Should emit Paused/Unpaused events", async function () {
      const { seed, admin } = await loadFixture(deployTokenFixture);

      await expect(seed.connect(admin).pause())
        .to.emit(seed, "Paused")
        .withArgs(admin.address);

      await expect(seed.connect(admin).unpause())
        .to.emit(seed, "Unpaused")
        .withArgs(admin.address);
    });
  });
});
