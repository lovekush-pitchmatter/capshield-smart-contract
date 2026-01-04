const hre = require("hardhat");

async function main() {
  console.log("Starting TokenVesting deployment...");

  // Get deployment parameters
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log(
    "Account balance:",
    (await ethers.provider.getBalance(deployer.address)).toString()
  );

  // Admin address (should be multisig in production)
  // Replace with actual multisig address
  const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS || "0x..."; // Set this in .env

  if (ADMIN_ADDRESS === "0x...") {
    console.error(
      "❌ Please set ADMIN_ADDRESS in .env file to your multisig address"
    );
    process.exit(1);
  }

  console.log("Admin address:", ADMIN_ADDRESS);

  // Deploy TokenVesting
  console.log("\n📦 Deploying TokenVesting...");
  const TokenVesting = await ethers.getContractFactory("TokenVesting");
  const tokenVesting = await TokenVesting.deploy(ADMIN_ADDRESS);
  await tokenVesting.waitForDeployment();

  const vestingAddress = await tokenVesting.getAddress();
  console.log("✅ TokenVesting deployed to:", vestingAddress);

  // Verify roles
  const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
  const VESTING_ADMIN_ROLE = ethers.keccak256(
    ethers.toUtf8Bytes("VESTING_ADMIN_ROLE")
  );
  const PAUSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PAUSER_ROLE"));

  const hasAdminRole = await tokenVesting.hasRole(
    DEFAULT_ADMIN_ROLE,
    ADMIN_ADDRESS
  );
  const hasVestingAdminRole = await tokenVesting.hasRole(
    VESTING_ADMIN_ROLE,
    ADMIN_ADDRESS
  );
  const hasPauserRole = await tokenVesting.hasRole(PAUSER_ROLE, ADMIN_ADDRESS);

  console.log("\n🔐 Role Verification:");
  console.log("  DEFAULT_ADMIN_ROLE:", hasAdminRole ? "✅" : "❌");
  console.log("  VESTING_ADMIN_ROLE:", hasVestingAdminRole ? "✅" : "❌");
  console.log("  PAUSER_ROLE:", hasPauserRole ? "✅" : "❌");

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    tokenVesting: vestingAddress,
    adminAddress: ADMIN_ADDRESS,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber(),
  };

  console.log("\n📝 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Save to file
  const fs = require("fs");
  const path = require("path");
  const filename = `vesting-deployment-${hre.network.name}.json`;
  fs.writeFileSync(
    path.join(__dirname, "..", filename),
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log(`\n💾 Deployment info saved to ${filename}`);

  // Verification instructions
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n📋 To verify on Etherscan, run:");
    console.log(
      `npx hardhat verify --network ${hre.network.name} ${vestingAddress} "${ADMIN_ADDRESS}"`
    );
  }

  console.log("\n🎉 Deployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
