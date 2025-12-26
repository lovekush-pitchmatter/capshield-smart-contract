// scripts/deploy.js
// Production-ready deployment script for CAPX and ANGEL tokens
// Usage: npx hardhat run scripts/deploy.js --network <network_name>

const hre = require("hardhat");
const fs = require("fs");
const readline = require("readline");

const DEPLOYMENT_FILE = "deployment-info.json";

// Mainnet chain IDs that require confirmation
const MAINNET_CHAIN_IDS = [137, 56]; // Polygon, BSC

async function promptConfirmation(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "yes" || answer.toLowerCase() === "y");
    });
  });
}

function validateEnvVariables() {
  const required = ["TREASURY_ADDRESS", "DAO_ADDRESS", "ADMIN_ADDRESS"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("\n❌ Missing required environment variables:");
    missing.forEach((key) => console.error(`   - ${key}`));
    console.error("\n💡 Add these to your .env file:");
    console.error("   TREASURY_ADDRESS=0x...");
    console.error("   DAO_ADDRESS=0x...");
    console.error("   ADMIN_ADDRESS=0x... (must be a contract/multisig)\n");
    process.exit(1);
  }

  // Validate address formats
  const addresses = {
    TREASURY_ADDRESS: process.env.TREASURY_ADDRESS,
    DAO_ADDRESS: process.env.DAO_ADDRESS,
    ADMIN_ADDRESS: process.env.ADMIN_ADDRESS,
  };

  for (const [name, address] of Object.entries(addresses)) {
    if (!hre.ethers.isAddress(address)) {
      console.error(`\n❌ Invalid ${name}: ${address}`);
      console.error("   Must be a valid Ethereum address (0x...)\n");
      process.exit(1);
    }
  }

  return addresses;
}

async function validateAdminIsContract(adminAddress, provider) {
  const code = await provider.getCode(adminAddress);
  if (code === "0x") {
    console.error("\n❌ ADMIN_ADDRESS is not a contract/multisig!");
    console.error(`   Address: ${adminAddress}`);
    console.error(
      "   The admin address must be a deployed contract (e.g., Gnosis Safe)"
    );
    console.error(
      "\n💡 For testing, you can deploy a multisig first or use a test contract.\n"
    );
    process.exit(1);
  }
}

async function estimateDeploymentCost(deployer, provider) {
  const capxFactory = await hre.ethers.getContractFactory("CAPX");
  const angelFactory = await hre.ethers.getContractFactory("ANGEL");

  // Estimate gas for both contracts
  const capxDeployTx = await capxFactory.getDeployTransaction(
    process.env.TREASURY_ADDRESS,
    process.env.DAO_ADDRESS,
    process.env.ADMIN_ADDRESS
  );
  const angelDeployTx = await angelFactory.getDeployTransaction(
    process.env.ADMIN_ADDRESS
  );

  const capxGas = await provider.estimateGas({
    ...capxDeployTx,
    from: deployer.address,
  });
  const angelGas = await provider.estimateGas({
    ...angelDeployTx,
    from: deployer.address,
  });

  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || hre.ethers.parseUnits("5", "gwei");

  const totalGas = capxGas + angelGas;
  const estimatedCost = totalGas * gasPrice;

  return {
    capxGas: capxGas.toString(),
    angelGas: angelGas.toString(),
    totalGas: totalGas.toString(),
    gasPrice: gasPrice.toString(),
    estimatedCost: estimatedCost.toString(),
    estimatedCostFormatted: hre.ethers.formatEther(estimatedCost),
  };
}

async function main() {
  const networkName = hre.network.name;
  const { ethers } = hre;

  console.log("\n" + "=".repeat(70));
  console.log("                CAPX & ANGEL TOKEN DEPLOYMENT");
  console.log("=".repeat(70));

  // Validate environment variables
  const addresses = validateEnvVariables();

  // Get deployer and network info
  const [deployer] = await ethers.getSigners();
  const provider = ethers.provider;
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);
  const balance = await provider.getBalance(deployer.address);
  const balanceFormatted = ethers.formatEther(balance);

  // Validate admin is a contract
  await validateAdminIsContract(addresses.ADMIN_ADDRESS, provider);

  // Print deployment info
  console.log("\n📋 DEPLOYMENT CONFIGURATION");
  console.log("-".repeat(70));
  console.log(`   Network:      ${networkName} (Chain ID: ${chainId})`);
  console.log(`   Deployer:     ${deployer.address}`);
  console.log(
    `   Balance:      ${balanceFormatted} ${
      chainId === 56 || chainId === 97 ? "BNB" : "MATIC"
    }`
  );
  console.log(`   Treasury:     ${addresses.TREASURY_ADDRESS}`);
  console.log(`   DAO:          ${addresses.DAO_ADDRESS}`);
  console.log(`   Admin:        ${addresses.ADMIN_ADDRESS}`);

  // Estimate deployment cost
  console.log("\n💰 GAS ESTIMATION");
  console.log("-".repeat(70));

  let gasEstimate;
  try {
    gasEstimate = await estimateDeploymentCost(deployer, provider);
    console.log(`   CAPX Gas:     ${gasEstimate.capxGas}`);
    console.log(`   ANGEL Gas:    ${gasEstimate.angelGas}`);
    console.log(`   Total Gas:    ${gasEstimate.totalGas}`);
    console.log(
      `   Gas Price:    ${ethers.formatUnits(
        gasEstimate.gasPrice,
        "gwei"
      )} gwei`
    );
    console.log(
      `   Est. Cost:    ${gasEstimate.estimatedCostFormatted} ${
        chainId === 56 || chainId === 97 ? "BNB" : "MATIC"
      }`
    );

    // Check if balance is sufficient
    if (balance < (BigInt(gasEstimate.estimatedCost) * 12n) / 10n) {
      console.error("\n❌ Insufficient balance for deployment!");
      console.error(
        `   Required (with 20% buffer): ~${(
          parseFloat(gasEstimate.estimatedCostFormatted) * 1.2
        ).toFixed(6)}`
      );
      console.error(`   Available: ${balanceFormatted}\n`);
      process.exit(1);
    }
  } catch (error) {
    console.log(`   ⚠️  Could not estimate gas: ${error.message}`);
    console.log("   Proceeding with deployment anyway...");
  }

  // Mainnet confirmation
  if (MAINNET_CHAIN_IDS.includes(chainId)) {
    console.log("\n" + "⚠️".repeat(35));
    console.log("\n   🚨 MAINNET DEPLOYMENT DETECTED! 🚨");
    console.log(`   Network: ${networkName} (Chain ID: ${chainId})`);
    console.log("\n" + "⚠️".repeat(35));

    const confirmed = await promptConfirmation(
      "\n   Type 'yes' to confirm mainnet deployment: "
    );
    if (!confirmed) {
      console.log("\n   Deployment cancelled by user.\n");
      process.exit(0);
    }
  }

  // Deploy CAPX
  console.log("\n" + "-".repeat(70));
  console.log("                    DEPLOYING CONTRACTS");
  console.log("-".repeat(70));

  console.log("\n📄 Deploying CAPX Token...");
  const CAPX = await ethers.getContractFactory("CAPX");
  const capx = await CAPX.deploy(
    addresses.TREASURY_ADDRESS,
    addresses.DAO_ADDRESS,
    addresses.ADMIN_ADDRESS
  );
  await capx.waitForDeployment();
  const capxAddress = await capx.getAddress();
  console.log(`   ✅ CAPX deployed to: ${capxAddress}`);

  // Deploy ANGEL
  console.log("\n📄 Deploying ANGEL Token...");
  const ANGEL = await ethers.getContractFactory("ANGEL");
  const angel = await ANGEL.deploy(addresses.ADMIN_ADDRESS);
  await angel.waitForDeployment();
  const angelAddress = await angel.getAddress();
  console.log(`   ✅ ANGEL deployed to: ${angelAddress}`);

  // Get contract details
  const capxDetails = {
    address: capxAddress,
    name: await capx.name(),
    symbol: await capx.symbol(),
    decimals: Number(await capx.decimals()),
    totalSupply: (await capx.totalSupply()).toString(),
    maxSupply: (await capx.MAX_SUPPLY()).toString(),
    transactionHash: capx.deploymentTransaction()?.hash || "N/A",
    constructorArgs: [
      addresses.TREASURY_ADDRESS,
      addresses.DAO_ADDRESS,
      addresses.ADMIN_ADDRESS,
    ],
  };

  const angelDetails = {
    address: angelAddress,
    name: await angel.name(),
    symbol: await angel.symbol(),
    decimals: Number(await angel.decimals()),
    totalSupply: (await angel.totalSupply()).toString(),
    maxSupply: (await angel.MAX_SUPPLY()).toString(),
    transactionHash: angel.deploymentTransaction()?.hash || "N/A",
    constructorArgs: [addresses.ADMIN_ADDRESS],
  };

  // Save deployment info
  const deploymentInfo = {
    network: networkName,
    chainId: chainId,
    deployer: deployer.address,
    contracts: {
      CAPX: capxDetails,
      ANGEL: angelDetails,
    },
    configuration: {
      treasuryAddress: addresses.TREASURY_ADDRESS,
      daoAddress: addresses.DAO_ADDRESS,
      adminAddress: addresses.ADMIN_ADDRESS,
    },
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(DEPLOYMENT_FILE, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to ${DEPLOYMENT_FILE}`);

  // Optional verification
  if (process.env.VERIFY === "true") {
    console.log("\n⏳ Waiting for block confirmations before verification...");

    try {
      // Wait for confirmations
      const capxTx = capx.deploymentTransaction();
      const angelTx = angel.deploymentTransaction();

      if (capxTx) await capxTx.wait(5);
      if (angelTx) await angelTx.wait(5);

      console.log("\n📄 Verifying CAPX...");
      await hre.run("verify:verify", {
        address: capxAddress,
        constructorArguments: capxDetails.constructorArgs,
      });
      console.log("   ✅ CAPX verified!");

      console.log("\n📄 Verifying ANGEL...");
      await hre.run("verify:verify", {
        address: angelAddress,
        constructorArguments: angelDetails.constructorArgs,
      });
      console.log("   ✅ ANGEL verified!");
    } catch (error) {
      console.log(`   ⚠️  Verification note: ${error.message}`);
      console.log(
        "   Run manually: npx hardhat run scripts/verify.js --network " +
          networkName
      );
    }
  }

  // Print summary
  console.log("\n" + "=".repeat(70));
  console.log("                    DEPLOYMENT COMPLETE");
  console.log("=".repeat(70));

  console.log("\n📊 DEPLOYED CONTRACTS:");
  console.log(`   CAPX (${capxDetails.symbol}):   ${capxAddress}`);
  console.log(`   ANGEL (${angelDetails.symbol}): ${angelAddress}`);

  console.log("\n🔗 EXPLORER LINKS:");
  const explorers = {
    137: "https://polygonscan.com",
    80002: "https://amoy.polygonscan.com",
    56: "https://bscscan.com",
    97: "https://testnet.bscscan.com",
  };
  const explorer = explorers[chainId] || "";
  if (explorer) {
    console.log(`   CAPX:  ${explorer}/address/${capxAddress}`);
    console.log(`   ANGEL: ${explorer}/address/${angelAddress}`);
  }

  console.log("\n📋 NEXT STEPS:");
  console.log(
    "   1. Verify contracts: npx hardhat run scripts/verify.js --network " +
      networkName
  );
  console.log("   2. Check deployment-info.json for full details");
  console.log("   3. Transfer ownership if needed");

  console.log("\n" + "=".repeat(70) + "\n");
}

main().catch((error) => {
  console.error("\n❌ Deployment failed:", error.message);
  process.exit(1);
});
