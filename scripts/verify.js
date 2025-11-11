// scripts/verify-v2.js
const hre = require("hardhat");

async function main() {
  console.log("🔍 Verifying contracts using new API V2...\n");

  const deploymentInfo = require("../deployment-info.json");

  try {
    console.log("Verifying CAPX contract...");
    await hre.run("verify:verify", {
      address: deploymentInfo.contracts.CAPX.address,
      constructorArguments: [],
    });
    console.log("✅ CAPX verified successfully!\n");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ CAPX is already verified!\n");
    } else {
      console.log("⚠️ CAPX verification:", error.message, "\n");
    }
  }

  try {
    console.log("Verifying ANGEL contract...");
    await hre.run("verify:verify", {
      address: deploymentInfo.contracts.ANGEL.address,
      constructorArguments: [],
    });
    console.log("✅ ANGEL verified successfully!\n");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ ANGEL is already verified!\n");
    } else {
      console.log("⚠️ ANGEL verification:", error.message, "\n");
    }
  }

  console.log("🌐 CONTRACT LINKS:");
  console.log(
    "CAPX: https://sepolia.etherscan.io/address/" +
      deploymentInfo.contracts.CAPX.address
  );
  console.log(
    "ANGEL: https://sepolia.etherscan.io/address/" +
      deploymentInfo.contracts.ANGEL.address
  );
  console.log(
    "Deployer: https://sepolia.etherscan.io/address/" + deploymentInfo.deployer
  );
}

main().catch(console.error);
