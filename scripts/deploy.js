// scripts/deploy.js
const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();

  // Get network-specific info
  const networkInfo = {
    bscTestnet: { symbol: "BNB", tokenStandard: "BEP-20", explorer: "BscScan Testnet" },
    bscMainnet: { symbol: "BNB", tokenStandard: "BEP-20", explorer: "BscScan" },
    sepolia: { symbol: "ETH", tokenStandard: "ERC-20", explorer: "Etherscan Sepolia" },
    mumbai: { symbol: "MATIC", tokenStandard: "ERC-20", explorer: "PolygonScan Mumbai" },
    hardhat: { symbol: "ETH", tokenStandard: "ERC-20", explorer: "Local" },
  };

  const currentNetwork = networkInfo[network.name] || { symbol: "ETH", tokenStandard: "ERC-20", explorer: "Explorer" };

  console.log("==========================================");
  console.log("CAPShield Token Deployment");
  console.log("==========================================");
  console.log("Network:", network.name);
  console.log("Chain ID:", network.config.chainId);
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), currentNetwork.symbol);
  console.log("==========================================\n");

  // CONFIGURATION
  // IMPORTANT: Update these addresses before deployment
  const MULTISIG_ADDRESS = process.env.MULTISIG_ADDRESS || "";
  const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || "";
  const DAO_ADDRESS = process.env.DAO_ADDRESS || "";

  // Validate configuration
  if (!MULTISIG_ADDRESS || !ethers.isAddress(MULTISIG_ADDRESS)) {
    throw new Error("Invalid or missing MULTISIG_ADDRESS. Set via environment variable.");
  }
  if (!TREASURY_ADDRESS || !ethers.isAddress(TREASURY_ADDRESS)) {
    throw new Error("Invalid or missing TREASURY_ADDRESS. Set via environment variable.");
  }
  if (!DAO_ADDRESS || !ethers.isAddress(DAO_ADDRESS)) {
    throw new Error("Invalid or missing DAO_ADDRESS. Set via environment variable.");
  }

  console.log("Configuration:");
  console.log("  Multisig (Admin):", MULTISIG_ADDRESS);
  console.log("  Treasury:", TREASURY_ADDRESS);
  console.log("  DAO:", DAO_ADDRESS);
  console.log("");

  // Verify multisig is a contract
  const multisigCode = await ethers.provider.getCode(MULTISIG_ADDRESS);
  if (multisigCode === "0x") {
    throw new Error(
      `MULTISIG_ADDRESS (${MULTISIG_ADDRESS}) is not a contract! ` +
      "Admin MUST be a multisig contract for security. Deployment aborted."
    );
  }
  console.log("✓ Verified: Multisig address is a contract\n");

  // Deploy CAPY Token
  console.log("Deploying CAPY Token (Shield Token)...");
  const CAPY = await ethers.getContractFactory("CAPY");
  const capy = await CAPY.deploy(MULTISIG_ADDRESS, TREASURY_ADDRESS, DAO_ADDRESS);
  await capy.waitForDeployment();
  const capyAddress = await capy.getAddress();
  console.log(`✓ CAPY (${currentNetwork.tokenStandard}) deployed to:`, capyAddress);
  console.log("  Transaction:", capy.deploymentTransaction().hash);
  console.log("");

  // Deploy SEED Token
  console.log("Deploying SEED Token (Community Token)...");
  const SEED = await ethers.getContractFactory("SEED");
  const seed = await SEED.deploy(MULTISIG_ADDRESS);
  await seed.waitForDeployment();
  const seedAddress = await seed.getAddress();
  console.log(`✓ SEED (${currentNetwork.tokenStandard}) deployed to:`, seedAddress);
  console.log("  Transaction:", seed.deploymentTransaction().hash);
  console.log("");

  // Verify deployments
  console.log("Verifying deployments...");

  const capyName = await capy.name();
  const capySymbol = await capy.symbol();
  const capyDecimals = await capy.decimals();
  const capyMaxSupply = await capy.getMaxSupply();
  const capyOwner = await capy.owner();
  const capyIsMultisig = await capy.isOwnerMultisig();

  const seedName = await seed.name();
  const seedSymbol = await seed.symbol();
  const seedDecimals = await seed.decimals();
  const seedMaxSupply = await seed.getMaxSupply();
  const seedOwner = await seed.owner();
  const seedIsMultisig = await seed.isOwnerMultisig();

  console.log("CAPY Token:");
  console.log("  Name:", capyName);
  console.log("  Symbol:", capySymbol);
  console.log("  Decimals:", capyDecimals);
  console.log("  Max Supply:", ethers.formatUnits(capyMaxSupply, 18), "CAPY");
  console.log("  Owner:", capyOwner);
  console.log("  Owner is Multisig:", capyIsMultisig);
  console.log("");

  console.log("SEED Token:");
  console.log("  Name:", seedName);
  console.log("  Symbol:", seedSymbol);
  console.log("  Decimals:", seedDecimals);
  console.log("  Max Supply:", ethers.formatUnits(seedMaxSupply, 18), "SEED");
  console.log("  Owner:", seedOwner);
  console.log("  Owner is Multisig:", seedIsMultisig);
  console.log("");

  // Validate multisig enforcement
  if (!capyIsMultisig || !seedIsMultisig) {
    console.error("⚠️  WARNING: One or more tokens do not have a multisig owner!");
  } else {
    console.log("✓ All tokens correctly configured with multisig admin");
  }
  console.log("");

  // Create deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: network.config.chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      CAPY: {
        address: capyAddress,
        name: capyName,
        symbol: capySymbol,
        decimals: Number(capyDecimals),
        maxSupply: capyMaxSupply.toString(),
        owner: capyOwner,
        isOwnerMultisig: capyIsMultisig,
        deploymentTx: capy.deploymentTransaction().hash,
        constructorArgs: [MULTISIG_ADDRESS, TREASURY_ADDRESS, DAO_ADDRESS],
      },
      SEED: {
        address: seedAddress,
        name: seedName,
        symbol: seedSymbol,
        decimals: Number(seedDecimals),
        maxSupply: seedMaxSupply.toString(),
        owner: seedOwner,
        isOwnerMultisig: seedIsMultisig,
        deploymentTx: seed.deploymentTransaction().hash,
        constructorArgs: [MULTISIG_ADDRESS],
      },
    },
    config: {
      multisig: MULTISIG_ADDRESS,
      treasury: TREASURY_ADDRESS,
      dao: DAO_ADDRESS,
    },
  };

  // Save deployment info
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  const filename = `deployment-${network.name}-${Date.now()}.json`;
  const filepath = path.join(deploymentsDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));
  console.log("✓ Deployment info saved to:", filepath);
  console.log("");

  // Output verification commands
  console.log("==========================================");
  console.log(`Contract Verification Commands (${currentNetwork.explorer})`);
  console.log("==========================================");
  console.log("");
  console.log("CAPY Token:");
  console.log(`npx hardhat verify --network ${network.name} ${capyAddress} "${MULTISIG_ADDRESS}" "${TREASURY_ADDRESS}" "${DAO_ADDRESS}"`);
  console.log("");
  console.log("SEED Token:");
  console.log(`npx hardhat verify --network ${network.name} ${seedAddress} "${MULTISIG_ADDRESS}"`);
  console.log("");
  console.log("==========================================");
  console.log("Deployment Complete!");
  console.log("==========================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:");
    console.error(error);
    process.exit(1);
  });
