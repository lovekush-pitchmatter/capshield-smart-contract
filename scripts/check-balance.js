const { ethers } = require("ethers");
require("dotenv").config();

// Network configurations
const NETWORKS = [
  {
    name: "Polygon Mainnet",
    chainId: 137,
    rpcUrl:
      process.env.POLYGON_RPC_URL || "https://polygon-bor-rpc.publicnode.com",
    symbol: "MATIC",
    explorer: "https://polygonscan.com",
  },
  {
    name: "Polygon Amoy Testnet",
    chainId: 80002,
    rpcUrl:
      process.env.POLYGON_AMOY_RPC_URL ||
      "https://polygon-amoy-bor-rpc.publicnode.com",
    symbol: "MATIC",
    explorer: "https://amoy.polygonscan.com",
  },
  {
    name: "BSC Mainnet",
    chainId: 56,
    rpcUrl: process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org",
    symbol: "BNB",
    explorer: "https://bscscan.com",
  },
  {
    name: "BSC Testnet",
    chainId: 97,
    rpcUrl:
      process.env.BSC_TESTNET_RPC_URL ||
      "https://data-seed-prebsc-1-s1.binance.org:8545/",
    symbol: "tBNB",
    explorer: "https://testnet.bscscan.com",
  },
];

// Minimum balance thresholds for deployment (in native token)
const MIN_BALANCE_MAINNET = "0.01";
const MIN_BALANCE_TESTNET = "0.001";

async function checkBalance(network, walletAddress) {
  const result = {
    network: network.name,
    chainId: network.chainId,
    symbol: network.symbol,
    success: false,
    balance: null,
    balanceFormatted: null,
    sufficient: false,
    error: null,
  };

  try {
    const provider = new ethers.JsonRpcProvider(network.rpcUrl, {
      chainId: network.chainId,
      name: network.name,
    });

    // Set timeout for provider request
    const balancePromise = provider.getBalance(walletAddress);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timeout (10s)")), 10000)
    );

    const balance = await Promise.race([balancePromise, timeoutPromise]);
    const balanceFormatted = ethers.formatEther(balance);

    // Determine if balance is sufficient
    const isTestnet =
      network.name.toLowerCase().includes("testnet") ||
      network.name.toLowerCase().includes("amoy");
    const minBalance = isTestnet ? MIN_BALANCE_TESTNET : MIN_BALANCE_MAINNET;
    const sufficient = parseFloat(balanceFormatted) >= parseFloat(minBalance);

    result.success = true;
    result.balance = balance.toString();
    result.balanceFormatted = balanceFormatted;
    result.sufficient = sufficient;
  } catch (error) {
    result.error = error.message;
  }

  return result;
}

function getWalletAddress() {
  const privateKey = process.env.PRIVATE_KEY;

  if (!privateKey) {
    return null;
  }

  try {
    const wallet = new ethers.Wallet(privateKey);
    return wallet.address;
  } catch (error) {
    console.error("❌ Invalid private key format in .env file");
    process.exit(1);
  }
}

function printHeader(walletAddress) {
  console.log("\n" + "=".repeat(70));
  console.log("                    WALLET BALANCE CHECKER");
  console.log("=".repeat(70));
  console.log(`\n📬 Wallet Address: ${walletAddress}`);
  console.log(`📅 Timestamp: ${new Date().toISOString()}\n`);
  console.log("-".repeat(70));
}

function printResult(result) {
  const statusIcon = result.success ? "✅" : "❌";
  const balanceIcon = result.sufficient ? "💰" : "⚠️";

  console.log(
    `\n${statusIcon} ${result.network} (Chain ID: ${result.chainId})`
  );

  if (result.success) {
    console.log(
      `   ${balanceIcon} Balance: ${result.balanceFormatted} ${result.symbol}`
    );
    if (result.sufficient) {
      console.log(`   ✓ Sufficient for deployment`);
    } else {
      console.log(`   ✗ Insufficient for deployment`);
    }
  } else {
    console.log(`   Error: ${result.error}`);
  }
}

function printSummary(results, walletAddress) {
  console.log("\n" + "-".repeat(70));
  console.log("                         SUMMARY");
  console.log("-".repeat(70));

  const successful = results.filter((r) => r.success);
  const readyNetworks = results.filter((r) => r.success && r.sufficient);
  const needsFunding = results.filter((r) => r.success && !r.sufficient);
  const failed = results.filter((r) => !r.success);

  console.log(`\n📊 Networks checked: ${results.length}`);
  console.log(`   ✅ Connected: ${successful.length}`);
  console.log(`   💰 Ready for deployment: ${readyNetworks.length}`);
  console.log(`   ⚠️  Needs funding: ${needsFunding.length}`);
  console.log(`   ❌ Connection failed: ${failed.length}`);

  if (readyNetworks.length > 0) {
    console.log("\n🚀 Ready to deploy on:");
    readyNetworks.forEach((r) => {
      console.log(`   - ${r.network}: ${r.balanceFormatted} ${r.symbol}`);
    });
  }

  if (needsFunding.length > 0) {
    console.log("\n💸 Needs funding:");
    needsFunding.forEach((r) => {
      const isTestnet =
        r.network.toLowerCase().includes("testnet") ||
        r.network.toLowerCase().includes("amoy");
      const minRequired = isTestnet ? MIN_BALANCE_TESTNET : MIN_BALANCE_MAINNET;
      console.log(
        `   - ${r.network}: ${r.balanceFormatted} ${r.symbol} (min: ${minRequired} ${r.symbol})`
      );
    });

    console.log("\n💡 Faucets for testnets:");
    console.log("   - Polygon Amoy: https://faucet.polygon.technology/");
    console.log("   - BSC Testnet: https://testnet.bnbchain.org/faucet-smart");
  }

  if (failed.length > 0) {
    console.log("\n⚠️  Failed connections:");
    failed.forEach((r) => {
      console.log(`   - ${r.network}: ${r.error}`);
    });
    console.log("\n💡 Tips for failed connections:");
    console.log("   - Check your internet connection");
    console.log("   - Try setting custom RPC URLs in .env file");
    console.log("   - Some public RPCs may be rate-limited");
  }

  console.log("\n" + "=".repeat(70) + "\n");
}

async function main() {
  const walletAddress = getWalletAddress();

  if (!walletAddress) {
    console.log("\n❌ PRIVATE_KEY not found in .env file");
    console.log("\n💡 To fix this:");
    console.log("   1. Create a .env file in the project root");
    console.log("   2. Add: PRIVATE_KEY=your_private_key_here");
    console.log("   3. Run this script again");
    console.log(
      "\n   Or generate a new wallet: node scripts/generate-wallet.js\n"
    );
    process.exit(1);
  }

  printHeader(walletAddress);

  const results = [];

  for (const network of NETWORKS) {
    const result = await checkBalance(network, walletAddress);
    results.push(result);
    printResult(result);
  }

  printSummary(results, walletAddress);
}

main().catch((error) => {
  console.error("\n❌ Unexpected error:", error.message);
  process.exit(1);
});
