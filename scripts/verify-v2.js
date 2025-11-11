// scripts/verify-v2.js
const hre = require("hardhat");

async function main() {
  console.log("🔍 Verifying contracts using Etherscan API V2...\n");

  // Read deployment info
  const fs = require("fs");
  if (!fs.existsSync("deployment-info.json")) {
    console.log("❌ deployment-info.json not found");
    return;
  }

  const deploymentInfo = JSON.parse(fs.readFileSync("deployment-info.json", "utf8"));
  
  console.log(`Verifying contracts on ${deploymentInfo.network} (Chain ID: ${deploymentInfo.chainId})`);

  // Verify CAPX
  try {
    console.log("\n📄 Verifying CAPX contract...");
    await hre.run("verify:verify", {
      address: deploymentInfo.contracts.CAPX.address,
      constructorArguments: [],
    });
    console.log("✅ CAPX verified successfully!");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ CAPX is already verified!");
    } else {
      console.log("⚠️ CAPX verification:", error.message);
    }
  }

  // Verify ANGEL
  try {
    console.log("\n📄 Verifying ANGEL contract...");
    await hre.run("verify:verify", {
      address: deploymentInfo.contracts.ANGEL.address,
      constructorArguments: [],
    });
    console.log("✅ ANGEL verified successfully!");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ ANGEL is already verified!");
    } else {
      console.log("⚠️ ANGEL verification:", error.message);
    }
  }

  console.log("\n🌐 CONTRACT LINKS:");
  console.log("CAPX:", `https://sepolia.etherscan.io/address/${deploymentInfo.contracts.CAPX.address}`);
  console.log("ANGEL:", `https://sepolia.etherscan.io/address/${deploymentInfo.contracts.ANGEL.address}`);
  console.log("Deployer:", `https://sepolia.etherscan.io/address/${deploymentInfo.deployer}`);
}

main().catch(console.error);