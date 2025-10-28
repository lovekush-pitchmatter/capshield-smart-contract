const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
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

  // Verify deployment details
  console.log("\n=== Deployment Summary ===");
  console.log("Deployer Address:", deployer.address);
  console.log("CAPX Address:", capx.address);
  console.log("ANGEL Address:", angel.address);
  console.log("CAPX Total Supply:", (await capx.totalSupply()).toString());
  console.log("ANGEL Total Supply:", (await angel.totalSupply()).toString());
  console.log("CAPX Decimals:", await capx.decimals());
  console.log("ANGEL Decimals:", await angel.decimals());
  console.log("CAPX Symbol:", await capx.symbol());
  console.log("ANGEL Symbol:", await angel.symbol());
  console.log("CAPX Name:", await capx.name());
  console.log("ANGEL Name:", await angel.name());

  // Save deployment info to file
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

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
