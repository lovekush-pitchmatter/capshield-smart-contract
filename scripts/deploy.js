// scripts/deploy.js
const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();

  // Get network-specific info
  const networkInfo = {
    bscTestnet: {
      symbol: "BNB",
      tokenStandard: "BEP-20",
      explorer: "BscScan Testnet",
    },
    bscMainnet: { symbol: "BNB", tokenStandard: "BEP-20", explorer: "BscScan" },
    sepolia: {
      symbol: "ETH",
      tokenStandard: "ERC-20",
      explorer: "Etherscan Sepolia",
    },
    mumbai: {
      symbol: "MATIC",
      tokenStandard: "ERC-20",
      explorer: "PolygonScan Mumbai",
    },
    hardhat: { symbol: "ETH", tokenStandard: "ERC-20", explorer: "Local" },
  };

  const currentNetwork = networkInfo[network.name] || {
    symbol: "ETH",
    tokenStandard: "ERC-20",
    explorer: "Explorer",
  };

  console.log("==========================================");
  console.log("CAPShield Tokens Deployment");
  console.log("==========================================");
  console.log("Network:", network.name);
  console.log("Chain ID:", network.config.chainId);
  console.log("Deployer:", deployer.address);
  console.log(
    "Balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    currentNetwork.symbol
  );
  console.log("==========================================\n");

  // CONFIGURATION
  // IMPORTANT: Update these addresses before deployment
  const MULTISIG_ADDRESS = process.env.MULTISIG_ADDRESS || "";
  const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || "";
  const DAO_ADDRESS = process.env.DAO_ADDRESS || "";

  // Validate configuration
  if (!MULTISIG_ADDRESS || !ethers.isAddress(MULTISIG_ADDRESS)) {
    throw new Error(
      "Invalid or missing MULTISIG_ADDRESS. Set via environment variable."
    );
  }
  if (!TREASURY_ADDRESS || !ethers.isAddress(TREASURY_ADDRESS)) {
    throw new Error(
      "Invalid or missing TREASURY_ADDRESS. Set via environment variable."
    );
  }
  if (!DAO_ADDRESS || !ethers.isAddress(DAO_ADDRESS)) {
    throw new Error(
      "Invalid or missing DAO_ADDRESS. Set via environment variable."
    );
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

  // Deploy CAPX Token
  console.log("Deploying CAPX Token (CAPY - Shield Token)...");
  const CAPX = await ethers.getContractFactory("CAPX");
  const capx = await CAPX.deploy(
    TREASURY_ADDRESS,
    DAO_ADDRESS,
    MULTISIG_ADDRESS
  );
  await capx.waitForDeployment();
  const capxAddress = await capx.getAddress();
  console.log(
    `✓ CAPX (${currentNetwork.tokenStandard}) deployed to:`,
    capxAddress
  );
  console.log("  Transaction:", capx.deploymentTransaction().hash);
  console.log("");

  // Deploy ANGEL Token
  console.log("Deploying ANGEL Token (SEED - Community Token)...");
  const ANGEL = await ethers.getContractFactory("ANGEL");
  const angel = await ANGEL.deploy(MULTISIG_ADDRESS);
  await angel.waitForDeployment();
  const angelAddress = await angel.getAddress();
  console.log(
    `✓ ANGEL (${currentNetwork.tokenStandard}) deployed to:`,
    angelAddress
  );
  console.log("  Transaction:", angel.deploymentTransaction().hash);
  console.log("");

  // Verify deployments
  console.log("Verifying deployments...");

  const capxName = await capx.name();
  const capxSymbol = await capx.symbol();
  const capxDecimals = await capx.decimals();
  const capxMaxSupply = await capx.MAX_SUPPLY();
  const capxTreasury = await capx.treasuryAddress();
  const capxDAO = await capx.daoAddress();

  // Check if multisig has admin role
  const DEFAULT_ADMIN_ROLE = await capx.DEFAULT_ADMIN_ROLE();
  const capxHasAdminRole = await capx.hasRole(DEFAULT_ADMIN_ROLE, MULTISIG_ADDRESS);

  const angelName = await angel.name();
  const angelSymbol = await angel.symbol();
  const angelDecimals = await angel.decimals();
  const angelMaxSupply = await angel.MAX_SUPPLY();
  const angelHasAdminRole = await angel.hasRole(DEFAULT_ADMIN_ROLE, MULTISIG_ADDRESS);

  console.log("CAPX Token:");
  console.log("  Name:", capxName);
  console.log("  Symbol:", capxSymbol);
  console.log("  Decimals:", capxDecimals);
  console.log("  Max Supply:", ethers.formatUnits(capxMaxSupply, 18), "CAPY");
  console.log("  Treasury:", capxTreasury);
  console.log("  DAO:", capxDAO);
  console.log("  Multisig has DEFAULT_ADMIN_ROLE:", capxHasAdminRole);
  console.log("");

  console.log("ANGEL Token:");
  console.log("  Name:", angelName);
  console.log("  Symbol:", angelSymbol);
  console.log("  Decimals:", angelDecimals);
  console.log("  Max Supply:", ethers.formatUnits(angelMaxSupply, 18), "SEED");
  console.log("  Multisig has DEFAULT_ADMIN_ROLE:", angelHasAdminRole);
  console.log("");

  // Validate multisig enforcement
  if (!capxHasAdminRole || !angelHasAdminRole) {
    console.error(
      "⚠️  WARNING: One or more tokens do not have multisig as admin!"
    );
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
      CAPX: {
        address: capxAddress,
        name: capxName,
        symbol: capxSymbol,
        decimals: Number(capxDecimals),
        maxSupply: capxMaxSupply.toString(),
        treasury: capxTreasury,
        dao: capxDAO,
        hasMultisigAdmin: capxHasAdminRole,
        deploymentTx: capx.deploymentTransaction().hash,
        constructorArgs: [TREASURY_ADDRESS, DAO_ADDRESS, MULTISIG_ADDRESS],
      },
      ANGEL: {
        address: angelAddress,
        name: angelName,
        symbol: angelSymbol,
        decimals: Number(angelDecimals),
        maxSupply: angelMaxSupply.toString(),
        hasMultisigAdmin: angelHasAdminRole,
        deploymentTx: angel.deploymentTransaction().hash,
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
  console.log("CAPX Token:");
  console.log(
    `npx hardhat verify --network ${network.name} ${capxAddress} "${TREASURY_ADDRESS}" "${DAO_ADDRESS}" "${MULTISIG_ADDRESS}"`
  );
  console.log("");
  console.log("ANGEL Token:");
  console.log(
    `npx hardhat verify --network ${network.name} ${angelAddress} "${MULTISIG_ADDRESS}"`
  );
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
