// scripts/deploy-mockadmin.js
// Deploy MockAdmin contract for testing purposes
// Usage: npx hardhat run scripts/deploy-mockadmin.js --network <network_name>

const hre = require("hardhat");

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("                    DEPLOYING MOCKADMIN");
  console.log("=".repeat(70));

  const [deployer] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();

  console.log("\n📊 Network Information:");
  console.log(`   Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`   Deployer: ${deployer.address}`);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`   Balance: ${hre.ethers.formatEther(balance)} ETH/MATIC/BNB`);

  // Deploy MockAdmin
  console.log("\n📄 Deploying MockAdmin...");
  const MockAdmin = await hre.ethers.getContractFactory("MockAdmin");
  const mockAdmin = await MockAdmin.deploy();
  await mockAdmin.waitForDeployment();
  const mockAdminAddress = await mockAdmin.getAddress();

  console.log(`   ✅ MockAdmin deployed to: ${mockAdminAddress}`);
  console.log(
    `   Transaction: ${mockAdmin.deploymentTransaction()?.hash || "N/A"}`
  );

  console.log("\n" + "=".repeat(70));
  console.log("                    NEXT STEPS");
  console.log("=".repeat(70));
  console.log("\n1. Update your .env file with the MockAdmin address:");
  console.log(`   ADMIN_ADDRESS=${mockAdminAddress}`);
  console.log("\n2. Run the main deployment script:");
  console.log(`   npm run deploy:polygon:testnet`);
  console.log(
    "\n⚠️  Note: MockAdmin is for TESTING only. Use a proper multisig for mainnet!\n"
  );

  // Optional verification
  if (process.env.VERIFY === "true") {
    console.log("\n⏳ Waiting for block confirmations before verification...");
    const tx = mockAdmin.deploymentTransaction();
    if (tx) {
      await tx.wait(5);
    }

    try {
      console.log("\n📄 Verifying MockAdmin...");
      await hre.run("verify:verify", {
        address: mockAdminAddress,
        constructorArguments: [],
      });
      console.log("   ✅ MockAdmin verified!");
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log("   ✅ MockAdmin is already verified!");
      } else {
        console.log(`   ⚠️  Verification failed: ${error.message}`);
        console.log("   You can verify later using:");
        console.log(
          `   npx hardhat verify --network ${network.name} ${mockAdminAddress}`
        );
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
