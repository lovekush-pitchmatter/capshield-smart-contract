const hre = require("hardhat");

/**
 * This script configures the TokenVesting contract as exempt from CAPX transfer fees
 * MUST be run after deploying TokenVesting to ensure beneficiaries receive full vested amounts
 */

async function main() {
  console.log("Configuring CAPX fee exemption for TokenVesting...\n");

  // Load deployment info
  const fs = require("fs");
  const path = require("path");

  let vestingAddress, capxAddress, mockAdminAddress;

  // Try to load from deployment file
  try {
    const deploymentFile = path.join(
      __dirname,
      "..",
      `vesting-deployment-${hre.network.name}.json`
    );
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
    vestingAddress = deployment.tokenVesting;
    console.log(
      "✅ Loaded vesting address from deployment file:",
      vestingAddress
    );
  } catch (error) {
    vestingAddress = process.env.VESTING_ADDRESS;
    console.log("⚠️  Using VESTING_ADDRESS from .env:", vestingAddress);
  }

  // Get contract addresses from environment or deployment info
  capxAddress = process.env.CAPX_ADDRESS;
  mockAdminAddress =
    process.env.MOCK_ADMIN_ADDRESS || process.env.ADMIN_ADDRESS;

  if (!vestingAddress || !capxAddress || !mockAdminAddress) {
    console.error("❌ Missing required addresses:");
    console.error("   VESTING_ADDRESS:", vestingAddress || "NOT SET");
    console.error("   CAPX_ADDRESS:", capxAddress || "NOT SET");
    console.error("   MOCK_ADMIN_ADDRESS:", mockAdminAddress || "NOT SET");
    process.exit(1);
  }

  console.log("\n📋 Configuration:");
  console.log("   Vesting Contract:", vestingAddress);
  console.log("   CAPX Contract:", capxAddress);
  console.log("   MockAdmin Contract:", mockAdminAddress);

  // Get contracts
  const mockAdmin = await ethers.getContractAt("MockAdmin", mockAdminAddress);
  const capx = await ethers.getContractAt("CAPX", capxAddress);

  // Check current exemption status
  console.log("\n🔍 Checking current exemption status...");
  const isExempt = await capx.isExemptFromFees(vestingAddress);
  console.log("   Current status:", isExempt ? "✅ EXEMPT" : "❌ NOT EXEMPT");

  if (isExempt) {
    console.log(
      "\n✅ TokenVesting is already exempt from fees. No action needed."
    );
    return;
  }

  // Set exemption
  console.log("\n⏳ Setting exemption...");
  const tx = await mockAdmin.setExemption(capxAddress, vestingAddress, true);
  console.log("   Transaction hash:", tx.hash);

  const receipt = await tx.wait();
  console.log("   Block number:", receipt.blockNumber);
  console.log("   Gas used:", receipt.gasUsed.toString());

  // Verify exemption was set
  const isExemptAfter = await capx.isExemptFromFees(vestingAddress);

  if (isExemptAfter) {
    console.log(
      "\n✅ SUCCESS! TokenVesting is now exempt from CAPX transfer fees."
    );
    console.log("\n📝 This means:");
    console.log("   • Beneficiaries will receive 100% of their vested tokens");
    console.log("   • No burn or treasury fees will be deducted during claims");
    console.log(
      "   • Vesting contract can accurately deliver promised amounts"
    );
  } else {
    console.log(
      "\n❌ FAILED! Exemption was not set properly. Please check permissions."
    );
    process.exit(1);
  }

  // Additional checks
  console.log("\n🔐 Verifying roles...");
  const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
  const [deployer] = await ethers.getSigners();

  // Check if mockAdmin has DEFAULT_ADMIN_ROLE on CAPX
  const hasAdminRole = await capx.hasRole(DEFAULT_ADMIN_ROLE, mockAdminAddress);
  console.log("   MockAdmin has CAPX admin role:", hasAdminRole ? "✅" : "❌");

  console.log("\n🎉 Configuration complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
