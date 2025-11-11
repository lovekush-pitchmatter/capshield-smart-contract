// scripts/deploy.js
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log(
    "Deploying contracts to BSC Testnet with account:",
    deployer.address
  );
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy CAPX Token
  console.log("\nDeploying CAPX Token...");
  const CAPX = await ethers.getContractFactory("CAPX");
  const capx = await CAPX.deploy();
  await capx.deployed();
  console.log("CAPX Token deployed to:", capx.address);

  // Deploy ANGEL Token
  console.log("\nDeploying ANGEL Token...");
  const ANGEL = await ethers.getContractFactory("ANGEL");
  const angel = await ANGEL.deploy();
  await angel.deployed();
  console.log("ANGEL Token deployed to:", angel.address);

  // Save deployment info
  const fs = require("fs");
  const deploymentInfo = {
    network: "BNB Smart Chain Testnet",
    chainId: 97,
    deployer: deployer.address,
    contracts: {
      CAPX: {
        address: capx.address,
        name: await capx.name(),
        symbol: await capx.symbol(),
        decimals: await capx.decimals(),
        totalSupply: (await capx.totalSupply()).toString(),
        maxSupply: (await capx.getMaxSupply()).toString(),
        transactionHash: capx.deployTransaction.hash,
      },
      ANGEL: {
        address: angel.address,
        name: await angel.name(),
        symbol: await angel.symbol(),
        decimals: await angel.decimals(),
        totalSupply: (await angel.totalSupply()).toString(),
        transactionHash: angel.deployTransaction.hash,
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
