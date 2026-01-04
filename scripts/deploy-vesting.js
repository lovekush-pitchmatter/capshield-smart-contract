const hre = require("hardhat");
const fs = require("fs");
const readline = require("readline");

const DEPLOYMENT_FILE = "vesting-deployment.json";

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
  if (!process.env.ADMIN_ADDRESS) {
    console.error("\n❌ Missing required environment variable:");
    console.error("   - ADMIN_ADDRESS");
    console.error("\n💡 Add this to your .env file:");
    console.error("   ADMIN_ADDRESS=0x... (must be a contract/multisig)\n");
    process.exit(1);
  }

  const adminAddress = process.env.ADMIN_ADDRESS;

  if (!hre.ethers.isAddress(adminAddress)) {
    console.error(`\n❌ Invalid ADMIN_ADDRESS: ${adminAddress}`);
    console.error("   Must be a valid Ethereum address (0x...)\n");
    process.exit(1);
  }

  return adminAddress;
}

async function validateAdminIsContract(adminAddress, provider) {
  const code = await provider.getCode(adminAddress);
  if (code === "0x") {
    console.error("\n❌ ADMIN_ADDRESS is not a contract/multisig!");
    console.error(`   Address: ${adminAddress}`);
    console.error(
      "   The admin address must be a deployed contract (e.g., Gnosis Safe or MockAdmin)"
    );
    console.error(
      "\n💡 Deploy MockAdmin first: npm run deploy:mockadmin:polygon:testnet\n"
    );
    process.exit(1);
  }
}

async function estimateDeploymentCost(deployer, provider, adminAddress) {
  const vestingFactory = await hre.ethers.getContractFactory("TokenVesting");

  const deployTx = await vestingFactory.getDeployTransaction(adminAddress);
  const gasEstimate = await provider.estimateGas({
    ...deployTx,
    from: deployer.address,
  });

  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || hre.ethers.parseUnits("5", "gwei");

  const estimatedCost = gasEstimate * gasPrice;

  return {
    gasEstimate: gasEstimate.toString(),
    gasPrice: gasPrice.toString(),
    estimatedCost: estimatedCost.toString(),
    estimatedCostFormatted: hre.ethers.formatEther(estimatedCost),
  };
}

async function main() {
  const networkName = hre.network.name;
  const { ethers } = hre;

  console.log("\n" + "=".repeat(70));
  console.log("                TOKENVESTING DEPLOYMENT");
  console.log("=".repeat(70));

  // Validate environment variables
  const adminAddress = validateEnvVariables();

  // Get deployer and network info
  const [deployer] = await ethers.getSigners();
  const provider = ethers.provider;
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);
  const balance = await provider.getBalance(deployer.address);
  const balanceFormatted = ethers.formatEther(balance);

  // Validate admin is a contract
  await validateAdminIsContract(adminAddress, provider);

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
  console.log(`   Admin:        ${adminAddress}`);

  // Estimate deployment cost
  console.log("\n💰 GAS ESTIMATION");
  console.log("-".repeat(70));

  let gasEstimate;
  try {
    gasEstimate = await estimateDeploymentCost(
      deployer,
      provider,
      adminAddress
    );
    console.log(`   Gas Required: ${gasEstimate.gasEstimate}`);
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

  // Deploy TokenVesting
  console.log("\n" + "-".repeat(70));
  console.log("                    DEPLOYING CONTRACT");
  console.log("-".repeat(70));

  console.log("\n📄 Deploying TokenVesting...");
  const TokenVesting = await ethers.getContractFactory("TokenVesting");
  const tokenVesting = await TokenVesting.deploy(adminAddress);
  await tokenVesting.waitForDeployment();

  const vestingAddress = await tokenVesting.getAddress();
  console.log(`   ✅ TokenVesting deployed to: ${vestingAddress}`);

  // Get contract details and verify roles
  const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
  const VESTING_ADMIN_ROLE = ethers.keccak256(
    ethers.toUtf8Bytes("VESTING_ADMIN_ROLE")
  );
  const PAUSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PAUSER_ROLE"));

  const hasAdminRole = await tokenVesting.hasRole(
    DEFAULT_ADMIN_ROLE,
    adminAddress
  );
  const hasVestingAdminRole = await tokenVesting.hasRole(
    VESTING_ADMIN_ROLE,
    adminAddress
  );
  const hasPauserRole = await tokenVesting.hasRole(PAUSER_ROLE, adminAddress);

  console.log("\n🔐 ROLE VERIFICATION");
  console.log("-".repeat(70));
  console.log("   DEFAULT_ADMIN_ROLE:", hasAdminRole ? "✅" : "❌");
  console.log("   VESTING_ADMIN_ROLE:", hasVestingAdminRole ? "✅" : "❌");
  console.log("   PAUSER_ROLE:", hasPauserRole ? "✅" : "❌");

  const vestingDetails = {
    address: vestingAddress,
    adminAddress: adminAddress,
    transactionHash: tokenVesting.deploymentTransaction()?.hash || "N/A",
    constructorArgs: [adminAddress],
    roles: {
      DEFAULT_ADMIN_ROLE: hasAdminRole,
      VESTING_ADMIN_ROLE: hasVestingAdminRole,
      PAUSER_ROLE: hasPauserRole,
    },
  };

  // Save deployment info
  const deploymentInfo = {
    network: networkName,
    chainId: chainId,
    deployer: deployer.address,
    contract: vestingDetails,
    timestamp: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber(),
  };

  fs.writeFileSync(DEPLOYMENT_FILE, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to ${DEPLOYMENT_FILE}`);

  // Optional verification
  if (process.env.VERIFY === "true") {
    console.log("\n⏳ Waiting for block confirmations before verification...");

    try {
      const tx = tokenVesting.deploymentTransaction();
      if (tx) await tx.wait(5);

      console.log("\n📄 Verifying TokenVesting...");
      await hre.run("verify:verify", {
        address: vestingAddress,
        constructorArguments: vestingDetails.constructorArgs,
      });
      console.log("   ✅ TokenVesting verified!");
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log("   ✅ TokenVesting is already verified!");
      } else {
        console.log(`   ⚠️  Verification failed: ${error.message}`);
        console.log("   You can verify later using:");
        console.log(
          `   npx hardhat verify --network ${networkName} ${vestingAddress} "${adminAddress}"`
        );
      }
    }
  }

  // Print summary
  console.log("\n" + "=".repeat(70));
  console.log("                    DEPLOYMENT COMPLETE");
  console.log("=".repeat(70));

  console.log("\n📊 DEPLOYED CONTRACT:");
  console.log(`   TokenVesting: ${vestingAddress}`);
  console.log(`   Admin:        ${adminAddress}`);

  console.log("\n🔗 EXPLORER LINK:");
  const explorers = {
    137: "https://polygonscan.com",
    80002: "https://amoy.polygonscan.com",
    56: "https://bscscan.com",
    97: "https://testnet.bscscan.com",
  };
  const explorer = explorers[chainId] || "";
  if (explorer) {
    console.log(`   ${explorer}/address/${vestingAddress}`);
  }

  console.log("\n⚠️  CRITICAL NEXT STEPS:");
  console.log(
    "   1. Configure CAPX fee exemption: npm run configure:exemption:" +
      (networkName.includes("testnet") || networkName.includes("Amoy")
        ? "testnet"
        : "mainnet")
  );
  console.log(
    "   2. Verify contract: npx hardhat verify --network " +
      networkName +
      " " +
      vestingAddress +
      ' "' +
      adminAddress +
      '"'
  );
  console.log("   3. Test with small amounts before production use");
  console.log(`   4. Check ${DEPLOYMENT_FILE} for full details`);

  console.log("\n" + "=".repeat(70) + "\n");
}

main().catch((error) => {
  console.error("\n❌ Deployment failed:", error.message);
  process.exit(1);
});
