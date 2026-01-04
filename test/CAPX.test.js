const { expect } = require("chai");
const hre = require("hardhat");

describe("CAPX Token - Shield Token", function () {
  let capx;
  let mockAdmin;
  let treasury, dao, user1, user2, user3, user4;
  let DEFAULT_ADMIN_ROLE,
    TEAM_MINTER_ROLE,
    TREASURY_MINTER_ROLE,
    DAO_MINTER_ROLE,
    PAUSER_ROLE;

  // Helper to deploy a mock admin contract (satisfies code.length > 0)
  async function deployMockAdmin() {
    const MockAdmin = await hre.ethers.getContractFactory("MockAdmin");
    return await MockAdmin.deploy();
  }

  // Deploy MockAdmin contract before tests
  before(async function () {
    // Deploy a simple mock admin contract
    const MockAdminFactory = await hre.ethers.getContractFactory(
      "MockAdmin",
      (
        await hre.ethers.getSigners()
      )[0]
    );
    mockAdmin = await MockAdminFactory.deploy();
  });

  beforeEach(async function () {
    [, treasury, dao, user1, user2, user3, user4] =
      await hre.ethers.getSigners();

    const CAPX = await hre.ethers.getContractFactory("CAPX");
    capx = await CAPX.deploy(
      treasury.address,
      dao.address,
      await mockAdmin.getAddress()
    );

    DEFAULT_ADMIN_ROLE = await capx.DEFAULT_ADMIN_ROLE();
    TEAM_MINTER_ROLE = await capx.TEAM_MINTER_ROLE();
    TREASURY_MINTER_ROLE = await capx.TREASURY_MINTER_ROLE();
    DAO_MINTER_ROLE = await capx.DAO_MINTER_ROLE();
    PAUSER_ROLE = await capx.PAUSER_ROLE();

    // Grant roles to user1 for testing (via mockAdmin)
    await mockAdmin.grantRole(
      await capx.getAddress(),
      TEAM_MINTER_ROLE,
      user1.address
    );
    await mockAdmin.grantRole(
      await capx.getAddress(),
      TREASURY_MINTER_ROLE,
      user1.address
    );
    await mockAdmin.grantRole(
      await capx.getAddress(),
      DAO_MINTER_ROLE,
      user1.address
    );
    await mockAdmin.grantRole(
      await capx.getAddress(),
      PAUSER_ROLE,
      user1.address
    );
  });

  describe("1. Deployment & Initial State", function () {
    it("Should have correct name, symbol, and decimals", async function () {
      expect(await capx.name()).to.equal("CAPShield Token");
      expect(await capx.symbol()).to.equal("CAPY");
      expect(await capx.decimals()).to.equal(18);
    });

    it("Should start with zero totalSupply", async function () {
      expect(await capx.totalSupply()).to.equal(0);
    });

    it("Should start with zero totalMinted", async function () {
      expect(await capx.totalMinted()).to.equal(0);
    });

    it("Should have correct MAX_SUPPLY (100 Million)", async function () {
      const maxSupply = await capx.MAX_SUPPLY();
      expect(maxSupply).to.equal(hre.ethers.parseEther("100000000"));
    });

    it("Should set treasury address correctly", async function () {
      expect(await capx.treasuryAddress()).to.equal(treasury.address);
    });

    it("Should set DAO address correctly", async function () {
      expect(await capx.daoAddress()).to.equal(dao.address);
    });

    it("Should set treasury as fee exempt", async function () {
      expect(await capx.isExemptFromFees(treasury.address)).to.be.true;
    });

    it("Should set DAO as fee exempt", async function () {
      expect(await capx.isExemptFromFees(dao.address)).to.be.true;
    });

    it("Should start unpaused", async function () {
      expect(await capx.paused()).to.be.false;
    });

    it("Should have correct fee percentages", async function () {
      expect(await capx.BURN_FEE_PERCENT()).to.equal(1);
      expect(await capx.TREASURY_FEE_PERCENT()).to.equal(1);
    });

    describe("Constructor Validation", function () {
      it("Should revert if treasury address is zero", async function () {
        const CAPX = await hre.ethers.getContractFactory("CAPX");
        await expect(
          CAPX.deploy(
            hre.ethers.ZeroAddress,
            dao.address,
            await mockAdmin.getAddress()
          )
        ).to.be.revertedWith("Treasury address cannot be zero");
      });

      it("Should revert if DAO address is zero", async function () {
        const CAPX = await hre.ethers.getContractFactory("CAPX");
        await expect(
          CAPX.deploy(
            treasury.address,
            hre.ethers.ZeroAddress,
            await mockAdmin.getAddress()
          )
        ).to.be.revertedWith("DAO address cannot be zero");
      });

      it("Should revert if admin address is zero", async function () {
        const CAPX = await hre.ethers.getContractFactory("CAPX");
        await expect(
          CAPX.deploy(treasury.address, dao.address, hre.ethers.ZeroAddress)
        ).to.be.revertedWith("Admin address cannot be zero");
      });

      it("Should revert if admin is not a contract (EOA)", async function () {
        const CAPX = await hre.ethers.getContractFactory("CAPX");
        await expect(
          CAPX.deploy(treasury.address, dao.address, user1.address)
        ).to.be.revertedWith("Admin must be multisig/contract");
      });

      it("Should emit ExemptionUpdated events for treasury and DAO", async function () {
        const CAPX = await hre.ethers.getContractFactory("CAPX");
        const newCapx = await CAPX.deploy(
          treasury.address,
          dao.address,
          await mockAdmin.getAddress()
        );

        // Check events by querying past events
        const filter = newCapx.filters.ExemptionUpdated();
        const events = await newCapx.queryFilter(filter);

        expect(events.length).to.equal(2);
        expect(events[0].args.account).to.equal(treasury.address);
        expect(events[0].args.isExempt).to.be.true;
        expect(events[1].args.account).to.equal(dao.address);
        expect(events[1].args.isExempt).to.be.true;
      });
    });
  });

  describe("2. Access Control", function () {
    it("Should assign DEFAULT_ADMIN_ROLE to multisig admin", async function () {
      expect(
        await capx.hasRole(DEFAULT_ADMIN_ROLE, await mockAdmin.getAddress())
      ).to.be.true;
    });

    it("Should assign TEAM_MINTER_ROLE to admin", async function () {
      expect(await capx.hasRole(TEAM_MINTER_ROLE, await mockAdmin.getAddress()))
        .to.be.true;
    });

    it("Should assign TREASURY_MINTER_ROLE to admin", async function () {
      expect(
        await capx.hasRole(TREASURY_MINTER_ROLE, await mockAdmin.getAddress())
      ).to.be.true;
    });

    it("Should assign DAO_MINTER_ROLE to admin", async function () {
      expect(await capx.hasRole(DAO_MINTER_ROLE, await mockAdmin.getAddress()))
        .to.be.true;
    });

    it("Should assign PAUSER_ROLE to admin", async function () {
      expect(await capx.hasRole(PAUSER_ROLE, await mockAdmin.getAddress())).to
        .be.true;
    });

    it("Should not assign roles to non-admin addresses initially", async function () {
      expect(await capx.hasRole(TEAM_MINTER_ROLE, user2.address)).to.be.false;
      expect(await capx.hasRole(TREASURY_MINTER_ROLE, user2.address)).to.be
        .false;
      expect(await capx.hasRole(DAO_MINTER_ROLE, user2.address)).to.be.false;
      expect(await capx.hasRole(PAUSER_ROLE, user2.address)).to.be.false;
    });

    it("Should allow admin to grant roles", async function () {
      await mockAdmin.grantRole(
        await capx.getAddress(),
        TEAM_MINTER_ROLE,
        user2.address
      );
      expect(await capx.hasRole(TEAM_MINTER_ROLE, user2.address)).to.be.true;
    });

    it("Should allow admin to revoke roles", async function () {
      await mockAdmin.grantRole(
        await capx.getAddress(),
        TEAM_MINTER_ROLE,
        user2.address
      );
      await mockAdmin.revokeRole(
        await capx.getAddress(),
        TEAM_MINTER_ROLE,
        user2.address
      );
      expect(await capx.hasRole(TEAM_MINTER_ROLE, user2.address)).to.be.false;
    });

    it("Should prevent non-admin from granting roles", async function () {
      await expect(
        capx.connect(user2).grantRole(TEAM_MINTER_ROLE, user3.address)
      ).to.be.reverted;
    });

    it("Should prevent non-admin from revoking roles", async function () {
      await expect(
        capx.connect(user2).revokeRole(TEAM_MINTER_ROLE, user1.address)
      ).to.be.reverted;
    });

    it("Should emit RoleGranted event when granting roles", async function () {
      await expect(
        mockAdmin.grantRole(
          await capx.getAddress(),
          TEAM_MINTER_ROLE,
          user2.address
        )
      )
        .to.emit(capx, "RoleGranted")
        .withArgs(
          TEAM_MINTER_ROLE,
          user2.address,
          await mockAdmin.getAddress()
        );
    });

    it("Should emit RoleRevoked event when revoking roles", async function () {
      await mockAdmin.grantRole(
        await capx.getAddress(),
        TEAM_MINTER_ROLE,
        user2.address
      );

      await expect(
        mockAdmin.revokeRole(
          await capx.getAddress(),
          TEAM_MINTER_ROLE,
          user2.address
        )
      )
        .to.emit(capx, "RoleRevoked")
        .withArgs(
          TEAM_MINTER_ROLE,
          user2.address,
          await mockAdmin.getAddress()
        );
    });
  });

  describe("3. Hard Cap Enforcement", function () {
    it("Should allow minting up to MAX_SUPPLY", async function () {
      const maxSupply = await capx.MAX_SUPPLY();
      await capx.connect(user1).teamMint(user2.address, maxSupply);

      expect(await capx.totalMinted()).to.equal(maxSupply);
      expect(await capx.balanceOf(user2.address)).to.equal(maxSupply);
    });

    it("Should prevent minting beyond MAX_SUPPLY", async function () {
      const maxSupply = await capx.MAX_SUPPLY();
      await capx.connect(user1).teamMint(user2.address, maxSupply);

      await expect(
        capx.connect(user1).teamMint(user3.address, 1)
      ).to.be.revertedWith("Minting would exceed max supply");
    });

    it("Should prevent minting exactly 1 wei over MAX_SUPPLY", async function () {
      const maxSupply = await capx.MAX_SUPPLY();
      const almostMax = maxSupply - 100n;
      await capx.connect(user1).teamMint(user2.address, almostMax);

      await expect(
        capx.connect(user1).teamMint(user3.address, 101n)
      ).to.be.revertedWith("Minting would exceed max supply");
    });

    it("Should prevent revenue mint from exceeding cap", async function () {
      const maxSupply = await capx.MAX_SUPPLY();
      // Mint almost all
      await capx
        .connect(user1)
        .teamMint(user2.address, maxSupply - hre.ethers.parseEther("100"));

      // Try to revenue mint more than remaining
      const revenue = hre.ethers.parseEther("200"); // Would mint 200 tokens
      const marketValue = hre.ethers.parseEther("1");

      await expect(
        capx.connect(user1).revenueMint(user3.address, revenue, marketValue)
      ).to.be.revertedWith("Minting would exceed max supply");
    });

    it("Should NOT free mint capacity when burning", async function () {
      const maxSupply = await capx.MAX_SUPPLY();
      await capx.connect(user1).teamMint(user2.address, maxSupply);

      // Burn some tokens
      await capx.connect(user2).burn(hre.ethers.parseEther("1000000"));

      // totalMinted should still be maxSupply
      expect(await capx.totalMinted()).to.equal(maxSupply);

      // Should still not be able to mint
      await expect(
        capx.connect(user1).teamMint(user3.address, 1)
      ).to.be.revertedWith("Minting would exceed max supply");
    });

    it("Should NOT allow cap to be increased (no setter exists)", async function () {
      // Verify MAX_SUPPLY is a constant by checking it's immutable
      const maxSupply1 = await capx.MAX_SUPPLY();
      const maxSupply2 = await capx.MAX_SUPPLY();
      expect(maxSupply1).to.equal(maxSupply2);
      expect(maxSupply1).to.equal(hre.ethers.parseEther("100000000"));
    });

    it("Should track remaining mintable supply correctly", async function () {
      const maxSupply = await capx.MAX_SUPPLY();
      expect(await capx.remainingMintableSupply()).to.equal(maxSupply);

      const mintAmount = hre.ethers.parseEther("10000000");
      await capx.connect(user1).teamMint(user2.address, mintAmount);

      expect(await capx.remainingMintableSupply()).to.equal(
        maxSupply - mintAmount
      );
    });

    it("Should return correct canMint status", async function () {
      expect(await capx.canMint(hre.ethers.parseEther("1000000"))).to.be.true;

      const maxSupply = await capx.MAX_SUPPLY();
      await capx.connect(user1).teamMint(user2.address, maxSupply);

      expect(await capx.canMint(1)).to.be.false;
      expect(await capx.canMint(0)).to.be.true; // Edge case: 0 amount
    });
  });

  describe("4. Role-Based Minting", function () {
    describe("Team Minting", function () {
      it("Should allow TEAM_MINTER_ROLE to mint tokens", async function () {
        const amount = hre.ethers.parseEther("1000");
        await capx.connect(user1).teamMint(user2.address, amount);

        expect(await capx.balanceOf(user2.address)).to.equal(amount);
        expect(await capx.totalMinted()).to.equal(amount);
      });

      it("Should emit TeamMint event", async function () {
        const amount = hre.ethers.parseEther("1000");

        await expect(capx.connect(user1).teamMint(user2.address, amount))
          .to.emit(capx, "TeamMint")
          .withArgs(user1.address, user2.address, amount);
      });

      it("Should revert if caller lacks TEAM_MINTER_ROLE", async function () {
        await expect(
          capx
            .connect(user2)
            .teamMint(user3.address, hre.ethers.parseEther("1000"))
        ).to.be.reverted;
      });

      it("Should revert if recipient is zero address", async function () {
        await expect(
          capx
            .connect(user1)
            .teamMint(hre.ethers.ZeroAddress, hre.ethers.parseEther("1000"))
        ).to.be.revertedWith("Cannot mint to zero address");
      });

      it("Should revert if amount is zero", async function () {
        await expect(
          capx.connect(user1).teamMint(user2.address, 0)
        ).to.be.revertedWith("Amount must be greater than 0");
      });
    });

    describe("Treasury Minting", function () {
      it("Should allow TREASURY_MINTER_ROLE to mint tokens", async function () {
        const amount = hre.ethers.parseEther("5000");
        await capx.connect(user1).treasuryMint(user2.address, amount);

        expect(await capx.balanceOf(user2.address)).to.equal(amount);
        expect(await capx.totalMinted()).to.equal(amount);
      });

      it("Should emit TreasuryMint event", async function () {
        const amount = hre.ethers.parseEther("5000");

        await expect(capx.connect(user1).treasuryMint(user2.address, amount))
          .to.emit(capx, "TreasuryMint")
          .withArgs(user1.address, user2.address, amount);
      });

      it("Should revert if caller lacks TREASURY_MINTER_ROLE", async function () {
        await expect(
          capx
            .connect(user2)
            .treasuryMint(user3.address, hre.ethers.parseEther("1000"))
        ).to.be.reverted;
      });
    });

    describe("DAO Minting", function () {
      it("Should allow DAO_MINTER_ROLE to mint tokens", async function () {
        const amount = hre.ethers.parseEther("2000");
        await capx.connect(user1).daoMint(user2.address, amount);

        expect(await capx.balanceOf(user2.address)).to.equal(amount);
        expect(await capx.totalMinted()).to.equal(amount);
      });

      it("Should emit DAOMint event", async function () {
        const amount = hre.ethers.parseEther("2000");

        await expect(capx.connect(user1).daoMint(user2.address, amount))
          .to.emit(capx, "DAOMint")
          .withArgs(user1.address, user2.address, amount);
      });

      it("Should revert if caller lacks DAO_MINTER_ROLE", async function () {
        await expect(
          capx
            .connect(user2)
            .daoMint(user3.address, hre.ethers.parseEther("1000"))
        ).to.be.reverted;
      });
    });

    describe("Minting After Role Revocation", function () {
      it("Should prevent minting after TEAM_MINTER_ROLE is revoked", async function () {
        await mockAdmin.revokeRole(
          await capx.getAddress(),
          TEAM_MINTER_ROLE,
          user1.address
        );

        await expect(
          capx
            .connect(user1)
            .teamMint(user2.address, hre.ethers.parseEther("1000"))
        ).to.be.reverted;
      });

      it("Should prevent minting after TREASURY_MINTER_ROLE is revoked", async function () {
        await mockAdmin.revokeRole(
          await capx.getAddress(),
          TREASURY_MINTER_ROLE,
          user1.address
        );

        await expect(
          capx
            .connect(user1)
            .treasuryMint(user2.address, hre.ethers.parseEther("1000"))
        ).to.be.reverted;
      });

      it("Should prevent minting after DAO_MINTER_ROLE is revoked", async function () {
        await mockAdmin.revokeRole(
          await capx.getAddress(),
          DAO_MINTER_ROLE,
          user1.address
        );

        await expect(
          capx
            .connect(user1)
            .daoMint(user2.address, hre.ethers.parseEther("1000"))
        ).to.be.reverted;
      });
    });
  });

  describe("5. Revenue-Based Minting", function () {
    it("Should mint tokens based on correct formula: revenue / marketValue", async function () {
      const revenue = hre.ethers.parseEther("10000"); // 10000 USD
      const marketValue = hre.ethers.parseEther("2"); // $2 per token

      await capx
        .connect(user1)
        .revenueMint(user2.address, revenue, marketValue);

      // Expected: (10000 * 10^18) / 2 = 5000 tokens
      const expectedAmount = hre.ethers.parseEther("5000");
      expect(await capx.balanceOf(user2.address)).to.equal(expectedAmount);
    });

    it("Should emit RevenueMint event with correct parameters", async function () {
      const revenue = hre.ethers.parseEther("5000");
      const marketValue = hre.ethers.parseEther("1");
      const expectedAmount = hre.ethers.parseEther("5000");

      await expect(
        capx.connect(user1).revenueMint(user2.address, revenue, marketValue)
      )
        .to.emit(capx, "RevenueMint")
        .withArgs(user2.address, expectedAmount, revenue, marketValue);
    });

    it("Should revert if revenue is zero", async function () {
      await expect(
        capx
          .connect(user1)
          .revenueMint(user2.address, 0, hre.ethers.parseEther("1"))
      ).to.be.revertedWith("Revenue must be greater than 0");
    });

    it("Should revert if market value is zero", async function () {
      await expect(
        capx
          .connect(user1)
          .revenueMint(user2.address, hre.ethers.parseEther("1000"), 0)
      ).to.be.revertedWith("Market value must be greater than 0");
    });

    it("Should revert if calculated amount is zero", async function () {
      // Very small revenue with large market value = 0 tokens
      const revenue = 1n; // 1 wei
      const marketValue = hre.ethers.parseEther("1000000"); // Very high

      await expect(
        capx.connect(user1).revenueMint(user2.address, revenue, marketValue)
      ).to.be.revertedWith("Calculated mint amount is 0");
    });

    it("Should respect hard cap in revenue minting", async function () {
      const maxSupply = await capx.MAX_SUPPLY();
      await capx
        .connect(user1)
        .teamMint(user2.address, maxSupply - hre.ethers.parseEther("100"));

      // Try to mint 200 tokens via revenue (exceeds remaining 100)
      const revenue = hre.ethers.parseEther("200");
      const marketValue = hre.ethers.parseEther("1");

      await expect(
        capx.connect(user1).revenueMint(user3.address, revenue, marketValue)
      ).to.be.revertedWith("Minting would exceed max supply");
    });

    it("Should only allow TREASURY_MINTER_ROLE to revenue mint", async function () {
      await expect(
        capx
          .connect(user2)
          .revenueMint(
            user3.address,
            hre.ethers.parseEther("1000"),
            hre.ethers.parseEther("1")
          )
      ).to.be.reverted;
    });

    it("Should handle various revenue/marketValue combinations correctly", async function () {
      // Test case: $1000 revenue, $0.50 per token = 2000 tokens
      const revenue = hre.ethers.parseEther("1000");
      const marketValue = hre.ethers.parseEther("0.5");

      await capx
        .connect(user1)
        .revenueMint(user2.address, revenue, marketValue);

      const expectedAmount = hre.ethers.parseEther("2000");
      expect(await capx.balanceOf(user2.address)).to.equal(expectedAmount);
    });
  });

  describe("6. Transfer Hooks", function () {
    beforeEach(async function () {
      // Mint tokens to user2 for transfer tests
      await capx
        .connect(user1)
        .teamMint(user2.address, hre.ethers.parseEther("10000"));
    });

    it("Should apply 1% burn on non-exempt transfers", async function () {
      const transferAmount = hre.ethers.parseEther("1000");
      const burnAmount = transferAmount / 100n; // 1%

      const initialSupply = await capx.totalSupply();

      await capx.connect(user2).transfer(user3.address, transferAmount);

      const finalSupply = await capx.totalSupply();
      expect(initialSupply - finalSupply).to.equal(burnAmount);
    });

    it("Should apply 1% treasury allocation on non-exempt transfers", async function () {
      const transferAmount = hre.ethers.parseEther("1000");
      const treasuryAmount = transferAmount / 100n; // 1%

      const initialTreasuryBalance = await capx.balanceOf(treasury.address);

      await capx.connect(user2).transfer(user3.address, transferAmount);

      const finalTreasuryBalance = await capx.balanceOf(treasury.address);
      expect(finalTreasuryBalance - initialTreasuryBalance).to.equal(
        treasuryAmount
      );
    });

    it("Should send 98% to recipient on non-exempt transfers", async function () {
      const transferAmount = hre.ethers.parseEther("1000");
      const recipientAmount =
        transferAmount - transferAmount / 100n - transferAmount / 100n; // 98%

      await capx.connect(user2).transfer(user3.address, transferAmount);

      expect(await capx.balanceOf(user3.address)).to.equal(recipientAmount);
    });

    it("Should emit TreasuryFee event on transfer", async function () {
      const transferAmount = hre.ethers.parseEther("1000");
      const treasuryAmount = transferAmount / 100n;

      await expect(capx.connect(user2).transfer(user3.address, transferAmount))
        .to.emit(capx, "TreasuryFee")
        .withArgs(user2.address, treasury.address, treasuryAmount);
    });

    it("Should emit Burn event on transfer", async function () {
      const transferAmount = hre.ethers.parseEther("1000");
      const burnAmount = transferAmount / 100n;

      await expect(capx.connect(user2).transfer(user3.address, transferAmount))
        .to.emit(capx, "Burn")
        .withArgs(user2.address, burnAmount);
    });

    it("Should update totalSupply correctly after transfer with burn", async function () {
      const transferAmount = hre.ethers.parseEther("1000");
      const burnAmount = transferAmount / 100n;

      const initialSupply = await capx.totalSupply();
      await capx.connect(user2).transfer(user3.address, transferAmount);
      const finalSupply = await capx.totalSupply();

      expect(initialSupply - finalSupply).to.equal(burnAmount);
    });

    it("Should handle very small transfer amounts (fee rounding)", async function () {
      const transferAmount = 99n; // Less than 100 wei
      const burnAmount = transferAmount / 100n; // 0
      const treasuryAmount = transferAmount / 100n; // 0
      const recipientAmount = transferAmount - burnAmount - treasuryAmount; // 99

      await capx.connect(user2).transfer(user3.address, transferAmount);

      expect(await capx.balanceOf(user3.address)).to.equal(recipientAmount);
    });

    it("Should handle multiple sequential transfers correctly", async function () {
      const transferAmount = hre.ethers.parseEther("100");

      // Transfer 1: user2 -> user3
      await capx.connect(user2).transfer(user3.address, transferAmount);
      const user3Balance1 = await capx.balanceOf(user3.address);

      // Transfer 2: user3 -> user4 (user3 transfers what they received)
      await capx.connect(user3).transfer(user4.address, user3Balance1);

      // user4 should receive 98% of what user3 had
      const expectedUser4 =
        user3Balance1 - user3Balance1 / 100n - user3Balance1 / 100n;
      expect(await capx.balanceOf(user4.address)).to.equal(expectedUser4);
    });
  });

  describe("7. Exemptions", function () {
    beforeEach(async function () {
      await capx
        .connect(user1)
        .teamMint(user2.address, hre.ethers.parseEther("10000"));
      await capx
        .connect(user1)
        .teamMint(treasury.address, hre.ethers.parseEther("10000"));
      await capx
        .connect(user1)
        .teamMint(dao.address, hre.ethers.parseEther("10000"));
    });

    it("Should exempt treasury from fees when sending", async function () {
      const transferAmount = hre.ethers.parseEther("1000");

      const initialSupply = await capx.totalSupply();
      await capx.connect(treasury).transfer(user3.address, transferAmount);
      const finalSupply = await capx.totalSupply();

      // No burn should occur
      expect(finalSupply).to.equal(initialSupply);
      // Recipient should receive full amount
      expect(await capx.balanceOf(user3.address)).to.equal(transferAmount);
    });

    it("Should exempt DAO from fees when sending", async function () {
      const transferAmount = hre.ethers.parseEther("1000");

      const initialSupply = await capx.totalSupply();
      await capx.connect(dao).transfer(user3.address, transferAmount);
      const finalSupply = await capx.totalSupply();

      // No burn should occur
      expect(finalSupply).to.equal(initialSupply);
      // Recipient should receive full amount
      expect(await capx.balanceOf(user3.address)).to.equal(transferAmount);
    });

    it("Should exempt transfers TO treasury from fees", async function () {
      const transferAmount = hre.ethers.parseEther("1000");

      const initialSupply = await capx.totalSupply();
      const initialTreasuryBalance = await capx.balanceOf(treasury.address);

      await capx.connect(user2).transfer(treasury.address, transferAmount);

      const finalSupply = await capx.totalSupply();
      const finalTreasuryBalance = await capx.balanceOf(treasury.address);

      // No burn should occur
      expect(finalSupply).to.equal(initialSupply);
      // Treasury should receive full amount
      expect(finalTreasuryBalance - initialTreasuryBalance).to.equal(
        transferAmount
      );
    });

    it("Should exempt transfers TO DAO from fees", async function () {
      const transferAmount = hre.ethers.parseEther("1000");

      const initialSupply = await capx.totalSupply();
      const initialDaoBalance = await capx.balanceOf(dao.address);

      await capx.connect(user2).transfer(dao.address, transferAmount);

      const finalSupply = await capx.totalSupply();
      const finalDaoBalance = await capx.balanceOf(dao.address);

      // No burn should occur
      expect(finalSupply).to.equal(initialSupply);
      // DAO should receive full amount
      expect(finalDaoBalance - initialDaoBalance).to.equal(transferAmount);
    });

    it("Should allow admin to add custom exemptions", async function () {
      await mockAdmin.setExemption(
        await capx.getAddress(),
        user3.address,
        true
      );
      expect(await capx.isExemptFromFees(user3.address)).to.be.true;
    });

    it("Should allow admin to remove exemptions", async function () {
      await mockAdmin.setExemption(
        await capx.getAddress(),
        user3.address,
        true
      );
      await mockAdmin.setExemption(
        await capx.getAddress(),
        user3.address,
        false
      );
      expect(await capx.isExemptFromFees(user3.address)).to.be.false;
    });

    it("Should emit ExemptionUpdated event", async function () {
      await expect(
        mockAdmin.setExemption(await capx.getAddress(), user3.address, true)
      )
        .to.emit(capx, "ExemptionUpdated")
        .withArgs(user3.address, true);
    });

    it("Should revert if non-admin tries to set exemption", async function () {
      await expect(capx.connect(user2).setExemption(user3.address, true)).to.be
        .reverted;
    });

    it("Should revert if setting exemption for zero address", async function () {
      await expect(
        mockAdmin.setExemption(
          await capx.getAddress(),
          hre.ethers.ZeroAddress,
          true
        )
      ).to.be.revertedWith("Cannot set exemption for zero address");
    });

    it("Should apply fees correctly after exemption is removed", async function () {
      // Add exemption
      await mockAdmin.setExemption(
        await capx.getAddress(),
        user2.address,
        true
      );

      // Transfer without fees
      const transferAmount1 = hre.ethers.parseEther("100");
      await capx.connect(user2).transfer(user3.address, transferAmount1);
      expect(await capx.balanceOf(user3.address)).to.equal(transferAmount1);

      // Remove exemption
      await mockAdmin.setExemption(
        await capx.getAddress(),
        user2.address,
        false
      );

      // Transfer with fees
      const transferAmount2 = hre.ethers.parseEther("100");
      const expectedReceived =
        transferAmount2 - transferAmount2 / 100n - transferAmount2 / 100n;
      await capx.connect(user2).transfer(user4.address, transferAmount2);
      expect(await capx.balanceOf(user4.address)).to.equal(expectedReceived);
    });
  });

  describe("8. Pause & Emergency Stop", function () {
    beforeEach(async function () {
      await capx
        .connect(user1)
        .teamMint(user2.address, hre.ethers.parseEther("10000"));
    });

    it("Should allow PAUSER_ROLE to pause contract", async function () {
      await capx.connect(user1).pause();
      expect(await capx.paused()).to.be.true;
    });

    it("Should allow PAUSER_ROLE to unpause contract", async function () {
      await capx.connect(user1).pause();
      await capx.connect(user1).unpause();
      expect(await capx.paused()).to.be.false;
    });

    it("Should emit Paused event", async function () {
      await expect(capx.connect(user1).pause())
        .to.emit(capx, "Paused")
        .withArgs(user1.address);
    });

    it("Should emit Unpaused event", async function () {
      await capx.connect(user1).pause();

      await expect(capx.connect(user1).unpause())
        .to.emit(capx, "Unpaused")
        .withArgs(user1.address);
    });

    it("Should prevent transfers when paused", async function () {
      await capx.connect(user1).pause();

      await expect(
        capx
          .connect(user2)
          .transfer(user3.address, hre.ethers.parseEther("100"))
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should prevent teamMint when paused", async function () {
      await capx.connect(user1).pause();

      await expect(
        capx
          .connect(user1)
          .teamMint(user3.address, hre.ethers.parseEther("1000"))
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should prevent treasuryMint when paused", async function () {
      await capx.connect(user1).pause();

      await expect(
        capx
          .connect(user1)
          .treasuryMint(user3.address, hre.ethers.parseEther("1000"))
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should prevent daoMint when paused", async function () {
      await capx.connect(user1).pause();

      await expect(
        capx
          .connect(user1)
          .daoMint(user3.address, hre.ethers.parseEther("1000"))
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should prevent revenueMint when paused", async function () {
      await capx.connect(user1).pause();

      await expect(
        capx
          .connect(user1)
          .revenueMint(
            user3.address,
            hre.ethers.parseEther("1000"),
            hre.ethers.parseEther("1")
          )
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should prevent burn when paused", async function () {
      await capx.connect(user1).pause();

      await expect(
        capx.connect(user2).burn(hre.ethers.parseEther("100"))
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should prevent burnFrom when paused", async function () {
      await capx
        .connect(user2)
        .approve(user3.address, hre.ethers.parseEther("100"));
      await capx.connect(user1).pause();

      await expect(
        capx
          .connect(user3)
          .burnFrom(user2.address, hre.ethers.parseEther("100"))
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should prevent non-pauser from pausing", async function () {
      await expect(capx.connect(user2).pause()).to.be.reverted;
    });

    it("Should prevent non-pauser from unpausing", async function () {
      await capx.connect(user1).pause();

      await expect(capx.connect(user2).unpause()).to.be.reverted;
    });

    it("Should allow transfers after unpausing", async function () {
      await capx.connect(user1).pause();
      await capx.connect(user1).unpause();

      await capx
        .connect(user2)
        .transfer(user3.address, hre.ethers.parseEther("100"));

      // 98% should be received
      const expected = hre.ethers.parseEther("98");
      expect(await capx.balanceOf(user3.address)).to.equal(expected);
    });

    it("Should allow minting after unpausing", async function () {
      await capx.connect(user1).pause();
      await capx.connect(user1).unpause();

      await capx
        .connect(user1)
        .teamMint(user3.address, hre.ethers.parseEther("1000"));
      expect(await capx.balanceOf(user3.address)).to.equal(
        hre.ethers.parseEther("1000")
      );
    });

    it("Should prevent pausing after PAUSER_ROLE is revoked", async function () {
      await mockAdmin.revokeRole(
        await capx.getAddress(),
        PAUSER_ROLE,
        user1.address
      );

      await expect(capx.connect(user1).pause()).to.be.reverted;
    });
  });

  describe("9. Burn Logic", function () {
    beforeEach(async function () {
      await capx
        .connect(user1)
        .teamMint(user2.address, hre.ethers.parseEther("10000"));
    });

    it("Should allow users to burn their own tokens", async function () {
      const burnAmount = hre.ethers.parseEther("1000");
      await capx.connect(user2).burn(burnAmount);

      expect(await capx.balanceOf(user2.address)).to.equal(
        hre.ethers.parseEther("9000")
      );
    });

    it("Should reduce totalSupply when burning", async function () {
      const initialSupply = await capx.totalSupply();
      const burnAmount = hre.ethers.parseEther("1000");

      await capx.connect(user2).burn(burnAmount);

      expect(await capx.totalSupply()).to.equal(initialSupply - burnAmount);
    });

    it("Should emit Burn event", async function () {
      const burnAmount = hre.ethers.parseEther("1000");

      await expect(capx.connect(user2).burn(burnAmount))
        .to.emit(capx, "Burn")
        .withArgs(user2.address, burnAmount);
    });

    it("Should allow burnFrom with sufficient allowance", async function () {
      const burnAmount = hre.ethers.parseEther("500");
      await capx.connect(user2).approve(user3.address, burnAmount);
      await capx.connect(user3).burnFrom(user2.address, burnAmount);

      expect(await capx.balanceOf(user2.address)).to.equal(
        hre.ethers.parseEther("9500")
      );
    });

    it("Should emit BurnFrom event", async function () {
      const burnAmount = hre.ethers.parseEther("500");
      await capx.connect(user2).approve(user3.address, burnAmount);

      await expect(capx.connect(user3).burnFrom(user2.address, burnAmount))
        .to.emit(capx, "BurnFrom")
        .withArgs(user3.address, user2.address, burnAmount);
    });

    it("Should revert burnFrom without sufficient allowance", async function () {
      await expect(
        capx
          .connect(user3)
          .burnFrom(user2.address, hre.ethers.parseEther("500"))
      ).to.be.reverted;
    });

    it("Should NOT reduce totalMinted when burning", async function () {
      const totalMintedBefore = await capx.totalMinted();
      const burnAmount = hre.ethers.parseEther("1000");

      await capx.connect(user2).burn(burnAmount);

      expect(await capx.totalMinted()).to.equal(totalMintedBefore);
    });

    it("Should revert if burning more than balance", async function () {
      await expect(capx.connect(user2).burn(hre.ethers.parseEther("20000"))).to
        .be.reverted;
    });
  });

  describe("10. Multisig Admin Security", function () {
    it("Should have admin role held by contract (multisig)", async function () {
      const adminAddress = await mockAdmin.getAddress();
      expect(await capx.hasRole(DEFAULT_ADMIN_ROLE, adminAddress)).to.be.true;

      // Verify it's a contract
      const code = await hre.ethers.provider.getCode(adminAddress);
      expect(code).to.not.equal("0x");
    });

    it("Should not allow EOA to be admin at deployment", async function () {
      const CAPX = await hre.ethers.getContractFactory("CAPX");
      await expect(
        CAPX.deploy(treasury.address, dao.address, user1.address)
      ).to.be.revertedWith("Admin must be multisig/contract");
    });

    it("Should restrict critical functions to admin", async function () {
      // updateTreasuryAddress
      await expect(capx.connect(user2).updateTreasuryAddress(user3.address)).to
        .be.reverted;

      // updateDAOAddress
      await expect(capx.connect(user2).updateDAOAddress(user3.address)).to.be
        .reverted;

      // setExemption
      await expect(capx.connect(user2).setExemption(user3.address, true)).to.be
        .reverted;

      // grantRole
      await expect(
        capx.connect(user2).grantRole(TEAM_MINTER_ROLE, user3.address)
      ).to.be.reverted;

      // revokeRole
      await expect(
        capx.connect(user2).revokeRole(TEAM_MINTER_ROLE, user1.address)
      ).to.be.reverted;
    });
  });

  describe("11. Address Update Functions", function () {
    it("Should allow admin to update treasury address", async function () {
      await mockAdmin.updateTreasuryAddress(
        await capx.getAddress(),
        user3.address
      );

      expect(await capx.treasuryAddress()).to.equal(user3.address);
    });

    it("Should update exemptions when treasury address changes", async function () {
      const oldTreasury = treasury.address;
      await mockAdmin.updateTreasuryAddress(
        await capx.getAddress(),
        user3.address
      );

      expect(await capx.isExemptFromFees(oldTreasury)).to.be.false;
      expect(await capx.isExemptFromFees(user3.address)).to.be.true;
    });

    it("Should emit TreasuryAddressUpdated event", async function () {
      await expect(
        mockAdmin.updateTreasuryAddress(await capx.getAddress(), user3.address)
      )
        .to.emit(capx, "TreasuryAddressUpdated")
        .withArgs(treasury.address, user3.address);
    });

    it("Should allow admin to update DAO address", async function () {
      await mockAdmin.updateDAOAddress(await capx.getAddress(), user3.address);

      expect(await capx.daoAddress()).to.equal(user3.address);
    });

    it("Should update exemptions when DAO address changes", async function () {
      const oldDao = dao.address;
      await mockAdmin.updateDAOAddress(await capx.getAddress(), user3.address);

      expect(await capx.isExemptFromFees(oldDao)).to.be.false;
      expect(await capx.isExemptFromFees(user3.address)).to.be.true;
    });

    it("Should emit DAOAddressUpdated event", async function () {
      await expect(
        mockAdmin.updateDAOAddress(await capx.getAddress(), user3.address)
      )
        .to.emit(capx, "DAOAddressUpdated")
        .withArgs(dao.address, user3.address);
    });

    it("Should revert if updating treasury to zero address", async function () {
      await expect(
        mockAdmin.updateTreasuryAddress(
          await capx.getAddress(),
          hre.ethers.ZeroAddress
        )
      ).to.be.revertedWith("Treasury address cannot be zero");
    });

    it("Should revert if updating DAO to zero address", async function () {
      await expect(
        mockAdmin.updateDAOAddress(
          await capx.getAddress(),
          hre.ethers.ZeroAddress
        )
      ).to.be.revertedWith("DAO address cannot be zero");
    });

    it("Should direct fees to new treasury after update", async function () {
      // Update treasury
      await mockAdmin.updateTreasuryAddress(
        await capx.getAddress(),
        user3.address
      );

      // Mint and transfer
      await capx
        .connect(user1)
        .teamMint(user2.address, hre.ethers.parseEther("10000"));
      const transferAmount = hre.ethers.parseEther("1000");
      const treasuryFee = transferAmount / 100n;

      await capx.connect(user2).transfer(user4.address, transferAmount);

      // New treasury should receive fees
      expect(await capx.balanceOf(user3.address)).to.equal(treasuryFee);
      // Old treasury should have 0
      expect(await capx.balanceOf(treasury.address)).to.equal(0);
    });
  });

  describe("12. Standard ERC20 Functions", function () {
    beforeEach(async function () {
      await capx
        .connect(user1)
        .teamMint(user2.address, hre.ethers.parseEther("10000"));
    });

    it("Should allow approve and transferFrom", async function () {
      await capx
        .connect(user2)
        .approve(user3.address, hre.ethers.parseEther("1000"));

      await capx
        .connect(user3)
        .transferFrom(
          user2.address,
          user4.address,
          hre.ethers.parseEther("500")
        );

      // 98% after fees
      const expected = hre.ethers.parseEther("490");
      expect(await capx.balanceOf(user4.address)).to.equal(expected);
    });

    it("Should track allowances correctly", async function () {
      const allowanceAmount = hre.ethers.parseEther("2000");
      await capx.connect(user2).approve(user3.address, allowanceAmount);

      expect(await capx.allowance(user2.address, user3.address)).to.equal(
        allowanceAmount
      );
    });

    it("Should reduce allowance after transferFrom", async function () {
      const allowanceAmount = hre.ethers.parseEther("1000");
      await capx.connect(user2).approve(user3.address, allowanceAmount);

      await capx
        .connect(user3)
        .transferFrom(
          user2.address,
          user4.address,
          hre.ethers.parseEther("400")
        );

      expect(await capx.allowance(user2.address, user3.address)).to.equal(
        hre.ethers.parseEther("600")
      );
    });

    it("Should emit Transfer events", async function () {
      await expect(
        capx
          .connect(user2)
          .transfer(user3.address, hre.ethers.parseEther("100"))
      ).to.emit(capx, "Transfer");
    });

    it("Should emit Approval events", async function () {
      await expect(
        capx.connect(user2).approve(user3.address, hre.ethers.parseEther("100"))
      )
        .to.emit(capx, "Approval")
        .withArgs(user2.address, user3.address, hre.ethers.parseEther("100"));
    });
  });

  // ==========================================================================
  // 13. EDGE CASES
  // ==========================================================================
  describe("13. Edge Cases", function () {
    it("Should handle transfer of 1 wei", async function () {
      await capx
        .connect(user1)
        .teamMint(user2.address, hre.ethers.parseEther("1000"));

      await capx.connect(user2).transfer(user3.address, 1n);

      // 1 wei transfer: burn = 0, treasury = 0, recipient = 1
      expect(await capx.balanceOf(user3.address)).to.equal(1n);
    });

    it("Should handle mint of 1 wei", async function () {
      await capx.connect(user1).teamMint(user2.address, 1n);

      expect(await capx.balanceOf(user2.address)).to.equal(1n);
      expect(await capx.totalMinted()).to.equal(1n);
    });

    it("Should handle multiple mints to same address", async function () {
      await capx
        .connect(user1)
        .teamMint(user2.address, hre.ethers.parseEther("100"));
      await capx
        .connect(user1)
        .treasuryMint(user2.address, hre.ethers.parseEther("200"));
      await capx
        .connect(user1)
        .daoMint(user2.address, hre.ethers.parseEther("300"));

      expect(await capx.balanceOf(user2.address)).to.equal(
        hre.ethers.parseEther("600")
      );
      expect(await capx.totalMinted()).to.equal(hre.ethers.parseEther("600"));
    });

    it("Should handle transfer to self (with fees)", async function () {
      await capx
        .connect(user1)
        .teamMint(user2.address, hre.ethers.parseEther("1000"));

      const initialBalance = await capx.balanceOf(user2.address);
      await capx
        .connect(user2)
        .transfer(user2.address, hre.ethers.parseEther("100"));

      // User loses 2% (burn + treasury)
      const expectedLoss = hre.ethers.parseEther("2");
      expect(await capx.balanceOf(user2.address)).to.equal(
        initialBalance - expectedLoss
      );
    });

    it("Should handle exact MAX_SUPPLY mint", async function () {
      const maxSupply = await capx.MAX_SUPPLY();
      await capx.connect(user1).teamMint(user2.address, maxSupply);

      expect(await capx.totalMinted()).to.equal(maxSupply);
      expect(await capx.remainingMintableSupply()).to.equal(0);
      expect(await capx.canMint(1)).to.be.false;
    });
  });
});
