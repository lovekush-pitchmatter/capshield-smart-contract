const { run } = require("hardhat");

async function main() {
  // Read deployment info
  const fs = require("fs");
  const deploymentInfo = JSON.parse(fs.readFileSync("deployment-info.json", "utf8"));
  
  console.log("Verifying contracts on BscScan...");

  // Verify CAPX Contract
  try {
    console.log("\nVerifying CAPX contract...");
    await run("verify:verify", {
      address: deploymentInfo.contracts.CAPX.address,
      constructorArguments: [],
    });
    console.log("CAPX contract verified successfully!");
  } catch (error) {
    console.log("CAPX verification error:", error.message);
  }

  // Verify ANGEL Contract
  try {
    console.log("\nVerifying ANGEL contract...");
    await run("verify:verify", {
      address: deploymentInfo.contracts.ANGEL.address,
      constructorArguments: [],
    });
    console.log("ANGEL contract verified successfully!");
  } catch (error) {
    console.log("ANGEL verification error:", error.message);
  }

  console.log("\n=== Verification Links ===");
  console.log("CAPX Contract:", `https://testnet.bscscan.com/address/${deploymentInfo.contracts.CAPX.address}`);
  console.log("ANGEL Contract:", `https://testnet.bscscan.com/address/${deploymentInfo.contracts.ANGEL.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });