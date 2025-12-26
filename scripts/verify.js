// scripts/verify.js
// Unified contract verification script
// Usage: npx hardhat run scripts/verify.js --network <network_name>

const hre = require("hardhat");
const fs = require("fs");

const DEPLOYMENT_FILE = "deployment-info.json";

async function verifyContract(name, address, constructorArgs) {
  console.log(`\n📄 Verifying ${name}...`);
  console.log(`   Address: ${address}`);

  try {
    await hre.run("verify:verify", {
      address: address,
      constructorArguments: constructorArgs,
    });
    console.log(`✅ ${name} verified successfully!`);
    return { name, success: true, message: "Verified" };
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log(`✅ ${name} is already verified!`);
      return { name, success: true, message: "Already verified" };
    }
    console.log(`❌ ${name} verification failed: ${error.message}`);
    return { name, success: false, message: error.message };
  }
}

function loadDeploymentInfo() {
  if (!fs.existsSync(DEPLOYMENT_FILE)) {
    console.error(`\n❌ ${DEPLOYMENT_FILE} not found.`);
    console.error(
      "   Run deployment first: npx hardhat run scripts/deploy.js --network <network>\n"
    );
    process.exit(1);
  }

  try {
    return JSON.parse(fs.readFileSync(DEPLOYMENT_FILE, "utf8"));
  } catch (error) {
    console.error(
      `\n❌ Failed to parse ${DEPLOYMENT_FILE}: ${error.message}\n`
    );
    process.exit(1);
  }
}

function validateNetwork(deploymentInfo, currentNetwork) {
  if (deploymentInfo.network !== currentNetwork) {
    console.error(`\n❌ Network mismatch!`);
    console.error(`   Deployment was on: ${deploymentInfo.network}`);
    console.error(`   Current network: ${currentNetwork}`);
    console.error(
      `\n   Use: npx hardhat run scripts/verify.js --network ${deploymentInfo.network}\n`
    );
    process.exit(1);
  }
}

function getExplorerUrl(networkName, address) {
  const explorers = {
    polygon: `https://polygonscan.com/address/${address}`,
    polygonAmoy: `https://amoy.polygonscan.com/address/${address}`,
    bsc: `https://bscscan.com/address/${address}`,
    bscTestnet: `https://testnet.bscscan.com/address/${address}`,
  };
  return explorers[networkName] || null;
}

async function main() {
  const networkName = hre.network.name;

  console.log("\n" + "=".repeat(60));
  console.log("              CONTRACT VERIFICATION");
  console.log("=".repeat(60));

  // Load deployment info
  const deploymentInfo = loadDeploymentInfo();

  console.log(
    `\n🌐 Network: ${networkName} (Chain ID: ${deploymentInfo.chainId})`
  );
  console.log(`👤 Deployer: ${deploymentInfo.deployer}`);
  console.log(`📅 Deployed: ${deploymentInfo.timestamp}`);

  // Validate network matches
  validateNetwork(deploymentInfo, networkName);

  console.log("\n" + "-".repeat(60));

  // Verify all contracts
  const results = [];

  // Verify CAPX
  if (deploymentInfo.contracts.CAPX) {
    const result = await verifyContract(
      "CAPX",
      deploymentInfo.contracts.CAPX.address,
      deploymentInfo.contracts.CAPX.constructorArgs
    );
    results.push(result);
  }

  // Verify ANGEL
  if (deploymentInfo.contracts.ANGEL) {
    const result = await verifyContract(
      "ANGEL",
      deploymentInfo.contracts.ANGEL.address,
      deploymentInfo.contracts.ANGEL.constructorArgs
    );
    results.push(result);
  }

  // Print summary
  console.log("\n" + "-".repeat(60));
  console.log("                    SUMMARY");
  console.log("-".repeat(60));

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log(`\n📊 Verification Results:`);
  console.log(`   ✅ Successful: ${successful.length}`);
  console.log(`   ❌ Failed: ${failed.length}`);

  // Print explorer links
  console.log("\n🔗 Explorer Links:");

  if (deploymentInfo.contracts.CAPX) {
    const url = getExplorerUrl(
      networkName,
      deploymentInfo.contracts.CAPX.address
    );
    console.log(`   CAPX: ${url || deploymentInfo.contracts.CAPX.address}`);
  }

  if (deploymentInfo.contracts.ANGEL) {
    const url = getExplorerUrl(
      networkName,
      deploymentInfo.contracts.ANGEL.address
    );
    console.log(`   ANGEL: ${url || deploymentInfo.contracts.ANGEL.address}`);
  }

  // Print failed verifications
  if (failed.length > 0) {
    console.log("\n⚠️  Failed Verifications:");
    failed.forEach((r) => {
      console.log(`   - ${r.name}: ${r.message}`);
    });
    console.log("\n💡 Tips:");
    console.log("   - Wait a few minutes and try again");
    console.log("   - Ensure API keys are set in .env file");
    console.log("   - Check if the contract was deployed correctly");
  }

  console.log("\n" + "=".repeat(60) + "\n");

  // Exit with error code if any verification failed
  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("\n❌ Unexpected error:", error.message);
  process.exit(1);
});
