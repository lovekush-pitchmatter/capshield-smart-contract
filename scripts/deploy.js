// scripts/deploy.js
const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const networkName = hre.network.name;

  // Required constructor params via .env
  const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS;
  const DAO_ADDRESS = process.env.DAO_ADDRESS;
  const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS; // multisig/contract

  if (!TREASURY_ADDRESS || !DAO_ADDRESS || !ADMIN_ADDRESS) {
    throw new Error(
      "Missing env vars: TREASURY_ADDRESS, DAO_ADDRESS, ADMIN_ADDRESS are required"
    );
  }

  console.log(
    `Deploying contracts to ${networkName} (chainId=${network.chainId})`
  );
  console.log("Deployer:", deployer.address);
  console.log("Balance:", (await deployer.getBalance()).toString());

  // Deploy CAPX Token
  console.log("\nDeploying CAPX Token...");
  const CAPX = await ethers.getContractFactory("CAPX");
  const capx = await CAPX.deploy(TREASURY_ADDRESS, DAO_ADDRESS, ADMIN_ADDRESS);
  await capx.waitForDeployment();
  const capxAddress = await capx.getAddress();
  console.log("CAPX Token deployed to:", capxAddress);

  // Deploy ANGEL Token
  console.log("\nDeploying ANGEL Token...");
  const ANGEL = await ethers.getContractFactory("ANGEL");
  const angel = await ANGEL.deploy(ADMIN_ADDRESS);
  await angel.waitForDeployment();
  const angelAddress = await angel.getAddress();
  console.log("ANGEL Token deployed to:", angelAddress);

  // Optionally verify immediately if VERIFY=true
  if (process.env.VERIFY === "true") {
    console.log("\nWaiting for 5 block confirmations before verifying...");
    await capx.deploymentTransaction().wait(5);
    await angel.deploymentTransaction().wait(5);

    try {
      console.log("Verifying CAPX...");
      await hre.run("verify:verify", {
        address: capxAddress,
        constructorArguments: [TREASURY_ADDRESS, DAO_ADDRESS, ADMIN_ADDRESS],
      });
      console.log("✅ CAPX verified");
    } catch (e) {
      console.log("CAPX verify info:", e.message);
    }

    try {
      console.log("Verifying ANGEL...");
      await hre.run("verify:verify", {
        address: angelAddress,
        constructorArguments: [ADMIN_ADDRESS],
      });
      console.log("✅ ANGEL verified");
    } catch (e) {
      console.log("ANGEL verify info:", e.message);
    }
  }

  // Save deployment info
  const fs = require("fs");
  const deploymentInfo = {
    network: networkName,
    chainId: Number(network.chainId),
    deployer: deployer.address,
    contracts: {
      CAPX: {
        address: capxAddress,
        name: await capx.name(),
        symbol: await capx.symbol(),
        decimals: await capx.decimals(),
        totalSupply: (await capx.totalSupply()).toString(),
        maxSupply: (await capx.MAX_SUPPLY()).toString(),
        transactionHash: capx.deploymentTransaction().hash,
        constructorArgs: [TREASURY_ADDRESS, DAO_ADDRESS, ADMIN_ADDRESS],
      },
      ANGEL: {
        address: angelAddress,
        name: await angel.name(),
        symbol: await angel.symbol(),
        decimals: await angel.decimals(),
        totalSupply: (await angel.totalSupply()).toString(),
        transactionHash: angel.deploymentTransaction().hash,
        constructorArgs: [ADMIN_ADDRESS],
      },
    },
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(
    "deployment-info.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\nDeployment info saved to deployment-info.json");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
